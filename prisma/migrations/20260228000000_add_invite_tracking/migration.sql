-- AlterTable: add auto-resend tracking to tree_invites
ALTER TABLE "tree_invites" ADD COLUMN "last_sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tree_invites" ADD COLUMN "sent_count" INTEGER NOT NULL DEFAULT 1;
