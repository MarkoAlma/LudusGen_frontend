import assert from "node:assert/strict";

import {
  MULTIVIEW_UPLOAD_ORDER,
  hasTaskImagePreview,
  isMultiviewUploadReady,
  getReadyMultiviewRefs,
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
  assert.equal(hasTaskImagePreview({ previewImageUrl: "https://example.com/front.png" }), true);
  assert.equal(hasTaskImagePreview({ previewImageUrls: ["https://example.com/front.png"] }), true);
  assert.equal(hasTaskImagePreview({ previewImageUrls: [] }), false);
}

console.log("multiviewUtils assertions passed");
