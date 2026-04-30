import assert from "node:assert/strict";
import {
  checkResolvedHistoryThumbnail,
  rememberResolvedHistoryThumbnail,
  subscribeResolvedHistoryThumbnail,
} from "../historyThumbnailCache.js";

const item = {
  id: "tripo_doc_1",
  taskId: "task_1",
  model_url: "https://example.com/model.glb",
};

assert.equal(checkResolvedHistoryThumbnail(item), null);

let observed = null;
const unsubscribe = subscribeResolvedHistoryThumbnail(item, (thumbnail) => {
  observed = thumbnail;
});

rememberResolvedHistoryThumbnail(item, "data:image/webp;base64,thumb");

assert.equal(checkResolvedHistoryThumbnail({ id: "tripo_doc_1" }), "data:image/webp;base64,thumb");
assert.equal(checkResolvedHistoryThumbnail({ taskId: "task_1" }), "data:image/webp;base64,thumb");
assert.equal(checkResolvedHistoryThumbnail({ model_url: "https://example.com/model.glb" }), "data:image/webp;base64,thumb");
assert.equal(observed, "data:image/webp;base64,thumb");

unsubscribe();
rememberResolvedHistoryThumbnail(item, "data:image/webp;base64,next");
assert.equal(observed, "data:image/webp;base64,thumb");

console.log("historyThumbnailCache assertions passed");
