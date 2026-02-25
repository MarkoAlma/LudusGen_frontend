import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Generál egy thumbnail képet egy GLB model URL-ből
 * @param {string} modelUrl - A GLB model URL-je (lehet blob URL vagy data URL)
 * @param {Object} options - Opciók
 * @param {number} options.width - Thumbnail szélesség (default: 128)
 * @param {number} options.height - Thumbnail magasság (default: 128)
 * @param {string} options.bgColor - Háttérszín (default: '#060610')
 * @returns {Promise<string>} - Base64 data URL a thumbnail képpel
 */
export async function generateGlbThumbnail(modelUrl, options = {}) {
  const {
    width = 128,
    height = 128,
    bgColor = '#060610',
  } = options;

  return new Promise((resolve, reject) => {
    // Offscreen canvas létrehozása
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(bgColor, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    // Camera
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    camera.position.set(2, 1.5, 2);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaa88, 0.5);
    rimLight.position.set(-1, 1, -3);
    scene.add(rimLight);

    // Model betöltés
    const loader = new GLTFLoader();
    
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail generálás timeout'));
    }, 10000);

    loader.load(
      modelUrl,
      (gltf) => {
        clearTimeout(timeoutId);
        
        const model = gltf.scene;
        scene.add(model);

        // Bounding box és center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Model centrálása
        model.position.sub(center);

        // Kamera távolság
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
        camera.position.set(
          cameraDistance * 0.7,
          cameraDistance * 0.5,
          cameraDistance * 0.7
        );
        camera.lookAt(0, 0, 0);

        // Render
        renderer.render(scene, camera);

        // Thumbnail kinyerése
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
      (error) => {
        clearTimeout(timeoutId);
        cleanup();
        reject(error);
      }
    );

    function cleanup() {
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  });
}

/**
 * Cache-elt thumbnail generálás
 */
const thumbnailCache = new Map();

export async function getCachedThumbnail(modelUrl, options = {}) {
  if (thumbnailCache.has(modelUrl)) {
    return thumbnailCache.get(modelUrl);
  }

  try {
    const thumbnail = await generateGlbThumbnail(modelUrl, options);
    thumbnailCache.set(modelUrl, thumbnail);
    return thumbnail;
  } catch (err) {
    console.error('Thumbnail generálás hiba:', err);
    return null;
  }
}

export function clearThumbnailCache() {
  thumbnailCache.clear();
}