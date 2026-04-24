import React, { useRef, useEffect, useCallback, useContext, forwardRef, useImperativeHandle, memo } from "react";
import { useMotionValueEvent } from "framer-motion";
import { StudioLayoutContext } from "../../../components/shared/StudioLayout";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  syncCamera, buildPlaceholder,
  createSunLight,
  applyLights, applyViewMode, applyWireframeOverlay, applyRigSkeletonOverlay,
  applySegmentHighlight,
  updateRigOverlay,
  setSceneBg, setGridColor, loadGLB,
  focusOnHit, applyExponentialZoom,
  modelHasTextures, modelHasUvOverlapSuspicion,
} from './threeHelpers';

function getImageSize(image) {
  return {
    width: image?.naturalWidth || image?.videoWidth || image?.width || 0,
    height: image?.naturalHeight || image?.videoHeight || image?.height || 0,
  };
}

function paintCanvasHasPixels(canvas) {
  if (!canvas) return false;
  try {
    const data = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)?.data;
    if (!data) return false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function getTargetMaterial(state, target) {
  if (!state || !target?.meshUuid) return null;
  const matOrMats = state.origMaterials?.get(target.meshUuid);
  if (!matOrMats) return null;
  if (!Array.isArray(matOrMats)) return matOrMats;
  return matOrMats[target.materialIndex] || matOrMats[0] || null;
}

function getTextureSourceFromMaterial(mat) {
  const image = mat?.map?.image;
  const { width, height } = getImageSize(image);
  if (!image || width <= 0 || height <= 0) return null;
  return { image, width, height, area: width * height };
}

function getLargestDiffuseMap(state) {
  let best = null;
  state?.origMaterials?.forEach((matOrMats) => {
    const mats = Array.isArray(matOrMats) ? matOrMats : [matOrMats];
    mats.forEach((mat) => {
      const source = getTextureSourceFromMaterial(mat);
      if (source && (!best || source.area > best.area)) best = source;
    });
  });
  return best;
}

function getFallbackMaterialColor(state, preferredMaterial = null) {
  if (preferredMaterial?.color) return `#${preferredMaterial.color.getHexString()}`;
  let css = '#85828f';
  state?.origMaterials?.forEach((matOrMats) => {
    const mats = Array.isArray(matOrMats) ? matOrMats : [matOrMats];
    const mat = mats.find((entry) => entry?.color);
    if (mat?.color) css = `#${mat.color.getHexString()}`;
  });
  return css;
}

function getPaintSurfaceKey(meshUuid, materialIndex = 0) {
  return `${meshUuid}:${materialIndex}`;
}

function getPaintCanvasSize(material, maxSize = 2048) {
  const source = getTextureSourceFromMaterial(material);
  const sourceWidth = source?.width || 1024;
  const sourceHeight = source?.height || 1024;
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(512, Math.round(sourceWidth * scale)),
    height: Math.max(512, Math.round(sourceHeight * scale)),
  };
}

function createPaintOverlayMaterial(THREE, texture = null, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
  });
}

function getEmptyPaintMaterial(state) {
  if (!state?._emptyPaintMat) {
    state._emptyPaintMat = createPaintOverlayMaterial(state.THREE, null, 0);
  }
  return state._emptyPaintMat;
}

function applyPaintSurfaceToOverlay(state, meshUuid, materialIndex, paintMaterial) {
  const overlay = state?._paintOverlayByMesh?.get(meshUuid);
  if (!overlay) return;
  if (Array.isArray(overlay.material)) {
    overlay.material[materialIndex] = paintMaterial;
  } else {
    overlay.material = paintMaterial;
  }
}

function getOrCreatePaintSurface(state, mesh, materialIndex = 0) {
  if (!state || !mesh) return null;
  if (!state._paintSurfaces) state._paintSurfaces = new Map();
  const key = getPaintSurfaceKey(mesh.uuid, materialIndex);
  const existing = state._paintSurfaces.get(key);
  if (existing) return existing;

  const baseMaterial = getTargetMaterial(state, { meshUuid: mesh.uuid, materialIndex });
  const { width, height } = getPaintCanvasSize(baseMaterial);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d', { willReadFrequently: true });

  const texture = new state.THREE.CanvasTexture(canvas);
  texture.colorSpace = state.THREE.SRGBColorSpace;
  const material = createPaintOverlayMaterial(state.THREE, texture);
  const surface = {
    key,
    meshUuid: mesh.uuid,
    materialIndex,
    baseMaterial,
    canvas,
    texture,
    material,
    touchedAt: 0,
  };
  state._paintSurfaces.set(key, surface);
  applyPaintSurfaceToOverlay(state, mesh.uuid, materialIndex, material);
  return surface;
}

function getLatestPaintSurface(state) {
  let latest = null;
  state?._paintSurfaces?.forEach((surface) => {
    if (!paintCanvasHasPixels(surface.canvas)) return;
    if (!latest || surface.touchedAt > latest.touchedAt) latest = surface;
  });
  return latest;
}

function disposePaintResources(state) {
  if (!state) return;
  state._paintOverlayMeshes?.forEach((mesh) => mesh.parent?.remove(mesh));
  state._paintOverlayMeshes = null;
  state._paintOverlayByMesh = new Map();
  state._paintMeshes = null;
  state._paintActive = false;
  state._currentPaintStroke = null;
  state._lastPaintTarget = null;
  state._lastPaintUV = null;
  state._paintSurfaces?.forEach((surface) => {
    surface.texture?.dispose?.();
    surface.material?.dispose?.();
  });
  state._paintSurfaces = new Map();
  state._emptyPaintMat?.dispose?.();
  state._emptyPaintMat = null;
  state._paintHistory = [];
  state.paintTexture?.dispose?.();
  state.paintTexture = null;
}

async function createPaintedTextureBlob(state, maxSize = 2048) {
  const target = state?._lastPaintTarget;
  const targetKey = target ? getPaintSurfaceKey(target.meshUuid, target.materialIndex) : null;
  const surface = (targetKey && state?._paintSurfaces?.get(targetKey)) || getLatestPaintSurface(state);
  const paintCanvas = surface?.canvas;
  if (!surface || !paintCanvasHasPixels(paintCanvas)) return null;

  const targetMaterial = surface.baseMaterial || getTargetMaterial(state, surface);
  const base = getTextureSourceFromMaterial(targetMaterial) || getLargestDiffuseMap(state);
  const sourceWidth = base?.width || 1024;
  const sourceHeight = base?.height || 1024;
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(256, Math.round(sourceWidth * scale));
  const height = Math.max(256, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (base?.image) {
    try {
      ctx.drawImage(base.image, 0, 0, width, height);
    } catch {
      ctx.fillStyle = getFallbackMaterialColor(state, targetMaterial);
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = getFallbackMaterialColor(state, targetMaterial);
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(paintCanvas, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Painted texture export failed'));
    }, 'image/png');
  });
}

const ThreeViewer = memo(forwardRef(({
  color, viewMode, lightMode, showGrid,
  modelUrl, onReady,
  onSegmentProcessing,
  leftOffset = 0,
  rightOffset = 0,
  lightStrength = 1,
  lightRotation = 0,
  lightElevation = 45,
  lightAutoRotate = false,
  lightAutoRotateSpeed = 0.5,
  dramaticColor = null,
  wireframeOverlay = false,
  wireOpacity = 0.22,
  wireHexColor = 0xffffff,
  showRig = false,
  autoSpin = false,
  onSpinStop,
  onNonGlbUrl,
  onRigDetected,
  onAnimClipsDetected,
  onTextureAvailabilityChange,
  onUvOverlapChange,
  bgColor = 'default',
  gridColor1 = '#1e1e3a',
  gridColor2 = '#111128',
  segmentHighlight = false,
  segmentEdgeColor = 0x00ff88,
  // 3D Paint Props
  paintMode = false,
  paintColor = '#ffffff',
  paintSize = 10,
  paintOpacity = 0.35,
  paintHardness = 60,
  paintCanvasRef = null,
}, ref) => {
  const mountRef = useRef(null);
  const S = useRef(null);
  const segmentTimerRef = useRef(null);

  const lightParamsRef = useRef({ lightMode, color, lightStrength, lightRotation, lightElevation, dramaticColor });
  useEffect(() => {
    lightParamsRef.current = { lightMode, color, lightStrength, lightRotation, lightElevation, dramaticColor };
  }, [lightMode, color, lightStrength, lightRotation, lightElevation, dramaticColor]);

  const paintRef = useRef({ paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef });
  useEffect(() => {
    paintRef.current = { paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef };
  }, [paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef]);

  useEffect(() => () => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    if (onSegmentProcessing) onSegmentProcessing(false);
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let resizeTimer = null;
    let resizeObs;

    (async () => {
      const W = el.clientWidth || 640, H = el.clientHeight || 480;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 10000);
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.sortObjects = false;
      el.appendChild(renderer.domElement);

      // ── ENVIRONMENT MAP for PBR materials ─────────────────────────────────────
      // Without an envMap, MeshStandardMaterial has no specular reflections,
      // producing a flat/waxy appearance. RoomEnvironment provides neutral
      // studio-like reflections that give PBR surfaces natural depth.
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;

      const grid = new THREE.GridHelper(20, 40,
        parseInt(gridColor1.replace('#', ''), 16),
        parseInt(gridColor2.replace('#', ''), 16),
      );
      grid.position.y = -1;
      scene.add(grid);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.3 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1;
      ground.receiveShadow = true;
      ground.userData.isGround = true;
      scene.add(ground);

      const placeholder = buildPlaceholder(THREE, color);
      scene.add(placeholder);

      const lightGroup = new THREE.Group();
      scene.add(lightGroup);
      const sunLight = createSunLight(THREE, scene);

      const cam = { theta: 0.4, phi: Math.PI / 3, radius: 8, panX: 0, panY: 0, panZ: 0 };
      syncCamera(camera, cam);

      // ── DEMAND-BASED RENDERING ──────────────────────────────────────────────
      // Previously the render loop ran unconditionally at 60fps — even when the
      // model was just sitting still with no interaction. On a 300MB model that's
      // wasted fill-rate and battery every single frame.
      //
      // Now we only call renderer.render() when something actually changed:
      //   - model loaded / settings changed → markDirty()
      //   - user drags / scrolls → markDirty() in event handlers
      //   - auto-spin active → renders every frame (still needed for smooth rotation)
      //   - light auto-rotate → renders every frame
      //
      // When idle (model loaded, nothing moving), GPU load drops to ~0%.
      let _dirty = true; // start dirty so first frame renders
      const markDirty = () => { _dirty = true; };

      // Offscreen paint canvas — 512×512 transparent buffer for UV painting
      const _paintCanvas = document.createElement('canvas');
      _paintCanvas.width = 512;
      _paintCanvas.height = 512;
      _paintCanvas.getContext('2d', { willReadFrequently: true });

      S.current = {
        THREE, scene, camera, renderer, grid, lightGroup, placeholder,
        model: null, origMaterials: new Map(), cam,
        sunLight, _camDir: null,
        _wireCache: new Map(), _clayMats: new Map(), _uvMats: new Map(), _segEdgeCache: new Map(),
        autoSpin, lightAutoRotate, lightAutoRotateSpeed,
        drag: { active: false, mode: 'orbit', x: 0, y: 0 },
        // 3D Paint
        raycaster: new THREE.Raycaster(),
        mouse: new THREE.Vector2(),
        paintTexture: null,
        _paintCanvas,
        _paintActive: false,
        _paintMeshes: null,
        _paintSurfaces: new Map(),
        _paintOverlayByMesh: new Map(),
        _currentPaintStroke: null,
        // Smooth camera targets
        camTarget: { ...cam },
        lerpFactor: 0.08,
        frame: null,
        markDirty,
        pmremGenerator, envTexture,
      };

      applyLights(S.current, lightMode, color, lightStrength, lightRotation, dramaticColor, viewMode, lightElevation);
      applyViewMode(S.current, viewMode);
      setSceneBg(S.current, bgColor);

      const timer = new THREE.Timer();
      const loop = () => {
        S.current.frame = requestAnimationFrame(loop);
        timer.update();
        const dt = timer.getDelta();
        const spinning = S.current.autoSpin && !S.current.drag.active;
        const lightMoving = S.current.lightAutoRotate;

        // ── CAMERA INERTIA (LERP) ───────────────────────────────────────────
        const { cam, camTarget, lerpFactor } = S.current;
        let camChanged = false;

        // Smoothly interpolate current camera values toward targets
        const lerp = (cur, tar, f) => {
          const delta = tar - cur;
          if (Math.abs(delta) < 0.0001) return tar;
          camChanged = true;
          return cur + delta * f;
        };
        const lerpTheta = (cur, tar, f) => {
          let delta = tar - cur;
          delta = ((delta + Math.PI) % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2) - Math.PI;
          if (Math.abs(delta) < 0.0001) return tar;
          camChanged = true;
          return cur + delta * f;
        };

        if (spinning) {
          camTarget.theta += 0.004;
          if (camTarget.theta > Math.PI * 2) camTarget.theta -= Math.PI * 2;
        }

        cam.theta = lerpTheta(cam.theta, camTarget.theta, lerpFactor);
        cam.phi = lerp(cam.phi, camTarget.phi, lerpFactor);
        cam.radius = lerp(cam.radius, camTarget.radius, lerpFactor);
        cam.panX = lerp(cam.panX, camTarget.panX, lerpFactor);
        cam.panY = lerp(cam.panY, camTarget.panY, lerpFactor);
        cam.panZ = lerp(cam.panZ ?? 0, camTarget.panZ ?? 0, lerpFactor);

        if (camChanged) {
          syncCamera(camera, cam);
          _dirty = true;
        }

        // ── 3D PAINT: geometry-sharing overlay (no model clone, no shader injection) ──
        const { paintMode: _pm } = paintRef.current;
        if (_pm && S.current.model && !S.current._paintActive) {
          const emptyPaintMat = getEmptyPaintMaterial(S.current);
          const paintMeshes = [];
          const overlayMeshes = [];
          const overlayByMesh = new Map();
          S.current.model.traverse(node => {
            if (!node.isMesh || node.userData.isGround || node.userData.isWireframeOverlay || node.userData.isRigOverlay) return;
            paintMeshes.push(node);
            const originalMats = Array.isArray(node.material) ? node.material : [node.material];
            const overlayMaterial = Array.isArray(node.material)
              ? originalMats.map((_, index) => S.current._paintSurfaces?.get(getPaintSurfaceKey(node.uuid, index))?.material || emptyPaintMat)
              : (S.current._paintSurfaces?.get(getPaintSurfaceKey(node.uuid, 0))?.material || emptyPaintMat);
            const ov = node.isSkinnedMesh
              ? new THREE.SkinnedMesh(node.geometry, overlayMaterial)
              : new THREE.Mesh(node.geometry, overlayMaterial);
            if (node.isSkinnedMesh && node.skeleton) {
              ov.bind(node.skeleton, node.bindMatrix);
              if (node.bindMatrixInverse) ov.bindMatrixInverse.copy(node.bindMatrixInverse);
            }
            ov.position.copy(node.position);
            ov.quaternion.copy(node.quaternion);
            ov.scale.copy(node.scale);
            ov.renderOrder = 20;
            ov.frustumCulled = false;
            ov.userData._isPaintOverlay = true;
            node.parent?.add(ov);
            overlayMeshes.push(ov);
            overlayByMesh.set(node.uuid, ov);
          });
          S.current._paintOverlayMeshes = overlayMeshes;
          S.current._paintOverlayByMesh = overlayByMesh;
          S.current._paintMeshes = paintMeshes;
          S.current._paintActive = true;
          _dirty = true;
        } else if (!_pm && S.current._paintActive) {
          // Remove overlay meshes
          if (S.current._paintOverlayMeshes?.length) {
            S.current._paintOverlayMeshes.forEach((mesh) => {
              mesh.parent?.remove(mesh);
            });
            S.current._paintOverlayMeshes = null;
          }
          S.current._paintActive = false;
          S.current._paintMeshes = null;
          S.current._paintOverlayByMesh = new Map();
          _dirty = true;
        }

        if (lightMoving) {
          S.current.lightGroup.rotation.y += S.current.lightAutoRotateSpeed * dt;
          _dirty = true;
        }
        // Animation mixer update — plays GLTF/FBX animation clips
        if (S.current._mixer) {
          S.current._mixer.update(dt);
          if (S.current._rigBoneData) updateRigOverlay(S.current);
          _dirty = true;
        }

        // Only render when something changed
        if (_dirty) {
          renderer.render(scene, camera);
          _dirty = false;
        }
      };
      loop();

      // Throttled resize — was firing on every pixel of drag, hammering the GPU
      resizeObs = new ResizeObserver(() => {
        if (resizeTimer) return;
        resizeTimer = setTimeout(() => {
          resizeTimer = null;
          if (!S.current) return;
          const w = el.clientWidth, h = el.clientHeight;
          if (w === 0 || h === 0) return;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
          markDirty();
        }, 100);
      });
      resizeObs.observe(el);

      if (onReady) onReady(S.current);
    })().catch(console.error);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObs?.disconnect();
      if (S.current?.frame) cancelAnimationFrame(S.current.frame);
      if (S.current?._mixer) { S.current._mixer.stopAllAction(); S.current._mixer = null; }
      if (S.current?.pmremGenerator) S.current.pmremGenerator.dispose();
      if (S.current?.envTexture) S.current.envTexture.dispose();
      disposePaintResources(S.current);
      if (S.current?.renderer) {
        S.current.renderer.dispose();
        if (el.contains(S.current.renderer.domElement)) el.removeChild(S.current.renderer.domElement);
      }
    };
  }, []); // eslint-disable-line

  useEffect(() => { if (S.current) { S.current.autoSpin = autoSpin; S.current.markDirty?.(); } }, [autoSpin]);
  useEffect(() => { if (S.current?.scene) setSceneBg(S.current, bgColor); }, [bgColor]);

  useEffect(() => {
    if (S.current?.grid) {
      setGridColor(S.current,
        parseInt(gridColor1.replace('#', ''), 16),
        parseInt(gridColor2.replace('#', ''), 16),
      );
    }
  }, [gridColor1, gridColor2]);

  useEffect(() => {
    if (!S.current?.scene) return;
    applyViewMode(S.current, viewMode);
    applyWireframeOverlay(S.current, wireframeOverlay, wireOpacity, wireHexColor);

    const p = lightParamsRef.current;
    applyLights(S.current, p.lightMode, p.color, p.lightStrength, p.lightRotation, p.dramaticColor, viewMode, p.lightElevation);
  }, [viewMode]); // eslint-disable-line

  useEffect(() => {
    if (!S.current?.scene) return;
    applyWireframeOverlay(S.current, wireframeOverlay, wireOpacity, wireHexColor);
  }, [wireframeOverlay, wireOpacity, wireHexColor]);

  useEffect(() => {
    if (S.current) { S.current._segmentHighlight = segmentHighlight; S.current._segmentEdgeColor = segmentEdgeColor; }
    if (!S.current?.scene) return;
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    // Highlight if EITHER the toggle is on OR viewMode is 'segment'
    const shouldShowSeg = segmentHighlight || viewMode === 'segment';

    if (!shouldShowSeg) {
      applySegmentHighlight(S.current, false, segmentEdgeColor, {
        onComplete: () => { if (onSegmentProcessing) onSegmentProcessing(false); },
      });
      return;
    }

    const isFirstTime = !!(S.current.model && !S.current._segEdgeCache?.size);

    if (isFirstTime && onSegmentProcessing) onSegmentProcessing(true);
    segmentTimerRef.current = setTimeout(() => {
      segmentTimerRef.current = null;
      applySegmentHighlight(S.current, true, segmentEdgeColor, {
        async: isFirstTime,
        batchSize: 2,
        edgeBatchSize: 1,
        frameBudget: 5,
        onComplete: () => { if (onSegmentProcessing) onSegmentProcessing(false); },
      });
    }, isFirstTime ? 140 : 0);
  }, [segmentHighlight, segmentEdgeColor, viewMode]);

  useEffect(() => {
    if (!S.current?.scene) return;
    applyRigSkeletonOverlay(S.current, showRig);
  }, [showRig]);

  useEffect(() => {
    if (!S.current?.scene) return;
    applyLights(S.current, lightMode, color, lightStrength, lightRotation, dramaticColor, viewMode, lightElevation);
  }, [lightMode, color, lightStrength, lightRotation, lightElevation, dramaticColor]); // eslint-disable-line

  useEffect(() => {
    if (!S.current) return;
    S.current.lightAutoRotate = lightAutoRotate;
    S.current.lightAutoRotateSpeed = lightAutoRotateSpeed;
    if (!lightAutoRotate) S.current.lightGroup.rotation.y = (lightRotation * Math.PI) / 180;
    S.current.lightGroup.rotation.x = ((lightElevation - 45) * Math.PI) / 180;
    S.current.markDirty?.();
  }, [lightAutoRotate, lightAutoRotateSpeed, lightRotation, lightElevation]);

  useEffect(() => {
    if (S.current?.grid) { S.current.grid.visible = showGrid; S.current.markDirty?.(); }
  }, [showGrid]);

  useEffect(() => {
    if (!modelUrl || !S.current?.scene) return;
    if (onSegmentProcessing) onSegmentProcessing(false);
    // Blob URL-nél nincs kiterjesztés — azok mindig GLB (fetchGlbAsBlob hozza létre)
    if (!modelUrl.startsWith('blob:')) {
      const cleanPath = modelUrl.split('?')[0].split('#')[0];
      const lastSegment = cleanPath.split('/').pop() || "";
      const ext = lastSegment.includes('.') ? lastSegment.split('.').pop().toLowerCase() : "";
      const knownNonModelExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg', 'mp4', 'webm', 'mov']);
      if (knownNonModelExts.has(ext)) {
        // FIX: ne dobjuk el csendben — értesítsük a szülőt hogy ez nem renderelhető
        // (most már az FBX is támogatott)
        console.warn('ThreeViewer: nem modell URL, kihagyva:', modelUrl);
        onTextureAvailabilityChange?.(false);
        onUvOverlapChange?.(false);
        if (onNonGlbUrl) onNonGlbUrl(modelUrl, ext);
        return;
      }
    }
    onTextureAvailabilityChange?.(false);
    onUvOverlapChange?.(false);
    disposePaintResources(S.current);
    loadGLB(
      S.current,
      modelUrl,
      viewMode,
      autoSpin,
      wireframeOverlay,
      wireOpacity,
      wireHexColor,
      showRig,
      onRigDetected,
      segmentHighlight,
      segmentEdgeColor,
      (model) => {
        onTextureAvailabilityChange?.(modelHasTextures(model));
        onUvOverlapChange?.(modelHasUvOverlapSuspicion(model));
      }
    );
    if (onAnimClipsDetected) {
      const clips = S.current._animClips || [];
      onAnimClipsDetected(clips.map((c, i) => ({ index: i, name: c.name || `Clip ${i + 1}`, duration: c.duration })));
    }
  }, [modelUrl]); // eslint-disable-line

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!S.current) return;
      applyExponentialZoom(S.current.camTarget, e.deltaY, 0.5, 30);
      if (S.current.autoSpin) { S.current.autoSpin = false; if (onSpinStop) onSpinStop(); }
      S.current.markDirty?.();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onSpinStop]);

  // Cinematic Re-centering logic
  const ctx = useContext(StudioLayoutContext);
  const smoothL = ctx?.smoothL;
  const smoothR = ctx?.smoothR;

  // Post-Cinematic Update: Centering is now handled by StudioLayout container padding.
  // This avoids double-offsetting and ensures the 3D canvas is always perfectly sized to the visible gap.
  const updateCameraOffset = (l, r) => {
    if (!S.current?.camera) return;
    const canvas = S.current.renderer.domElement;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;

    // Reset view offset to centered (full canvas)
    S.current.camera.clearViewOffset();
    S.current.camera.updateProjectionMatrix();
    S.current.markDirty?.();
  };

  // Synchronize with motion values if they exist
  useMotionValueEvent(smoothL || { get: () => leftOffset, on: () => { } }, "change", (latest) => {
    updateCameraOffset(latest, smoothR?.get() || 0);
  });
  useMotionValueEvent(smoothR || { get: () => rightOffset, on: () => { } }, "change", (latest) => {
    updateCameraOffset(smoothL?.get() || 0, latest);
  });

  // Initial sync and fallback for non-motion props
  useEffect(() => {
    if (smoothL && smoothR) {
      updateCameraOffset(smoothL.get(), smoothR.get());
    } else {
      updateCameraOffset(leftOffset, rightOffset);
    }
  }, [leftOffset, rightOffset, smoothL, smoothR]);


  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!S.current) return;
    const { paintMode: pm } = paintRef.current;
    let dragMode = 'orbit';
    if (pm && e.button === 0 && !e.shiftKey) {
      dragMode = 'paint';
    } else if (e.button === 0 && e.shiftKey) {
      dragMode = 'orbit';
    } else if (e.button !== 0) {
      dragMode = 'pan';
    }
    S.current.drag = { active: true, mode: dragMode, x: e.clientX, y: e.clientY };
    if (S.current.autoSpin) { S.current.autoSpin = false; if (onSpinStop) onSpinStop(); }

    // Paint first dot on pointerdown; per-surface undo snapshots are captured
    // after raycast resolves the actual mesh/material target.
    if (dragMode === 'paint') {
      S.current._currentPaintStroke = new Map();
      _doPaint(e);
    }
  }, [onSpinStop]);

  // ── PRE-RENDERED BRUSH STAMP (cached offscreen canvas) ──────────────
  // Instead of calling createRadialGradient() per stamp (50+ times per
  // pointer event), we pre-render ONE soft circle to a tiny offscreen
  // canvas and blit it with drawImage() — orders of magnitude faster.
  const _brushStampRef = useRef({ canvas: null, color: '', size: 0, hardness: -1 });

  const _getStamp = (color, size, hardness = 60) => {
    const b = _brushStampRef.current;
    if (b.canvas && b.color === color && b.size === size && b.hardness === hardness) return b.canvas;
    const diam = Math.max(2, Math.ceil(size * 2));
    const c = document.createElement('canvas');
    c.width = diam; c.height = diam;
    const ctx = c.getContext('2d');
    const r = diam / 2;
    if (hardness >= 95) {
      // Fully solid flat circle — no gradient, no shadow at all
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const solidStop = (hardness / 100) * 0.9;
      const grad = ctx.createRadialGradient(r, r, r * Math.max(0.01, solidStop), r, r, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(r, r, r * Math.max(0.01, solidStop), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
    }
    b.canvas = c; b.color = color; b.size = size; b.hardness = hardness;
    return c;
  };

  // ── RAF-THROTTLED PAINT ─────────────────────────────────────────────
  // Pointer events fire at 60-240Hz. Raycasting + canvas draw + GPU
  // texture upload per event destroys FPS. Instead we queue the latest
  // pointer position and process it once per animation frame.
  const _paintQueueRef = useRef(null);

  const _flushPaint = useCallback(() => {
    const e = _paintQueueRef.current;
    _paintQueueRef.current = null;
    if (!e || !S.current || !S.current._paintActive) return;

    const { raycaster, mouse, camera } = S.current;
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Only intersect original source meshes — never overlay/wireframe/rig helpers.
    const meshes = (S.current._paintMeshes || []).filter(
      m => !m.userData._isPaintOverlay && !m.userData.isWireframeOverlay && !m.userData.isRigOverlay
    );
    if (meshes.length === 0) return;
    raycaster.firstHitOnly = true;
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0 || !intersects[0].uv) return;

    const { paintColor: pc, paintSize: ps, paintOpacity: po = 0.35, paintHardness: ph = 60 } = paintRef.current;
    const hit = intersects[0];
    const materialIndex = Math.max(0, hit.face?.materialIndex ?? 0);
    S.current._lastPaintTarget = { meshUuid: hit.object.uuid, materialIndex };
    const surface = getOrCreatePaintSurface(S.current, hit.object, materialIndex);
    const cvs = surface?.canvas;
    if (!cvs) return;
    const ctx2d = cvs.getContext('2d');
    const curX = hit.uv.x * cvs.width;
    const curY = (1 - hit.uv.y) * cvs.height;
    const brushScale = Math.max(cvs.width, cvs.height) / 512;
    const radius = Math.max(0.5, ps * brushScale);
    const stamp = _getStamp(pc, radius, ph);
    const stampR = stamp.width / 2;

    if (S.current._currentPaintStroke && !S.current._currentPaintStroke.has(surface.key)) {
      S.current._currentPaintStroke.set(surface.key, {
        key: surface.key,
        surface,
        imageData: ctx2d.getImageData(0, 0, cvs.width, cvs.height),
      });
    }

    const prevAlpha = ctx2d.globalAlpha;
    ctx2d.globalAlpha = Math.max(0.01, Math.min(1, po));

    // ── 3D-PROXIMITY TRIANGLE MASKING ─────────────────────────────────────
    // Instead of painting the stamp at the raw UV hit point (which bleeds
    // through mirrored/overlapping UV islands), we:
    //  1. Compute the 3D world-space hit point
    //  2. Find ALL triangles in this mesh whose centres are within brush
    //     radius in 3D space
    //  3. Clip (mask) the paint canvas to ONLY those triangles' UV footprints
    //  4. Draw the stamp inside that mask
    // This guarantees paint only lands on the triangles the user actually
    // sees under the brush, even when the UV map is mirrored/overlapping.

    const hitPoint3D = hit.point; // world-space Vector3
    const mesh = hit.object;
    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    const uvAttr = geo.attributes.uv;
    const indexAttr = geo.index;

    // Compute world-space brush radius.  The brush size is in UV-canvas
    // pixels, so we need a heuristic 3D radius.  Use the hit face size
    // as a reference for UV-to-world scale.
    const _faceWorldSize = (() => {
      const f = hit.face;
      if (!f || !posAttr) return 1;
      const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
      _a.fromBufferAttribute(posAttr, f.a);
      _b.fromBufferAttribute(posAttr, f.b);
      _c.fromBufferAttribute(posAttr, f.c);
      if (mesh.matrixWorld) { _a.applyMatrix4(mesh.matrixWorld); _b.applyMatrix4(mesh.matrixWorld); _c.applyMatrix4(mesh.matrixWorld); }
      return Math.max(_a.distanceTo(_b), _b.distanceTo(_c), _a.distanceTo(_c));
    })();
    const _faceUvSize = (() => {
      const f = hit.face;
      if (!f || !uvAttr) return 1;
      const ua = new THREE.Vector2(), ub = new THREE.Vector2(), uc = new THREE.Vector2();
      ua.fromBufferAttribute(uvAttr, f.a);
      ub.fromBufferAttribute(uvAttr, f.b);
      uc.fromBufferAttribute(uvAttr, f.c);
      const maxUvEdge = Math.max(
        Math.hypot((ua.x - ub.x) * cvs.width, (ua.y - ub.y) * cvs.height),
        Math.hypot((ub.x - uc.x) * cvs.width, (ub.y - uc.y) * cvs.height),
        Math.hypot((ua.x - uc.x) * cvs.width, (ua.y - uc.y) * cvs.height),
      );
      return maxUvEdge || 1;
    })();
    // World units per UV-canvas pixel
    const worldPerPx = _faceWorldSize / _faceUvSize;
    const worldBrushR = radius * worldPerPx * 1.15; // slight padding

    // Collect nearby-triangle UV footprints
    const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
    const nearbyTriUvs = []; // [{ax,ay, bx,by, cx,cy}]
    const _v = new THREE.Vector3();
    const _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3();

    for (let t = 0; t < triCount; t++) {
      const ia = indexAttr ? indexAttr.getX(t * 3) : t * 3;
      const ib = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
      const ic = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

      // Filter by material group
      if (geo.groups?.length) {
        let triMatIdx = 0;
        for (const g of geo.groups) {
          if (t * 3 >= g.start && t * 3 < g.start + g.count) { triMatIdx = g.materialIndex ?? 0; break; }
        }
        if (triMatIdx !== materialIndex) continue;
      }

      _va.fromBufferAttribute(posAttr, ia);
      _vb.fromBufferAttribute(posAttr, ib);
      _vc.fromBufferAttribute(posAttr, ic);
      if (mesh.matrixWorld) {
        _va.applyMatrix4(mesh.matrixWorld);
        _vb.applyMatrix4(mesh.matrixWorld);
        _vc.applyMatrix4(mesh.matrixWorld);
      }
      // Triangle centre
      _v.set((_va.x + _vb.x + _vc.x) / 3, (_va.y + _vb.y + _vc.y) / 3, (_va.z + _vb.z + _vc.z) / 3);
      const distToHit = _v.distanceTo(hitPoint3D);
      // Also check individual vertices — for very large tris the centre
      // can be far but a vertex can be right under the brush.
      const minVertDist = Math.min(_va.distanceTo(hitPoint3D), _vb.distanceTo(hitPoint3D), _vc.distanceTo(hitPoint3D));
      if (distToHit > worldBrushR && minVertDist > worldBrushR) continue;

      if (!uvAttr) continue;
      const uva = new THREE.Vector2().fromBufferAttribute(uvAttr, ia);
      const uvb = new THREE.Vector2().fromBufferAttribute(uvAttr, ib);
      const uvc = new THREE.Vector2().fromBufferAttribute(uvAttr, ic);
      nearbyTriUvs.push({
        ax: uva.x * cvs.width, ay: (1 - uva.y) * cvs.height,
        bx: uvb.x * cvs.width, by: (1 - uvb.y) * cvs.height,
        cx: uvc.x * cvs.width, cy: (1 - uvc.y) * cvs.height,
      });
    }

    if (nearbyTriUvs.length === 0) {
      // Fallback: if no nearby tris found (e.g. no UV attr), paint naively
      ctx2d.drawImage(stamp, curX - stampR, curY - stampR);
    } else {
      // Build a clipping path from nearby triangle UV footprints, then
      // draw the stamp only inside that region.
      ctx2d.save();
      ctx2d.beginPath();
      for (const tri of nearbyTriUvs) {
        ctx2d.moveTo(tri.ax, tri.ay);
        ctx2d.lineTo(tri.bx, tri.by);
        ctx2d.lineTo(tri.cx, tri.cy);
        ctx2d.closePath();
      }
      ctx2d.clip();

      // Paint with interpolation from last point (smooth strokes)
      const last = S.current._lastPaintUV;
      const screenOk = last && last.targetKey === surface.key && Math.hypot(e.clientX - last.sx, e.clientY - last.sy) < 80;

      if (last && screenOk) {
        const dx = curX - last.x;
        const dy = curY - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cvs.width * 0.25) {
          const step = Math.max(1, radius * 0.4);
          const steps = Math.ceil(dist / step);
          for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 1 : i / steps;
            ctx2d.drawImage(stamp, last.x + dx * t - stampR, last.y + dy * t - stampR);
          }
        } else {
          ctx2d.drawImage(stamp, curX - stampR, curY - stampR);
        }
      } else {
        ctx2d.drawImage(stamp, curX - stampR, curY - stampR);
      }
      ctx2d.restore();
    }

    ctx2d.globalAlpha = prevAlpha;
    S.current._lastPaintUV = { x: curX, y: curY, sx: e.clientX, sy: e.clientY, targetKey: surface.key };
    surface.touchedAt = Date.now();
    surface.texture.needsUpdate = true;
    S.current.markDirty();
  }, []);

  const _doPaint = useCallback((e) => {
    const first = !_paintQueueRef.current;
    _paintQueueRef.current = e;
    if (first) requestAnimationFrame(_flushPaint);
  }, [_flushPaint]);

  const onPointerMove = useCallback((e) => {
    if (!S.current) return;
    const { drag } = S.current;

    // 3D paint: draw on model surface via raycasting
    if (drag.active && drag.mode === 'paint') {
      _doPaint(e);
      return;
    }

    if (!drag.active) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    const { mode } = drag;
    const { camTarget } = S.current;

    if (mode === 'model') {
      const targetMesh = S.current.model || S.current.placeholder;
      if (targetMesh) targetMesh.rotation.y += dx * 0.012;
    } else if (mode === 'pan') {
      const spd = S.current.cam.radius * 0.0018;
      const { theta, phi } = S.current.cam;
      // Screen-space pan: mouse X → horizontal screen axis, mouse Y → vertical screen axis
      // Right vector (screen X) = perpendicular to view direction in XZ plane
      const rightX = Math.cos(theta);
      const rightZ = -Math.sin(theta);
      // Up vector (screen Y) = perpendicular to view direction in vertical plane
      const upX = -Math.cos(phi) * Math.sin(theta);
      const upY = Math.sin(phi);
      const upZ = -Math.cos(phi) * Math.cos(theta);
      camTarget.panX -= dx * spd * rightX + dy * spd * upX;
      camTarget.panY -= dy * spd * upY;
      camTarget.panZ = (camTarget.panZ ?? 0) - dx * spd * rightZ - dy * spd * upZ;
    } else {
      camTarget.theta -= dx * 0.007;
      camTarget.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camTarget.phi - dy * 0.007));
    }
    S.current.markDirty?.();
  }, []);

  const onPointerUp = useCallback(() => {
    if (S.current) {
      if (S.current._currentPaintStroke?.size) {
        if (!S.current._paintHistory) S.current._paintHistory = [];
        S.current._paintHistory.push([...S.current._currentPaintStroke.values()]);
        if (S.current._paintHistory.length > 20) S.current._paintHistory.shift();
      }
      S.current._currentPaintStroke = null;
      S.current.drag.active = false;
      S.current._lastPaintUV = null;
    }
  }, []);

  const onDoubleClick = useCallback((e) => {
    if (!S.current || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    focusOnHit(S.current, ndcX, ndcY);
  }, []);

  // ── CACHED BRUSH CURSOR ─────────────────────────────────────────────
  const _cursorCacheRef = useRef({ val: 'crosshair', color: '', size: 0 });

  const getBrushCursor = () => {
    const { paintMode: pm, paintColor: pc, paintSize: ps } = paintRef.current;
    if (!pm) return 'crosshair';
    const cc = _cursorCacheRef.current;
    if (cc.color === pc && cc.size === ps) return cc.val;
    const diam = Math.max(12, Math.min(128, Math.round(ps * 2)));
    const r = diam / 2;
    const circleR = Math.max(1, r - 0.5);
    // Solid filled circle — single flat colour, no shadow, no glow
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${diam}' height='${diam}' viewBox='0 0 ${diam} ${diam}'><circle cx='${r}' cy='${r}' r='${circleR}' fill='${pc}' fill-opacity='0.55' stroke='${pc}' stroke-width='1'/></svg>`;
    cc.val = `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${r} ${r}, crosshair`;
    cc.color = pc; cc.size = ps;
    return cc.val;
  };

  const getCursor = () => {
    const { paintMode: pm } = paintRef.current;
    if (pm && (!S.current?.drag?.active || S.current?.drag?.mode === 'paint')) return getBrushCursor();
    if (!S.current?.drag?.active) return 'grab';
    if (S.current.drag.mode === 'paint') return getBrushCursor();
    return S.current.drag.mode === 'model' ? 'ew-resize' : 'grabbing';
  };

  useImperativeHandle(ref, () => ({
    undoPaint: () => {
      if (!S.current?._paintHistory?.length) return;
      const stroke = S.current._paintHistory.pop();
      stroke.forEach(({ key, imageData }) => {
        const surface = S.current._paintSurfaces?.get(key);
        const ctx = surface?.canvas?.getContext('2d');
        if (!surface || !ctx) return;
        ctx.putImageData(imageData, 0, 0);
        surface.texture.needsUpdate = true;
      });
      S.current.markDirty();
    },
    clearPaint: () => {
      if (!S.current?._paintSurfaces) return;
      S.current._paintSurfaces.forEach((surface) => {
        const ctx = surface.canvas.getContext('2d');
        ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
        surface.texture.needsUpdate = true;
      });
      S.current._paintHistory = [];
      S.current._lastPaintTarget = null;
      S.current.markDirty();
      },
    hasModelTextures: () => modelHasTextures(S.current?.model),
    hasPaintStrokes: () => !!getLatestPaintSurface(S.current),
    getPaintedTextureBlob: () => createPaintedTextureBlob(S.current),
  }));

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: getCursor(), touchAction: 'none', userSelect: 'none', position: 'relative', zIndex: 0 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={e => e.preventDefault()}
    />
  );
}));

export default ThreeViewer;

