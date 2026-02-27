/*
  Warnings:

  - The primary key for the `settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `tree_id` on table `families` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tree_id` on table `people` required. This step will fail if there are existing NULL values in that column.
  - The required column `id` was added to the `settings` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Made the column `tree_id` on table `settings` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_families" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "gedcom_id" TEXT,
    "husb_id" TEXT,
    "wife_id" TEXT,
    "marr_date" TEXT,
    "marr_place" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "families_husb_id_fkey" FOREIGN KEY ("husb_id") REFERENCES "people" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "families_wife_id_fkey" FOREIGN KEY ("wife_id") REFERENCES "people" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "families_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_families" ("created_at", "gedcom_id", "husb_id", "id", "marr_date", "marr_place", "tree_id", "updated_at", "wife_id") SELECT "created_at", "gedcom_id", "husb_id", "id", "marr_date", "marr_place", "tree_id", "updated_at", "wife_id" FROM "families";
DROP TABLE "families";
ALTER TABLE "new_families" RENAME TO "families";
CREATE UNIQUE INDEX "families_tree_id_gedcom_id_key" ON "families"("tree_id", "gedcom_id");
CREATE TABLE "new_people" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "gedcom_id" TEXT,
    "name" TEXT NOT NULL,
    "sex" TEXT,
    "birth_date" TEXT,
    "birth_place" TEXT,
    "death_date" TEXT,
    "death_place" TEXT,
    "burial_place" TEXT,
    "burial_date" TEXT,
    "occupation" TEXT,
    "notes" TEXT,
    "narrative" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "people_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_people" ("birth_date", "birth_place", "burial_date", "burial_place", "created_at", "death_date", "death_place", "gedcom_id", "id", "name", "narrative", "notes", "occupation", "sex", "tree_id", "updated_at") SELECT "birth_date", "birth_place", "burial_date", "burial_place", "created_at", "death_date", "death_place", "gedcom_id", "id", "name", "narrative", "notes", "occupation", "sex", "tree_id", "updated_at" FROM "people";
DROP TABLE "people";
ALTER TABLE "new_people" RENAME TO "people";
CREATE UNIQUE INDEX "people_tree_id_gedcom_id_key" ON "people"("tree_id", "gedcom_id");
CREATE TABLE "new_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "settings_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("id", "key", "tree_id", "updated_at", "value") SELECT lower(hex(randomblob(16))), "key", "tree_id", "updated_at", "value" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE UNIQUE INDEX "settings_tree_id_key_key" ON "settings"("tree_id", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
