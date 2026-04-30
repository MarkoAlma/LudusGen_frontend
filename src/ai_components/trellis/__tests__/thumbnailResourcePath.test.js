import assert from "node:assert/strict";

import { getModelResourcePath } from "../Glbthumbnail.js";

assert.equal(
  getModelResourcePath("https://tripo-data.rg1.data.tripo3d.com/task/model.fbx?Policy=signed"),
  "https://tripo-data.rg1.data.tripo3d.com/task/"
);

assert.equal(
  getModelResourcePath("https://cdn.example.test/assets/vehicle.glb#preview"),
  "https://cdn.example.test/assets/"
);

assert.equal(getModelResourcePath("blob:http://localhost/model"), "");
assert.equal(getModelResourcePath(new ArrayBuffer(4)), "");

console.log("thumbnailResourcePath tests passed");
