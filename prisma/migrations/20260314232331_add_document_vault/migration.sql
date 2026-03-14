-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "person_id" TEXT,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "notes" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "documents_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "families_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_families" ("created_at", "gedcom_id", "husb_id", "id", "marr_date", "marr_place", "tree_id", "updated_at", "wife_id") SELECT "created_at", "gedcom_id", "husb_id", "id", "marr_date", "marr_place", "tree_id", "updated_at", "wife_id" FROM "families";
DROP TABLE "families";
ALTER TABLE "new_families" RENAME TO "families";
CREATE UNIQUE INDEX "families_tree_id_gedcom_id_key" ON "families"("tree_id", "gedcom_id");
CREATE TABLE "new_familysearch_matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "person_id" TEXT NOT NULL,
    "tree_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'familysearch',
    "fs_pid" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "fs_data" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "familysearch_matches_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "familysearch_matches_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_familysearch_matches" ("created_at", "fs_data", "fs_pid", "id", "person_id", "score", "source", "status", "tree_id", "updated_at") SELECT "created_at", "fs_data", "fs_pid", "id", "person_id", "score", "source", "status", "tree_id", "updated_at" FROM "familysearch_matches";
DROP TABLE "familysearch_matches";
ALTER TABLE "new_familysearch_matches" RENAME TO "familysearch_matches";
CREATE UNIQUE INDEX "familysearch_matches_person_id_source_fs_pid_key" ON "familysearch_matches"("person_id", "source", "fs_pid");
CREATE TABLE "new_geni_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" DATETIME NOT NULL,
    "display_name" TEXT,
    "geni_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "geni_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_geni_tokens" ("access_token", "created_at", "display_name", "expires_at", "geni_id", "id", "refresh_token", "updated_at", "user_id") SELECT "access_token", "created_at", "display_name", "expires_at", "geni_id", "id", "refresh_token", "updated_at", "user_id" FROM "geni_tokens";
DROP TABLE "geni_tokens";
ALTER TABLE "new_geni_tokens" RENAME TO "geni_tokens";
CREATE UNIQUE INDEX "geni_tokens_user_id_key" ON "geni_tokens"("user_id");
CREATE TABLE "new_lineage_stories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "person_ids_key" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lineage_stories_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_lineage_stories" ("created_at", "html", "id", "person_ids_key", "tree_id", "updated_at") SELECT "created_at", "html", "id", "person_ids_key", "tree_id", "updated_at" FROM "lineage_stories";
DROP TABLE "lineage_stories";
ALTER TABLE "new_lineage_stories" RENAME TO "lineage_stories";
CREATE UNIQUE INDEX "lineage_stories_tree_id_person_ids_key_key" ON "lineage_stories"("tree_id", "person_ids_key");
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
    "fs_pid" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "people_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_people" ("birth_date", "birth_place", "burial_date", "burial_place", "created_at", "death_date", "death_place", "fs_pid", "gedcom_id", "id", "name", "narrative", "notes", "occupation", "sex", "tree_id", "updated_at") SELECT "birth_date", "birth_place", "burial_date", "burial_place", "created_at", "death_date", "death_place", "fs_pid", "gedcom_id", "id", "name", "narrative", "notes", "occupation", "sex", "tree_id", "updated_at" FROM "people";
DROP TABLE "people";
ALTER TABLE "new_people" RENAME TO "people";
CREATE UNIQUE INDEX "people_tree_id_gedcom_id_key" ON "people"("tree_id", "gedcom_id");
CREATE TABLE "new_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "settings_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("id", "key", "tree_id", "updated_at", "value") SELECT "id", "key", "tree_id", "updated_at", "value" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE UNIQUE INDEX "settings_tree_id_key_key" ON "settings"("tree_id", "key");
CREATE TABLE "new_system_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_system_settings" ("key", "updated_at", "value") SELECT "key", "updated_at", "value" FROM "system_settings";
DROP TABLE "system_settings";
ALTER TABLE "new_system_settings" RENAME TO "system_settings";
CREATE TABLE "new_tree_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tree_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "accepted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_count" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "tree_invites_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tree_invites" ("accepted_at", "created_at", "email", "expires_at", "id", "invited_by", "last_sent_at", "role", "sent_count", "token", "tree_id") SELECT "accepted_at", "created_at", "email", "expires_at", "id", "invited_by", "last_sent_at", "role", "sent_count", "token", "tree_id" FROM "tree_invites";
DROP TABLE "tree_invites";
ALTER TABLE "new_tree_invites" RENAME TO "tree_invites";
CREATE UNIQUE INDEX "tree_invites_token_key" ON "tree_invites"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "sqlite_autoindex_familysearch_tokens_2";
CREATE UNIQUE INDEX "familysearch_tokens_user_id_key" ON "familysearch_tokens"("user_id");
