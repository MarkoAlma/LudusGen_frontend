import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export const hexToInt = (h) => (h ? parseInt(h.replace("#", ""), 16) : null);

export function syncCamera(camera, c) {
  const pz = c.panZ ?? 0;
  camera.position.set(
    c.panX + c.radius * Math.sin(c.phi) * Math.sin(c.theta),
    c.panY + c.radius * Math.cos(c.phi),
    pz + c.radius * Math.sin(c.phi) * Math.cos(c.theta),
  );
  camera.lookAt(c.panX, c.panY, pz);
}

export function buildPlaceholder(THREE, color) {
  const geo = new THREE.TorusKnotGeometry(0.7, 0.26, 140, 22);
  const mat = new THREE.MeshStandardMaterial({
    color: hexToInt(color) || 0x7c3aed, metalness: 0.4, roughness: 0.3,
  });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.userData.isPlaceholder = true;
  geo.computeBoundingBox();
  m.position.y = -1 - geo.boundingBox.min.y;
  return m;
}

export function createSunLight(THREE, scene) {
  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 9000000;
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.001;
  scene.add(sun.target); scene.add(sun);
  sun.position.set(2000000, 4000000, 2000000);
  sun.target.position.set(0, 0, 0);
  sun.updateMatrix(); sun.updateMatrixWorld(true);
  sun.target.updateMatrix(); sun.target.updateMatrixWorld(true);
  sun.matrixAutoUpdate = false; sun.matrixWorldNeedsUpdate = false;
  if ("matrixWorldAutoUpdate" in sun) sun.matrixWorldAutoUpdate = false;
  sun.target.matrixAutoUpdate = false; sun.target.matrixWorldNeedsUpdate = false;
  if ("matrixWorldAutoUpdate" in sun.target) sun.target.matrixWorldAutoUpdate = false;
  return sun;
}

export function setSunLightProps(sunLight, show, color, intensity) {
  if (!sunLight) return;
  sunLight.color.setHex(hexToInt(color) || 0xffffff);
  sunLight.intensity = show ? Math.max(0.08, intensity * 2.5) : 0;
  if (sunLight.shadow) sunLight.shadow.radius = 4;
}

export function setSceneBg(s, bgColor) {
  const { THREE, scene, renderer } = s;
  if (!THREE || !scene || !renderer) return;
  const COLORS = {
    default: null,
    black: 0x050508,
    darkgray: 0x0d0d14,
    deep: 0x0a0a12,
    grayish: 0x1a1a24,
    white: 0xeeeeee
  };
  const val = COLORS[bgColor] ?? null;
  if (val === null) { scene.background = null; renderer.setClearAlpha(0); }
  else { scene.background = new THREE.Color(val); renderer.setClearAlpha(1); }
  s.markDirty?.();
}

export function setGridColor(s, c1, c2) {
  const { grid } = s;
  if (!grid) return;
  if (Array.isArray(grid.material)) {
    grid.material[0].color.setHex(c1); grid.material[1].color.setHex(c2);
  } else { grid.material.color.setHex(c1); }
  s.markDirty?.();
}

export function applyLights(s, mode, color, strength = 1, rotation = 0, dramaticColor = null, viewMode = "normal") {
  const { THREE, lightGroup } = s;
  if (!THREE) return;
  const toRemove = lightGroup.children.filter((c) => !c.userData.isBackLight);
  toRemove.forEach((c) => lightGroup.remove(c));

  if (viewMode === 'uv') { lightGroup.rotation.y = 0; s.markDirty?.(); return; }

  if (viewMode === 'clay') {
    lightGroup.add(new THREE.HemisphereLight(0xc8c0b8, 0x302820, 0.18));
    const key = new THREE.DirectionalLight(0xb8b8b8, 0.9);
    key.position.set(5, 9, 6); key.castShadow = true; lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xa0a8b0, 0.2);
    fill.position.set(-6, 3, 2); lightGroup.add(fill);
    const back = new THREE.DirectionalLight(0x909090, 0.1);
    back.position.set(0, 2, -7); lightGroup.add(back);
    lightGroup.rotation.y = 0; s.markDirty?.(); return;
  }

  const k = strength;
  if (mode === "studio") {
    lightGroup.add(new THREE.AmbientLight(0xffffff, 0.35 * k));
    const key = new THREE.DirectionalLight(0xffffff, 1.0 * k);
    key.position.set(4, 6, 4); key.castShadow = true; lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.45 * k);
    fill.position.set(-4, 2, -2); lightGroup.add(fill);
    const rim = new THREE.DirectionalLight(hexToInt(color) || 0x7c3aed, 0.5 * k);
    rim.position.set(-2, -1, -5); lightGroup.add(rim);
  } else if (mode === "outdoor") {
    lightGroup.add(new THREE.HemisphereLight(0x87ceeb, 0x3a3020, 0.8 * k));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.1 * k);
    sun.position.set(8, 12, 6); sun.castShadow = true; lightGroup.add(sun);
  } else if (mode === "dramatic") {
    lightGroup.add(new THREE.AmbientLight(0x111133, 0.15 * k));
    const spot = new THREE.SpotLight(0xffffff, 2.5 * k, 30, Math.PI / 8, 0.3);
    spot.position.set(0, 8, 3); spot.castShadow = true; lightGroup.add(spot);
    const dCol = hexToInt(dramaticColor) ?? hexToInt(color) ?? 0x4400ff;
    const back = new THREE.DirectionalLight(dCol, 0.8 * k);
    back.position.set(-5, -2, -5); lightGroup.add(back);
  }
  lightGroup.rotation.y = (rotation * Math.PI) / 180;
  s.markDirty?.();
}

// ── applyViewMode ─────────────────────────────────────────────────────────────
// FIX 1: Single traverse — ground pass merged in (was two separate traversals)
// FIX 2: Per-mesh material cache (_clayMats / _uvMats) to avoid recreating GPU
//         objects on every mode switch — previously all these materials leaked.
export function applyViewMode(s, mode) {
  const { THREE, scene, origMaterials } = s;
  if (!THREE) return;

  if (!s._clayMats) s._clayMats = new Map();
  if (!s._uvMats) s._uvMats = new Map();

  scene.traverse((node) => {
    // Ground: merged here — no second traverse needed
    if (node.userData.isGround) { node.receiveShadow = true; return; }
    if (!node.isMesh || node.userData.isBgLight) return;

    if (!origMaterials.has(node.uuid)) origMaterials.set(node.uuid, node.material);
    const orig = origMaterials.get(node.uuid);
    node.castShadow = true;

    if (mode === 'clay') {
      if (!s._clayMats.has(node.uuid)) {
        if (node.geometry && !node.geometry.attributes.normal) node.geometry.computeVertexNormals();
        const buildClay = () => new THREE.MeshStandardMaterial({
          color: 0x7a7a7a, metalness: 0, roughness: 0.82, envMapIntensity: 0, side: THREE.DoubleSide,
        });
        s._clayMats.set(node.uuid, Array.isArray(orig) ? orig.map(() => buildClay()) : buildClay());
      }
      node.material = s._clayMats.get(node.uuid);

    } else if (mode === 'normal') {
      node.material = orig;

    } else if (mode === 'uv') {
      if (!s._uvMats.has(node.uuid)) {
        const buildBasic = (m) => {
          const map = (m?.map) ?? null;
          if (map) { map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true; }
          return new THREE.MeshBasicMaterial({
            map, color: map ? 0xffffff : (m?.color ?? new THREE.Color(0xe0dbd5)),
          });
        };
        s._uvMats.set(node.uuid, Array.isArray(orig) ? orig.map(m => buildBasic(m)) : buildBasic(orig));
      }
      node.material = s._uvMats.get(node.uuid);
    }
  });

  s.markDirty?.();
}

// ── applyWireframeOverlay ─────────────────────────────────────────────────────
export function applyWireframeOverlay(s, show, opacity = 0.22, hexColor = 0xffffff) {
  const { THREE, scene } = s;
  if (!THREE) return;
  if (!s._wireCache) s._wireCache = new Map();

  scene.traverse((node) => {
    if (!node.isMesh || node.userData.isGround || node.userData.isBgLight) return;
    const existing = node.children.filter((c) => c.userData.isWireframeOverlay);
    existing.forEach((c) => { if (c.material) c.material.dispose(); node.remove(c); });
    if (!show) { s._wireCache.delete(node.uuid); return; }
    let wireGeo = s._wireCache.get(node.uuid);
    if (!wireGeo) { wireGeo = new THREE.WireframeGeometry(node.geometry); s._wireCache.set(node.uuid, wireGeo); }
    const wireMat = new THREE.LineBasicMaterial({ color: hexColor, opacity, transparent: true, depthTest: true });
    const lines = new THREE.LineSegments(wireGeo, wireMat);
    lines.userData.isWireframeOverlay = true; lines.renderOrder = 2;
    node.add(lines);
  });

  s.markDirty?.();
}

// ── applyRigSkeletonOverlay ───────────────────────────────────────────────────
// Renders the skeleton/bone hierarchy of a rigged GLTF model as colored lines.
// Tripo rigged models embed a THREE.Skeleton with bone nodes in the scene graph.
// When an AnimationMixer is active, updateRigOverlay() syncs the overlay each frame.
export function applyRigSkeletonOverlay(s, show, opacity = 0.85, hexColor = 0x22c55e) {
  const { THREE, scene, model } = s;
  if (!THREE || !model) return;

  if (s._rigOverlay) {
    scene.remove(s._rigOverlay);
    s._rigOverlay.traverse((c) => { if (c.material) c.material.dispose(); });
    s._rigOverlay = null;
  }
  s._rigBoneData = null;
  if (!show) { s.markDirty?.(); return; }

  const boneNodes = [];
  const boneSet = new Set();
  scene.traverse((node) => {
    if (node.isBone || (node.userData && node.userData.isBone)) {
      if (!boneSet.has(node)) { boneNodes.push(node); boneSet.add(node); }
    }
    if (node.isSkinnedMesh && node.skeleton) {
      node.skeleton.bones.forEach((b) => {
        if (!boneSet.has(b)) { boneNodes.push(b); boneSet.add(b); }
      });
    }
  });

  if (boneNodes.length === 0) { s.markDirty?.(); return; }

  scene.updateMatrixWorld(true);

  const isVec3Finite = (v) => isFinite(v.x) && isFinite(v.y) && isFinite(v.z);

  const linePairs = [];
  const jointBones = [];
  boneNodes.forEach((bone) => {
    if (bone.parent && boneSet.has(bone.parent)) {
      linePairs.push([bone.parent, bone]);
    }
    jointBones.push(bone);
  });

  const positions = new Float32Array(linePairs.length * 6);
  const dotPositions = new Float32Array(jointBones.length * 3);
  const tmpV = new THREE.Vector3();

  let pi = 0;
  linePairs.forEach(([parent, child]) => {
    parent.getWorldPosition(tmpV);
    if (isVec3Finite(tmpV)) { positions[pi] = tmpV.x; positions[pi + 1] = tmpV.y; positions[pi + 2] = tmpV.z; }
    pi += 3;
    child.getWorldPosition(tmpV);
    if (isVec3Finite(tmpV)) { positions[pi] = tmpV.x; positions[pi + 1] = tmpV.y; positions[pi + 2] = tmpV.z; }
    pi += 3;
  });

  let di = 0;
  jointBones.forEach((bone) => {
    bone.getWorldPosition(tmpV);
    if (isVec3Finite(tmpV)) { dotPositions[di] = tmpV.x; dotPositions[di + 1] = tmpV.y; dotPositions[di + 2] = tmpV.z; }
    di += 3;
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const mat = new THREE.LineBasicMaterial({ color: hexColor, opacity, transparent: true, depthTest: true });
  const lines = new THREE.LineSegments(geo, mat);
  lines.userData.isRigOverlay = true;
  lines.renderOrder = 3;

  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
  dotGeo.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const dotMat = new THREE.PointsMaterial({ color: hexColor, size: 0.06, sizeAttenuation: true, transparent: true, opacity });
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.userData.isRigOverlay = true;
  dots.renderOrder = 3;

  const group = new THREE.Group();
  group.add(lines);
  group.add(dots);
  group.userData.isRigOverlay = true;
  scene.add(group);
  s._rigOverlay = group;
  s._rigBoneData = { linePairs, jointBones, lines, dots, tmpV };
  s.markDirty?.();
}

// ── updateRigOverlay ─────────────────────────────────────────────────────────
// Call each frame after mixer.update() to sync skeleton lines with bone poses.
export function updateRigOverlay(s) {
  const bd = s._rigBoneData;
  if (!bd || !s._rigOverlay) return;

  const { linePairs, jointBones, lines, dots, tmpV } = bd;
  const isFiniteV = (v) => isFinite(v.x) && isFinite(v.y) && isFinite(v.z);

  const posArr = lines.geometry.attributes.position.array;
  let pi = 0;
  for (let i = 0; i < linePairs.length; i++) {
    const [parent, child] = linePairs[i];
    parent.getWorldPosition(tmpV);
    if (isFiniteV(tmpV)) { posArr[pi] = tmpV.x; posArr[pi + 1] = tmpV.y; posArr[pi + 2] = tmpV.z; }
    pi += 3;
    child.getWorldPosition(tmpV);
    if (isFiniteV(tmpV)) { posArr[pi] = tmpV.x; posArr[pi + 1] = tmpV.y; posArr[pi + 2] = tmpV.z; }
    pi += 3;
  }
  lines.geometry.attributes.position.needsUpdate = true;

  const dotArr = dots.geometry.attributes.position.array;
  let di = 0;
  for (let i = 0; i < jointBones.length; i++) {
    jointBones[i].getWorldPosition(tmpV);
    if (isFiniteV(tmpV)) { dotArr[di] = tmpV.x; dotArr[di + 1] = tmpV.y; dotArr[di + 2] = tmpV.z; }
    di += 3;
  }
  dots.geometry.attributes.position.needsUpdate = true;
}

// ── disposeModel ──────────────────────────────────────────────────────────────
// FIX: now also disposes cached clay + uv materials (previously leaked on every model switch)
// ── switchAnimationClip ──────────────────────────────────────────────────────
// Switch to a different animation clip by index. Crossfades over 0.25s.
export function switchAnimationClip(s, index) {
  if (!s?._mixer || !s._animClips?.length) return;
  const clip = s._animClips[index];
  if (!clip) return;
  const newAction = s._mixer.clipAction(clip);
  if (s._animAction && s._animAction !== newAction) {
    newAction.reset();
    newAction.play();
    s._animAction.crossFadeTo(newAction, 0.25, true);
  } else {
    newAction.reset().play();
  }
  s._animAction = newAction;
  s._activeClipIndex = index;
  s.markDirty?.();
}

export function disposeModel(scene, model, origMaterials, wireCache, clayMats, uvMats) {
  if (!model) return;
  const disposeMat = (mat) => {
    if (!mat) return;
    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap',
      'alphaMap', 'lightMap', 'bumpMap', 'displacementMap', 'envMap',
    ].forEach((slot) => { if (mat[slot]) mat[slot].dispose(); });
    mat.dispose();
  };

  model.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry) node.geometry.dispose();

    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach(disposeMat);

    if (clayMats?.has(node.uuid)) {
      const cm = clayMats.get(node.uuid);
      (Array.isArray(cm) ? cm : [cm]).forEach(disposeMat);
      clayMats.delete(node.uuid);
    }
    if (uvMats?.has(node.uuid)) {
      const um = uvMats.get(node.uuid);
      (Array.isArray(um) ? um : [um]).forEach(disposeMat);
      uvMats.delete(node.uuid);
    }
    if (wireCache?.has(node.uuid)) { wireCache.get(node.uuid).dispose(); wireCache.delete(node.uuid); }
    origMaterials?.delete(node.uuid);
  });
  scene.remove(model);
}

export function loadGLB(s, url, currentViewMode, autoSpin = false, wireframeOverlay = false, wireOpacity = 0.22, wireHexColor = 0xffffff, showRig = false, onRigDetected = null) {
  const { THREE, scene, placeholder } = s;
  if (!THREE) return;
  if (placeholder) placeholder.visible = false;

  if (s.model) {
    disposeModel(scene, s.model, s.origMaterials, s._wireCache, s._clayMats, s._uvMats);
    s.model = null;
    s.origMaterials.clear();
    // Clean up rig overlay
    if (s._rigOverlay) {
      scene.remove(s._rigOverlay);
      s._rigOverlay.traverse((c) => { if (c.material) c.material.dispose(); });
      s._rigOverlay = null;
    }
  }

  const handleSuccess = (object) => {
    const model = object.scene || object;

    // Filter out non-mesh objects (bones, empty nodes) before computing bounds
    // to avoid NaN bounding sphere errors from SkinnedMesh with no geometry
    model.updateMatrixWorld(true);
    const meshBox = new THREE.Box3();
    model.traverse((node) => {
      if (node.isMesh && node.geometry) {
        node.geometry.computeBoundingBox();
        if (node.geometry.boundingBox && isFinite(node.geometry.boundingBox.min.x)) {
          const nb = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
          meshBox.union(nb);
        }
      }
    });

    const size = meshBox.isEmpty() ? 0 : meshBox.getSize(new THREE.Vector3()).length();
    const scale = (size > 0 && isFinite(size)) ? 3 / size : 1;
    model.scale.setScalar(scale);

    const center = meshBox.isEmpty() ? new THREE.Vector3() : meshBox.getCenter(new THREE.Vector3());
    model.position.x = -center.x * scale;
    model.position.z = -center.z * scale;

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledMin = scaledBox.isEmpty() ? new THREE.Vector3(0, -1, 0) : scaledBox.min;
    model.position.y = -1 - scaledMin.y;

    model.traverse((n) => {
      if (n.isMesh) {
        if (n.geometry && !n.geometry.attributes.normal) n.geometry.computeVertexNormals();
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach((m) => {
          if (m?.isMeshStandardMaterial) {
            if (!m.roughnessMap) m.roughness = Math.max(m.roughness, 0.8);
            m.envMapIntensity = 0.6;
          }
        });
        s.origMaterials.set(n.uuid, n.material);
      }
    });

    scene.add(model);
    s.model = model;
    s.cam.radius = 7;
    s.cam.panX = 0; s.cam.panY = 0; s.cam.panZ = 0;
    if (s.camTarget) { s.camTarget.radius = 7; s.camTarget.panX = 0; s.camTarget.panY = 0; s.camTarget.panZ = 0; }
    syncCamera(s.camera, s.cam);

    // ── ANIMATION PLAYBACK ──────────────────────────────────────────────
    // GLTF/FBX models from Tripo's animate_retarget contain animation clips.
    // Without an AnimationMixer, the model loads but never animates.
    if (s._mixer) { s._mixer.stopAllAction(); s._mixer = null; }
    s._animClips = [];
    s._animAction = null;
    s._activeClipIndex = 0;
    const clips = object.animations || [];
    if (clips.length > 0) {
      s._animClips = clips;
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(clips[0]);
      action.play();
      s._mixer = mixer;
      s._animAction = action;
      // If the model has animations, stop auto-spin so it doesn't fight the animation
      if (!s._userSpinForced) s.autoSpin = false;
    }

    // Detect rig bones
    let boneCount = 0;
    model.traverse((node) => {
      if (node.isBone) boneCount++;
      if (node.isSkinnedMesh && node.skeleton) boneCount = Math.max(boneCount, node.skeleton.bones.length);
    });
    if (boneCount > 0 && onRigDetected) onRigDetected(boneCount);

    applyViewMode(s, currentViewMode);
    if (wireframeOverlay) applyWireframeOverlay(s, true, wireOpacity, wireHexColor);
    if (showRig) applyRigSkeletonOverlay(s, true);
    s.autoSpin = autoSpin;
    s.markDirty?.();
  };

  // Detect format by extension first
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'fbx') {
    // FBXLoader.load() is async — suppress warnings for the whole load cycle
    const _origWarn = console.warn;
    console.warn = () => { };
    const restoreWarn = () => { console.warn = _origWarn; };
    new FBXLoader().load(url, (object) => { restoreWarn(); handleSuccess(object); }, undefined, (err) => { restoreWarn(); console.error("Model load error:", err); });
    return;
  }
  if (['glb', 'gltf'].includes(ext)) {
    new GLTFLoader().load(url, handleSuccess, undefined, (err) => console.error("Model load error:", err));
    return;
  }

  // Unknown extension or no extension (e.g. API URL) — fetch & sniff magic bytes
  fetch(url)
    .then((res) => res.arrayBuffer())
    .then((buffer) => {
      const header = new Uint8Array(buffer, 0, Math.min(20, buffer.byteLength));
      const headerStr = String.fromCharCode(...header);
      const isFBX = headerStr.startsWith('Kaydara');
      // glTF binary starts with "glTF" magic at byte 0
      // const isGLB = headerStr.startsWith('glTF');

      if (isFBX) {
        const _origWarn = console.warn;
        console.warn = () => { };
        let object;
        try {
          const loader = new FBXLoader();
          object = loader.parse(buffer, '');
        } finally {
          console.warn = _origWarn;
        }
        handleSuccess(object);
      } else {
        // Default to GLTF
        const loader = new GLTFLoader();
        loader.parse(buffer, '', handleSuccess, (err) => console.error("Model load error:", err));
      }
    })
    .catch((err) => console.error("Model fetch error:", err));
}

export function setCameraPreset(s, preset) {
  if (!s) return;
  s.autoSpin = false;
  const t = s.camTarget ?? s.cam;
  if (preset === "reset") { t.theta = 0.4; t.phi = Math.PI / 3; t.panX = 0; t.panY = 0; t.panZ = 0; }
  if (preset === "front") { t.theta = 0; t.phi = Math.PI / 2; }
  if (preset === "side") { t.theta = Math.PI / 2; t.phi = Math.PI / 2; }
  if (preset === "top") { t.theta = 0; t.phi = 0.05; }
  s.markDirty?.();
}

export function applyExponentialZoom(camTarget, deltaY, min = 0.5, max = 30) {
  const factor = deltaY > 0 ? 1.12 : 1 / 1.12;
  camTarget.radius = Math.max(min, Math.min(max, camTarget.radius * factor));
}

export function focusOnHit(s, ndcX, ndcY) {
  if (!s?.raycaster || !s.camera || !s.scene) return false;

  const mouse = new THREE.Vector2(ndcX, ndcY);
  s.raycaster.setFromCamera(mouse, s.camera);

  const targets = [];
  const root = s.model || s.placeholder;
  if (!root) return false;
  root.traverse(node => {
    if (node.isMesh && !node.userData.isGround && !node.userData.isWireframeOverlay
        && !node.userData.isRigOverlay && !node.userData.isPaintOverlay) {
      targets.push(node);
    }
  });
  if (targets.length === 0) return false;

  const intersects = s.raycaster.intersectObjects(targets, false);
  if (intersects.length === 0) return false;

  const hit = intersects[0].point;
  s.camTarget.panX = hit.x;
  s.camTarget.panY = hit.y;
  s.camTarget.panZ = hit.z;

  const distToHit = s.camera.position.distanceTo(hit);
  s.camTarget.radius = Math.max(0.5, Math.min(30, distToHit * 0.6));

  s.markDirty?.();
  return true;
}

// ── modelHasTextures ────────────────────────────────────────────────────────
// Returns true if any mesh material has a diffuse/albedo map. Used to verify
// that a model loaded from archive actually has textures (not the base/clay
// variant saved before the pbr_model priority fix).
export function modelHasTextures(model) {
  if (!model) return false;
  let texturedCount = 0;
  let meshCount = 0;
  model.traverse((node) => {
    if (!node.isMesh) return;
    meshCount++;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((m) => { if (m?.map) texturedCount++; });
  });
  return meshCount > 0 && texturedCount > 0;
}