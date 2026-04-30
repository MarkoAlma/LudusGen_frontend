import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export const hexToInt = (h) => (h ? parseInt(h.replace("#", ""), 16) : null);

function textureHasImageData(texture) {
  const image = texture?.image;
  if (!image) return false;
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) return image.width > 0 && image.height > 0;
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) return image.width > 0 && image.height > 0;
  if (typeof HTMLVideoElement !== 'undefined' && image instanceof HTMLVideoElement) return image.readyState >= 2;
  return Boolean(image.width || image.videoWidth || image.data);
}

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

function normalizeMaterialTextureColorSpaces(THREE, material) {
  if (!THREE || !material) return;

  ['map', 'emissiveMap'].forEach((slot) => {
    const texture = material[slot];
    if (texture?.isTexture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      if (textureHasImageData(texture)) texture.needsUpdate = true;
    }
  });

  ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'displacementMap'].forEach((slot) => {
    const texture = material[slot];
    if (texture?.isTexture) {
      texture.colorSpace = THREE.NoColorSpace;
      if (textureHasImageData(texture)) texture.needsUpdate = true;
    }
  });
}

function getPreservedBaseColorFactor(material, THREE) {
  const preserved = material?.userData?.originalBaseColorFactor;
  if (preserved?.isColor) return preserved;
  return material?.color ?? new THREE.Color(0xe0dbd5);
}

function cloneSegmentMaterial(THREE, _originalMaterial, tintColor) {
  // Upgraded to MeshPhysicalMaterial for a premium glass effect with transmission.
  // We force emissive to black and use a lower opacity to avoid the 'white silhouette' issue.
  const segmentMaterial = new THREE.MeshPhysicalMaterial({
    color: tintColor,
    emissive: tintColor,
    emissiveIntensity: 0.25, // Boosted for more vibrant "pop"
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.4,
    thickness: 1.0,
    ior: 1.45,
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.55, // Increased for stronger visibility
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  segmentMaterial.toneMapped = true;
  segmentMaterial.needsUpdate = true;

  return segmentMaterial;
}

export function applyLights(s, mode, color, strength = 1, rotation = 0, dramaticColor = null, viewMode = "normal", elevation = 45) {
  const { THREE, lightGroup } = s;
  if (!THREE) return;
  const toRemove = lightGroup.children.filter((c) => !c.userData.isBackLight);
  toRemove.forEach((c) => lightGroup.remove(c));

  if (viewMode === 'uv') {
    lightGroup.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 0.4);
    sun.position.set(5, 10, 7);
    lightGroup.add(sun);
    lightGroup.rotation.y = 0; lightGroup.rotation.x = 0;
    s.markDirty?.();
    return;
  }

  if (viewMode === 'clay') {
    lightGroup.add(new THREE.HemisphereLight(0xc8c0b8, 0x302820, 0.18));
    const key = new THREE.DirectionalLight(0xb8b8b8, 0.9);
    key.position.set(5, 9, 6); key.castShadow = true; lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xa0a8b0, 0.2);
    fill.position.set(-6, 3, 2); lightGroup.add(fill);
    const back = new THREE.DirectionalLight(0x909090, 0.1);
    back.position.set(0, 2, -7); lightGroup.add(back);
    lightGroup.rotation.y = (rotation * Math.PI) / 180;
    lightGroup.rotation.x = ((elevation - 45) * Math.PI) / 180;
    s.markDirty?.(); return;
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
  lightGroup.rotation.x = ((elevation - 45) * Math.PI) / 180;
  s.markDirty?.();
}

// ── applyViewMode ─────────────────────────────────────────────────────────────
// FIX 1: Single traverse — ground pass merged in (was two separate traversals)
// FIX 2: Per-mesh material cache (_clayMats / _uvMats) to avoid recreating GPU
//         objects on every mode switch — previously all these materials leaked.
export function applyViewMode(s, mode) {
  const { THREE, scene, origMaterials } = s;
  if (!THREE) return;
  s._currentViewMode = mode;

  if (!s._clayMats) s._clayMats = new Map();
  if (!s._uvMats) s._uvMats = new Map();
  if (!s._segmentMats) s._segmentMats = new Map();

  scene.traverse((node) => {
    // Ground: merged here — no second traverse needed
    if (node.userData.isGround) { node.receiveShadow = true; return; }
    if (!node.isMesh || node.userData.isBgLight) return;

    const orig = origMaterials.get(node.uuid);
    if (!orig) return; // Should have been set in loadGLB
    node.castShadow = true;

    if (mode === 'clay') {
      if (!s._clayMats.has(node.uuid)) {
        if (node.geometry && !node.geometry.attributes.normal) node.geometry.computeVertexNormals();
        const buildClay = () => new THREE.MeshStandardMaterial({
          color: 0xcccccc, // Lighter, more neutral clay gray
          metalness: 0,
          roughness: 1.0, // Perfectly matte
          envMapIntensity: 0.1, // Minimal reflections
          side: THREE.DoubleSide,
          vertexColors: false, // Force off vertex colors for pure clay look
        });
        s._clayMats.set(node.uuid, Array.isArray(orig) ? orig.map(() => buildClay()) : buildClay());
      }
      node.material = s._clayMats.get(node.uuid);

    } else if (mode === 'normal') {
      node.material = orig;

    } else if (mode === 'uv') {
      if (!s._uvMats.has(node.uuid)) {
        const buildBaseColor = (m) => {
          const map = m?.map ?? null;
          if (map) {
            map.colorSpace = THREE.SRGBColorSpace;
            if (textureHasImageData(map)) map.needsUpdate = true;
          }
          const alphaMap = m?.alphaMap ?? null;
          if (alphaMap && textureHasImageData(alphaMap)) alphaMap.needsUpdate = true;
          return new THREE.MeshBasicMaterial({
            map,
            color: getPreservedBaseColorFactor(m, THREE),
            side: THREE.DoubleSide,
            transparent: m?.transparent ?? false,
            opacity: m?.opacity ?? 1,
            alphaTest: m?.alphaTest ?? 0,
            alphaMap,
            depthWrite: m?.depthWrite ?? true,
            vertexColors: m?.vertexColors ?? false,
            toneMapped: false,
          });
        };
        s._uvMats.set(node.uuid, Array.isArray(orig) ? orig.map(m => buildBaseColor(m)) : buildBaseColor(orig));
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

export function disposeModel(scene, model, origMaterials, wireCache, clayMats, uvMats, segmentMats, segEdgeCache) {
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
    if (segmentMats?.has(node.uuid)) {
      const sm = segmentMats.get(node.uuid);
      (Array.isArray(sm) ? sm : [sm]).forEach(disposeMat);
      segmentMats.delete(node.uuid);
    }
    if (segEdgeCache?.has(node.uuid)) {
      segEdgeCache.get(node.uuid)?.dispose?.();
      segEdgeCache.delete(node.uuid);
    }
    if (wireCache?.has(node.uuid)) { wireCache.get(node.uuid).dispose(); wireCache.delete(node.uuid); }
    origMaterials?.delete(node.uuid);
  });
  scene.remove(model);
}

function clearCurrentModel(s) {
  if (!s?.scene) return;
  if (s.model) {
    disposeModel(s.scene, s.model, s.origMaterials, s._wireCache, s._clayMats, s._uvMats, s._segmentMats, s._segEdgeCache);
    s.model = null;
    s._segmentMeshes = null;
    s.origMaterials.clear();
    s._segOrigMats?.clear();
    s._segEdgeCache?.clear();
    s._segmentMats?.clear();
  }
  if (s._rigOverlay) {
    s.scene.remove(s._rigOverlay);
    s._rigOverlay.traverse((c) => { if (c.material) c.material.dispose(); });
    s._rigOverlay = null;
  }
  if (s._mixer) {
    s._mixer.stopAllAction();
    s._mixer = null;
  }
  s._animClips = [];
  s._animAction = null;
  s._activeClipIndex = 0;
}

function getModelExtension(url = '') {
  const withoutQuery = String(url || '').split('?')[0];
  const fragment = withoutQuery.includes('#') ? withoutQuery.split('#').pop() : '';
  const source = fragment && fragment.includes('.') ? fragment : withoutQuery.split('#')[0];
  const lastSegment = source.split('/').pop() || '';
  return lastSegment.includes('.') ? lastSegment.split('.').pop().toLowerCase() : '';
}

function getFetchableModelUrl(url = '') {
  return String(url || '').split('#')[0];
}

function createStlMesh(THREE, geometry) {
  if (geometry && !geometry.attributes.normal) geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: 0xb8c7dc,
    metalness: 0.02,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'STL Model';
  return mesh;
}

function isBinaryStl(buffer) {
  if (!buffer || buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const faces = view.getUint32(80, true);
  return 84 + faces * 50 === buffer.byteLength;
}

function looksLikeObj(text = '') {
  return /(^|\n)\s*(o|g|v|vn|vt|f|mtllib|usemtl)\s+/m.test(text);
}

function looksLikeAsciiStl(text = '') {
  const trimmed = text.trimStart();
  return trimmed.startsWith('solid') && /\bfacet\s+normal\b/i.test(trimmed);
}

export function loadGLB(s, url, currentViewMode, autoSpin = false, wireframeOverlay = false, wireOpacity = 0.22, wireHexColor = 0xffffff, showRig = false, onRigDetected = null, segmentHighlight = false, segmentEdgeColor = 0x00ff88, onModelLoaded = null, onModelError = null) {
  const { THREE, scene, placeholder } = s;
  if (!THREE) return;
  if (placeholder) placeholder.visible = !s.model;

  // Cancel any in-flight load — stale handleSuccess will no-op
  if (s._loadToken) s._loadToken.cancelled = true;
  const token = { cancelled: false };
  s._loadToken = token;

  const handleSuccess = (object) => {
    const model = object.scene || object;
    if (token.cancelled) {
      disposeModel(scene, model, new Map(), new Map(), new Map(), new Map(), new Map(), new Map());
      return;
    }

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

    const segmentMeshes = [];
    const nextOrigMaterials = new Map();
    model.traverse((n) => {
      if (n.isMesh) {
        segmentMeshes.push(n);
        if (n.geometry && !n.geometry.attributes.normal) n.geometry.computeVertexNormals();

        // FBX often comes with Phong/Lambert materials which lack PBR features
        // or have black base color. We convert them to Standard for consistent PBR look.
        const sanitizeMat = (m) => {
          if (!m) return m;
          let sm = m;
          if (!m.isMeshStandardMaterial) {
            sm = new THREE.MeshStandardMaterial();
            // Copy basic maps - FBXLoader sometimes puts diffuse in 'map'
            const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap'];
            maps.forEach(mapName => {
              if (m[mapName]) {
                sm[mapName] = m[mapName];
              }
            });
            sm.color.copy(m.color || new THREE.Color(0xffffff));
            if (m.emissive && sm.emissive) sm.emissive.copy(m.emissive);
            if (m.normalScale && sm.normalScale) sm.normalScale.copy(m.normalScale);
            // FORCE OPAQUE: Tripo FBX/GLB often accidentally sets alphaMode: BLEND 
            // even for solid skin, causing 'ghostly' artifacts. 
            sm.opacity = 1.0;
            sm.transparent = false;
            sm.depthWrite = true;
            sm.side = THREE.DoubleSide;
          }

          // FIX: Tripo FBX/GLB often has a base color tint that interferes with the texture.
          // We force it to white if a map is present to ensure true RGB rendering.
          if (sm.map) {
            if (!sm.userData.originalBaseColorFactor?.isColor) {
              sm.userData.originalBaseColorFactor = sm.color.clone();
            }
            sm.color.set(0xffffff);
          }

          normalizeMaterialTextureColorSpaces(THREE, sm);

          // PBR polish
          if (!sm.roughnessMap) sm.roughness = Math.max(sm.roughness || 0, 0.5);
          sm.envMapIntensity = 1.0;
          // Ensure transparency is OFF for base models unless explicitly required
          if (!sm.alphaMap && sm.opacity > 0.9) {
            sm.transparent = false;
            sm.depthWrite = true;
          }
          return sm;
        };

        if (Array.isArray(n.material)) {
          n.material = n.material.map(sanitizeMat);
        } else {
          n.material = sanitizeMat(n.material);
        }
        nextOrigMaterials.set(n.uuid, n.material);
      }
    });

    clearCurrentModel(s);
    s._segmentMeshes = segmentMeshes;
    s.origMaterials.clear();
    nextOrigMaterials.forEach((mat, uuid) => s.origMaterials.set(uuid, mat));
    if (placeholder) placeholder.visible = false;
    scene.add(model);
    s.model = model;
    s.cam.radius = 7;
    s.cam.panX = 0; s.cam.panY = 0; s.cam.panZ = 0;
    if (s.camTarget) { s.camTarget.radius = 7; s.camTarget.panX = 0; s.camTarget.panY = 0; s.camTarget.panZ = 0; }
    s._defaultCam = { theta: s.cam.theta, phi: s.cam.phi, radius: 7, panX: 0, panY: 0, panZ: 0 };
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
    const _segHL = currentViewMode === 'segment' || segmentHighlight || s._segmentHighlight;
    const _segEC = segmentEdgeColor ?? s._segmentEdgeColor ?? 0x00ff88;
    if (_segHL) applySegmentHighlight(s, true, _segEC, { async: true, batchSize: 2, edgeBatchSize: 1, frameBudget: 5 });
    s.autoSpin = autoSpin;
    onModelLoaded?.(model);
    s.markDirty?.();
  };

  const handleError = (err) => {
    if (token.cancelled) return;
    console.error("Model load error:", err);
    onModelError?.(err);
    s.markDirty?.();
  };

  // Detect format by extension first
  const ext = getModelExtension(url);
  const fetchUrl = getFetchableModelUrl(url);
  if (ext === 'fbx') {
    // FBXLoader.load() is async — suppress warnings for the whole load cycle
    const _origWarn = console.warn;
    console.warn = () => { };
    const restoreWarn = () => { console.warn = _origWarn; };
    new FBXLoader().load(fetchUrl, (object) => { restoreWarn(); handleSuccess(object); }, undefined, (err) => { restoreWarn(); handleError(err); });
    return;
  }
  if (['glb', 'gltf'].includes(ext)) {
    new GLTFLoader().load(fetchUrl, handleSuccess, undefined, handleError);
    return;
  }
  if (ext === 'obj') {
    new OBJLoader().load(fetchUrl, handleSuccess, undefined, handleError);
    return;
  }
  if (ext === 'stl') {
    new STLLoader().load(fetchUrl, (geometry) => handleSuccess(createStlMesh(THREE, geometry)), undefined, handleError);
    return;
  }

  // Unknown extension or no extension (e.g. API URL) — fetch & sniff magic bytes
  fetch(fetchUrl)
    .then((res) => res.arrayBuffer())
    .then((buffer) => {
      const header = new Uint8Array(buffer, 0, Math.min(20, buffer.byteLength));
      const headerStr = String.fromCharCode(...header);
      const isFBX = headerStr.startsWith('Kaydara');
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, Math.min(buffer.byteLength, 4096)));
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
      } else if (isBinaryStl(buffer) || looksLikeAsciiStl(text)) {
        const loader = new STLLoader();
        handleSuccess(createStlMesh(THREE, loader.parse(buffer)));
      } else if (looksLikeObj(text)) {
        const loader = new OBJLoader();
        const fullText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        handleSuccess(loader.parse(fullText));
      } else {
        // Default to GLTF
        const loader = new GLTFLoader();
        loader.parse(buffer, '', handleSuccess, handleError);
      }
    })
    .catch(handleError);
}

export function applySegmentHighlight(s, show, edgeColor = 0x00ff88, options = {}) {
  if (!s?.scene) return;
  const { async = false, onComplete = null, batchSize = 8, edgeBatchSize = 2, frameBudget = 6 } = options;

  const root = s.model || s.placeholder;
  if (!root) return;

  if (s._segmentBuildToken) {
    s._segmentBuildToken.cancelled = true;
    s._segmentBuildToken.cancelScheduled?.();
    s._segmentBuildToken = null;
  }

  // Remove any existing segment edges
  root.traverse((node) => {
    if (node.userData.isSegEdge) {
      node.parent?.remove(node);
      node.geometry?.dispose();
      if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
      else node.material?.dispose();
    }
  });

  if (!show) {
    // Restore the materials based on the current view mode (Clay, UV, or Normal)
    // instead of always forcing the original textured materials.
    const currentMode = s._currentViewMode || 'normal';
    applyViewMode(s, currentMode);
    onComplete?.();
    return;
  }

  const meshes = Array.isArray(s._segmentMeshes)
    ? s._segmentMeshes.filter((node) =>
      node?.isMesh &&
      node.geometry &&
      node.parent &&
      !node.userData.isGround &&
      !node.userData.isBgLight &&
      !node.userData.isWireframeOverlay &&
      !node.userData.isRigOverlay &&
      !node.userData.isPaintOverlay &&
      !node.userData.isSegEdge
    )
    : [];

  if (meshes.length === 0) {
    root.traverse((node) => {
      if (
        node.isMesh &&
        !node.userData.isGround &&
        !node.userData.isBgLight &&
        !node.userData.isWireframeOverlay &&
        !node.userData.isRigOverlay &&
        !node.userData.isPaintOverlay &&
        !node.userData.isSegEdge
      ) meshes.push(node);
    });
  }

  if (!s._segmentMats) s._segmentMats = new Map();

  const getSegmentTint = (mesh, index = 0) => {
    // We combine the name and the index to ensure unique colors even if names are identical.
    const name = (mesh.name || 'segment').toLowerCase().replace(/(_l|_r|left|right)$/, '');
    let hash = index; // Start with index to differentiate identical names
    for (let j = 0; j < name.length; j++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(j);
      hash |= 0;
    }
    const hue = Math.abs(hash % 360) / 360;
    return new THREE.Color().setHSL(hue, 0.8, 0.62);
  };

  const applyMaterialToMesh = (mesh, index = 0) => {
    // Tripo models often group many segments into a single mesh with multiple material slots
    // or multiple geometry groups. We must ensure each part gets its own color.

    // If the mesh has multiple geometry groups but only one material, 
    // expand it to a material array so each group can have a unique color.
    if (!Array.isArray(mesh.material) && mesh.geometry?.groups?.length > 1) {
      mesh.material = new Array(mesh.geometry.groups.length).fill(mesh.material);
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((oldMat, matIdx) => {
        // Use a composite index for sub-materials to ensure unique tints
        const tint = getSegmentTint(mesh, index + (matIdx + 1) * 1000);
        return cloneSegmentMaterial(THREE, oldMat, tint);
      });
    } else {
      let segMat = s._segmentMats.get(mesh.uuid);
      if (!segMat) {
        const tint = getSegmentTint(mesh, index);
        segMat = cloneSegmentMaterial(THREE, mesh.material, tint);
        s._segmentMats.set(mesh.uuid, segMat);
      }
      mesh.material = segMat;
    }
  };

  const attachEdgesToMesh = (mesh) => {
    // Using the pure edgeColor for a stronger, more saturated look (less white)
    const wireColor = new THREE.Color(edgeColor);
    let edges = s._segEdgeCache?.get(mesh.uuid);
    if (!edges) {
      edges = new THREE.EdgesGeometry(mesh.geometry, 15); // 15-degree threshold for clean lines
      s._segEdgeCache?.set(mesh.uuid, edges);
    }
    const lineMat = new THREE.LineBasicMaterial({
      color: wireColor,
      linewidth: 1,
      transparent: true,
      opacity: 0.35, // Reduced for a more subtle, paler look
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const lines = new THREE.LineSegments(edges, lineMat);
    lines.userData.isSegEdge = true;
    lines.renderOrder = 4;
    mesh.add(lines);
  };

  const scheduleSegmentChunk = (token, cb) => {
    let rafId = null;
    let timeoutId = null;
    let idleId = null;
    const run = () => { rafId = requestAnimationFrame(cb); };

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(run, { timeout: 48 });
    } else {
      timeoutId = setTimeout(run, 0);
    }

    token.cancelScheduled = () => {
      if (idleId != null && typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
      if (rafId != null) cancelAnimationFrame(rafId);
      token.cancelScheduled = null;
    };
  };

  if (async) {
    const token = { cancelled: false, cancelScheduled: null };
    s._segmentBuildToken = token;
    let materialIndex = 0;
    let edgeIndex = 0;

    const runBatch = () => {
      if (token.cancelled) return;
      token.cancelScheduled = null;

      if (materialIndex < meshes.length) {
        const start = performance.now();
        let processed = 0;
        while (
          materialIndex < meshes.length &&
          processed < batchSize &&
          (processed === 0 || (performance.now() - start) < frameBudget)
        ) {
          applyMaterialToMesh(meshes[materialIndex], materialIndex);
          materialIndex += 1;
          processed += 1;
        }
        s.markDirty?.();
        if (materialIndex < meshes.length) {
          scheduleSegmentChunk(token, runBatch);
          return;
        }
      }

      if (edgeIndex < meshes.length) {
        const start = performance.now();
        let processed = 0;
        while (
          edgeIndex < meshes.length &&
          processed < edgeBatchSize &&
          (processed === 0 || (performance.now() - start) < Math.max(3, frameBudget - 1))
        ) {
          attachEdgesToMesh(meshes[edgeIndex]);
          edgeIndex += 1;
          processed += 1;
        }
        s.markDirty?.();
        if (edgeIndex < meshes.length) {
          scheduleSegmentChunk(token, runBatch);
          return;
        }
      }

      s._segmentBuildToken = null;
      onComplete?.();
    };
    scheduleSegmentChunk(token, runBatch);
    return;
  }

  meshes.forEach((mesh, idx) => {
    applyMaterialToMesh(mesh, idx);
    attachEdgesToMesh(mesh);
  });

  s.markDirty?.();
  onComplete?.();
}

export function setCameraPreset(s, preset) {
  if (!s) return;
  s.autoSpin = false;
  const t = s.camTarget ?? s.cam;
  if (preset === "reset") {
    const base = s._defaultCam ?? { theta: 0.4, phi: Math.PI / 3, radius: 8, panX: 0, panY: 0, panZ: 0 };
    t.theta = base.theta;
    t.phi = base.phi;
    t.radius = base.radius;
    t.panX = base.panX;
    t.panY = base.panY;
    t.panZ = base.panZ;
  }
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

export function modelHasUvOverlapSuspicion(model) {
  if (!model) return false;

  model.updateMatrixWorld?.(true);

  const bounds = new THREE.Box3().setFromObject(model);
  const modelDiagonal = bounds.isEmpty() ? 1 : bounds.getSize(new THREE.Vector3()).length();
  const minDistanceSq = Math.pow(Math.max(0.08, modelDiagonal * 0.045), 2);
  const samePointSq = Math.pow(Math.max(0.01, modelDiagonal * 0.0025), 2);
  const uvBuckets = new Map();
  let checkedVertices = 0;

  model.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const pos = node.geometry.attributes?.position;
    const uv = node.geometry.attributes?.uv;
    if (!pos || !uv) return;

    const sampleStep = Math.max(1, Math.floor(pos.count / 6000));
    const limit = Math.min(pos.count, uv.count ?? pos.count);
    for (let i = 0; i < limit; i += sampleStep) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue;

      const inPrimaryRange = u >= 0 && u <= 1 && v >= 0 && v <= 1;
      if (inPrimaryRange && (u <= 0.002 || u >= 0.998 || v <= 0.002 || v >= 0.998)) {
        continue;
      }

      const key = `${Math.round(u * 4096)}:${Math.round(v * 4096)}`;
      const worldPos = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(node.matrixWorld);
      const prev = uvBuckets.get(key);
      checkedVertices++;

      if (!prev) {
        uvBuckets.set(key, { positions: [worldPos], suspicious: false });
        continue;
      }

      if (prev.positions.some((point) => point.distanceToSquared(worldPos) <= samePointSq)) {
        continue;
      }

      if (prev.positions.some((point) => point.distanceToSquared(worldPos) >= minDistanceSq)) {
        prev.suspicious = true;
      }

      if (prev.positions.length < 6) {
        prev.positions.push(worldPos);
      }
    }
  });

  if (checkedVertices < 800 || uvBuckets.size < 200) return false;

  const suspiciousBuckets = [...uvBuckets.values()].filter((bucket) => bucket.suspicious).length;
  const suspiciousRatio = suspiciousBuckets / uvBuckets.size;
  return suspiciousBuckets >= 96 && suspiciousRatio > 0.025;
}
