import {
  filterTripoReferenceImagesForPolicy,
  getTripoGenerateImageInputPolicy,
} from "./tripoImageGenerationConfig.js";

export const MAX_IMAGE_TO_MODEL_BATCH = 10;

export function buildGenerateImageSubmission({
  prompt,
  modelVersion = "",
  referenceImages = [],
} = {}) {
  const cleanPrompt = String(prompt ?? "").trim();
  const inputPolicy = getTripoGenerateImageInputPolicy(modelVersion);
  if (inputPolicy.requiresPrompt && !cleanPrompt) {
    throw new Error("Describe the image before generating it.");
  }

  const effectiveImageRefs = filterTripoReferenceImagesForPolicy(referenceImages, inputPolicy);

  if (inputPolicy.requiresImage && effectiveImageRefs.length === 0) {
    throw new Error("Upload a reference image before generating it.");
  }

  const body = {
    type: "generate_image",
  };

  const cleanModelVersion = String(modelVersion ?? "").trim();

  if (inputPolicy.prompt && cleanPrompt) body.prompt = cleanPrompt;
  if (cleanModelVersion) body.model_version = cleanModelVersion;

  if (effectiveImageRefs.length === 1) {
    body.file = effectiveImageRefs[0];
  } else if (effectiveImageRefs.length > 1) {
    body.files = effectiveImageRefs;
  }

  return {
    requestPath: "/api/tripo/task",
    body,
    taskCount: 1,
  };
}

export function buildImageToModelSubmission(baseBody, inputImages, { maxBatch = MAX_IMAGE_TO_MODEL_BATCH } = {}) {
  const imageRefs = Array.isArray(inputImages) ? inputImages.filter(Boolean) : [];

  if (imageRefs.length === 0) {
    throw new Error("Upload at least one image before generating a model.");
  }

  if (imageRefs.length > maxBatch) {
    throw new Error(`Maximum ${maxBatch} images can be generated in one batch.`);
  }

  const body = { ...baseBody };
  delete body.file;
  delete body.images;
  delete body.batch_images;

  if (imageRefs.length === 1) {
    body.file = imageRefs[0];
  } else {
    body.batch_images = imageRefs;
  }

  return {
    requestPath: "/api/tripo/task",
    body,
    taskCount: imageRefs.length,
  };
}
