import assert from "node:assert/strict";
import { buildTripoReuseState } from "../tripoReuseState.js";

{
  const reused = buildTripoReuseState({
    prompt: "high-quality anime 3D model, cel-shaded aesthetics, crisp outlines, vibrant anime palette, Japanese studio animation style, fox samurai with red armor",
    name: "Fox Samurai",
    styleId: "anime",
    mode: "generate",
    taskId: "task-generate-1",
    negPrompt: "blurry",
    params: {
      mode: "generate",
      type: "text_to_model",
      basePrompt: "fox samurai with red armor",
      genTab: "text",
      model_version: "v3.1-20260211",
      meshQ: "ultra",
      texture: true,
      pbr: true,
      texture_quality: "detailed",
      generate_parts: true,
      quad: true,
      smart_low_poly: true,
      face_limit: 20000,
      t_pose: true,
      model_seed: 11,
      image_seed: 22,
      texture_seed: 33,
      auto_size: true,
      export_uv: false,
      compress: "medium",
      orientation: "portrait",
      texture_alignment: "original_image",
      render_image: true,
    },
  });

  assert.equal(reused.mode, "generate");
  assert.equal(reused.genTab, "text");
  assert.equal(reused.prompt, "fox samurai with red armor");
  assert.equal(reused.activeStyle, "anime");
  assert.equal(reused.negPrompt, "blurry");
  assert.equal(reused.modelName, "Fox Samurai");
  assert.equal(reused.modelVer, "v3.1-20260211");
  assert.equal(reused.meshQ, "ultra");
  assert.equal(reused.texOn, true);
  assert.equal(reused.tex4K, true);
  assert.equal(reused.pbrOn, true);
  assert.equal(reused.inParts, true);
  assert.equal(reused.quadMesh, true);
  assert.equal(reused.smartLowPoly, true);
  assert.equal(reused.polycount, 20000);
  assert.equal(reused.tPose, true);
  assert.equal(reused.modelSeed, 11);
  assert.equal(reused.imageSeed, 22);
  assert.equal(reused.textureSeed, 33);
  assert.equal(reused.autoSize, true);
  assert.equal(reused.exportUv, false);
  assert.equal(reused.generationCompress, "medium");
  assert.equal(reused.generationOrientation, "portrait");
  assert.equal(reused.generationTextureAlignment, "original_image");
  assert.equal(reused.generationRenderImage, true);
}

{
  const reused = buildTripoReuseState({
    prompt: "segment result",
    name: "Segmented Crystal Wolf",
    mode: "fill_parts",
    taskId: "task-fill-1",
    params: {
      mode: "fill_parts",
      type: "fill_parts",
      originalModelTaskId: "task-source-7",
    },
  });

  assert.equal(reused.mode, "segment");
  assert.equal(reused.segSub, "fill_parts");
  assert.equal(reused.fillId, "task-source-7");
  assert.equal(reused.segId, "task-source-7");
  assert.equal(reused.modelName, "Segmented Crystal Wolf");
}

console.log("tripoReuseState assertions passed");
