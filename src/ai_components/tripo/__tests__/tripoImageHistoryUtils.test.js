import assert from "node:assert/strict";
import {
  extractTripoPreviewImageUrls,
  getModelPreviewImageUrl,
  isImageHistoryItem,
} from "../tripoImageHistoryUtils.js";

{
  const item = {
    model_url: "https://cdn.example.test/model.fbx",
    previewImageUrls: ["https://cdn.example.test/render.webp"],
  };

  assert.equal(isImageHistoryItem(item), false);
  assert.equal(getModelPreviewImageUrl(item), "https://cdn.example.test/render.webp");
}

{
  const item = {
    model_url: "https://cdn.example.test/model.fbx",
    preview_image_urls: ["https://cdn.example.test/snake.webp"],
  };

  assert.equal(getModelPreviewImageUrl(item), "https://cdn.example.test/snake.webp");
}

{
  const item = {
    model_url: "https://cdn.example.test/model.fbx",
    rawOutput: {
      rendered_image: { url: "https://cdn.example.test/raw-render.png" },
    },
  };

  assert.equal(getModelPreviewImageUrl(item), "https://cdn.example.test/raw-render.png");
}

{
  const urls = extractTripoPreviewImageUrls({
    preview_image_url: "https://cdn.example.test/direct-snake.webp",
    output: {
      preview_images: [
        { image_url: "https://cdn.example.test/front.webp" },
        { image_url: "https://cdn.example.test/front.webp" },
      ],
    },
  });

  assert.deepEqual(urls, [
    "https://cdn.example.test/direct-snake.webp",
    "https://cdn.example.test/front.webp",
  ]);
}

console.log("tripoImageHistoryUtils assertions passed");
