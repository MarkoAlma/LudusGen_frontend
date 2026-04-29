import assert from "node:assert/strict";
import { estimateTripoPanelGenerationCost } from "../tripoGenerationCost.js";

{
  const result = estimateTripoPanelGenerationCost({
    mode: "generate",
    genTab: "image",
    imageSourceMode: "upload",
    modelVer: "P1-20260311",
    texOn: false,
    pbrOn: false,
    tex4K: false,
    meshQ: "standard",
    inParts: false,
    quadMesh: false,
    smartLowPoly: false,
    batchImageCount: 6,
  });

  assert.equal(result, 240, "P1 image batch should charge 40 credits per uploaded image");
}

{
  const result = estimateTripoPanelGenerationCost({
    mode: "generate",
    genTab: "image",
    imageSourceMode: "upload",
    modelVer: "P1-20260311",
    texOn: true,
    pbrOn: false,
    tex4K: true,
    meshQ: "ultra",
    inParts: true,
    quadMesh: true,
    smartLowPoly: true,
    batchImageCount: 2,
  });

  assert.equal(
    result,
    100,
    "P1 batch should ignore unsupported HD/ultra/parts/quad/low-poly addons and charge 50 per image",
  );
}

{
  const result = estimateTripoPanelGenerationCost({
    mode: "generate",
    genTab: "image",
    imageSourceMode: "generate_image",
    modelVer: "v3.1-20260211",
    texOn: false,
    pbrOn: false,
    tex4K: false,
    meshQ: "standard",
    inParts: false,
    quadMesh: false,
    smartLowPoly: false,
    batchImageCount: 6,
  });

  assert.equal(result, 25, "generate_image preprocess should add 5 credits and produce one image-to-model task");
}

console.log("tripoGenerationCost assertions passed");
