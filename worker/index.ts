/**
 * Worker entry point.
 * Run via: npm run worker
 *   which expands to: dotenv -e .env.local -- tsx worker/index.ts
 */

import { startWorker } from "../src/workers/agent";

const worker = startWorker();

async function shutdown() {
  console.log("[worker] Shutting down gracefully…");
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
