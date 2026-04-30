import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TrellisGenerator.jsx"), "utf8");

const forbiddenToolLabels = [
  "MODEL",
  "SEGMENT",
  "RETOPO",
  "TEXTURE",
  "EDIT",
  "REFINE",
  "STYLIZE",
  "ANIMATE",
];

for (const label of forbiddenToolLabels) {
  assert.equal(
    source.includes(label),
    false,
    `TrellisGenerator should not render the legacy ${label} toolstrip entry`,
  );
}

assert.equal(
  source.includes("<Settings"),
  false,
  "TrellisGenerator should not render the Trellis sidebar toggle button",
);

assert.equal(
  source.includes("<TrellisControls"),
  true,
  "TrellisGenerator should still render the main Trellis controls panel",
);

console.log("trellisGeneratorNoToolstrip assertions passed");
