import assert from "node:assert/strict";
import {
  buildGenerateImageSubmission,
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

{
  const imageRef = { type: "png", object: { bucket: "tripo-data", key: "ref.png" } };
  const result = buildGenerateImageSubmission({
    prompt: "hero warrior",
    negativePrompt: "blurry",
    modelVersion: "seedream_v4",
    template: "character_completion",
    referenceImages: [imageRef],
  });

  assert.equal(result.requestPath, "/api/tripo/task");
  assert.equal(result.body.type, "generate_image");
  assert.equal(result.body.prompt, "hero warrior");
  assert.equal(result.body.negative_prompt, undefined);
  assert.equal(result.body.model_version, "seedream_v4");
  assert.equal(result.body.template, undefined);
  assert.deepEqual(result.body.file, imageRef);
  assert.equal(result.body.model, undefined);
  assert.equal(result.body.template_id, undefined);
  assert.equal(result.body.reference_image, undefined);
}

{
  const imageRef = { type: "png", file_token: "ignored-for-prompt-only" };
  const result = buildGenerateImageSubmission({
    prompt: "hero warrior",
    modelVersion: "flux.1_dev",
    referenceImages: [imageRef],
  });

  assert.equal(result.body.model_version, "flux.1_dev");
  assert.equal(result.body.prompt, "hero warrior");
  assert.equal(result.body.file, undefined);
  assert.equal(result.body.files, undefined);
}

{
  const imageRef = { type: "png", file_token: "kept-for-multimodal" };
  const result = buildGenerateImageSubmission({
    prompt: "hero warrior",
    modelVersion: "gpt_image_1.5",
    referenceImages: [imageRef],
  });

  assert.equal(result.body.model_version, "gpt_image_1.5");
  assert.deepEqual(result.body.file, imageRef);
}

{
  const imageRefs = Array.from({ length: 6 }, (_, index) => ({
    type: "png",
    file_token: `flux-ref-${index}`,
  }));
  const result = buildGenerateImageSubmission({
    prompt: "hero warrior",
    modelVersion: "flux.1_kontext_pro",
    referenceImages: imageRefs,
  });

  assert.equal(result.body.file, undefined);
  assert.deepEqual(result.body.files, imageRefs.slice(0, 4));
}

{
  const imageRefs = Array.from({ length: 10 }, (_, index) => ({
    type: "png",
    file_token: `gpt-ref-${index}`,
  }));
  const result = buildGenerateImageSubmission({
    prompt: "hero warrior",
    modelVersion: "gpt_4o",
    referenceImages: imageRefs,
  });

  assert.equal(result.body.file, undefined);
  assert.deepEqual(result.body.files, imageRefs);
}

{
  const imageRefs = [
    { type: "webp", file_token: "held-webp" },
    { type: "png", file_token: "sent-png" },
  ];
  const result = buildGenerateImageSubmission({
    prompt: "hero warrior",
    modelVersion: "flux.1_kontext_pro",
    referenceImages: imageRefs,
  });

  assert.deepEqual(result.body.file, { type: "png", file_token: "sent-png" });
  assert.equal(result.body.files, undefined);
}

console.log("tripoGenerationRequest assertions passed");
