import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { requireTreeAccessOrToken } from '@/lib/auth';
import { buildNarrativePrompt } from '@/lib/narrative';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Params = { params: Promise<{ treeId: string; id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { treeId, id } = await params;

  const auth = await requireTreeAccessOrToken(req, treeId, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { tree } = auth;
  const authorId = auth.userId === 'api' ? null : auth.userId;

  // Load API key + model from tree-scoped settings
  const [apiKeySetting, modelSetting] = await Promise.all([
    prisma.setting.findFirst({ where: { treeId: tree.id, key: 'anthropic_api_key' } }),
    prisma.setting.findFirst({ where: { treeId: tree.id, key: 'anthropic_model' } }),
  ]);

  if (!apiKeySetting?.value) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Go to Admin → Settings.' },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey: apiKeySetting.value });
  const searchParams = new URL(req.url).searchParams;
  const modelOverride = searchParams.get('model');
  const model = modelOverride || modelSetting?.value || 'claude-sonnet-4-6';
  const streaming = searchParams.get('stream') !== 'false';

  const person = await prisma.person.findFirst({
    where: { id, treeId: tree.id },
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

  const prompt = buildNarrativePrompt(person);
  const previousNarrative = person.narrative;

  const messageParams = {
    model,
    max_tokens: 1500,
    messages:   [{ role: 'user' as const, content: prompt }],
  };

  function stripFences(text: string) {
    return text.replace(/^```(?:html)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

  async function saveNarrative(raw: string) {
    const cleaned = stripFences(raw);
    await prisma.person.update({ where: { id }, data: { narrative: cleaned } });
    await prisma.auditLog.create({
      data: {
        tableName: 'people',
        recordId:  id,
        action:    'generate-narrative',
        oldData:   JSON.stringify({ narrative: previousNarrative }),
        newData:   JSON.stringify({ narrative: cleaned }),
        treeId:    tree.id,
        userId:    authorId,
      },
    });
    return cleaned;
  }

  // ── Non-streaming (script / API callers) ──────────────────────────────────
  if (!streaming) {
    try {
      const message = await client.messages.create(messageParams);
      const raw = message.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');
      const cleaned = await saveNarrative(raw);
      return NextResponse.json({ narrative: cleaned });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── Streaming (browser UI) ─────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let fullText = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream(messageParams);

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        await saveNarrative(fullText);
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
