import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");

const start = source.indexOf("function SelectedHistoryPreview");
const end = source.indexOf("function SelectedHistoryImagePopup", start);

assert.notEqual(start, -1, "SelectedHistoryPreview should exist");
assert.notEqual(end, -1, "SelectedHistoryImagePopup should follow SelectedHistoryPreview");

const block = source.slice(start, end);
const viewerFallbackIndex = block.indexOf("viewerItemMatchesSelectedItem && viewerModelUrl");
const taskPreviewIndex = block.indexOf("fetchSelectedHistoryTaskPreviewImageUrl");
const selectedItemStart = source.indexOf("const selectedPreviewItem = useMemo");
const selectedItemEnd = source.indexOf("const selectedPreviewColor", selectedItemStart);

assert.notEqual(viewerFallbackIndex, -1, "selected preview should consider the loaded viewer model");
assert.notEqual(taskPreviewIndex, -1, "selected preview should keep the task preview fallback");
assert.notEqual(selectedItemStart, -1, "selected preview item memo should exist");
assert.notEqual(selectedItemEnd, -1, "selected preview color memo should follow selected preview item memo");
assert(
  taskPreviewIndex < viewerFallbackIndex,
  "selected preview should use the same task-preview-first order as the right history card",
);

const selectedItemBlock = source.slice(selectedItemStart, selectedItemEnd);
assert(
  block.includes("checkResolvedHistoryThumbnail(item)"),
  "selected preview should first reuse the resolved thumbnail produced by the right history card",
);
assert(
  block.includes("subscribeResolvedHistoryThumbnail(item"),
  "selected preview should update when the right history card resolves its thumbnail later",
);
assert(
  selectedItemBlock.includes("historyItemsReferToSameTask(baseItem, selectedBaseItem)"),
  "selected preview should only reuse the selected thumbnail when it belongs to the displayed item",
);
assert(
  source.includes("if (!left || !right) return false"),
  "selected preview thumbnail ownership should not match two missing items",
);
assert(
  block.includes("viewerItemMatchesSelectedItem"),
  "selected preview should match loaded viewer items by taskId as well as id",
);
assert(
  selectedItemBlock.includes("historyItemsReferToSameTask"),
  "selected preview item memo should reuse thumbnails when ids differ but taskIds match",
);

console.log("tripoSelectedPreviewLoadOrder assertions passed");
