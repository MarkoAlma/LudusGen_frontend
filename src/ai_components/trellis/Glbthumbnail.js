import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

let _activeCount = 0;
const _MAX = 3;
const _queue = [];
const _TIMEOUT_MS = 20000;

function _dequeue() {
  if (_activeCount >= _MAX || _queue.length === 0) return;
  _activeCount++;
  const item = _queue.shift();
  if (item) item.run();
}

function _enqueue(run) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (fn, val) => {
      if (finished) return;
      finished = true;
      _activeCount--;
      _dequeue();
      fn(val);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error('Thumbnail generation timeout'));
    }, _TIMEOUT_MS);

    _queue.push({
      run: () => run(
        (val) => { clearTimeout(timer); finish(resolve, val); },
        (err) => { clearTimeout(timer); finish(reject, err); }
      ),
    });
    _dequeue();
  });
}

/**
 * Generate a thumbnail from model data.
 * @param {ArrayBuffer|string} source - ArrayBuffer of model data OR a URL/blob-URL to fetch
 * @param {object} options
 */
export function generateGlbThumbnail(source, options = {}) {
  const {
    width   = 280,
    height  = 280,
    bgColor = '#1a1528',
  } = options;

  return _enqueue(async (resolve, reject) => {
    let renderer, scene, camera;

    function cleanup() {
      if (renderer) {
        try { renderer.forceContextLoss(); } catch (_) {}
        renderer.dispose();
      }
      if (scene) {
        scene.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            (Array.isArray(obj.material) ? obj.material : [obj.material])
              .forEach(m => m.dispose());
          }
        });
      }
    }

    try {
      // ── Get ArrayBuffer ──────────────────────────────────────────────
      let buffer;
      if (source instanceof ArrayBuffer) {
        buffer = source;
      } else if (typeof source === 'string') {
        const response = await fetch(source);
        if (!response.ok) throw new Error(`Fetch failed: HTTP ${response.status}`);
        buffer = await response.arrayBuffer();
      } else {
        throw new Error('Invalid source: expected ArrayBuffer or URL string');
      }

      if (!buffer || buffer.byteLength < 4) {
        throw new Error('Empty or corrupt model data');
      }

      // ── Renderer setup ───────────────────────────────────────────────
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      renderer.setClearColor(bgColor, 1);
      renderer.outputColorSpace    = THREE.SRGBColorSpace;
      renderer.toneMapping         = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled   = true;
      renderer.shadowMap.type      = THREE.PCFShadowMap;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(bgColor);

      camera = new THREE.PerspectiveCamera(28, width / height, 0.01, 10000);

      // ── Lighting ─────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0xc0b8ff, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
      keyLight.position.set(4, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(512, 512);
      scene.add(keyLight);

      const fill = new THREE.DirectionalLight(0x9966ff, 1.2);
      fill.position.set(-5, 3, 3);
      scene.add(fill);

      const side = new THREE.DirectionalLight(0x4488ff, 0.8);
      side.position.set(5, 1, -3);
      scene.add(side);

      const bounce = new THREE.DirectionalLight(0xb0a0ff, 0.5);
      bounce.position.set(0, -5, 2);
      scene.add(bounce);

      // ── Sniff format & parse ─────────────────────────────────────────
      const header = new Uint8Array(buffer, 0, Math.min(20, buffer.byteLength));
      const headerStr = String.fromCharCode(...header);
      const isFBX = headerStr.startsWith('Kaydara');

      let model;
      if (isFBX) {
        model = new FBXLoader().parse(buffer, '');
      } else {
        const gltf = await new Promise((res, rej) => {
          new GLTFLoader().parse(buffer, '', res, rej);
        });
        model = gltf.scene;
      }

      if (!model) throw new Error('Parser returned null model');

      // ── Configure meshes ─────────────────────────────────────────────
      if (typeof model.traverse === 'function') {
        model.traverse(n => {
          if (n.isMesh) {
            if (n.geometry && !n.geometry.attributes.normal) {
              n.geometry.computeVertexNormals();
            }
            n.castShadow    = true;
            n.receiveShadow = true;
          }
        });
      }
      scene.add(model);

      // ── Camera framing ───────────────────────────────────────────────
      const box    = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      model.position.sub(center);

      const aspect = width / height;
      const fovV   = camera.fov * (Math.PI / 180);
      const fovH   = 2 * Math.atan(Math.tan(fovV / 2) * aspect);

      const neededForH = (size.x / 2) / Math.tan(fovH / 2);
      const neededForV = (size.y / 2) / Math.tan(fovV / 2);
      const neededForD = (size.z / 2) / Math.tan(fovH / 2);

      const dist = Math.max(neededForH, neededForV, neededForD) * 1.15;
      camera.position.set(dist * 0.4, dist * 0.15, dist * 0.92);
      camera.lookAt(0, 0, 0);
      camera.near = 0.01;
      camera.far  = dist * 20;
      camera.updateProjectionMatrix();

      keyLight.target.position.set(0, 0, 0);
      keyLight.target.updateMatrixWorld();

      // ── Render ───────────────────────────────────────────────────────
      renderer.render(scene, camera);
      const dataUrl = canvas.toDataURL('image/webp', 0.85);
      cleanup();
      resolve(dataUrl);
    } catch (err) {
      console.error('[Thumbnail] generation failed:', err);
      cleanup();
      reject(err);
    }
  });
}

// ── Cache ────────────────────────────────────────────────────────────────
const _cache = new Map();

/**
 * Get a cached thumbnail. Accepts ArrayBuffer or URL.
 * @param {ArrayBuffer|string} source
 * @param {object} options
 * @param {string} [cacheKey] - optional cache key (use when source is ArrayBuffer)
 */
export async function getCachedThumbnail(source, options = {}, cacheKey) {
  if (!source) return null;
  const key = cacheKey || (typeof source === 'string' ? source : null);
  if (key && _cache.has(key)) return _cache.get(key);
  try {
    const thumb = await generateGlbThumbnail(source, options);
    if (key) _cache.set(key, thumb);
    return thumb;
  } catch (err) {
    console.error('[Thumbnail] cache miss error:', err);
    return null;
  }
}

export function clearThumbnailCache() { _cache.clear(); }