import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatePanel = readFileSync(resolve(__dirname, "../GeneratePanel.jsx"), "utf8");
const multiviewPanel = readFileSync(resolve(__dirname, "../MultiviewImagesPanel.jsx"), "utf8");
const tripoPanel = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");
const aiRoutes = readFileSync(resolve(__dirname, "../../../../../LudusGen_backend/ai-routes.js"), "utf8");

assert(
  generatePanel.includes("GalleryPickerModal"),
  "GeneratePanel should load upload images from the shared image-studio gallery picker",
);

assert(
  multiviewPanel.includes("GalleryPickerModal"),
  "MultiviewImagesPanel should load upload images from the shared image-studio gallery picker",
);

assert(
  generatePanel.includes("TripoImageSourceChoiceModal") || generatePanel.includes("ImageSourceChoiceModal"),
  "GeneratePanel should ask whether the upload source is device or gallery",
);

assert(
  multiviewPanel.includes("TripoImageSourceChoiceModal") || multiviewPanel.includes("ImageSourceChoiceModal"),
  "MultiviewImagesPanel should ask whether the upload source is device or gallery",
);

assert(
  tripoPanel.includes("persistTripoImagesToGallery"),
  "TripoPanel should persist generated Tripo images/views to the shared gallery",
);

assert(
  tripoPanel.includes("operation: 'tripo_3d_image'") || tripoPanel.includes('operation: "tripo_3d_image"'),
  "Tripo gallery imports should be tagged as tripo_3d_image",
);

assert(
  aiRoutes.includes("router.post('/image-gallery/import'"),
  "backend should expose the authenticated shared gallery import endpoint",
);

console.log("tripoSharedGalleryRoundTrip assertions passed");
