import assert from "node:assert/strict";
import {
  filterTripoReferenceImagesForPolicy,
  getTripoGenerateImageInputPolicy,
  isTripoReferenceImageReady,
  isTripoReferenceImageWebp,
  limitTripoReferenceImages,
  normalizeTripoReferenceImages,
} from "../tripoImageGenerationConfig.js";

const readyA = { token: "a", preview: "a.png" };
const readyB = { tripoFile: { type: "png", file_token: "b" }, preview: "b.png" };
const uploading = { file: { name: "pending.png" }, preview: "pending.png" };
const webp = { type: "webp", file_token: "webp-ref" };

assert.deepEqual(normalizeTripoReferenceImages(null), []);
assert.deepEqual(normalizeTripoReferenceImages(readyA), [readyA]);
assert.deepEqual(normalizeTripoReferenceImages([readyA, null, readyB]), [readyA, readyB]);

assert.equal(isTripoReferenceImageReady(readyA), true);
assert.equal(isTripoReferenceImageReady(readyB), true);
assert.equal(isTripoReferenceImageReady(uploading), false);
assert.equal(isTripoReferenceImageWebp(webp), true);

assert.deepEqual(
  limitTripoReferenceImages([readyA, readyB, uploading], 2),
  [readyA, readyB],
);

assert.deepEqual(
  limitTripoReferenceImages([readyA, readyB], 0),
  [],
);

assert.equal(getTripoGenerateImageInputPolicy("").maxFiles, 4);
assert.equal(getTripoGenerateImageInputPolicy("gpt_4o").maxFiles, 10);
assert.equal(getTripoGenerateImageInputPolicy("flux.1_dev").maxFiles, 0);

assert.deepEqual(
  filterTripoReferenceImagesForPolicy(
    [webp, readyA, readyB, uploading, { token: "c" }, { token: "d" }, { token: "e" }],
    getTripoGenerateImageInputPolicy("flux.1_kontext_pro"),
  ),
  [readyA, readyB, uploading, { token: "c" }],
);

assert.deepEqual(
  filterTripoReferenceImagesForPolicy([readyA, readyB], getTripoGenerateImageInputPolicy("flux.1_dev")),
  [],
);

console.log("tripoImageGenerationConfig assertions passed");
