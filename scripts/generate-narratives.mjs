/**
 * generate-narratives.mjs
 *
 * Calls POST /api/people/{id}/generate-narrative for each specified person,
 * using the API Bearer token from Admin → Settings.
 *
 * Usage:
 *   node scripts/generate-narratives.mjs [options]
 *
 * Options:
 *   --url         Base URL (default: https://family.kevingaasch.com)
 *   --token       API bearer token
 *   --ids         Comma-separated person IDs (default: Britton line)
 *   --model       Model override, e.g. claude-haiku-4-5-20251001
 *   --concurrency Max parallel requests (default: 5)
 *
 * Or set env vars: API_URL, API_TOKEN, API_IDS, API_MODEL
 */

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const BASE_URL    = getArg('--url')         || process.env.API_URL         || 'https://family.kevingaasch.com';
const TOKEN       = getArg('--token')       || process.env.API_TOKEN       || '';
const IDS_ARG     = getArg('--ids')         || process.env.API_IDS         || '';
const MODEL       = getArg('--model')       || process.env.API_MODEL       || '';
const CONCURRENCY = parseInt(getArg('--concurrency') || '5', 10);

if (!TOKEN) {
  console.error('❌  No API token provided. Pass --token <token> or set API_TOKEN env var.');
  process.exit(1);
}

// Default: Lula + full Britton paternal line + spouses
const DEFAULT_IDS = [
  '@I500002@', // Lula Annetta Britton
  '@I500005@', // Charles Homer Britton
  '@I500004@', // Bertha Flois Gunter
  '@I500979@', // Albert Green Britton Jr
  '@I500980@', // Clara Ann Shaffer
  '@I501002@', // Albert Green Britton Sr
  '@I501003@', // Mary Frances Pinkerton
  '@I501110@', // David Madison Britton
  '@I501111@', // Mary Elizabeth Porterfield
  '@I501284@', // Joseph Brittain
  '@I501285@', // Dorothy Horner
  '@I501423@', // Joseph B Brittain
  '@I501424@', // Jemima Mary Elrod
  '@I501594@', // James Asa Brittain
  '@I501595@', // Mary Isabel Witty
  '@I501730@', // William Asa Brittain
  '@I501731@', // Hanna Achea
];

const ids = IDS_ARG ? IDS_ARG.split(',').map(s => s.trim()) : DEFAULT_IDS;
const modelNote = MODEL ? ` (model: ${MODEL})` : '';
console.log(`🖊️  Generating narratives for ${ids.length} people at ${BASE_URL}${modelNote} — concurrency ${CONCURRENCY}\n`);

let ok = 0, failed = 0;

async function generate(id) {
  const url = new URL(`/api/people/${encodeURIComponent(id)}/generate-narrative`, BASE_URL);
  if (MODEL) url.searchParams.set('model', MODEL);

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.log(`  ${id.padEnd(14)} ❌  HTTP ${res.status} — ${text.slice(0, 80)}`);
      failed++;
      return;
    }

    // Consume the stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
    }

    if (full.includes('__ERROR__')) {
      const errMsg = full.split('__ERROR__:')[1]?.trim().slice(0, 100) || 'unknown error';
      console.log(`  ${id.padEnd(14)} ❌  ${errMsg}`);
      failed++;
    } else {
      console.log(`  ${id.padEnd(14)} ✅  ${full.length} chars`);
      ok++;
    }
  } catch (err) {
    console.log(`  ${id.padEnd(14)} ❌  ${err.message}`);
    failed++;
  }
}

// Run with a concurrency pool
for (let i = 0; i < ids.length; i += CONCURRENCY) {
  await Promise.all(ids.slice(i, i + CONCURRENCY).map(generate));
}

console.log(`\n─────────────────────────────────`);
console.log(`✅  Generated: ${ok}`);
console.log(`❌  Failed:    ${failed}`);
