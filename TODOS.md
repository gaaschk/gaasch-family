# TODOS

Deferred items from /plan-eng-review (2026-03-18, branch gaaschk/richmond).

---

## TODO-1: Stale pending-proposal cleanup job

**What:** Daily BullMQ scheduled job deletes `ProposedPerson` rows where `status = 'pending'` and `createdAt < 90 days ago`.

**Why:** Without cleanup, the agent inbox accumulates months of unreviewed proposals. Rejected proposals intentionally stay forever as a "don't propose this again" signal (keyed on `externalId + source`). Only stale pending rows are swept.

**Pros:** Clean inbox; ~15 lines of worker code; natural fit alongside other scheduled jobs.

**Cons:** User loses a pending proposal they hadn't seen in 90 days (acceptable — 90 days is generous).

**Context:** Implement during BullMQ worker scaffolding (Phase 1-2). The worker will already have a cron slot for batch-narrative scheduling — add this alongside it. ProposedPerson rows with status=rejected must NOT be deleted; they prevent the agent from re-proposing the same external person.

**Depends on:** BullMQ worker scaffold, ProposedPerson table.

**Effort:** S (human: ~2h / CC: ~10 min)
**Priority:** P2

---

## TODO-2: Chat topic guard

**What:** Strengthen the chat assistant's family-history focus. Options: (a) system prompt hardening, (b) lightweight classifier call that rejects clearly off-topic questions, (c) a tool-routing approach where the assistant can only call tree-scoped tools.

**Why:** Currently the system prompt persona is the only guard. A user could ask the chat anything and the app would answer, consuming the tree owner's Anthropic API credits for general-purpose chat.

**Pros:** Predictable product scope; clearer value proposition.

**Cons:** Risk of false positives — questions about 19th-century historical context are on-topic even without a specific ancestor name. Any classifier needs to be permissive about historical/geographic questions.

**Context:** Noted in prior build memory as a deliberate deferral — "keep it tree-focused for now, may open it up later." The one-line change is in `/api/trees/[treeId]/chat/route.ts` system prompt. The deeper question is whether to add a classifier call or rely on prompt-only enforcement.

**Depends on:** Chat API route exists.

**Effort:** S (human: ~4h / CC: ~15 min)
**Priority:** P3

---

## TODO-3: Historical border mapping for EU eligibility

**What:** A lookup table mapping historical place names (with date ranges) to modern countries. E.g., "Lemberg, 1890" → Austria-Hungary → potentially Poland, Ukraine, Austria. Powers accurate EU citizenship eligibility results for 19th-century Central/Eastern European ancestors.

**Why:** Without this, eligibility results are wrong for the most common research cases — ancestors born in the Austro-Hungarian Empire, Russian Empire, or German Empire whose birthplace names no longer map to a single modern country.

**Pros:** Dramatically improves accuracy for Luxembourg, Germany, Austria, Poland, Czech Republic cases — the exact countries most Heirloom users will care about.

**Cons:** This is partly a research task, not just a coding task. Dataset completeness requires curation. AI research agent could help populate the mapping table.

**Context:** The previous build had a partial implementation. Implement after the basic EU eligibility engine exists (Phase 2-3). The data model: a `HistoricalPlace` table with `(name, countryCode, validFrom, validTo, modernCountry)`.

**Depends on:** EU eligibility engine (Phase 2).

**Effort:** M (human: ~1 week / CC: ~1 hour for code; dataset curation ~3 hours)
**Priority:** P2
