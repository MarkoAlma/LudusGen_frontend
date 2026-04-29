import assert from "node:assert/strict";

import { shouldAutoSelectGeneratedHistoryItem } from "../tripoAutoSelectionPolicy.js";

assert.equal(
  shouldAutoSelectGeneratedHistoryItem(null),
  false,
  "missing history items should never be auto-selected",
);

assert.equal(
  shouldAutoSelectGeneratedHistoryItem({
    id: "tripo_model_1",
    mode: "generate",
    model_url: "https://example.com/model.glb",
  }),
  false,
  "generated 3D models should load into the viewer without replacing the manual selection",
);

assert.equal(
  shouldAutoSelectGeneratedHistoryItem({
    id: "tripo_views_1",
    kind: "images",
    image_urls: ["https://example.com/front.png"],
  }),
  true,
  "generated multiview image sets should stay auto-selected for the image workflow",
);

console.log("tripoAutoSelectionPolicy assertions passed");
