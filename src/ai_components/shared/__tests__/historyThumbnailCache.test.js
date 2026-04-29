import assert from "node:assert/strict";

import {
  HISTORY_THUMBNAIL_CACHE_VERSION,
  getHistoryThumbnailCacheKey,
} from "../historyThumbnailCache.js";

assert.equal(HISTORY_THUMBNAIL_CACHE_VERSION, "history-thumb-v3");
assert.equal(
  getHistoryThumbnailCacheKey({ model_url: "https://example.test/model.glb" }),
  "https://example.test/model.glb#history-thumb-v3"
);
assert.equal(getHistoryThumbnailCacheKey(null), null);
assert.equal(getHistoryThumbnailCacheKey({}), null);

console.log("historyThumbnailCache tests passed");
