import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");

const start = source.indexOf("const applyHistorySelection = useCallback");
const end = source.indexOf("const handleUseOriginalModel", start);

assert.notEqual(start, -1, "applyHistorySelection should exist");
assert.notEqual(end, -1, "handleUseOriginalModel should follow applyHistorySelection");

const block = source.slice(start, end);
const clearIndex = block.indexOf("pendingUrlTaskId.current = null");
const urlWriteIndex = block.indexOf("setSearchParams");

assert.notEqual(clearIndex, -1, "explicit history selection should clear stale pending URL task id");
assert(
  clearIndex < urlWriteIndex,
  "stale pending URL task id should be cleared before writing the selected task into the URL",
);

const autoSyncStart = source.indexOf("const syncAutoLoadedHistoryItem = useCallback");
const autoSyncEnd = source.indexOf("const handleGen", autoSyncStart);

assert.notEqual(autoSyncStart, -1, "syncAutoLoadedHistoryItem should exist");
assert.notEqual(autoSyncEnd, -1, "handleGen should follow syncAutoLoadedHistoryItem");

const autoSyncBlock = source.slice(autoSyncStart, autoSyncEnd);

assert(
  autoSyncBlock.includes("shouldAutoSelectGeneratedHistoryItem"),
  "automatic history sync should route through the generated-item selection policy",
);
assert.equal(
  autoSyncBlock.includes("setSelHistId("),
  false,
  "automatic viewer refresh should not overwrite the manual history selection",
);

console.log("tripoHistorySelectionSync assertions passed");
