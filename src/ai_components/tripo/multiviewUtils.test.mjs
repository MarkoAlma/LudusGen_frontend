import assert from "node:assert/strict";

import {
  MULTIVIEW_UPLOAD_ORDER,
  buildMultiviewPreviewItems,
  hasTaskImagePreview,
  isMultiviewUploadReady,
  getReadyMultiviewRefs,
  getMultiviewFilesPayload,
} from "./multiviewUtils.js";

const ready = (label) => ({ label, token: `${label}-token` });

{
  assert.deepEqual(MULTIVIEW_UPLOAD_ORDER.map((slot) => slot.id), [
    "front",
    "left",
    "back",
    "right",
  ]);
}

{
  assert.equal(isMultiviewUploadReady([ready("front")]), false);
  assert.equal(isMultiviewUploadReady([ready("front"), ready("left")]), true);
  assert.equal(isMultiviewUploadReady([null, ready("left"), ready("back")]), false);
}

{
  const refs = getReadyMultiviewRefs([
    ready("front"),
    undefined,
    ready("back"),
    ready("right"),
  ]);

  assert.deepEqual(refs.map((item) => item.label), ["front", "back", "right"]);
}

{
  const previewItems = buildMultiviewPreviewItems([
    "https://example.com/front.png",
    "https://example.com/left.png",
    "https://example.com/back.png",
  ]);

  assert.equal(previewItems.length, 4);
  assert.equal(previewItems[0]?.slotId, "front");
  assert.equal(previewItems[1]?.slotId, "left");
  assert.equal(previewItems[2]?.slotId, "back");
  assert.equal(previewItems[3], null);
  assert.equal(previewItems[0]?.preview, "https://example.com/front.png");
}

{
  const files = getMultiviewFilesPayload([
    ready("front"),
    undefined,
    ready("back"),
    ready("right"),
  ]);

  assert.equal(files.length, 4);
  assert.deepEqual(files.map((item) => item?.label ?? null), ["front", null, "back", "right"]);
  assert.deepEqual(files[1], {});
}

{
  assert.equal(hasTaskImagePreview({ previewImageUrl: "https://example.com/front.png" }), true);
  assert.equal(hasTaskImagePreview({ previewImageUrls: ["https://example.com/front.png"] }), true);
  assert.equal(hasTaskImagePreview({ previewImageUrls: [] }), false);
}

console.log("multiviewUtils assertions passed");
