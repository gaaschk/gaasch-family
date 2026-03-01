-- CreateTable: lineage_stories
CREATE TABLE "lineage_stories" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "tree_id"        TEXT NOT NULL,
  "person_ids_key" TEXT NOT NULL,
  "html"           TEXT NOT NULL,
  "created_at"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     DATETIME NOT NULL,
  CONSTRAINT "fk_tree" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "lineage_stories_tree_id_person_ids_key_key"
  ON "lineage_stories"("tree_id", "person_ids_key");
