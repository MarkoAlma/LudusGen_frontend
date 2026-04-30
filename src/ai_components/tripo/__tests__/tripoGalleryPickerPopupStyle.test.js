import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatePanel = readFileSync(resolve(__dirname, "../GeneratePanel.jsx"), "utf8");
const multiviewPanel = readFileSync(resolve(__dirname, "../MultiviewImagesPanel.jsx"), "utf8");
const galleryPickerSource = readFileSync(resolve(__dirname, "../../../components/image_studio/ImageControls.jsx"), "utf8");

for (const [label, source] of [
  ["GeneratePanel", generatePanel],
  ["MultiviewImagesPanel", multiviewPanel],
]) {
  assert(
    source.includes('variant="tripo"'),
    `${label} should open the shared gallery picker with the Tripo popup styling variant`,
  );
}

assert(
  galleryPickerSource.includes("variant = 'default'"),
  "GalleryPickerModal should support a variant prop so Tripo can use a dedicated popup shell",
);

assert(
  galleryPickerSource.includes("Gallery Vault"),
  "GalleryPickerModal should render the Tripo-themed popup title",
);

assert(
  galleryPickerSource.includes("Load selected"),
  "GalleryPickerModal should render the stronger Tripo popup CTA copy",
);

console.log("tripoGalleryPickerPopupStyle assertions passed");
