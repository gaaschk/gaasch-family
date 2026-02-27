CREATE TABLE "familysearch_tokens" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "user_id"      TEXT NOT NULL UNIQUE,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at"   DATETIME NOT NULL,
    "display_name" TEXT,
    "fs_cis_id"    TEXT,
    "created_at"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   DATETIME NOT NULL,
    CONSTRAINT "familysearch_tokens_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
