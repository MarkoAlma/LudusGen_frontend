import { stripTripoStylePrefix } from "./tripoStylePresets.js";

function readString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function readNumber(value, fallback = null) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function inferGenerateTab(params = {}) {
  if (params.genTab) return params.genTab;
  const type = params.type || "";
  if (type === "text_to_model") return "text";
  if (type === "multiview_to_model") return "multi";
  return "image";
}

function inferMode(item, params = {}) {
  const rawMode = params.reuseMode || params.mode || item?.mode || "generate";
  if (rawMode === "fill_parts") {
    return { mode: "segment", segSub: "fill_parts", texSub: "text" };
  }
  if (rawMode === "segment") {
    return { mode: "segment", segSub: "segment", texSub: "text" };
  }
  if (rawMode === "texture") {
    return {
      mode: "texture",
      segSub: "segment",
      texSub: params.texSub || (params.type === "texture_edit" ? "paint" : "text"),
    };
  }
  return {
    mode: rawMode,
    segSub: "segment",
    texSub: params.texSub || "text",
  };
}

export function buildTripoReuseState(item) {
  const params = item?.params || {};
  const activeStyle = item?.styleId || params.styleId || "";
  const modeInfo = inferMode(item, params);
  const prompt =
    readString(params.basePrompt)
    || readString(params.promptBase)
    || readString(params.reusePrompt)
    || stripTripoStylePrefix(readString(item?.prompt), activeStyle);
  const taskKey =
    readString(params.operationTaskId)
    || readString(params.originalModelTaskId)
    || readString(params.originalTaskId)
    || readString(params.draftModelTaskId)
    || readString(item?.taskId)
    || readString(item?.id);
  const textureQuality = readString(params.texture_quality);

  return {
    mode: modeInfo.mode,
    genTab: inferGenerateTab(params),
    segSub: modeInfo.segSub,
    texSub: modeInfo.texSub,
    multiviewImageMode: readString(params.multiviewImageMode) || "generate_image",
    prompt,
    negPrompt: readString(item?.negPrompt),
    activeStyle,
    modelName: readString(item?.name || item?.displayName),
    modelVer: readString(params.model_version),
    meshQ: readString(params.meshQ) || (readString(params.geometry_quality) === "detailed" ? "ultra" : "standard"),
    texOn: readBoolean(params.texOn, readBoolean(params.texture)),
    tex4K: readBoolean(params.tex4K, textureQuality === "detailed"),
    pbrOn: readBoolean(params.pbrOn, readBoolean(params.pbr)),
    inParts: readBoolean(params.inParts, readBoolean(params.generate_parts)),
    quadMesh: readBoolean(params.quadMesh, readBoolean(params.quad)),
    smartLowPoly: readBoolean(params.smartLowPoly, readBoolean(params.smart_low_poly)),
    polycount: readNumber(params.polycount, readNumber(params.face_limit, 0)) || 0,
    tPose: readBoolean(params.tPose, readBoolean(params.t_pose)),
    modelSeed: readNumber(params.modelSeed, readNumber(params.model_seed)),
    imageSeed: readNumber(params.imageSeed, readNumber(params.image_seed)),
    textureSeed: readNumber(params.textureSeed, readNumber(params.texture_seed)),
    autoSize: readBoolean(params.autoSize, readBoolean(params.auto_size)),
    exportUv: params.exportUv === false || params.export_uv === false ? false : true,
    generationCompress: readString(params.generationCompress || params.compress),
    generationOrientation: readString(params.generationOrientation || params.orientation),
    generationTextureAlignment: readString(params.generationTextureAlignment || params.texture_alignment),
    generationRenderImage: readBoolean(params.generationRenderImage, readBoolean(params.render_image, true)),
    texInputTab: readString(params.texInputTab) || "text",
    texPrompt: readString(params.texPrompt),
    texNeg: readString(params.texNeg),
    texPbr: readBoolean(params.texPbr, readBoolean(params.pbr)),
    texAlignment: readString(params.texAlignment || params.texture_alignment) || "original_image",
    textureModelVer: readString(params.textureModelVer || params.textureModelVersion || params.model_version),
    brushMode: readString(params.brushMode) || "Gen Mode",
    brushPrompt: readString(params.brushPrompt),
    creativity: readNumber(params.creativity, 0.6) ?? 0.6,
    stylizeStyle: readString(params.stylizeStyle) || "lego",
    animOutFormat: readString(params.animOutFormat || params.out_format) || "glb",
    animBakeAnimation: readBoolean(params.animBakeAnimation, readBoolean(params.bake_animation, true)),
    animExportGeometry: readBoolean(params.animExportGeometry, readBoolean(params.export_with_geometry, true)),
    animAnimateInPlace: readBoolean(params.animAnimateInPlace, readBoolean(params.animate_in_place)),
    segId: taskKey,
    fillId: taskKey,
    retopoId: taskKey,
    texId: taskKey,
    editId: taskKey,
    refineId: taskKey,
    stylizeId: taskKey,
    animId: taskKey,
  };
}
