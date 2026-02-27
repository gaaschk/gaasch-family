-- Add fsPid to people
ALTER TABLE "people" ADD COLUMN "fs_pid" TEXT;

-- CreateTable: familysearch_matches
CREATE TABLE "familysearch_matches" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "person_id"  TEXT NOT NULL,
    "tree_id"    TEXT NOT NULL,
    "fs_pid"     TEXT NOT NULL,
    "score"      REAL NOT NULL,
    "fs_data"    TEXT NOT NULL,
    "status"     TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "familysearch_matches_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "familysearch_matches_tree_id_fkey"   FOREIGN KEY ("tree_id")   REFERENCES "trees"  ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "familysearch_matches_person_id_fs_pid_key"
    ON "familysearch_matches"("person_id", "fs_pid");
