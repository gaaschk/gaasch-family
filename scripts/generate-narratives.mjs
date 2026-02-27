/**
 * generate-narratives.mjs
 *
 * Calls POST /api/trees/{tree}/people/{id}/generate-narrative for each
 * specified person, using the API Bearer token from Tree → Settings.
 *
 * Usage:
 *   node scripts/generate-narratives.mjs [options]
 *
 * Options:
 *   --url         Base URL (default: http://localhost:3000)
 *   --token       API bearer token (set in Tree → Admin → Settings)
 *   --tree        Tree slug or id (required)
 *   --ids         Comma-separated person IDs (CUID or gedcomId)
 *   --model       Model override, e.g. claude-haiku-4-5-20251001
 *   --concurrency Max parallel requests (default: 5)
 *
 * Or set env vars: API_URL, API_TOKEN, API_TREE, API_IDS, API_MODEL
 *
 * Examples:
 *   node scripts/generate-narratives.mjs \
 *     --url https://family.example.com \
 *     --token abc123 \
 *     --tree gaasch-family \
 *     --ids cm123,cm456
 */

const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const BASE_URL    = getArg('--url')         || process.env.API_URL         || 'http://localhost:3000';
const TOKEN       = getArg('--token')       || process.env.API_TOKEN       || '';
const TREE        = getArg('--tree')        || process.env.API_TREE        || '';
const IDS_ARG     = getArg('--ids')         || process.env.API_IDS         || '';
const MODEL       = getArg('--model')       || process.env.API_MODEL       || '';
const CONCURRENCY = parseInt(getArg('--concurrency') || '5', 10);

if (!TOKEN) {
  console.error('❌  No API token provided. Pass --token <token> or set API_TOKEN env var.');
  process.exit(1);
}

if (!TREE) {
  console.error('❌  No tree specified. Pass --tree <slug> or set API_TREE env var.');
  process.exit(1);
}

if (!IDS_ARG) {
  console.error('❌  No person IDs provided. Pass --ids <id1,id2,...> or set API_IDS env var.');
  process.exit(1);
}

const ids       = IDS_ARG.split(',').map(s => s.trim()).filter(Boolean);
const modelNote = MODEL ? ` (model: ${MODEL})` : '';

console.log(`🖊️  Generating narratives for ${ids.length} people`);
console.log(`   tree: ${TREE} | base: ${BASE_URL}${modelNote} | concurrency: ${CONCURRENCY}\n`);

let ok = 0, failed = 0;

async function generate(id, attempt = 1) {
  const url = new URL(
    `/api/trees/${encodeURIComponent(TREE)}/people/${encodeURIComponent(id)}/generate-narrative`,
    BASE_URL,
  );
  if (MODEL) url.searchParams.set('model', MODEL);
  url.searchParams.set('stream', 'false');

  try {
    const res = await fetch(url.toString(), {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      const isOverloaded = text.includes('overloaded_error');
      if (isOverloaded && attempt < 4) {
        const wait = attempt * 10;
        console.log(`  ${id.padEnd(20)} ⏳  overloaded, retrying in ${wait}s (attempt ${attempt}/3)…`);
        await new Promise(r => setTimeout(r, wait * 1000));
        return generate(id, attempt + 1);
      }
      console.log(`  ${id.padEnd(20)} ❌  HTTP ${res.status} — ${text.slice(0, 80)}`);
      failed++;
      return;
    }

    const json = await res.json();
    if (json.error) {
      console.log(`  ${id.padEnd(20)} ❌  ${json.error.slice(0, 100)}`);
      failed++;
    } else {
      console.log(`  ${id.padEnd(20)} ✅  ${json.narrative?.length ?? 0} chars`);
      ok++;
    }
  } catch (err) {
    console.log(`  ${id.padEnd(20)} ❌  ${err.message}`);
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
