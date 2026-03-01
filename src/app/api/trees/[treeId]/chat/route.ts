import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { requireTreeAccess } from '@/lib/auth';
import { cleanName, generateAndSaveNarrative } from '@/lib/narrative';
import { searchAndStoreMatches } from '@/lib/familysearch';
import { getSystemSetting } from '@/lib/settings';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

type Params = { params: Promise<{ treeId: string }> };

// ── NDJSON helpers ─────────────────────────────────────────────────────────
function encode(obj: object) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

// ── Tool definitions ────────────────────────────────────────────────────────
function buildTools(canEdit: boolean): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [
    {
      name: 'search_people',
      description: 'Search for people in this family tree by name.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Name to search for' },
          limit: { type: 'number', description: 'Max results (default 8)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_person',
      description: 'Get detailed information about a person including their parents, spouses, and children.',
      input_schema: {
        type: 'object' as const,
        properties: {
          personId: { type: 'string', description: 'The CUID of the person' },
        },
        required: ['personId'],
      },
    },
    {
      name: 'list_people',
      description: 'List people in the tree with optional sorting. Use sort=oldest or sort=youngest to find people by birth year. Use sort=name for alphabetical. Use no_narrative=true to find people who do not yet have a narrative.',
      input_schema: {
        type: 'object' as const,
        properties: {
          sort:         { type: 'string', enum: ['oldest', 'youngest', 'name'] },
          limit:        { type: 'number', description: 'Max results (default 10, max 25)' },
          no_narrative: { type: 'boolean', description: 'If true, only return people without a narrative' },
        },
      },
    },
    {
      name: 'get_line',
      description: 'Follow the direct paternal line (father → grandfather → …) or maternal line (mother → grandmother → …) from a given person.',
      input_schema: {
        type: 'object' as const,
        properties: {
          personId: { type: 'string' },
          line:     { type: 'string', enum: ['paternal', 'maternal'], description: 'Which line to follow' },
        },
        required: ['personId', 'line'],
      },
    },
    {
      name: 'get_relatives',
      description: 'Get the parents, spouses, children, or siblings of a person.',
      input_schema: {
        type: 'object' as const,
        properties: {
          personId: { type: 'string' },
          relation: { type: 'string', enum: ['parents', 'children', 'spouses', 'siblings'] },
        },
        required: ['personId', 'relation'],
      },
    },
  ];

  if (canEdit) {
    tools.push({
      name: 'generate_narrative',
      description: 'Generate (or regenerate) the biographical narrative for a specific person. Use this when asked to write narratives for people. For multiple people, call this tool once per person.',
      input_schema: {
        type: 'object' as const,
        properties: {
          personId:   { type: 'string' },
          personName: { type: 'string', description: 'Display name (for status messages)' },
        },
        required: ['personId', 'personName'],
      },
    });
    tools.push({
      name: 'search_external_matches',
      description: 'Search FamilySearch, WikiTree, and Geni for external records that match a person in this tree. Stores any matches as pending hints for the editor to review and confirm — matches are never applied automatically. Use when asked to find external records, search for matches, look someone up in external databases, or find genealogy records for a person.',
      input_schema: {
        type: 'object' as const,
        properties: {
          personId:   { type: 'string', description: 'The CUID of the person to search for' },
          personName: { type: 'string', description: 'Display name (for status messages)' },
        },
        required: ['personId', 'personName'],
      },
    });
  }

  return tools;
}

// ── Tool implementations ────────────────────────────────────────────────────
async function toolSearchPeople(treeId: string, query: string, limit = 8) {
  const people = await prisma.person.findMany({
    where: { treeId, name: { contains: query } },
    select: { id: true, name: true, birthDate: true, deathDate: true, birthPlace: true },
    take: Math.min(limit, 20),
  });
  return people.map(p => ({ ...p, name: cleanName(p.name) }));
}

async function toolGetPerson(treeId: string, personId: string) {
  const p = await prisma.person.findFirst({
    where: { id: personId, treeId },
    include: {
      childIn:  { include: { family: { include: { husband: true, wife: true } } } },
      asHusband: { include: { wife: true, children: { include: { person: true } } } },
      asWife:    { include: { husband: true, children: { include: { person: true } } } },
    },
  });
  if (!p) return { error: 'Person not found' };

  const parents: object[] = [];
  for (const fc of p.childIn) {
    if (fc.family.husband) parents.push({ id: fc.family.husband.id, name: cleanName(fc.family.husband.name), birthDate: fc.family.husband.birthDate });
    if (fc.family.wife)    parents.push({ id: fc.family.wife.id,    name: cleanName(fc.family.wife.name),    birthDate: fc.family.wife.birthDate });
  }

  const seenSpouses = new Set<string>();
  const spouses: object[] = [];
  for (const f of p.asHusband) {
    if (f.wife && !seenSpouses.has(f.wife.id)) {
      seenSpouses.add(f.wife.id);
      spouses.push({ id: f.wife.id, name: cleanName(f.wife.name), birthDate: f.wife.birthDate });
    }
  }
  for (const f of p.asWife) {
    if (f.husband && !seenSpouses.has(f.husband.id)) {
      seenSpouses.add(f.husband.id);
      spouses.push({ id: f.husband.id, name: cleanName(f.husband.name), birthDate: f.husband.birthDate });
    }
  }

  const seenChildren = new Set<string>();
  const children: object[] = [];
  for (const f of [...p.asHusband, ...p.asWife]) {
    for (const c of f.children) {
      if (!seenChildren.has(c.person.id)) {
        seenChildren.add(c.person.id);
        children.push({ id: c.person.id, name: cleanName(c.person.name), birthDate: c.person.birthDate });
      }
    }
  }

  return {
    id: p.id, name: cleanName(p.name),
    sex: p.sex, birthDate: p.birthDate, birthPlace: p.birthPlace,
    deathDate: p.deathDate, deathPlace: p.deathPlace,
    occupation: p.occupation,
    hasNarrative: !!p.narrative,
    parents, spouses, children,
  };
}

async function toolListPeople(treeId: string, opts: { sort?: string; limit?: number; no_narrative?: boolean }) {
  const limit = Math.min(opts.limit ?? 10, 25);
  const where: Record<string, unknown> = { treeId };
  if (opts.no_narrative) where.narrative = null;

  if (opts.sort === 'oldest' || opts.sort === 'youngest') {
    const people = await prisma.person.findMany({
      where: { ...where, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true, deathDate: true },
    });
    const withYear = people
      .map(p => ({ ...p, year: parseInt(p.birthDate!.match(/\d{4}/)?.[0] ?? '9999') }))
      .filter(p => p.year !== 9999);
    withYear.sort((a, b) => opts.sort === 'oldest' ? a.year - b.year : b.year - a.year);
    return withYear.slice(0, limit).map(({ year: _, ...p }) => ({ ...p, name: cleanName(p.name) }));
  }

  const people = await prisma.person.findMany({
    where,
    select: { id: true, name: true, birthDate: true, deathDate: true },
    take: limit,
    orderBy: { name: 'asc' },
  });
  return people.map(p => ({ ...p, name: cleanName(p.name) }));
}

async function toolGetLine(treeId: string, personId: string, line: 'paternal' | 'maternal') {
  const result: object[] = [];
  let currentId = personId;
  const MAX_DEPTH = 25;

  for (let i = 0; i < MAX_DEPTH; i++) {
    const person = await prisma.person.findFirst({
      where: { id: currentId, treeId },
      select: {
        id: true, name: true, birthDate: true, deathDate: true, birthPlace: true,
        childIn: { include: { family: { select: {
          husband: { select: { id: true, name: true, birthDate: true } },
          wife:    { select: { id: true, name: true, birthDate: true } },
        } } } },
      },
    });
    if (!person) break;

    result.push({ id: person.id, name: cleanName(person.name), birthDate: person.birthDate, deathDate: person.deathDate, birthPlace: person.birthPlace });

    let nextId: string | null = null;
    for (const fc of person.childIn) {
      const parent = line === 'paternal' ? fc.family.husband : fc.family.wife;
      if (parent) { nextId = parent.id; break; }
    }
    if (!nextId) break;
    currentId = nextId;
  }

  return { line, people: result };
}

async function toolGetRelatives(treeId: string, personId: string, relation: string) {
  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    include: {
      childIn:  { include: { family: { include: { husband: true, wife: true } } } },
      asHusband: { include: { wife: true, children: { include: { person: true } } } },
      asWife:    { include: { husband: true, children: { include: { person: true } } } },
    },
  });
  if (!person) return { error: 'Person not found' };

  const fmt = (p: { id: string; name: string; birthDate: string | null }) =>
    ({ id: p.id, name: cleanName(p.name), birthDate: p.birthDate });

  if (relation === 'parents') {
    const parents: object[] = [];
    const seen = new Set<string>();
    for (const fc of person.childIn) {
      if (fc.family.husband && !seen.has(fc.family.husband.id)) { seen.add(fc.family.husband.id); parents.push(fmt(fc.family.husband)); }
      if (fc.family.wife    && !seen.has(fc.family.wife.id))    { seen.add(fc.family.wife.id);    parents.push(fmt(fc.family.wife));    }
    }
    return { relation, people: parents };
  }

  if (relation === 'spouses') {
    const spouses: object[] = [];
    const seen = new Set<string>();
    for (const f of person.asHusband) { if (f.wife    && !seen.has(f.wife.id))    { seen.add(f.wife.id);    spouses.push(fmt(f.wife));    } }
    for (const f of person.asWife)    { if (f.husband && !seen.has(f.husband.id)) { seen.add(f.husband.id); spouses.push(fmt(f.husband)); } }
    return { relation, people: spouses };
  }

  if (relation === 'children') {
    const children: object[] = [];
    const seen = new Set<string>();
    for (const f of [...person.asHusband, ...person.asWife]) {
      for (const c of f.children) {
        if (!seen.has(c.person.id)) { seen.add(c.person.id); children.push(fmt(c.person)); }
      }
    }
    return { relation, people: children };
  }

  if (relation === 'siblings') {
    const siblings: object[] = [];
    const seen = new Set<string>([personId]);
    for (const fc of person.childIn) {
      const fam = await prisma.family.findFirst({
        where: { id: fc.family.id },
        include: { children: { include: { person: true } } },
      });
      if (fam) {
        for (const c of fam.children) {
          if (!seen.has(c.person.id)) { seen.add(c.person.id); siblings.push(fmt(c.person)); }
        }
      }
    }
    return { relation, people: siblings };
  }

  return { error: 'Unknown relation' };
}

async function toolSearchExternalMatches(treeId: string, personId: string, userId: string) {
  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    select: { id: true, name: true },
  });
  if (!person) return { error: 'Person not found' };

  await searchAndStoreMatches(personId, treeId, userId);

  const matches = await prisma.familySearchMatch.findMany({
    where:   { personId, treeId, status: 'pending' },
    orderBy: { score: 'desc' },
    select:  { source: true, score: true, fsData: true },
  });

  if (matches.length === 0) {
    return { found: 0, message: 'No external matches found for this person.' };
  }

  return {
    found: matches.length,
    message: `Found ${matches.length} pending match${matches.length === 1 ? '' : 'es'} stored for review in the record hints panel.`,
    matches: matches.map(m => ({
      source: m.source,
      score:  Math.round(m.score),
      name:   (JSON.parse(m.fsData) as { name: string }).name,
    })),
  };
}

// ── Main handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const { treeId } = await params;

  const auth = await requireTreeAccess(treeId, 'viewer');
  if (auth instanceof NextResponse) return auth;

  const { tree, treeRole } = auth;
  const authorId = auth.userId;
  const canEdit = treeRole === 'editor' || treeRole === 'admin';

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

  const body = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    currentPersonId?: string;
  };

  if (!body.messages?.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  const client  = new Anthropic({ apiKey });
  const model   = modelValue || 'claude-sonnet-4-6';
  const tools   = buildTools(canEdit);
  const encoder = new TextEncoder();

  // Build system prompt
  let currentPersonContext = '';
  if (body.currentPersonId) {
    const cp = await prisma.person.findFirst({
      where: { id: body.currentPersonId, treeId: tree.id },
      select: { name: true },
    });
    if (cp) currentPersonContext = `\nThe user is currently viewing: ${cleanName(cp.name)} (id: ${body.currentPersonId})`;
  }

  const system = `You are a knowledgeable and warm assistant for a private family history website called "${tree.name}". You help users explore their family tree, answer genealogical questions, and${canEdit ? ' generate biographical narratives.' : ' learn about their ancestors.'}

${currentPersonContext}

Guidelines:
- Use the tools to look up real data from the tree before answering questions about specific people
- Format your responses as HTML using these CSS classes: <p class="body-text">, <p class="section-title">, <div class="pull-quote">
- When mentioning a specific person from the database, make their name a clickable link: <a class="chat-person-link" data-id="THEIR_CUID">Their Name</a>
- Be conversational and warm, like a knowledgeable family historian
- For lists of people (e.g. a paternal line), present them as a readable <ul> list using <li> elements
- NEVER use markdown — no **bold**, no *italic*, no ## headings, no backticks${canEdit ? '\n- When generating narratives for multiple people, call generate_narrative once per person in sequence\n- When asked to search external sources or find record matches, use search_external_matches. Always clarify that matches are stored as pending hints for the editor to review — they are never applied automatically.' : ''}`;

  const stream = new ReadableStream({
    async start(controller) {
      // Keep the connection alive during long Anthropic calls (prevents 524s)
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encode({ t: 'k' })); } catch { /* stream closed */ }
      }, 5000);

      try {
        // Build conversation history for Claude
        const messages: Anthropic.MessageParam[] = body.messages.map(m => ({
          role:    m.role,
          content: m.content,
        }));

        const MAX_ITERATIONS = 8;
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const response = await client.messages.create({
            model,
            max_tokens: 2000,
            system,
            tools,
            messages,
          });

          if (response.stop_reason === 'end_turn') {
            const text = response.content
              .filter(b => b.type === 'text')
              .map(b => (b as { type: 'text'; text: string }).text)
              .join('');
            controller.enqueue(encode({ t: 'd', v: text }));
            break;
          }

          if (response.stop_reason === 'tool_use') {
            const toolBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const tb of toolBlocks) {
              const input = tb.input as Record<string, unknown>;

              // Status update to client
              let statusText = `Looking up ${tb.name.replace(/_/g, ' ')}…`;
              if (tb.name === 'generate_narrative')      statusText = `Generating narrative for ${input.personName ?? ''}…`;
              else if (tb.name === 'search_people')      statusText = `Searching for "${input.query}"…`;
              else if (tb.name === 'get_line')            statusText = `Tracing ${input.line} line…`;
              else if (tb.name === 'search_external_matches') statusText = `Searching external sources for ${input.personName ?? ''}…`;
              controller.enqueue(encode({ t: 's', v: statusText }));

              let result: unknown;
              try {
                switch (tb.name) {
                  case 'search_people':
                    result = await toolSearchPeople(tree.id, input.query as string, input.limit as number | undefined);
                    break;
                  case 'get_person':
                    result = await toolGetPerson(tree.id, input.personId as string);
                    break;
                  case 'list_people':
                    result = await toolListPeople(tree.id, input as { sort?: string; limit?: number; no_narrative?: boolean });
                    break;
                  case 'get_line':
                    result = await toolGetLine(tree.id, input.personId as string, input.line as 'paternal' | 'maternal');
                    break;
                  case 'get_relatives':
                    result = await toolGetRelatives(tree.id, input.personId as string, input.relation as string);
                    break;
                  case 'generate_narrative':
                    if (!canEdit) { result = { error: 'Narrative generation requires editor access' }; break; }
                    result = await generateAndSaveNarrative({
                      personId: input.personId as string,
                      treeId:   tree.id,
                      client,
                      model,
                      authorId,
                    });
                    break;
                  case 'search_external_matches':
                    if (!canEdit) { result = { error: 'Searching external sources requires editor access' }; break; }
                    result = await toolSearchExternalMatches(tree.id, input.personId as string, authorId);
                    // Notify client to re-fetch hints for this person
                    controller.enqueue(encode({ t: 'm', v: input.personId as string }));
                    break;
                  default:
                    result = { error: 'Unknown tool' };
                }
              } catch (err) {
                result = { error: err instanceof Error ? err.message : 'Tool error' };
              }

              toolResults.push({
                type:        'tool_result',
                tool_use_id: tb.id,
                content:     JSON.stringify(result),
              });
            }

            // Add assistant turn + tool results to message history
            messages.push({ role: 'assistant', content: response.content });
            messages.push({ role: 'user',      content: toolResults });
          }
        }

        controller.enqueue(encode({ t: 'x' }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chat error';
        controller.enqueue(encode({ t: 'e', v: msg }));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });
}
