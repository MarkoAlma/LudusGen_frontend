import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tripoPanelSource = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");

assert(
  tripoPanelSource.includes(".tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:first-child"),
  "GeneratePanel clean tabs should restore the left edge radius on the first segment",
);

assert(
  tripoPanelSource.includes(".tp-workflow-page .tp-gen-tabs > .tp-inp-tab-clean:last-child"),
  "GeneratePanel clean tabs should restore the right edge radius on the last segment",
);

assert(
  tripoPanelSource.includes(".tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:first-child"),
  "Source mode clean tabs should restore the left edge radius on the first segment",
);

assert(
  tripoPanelSource.includes(".tp-workflow-page .tp-source-mode-row > .tp-source-mode-btn-clean:last-child"),
  "Source mode clean tabs should restore the right edge radius on the last segment",
);

console.log("tripo segmented tab radius assertions passed");
