import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export const hexToInt = (h) => (h ? parseInt(h.replace("#", ""), 16) : null);

export function syncCamera(camera, c) {
  camera.position.set(
    c.panX + c.radius * Math.sin(c.phi) * Math.sin(c.theta),
    c.panY + c.radius * Math.cos(c.phi),
    c.radius * Math.sin(c.phi) * Math.cos(c.theta),
  );
  camera.lookAt(c.panX, c.panY, 0);
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
    lightGroup.add(new THREE.AmbientLight(0xffffff, 0.4 * k));
    const key = new THREE.DirectionalLight(0xffffff, 1.4 * k);
    key.position.set(4, 6, 4); key.castShadow = true; lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.5 * k);
    fill.position.set(-4, 2, -2); lightGroup.add(fill);
    const rim = new THREE.DirectionalLight(hexToInt(color) || 0x7c3aed, 0.6 * k);
    rim.position.set(-2, -1, -5); lightGroup.add(rim);
  } else if (mode === "outdoor") {
    lightGroup.add(new THREE.HemisphereLight(0x87ceeb, 0x3a3020, 0.9 * k));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6 * k);
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
          if (map) { map.encoding = THREE.sRGBEncoding; map.needsUpdate = true; }
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

// ── disposeModel ──────────────────────────────────────────────────────────────
// FIX: now also disposes cached clay + uv materials (previously leaked on every model switch)
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

export function loadGLB(s, url, currentViewMode, autoSpin = false, wireframeOverlay = false, wireOpacity = 0.22, wireHexColor = 0xffffff) {
  const { THREE, scene, placeholder } = s;
  if (!THREE) return;
  if (placeholder) placeholder.visible = false;

  if (s.model) {
    disposeModel(scene, s.model, s.origMaterials, s._wireCache, s._clayMats, s._uvMats);
    s.model = null;
    s.origMaterials.clear();
  }

  const handleSuccess = (object) => {
    const model = object.scene || object;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length();
    const scale = 3 / size;
    model.scale.setScalar(scale);

    const center = box.getCenter(new THREE.Vector3());
    model.position.x = -center.x * scale;
    model.position.z = -center.z * scale;

    const scaledBox = new THREE.Box3().setFromObject(model);
    model.position.y = -1 - scaledBox.min.y;

    model.traverse((n) => {
      if (n.isMesh) {
        if (n.geometry && !n.geometry.attributes.normal) n.geometry.computeVertexNormals();
        s.origMaterials.set(n.uuid, n.material);
      }
    });

    scene.add(model);
    s.model = model;
    s.cam.radius = 5;
    s.cam.panY = 0;
    syncCamera(s.camera, s.cam);

    applyViewMode(s, currentViewMode);
    if (wireframeOverlay) applyWireframeOverlay(s, true, wireOpacity, wireHexColor);
    s.autoSpin = autoSpin;
    s.markDirty?.();
  };

  // Detect format by extension first
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'fbx') {
    new FBXLoader().load(url, handleSuccess, undefined, (err) => console.error("Model load error:", err));
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
        const loader = new FBXLoader();
        const object = loader.parse(buffer, '');
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
  if (preset === "reset") { s.cam.theta = 0.4; s.cam.phi = Math.PI / 3; s.cam.panX = 0; s.cam.panY = 0; }
  if (preset === "front") { s.cam.theta = 0; s.cam.phi = Math.PI / 2; }
  if (preset === "side") { s.cam.theta = Math.PI / 2; s.cam.phi = Math.PI / 2; }
  if (preset === "top") { s.cam.theta = 0; s.cam.phi = 0.05; }
  syncCamera(s.camera, s.cam);
  s.markDirty?.();
}