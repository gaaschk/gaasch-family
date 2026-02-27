/**
 * Shared narrative generation logic used by both the generate-narrative
 * route and the AI chat tool.
 */
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';

export function cleanName(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

export function buildNarrativePrompt(person: {
  name: string;
  sex: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  burialDate: string | null;
  burialPlace: string | null;
  occupation: string | null;
  notes: string | null;
  childIn: { family: { husband: { name: string } | null; wife: { name: string } | null } }[];
  asHusband: { wife: { name: string } | null; children: { person: { name: string } }[] }[];
  asWife: { husband: { name: string } | null; children: { person: { name: string } }[] }[];
}): string {
  const parents: string[] = [];
  for (const fc of person.childIn) {
    if (fc.family.husband) parents.push(cleanName(fc.family.husband.name));
    if (fc.family.wife)    parents.push(cleanName(fc.family.wife.name));
  }

  const seenSpouses = new Set<string>();
  const spouses: string[] = [];
  for (const f of person.asHusband) {
    if (f.wife && !seenSpouses.has(f.wife.name)) {
      seenSpouses.add(f.wife.name);
      spouses.push(cleanName(f.wife.name));
    }
  }
  for (const f of person.asWife) {
    if (f.husband && !seenSpouses.has(f.husband.name)) {
      seenSpouses.add(f.husband.name);
      spouses.push(cleanName(f.husband.name));
    }
  }

  const seenChildren = new Set<string>();
  const children: string[] = [];
  for (const f of [...person.asHusband, ...person.asWife]) {
    for (const c of f.children) {
      if (!seenChildren.has(c.person.name)) {
        seenChildren.add(c.person.name);
        children.push(cleanName(c.person.name));
      }
    }
  }

  const lines: string[] = [
    `Name: ${cleanName(person.name)}`,
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

  return `You are writing biographical narrative text for a private family history website. The tone is warm, archival, and historically grounded — like a well-researched family history book, not an encyclopedia.

The person's name, dates, and key facts are already displayed on the page. Your job is to write only the narrative body — historical context, prose, and memorable passages.

IMPORTANT: Your entire response must be raw HTML. Do not use markdown. Do not use backticks. Do not add any explanation before or after the HTML. Start your response with a < character and end it with a > character.

Use only these HTML elements and CSS classes:

<p class="section-title">Section heading</p>
<p class="body-text">Paragraph text here.</p>
<div class="latin-quote">Latin text (only for 17th–18th century parish records)</div>
<div class="pull-quote">"A single memorable sentence."</div>

Content rules:
- Write 2–4 section-title + body-text pairs covering the person's historical context and life
- Relevant history: Luxembourg (Habsburg rule, French Revolutionary era), Iowa frontier, Kansas homesteading, Oklahoma oil era, Texas High Plains
- For Luxembourg ancestors note the Catholic parish register tradition
- Include a latin-quote only when actual Latin text from a parish record is provided in the data
- Include one pull-quote with a resonant observation about the person's life or era
- Do not fabricate specific dates or facts not in the data — use hedged language ("likely", "probably", "around this time") where speculating

Person data:
${lines.join('\n')}`;
}

export async function generateAndSaveNarrative(opts: {
  personId: string;
  treeId: string;
  client: Anthropic;
  model: string;
  authorId: string | null;
}): Promise<{ narrative: string } | { error: string }> {
  const person = await prisma.person.findFirst({
    where: { id: opts.personId, treeId: opts.treeId },
    include: {
      childIn: { include: { family: { include: { husband: true, wife: true } } } },
      asHusband: { include: { wife: true, children: { include: { person: true } } } },
      asWife:    { include: { husband: true, children: { include: { person: true } } } },
    },
  });

  if (!person) return { error: `Person ${opts.personId} not found` };

  const previousNarrative = person.narrative;
  const prompt = buildNarrativePrompt(person);

  try {
    const message = await opts.client.messages.create({
      model:      opts.model,
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');
    const cleaned = raw.replace(/^```(?:html)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    await prisma.person.update({ where: { id: opts.personId }, data: { narrative: cleaned } });
    await prisma.auditLog.create({
      data: {
        tableName: 'people',
        recordId:  opts.personId,
        action:    'generate-narrative',
        oldData:   JSON.stringify({ narrative: previousNarrative }),
        newData:   JSON.stringify({ narrative: cleaned }),
        treeId:    opts.treeId,
        userId:    opts.authorId,
      },
    });

    return { narrative: cleaned };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Generation failed' };
  }
}
