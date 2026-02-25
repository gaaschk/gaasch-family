/**
 * migrate-json.ts
 *
 * Seeds the Supabase/Postgres database from the static JSON data files
 * in the sibling gaasch-family project.
 *
 * Usage (from gaasch-family-next/):
 *   npm run db:seed
 *
 * Requires .env.local with DATABASE_URL and DIRECT_URL set.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Paths to the static JSON source files
const DATA_DIR = path.resolve(__dirname, '../../gaasch-family/src/data');

interface RawPerson {
  id: string;
  name: string;
  sex?: string;
  birt_date?: string;
  birt_plac?: string;
  deat_date?: string;
  deat_plac?: string;
  buri_plac?: string;
  buri_date?: string;
  occu?: string;
  note?: string;
  famc?: string[];
  fams?: string[];
}

interface RawFamily {
  id: string;
  husb?: string;
  wife?: string;
  children?: string[];
  marr_date?: string;
  marr_plac?: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function main() {
  console.log('Reading source JSON files…');
  const peopleRaw: RawPerson[]  = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'people.json'),   'utf-8'));
  const familiesRaw: RawFamily[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'families.json'), 'utf-8'));

  console.log(`Found ${peopleRaw.length} people, ${familiesRaw.length} families.`);

  // --- People ---
  console.log('Upserting people…');
  const personChunks = chunk(peopleRaw, 100);
  for (const batch of personChunks) {
    await Promise.all(batch.map(p =>
      prisma.person.upsert({
        where:  { id: p.id },
        create: {
          id:          p.id,
          name:        p.name,
          sex:         p.sex         ?? null,
          birthDate:   p.birt_date   ?? null,
          birthPlace:  p.birt_plac   ?? null,
          deathDate:   p.deat_date   ?? null,
          deathPlace:  p.deat_plac   ?? null,
          burialPlace: p.buri_plac   ?? null,
          burialDate:  p.buri_date   ?? null,
          occupation:  p.occu        ?? null,
          notes:       p.note        ?? null,
        },
        update: {
          name:        p.name,
          sex:         p.sex         ?? null,
          birthDate:   p.birt_date   ?? null,
          birthPlace:  p.birt_plac   ?? null,
          deathDate:   p.deat_date   ?? null,
          deathPlace:  p.deat_plac   ?? null,
          burialPlace: p.buri_plac   ?? null,
          burialDate:  p.buri_date   ?? null,
          occupation:  p.occu        ?? null,
          notes:       p.note        ?? null,
        },
      })
    ));
    process.stdout.write('.');
  }
  console.log('\nPeople done.');

  // --- Families ---
  console.log('Upserting families…');
  for (const f of familiesRaw) {
    await prisma.family.upsert({
      where:  { id: f.id },
      create: {
        id:        f.id,
        husbId:    f.husb     ?? null,
        wifeId:    f.wife     ?? null,
        marrDate:  f.marr_date ?? null,
        marrPlace: f.marr_plac ?? null,
      },
      update: {
        husbId:    f.husb     ?? null,
        wifeId:    f.wife     ?? null,
        marrDate:  f.marr_date ?? null,
        marrPlace: f.marr_plac ?? null,
      },
    });
  }
  console.log('Families done.');

  // --- Family children (join table) ---
  console.log('Upserting family_children…');
  for (const f of familiesRaw) {
    for (const childId of (f.children ?? [])) {
      await prisma.familyChild.upsert({
        where:  { familyId_personId: { familyId: f.id, personId: childId } },
        create: { familyId: f.id, personId: childId },
        update: {},
      });
    }
  }
  console.log('Family children done.');

  console.log('\nMigration complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
