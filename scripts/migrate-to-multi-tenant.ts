/**
 * scripts/migrate-to-multi-tenant.ts
 *
 * One-time data migration for the multi-tenancy transition.
 *
 * Run AFTER `npm run db:migrate` (Migration 1) and BEFORE the second migration:
 *   dotenv -e .env.local -- tsx scripts/migrate-to-multi-tenant.ts
 *
 * What this script does:
 *  1. Finds the first admin user to own the default tree
 *  2. Creates the "gaasch-family" Tree record
 *  3. Adds the admin user as a tree member (role: admin)
 *  4. Generates new CUIDs for every Person and Family
 *  5. Clears and rebuilds people, families, family_children with new IDs + treeId
 *  6. Preserves all existing narrative text
 *  7. Updates settings with treeId
 *  8. Updates audit logs with treeId
 *
 * After running this script, update prisma/schema.prisma with the final schema
 * (see prisma/schema.final.prisma) and run `npm run db:migrate` again.
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

function newCuid(): string {
  // Generates a cuid-compatible ID: starts with 'c', 25 chars total
  return 'c' + randomBytes(12).toString('hex');
}

async function main() {
  console.log('=== Multi-Tenancy Migration ===\n');

  // ── Step 1: Find admin user ────────────────────────────────────────────────
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
  });

  if (!admin) {
    console.error('ERROR: No admin user found. Promote a user to admin first.');
    console.error('  Use: npx prisma studio → User table → set role to "admin"');
    process.exit(1);
  }

  console.log(`Found admin user: ${admin.email} (${admin.id})`);

  // ── Step 2: Read all existing data BEFORE clearing ────────────────────────
  const [existingPeople, existingFamilies, existingFamilyChildren, existingSettings, existingAuditLogs] =
    await Promise.all([
      prisma.person.findMany(),
      prisma.family.findMany(),
      prisma.familyChild.findMany(),
      prisma.setting.findMany(),
      prisma.auditLog.findMany(),
    ]);

  console.log(`\nReading existing data...`);
  console.log(`  People: ${existingPeople.length}`);
  console.log(`  Families: ${existingFamilies.length}`);
  console.log(`  FamilyChildren: ${existingFamilyChildren.length}`);
  console.log(`  Settings: ${existingSettings.length}`);
  console.log(`  AuditLogs: ${existingAuditLogs.length}`);

  // ── Step 3: Create default Tree ────────────────────────────────────────────
  let tree = await prisma.tree.findFirst({ where: { slug: 'gaasch-family' } });
  if (tree) {
    console.log(`\nTree "gaasch-family" already exists (${tree.id}), skipping creation.`);
  } else {
    tree = await prisma.tree.create({
      data: {
        slug:        'gaasch-family',
        name:        'Gaasch Family',
        description: 'Ten generations from 17th-century Luxembourg to present-day Texas.',
        ownerId:     admin.id,
      },
    });
    console.log(`\nCreated tree: ${tree.name} (${tree.id})`);
  }

  // ── Step 4: Add admin as tree member (if not already) ─────────────────────
  const existingMember = await prisma.treeMember.findUnique({
    where: { treeId_userId: { treeId: tree.id, userId: admin.id } },
  });
  if (!existingMember) {
    await prisma.treeMember.create({
      data: { treeId: tree.id, userId: admin.id, role: 'admin' },
    });
    console.log(`Added ${admin.email} as tree admin.`);
  }

  // ── Step 5: Generate CUID mappings ────────────────────────────────────────
  // Only generate new IDs for records that don't already look like CUIDs
  // (i.e., they still have GEDCOM-style IDs like "@I500001@")
  const isGedcomId = (id: string) => id.startsWith('@') && id.endsWith('@');

  const personIdMap = new Map<string, string>(); // oldId → newCuid
  for (const p of existingPeople) {
    if (isGedcomId(p.id)) {
      personIdMap.set(p.id, newCuid());
    } else {
      // Already a CUID, keep it
      personIdMap.set(p.id, p.id);
    }
  }

  const familyIdMap = new Map<string, string>(); // oldId → newCuid
  for (const f of existingFamilies) {
    if (isGedcomId(f.id)) {
      familyIdMap.set(f.id, newCuid());
    } else {
      familyIdMap.set(f.id, f.id);
    }
  }

  const changed = [...personIdMap.values()].filter((v, i) =>
    v !== [...personIdMap.keys()][i]
  ).length;
  console.log(`\nGenerated ${personIdMap.size} person ID mappings (${changed} changed)`);
  console.log(`Generated ${familyIdMap.size} family ID mappings`);

  // ── Step 6: Clear dependent tables first ──────────────────────────────────
  console.log('\nClearing existing records...');
  await prisma.familyChild.deleteMany();
  await prisma.family.deleteMany();
  await prisma.person.deleteMany();
  console.log('  Cleared family_children, families, people');

  // ── Step 7: Reinsert People with new IDs + treeId ─────────────────────────
  console.log('\nReinserting people...');
  const BATCH = 50;

  for (let i = 0; i < existingPeople.length; i += BATCH) {
    const batch = existingPeople.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map(p => {
        const newId    = personIdMap.get(p.id)!;
        const gedcomId = isGedcomId(p.id) ? p.id : (p.gedcomId ?? null);
        return prisma.person.create({
          data: {
            id:          newId,
            treeId:      tree!.id,
            gedcomId:    gedcomId,
            name:        p.name,
            sex:         p.sex,
            birthDate:   p.birthDate,
            birthPlace:  p.birthPlace,
            deathDate:   p.deathDate,
            deathPlace:  p.deathPlace,
            burialPlace: p.burialPlace,
            burialDate:  p.burialDate,
            occupation:  p.occupation,
            notes:       p.notes,
            narrative:   p.narrative,    // PRESERVE existing narratives!
            createdAt:   p.createdAt,
            updatedAt:   p.updatedAt,
          },
        });
      })
    );
    process.stdout.write(`  ${Math.min(i + BATCH, existingPeople.length)}/${existingPeople.length}\r`);
  }
  console.log(`  Done. Inserted ${existingPeople.length} people.`);

  // ── Step 8: Reinsert Families with new IDs + treeId ───────────────────────
  console.log('\nReinserting families...');

  for (let i = 0; i < existingFamilies.length; i += BATCH) {
    const batch = existingFamilies.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map(f => {
        const newId     = familyIdMap.get(f.id)!;
        const gedcomId  = isGedcomId(f.id) ? f.id : (f.gedcomId ?? null);
        const newHusbId = f.husbId ? (personIdMap.get(f.husbId) ?? null) : null;
        const newWifeId = f.wifeId ? (personIdMap.get(f.wifeId) ?? null) : null;
        return prisma.family.create({
          data: {
            id:        newId,
            treeId:    tree!.id,
            gedcomId:  gedcomId,
            husbId:    newHusbId,
            wifeId:    newWifeId,
            marrDate:  f.marrDate,
            marrPlace: f.marrPlace,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt,
          },
        });
      })
    );
    process.stdout.write(`  ${Math.min(i + BATCH, existingFamilies.length)}/${existingFamilies.length}\r`);
  }
  console.log(`  Done. Inserted ${existingFamilies.length} families.`);

  // ── Step 9: Reinsert FamilyChild with new IDs ──────────────────────────────
  console.log('\nReinserting family children...');
  let skippedChildren = 0;

  for (let i = 0; i < existingFamilyChildren.length; i += BATCH) {
    const batch = existingFamilyChildren.slice(i, i + BATCH);
    const valid = batch.filter(fc => {
      const hasFamily = familyIdMap.has(fc.familyId);
      const hasPerson = personIdMap.has(fc.personId);
      if (!hasFamily || !hasPerson) skippedChildren++;
      return hasFamily && hasPerson;
    });

    if (valid.length > 0) {
      await prisma.$transaction(
        valid.map(fc =>
          prisma.familyChild.create({
            data: {
              familyId: familyIdMap.get(fc.familyId)!,
              personId: personIdMap.get(fc.personId)!,
            },
          })
        )
      );
    }
    process.stdout.write(`  ${Math.min(i + BATCH, existingFamilyChildren.length)}/${existingFamilyChildren.length}\r`);
  }
  console.log(`  Done. Inserted ${existingFamilyChildren.length - skippedChildren} family children.`);
  if (skippedChildren > 0) console.log(`  Skipped ${skippedChildren} orphaned family-child records.`);

  // ── Step 10: Update Settings with treeId ──────────────────────────────────
  console.log('\nUpdating settings with treeId...');
  for (const s of existingSettings) {
    if (!s.treeId) {
      await prisma.setting.update({
        where: { key: s.key },
        data:  { treeId: tree.id },
      });
    }
  }
  console.log(`  Updated ${existingSettings.length} settings.`);

  // ── Step 11: Update AuditLog with treeId ──────────────────────────────────
  console.log('\nUpdating audit logs with treeId...');
  const auditResult = await prisma.auditLog.updateMany({
    where: { treeId: null },
    data:  { treeId: tree.id },
  });
  console.log(`  Updated ${auditResult.count} audit log entries.`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=== Migration Complete ===');
  console.log(`Tree: ${tree.name} (slug: ${tree.slug}, id: ${tree.id})`);
  console.log(`Owner: ${admin.email}`);
  console.log('\nNEXT STEPS:');
  console.log('  1. Copy prisma/schema.final.prisma → prisma/schema.prisma');
  console.log('  2. npm run db:migrate   (Migration 2 — adds NOT NULL constraints)');
  console.log('  3. npm run db:generate');
  console.log('  4. Restart dev server');
}

main()
  .catch(err => {
    console.error('\nMigration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
