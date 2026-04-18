import React, { useRef, useEffect, useCallback, useContext, forwardRef, useImperativeHandle } from "react";
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
  updateRigOverlay,
  setSceneBg, setGridColor, loadGLB,
  focusOnHit, applyExponentialZoom,
} from './threeHelpers';

const ThreeViewer = forwardRef(({
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
  showRig = false,
  autoSpin = false,
  onSpinStop,
  onNonGlbUrl,
  onRigDetected,
  onAnimClipsDetected,
  bgColor = 'default',
  gridColor1 = '#1e1e3a',
  gridColor2 = '#111128',
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

  const lightParamsRef = useRef({ lightMode, color, lightStrength, lightRotation, dramaticColor });
  useEffect(() => {
    lightParamsRef.current = { lightMode, color, lightStrength, lightRotation, dramaticColor };
  }, [lightMode, color, lightStrength, lightRotation, dramaticColor]);

  const paintRef = useRef({ paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef });
  useEffect(() => {
    paintRef.current = { paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef };
  }, [paintMode, paintColor, paintSize, paintOpacity, paintHardness, paintCanvasRef]);

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
        _wireCache: new Map(), _clayMats: new Map(), _uvMats: new Map(),
        autoSpin, lightAutoRotate, lightAutoRotateSpeed,
        drag: { active: false, mode: 'orbit', x: 0, y: 0 },
        // 3D Paint
        raycaster: new THREE.Raycaster(),
        mouse: new THREE.Vector2(),
        paintTexture: null,
        _paintCanvas,
        _paintActive: false,
        _paintMeshes: null,
        // Smooth camera targets
        camTarget: { ...cam },
        lerpFactor: 0.08,
        frame: null,
        markDirty,
        pmremGenerator, envTexture,
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
          // Initialise paint canvas texture if needed
          if (!S.current.paintTexture && S.current._paintCanvas) {
            S.current.paintTexture = new THREE.CanvasTexture(S.current._paintCanvas);
            S.current.paintTexture.colorSpace = THREE.SRGBColorSpace;
          }
          if (S.current.paintTexture) {
            // Create a single shared paint material — transparent, only painted pixels show
            const paintMat = new THREE.MeshBasicMaterial({
              map: S.current.paintTexture,
              transparent: true,
              opacity: 1.0,
              depthTest: true,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -1,
              side: THREE.DoubleSide,
            });
            // Build lightweight overlay meshes that SHARE geometry (no buffer copy)
            const overlayGroup = new THREE.Group();
            overlayGroup.userData._isPaintOverlayGroup = true;
            const paintMeshes = []; // cached for raycasting
            S.current.model.traverse(node => {
              if (!node.isMesh || node.userData.isGround || node.userData.isWireframeOverlay || node.userData.isRigOverlay) return;
              paintMeshes.push(node); // original mesh for raycasting
              const ov = new THREE.Mesh(node.geometry, paintMat);
              ov.matrixAutoUpdate = false;
              ov.matrixWorld = node.matrixWorld; // share world matrix
              ov.userData._isPaintOverlay = true;
              overlayGroup.add(ov);
            });
            scene.add(overlayGroup);
            S.current._paintOverlayGroup = overlayGroup;
            S.current._paintMat = paintMat;
            S.current._paintMeshes = paintMeshes;
          }
          S.current._paintActive = true;
          _dirty = true;
        } else if (!_pm && S.current._paintActive) {
          // Remove overlay group
          if (S.current._paintOverlayGroup) {
            scene.remove(S.current._paintOverlayGroup);
            S.current._paintMat?.dispose();
            S.current._paintOverlayGroup = null;
            S.current._paintMat = null;
          }
          S.current._paintActive = false;
          S.current._paintMeshes = null;
          _dirty = true;
        }
        // Keep overlay transforms in sync if model was moved
        if (S.current._paintActive && S.current._paintOverlayGroup) {
          S.current._paintOverlayGroup.children.forEach(ov => { ov.matrixWorldNeedsUpdate = true; });
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
      if (S.current?.paintTexture) S.current.paintTexture.dispose();
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
    applyRigSkeletonOverlay(S.current, showRig);
  }, [showRig]);

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
    loadGLB(S.current, modelUrl, viewMode, autoSpin, wireframeOverlay, wireOpacity, wireHexColor, showRig, onRigDetected);
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

    // Paint first dot on pointerdown and save snapshot for undo
    if (dragMode === 'paint') {
      if (!S.current._paintHistory) S.current._paintHistory = [];
      const cvs = S.current._paintCanvas;
      if (cvs) {
        // Save current canvas state BEFORE this stroke
        S.current._paintHistory.push(cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height));
        if (S.current._paintHistory.length > 20) S.current._paintHistory.shift(); // keep max 20 undos
      }
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
    const diam = Math.max(2, size * 2);
    const c = document.createElement('canvas');
    c.width = diam; c.height = diam;
    const ctx = c.getContext('2d');
    const r = diam / 2;
    // hardness 0=feathered edge, 100=hard edge
    // soft stop position: hardness=0 → 0.0 (full feather), hardness=100 → 0.95 (nearly solid)
    const softStop = hardness / 100 * 0.95;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(Math.max(0.01, softStop), color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
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

    const meshes = S.current._paintMeshes;
    if (!meshes || meshes.length === 0) return;
    raycaster.firstHitOnly = true;
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0 || !intersects[0].uv) return;

    const { paintColor: pc, paintSize: ps, paintOpacity: po = 0.35, paintHardness: ph = 60 } = paintRef.current;
    const hit = intersects[0];
    const cvs = S.current._paintCanvas;
    if (!cvs) return;
    const ctx2d = cvs.getContext('2d');
    const curX = hit.uv.x * cvs.width;
    const curY = (1 - hit.uv.y) * cvs.height;
    const radius = Math.max(0.5, ps);
    const stamp = _getStamp(pc, radius, ph);
    const stampR = stamp.width / 2;

    const prevAlpha = ctx2d.globalAlpha;
    ctx2d.globalAlpha = Math.max(0.01, Math.min(1, po));

    const last = S.current._lastPaintUV;
    const screenOk = last && Math.hypot(e.clientX - last.sx, e.clientY - last.sy) < 80;

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

    ctx2d.globalAlpha = prevAlpha;
    S.current._lastPaintUV = { x: curX, y: curY, sx: e.clientX, sy: e.clientY };

    if (!S.current.paintTexture) {
      S.current.paintTexture = new THREE.CanvasTexture(cvs);
      S.current.paintTexture.colorSpace = THREE.SRGBColorSpace;
      if (S.current._paintMat) S.current._paintMat.map = S.current.paintTexture;
    }
    S.current.paintTexture.needsUpdate = true;
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
      const { theta } = S.current.cam;
      camTarget.panX -= dx * spd * Math.cos(theta);
      camTarget.panZ = (camTarget.panZ ?? 0) - dx * spd * Math.sin(theta);
      camTarget.panY -= dy * spd;
    } else {
      camTarget.theta -= dx * 0.007;
      camTarget.phi = Math.max(0.05, Math.min(Math.PI - 0.05, camTarget.phi - dy * 0.007));
    }
    S.current.markDirty?.();
  }, []);

  const onPointerUp = useCallback(() => {
    if (S.current) {
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
    const diam = Math.max(6, Math.min(128, ps * 2));
    const r = diam / 2;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${diam}' height='${diam}'><circle cx='${r}' cy='${r}' r='${r - 1}' fill='${pc}' fill-opacity='0.45' stroke='white' stroke-width='1.5'/></svg>`;
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
      if (!S.current?._paintCanvas || !S.current?._paintHistory?.length) return;
      const cvs = S.current._paintCanvas;
      const ctx = cvs.getContext('2d');
      // pop current state
      S.current._paintHistory.pop();
      if (S.current._paintHistory.length > 0) {
        const lastState = S.current._paintHistory[S.current._paintHistory.length - 1];
        ctx.putImageData(lastState, 0, 0);
      } else {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
      }
      if (S.current.paintTexture) S.current.paintTexture.needsUpdate = true;
      S.current.markDirty();
    },
    clearPaint: () => {
      if (!S.current?._paintCanvas) return;
      const cvs = S.current._paintCanvas;
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      S.current._paintHistory = [];
      if (S.current.paintTexture) S.current.paintTexture.needsUpdate = true;
      S.current.markDirty();
    },
    _paintCanvas: S.current?._paintCanvas
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
});

export default ThreeViewer;