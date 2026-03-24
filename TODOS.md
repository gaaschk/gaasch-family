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

**Depends on:** EU eligibility engine.

**Status:** Pulled into active scope — build alongside the EU citizenship feature (accepted in /plan-ceo-review 2026-03-24).

**Effort:** M (human: ~1 week / CC: ~1 hour for code; dataset curation ~3 hours)
**Priority:** P1 (active)

---

## TODO-4: Batch ancestor/descendant queries for chart views

**What:** Rewrite `fetchAncestors()` and `fetchDescendants()` in the chart API routes to use bulk/batch DB queries instead of one query per person. Fetch all people in a generation with a single `prisma.person.findMany` + a single `prisma.familyChild.findMany`, then stitch the tree in memory.

**Why:** Currently, loading a 6-generation pedigree makes up to 124 sequential DB queries (2 per person × 62 ancestors). At ~10ms per query on the managed PostgreSQL instance, that's ~1-2 seconds of DB time at higher generation counts. Not noticeable at the default 4 generations, but perceptible at 6, and could become a bottleneck as trees grow larger.

**Pros:** 10-50x reduction in DB round-trips; faster perceived load for large trees; scales better under multi-user load.

**Cons:** More complex stitching logic — collecting all person IDs per generation, batching lookups, building the tree in post-processing.

**Context:** Added from /plan-eng-review on branch gaaschk/design-fixes. EU eligibility feature (plan-eng-review 2026-03-24) will traverse full ancestor trees to collect birthPlaces — at 6 generations that's 60+ sequential queries before eligibility logic runs. Pulled into active scope alongside EU citizenship feature. Implement batch queries for both the chart routes AND the eligibility ancestor fetch.

**Depends on:** Existing ancestors/descendants routes (`app/api/trees/[treeId]/ancestors/route.ts`, `descendants/route.ts`).

**Status:** Pulled into active scope — implement alongside EU citizenship feature (accepted in /plan-eng-review 2026-03-24).

**Effort:** S (human: ~4h / CC: ~15 min)
**Priority:** P1 (active)

---

## TODO-5: Export chart to PNG/PDF

**What:** "Export chart" button that downloads the current pedigree or fan chart as a PNG image or PDF. Browser-native approach: SVG → OffscreenCanvas → `canvas.toBlob()` for PNG; `window.print()` with `@media print` CSS hiding everything except the chart SVG for PDF.

**Why:** Genealogy researchers want to print charts for family reunions and share images with relatives who don't have logins. Currently users must take screenshots, which clips the chart and looks poor.

**Pros:** High-value for family history users; no server-side cost; ~50 lines of client code.

**Cons:** SVG text rendering in canvas can be imprecise (fonts may not embed correctly); complex fan chart arcs may need special handling. PDF via print is lower-quality than a proper PDF library.

**Context:** Deferred from /plan-ceo-review on branch gaaschk/design-fixes (2026-03-22). The charts ship without export first; add this as a follow-up enhancement. If print quality is insufficient, consider `html2canvas` or a server-side Puppeteer renderer in a future iteration.

**Depends on:** PedigreeView and FanChartView shipping (this PR).

**Effort:** S (human: ~1 day / CC: ~15 min)
**Priority:** P2

---

## TODO-7: FamilySearch multi-generation import

**What:** Complete the FamilySearch OAuth integration to allow importing a person + multiple generations of ancestors directly into a tree. User connects their FamilySearch account, searches for themselves, clicks "Import 4 generations" — done.

**Why:** GEDCOM export requires knowing what GEDCOM is and finding the export button. FamilySearch import removes 5+ steps from onboarding for users whose data is already in FamilySearch (the largest free genealogy data source).

**Pros:** Dramatically lowers activation barrier; FamilySearch has the broadest data; zero re-entry for existing FamilySearch users.

**Cons:** Blocked by FamilySearch production app approval requirement. FamilySearch will not grant multi-gen import API access until Heirloom demonstrates production usage with real users.

**Context:** FamilySearch OAuth is partially built per CLAUDE.md. Cannot complete until FamilySearch approves the app. This becomes high-priority once the product has external users and can apply for production API access.

**Depends on:** FamilySearch production app approval (external dependency).

**Effort:** M (human: ~3 days / CC: ~45 min)
**Priority:** P2 (after external validation)

---

## TODO-8: Public AI genealogy assistant

**What:** A public-facing (unauthenticated) AI chat that answers genealogy questions: "How do I trace Luxembourg ancestry?", "What documents do I need for Italian citizenship by descent?" Serves as an SEO content surface and conversion funnel.

**Why:** People who get value from the free assistant are primed to sign up for the full tree tool. Every answered question is potentially indexed content.

**Pros:** Organic acquisition channel; demonstrates AI capability before signup; content indexes on Google.

**Cons:** LLM API costs from unauthenticated users require rate limiting; common answers should be cached; competes with ChatGPT which anyone can use for free.

**Context:** The existing tree-scoped AI chat (`/api/trees/[treeId]/chat/route.ts`) can be adapted. Rate limiting and caching are required before enabling unauthenticated access. Deferred until credits model is validated and there are paying users.

**Depends on:** Credits model shipped and validated with external users.

**Effort:** M (human: ~2 days / CC: ~30 min)
**Priority:** P3

---

## TODO-6: Lifespan timeline view

**What:** A fourth view tab (alongside Directory, Pedigree, Fan Chart) showing ancestors as horizontal bars spanning birth-to-death year range, arranged vertically by generation. Click a bar to open the person slide-over panel. Year axis auto-ranges based on tree data.

**Why:** Helps researchers see historical context: which ancestors lived through WWI, who lived longest, where generational overlaps occur. Distinct value from pedigree/fan chart — answers "when" instead of "who."

**Pros:** Reuses existing ancestor API and person slide-over panel (if built); powerful for research use cases; visually distinctive from the other chart views.

**Cons:** Requires birth/death years to be present — many genealogy records have incomplete dates. Needs graceful handling of unknowns (open-ended bars with dashed right edge for still-living or unknown death; left-dashed for unknown birth).

**Context:** Accepted as Phase 2 in /plan-ceo-review on branch gaaschk/design-fixes (2026-03-22). Design: horizontal axis = year range (auto-scaled), vertical axis = generation rows, bars colored by gender or generation. Missing dates shown as open-ended dashed bars. Click bar → person slide-over panel.

**Depends on:** PedigreeView and FanChartView shipping (this PR); person slide-over panel (CEO review expansion #3, also in this PR).

**Effort:** M (human: ~3 days / CC: ~25 min)
**Priority:** P2
