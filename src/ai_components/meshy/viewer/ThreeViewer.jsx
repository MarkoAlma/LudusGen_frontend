import React, { useRef, useEffect, useCallback, useContext } from "react";
import { useMotionValueEvent } from "framer-motion";
import { StudioLayoutContext } from "../../../components/shared/StudioLayout";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import {
  syncCamera, buildPlaceholder,
  createSunLight,
  applyLights, applyViewMode, applyWireframeOverlay,
  setSceneBg, setGridColor, loadGLB,
} from './threeHelpers';

export default function ThreeViewer({
  color, viewMode, lightMode, showGrid,
  modelUrl, onReady,
  leftOffset = 0,
  rightOffset = 0,
  lightStrength = 1,
  lightRotation = 0,
  lightAutoRotate = false,
  lightAutoRotateSpeed = 0.5,
  dramaticColor = null,
  wireframeOverlay = false,
  wireOpacity = 0.22,
  wireHexColor = 0xffffff,
  autoSpin = false,
  onSpinStop,
  onNonGlbUrl,
  bgColor = 'default',
  gridColor1 = '#1e1e3a',
  gridColor2 = '#111128',
}) {
  const mountRef = useRef(null);
  const S = useRef(null);

  const lightParamsRef = useRef({ lightMode, color, lightStrength, lightRotation, dramaticColor });
  useEffect(() => {
    lightParamsRef.current = { lightMode, color, lightStrength, lightRotation, dramaticColor };
  }, [lightMode, color, lightStrength, lightRotation, dramaticColor]);

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
      renderer.toneMappingExposure = 1.4;
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.sortObjects = false;
      el.appendChild(renderer.domElement);

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

      const cam = { theta: 0.4, phi: Math.PI / 3, radius: 8, panX: 0, panY: 0 };
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

      S.current = {
        THREE, scene, camera, renderer, grid, lightGroup, placeholder,
        model: null, origMaterials: new Map(), cam,
        sunLight, _camDir: null,
        _wireCache: new Map(), _clayMats: new Map(), _uvMats: new Map(),
        autoSpin, lightAutoRotate, lightAutoRotateSpeed,
        drag: { active: false, mode: 'orbit', x: 0, y: 0 },
        frame: null,
        markDirty,
      };

      applyLights(S.current, lightMode, color, lightStrength, lightRotation, dramaticColor, viewMode);
      applyViewMode(S.current, viewMode);
      setSceneBg(S.current, bgColor);

      const timer = new THREE.Timer();
      const loop = () => {
        S.current.frame = requestAnimationFrame(loop);
        timer.update();
        const dt = timer.getDelta();
        const spinning = S.current.autoSpin && !S.current.drag.active;
        const lightMoving = S.current.lightAutoRotate;

        if (spinning) {
          S.current.cam.theta += 0.004;
          // FIX: normalize theta to prevent floating-point drift during long sessions
          if (S.current.cam.theta > Math.PI * 2) S.current.cam.theta -= Math.PI * 2;
          syncCamera(camera, S.current.cam);
          _dirty = true;
        }
        if (lightMoving) {
          S.current.lightGroup.rotation.y += S.current.lightAutoRotateSpeed * dt;
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
    applyLights(S.current, p.lightMode, p.color, p.lightStrength, p.lightRotation, p.dramaticColor, viewMode);
  }, [viewMode]); // eslint-disable-line

  useEffect(() => {
    if (!S.current?.scene) return;
    applyWireframeOverlay(S.current, wireframeOverlay, wireOpacity, wireHexColor);
  }, [wireframeOverlay, wireOpacity, wireHexColor]);

  useEffect(() => {
    if (!S.current?.scene) return;
    applyLights(S.current, lightMode, color, lightStrength, lightRotation, dramaticColor, viewMode);
  }, [lightMode, color, lightStrength, lightRotation, dramaticColor]); // eslint-disable-line

  useEffect(() => {
    if (!S.current) return;
    S.current.lightAutoRotate = lightAutoRotate;
    S.current.lightAutoRotateSpeed = lightAutoRotateSpeed;
    if (!lightAutoRotate) S.current.lightGroup.rotation.y = (lightRotation * Math.PI) / 180;
    S.current.markDirty?.();
  }, [lightAutoRotate, lightAutoRotateSpeed, lightRotation]);

  useEffect(() => {
    if (S.current?.grid) { S.current.grid.visible = showGrid; S.current.markDirty?.(); }
  }, [showGrid]);

  useEffect(() => {
    if (!modelUrl || !S.current?.scene) return;
    // Blob URL-nél nincs kiterjesztés — azok mindig GLB (fetchGlbAsBlob hozza létre)
    if (!modelUrl.startsWith('blob:')) {
      const ext = modelUrl.split('?')[0].split('.').pop().toLowerCase();
      if (!['glb', 'gltf', 'fbx'].includes(ext)) {
        // FIX: ne dobjuk el csendben — értesítsük a szülőt hogy ez nem renderelhető
        // (most már az FBX is támogatott)
        console.warn('ThreeViewer: nem GLB/GLTF/FBX URL, kihagyva:', modelUrl);
        if (onNonGlbUrl) onNonGlbUrl(modelUrl, ext);
        return;
      }
    }
    loadGLB(S.current, modelUrl, viewMode, autoSpin, wireframeOverlay, wireOpacity, wireHexColor);
  }, [modelUrl]); // eslint-disable-line

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!S.current) return;
      const delta = e.deltaY > 0 ? 0.5 : -0.5;
      S.current.cam.radius = Math.max(0.5, Math.min(30, S.current.cam.radius + delta));
      syncCamera(S.current.camera, S.current.cam);
      S.current.markDirty?.();
      if (S.current.autoSpin) { S.current.autoSpin = false; if (onSpinStop) onSpinStop(); }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onSpinStop]);

  // Cinematic Re-centering logic
  const ctx = useContext(StudioLayoutContext);
  const smoothL = ctx?.smoothL;
  const smoothR = ctx?.smoothR;

  const updateCameraOffset = (l, r) => {
    if (!S.current?.camera) return;
    const canvas = S.current.renderer.domElement;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    
    // In Overlay Mode, the canvas is full-screen.
    // To center the model in the visible gap:
    // Gap Width = FullWidth - l - r
    // Gap Center = l + GapWidth / 2 = (l + FullWidth - r) / 2
    // Screen Center = FullWidth / 2
    // Desired Shift (dx) = Gap Center - Screen Center = (l - r) / 2
    const dx = (l - r) / 2;
    
    // setViewOffset(fullW, fullH, xOffset, yOffset, width, height)
    // We shift the sub-view by -dx to move the original center (model) to the right.
    S.current.camera.setViewOffset(cw, ch, -dx, 0, cw, ch);
    S.current.camera.updateProjectionMatrix();
    S.current.markDirty?.();
  };

  // Synchronize with motion values if they exist
  useMotionValueEvent(smoothL || { get: () => leftOffset, on: () => {} }, "change", (latest) => {
    updateCameraOffset(latest, smoothR?.get() || 0);
  });
  useMotionValueEvent(smoothR || { get: () => rightOffset, on: () => {} }, "change", (latest) => {
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
    let dragMode = 'orbit';
    if (e.button === 0 && e.shiftKey) dragMode = 'model';
    else if (e.button !== 0) dragMode = 'pan';
    S.current.drag = { active: true, mode: dragMode, x: e.clientX, y: e.clientY };
    if (S.current.autoSpin) { S.current.autoSpin = false; if (onSpinStop) onSpinStop(); }
  }, [onSpinStop]);

  const onPointerMove = useCallback((e) => {
    if (!S.current?.drag.active) return;
    const dx = e.clientX - S.current.drag.x;
    const dy = e.clientY - S.current.drag.y;
    S.current.drag.x = e.clientX;
    S.current.drag.y = e.clientY;
    const { mode } = S.current.drag;
    if (mode === 'model') {
      const target = S.current.model || S.current.placeholder;
      if (target) target.rotation.y += dx * 0.012;
    } else if (mode === 'pan') {
      const spd = S.current.cam.radius * 0.0018;
      S.current.cam.panY -= dy * spd;
      S.current.cam.panX -= dx * spd * Math.cos(S.current.cam.theta);
      syncCamera(S.current.camera, S.current.cam);
    } else {
      S.current.cam.theta -= dx * 0.007;
      S.current.cam.phi = Math.max(0.05, Math.min(Math.PI - 0.05, S.current.cam.phi - dy * 0.007));
      syncCamera(S.current.camera, S.current.cam);
    }
    S.current.markDirty?.();
  }, []);

  const onPointerUp = useCallback(() => {
    if (S.current) S.current.drag.active = false;
  }, []);

  const getCursor = () => {
    if (!S.current?.drag?.active) return 'grab';
    return S.current.drag.mode === 'model' ? 'ew-resize' : 'grabbing';
  };

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: getCursor(), touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}