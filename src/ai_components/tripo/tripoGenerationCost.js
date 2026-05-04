import { getTripoGenerateImageCost } from "./tripoImageGenerationConfig.js";

export const DEFAULT_TRIPO_PANEL_MODE_COST = {
  segment: 40,
  fill_parts: 50,
  paint: 10,
  animate: 10,
  generate_image: 5,
  generate_multiview_image: 10,
  edit_multiview_image: 5,
};

function getPositiveCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 1;
  return Math.floor(count);
}

export function estimateTripoPanelGenerationCost(options = {}, modeCost = DEFAULT_TRIPO_PANEL_MODE_COST) {
  const {
    mode,
    texSub,
    tex4K = false,
    smartLowPoly = false,
    quadMesh = false,
    segSub,
    multiviewImageMode,
    generationModel,
    genTab,
    imageSourceMode,
    modelVer,
    texOn = false,
    pbrOn = false,
    meshQ,
    inParts = false,
    batchImageCount = 1,
    animCount = 1,
  } = options;

  if (mode === "texture") {
    if (texSub === "paint") return tex4K ? 20 : modeCost.paint;
    return tex4K ? 20 : 10;
  }
  if (mode === "retopo") {
    if (smartLowPoly) return 10;
    return quadMesh ? 10 : 5;
  }
  if (mode === "refine") return 30;
  if (mode === "stylize") return 20;
  if (mode === "segment") return modeCost[segSub] ?? modeCost.segment;
  if (mode === "views") {
    if (multiviewImageMode === "generate_image") {
      return getTripoGenerateImageCost(generationModel);
    }
    return modeCost[multiviewImageMode] ?? 10;
  }
  if (mode !== "generate") {
    const flat = modeCost[mode] ?? 10;
    // animate_retarget is charged per selected animation clip
    return mode === "animate" ? flat * Math.max(1, getPositiveCount(animCount)) : flat;
  }

  const type = genTab === "text" ? "text_to_model" : genTab === "multi" ? "multiview_to_model" : "image_to_model";
  const effectiveVer = modelVer;
  const preprocessCost = genTab === "image" && imageSourceMode === "generate_image"
    ? modeCost.generate_image
    : 0;
  const imageBatchMultiplier = type === "image_to_model" && imageSourceMode !== "generate_image"
    ? getPositiveCount(batchImageCount)
    : 1;

  if (effectiveVer === "v1.4-20240625") {
    const perTaskCost = type === "text_to_model" ? 20 : 30;
    return perTaskCost * imageBatchMultiplier + preprocessCost;
  }

  const version = String(effectiveVer || "");
  const isP1 = version === "P1-20260311";
  const isText = type === "text_to_model";
  const isModern = isP1 || version.startsWith("v3.");
  const isUltra = meshQ === "ultra" && isModern && !isP1;
  const base = isP1 ? (isText ? 30 : 40) : (isText ? 10 : 20);
  const activePbrOn = texOn && pbrOn;
  const hasTex = texOn || activePbrOn;
  const texAddon = !hasTex ? 0 : tex4K && !isP1 ? 20 : 10;
  const ultraAddon = isUltra ? 20 : 0;
  const slpCost = smartLowPoly && !isP1 ? 10 : 0;
  const partsCost = inParts && !isP1 ? 20 : 0;
  const quadCost = quadMesh && !isP1 ? 5 : 0;

  return (base + texAddon + ultraAddon + slpCost + partsCost + quadCost) * imageBatchMultiplier + preprocessCost;
}
