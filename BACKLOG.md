
## 6) Alignment notes with latest code
- The current codebase (gaasch-family-next) has Next.js  while PR drafting, Prisma/SQLite with /prisma/schema.prisma, auth implemented in src/app/auth and src/lib/auth, and API routes under src/app/api/trees/[treeId]/eligibility and /documents paths. Ensure MVP PRs reference actual paths.
- Confirmed critical modules present:
  - Auth pages: src/app/signup, src/app/login, src/app/set-password, src/app/forgot-password
  - API: src/app/api/trees/[treeId]/eligibility, /documents, /people/*/generate-narrative
  - Prisma models: User, Tree, Person, Narrative, Document in prisma/schema.prisma
  - AI integration: lib/narrative.ts and CLAUDE references observed in CLAUDE.md and narratives.json
- Alignment plan: base PRs will touch only public/visible files in src/, prisma/, and README/docs; avoid touching secrets.

## 7) Detailed starter PR templates (ready-to-use)
