-- AlterTable: add auto-resend tracking to tree_invites
-- NOTE: SQLite forbids CURRENT_TIMESTAMP as a DEFAULT in ALTER TABLE ADD COLUMN
-- (only constant literals are allowed).  Existing rows receive the epoch sentinel
-- '2000-01-01 00:00:00' so the cron job treats them as immediately eligible for
-- resend.  New rows always have lastSentAt set explicitly by the application.
ALTER TABLE "tree_invites" ADD COLUMN "last_sent_at" DATETIME NOT NULL DEFAULT '2000-01-01 00:00:00';
ALTER TABLE "tree_invites" ADD COLUMN "sent_count" INTEGER NOT NULL DEFAULT 1;
