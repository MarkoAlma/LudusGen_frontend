import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatePanelSource = readFileSync(resolve(__dirname, "../GeneratePanel.jsx"), "utf8");
const imageWorkflowSource = readFileSync(resolve(__dirname, "../MultiviewImagesPanel.jsx"), "utf8");
const tripoPanelSource = readFileSync(resolve(__dirname, "../TripoPanel.jsx"), "utf8");
const imageGenerationConfigSource = readFileSync(resolve(__dirname, "../tripoImageGenerationConfig.js"), "utf8");

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

assert(
  imageWorkflowSource.includes("Image Engine"),
  "the image workflow should expose the image engine selector in the default flow",
);

assert.equal(
  imageWorkflowSource.includes("Template options"),
  false,
  "the default image generation workflow should not expose Tripo 3D-prep templates",
);

assert.equal(
  imageWorkflowSource.includes("TRIPO_IMAGE_TEMPLATE_OPTIONS"),
  false,
  "the default image generation workflow should not render a template dropdown",
);

assert(
  imageWorkflowSource.includes('tp-custom-select${open ? " open" : ""}'),
  "opened custom selects should mark their root so their menu stacks above sibling selects",
);

assert(
  tripoPanelSource.includes(".tp-custom-select.open"),
  "the custom select CSS should raise the z-index for the currently open menu",
);

assert(
  imageWorkflowSource.includes("imageModelOptions"),
  "the image engine dropdown should derive its options from the shared Tripo image config",
);

assert(
  imageWorkflowSource.includes("<TripoOverlaySelect"),
  "the image engine selector should use the styled LudusGen overlay select, not the browser-native dropdown",
);

assert(
  imageWorkflowSource.includes("handleGenerationModelChange"),
  "the image engine selector should commit changes through a stable change handler",
);

assert.equal(
  imageWorkflowSource.includes("tp-image-engine-native-select"),
  false,
  "the image engine selector should not render the ugly browser-native select styling",
);

assert(
  imageWorkflowSource.includes("createPortal"),
  "custom select menus should render through a portal so opening them does not change panel scroll height",
);

assert(
  tripoPanelSource.includes("position:fixed"),
  "custom select menus should use fixed positioning to avoid scroll-jump when opened",
);

assert(
  imageWorkflowSource.includes("isPromptOnlyEngine"),
  "prompt-only image engines should drive reference upload availability",
);

assert(
  imageWorkflowSource.includes("disabled: !referenceEnabled"),
  "reference image upload should be disabled when a prompt-only engine is selected",
);

assert(
  imageWorkflowSource.includes("input.multiple = maxReferenceImages > 1"),
  "reference picker should allow selecting multiple files when the model supports multiple references",
);

assert(
  imageWorkflowSource.includes("referenceSlotsRemaining"),
  "reference picker should cap uploads at the selected model reference limit",
);

assert(
  imageWorkflowSource.includes("onPointerDown"),
  "custom select options should commit selection on pointer down so portal close timing cannot revert the choice",
);

assert(
  imageWorkflowSource.includes("not sent"),
  "reference thumbnails should remain visible when kept but not sent by the current model",
);

assert(
  imageWorkflowSource.includes("Open preview"),
  "reference thumbnails should be directly previewable",
);

assert(
  tripoPanelSource.includes("referenceImages: imageReferenceItems.map(toTripoImageRef).filter(Boolean)"),
  "generate_image submissions should send every ready reference image, not only the first one",
);

assert(
  tripoPanelSource.includes("ensureImageHistoryThumb"),
  "the selected Tripo preview should build thumbnails for image-only history items",
);

assert(
  tripoPanelSource.includes("function SelectedHistoryImagePopup"),
  "the selected Tripo preview should expose a 2D image popup for image history items",
);

assert(
  tripoPanelSource.includes("fetchSelectedHistoryTaskPreviewImageUrl"),
  "the selected Tripo preview should fetch Tripo task preview images before falling back to model thumbnail rendering",
);

assert(
  !tripoPanelSource.includes("key={modelUrl || \"tripo-empty-viewer\"}"),
  "the 3D viewer should keep its WebGL context when the selected model URL changes",
);

assert(
  tripoPanelSource.includes("viewerModelUrl={modelUrl}"),
  "the selected preview card should receive the currently loaded viewer model URL for thumbnail fallback",
);

assert(
  !tripoPanelSource.includes("revokeBlobUrl(prevUrl.current);\n        prevUrl.current = null;\n        setModelUrl(null);"),
  "history selection should keep the previous viewer model until the next selected model is ready",
);

assert(
  tripoPanelSource.includes("/api/tripo/task/${encodeURIComponent(taskId)}"),
  "selected preview task thumbnails should use the same Tripo task detail endpoint as the history panel",
);

assert(
  tripoPanelSource.includes("createPortal("),
  "the selected Tripo image popup should render above the 3D canvas through a portal",
);

assert(
  imageWorkflowSource.includes("enhancePrompt"),
  "the image generation prompt should expose the shared image prompt enhancer action",
);

[
  "flux.1_kontext_pro",
  "flux.1_dev",
  "gpt_4o",
  "gemini_2.5_flash_image_preview",
  "z_image",
  "gpt_image_1.5",
  "midjourney",
  "gemini_3_pro_image_preview",
  "gemini_3.1_flash_image_preview",
].forEach((tripoOption) => {
  assert(
    imageGenerationConfigSource.includes(tripoOption),
    `the image workflow should expose the Tripo docs option ${tripoOption}`,
  );
});

assert.equal(
  imageWorkflowSource.includes("Optional model id"),
  false,
  "the image workflow should not expose raw optional model id copy in the default flow",
);

assert.equal(
  imageWorkflowSource.includes("Optional template id"),
  false,
  "the image workflow should not expose raw optional template id copy in the default flow",
);

assert.equal(
  tripoPanelSource.includes("template: generationTemplateId"),
  false,
  "the default image generation submission should not send hidden template selections",
);

console.log("tripoImageWorkflowLayout assertions passed");
