import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatePanelSource = readFileSync(resolve(__dirname, "../GeneratePanel.jsx"), "utf8");
const textureSource = readFileSync(resolve(__dirname, "../Texture.jsx"), "utf8");
const tripoPanelSource = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");

assert(
  generatePanelSource.includes("tp-responsive-image-upload-zone"),
  "batch image uploads should opt into the responsive mobile upload-zone styles",
);

assert(
  generatePanelSource.includes("tp-responsive-image-grid"),
  "batch image thumbnails should use a responsive grid class",
);

assert(
  generatePanelSource.includes("tp-thumb-remove-btn"),
  "batch image remove buttons should use the thumbnail icon-button class",
);

assert(
  textureSource.includes("tp-responsive-view-grid"),
  "texture multi-view uploads should use the responsive view grid class",
);

assert(
  textureSource.includes("tp-responsive-view-card"),
  "texture multi-view cells should use the responsive view card class",
);

assert(
  textureSource.includes("tp-thumb-remove-btn"),
  "texture multi-view remove buttons should use the thumbnail icon-button class",
);

assert(
  tripoPanelSource.includes("@media (max-width: 640px)") &&
    tripoPanelSource.includes(".tp-responsive-image-upload-zone.is-multi-image") &&
    tripoPanelSource.includes("aspect-ratio:auto !important") &&
    tripoPanelSource.includes(".tp-thumb-remove-btn"),
  "TripoPanel responsive stylesheet should override fixed upload sizing and normalize thumbnail buttons on mobile",
);

console.log("tripoResponsiveImageUploads assertions passed");
