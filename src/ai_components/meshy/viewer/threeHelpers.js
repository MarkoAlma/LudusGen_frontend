// viewer/threeHelpers.js — Three.js utility functions

export function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export const hexToInt = (h) => h ? parseInt(h.replace('#', ''), 16) : null;

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
  m.castShadow = true;
  m.userData.isPlaceholder = true;
  return m;
}

/**
 * Apply lights to the lightGroup.
 * @param {object} s      — scene ref object
 * @param {string} mode   — 'studio' | 'outdoor' | 'dramatic'
 * @param {string} color  — hex accent color
 * @param {number} strength — multiplier 0.1–3.0 (default 1.0)
 * @param {number} rotation — degrees 0–360 (applied to lightGroup.rotation.y)
 */
export function applyLights(s, mode, color, strength = 1, rotation = 0) {
  const { THREE, lightGroup } = s;
  if (!THREE) return;
  while (lightGroup.children.length) lightGroup.remove(lightGroup.children[0]);

  const k = strength; // intensity multiplier

  if (mode === 'studio') {
    lightGroup.add(Object.assign(new THREE.AmbientLight(0xffffff, 0.4 * k)));
    const key = new THREE.DirectionalLight(0xffffff, 1.4 * k);
    key.position.set(4, 6, 4); key.castShadow = true;
    lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.5 * k);
    fill.position.set(-4, 2, -2); lightGroup.add(fill);
    const rim = new THREE.DirectionalLight(hexToInt(color) || 0x7c3aed, 0.6 * k);
    rim.position.set(-2, -1, -5); lightGroup.add(rim);
  } else if (mode === 'outdoor') {
    lightGroup.add(new THREE.HemisphereLight(0x87ceeb, 0x3a3020, 0.9 * k));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6 * k);
    sun.position.set(8, 12, 6); sun.castShadow = true;
    lightGroup.add(sun);
  } else if (mode === 'dramatic') {
    lightGroup.add(new THREE.AmbientLight(0x111133, 0.15 * k));
    const spot = new THREE.SpotLight(0xffffff, 2.5 * k, 30, Math.PI / 8, 0.3);
    spot.position.set(0, 8, 3); spot.castShadow = true;
    lightGroup.add(spot);
    const back = new THREE.DirectionalLight(hexToInt(color) || 0x4400ff, 0.8 * k);
    back.position.set(-5, -2, -5); lightGroup.add(back);
  }

  // Apply static rotation offset
  lightGroup.rotation.y = (rotation * Math.PI) / 180;
}

export function applyViewMode(s, mode) {
  const { THREE, scene, origMaterials } = s;
  if (!THREE) return;
  scene.traverse((node) => {
    if (!node.isMesh || node.userData.isPlaceholder) return;
    if (!origMaterials.has(node.uuid)) origMaterials.set(node.uuid, node.material);
    const orig = origMaterials.get(node.uuid);
    if (mode === 'solid') {
      node.material = orig;
      node.material.wireframe = false;
    } else if (mode === 'wireframe') {
      node.material = new THREE.MeshBasicMaterial({ color: 0x00ccff, wireframe: true });
    } else if (mode === 'clay') {
      node.material = new THREE.MeshStandardMaterial({ color: 0xc8a882, metalness: 0, roughness: 0.85 });
    } else if (mode === 'normal') {
      node.material = new THREE.MeshNormalMaterial();
    } else if (mode === 'uv') {
      node.material = new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'varying vec2 vUv; void main(){ gl_FragColor=vec4(vUv.x, vUv.y, 0.5, 1.0); }',
      });
    }
  });
}

export function loadGLB(s, url, currentViewMode) {
  const { THREE, scene, placeholder } = s;
  if (!THREE?.GLTFLoader) return;
  if (placeholder?.parent) scene.remove(placeholder);
  if (s.model) { scene.remove(s.model); s.model = null; s.origMaterials.clear(); }
  const loader = new THREE.GLTFLoader();
  loader.load(url, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const scale = 3 / size;
    model.position.sub(center.multiplyScalar(scale));
    model.scale.setScalar(scale);
    model.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    scene.add(model);
    s.model = model;
    s.cam.radius = 3.5; s.cam.panY = 0;
    syncCamera(s.camera, s.cam);
    applyViewMode(s, currentViewMode);
  }, undefined, (err) => console.error('GLB load error:', err));
}

export function setCameraPreset(s, preset) {
  if (!s) return;
  s.autoSpin = false;
  if (preset === 'reset') { s.cam.theta = 0.4; s.cam.phi = Math.PI / 3; s.cam.panX = 0; s.cam.panY = 0; }
  if (preset === 'front') { s.cam.theta = 0; s.cam.phi = Math.PI / 2; }
  if (preset === 'side')  { s.cam.theta = Math.PI / 2; s.cam.phi = Math.PI / 2; }
  if (preset === 'top')   { s.cam.theta = 0; s.cam.phi = 0.05; }
  syncCamera(s.camera, s.cam);
}