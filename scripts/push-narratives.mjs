/**
 * push-narratives.mjs
 *
 * Reads the narratives from the legacy narratives.json and PATCHes each one
 * into the running Next.js API.
 *
 * Usage:
 *   node scripts/push-narratives.mjs [--url http://localhost:3000] [--cookie "session=..."]
 *
 * The script needs an authenticated session cookie with editor or admin role.
 * Get it by:
 *   1. Sign in to the admin panel in your browser
 *   2. Open DevTools → Application → Cookies → copy the value of "authjs.session-token"
 *   3. Pass it as: --cookie "authjs.session-token=<value>"
 *
 * Or set env vars:
 *   API_URL=http://localhost:3000
 *   API_COOKIE="authjs.session-token=<value>"
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Parse args
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const BASE_URL = getArg('--url') || process.env.API_URL || 'http://localhost:3000';
const COOKIE   = getArg('--cookie') || process.env.API_COOKIE || '';

if (!COOKIE) {
  console.error('❌  No session cookie provided.');
  console.error('   Pass --cookie "authjs.session-token=<value>" or set API_COOKIE env var.');
  process.exit(1);
}

// Load narratives — the script lives in scripts/, narratives.json is passed as arg or found relative
const narrativesPath = getArg('--narratives')
  || join(__dir, '../narratives.json');

let narratives;
try {
  narratives = JSON.parse(readFileSync(narrativesPath, 'utf8'));
} catch {
  // Try the legacy location
  try {
    const legacyPath = join(__dir, '../../gaasch-family/src/data/narratives.json');
    narratives = JSON.parse(readFileSync(legacyPath, 'utf8'));
    console.log(`ℹ️  Loaded narratives from legacy path: ${legacyPath}`);
  } catch {
    console.error(`❌  Could not find narratives.json. Pass --narratives <path>`);
    process.exit(1);
  }
}

const ids = Object.keys(narratives);
console.log(`📖  Found ${ids.length} narratives to push to ${BASE_URL}\n`);

let ok = 0, skipped = 0, failed = 0;

for (const id of ids) {
  const narrative = narratives[id];
  if (!narrative || !narrative.trim()) {
    skipped++;
    continue;
  }

  const url = `${BASE_URL}/api/people/${encodeURIComponent(id)}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': COOKIE,
      },
      body: JSON.stringify({ narrative }),
    });

    if (res.ok) {
      console.log(`✅  ${id}`);
      ok++;
    } else if (res.status === 404) {
      console.log(`⚠️   ${id} — not found in DB (skipped)`);
      skipped++;
    } else {
      const text = await res.text().catch(() => res.statusText);
      console.error(`❌  ${id} — ${res.status} ${text}`);
      failed++;
    }
  } catch (err) {
    console.error(`❌  ${id} — network error: ${err.message}`);
    failed++;
  }
}

console.log(`\n─────────────────────────────────`);
console.log(`✅  Updated:  ${ok}`);
console.log(`⚠️   Skipped:  ${skipped}`);
console.log(`❌  Failed:   ${failed}`);
