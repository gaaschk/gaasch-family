import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function clean(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireRole('editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Load API key + model from DB settings
  const [apiKeySetting, modelSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'anthropic_api_key' } }),
    prisma.setting.findUnique({ where: { key: 'anthropic_model' } }),
  ]);

  if (!apiKeySetting?.value) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Go to Admin → Settings.' },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey: apiKeySetting.value });
  const model  = modelSetting?.value || 'claude-sonnet-4-6';

  const person = await prisma.person.findUnique({
    where: { id },
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

  if (!person) {
    return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  }

  // Build family context
  const parents: string[] = [];
  for (const fc of person.childIn) {
    if (fc.family.husband) parents.push(clean(fc.family.husband.name));
    if (fc.family.wife)    parents.push(clean(fc.family.wife.name));
  }

  const seenSpouses = new Set<string>();
  const spouses: string[] = [];
  for (const f of person.asHusband) {
    if (f.wife && !seenSpouses.has(f.wife.id)) {
      seenSpouses.add(f.wife.id);
      spouses.push(clean(f.wife.name));
    }
  }
  for (const f of person.asWife) {
    if (f.husband && !seenSpouses.has(f.husband.id)) {
      seenSpouses.add(f.husband.id);
      spouses.push(clean(f.husband.name));
    }
  }

  const seenChildren = new Set<string>();
  const children: string[] = [];
  for (const f of [...person.asHusband, ...person.asWife]) {
    for (const c of f.children) {
      if (!seenChildren.has(c.person.id)) {
        seenChildren.add(c.person.id);
        children.push(clean(c.person.name));
      }
    }
  }

  const lines: string[] = [
    `Name: ${clean(person.name)}`,
    person.sex        ? `Sex: ${person.sex === 'M' ? 'Male' : person.sex === 'F' ? 'Female' : person.sex}` : '',
    person.birthDate  ? `Born: ${person.birthDate}${person.birthPlace ? `, ${person.birthPlace}` : ''}` : '',
    person.deathDate  ? `Died: ${person.deathDate}${person.deathPlace ? `, ${person.deathPlace}` : ''}` : '',
    (person.burialDate || person.burialPlace)
      ? `Buried: ${[person.burialDate, person.burialPlace].filter(Boolean).join(', ')}` : '',
    person.occupation ? `Occupation: ${person.occupation}` : '',
    person.notes      ? `Notes from GEDCOM: ${person.notes}` : '',
    parents.length    ? `Parents: ${parents.join(', ')}` : '',
    spouses.length    ? `Spouse(s): ${spouses.join(', ')}` : '',
    children.length   ? `Children (${children.length}): ${children.slice(0, 12).join(', ')}${children.length > 12 ? ` …and ${children.length - 12} more` : ''}` : '',
  ].filter(Boolean);

  const prompt = `You are writing biographical narratives for a private family history website tracing the Gaasch family from 17th-century Luxembourg to present-day America. The tone is warm, archival, and historically grounded — like a well-researched family history book, not an encyclopedia.

Output valid HTML using only these CSS classes:
- <div class="chapter-header"><h2>Full Name</h2><p class="chapter-meta">dates · place</p></div>
- <div class="key-facts"><div class="key-fact"><span class="key-fact-label">Label</span><span class="key-fact-value">Value</span></div></div>
- <p class="section-title">Section heading</p>
- <p class="body-text">Paragraph</p>
- <div class="latin-quote">Latin text (only for 17th–18th century Luxembourg records)</div>
- <div class="pull-quote">"Memorable sentence"</div>

Rules:
- 2–4 paragraphs of body-text with genuine historical context for the person's time and place
- Include relevant history: Luxembourg political context (Habsburg, French Revolutionary), Iowa frontier, Kansas homesteading, Oklahoma oil era, Texas High Plains, etc.
- For Luxembourg ancestors note the Catholic parish register tradition
- Do not fabricate specific dates or facts not provided — speculate naturally where needed with hedged language ("likely", "probably", "around this time")
- Output only the HTML, no markdown, no explanation

Person data:
${lines.join('\n')}`;

  // Stream Claude's response to the client, accumulate full text, then save to DB
  const encoder = new TextEncoder();
  let fullText = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model,
          max_tokens: 1500,
          messages:   [{ role: 'user', content: prompt }],
        });

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Save to DB once generation is complete
        await prisma.person.update({ where: { id }, data: { narrative: fullText } });

        await prisma.auditLog.create({
          data: {
            tableName: 'people',
            recordId:  id,
            action:    'generate-narrative',
            oldData:   JSON.stringify({ narrative: person.narrative }),
            newData:   JSON.stringify({ narrative: fullText }),
            userId:    auth.userId,
          },
        });
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
