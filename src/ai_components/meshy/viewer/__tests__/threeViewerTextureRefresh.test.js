import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { watchMaterialTexturesForReadiness } from "../threeHelpers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const helperSource = readFileSync(resolve(__dirname, "../threeHelpers.js"), "utf8");

function createFakeImage() {
  const listeners = new Map();

  return {
    width: 0,
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || new Set();
      handlers.add(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) listeners.delete(type);
    },
    dispatch(type) {
      const handlers = listeners.get(type);
      if (!handlers) return;
      [...handlers].forEach((handler) => handler());
    },
  };
}

{
  const image = createFakeImage();
  const texture = { isTexture: true, uuid: "pending-map", image, needsUpdate: false };
  const material = { map: texture };
  let readyCalls = 0;

  const cleanup = watchMaterialTexturesForReadiness(material, (readyTexture) => {
    readyCalls += 1;
    assert.equal(readyTexture, texture, "The pending map should be reported back to the viewer");
  });

  assert.equal(readyCalls, 0, "Pending textures should not trigger until the image finishes loading");

  image.width = 256;
  image.dispatch("load");

  assert.equal(texture.needsUpdate, true, "When the texture image arrives it should request a GPU upload");
  assert.equal(readyCalls, 1, "The viewer should be notified to render again as soon as the texture becomes ready");

  cleanup();
}

{
  const lateImage = createFakeImage();
  const texture = {
    isTexture: true,
    uuid: "late-source-map",
    image: null,
    source: { data: null },
    needsUpdate: false,
  };
  const material = { map: texture };
  let readyCalls = 0;

  const cleanup = watchMaterialTexturesForReadiness(material, (readyTexture) => {
    readyCalls += 1;
    assert.equal(readyTexture, texture, "Late-bound texture sources should still be reported back to the viewer");
  });

  texture.source.data = lateImage;
  lateImage.width = 512;
  lateImage.dispatch("load");

  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.equal(texture.needsUpdate, true, "Late-bound texture sources should request a GPU upload once image data becomes available");
  assert.equal(readyCalls, 1, "The viewer should repaint when a texture source is attached after the first frame");

  cleanup();
}

assert(
  helperSource.includes("watchMaterialTexturesForReadiness"),
  "loadGLB should use the texture readiness watcher so switched models repaint without extra user input",
);
assert(
  helperSource.includes("cleanupTextureReadyListeners(s);"),
  "Texture readiness listeners should be cleaned up before switching models again",
);
assert(
  helperSource.includes("registerPendingTextureRefreshes(s, n.material, token);"),
  "Each loaded mesh should register a redraw hook for textures that finish after the first frame",
);

console.log("threeViewer texture refresh assertions passed");
