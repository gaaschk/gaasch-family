/**
 * generate-narratives.mjs
 *
 * Calls POST /api/people/{id}/generate-narrative for each specified person,
 * using the API Bearer token from Admin → Settings.
 *
 * Usage:
 *   node scripts/generate-narratives.mjs [--url https://family.kevingaasch.com] [--token <token>] [--ids id1,id2,...]
 *
 * Or set env vars:
 *   API_URL=https://family.kevingaasch.com
 *   API_TOKEN=<token>
 *   API_IDS=@I500002@,@I500005@,...   (optional, defaults to Britton line)
 */

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const BASE_URL = getArg('--url')   || process.env.API_URL   || 'https://family.kevingaasch.com';
const TOKEN    = getArg('--token') || process.env.API_TOKEN || '';
const IDS_ARG  = getArg('--ids')   || process.env.API_IDS   || '';

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

console.log(`🖊️  Generating narratives for ${ids.length} people at ${BASE_URL}\n`);

let ok = 0, failed = 0;

for (const id of ids) {
  process.stdout.write(`  ${id.padEnd(14)} … `);

  try {
    const res = await fetch(`${BASE_URL}/api/people/${encodeURIComponent(id)}/generate-narrative`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.log(`❌  HTTP ${res.status} — ${text.slice(0, 80)}`);
      failed++;
      continue;
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
      console.log(`❌  ${errMsg}`);
      failed++;
    } else {
      console.log(`✅  ${full.length} chars`);
      ok++;
    }
  } catch (err) {
    console.log(`❌  ${err.message}`);
    failed++;
  }
}

console.log(`\n─────────────────────────────────`);
console.log(`✅  Generated: ${ok}`);
console.log(`❌  Failed:    ${failed}`);
