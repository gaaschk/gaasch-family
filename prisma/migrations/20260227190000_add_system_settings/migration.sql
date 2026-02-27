-- CreateTable
CREATE TABLE "system_settings" (
    "key"        TEXT NOT NULL PRIMARY KEY,
    "value"      TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
