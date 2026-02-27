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

  const prompt = `You are writing a multi-generational family history narrative for a private family history website. The tone is warm, literary, and historically grounded — like a well-researched family history book.

You will be given data for ${sorted.length} people who form a direct lineage, from the oldest ancestor down to the most recent. Write a flowing story that weaves these lives together across generations, showing how each person's story connects to the next.

IMPORTANT: Your entire response must be raw HTML. Do not use markdown. Do not use backticks. Do not add any explanation before or after the HTML. Start your response with a < character and end it with a > character.

Use only these HTML elements and CSS classes:
<p class="section-title">Section heading</p>
<p class="body-text">Paragraph text here.</p>
<div class="latin-quote">Latin text (only for 17th–18th century parish records)</div>
<div class="pull-quote">"A single memorable sentence."</div>

Content rules:
- Open with a section-title that names the lineage (e.g. "From [oldest] to [youngest]")
- Write 2–3 paragraphs per person, weaving in historical context and connecting each life to the next generation
- Relevant history: Luxembourg (Habsburg rule, French Revolutionary era), Iowa frontier, Kansas homesteading, Oklahoma oil era, Texas High Plains
- For Luxembourg ancestors note the Catholic parish register tradition
- Include a latin-quote only when actual Latin text from a parish record is provided in the data
- Include 2–3 pull-quotes at natural moments — resonant observations about people or eras
- Close with a brief paragraph reflecting on the full arc of the lineage
- Do not fabricate specific dates or facts not in the data — use hedged language ("likely", "probably", "around this time") where speculating

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
          max_tokens: 4000,
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
