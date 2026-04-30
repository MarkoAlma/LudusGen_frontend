import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");

assert(
  source.includes("MODEL_PROXY_TERMINAL_STATUSES"),
  "TripoPanel should treat auth/expired proxy responses as terminal, not repeated retry candidates",
);

assert(
  !source.includes("task-scoped proxy returned 403, retrying without taskId"),
  "fetchProxy should not retry a task-scoped 403 without taskId because that loses refresh/authorization context",
);

const loadStart = source.indexOf("const loadHistoryIntoViewer = useCallback");
const loadEnd = source.indexOf("const applyHistorySelection", loadStart);
assert.notEqual(loadStart, -1, "loadHistoryIntoViewer should exist");
assert.notEqual(loadEnd, -1, "applyHistorySelection should follow loadHistoryIntoViewer");

const loadBlock = source.slice(loadStart, loadEnd);
const preFetchModelLoadBlock = loadBlock.slice(
  loadBlock.indexOf("if (item.model_url)"),
  loadBlock.indexOf("const b = await fetchProxy", loadBlock.indexOf("if (item.model_url)")),
);
assert(
  !preFetchModelLoadBlock.includes("setModelUrl(null)"),
  "history selection should keep the current viewer model visible until the replacement model blob is ready",
);
assert(
  !loadBlock.includes("revokeBlobUrl(prevUrl.current);\n        prevUrl.current = null;\n        setModelUrl(null);"),
  "non-expired history load failures should not blank the current viewer model and cause loading flicker",
);
assert(
  !loadBlock.includes("setModelUrl(item.model_url)"),
  "history loading should not fall back to the stale direct Tripo URL after proxy failure",
);
assert(
  !loadBlock.includes("await purgeExpiredHistoryItem(item);\n            revokeBlobUrl(prevUrl.current);"),
  "expiring a dead history item should not immediately tear down the currently visible viewer model",
);

assert(
  !source.includes('key={modelUrl || "tripo-empty-viewer"}'),
  "ThreeViewer should keep one WebGL context while modelUrl changes instead of remounting per selection",
);

assert(
  source.includes("const [viewerLoading, setViewerLoading]"),
  "TripoPanel should track the viewer's internal model loading state after the proxy blob is ready",
);
assert(
  source.includes("onModelLoadingChange={setViewerLoading}"),
  "TripoPanel should receive ThreeViewer model-loading events",
);
assert(
  source.includes("viewerLoading && modelUrl && !isRunning"),
  "TripoPanel should show a small non-blank loading overlay while ThreeViewer parses the selected model",
);

console.log("tripoModelProxyRetryPolicy assertions passed");
