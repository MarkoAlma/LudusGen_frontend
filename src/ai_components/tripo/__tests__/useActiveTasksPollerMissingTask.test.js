import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../useActiveTasksPoller.js"), "utf8");

assert(
  source.includes("response.status === 404 || response.status === 410"),
  "useActiveTasksPoller should retire missing/expired Tripo tasks instead of retrying forever",
);

assert(
  source.includes("response.status === 403"),
  "useActiveTasksPoller should retire forbidden restored Tripo tasks instead of retrying forever",
);

assert(
  source.includes('resolveTaskFailure(inst, "Task expired or deleted from source")'),
  "useActiveTasksPoller should surface a stable missing-task error message for expired Tripo tasks",
);

assert(
  source.includes('resolveTaskFailure(inst, "Task access expired after backend restart")'),
  "useActiveTasksPoller should surface a stable forbidden-task recovery message",
);

console.log("useActiveTasksPoller missing-task assertions passed");
