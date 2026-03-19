import { Queue, QueueEvents } from "bullmq";

export type AgentJobData = {
  agentTaskId: string;
  treeId: string;
  taskType: "research" | "geocode" | "narrative-batch";
  inputJson: string;
};

// BullMQ ships its own ioredis — pass connection options as a plain object
// so there's no version mismatch between bundled and standalone ioredis.
function makeConnectionOpts() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port || "6379", 10),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: u.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

// biome-ignore lint/suspicious/noExplicitAny: BullMQ result type is intentionally unknown
let _queue: Queue<AgentJobData, any, string> | null = null;
let _queueEvents: QueueEvents | null = null;

// biome-ignore lint/suspicious/noExplicitAny: BullMQ result type is intentionally unknown
export function getAgentQueue(): Queue<AgentJobData, any, string> | null {
  if (!process.env.REDIS_URL) return null;
  if (!_queue) {
    _queue = new Queue("agent-tasks", {
      connection: makeConnectionOpts(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return _queue;
}

export function getQueueEvents(): QueueEvents | null {
  if (!process.env.REDIS_URL) return null;
  if (!_queueEvents) {
    _queueEvents = new QueueEvents("agent-tasks", {
      connection: makeConnectionOpts(),
    });
  }
  return _queueEvents;
}
