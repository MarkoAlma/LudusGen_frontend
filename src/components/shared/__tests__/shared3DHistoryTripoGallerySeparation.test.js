import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedHistorySource = readFileSync(resolve(__dirname, "../Shared3DHistory.jsx"), "utf8");

assert.equal(
  sharedHistorySource.includes("{ id: 'images', label: 'Images'"),
  false,
  "Shared3DHistory should not render a dedicated Tripo Images subtab once image outputs live in the shared gallery",
);

assert.equal(
  sharedHistorySource.includes('SectionHeader label="Image Sets"'),
  false,
  "Shared3DHistory should not render a standalone Image Sets archive section for Tripo",
);

assert(
  sharedHistorySource.includes("Saved to Gallery"),
  "Shared3DHistory should explain that Tripo image outputs now live in Gallery",
);

console.log("shared3DHistoryTripoGallerySeparation assertions passed");
