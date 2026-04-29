import assert from "node:assert/strict";
import {
  buildImageToModelSubmission,
  MAX_IMAGE_TO_MODEL_BATCH,
} from "../tripoGenerationRequest.js";

const baseBody = {
  type: "image_to_model",
  model_version: "v3.1-20260211",
  negative_prompt: "low quality",
  texture: true,
  pbr: true,
  texture_quality: "detailed",
  geometry_quality: "detailed",
  enable_image_autofix: true,
};

{
  const imageRef = { type: "png", file_token: "single-token" };
  const result = buildImageToModelSubmission(baseBody, [imageRef]);
  assert.equal(result.requestPath, "/api/tripo/task");
  assert.equal(result.taskCount, 1);
  assert.deepEqual(result.body.file, imageRef);
  assert.equal(result.body.batch_images, undefined);
  assert.equal(result.body.negative_prompt, "low quality");
  assert.equal(result.body.enable_image_autofix, true);
}

{
  const imageRefs = [
    { type: "png", file_token: "first-token" },
    { type: "png", file_token: "second-token" },
  ];
  const result = buildImageToModelSubmission(baseBody, imageRefs);
  assert.equal(result.requestPath, "/api/tripo/task");
  assert.equal(result.taskCount, 2);
  assert.deepEqual(result.body.batch_images, imageRefs);
  assert.equal(result.body.file, undefined);
  assert.equal(result.body.texture_quality, "detailed");
  assert.equal(result.body.geometry_quality, "detailed");
}

assert.throws(
  () => buildImageToModelSubmission(
    baseBody,
    Array.from({ length: MAX_IMAGE_TO_MODEL_BATCH + 1 }, (_, index) => ({
      type: "png",
      file_token: `token-${index}`,
    })),
  ),
  /Maximum 10 images/
);

console.log("tripoGenerationRequest assertions passed");
