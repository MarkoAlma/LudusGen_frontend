import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatePanelSource = readFileSync(resolve(__dirname, "../GeneratePanel.jsx"), "utf8");
const imageWorkflowSource = readFileSync(resolve(__dirname, "../MultiviewImagesPanel.jsx"), "utf8");

assert.equal(
  generatePanelSource.includes('setImageSourceMode("generate_image")'),
  false,
  "GeneratePanel should no longer offer Generate Image as an image-to-model source mode",
);

assert.equal(
  generatePanelSource.includes(">Generate Image<"),
  false,
  "GeneratePanel should not render a Generate Image source toggle anymore",
);

assert(
  imageWorkflowSource.includes('setMode("generate_image")'),
  "the dedicated image workflow panel should include a Generate Image mode",
);

assert(
  imageWorkflowSource.includes("Generate Views"),
  "the dedicated image workflow panel should still include Generate Views",
);

assert(
  imageWorkflowSource.includes("Edit Views"),
  "the dedicated image workflow panel should still include Edit Views",
);

console.log("tripoImageWorkflowLayout assertions passed");
