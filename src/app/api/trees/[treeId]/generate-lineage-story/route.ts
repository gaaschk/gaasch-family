import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { requireTreeAccessOrToken } from '@/lib/auth';
import { getSystemSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function clean(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

type Params = { params: Promise<{ treeId: string }> };

// ── GET: return cached story if it exists ────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccessOrToken(req, treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const personIdsKey = req.nextUrl.searchParams.get('personIds');
  if (!personIdsKey) {
    return NextResponse.json({ error: 'personIds required' }, { status: 400 });
  }

  const story = await prisma.lineageStory.findUnique({
    where: { treeId_personIdsKey: { treeId: tree.id, personIdsKey } },
  });

  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ html: story.html });
}

// ── POST: generate (stream) + save ───────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccessOrToken(req, treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;

  const [apiKey, modelValue] = await Promise.all([
    getSystemSetting('anthropic_api_key', 'ANTHROPIC_API_KEY'),
    getSystemSetting('anthropic_model',   'ANTHROPIC_MODEL'),
  ]);

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Go to System Admin → Settings.' },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { personIds: string[] };
  if (!Array.isArray(body.personIds) || body.personIds.length === 0) {
    return NextResponse.json({ error: 'personIds required' }, { status: 400 });
  }

  const personIdsKey = body.personIds.join(',');

  // Load all people with family context
  const people = await prisma.person.findMany({
    where: { id: { in: body.personIds }, treeId: tree.id },
    include: {
      childIn: {
        include: { family: { include: { husband: true, wife: true } } },
      },
      asHusband: {
        include: { wife: true, children: { include: { person: true } } },
      },
      asWife: {
        include: { husband: true, children: { include: { person: true } } },
      },
    },
  });

  if (people.length === 0) {
    return NextResponse.json({ error: 'No matching people found' }, { status: 404 });
  }

  // Sort by birth year ascending (oldest ancestor first)
  function birthYear(p: { birthDate: string | null }) {
    if (!p.birthDate) return 9999;
    const m = p.birthDate.match(/\d{4}/);
    return m ? parseInt(m[0]) : 9999;
  }
  const sorted = [...people].sort((a, b) => birthYear(a) - birthYear(b));

  // Build per-person summaries
  const summaries = sorted.map(p => {
    const parents: string[] = [];
    for (const fc of p.childIn) {
      if (fc.family.husband) parents.push(clean(fc.family.husband.name));
      if (fc.family.wife)    parents.push(clean(fc.family.wife.name));
    }
    const seenSpouses = new Set<string>();
    const spouses: string[] = [];
    for (const f of p.asHusband) {
      if (f.wife && !seenSpouses.has(f.wife.id)) {
        seenSpouses.add(f.wife.id);
        spouses.push(clean(f.wife.name));
      }
    }
    for (const f of p.asWife) {
      if (f.husband && !seenSpouses.has(f.husband.id)) {
        seenSpouses.add(f.husband.id);
        spouses.push(clean(f.husband.name));
      }
    }
    const seenChildren = new Set<string>();
    const children: string[] = [];
    for (const f of [...p.asHusband, ...p.asWife]) {
      for (const c of f.children) {
        if (!seenChildren.has(c.person.id)) {
          seenChildren.add(c.person.id);
          children.push(clean(c.person.name));
        }
      }
    }
    const lines = [
      `Name: ${clean(p.name)}`,
      p.sex       ? `Sex: ${p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : p.sex}` : '',
      p.birthDate ? `Born: ${p.birthDate}${p.birthPlace ? `, ${p.birthPlace}` : ''}` : '',
      p.deathDate ? `Died: ${p.deathDate}${p.deathPlace ? `, ${p.deathPlace}` : ''}` : '',
      p.occupation ? `Occupation: ${p.occupation}` : '',
      p.notes     ? `Notes: ${p.notes}` : '',
      parents.length  ? `Parents: ${parents.join(', ')}` : '',
      spouses.length  ? `Spouse(s): ${spouses.join(', ')}` : '',
      children.length ? `Children (${children.length}): ${children.slice(0, 8).join(', ')}${children.length > 8 ? ` …and ${children.length - 8} more` : ''}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  });

  const endPerson = sorted[sorted.length - 1];
  const endName = clean(endPerson.name).split(' ')[0];

  const prompt = `You are writing narrative nonfiction in the tradition of David McCullough — authoritative, vivid, and deeply human. Your subject is a multi-generational family lineage ending with ${clean(endPerson.name)}.

The central question this story answers is: How did the world produce ${endName}?

You have data for ${sorted.length} people who form a direct lineage, oldest ancestor first. Each generation is a chapter in a larger drama of geography, history, and human will.

IMPORTANT: Your entire response must be raw HTML. Do not use markdown. Do not use backticks. Do not add any explanation before or after the HTML. Start your response with a < character and end it with a > character.

Use only these HTML elements and CSS classes:
<p class="section-title">Section heading</p>
<p class="body-text">Paragraph text here.</p>
<div class="latin-quote">Latin text (only for 17th–18th century parish records)</div>
<div class="pull-quote">"A single memorable sentence."</div>

STRUCTURE — follow this arc:

Opening: One paragraph establishing the question — the world is about to produce ${endName}, and we must go back to the beginning to understand how.

For each generation (oldest to most recent):
1. WORLD FIRST: What era is this? What political, economic, or geographic forces are shaping ordinary life? Be specific — not "difficult times" but "the 1848 revolutions that swept the Rhineland left Luxembourg's peasant farmers facing a stark choice."
2. THE PERSON: Who are they within that world? What did they do, endure, build, or choose?
3. THE PASSAGE: What do they pass to the next generation — literally (a farm, a crossing, a trade) or thematically (a pattern of movement, of faith, of stubbornness)?

GEOGRAPHIC SPINE — migrations are cause and effect, not just facts:
- Luxembourg: centuries of Habsburg rule, French annexation and re-annexation, the poverty-driven emigration wave of the 1840s–1860s, the pull of America as genuine promise
- The Atlantic crossing: what it meant to leave everything — language, graves, parish, kin — for a country you'd never seen
- Iowa/Illinois frontier settlement: land that was cheap but demanded everything; Catholic immigrant communities rebuilding their parishes from scratch
- Kansas homesteading and the Great Plains: the Homestead Act's promise, the reality of drought and wind and isolation, the farming culture that shaped a generation
- Oklahoma Territory and oil: the land runs, the statehood era, the early oil economy and what it meant for families who arrived just as the world industrialized
- Texas High Plains: cotton and cattle, the Dust Bowl shadow, the mid-20th century transformation of rural America

HISTORICAL TEXTURE:
- For Luxembourg ancestors: the Catholic parish register tradition (baptismal records, godparents, community witness); the villages that defined identity before surnames had modern form
- Use hedged language for speculation: "likely," "probably," "the records suggest," "around this time" — never fabricate specific dates or facts not in the data
- Include a latin-quote only if actual Latin text from a parish record is present in the data

PULL-QUOTES: Place 2–4 pull-quotes at moments of historical drama or emotional weight — resonant observations about a person, an era, or what was risked and gained.

CLOSING: Land on ${endName} as the culmination. "And so ${endName} came into the world carrying all of this: [a brief, specific list of what the lineage built, moved through, survived]. The arc from [oldest ancestor's world] to [end person's world] is not merely a family story — it is a small history of [the larger theme: migration, faith, the American interior, whatever fits]."

Do not editorialize or moralize. Let the facts, placed in context, carry the weight.

Lineage data (oldest ancestor first):

${summaries.map((s, i) => `--- Person ${i + 1} ---\n${s}`).join('\n\n')}`;

  const client = new Anthropic({ apiKey });
  const model = modelValue || 'claude-sonnet-4-6';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let accumulated = '';
      try {
        const claudeStream = client.messages.stream({
          model,
          max_tokens: 6000,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
            accumulated += event.delta.text;
          }
        }

        // Strip code fences if model wraps in them
        accumulated = accumulated
          .replace(/^```(?:html)?\n?/i, '')
          .replace(/\n?```\s*$/i, '')
          .trim();

        // Save to DB (upsert so re-generation overwrites)
        if (accumulated && !accumulated.includes('__ERROR__')) {
          await prisma.lineageStory.upsert({
            where:  { treeId_personIdsKey: { treeId: tree.id, personIdsKey } },
            create: { treeId: tree.id, personIdsKey, html: accumulated },
            update: { html: accumulated },
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        controller.enqueue(encoder.encode(`\n__ERROR__: ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
