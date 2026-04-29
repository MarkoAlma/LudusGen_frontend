export const MAX_IMAGE_TO_MODEL_BATCH = 10;

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
