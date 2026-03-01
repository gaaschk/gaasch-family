-- Recreate familysearch_matches with source column + new unique index
-- (SQLite requires table recreation to change a unique constraint)
CREATE TABLE "familysearch_matches_new" (
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
  CONSTRAINT "fk_person" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_tree"   FOREIGN KEY ("tree_id")   REFERENCES "trees"("id")  ON DELETE CASCADE
);
INSERT INTO "familysearch_matches_new"
  SELECT "id","person_id","tree_id",'familysearch',"fs_pid","score","fs_data","status","created_at","updated_at"
  FROM "familysearch_matches";
DROP TABLE "familysearch_matches";
ALTER TABLE "familysearch_matches_new" RENAME TO "familysearch_matches";
CREATE UNIQUE INDEX "familysearch_matches_person_id_source_fs_pid_key"
  ON "familysearch_matches"("person_id","source","fs_pid");

-- GeniToken table
CREATE TABLE "geni_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "expires_at" DATETIME NOT NULL,
  "display_name" TEXT,
  "geni_id" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "geni_tokens_user_id_key" ON "geni_tokens"("user_id");
