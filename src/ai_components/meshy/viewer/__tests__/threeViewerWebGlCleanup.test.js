import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../ThreeViewer.jsx"), "utf8");

assert(
  source.includes("forceContextLoss"),
  "ThreeViewer should explicitly force WebGL context loss during cleanup so repeated dev remounts do not exhaust the browser context limit",
);

console.log("threeViewer WebGL cleanup assertions passed");
