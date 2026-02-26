import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let _activeCount = 0;
const _MAX = 1;
const _queue = [];

function _dequeue() {
  if (_activeCount >= _MAX || _queue.length === 0) return;
  _activeCount++;
  const { run } = _queue.shift();
  run();
}

function _enqueue(run) {
  return new Promise((resolve, reject) => {
    _queue.push({
      run: () => run(
        (val) => { _activeCount--; _dequeue(); resolve(val); },
        (err) => { _activeCount--; _dequeue(); reject(err); }
      ),
    });
    _dequeue();
  });
}

export function generateGlbThumbnail(modelUrl, options = {}) {
  const {
    width   = 280,
    height  = 280,
    bgColor = '#1a1528',
  } = options;

  return _enqueue((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(2);
    renderer.setClearColor(bgColor, 1);
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(0x1a1528, 0.025);

    const camera = new THREE.PerspectiveCamera(28, width / height, 0.01, 10000);

    // Lighting
    scene.add(new THREE.AmbientLight(0xc0b8ff, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9966ff, 1.2);
    fill.position.set(-5, 3, 3);
    scene.add(fill);
    const side = new THREE.DirectionalLight(0x4488ff, 0.8);
    side.position.set(5, 1, -3);
    scene.add(side);
    const bounce = new THREE.DirectionalLight(0xb0a0ff, 0.5);
    bounce.position.set(0, -5, 2);
    scene.add(bounce);

    function cleanup() {
      try { renderer.forceContextLoss(); } catch (_) {}
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          (Array.isArray(obj.material) ? obj.material : [obj.material])
            .forEach(m => m.dispose());
        }
      });
    }

    const timeoutId = setTimeout(() => { cleanup(); reject(new Error('Thumbnail timeout')); }, 20_000);

    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        clearTimeout(timeoutId);

        const model = gltf.scene;
        model.traverse(n => {
          if (n.isMesh) {
            if (n.geometry && !n.geometry.attributes.normal) n.geometry.computeVertexNormals();
            n.castShadow    = true;
            n.receiveShadow = true;
          }
        });
        scene.add(model);

        // ── Bounding box & sphere ─────────────────────────────────────────────
        const box    = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());

        // Modell középpontja az origóba
        model.position.sub(center);

        // Kamera paraméterek — a legszélesebb/legmagasabb dimenzió alapján
        const aspect   = width / height;
        const fovV     = camera.fov * (Math.PI / 180);          // vertikális FOV
        const fovH     = 2 * Math.atan(Math.tan(fovV / 2) * aspect); // horizontális FOV

        // Mekkora távolság kell hogy az ÖSSZES dimenzió beférjen?
        const neededForH = (size.x / 2) / Math.tan(fovH / 2);
        const neededForV = (size.y / 2) / Math.tan(fovV / 2);
        const neededForD = (size.z / 2) / Math.tan(fovH / 2); // mélység a h-FOV-hoz

        // A maximumot vesszük + 10% margó
        const dist = Math.max(neededForH, neededForV, neededForD) * 1.10;

        // ── Kamera pozíció: enyhén jobbról-fentről, de EGYENESEN a center felé néz
        // Az Y offset minimális hogy ne torzítsa a látómezőt
        const camX =  dist * 0.4;
        const camY =  dist * 0.05;  // alig fentről — ne vágja le a fejet
        const camZ =  dist * 0.92;

        camera.position.set(camX, camY, camZ);
        camera.lookAt(0, 0, 0);       // a modell középpontjára néz (ami most az origó)
        camera.near = 0.01;
        camera.far  = dist * 20;
        camera.updateProjectionMatrix();

        // Spot target frissítés
        key.target.position.set(0, 0, 0);
        key.target.updateMatrixWorld();

        renderer.render(scene, camera);

        try {
          const dataUrl = canvas.toDataURL('image/png');
          cleanup();
          resolve(dataUrl);
        } catch (err) {
          cleanup();
          reject(err);
        }
      },
      undefined,
      (err) => { clearTimeout(timeoutId); cleanup(); reject(err); }
    );
  });
}

const _cache = new Map();

export async function getCachedThumbnail(modelUrl, options = {}) {
  if (!modelUrl) return null;
  if (_cache.has(modelUrl)) return _cache.get(modelUrl);
  try {
    const thumb = await generateGlbThumbnail(modelUrl, options);
    _cache.set(modelUrl, thumb);
    return thumb;
  } catch (err) {
    console.error('Thumbnail hiba:', err);
    return null;
  }
}

export function clearThumbnailCache() { _cache.clear(); }