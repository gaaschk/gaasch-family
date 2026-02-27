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

// Kevin's paternal Gaasch line + spouses (Generation 10 → 1)
const GAASCH_LINE = [
  '@I500001@', // Kevin Eugene Gaasch
  '@I500002@', // Lula Annetta Britton (Kevin's mother)
  '@I500003@', // Phil Eugene Gaasch
  '@I500006@', // Elizabeth Adeline Fleming
  '@I500007@', // Melvin Lloyd Gaasch
  '@I500009@', // Alice Sypher Jenkinson
  '@I500008@', // Glenn Melvin Gaasch
  '@I500012@', // Mary Catherine Woolwine
  '@I500011@', // Peter Gaasch
  '@I500020@', // Catherine Sauber
  '@I500019@', // Joannes Gaasch (emigrant)
  '@I500036@', // Maria Prima Lorang
  '@I500035@', // Jacobus Gaasch
  '@I501476@', // Elisabeth Heiderscheid
  '@I501475@', // Simon Gaasch
  '@I501478@', // Jeanne Useldinger
  '@I501477@', // Nicolas Gaasch
  '@I501486@', // Anne Nee
  '@I501485@', // Jean Gaasch (earliest known, Alzingen)
];

// Lula's paternal Britton line + spouses
const BRITTON_LINE = [
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

// Deduplicated combined list
const DEFAULT_IDS = [...new Set([...GAASCH_LINE, ...BRITTON_LINE])];

const ids = IDS_ARG ? IDS_ARG.split(',').map(s => s.trim()) : DEFAULT_IDS;
const modelNote = MODEL ? ` (model: ${MODEL})` : '';
console.log(`🖊️  Generating narratives for ${ids.length} people at ${BASE_URL}${modelNote} — concurrency ${CONCURRENCY}\n`);

let ok = 0, failed = 0;

async function generate(id, attempt = 1) {
  const url = new URL(`/api/people/${encodeURIComponent(id)}/generate-narrative`, BASE_URL);
  if (MODEL) url.searchParams.set('model', MODEL);
  url.searchParams.set('stream', 'false');

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      const isOverloaded = text.includes('overloaded_error');
      if (isOverloaded && attempt < 4) {
        const wait = attempt * 10;
        console.log(`  ${id.padEnd(14)} ⏳  overloaded, retrying in ${wait}s (attempt ${attempt}/3)…`);
        await new Promise(r => setTimeout(r, wait * 1000));
        return generate(id, attempt + 1);
      }
      console.log(`  ${id.padEnd(14)} ❌  HTTP ${res.status} — ${text.slice(0, 80)}`);
      failed++;
      return;
    }

    const json = await res.json();
    if (json.error) {
      console.log(`  ${id.padEnd(14)} ❌  ${json.error.slice(0, 100)}`);
      failed++;
    } else {
      console.log(`  ${id.padEnd(14)} ✅  ${json.narrative.length} chars`);
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
