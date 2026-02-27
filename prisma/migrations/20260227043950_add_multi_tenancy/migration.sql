-- CreateTable
CREATE TABLE "trees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "trees_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tree_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tree_members_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tree_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tree_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "accepted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tree_invites_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_data" TEXT,
    "new_data" TEXT,
    "tree_id" TEXT,
    "user_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_log_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_log" ("action", "created_at", "id", "new_data", "old_data", "record_id", "table_name", "user_id") SELECT "action", "created_at", "id", "new_data", "old_data", "record_id", "table_name", "user_id" FROM "audit_log";
DROP TABLE "audit_log";
ALTER TABLE "new_audit_log" RENAME TO "audit_log";
CREATE TABLE "new_families" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT,
    "gedcom_id" TEXT,
    "husb_id" TEXT,
    "wife_id" TEXT,
    "marr_date" TEXT,
    "marr_place" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "families_husb_id_fkey" FOREIGN KEY ("husb_id") REFERENCES "people" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "families_wife_id_fkey" FOREIGN KEY ("wife_id") REFERENCES "people" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "families_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_families" ("created_at", "husb_id", "id", "marr_date", "marr_place", "updated_at", "wife_id") SELECT "created_at", "husb_id", "id", "marr_date", "marr_place", "updated_at", "wife_id" FROM "families";
DROP TABLE "families";
ALTER TABLE "new_families" RENAME TO "families";
CREATE TABLE "new_people" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT,
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
    CONSTRAINT "people_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_people" ("birth_date", "birth_place", "burial_date", "burial_place", "created_at", "death_date", "death_place", "id", "name", "narrative", "notes", "occupation", "sex", "updated_at") SELECT "birth_date", "birth_place", "burial_date", "burial_place", "created_at", "death_date", "death_place", "id", "name", "narrative", "notes", "occupation", "sex", "updated_at" FROM "people";
DROP TABLE "people";
ALTER TABLE "new_people" RENAME TO "people";
CREATE TABLE "new_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "settings_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("key", "updated_at", "value") SELECT "key", "updated_at", "value" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "trees_slug_key" ON "trees"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tree_members_tree_id_user_id_key" ON "tree_members"("tree_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tree_invites_token_key" ON "tree_invites"("token");
