import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tripoPanel = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");
const aiRoutes = readFileSync(resolve(__dirname, "../../../../../LudusGen_backend/ai-routes.js"), "utf8");

assert(
  aiRoutes.includes("router.post('/image-gallery/import'"),
  "backend should expose an authenticated gallery import endpoint for Tripo-generated images",
);

assert(
  tripoPanel.includes("persistTripoImagesToGallery"),
  "TripoPanel should persist generated Tripo image/view results into the shared image gallery",
);

assert(
  tripoPanel.includes("operation: 'tripo_3d_image'"),
  "Tripo gallery imports should be tagged so image gallery items remain traceable",
);

console.log("tripoGeneratedImagesGalleryPersistence assertions passed");
