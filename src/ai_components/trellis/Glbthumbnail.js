import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

function normalizeMaterialTextureColorSpaces(THREE, material) {
  if (!THREE || !material) return;

  const hasImageData = (texture) => {
    const image = texture?.image;
    if (!image) return false;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) return image.width > 0 && image.height > 0;
    if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) return image.width > 0 && image.height > 0;
    if (typeof HTMLVideoElement !== 'undefined' && image instanceof HTMLVideoElement) return image.readyState >= 2;
    return Boolean(image.width || image.videoWidth || image.data);
  };

  ['map', 'emissiveMap'].forEach((slot) => {
    const texture = material[slot];
    if (texture?.isTexture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      if (hasImageData(texture)) texture.needsUpdate = true;
    }
  });

  ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'displacementMap'].forEach((slot) => {
    const texture = material[slot];
    if (texture?.isTexture) {
      texture.colorSpace = THREE.NoColorSpace;
      if (hasImageData(texture)) texture.needsUpdate = true;
    }
  });
}

function hasTextureImageData(texture) {
  const image = texture?.image;
  if (!image) return false;
  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) return image.width > 0 && image.height > 0;
  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) return image.width > 0 && image.height > 0;
  if (typeof HTMLVideoElement !== 'undefined' && image instanceof HTMLVideoElement) return image.readyState >= 2;
  return Boolean(image.width || image.videoWidth || image.data);
}

function collectModelTextures(model) {
  const textures = [];
  const slots = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'displacementMap'];
  model?.traverse?.((node) => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.forEach((mat) => {
      if (!mat) return;
      slots.forEach((slot) => {
        const texture = mat[slot];
        if (texture?.isTexture && !textures.includes(texture)) textures.push(texture);
      });
    });
  });
  return textures;
}

async function waitForThumbnailTextures(model, timeoutMs = 900) {
  const textures = collectModelTextures(model);
  if (!textures.length || textures.every(hasTextureImageData)) return;

  await Promise.race([
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    new Promise((resolve) => {
      let settled = false;
      const finishIfReady = () => {
        if (!settled && textures.every((texture) => hasTextureImageData(texture) || !texture.image)) {
          settled = true;
          resolve();
        }
      };

      textures.forEach((texture) => {
        const image = texture.image;
        if (!image || hasTextureImageData(texture)) return;
        if (typeof image.addEventListener === 'function') {
          image.addEventListener('load', finishIfReady, { once: true });
          image.addEventListener('error', finishIfReady, { once: true });
        }
        if (typeof image.decode === 'function') {
          image.decode().then(finishIfReady).catch(finishIfReady);
        }
      });

      finishIfReady();
    }),
  ]);

  textures.forEach((texture) => {
    if (hasTextureImageData(texture)) texture.needsUpdate = true;
  });
}

let _activeCount = 0;
const _MAX = 1;
const _queue = [];
const _TIMEOUT_MS = 45000;
const _UNSUPPORTED_THUMBNAIL = Symbol('unsupported-thumbnail');
const _pending = new Map();

function readAscii(bytes, length = bytes.length) {
  return String.fromCharCode(...bytes.slice(0, length));
}

function sniffModelFormat(buffer) {
  const bytes = new Uint8Array(buffer, 0, Math.min(32, buffer.byteLength));
  const header = readAscii(bytes);
  const firstText = header.trimStart();

  if (header.startsWith('glTF')) return 'glb';
  if (header.startsWith('Kaydara')) return 'fbx';
  if (header.startsWith('PK')) return 'zip';
  if (firstText.startsWith('{')) return 'gltf-json';
  if (firstText.startsWith('<')) return 'html';
  return 'unknown';
}

function createUnsupportedThumbnailError(format) {
  const err = new Error(`Unsupported model data for thumbnail generation: ${format}`);
  err.code = 'UNSUPPORTED_THUMBNAIL_FORMAT';
  err.thumbnailUnsupported = true;
  err.format = format;
  return err;
}

function _dequeue() {
  if (_activeCount >= _MAX || _queue.length === 0) return;
  _activeCount++;
  const item = _queue.shift();
  if (item) item.run();
}

function createThumbnailTimeoutError(timeoutMs) {
  const err = new Error(`Thumbnail generation timeout after ${Math.round(timeoutMs / 1000)}s`);
  err.code = 'THUMBNAIL_TIMEOUT';
  return err;
}

function _enqueue(run, timeoutMs = _TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (fn, val) => {
      if (finished) return;
      finished = true;
      _activeCount--;
      _dequeue();
      fn(val);
    };

    let timer = null;
    _queue.push({
      run: () => {
        timer = setTimeout(() => {
          finish(reject, createThumbnailTimeoutError(timeoutMs));
        }, timeoutMs);
        run(
          (val) => { clearTimeout(timer); finish(resolve, val); },
          (err) => { clearTimeout(timer); finish(reject, err); }
        );
      }
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
    width = 280,
    height = 280,
    bgColor = '#1a1528',
    timeoutMs = _TIMEOUT_MS,
  } = options;

  return _enqueue(async (resolve, reject) => {
    let renderer, scene, camera;

    function cleanup() {
      if (renderer) {
        try { renderer.forceContextLoss(); } catch (_) { }
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

      const format = sniffModelFormat(buffer);
      if (format === 'zip' || format === 'html' || format === 'unknown') {
        throw createUnsupportedThumbnailError(format);
      }

      // ── Renderer setup ───────────────────────────────────────────────
      const canvas = document.createElement('canvas');
      canvas.width = width;
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
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;

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

      // ── Parse model ─────────────────────────────────────────────────
      let model;
      if (format === 'fbx') {
        // Suppress FBXLoader's console.warn about unsupported material maps
        const _origWarn = console.warn;
        console.warn = () => { };
        try {
          model = new FBXLoader().parse(buffer, '');
        } finally {
          console.warn = _origWarn;
        }
      } else {
        const gltf = await new Promise((res, rej) => {
          new GLTFLoader().parse(buffer, '', res, rej);
        });
        model = gltf.scene;
      }

      if (!model) throw new Error('Parser returned null model');

      // ── Material Normalization — same for FBX and GLB ──────────────
      model.traverse((node) => {
        if (!node.isMesh) return;

        const sanitize = (orig) => {
          if (!orig) return orig;
          let sm = orig;
          if (!orig.isMeshStandardMaterial) {
            sm = new THREE.MeshStandardMaterial();
            const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap'];
            maps.forEach(mapName => {
              if (orig[mapName]) {
                sm[mapName] = orig[mapName];
              }
            });
            sm.color.copy(orig.color || new THREE.Color(0xffffff));
            if (orig.emissive && sm.emissive) sm.emissive.copy(orig.emissive);
            if (orig.normalScale && sm.normalScale) sm.normalScale.copy(orig.normalScale);
            sm.opacity = orig.opacity ?? 1;
            sm.transparent = orig.transparent ?? (orig.opacity < 1);
            sm.side = THREE.DoubleSide; // Fix visibility for retopo
          }

          // Force white color if texture exists but color is black
          if (sm.map && (sm.color.r === 0 && sm.color.g === 0 && sm.color.b === 0)) {
            sm.color.set(0xffffff);
          }

          normalizeMaterialTextureColorSpaces(THREE, sm);

          // PBR polish for consistent thumbnail lighting
          if (!sm.roughnessMap) sm.roughness = Math.max(sm.roughness || 0, 0.6);
          sm.envMapIntensity = 1.0;
          return sm;
        };

        if (Array.isArray(node.material)) {
          node.material = node.material.map(sanitize);
        } else {
          node.material = sanitize(node.material);
        }
      });

      // ── Configure meshes ─────────────────────────────────────────────
      if (typeof model.traverse === 'function') {
        model.traverse(n => {
          if (n.isMesh) {
            if (n.geometry && !n.geometry.attributes.normal) {
              n.geometry.computeVertexNormals();
            }
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });
      }
      scene.add(model);

      // ── Camera framing ───────────────────────────────────────────────
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(center);

      const aspect = width / height;
      const fovV = camera.fov * (Math.PI / 180);
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);

      const neededForH = (size.x / 2) / Math.tan(fovH / 2);
      const neededForV = (size.y / 2) / Math.tan(fovV / 2);
      const neededForD = (size.z / 2) / Math.tan(fovH / 2);

      const dist = Math.max(neededForH, neededForV, neededForD) * 1.15;
      camera.position.set(dist * 0.4, dist * 0.15, dist * 0.92);
      camera.lookAt(0, 0, 0);
      camera.near = 0.01;
      camera.far = dist * 20;
      camera.updateProjectionMatrix();

      keyLight.target.position.set(0, 0, 0);
      keyLight.target.updateMatrixWorld();

      // ── Render ───────────────────────────────────────────────────────
      await waitForThumbnailTextures(model);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      renderer.render(scene, camera);
      const dataUrl = canvas.toDataURL('image/webp', 0.85);
      cleanup();
      resolve(dataUrl);
    } catch (err) {
      if (!err?.thumbnailUnsupported) {
        console.error('[Thumbnail] generation failed:', err);
      }
      cleanup();
      reject(err);
    }
  }, timeoutMs);
}

// ── Cache ────────────────────────────────────────────────────────────────
const _cache = new Map();

export function checkThumbnailCache(key) {
  if (!key) return null;
  const cached = _cache.get(key);
  return cached === _UNSUPPORTED_THUMBNAIL ? null : cached || null;
}

export function isThumbnailUnsupported(key) {
  return !!key && _cache.get(key) === _UNSUPPORTED_THUMBNAIL;
}

/**
 * Get a cached thumbnail. Accepts ArrayBuffer or URL.
 * @param {ArrayBuffer|string} source
 * @param {object} options
 * @param {string} [cacheKey] - optional cache key (use when source is ArrayBuffer)
 */
export async function getCachedThumbnail(source, options = {}, cacheKey) {
  if (!source) return null;
  const key = cacheKey || (typeof source === 'string' ? source : null);
  if (key && _cache.has(key)) {
    const cached = _cache.get(key);
    return cached === _UNSUPPORTED_THUMBNAIL ? null : cached;
  }
  if (key && _pending.has(key)) {
    return _pending.get(key);
  }

  const pending = (async () => {
    try {
      const thumb = await generateGlbThumbnail(source, options);
      if (key) _cache.set(key, thumb);
      return thumb;
    } catch (err) {
      if (err?.thumbnailUnsupported) {
        if (key && !_cache.has(key)) {
          console.warn('[Thumbnail] unsupported model skipped:', err.format || err.message);
          _cache.set(key, _UNSUPPORTED_THUMBNAIL);
        }
      } else if (err?.code === 'THUMBNAIL_TIMEOUT') {
        console.warn('[Thumbnail] generation timed out; will retry next time:', key || err.message);
      } else {
        console.error('[Thumbnail] cache miss error:', err);
      }
      return null;
    } finally {
      if (key) _pending.delete(key);
    }
  })();

  if (key) _pending.set(key, pending);
  return pending;
}

export function clearThumbnailCache() {
  _cache.clear();
  _pending.clear();
}
