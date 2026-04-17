import React, { useRef, useEffect, useCallback, useContext } from "react";
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
  setSceneBg, setGridColor, loadGLB,
  focusOnHit, applyExponentialZoom,
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
  showRig = false,
  autoSpin = false,
  onSpinStop,
  onNonGlbUrl,
  onRigDetected,
  bgColor = 'default',
  gridColor1 = '#1e1e3a',
  gridColor2 = '#111128',
  // 3D Paint Props
  paintMode = false,
  paintColor = '#ffffff',
  paintSize = 10,
  paintCanvasRef = null,
}) {
  const mountRef = useRef(null);
  const S = useRef(null);

  const lightParamsRef = useRef({ lightMode, color, lightStrength, lightRotation, dramaticColor });
  useEffect(() => {
    lightParamsRef.current = { lightMode, color, lightStrength, lightRotation, dramaticColor };
  }, [lightMode, color, lightStrength, lightRotation, dramaticColor]);

  const paintRef = useRef({ paintMode, paintColor, paintSize, paintCanvasRef });
  useEffect(() => {
    paintRef.current = { paintMode, paintColor, paintSize, paintCanvasRef };
  }, [paintMode, paintColor, paintSize, paintCanvasRef]);

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
        paintOverlay: null,
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

        if (spinning) {
          camTarget.theta += 0.004;
          if (camTarget.theta > Math.PI * 2) camTarget.theta -= Math.PI * 2;
        }

        cam.theta = lerp(cam.theta, camTarget.theta, lerpFactor);
        cam.phi = lerp(cam.phi, camTarget.phi, lerpFactor);
        cam.radius = lerp(cam.radius, camTarget.radius, lerpFactor);
        cam.panX = lerp(cam.panX, camTarget.panX, lerpFactor);
        cam.panY = lerp(cam.panY, camTarget.panY, lerpFactor);
        cam.panZ = lerp(cam.panZ ?? 0, camTarget.panZ ?? 0, lerpFactor);

        if (camChanged) {
          syncCamera(camera, cam);
          _dirty = true;
        }

        const { paintMode: _pm } = paintRef.current;
        if (_pm && S.current.model && !S.current.paintOverlay) {
          // Create overlay shell Mesh for painting
          const overlay = S.current.model.clone();
          const paintMat = new THREE.MeshBasicMaterial({
            map: S.current.paintTexture,
            transparent: true,
            opacity: 0.9,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
            side: THREE.DoubleSide
          });
          overlay.traverse(node => {
            if (node.isMesh) {
              node.material = paintMat;
              node.userData.isPaintOverlay = true;
            }
          });
          scene.add(overlay);
          S.current.paintOverlay = overlay;
          _dirty = true;
        } else if (!_pm && S.current.paintOverlay) {
          scene.remove(S.current.paintOverlay);
          S.current.paintOverlay = null; // We keep the texture for next time
          _dirty = true;
        }

        if (lightMoving) {
          S.current.lightGroup.rotation.y += S.current.lightAutoRotateSpeed * dt;
          _dirty = true;
        }
        // Animation mixer update — plays GLTF/FBX animation clips
        if (S.current._mixer) {
          S.current._mixer.update(dt);
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
    let dragMode = 'orbit';
    if (e.button === 0 && e.shiftKey) dragMode = 'model';
    else if (e.button !== 0) dragMode = 'pan';
    S.current.drag = { active: true, mode: dragMode, x: e.clientX, y: e.clientY };
    if (S.current.autoSpin) { S.current.autoSpin = false; if (onSpinStop) onSpinStop(); }
  }, [onSpinStop]);

  const onPointerMove = useCallback((e) => {
    if (!S.current) return;
    const { raycaster, mouse, camera, scene, model, drag } = S.current;

    // Update mouse position for raycasting
    const rect = mountRef.current.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const { paintMode: pm, paintColor: pc, paintSize: ps, paintCanvasRef: pcRef } = paintRef.current;
    if (pm && drag.active && drag.mode === 'orbit') {
      raycaster.setFromCamera(mouse, camera);
      const root = model || S.current.placeholder;
      if (root) {
        const meshes = [];
        root.traverse(node => {
          if (node.isMesh && !node.userData.isGround && !node.userData.isWireframeOverlay
              && !node.userData.isRigOverlay && !node.userData.isPaintOverlay) {
            meshes.push(node);
          }
        });
        const intersects = raycaster.intersectObjects(meshes, false);
        if (intersects.length > 0 && intersects[0].uv && pcRef?.current) {
          const hit = intersects[0];
          const cvs = pcRef.current;
          const ctx2d = cvs.getContext('2d');
          const x = hit.uv.x * cvs.width;
          const y = (1 - hit.uv.y) * cvs.height;

          ctx2d.fillStyle = pc;
          ctx2d.beginPath();
          ctx2d.arc(x, y, ps, 0, Math.PI * 2);
          ctx2d.fill();

          if (!S.current.paintTexture) {
            S.current.paintTexture = new THREE.CanvasTexture(cvs);
            S.current.paintTexture.colorSpace = THREE.SRGBColorSpace;
          }
          S.current.paintTexture.needsUpdate = true;
          S.current.markDirty();
        }
      }
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
    if (S.current) S.current.drag.active = false;
  }, []);

  const onDoubleClick = useCallback((e) => {
    if (!S.current || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    focusOnHit(S.current, ndcX, ndcY);
  }, []);

  const getCursor = () => {
    if (!S.current?.drag?.active) return 'grab';
    return S.current.drag.mode === 'model' ? 'ew-resize' : 'grabbing';
  };

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
}