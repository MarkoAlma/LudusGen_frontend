import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatePanel = readFileSync(resolve(__dirname, "../GeneratePanel.jsx"), "utf8");
const multiviewPanel = readFileSync(resolve(__dirname, "../MultiviewImagesPanel.jsx"), "utf8");

for (const [label, source] of [
  ["GeneratePanel", generatePanel],
  ["MultiviewImagesPanel", multiviewPanel],
]) {
  assert(
    source.includes("GalleryPickerModal"),
    `${label} should reuse the image studio gallery picker for Tripo image uploads`,
  );
  assert(
    source.includes("ImageSourceChoiceModal"),
    `${label} should ask whether the upload comes from device or gallery`,
  );
  assert(
    source.includes("dataUrlToFile"),
    `${label} should convert gallery data URLs back to Files before Tripo upload`,
  );
}

console.log("tripoGalleryUploadSourcePicker assertions passed");
