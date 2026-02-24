// viewer/threeHelpers.js — Three.js utility functions

export function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      res();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

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
    color: hexToInt(color) || 0x7c3aed,
    metalness: 0.4,
    roughness: 0.3,
  });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.userData.isPlaceholder = true;
  geo.computeBoundingBox();
  m.position.y = -1 - geo.boundingBox.min.y;
  return m;
}

export function createSunLight(THREE, scene) {
  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 9000000;
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8;
  sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.001;

  scene.add(sun.target);
  scene.add(sun);

  sun.position.set(2000000, 4000000, 2000000);
  sun.target.position.set(0, 0, 0);

  sun.updateMatrix();
  sun.updateMatrixWorld(true);
  sun.target.updateMatrix();
  sun.target.updateMatrixWorld(true);

  sun.matrixAutoUpdate = false;
  sun.matrixWorldNeedsUpdate = false;
  if ("matrixWorldAutoUpdate" in sun) sun.matrixWorldAutoUpdate = false;

  sun.target.matrixAutoUpdate = false;
  sun.target.matrixWorldNeedsUpdate = false;
  if ("matrixWorldAutoUpdate" in sun.target)
    sun.target.matrixWorldAutoUpdate = false;

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
    black: 0x000000,
    darkgray: 0x111118,
    white: 0xffffff,
  };
  const val = COLORS[bgColor] ?? null;
  if (val === null) {
    scene.background = null;
    renderer.setClearAlpha(0);
  } else {
    scene.background = new THREE.Color(val);
    renderer.setClearAlpha(1);
  }
}

export function setGridColor(s, c1, c2) {
  const { grid } = s;
  if (!grid) return;
  if (Array.isArray(grid.material)) {
    grid.material[0].color.setHex(c1);
    grid.material[1].color.setHex(c2);
  } else {
    grid.material.color.setHex(c1);
  }
}

export function applyLights(
  s,
  mode,
  color,
  strength = 1,
  rotation = 0,
  dramaticColor = null,
  viewMode = "normal",
) {
  const { THREE, lightGroup } = s;
  if (!THREE) return;

  const toRemove = lightGroup.children.filter((c) => !c.userData.isBackLight);
  toRemove.forEach((c) => lightGroup.remove(c));

  // ── UV / Base Color: MeshBasicMaterial ignores lights — keep scene clean
  if (viewMode === 'uv') {
    lightGroup.rotation.y = 0;
    return;
  }

  // ── Clay: soft even studio lighting — form reads from the matte material, not harsh shadows
  if (viewMode === 'clay') {
    lightGroup.add(new THREE.HemisphereLight(0xe8dccf, 0x1a1310, 0.04)); // warm sky / cool ground
    const key = new THREE.DirectionalLight(0xfff8f0, 1.1);               // soft front-top key
    key.position.set(3, 6, 5);
    key.castShadow = true;
    lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.45);             // cool left fill
    fill.position.set(-5, 3, 0);
    lightGroup.add(fill);
    const back = new THREE.DirectionalLight(0xffeedd, 0.3);              // warm back rim
    back.position.set(0, 2, -6);
    lightGroup.add(back);
    lightGroup.rotation.y = 0;
    return;
  }

  const k = strength;

  if (mode === "studio") {
    lightGroup.add(new THREE.AmbientLight(0xffffff, 0.4 * k));
    const key = new THREE.DirectionalLight(0xffffff, 1.4 * k);
    key.position.set(4, 6, 4);
    key.castShadow = true;
    lightGroup.add(key);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.5 * k);
    fill.position.set(-4, 2, -2);
    lightGroup.add(fill);
    const rim = new THREE.DirectionalLight(
      hexToInt(color) || 0x7c3aed,
      0.6 * k,
    );
    rim.position.set(-2, -1, -5);
    lightGroup.add(rim);
  } else if (mode === "outdoor") {
    lightGroup.add(new THREE.HemisphereLight(0x87ceeb, 0x3a3020, 0.9 * k));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6 * k);
    sun.position.set(8, 12, 6);
    sun.castShadow = true;
    lightGroup.add(sun);
  } else if (mode === "dramatic") {
    lightGroup.add(new THREE.AmbientLight(0x111133, 0.15 * k));
    const spot = new THREE.SpotLight(0xffffff, 2.5 * k, 30, Math.PI / 8, 0.3);
    spot.position.set(0, 8, 3);
    spot.castShadow = true;
    lightGroup.add(spot);
    const dCol = hexToInt(dramaticColor) ?? hexToInt(color) ?? 0x4400ff;
    const back = new THREE.DirectionalLight(dCol, 0.8 * k);
    back.position.set(-5, -2, -5);
    lightGroup.add(back);
  }

  lightGroup.rotation.y = (rotation * Math.PI) / 180;
}

// ── applyViewMode ────────────────────────────────────────────────────────────
export function applyViewMode(s, mode) {
  const { THREE, scene, origMaterials } = s;
  if (!THREE) return;

  scene.traverse((node) => {
    if (!node.isMesh || node.userData.isGround || node.userData.isBgLight) return;

    if (!origMaterials.has(node.uuid))
      origMaterials.set(node.uuid, node.material);

    const orig = origMaterials.get(node.uuid);
    node.castShadow = true;

    if (mode === 'clay') {
      if (node.geometry && node.geometry.attributes.position) {
        node.geometry.computeVertexNormals();
      }
      const buildClay = () => new THREE.MeshStandardMaterial({
        color: 0xd4b896,      // klasszikus meleg clay szín
        metalness: 0,
        roughness: 0.85,
        envMapIntensity: 0,
        side: THREE.DoubleSide,
      });
      node.material = Array.isArray(orig)
        ? orig.map(() => buildClay())
        : buildClay();

    } else if (mode === 'normal') {
      node.material = orig;

    } else if (mode === 'uv') {
      // Base Color: MeshBasicMaterial = pure texture, zero lighting influence
      const buildBasic = (m) => {
        const map = (m?.map) ?? null;
        if (map) {
          map.encoding = THREE.sRGBEncoding;
          map.needsUpdate = true;
        }
        return new THREE.MeshBasicMaterial({
          map,
          color: map ? 0xffffff : (m?.color ?? new THREE.Color(0xe0dbd5)),
        });
      };
      node.material = Array.isArray(orig)
        ? orig.map(m => buildBasic(m))
        : buildBasic(orig);
    }
  });

  scene.traverse((node) => {
    if (node.userData.isGround) node.receiveShadow = true;
  });
}

export function applyWireframeOverlay(
  s,
  show,
  opacity = 0.22,
  hexColor = 0xffffff,
) {
  const { THREE, scene } = s;
  if (!THREE) return;
  scene.traverse((node) => {
    if (!node.isMesh || node.userData.isGround || node.userData.isBgLight)
      return;
    node.children
      .filter((c) => c.userData.isWireframeOverlay)
      .forEach((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
        node.remove(c);
      });
    if (!show) return;
    const wireGeo = new THREE.WireframeGeometry(node.geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: hexColor,
      opacity,
      transparent: true,
      depthTest: true,
    });
    const lines = new THREE.LineSegments(wireGeo, wireMat);
    lines.userData.isWireframeOverlay = true;
    lines.renderOrder = 2;
    node.add(lines);
  });
}

export function loadGLB(
  s,
  url,
  currentViewMode,
  autoSpin = false,
  wireframeOverlay = false,
  wireOpacity = 0.22,
  wireHexColor = 0xffffff,
) {
  const { THREE, scene, placeholder } = s;
  if (!THREE?.GLTFLoader) return;
  if (placeholder) placeholder.visible = false;
  if (s.model) {
    scene.remove(s.model);
    s.model = null;
    s.origMaterials.clear();
  }

  new THREE.GLTFLoader().load(
    url,
    (gltf) => {
      const model = gltf.scene;
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
          if (n.geometry) {
            if (!n.geometry.attributes.normal) {
              n.geometry.computeVertexNormals();
            } else {
              n.geometry.computeVertexNormals();
            }
          }
          s.origMaterials.set(n.uuid, n.material);
        }
      });

      applyViewMode(s, currentViewMode);
      scene.add(model);
      s.model = model;
      s.cam.radius = 5;
      s.cam.panY = 0;
      syncCamera(s.camera, s.cam);
      applyViewMode(s, currentViewMode);
      if (wireframeOverlay)
        applyWireframeOverlay(s, true, wireOpacity, wireHexColor);
      s.autoSpin = autoSpin;
    },
    undefined,
    (err) => console.error("GLB load error:", err),
  );
}

export function setCameraPreset(s, preset) {
  if (!s) return;
  s.autoSpin = false;
  if (preset === "reset") {
    s.cam.theta = 0.4;
    s.cam.phi = Math.PI / 3;
    s.cam.panX = 0;
    s.cam.panY = 0;
  }
  if (preset === "front") {
    s.cam.theta = 0;
    s.cam.phi = Math.PI / 2;
  }
  if (preset === "side") {
    s.cam.theta = Math.PI / 2;
    s.cam.phi = Math.PI / 2;
  }
  if (preset === "top") {
    s.cam.theta = 0;
    s.cam.phi = 0.05;
  }
  syncCamera(s.camera, s.cam);
}