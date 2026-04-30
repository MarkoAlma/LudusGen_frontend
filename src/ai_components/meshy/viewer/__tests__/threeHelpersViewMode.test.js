import assert from "node:assert/strict";
import * as THREE from "three";
import { applyViewMode } from "../threeHelpers.js";

function createStateWithTexturedMesh() {
  const scene = new THREE.Scene();
  const texture = new THREE.Texture();
  texture.image = { width: 2, height: 2, data: new Uint8Array(16) };

  const originalMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x88aaff,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), originalMaterial);
  scene.add(mesh);

  return {
    THREE,
    scene,
    mesh,
    originalMaterial,
    origMaterials: new Map([[mesh.uuid, originalMaterial]]),
    dirtyCount: 0,
    markDirty() {
      this.dirtyCount += 1;
    },
  };
}

{
  const state = createStateWithTexturedMesh();

  applyViewMode(state, "uv");

  assert.equal(state.mesh.material.isMeshBasicMaterial, true, "Base Color mode should be unlit");
  assert.equal(state.mesh.material.map, state.originalMaterial.map, "Base Color mode should use the base texture map");
  assert.equal(state.mesh.material.color.getHex(), state.originalMaterial.color.getHex(), "Base Color mode should preserve the material base color factor");
}

{
  const state = createStateWithTexturedMesh();
  const preservedBaseColorFactor = new THREE.Color(0x88aaff);

  state.originalMaterial.color.setHex(0xffffff);
  state.originalMaterial.userData.originalBaseColorFactor = preservedBaseColorFactor.clone();

  applyViewMode(state, "uv");

  assert.equal(
    state.mesh.material.color.getHex(),
    preservedBaseColorFactor.getHex(),
    "Base Color mode should prefer the preserved base color factor when RGB sanitization whitened the lit material"
  );
}

{
  const state = createStateWithTexturedMesh();

  applyViewMode(state, "uv");
  applyViewMode(state, "normal");

  assert.equal(state.mesh.material, state.originalMaterial, "RGB mode should restore the original lit material");
}

console.log("threeHelpersViewMode assertions passed");
