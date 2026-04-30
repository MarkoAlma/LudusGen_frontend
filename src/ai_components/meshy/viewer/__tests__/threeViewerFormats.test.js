import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const helperSource = readFileSync(resolve(__dirname, "../threeHelpers.js"), "utf8");

assert(
  helperSource.includes("OBJLoader"),
  "ThreeViewer should support OBJ files accepted by Marketplace uploads",
);

assert(
  helperSource.includes("STLLoader"),
  "ThreeViewer should support STL files accepted by Marketplace uploads",
);

assert(
  helperSource.includes("createStlMesh"),
  "STL geometry should be wrapped in a mesh before handing it to the shared viewer pipeline",
);

assert(
  helperSource.includes("getModelExtension"),
  "Blob preview URLs should preserve the original file extension through a filename fragment",
);

console.log("threeViewerFormats assertions passed");
