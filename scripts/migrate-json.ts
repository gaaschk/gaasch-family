/**
 * migrate-json.ts
 *
 * Seeds the SQLite database from the static JSON data files
 * in the sibling gaasch-family project.
 *
 * Usage (from gaasch-family-next/):
 *   npm run db:seed
 *
 * Requires .env.local with DATABASE_URL set.
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
  birth?: string;
  birth_place?: string;
  death?: string;
  death_place?: string;
  occupation?: string;
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
  const personChunks = chunk(peopleRaw, 10);
  for (const batch of personChunks) {
    await Promise.all(batch.map(p =>
      prisma.person.upsert({
        where:  { id: p.id },
        create: {
          id:          p.id,
          name:        p.name,
          sex:         p.sex          ?? null,
          birthDate:   p.birth        ?? null,
          birthPlace:  p.birth_place  ?? null,
          deathDate:   p.death        ?? null,
          deathPlace:  p.death_place  ?? null,
          burialPlace: null,
          burialDate:  null,
          occupation:  p.occupation   ?? null,
          notes:       null,
        },
        update: {
          name:        p.name,
          sex:         p.sex          ?? null,
          birthDate:   p.birth        ?? null,
          birthPlace:  p.birth_place  ?? null,
          deathDate:   p.death        ?? null,
          deathPlace:  p.death_place  ?? null,
          burialPlace: null,
          burialDate:  null,
          occupation:  p.occupation   ?? null,
          notes:       null,
        },
      })
    ));
    process.stdout.write('.');
  }
  console.log('\nPeople done.');

  // Build a set of all valid person IDs to guard against orphaned references
  const validPersonIds = new Set(peopleRaw.map(p => p.id));

  // --- Families ---
  console.log('Upserting families…');
  for (const batch of chunk(familiesRaw, 10)) {
    await Promise.all(batch.map(f =>
      prisma.family.upsert({
        where:  { id: f.id },
        create: {
          id:        f.id,
          husbId:    f.husb && validPersonIds.has(f.husb) ? f.husb : null,
          wifeId:    f.wife && validPersonIds.has(f.wife) ? f.wife : null,
          marrDate:  f.marr_date ?? null,
          marrPlace: f.marr_plac ?? null,
        },
        update: {
          husbId:    f.husb && validPersonIds.has(f.husb) ? f.husb : null,
          wifeId:    f.wife && validPersonIds.has(f.wife) ? f.wife : null,
          marrDate:  f.marr_date ?? null,
          marrPlace: f.marr_plac ?? null,
        },
      })
    ));
    process.stdout.write('.');
  }
  console.log('\nFamilies done.');

  // --- Family children (join table) ---
  // Use createMany with skipDuplicates — sends large batches instead of one query per row
  console.log('Upserting family_children…');
  const allChildren = familiesRaw.flatMap(f =>
    (f.children ?? [])
      .filter(childId => validPersonIds.has(childId))
      .map(childId => ({ familyId: f.id, personId: childId }))
  );
  for (const batch of chunk(allChildren, 50)) {
    await prisma.$transaction(
      batch.map(({ familyId, personId }) =>
        prisma.familyChild.upsert({
          where:  { familyId_personId: { familyId, personId } },
          create: { familyId, personId },
          update: {},
        })
      )
    );
    process.stdout.write('.');
  }
  console.log('\nFamily children done.');

  console.log('\nMigration complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
