import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../ThreeViewer.jsx"), "utf8");
const helperSource = readFileSync(resolve(__dirname, "../threeHelpers.js"), "utf8");

assert(
  source.includes("disposeModel"),
  "ThreeViewer should import the shared model disposer so it can clear a retained WebGL context",
);

assert(
  source.includes("if (!modelUrl)") && source.includes("disposeModel(S.current.scene, S.current.model"),
  "ThreeViewer should explicitly dispose the current model when modelUrl becomes null after removing modelUrl-based remounts",
);

const loadStart = helperSource.indexOf("export function loadGLB");
const handleSuccessStart = helperSource.indexOf("const handleSuccess", loadStart);
assert.notEqual(loadStart, -1, "loadGLB should exist");
assert.notEqual(handleSuccessStart, -1, "loadGLB should have a success handler");

const preSuccessLoadBlock = helperSource.slice(loadStart, handleSuccessStart);
assert(
  !preSuccessLoadBlock.includes("disposeModel("),
  "loadGLB should keep the current model visible while the next model is still fetching/parsing",
);
assert(
  helperSource.includes("function clearCurrentModel") && helperSource.includes("clearCurrentModel(s);"),
  "loadGLB should atomically clear the previous model only after the replacement object is ready",
);
assert(
  source.includes("onModelLoadingChange") && source.includes("setInternalModelLoading"),
  "ThreeViewer should expose a model loading state so the shell can show a small switch overlay",
);
assert(
  source.includes("viewerReadyTick") && source.includes("setViewerReadyTick"),
  "ThreeViewer should retry a pending modelUrl once the WebGL scene is initialized",
);

console.log("threeViewer model lifecycle assertions passed");
