import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../AiChat.jsx"), "utf8");

const start = source.indexOf("const handleSelectModel = useCallback");
const end = source.indexOf("const toggleGroup = useCallback", start);

assert.notEqual(start, -1, "handleSelectModel should exist");
assert.notEqual(end, -1, "toggleGroup should follow handleSelectModel");

const block = source.slice(start, end);

assert(
  block.includes('next.set("model", modelId)'),
  "model selection should write the selected model id into the URL",
);

assert.equal(
  block.includes('next.delete("model")'),
  false,
  "model selection should not delete the model URL param and rely on sessionStorage",
);

console.log("aiChatModelSelectionUrl assertions passed");
