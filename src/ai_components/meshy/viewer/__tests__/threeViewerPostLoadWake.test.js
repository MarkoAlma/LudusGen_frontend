import assert from "node:assert/strict";
import { armPostLoadWakeWindow } from "../threeHelpers.js";

{
  const rafQueue = [];
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;

  globalThis.requestAnimationFrame = (cb) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const marks = [];
  const state = {
    markDirty() {
      marks.push("dirty");
    },
  };
  const token = { cancelled: false };

  armPostLoadWakeWindow(state, token, { frames: 3 });

  assert.equal(marks.length, 1, "The wake window should dirty the viewer immediately after a model switch");
  while (rafQueue.length) {
    const cb = rafQueue.shift();
    cb();
  }

  assert.equal(marks.length, 4, "The wake window should keep the viewer repainting for a few follow-up frames");

  token.cancelled = true;
  assert.equal(rafQueue.length, 0, "The wake window should stop scheduling frames after completion");

  globalThis.requestAnimationFrame = originalRaf;
  globalThis.cancelAnimationFrame = originalCancel;
}

console.log("threeViewer post-load wake assertions passed");
