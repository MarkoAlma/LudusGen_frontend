// viewer/ThreeViewer.jsx — Three.js 3D viewport
import React, { useRef, useEffect, useCallback } from 'react';
import {
  loadScript, syncCamera, buildPlaceholder,
  applyLights, applyViewMode, loadGLB,
} from './threeHelpers';

export default function ThreeViewer({
  color, viewMode, lightMode, showGrid,
  modelUrl, onReady,
  lightStrength = 1,
  lightRotation = 0,
  lightAutoRotate = false,
  lightAutoRotateSpeed = 0.5,
}) {
  const mountRef = useRef(null);
  const S = useRef(null);

  // ── Init Three.js ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let resizeObs;

    (async () => {
      if (!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      if (!window.THREE.GLTFLoader) await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
      const THREE = window.THREE;
      const W = el.clientWidth || 640, H = el.clientHeight || 480;

      const scene    = new THREE.Scene();
      const camera   = new THREE.PerspectiveCamera(45, W / H, 0.01, 500);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      el.appendChild(renderer.domElement);

      const grid = new THREE.GridHelper(20, 40, 0x1e1e3a, 0x111128);
      grid.position.y = -1;
      scene.add(grid);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.3 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1;
      ground.receiveShadow = true;
      scene.add(ground);

      const placeholder = buildPlaceholder(THREE, color);
      scene.add(placeholder);

      const lightGroup = new THREE.Group();
      scene.add(lightGroup);

      const cam = { theta: 0.4, phi: Math.PI / 3, radius: 4, panX: 0, panY: 0 };
      syncCamera(camera, cam);

      S.current = {
        THREE, scene, camera, renderer, grid, lightGroup, placeholder,
        model: null, origMaterials: new Map(), cam,
        autoSpin: true,
        lightAutoRotate: lightAutoRotate,
        lightAutoRotateSpeed: lightAutoRotateSpeed,
        lightRotationOffset: (lightRotation * Math.PI) / 180,
        drag: { active: false, btn: 0, x: 0, y: 0 },
        frame: null,
      };

      applyLights(S.current, lightMode, color, lightStrength, lightRotation);

      const clock = new THREE.Clock();
      const loop = () => {
        S.current.frame = requestAnimationFrame(loop);
        const dt = clock.getDelta();

        // Model auto-spin
        if (S.current.autoSpin && !S.current.drag.active && !S.current.model) {
          S.current.cam.theta += 0.004;
          syncCamera(camera, S.current.cam);
        }
        // Lighting auto-rotate
        if (S.current.lightAutoRotate) {
          S.current.lightGroup.rotation.y += S.current.lightAutoRotateSpeed * dt;
        }

        renderer.render(scene, camera);
      };
      loop();

      resizeObs = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObs.observe(el);

      if (onReady) onReady(S.current);
    })().catch(console.error);

    return () => {
      resizeObs?.disconnect();
      if (S.current?.frame) cancelAnimationFrame(S.current.frame);
      if (S.current?.renderer) {
        S.current.renderer.dispose();
        if (el.contains(S.current.renderer.domElement)) el.removeChild(S.current.renderer.domElement);
      }
    };
  }, []); // eslint-disable-line

  // ── Reactive: viewMode ─────────────────────────────────────────────────────
  useEffect(() => { if (S.current?.scene) applyViewMode(S.current, viewMode); }, [viewMode]);

  // ── Reactive: lighting params ──────────────────────────────────────────────
  useEffect(() => {
    if (!S.current?.scene) return;
    applyLights(S.current, lightMode, color, lightStrength, lightRotation);
  }, [lightMode, color, lightStrength, lightRotation]);

  // ── Reactive: lightAutoRotate ──────────────────────────────────────────────
  useEffect(() => {
    if (!S.current) return;
    S.current.lightAutoRotate = lightAutoRotate;
    S.current.lightAutoRotateSpeed = lightAutoRotateSpeed;
    // When turning off, snap to the configured static rotation
    if (!lightAutoRotate) {
      S.current.lightGroup.rotation.y = (lightRotation * Math.PI) / 180;
    }
  }, [lightAutoRotate, lightAutoRotateSpeed, lightRotation]);

  // ── Reactive: grid ─────────────────────────────────────────────────────────
  useEffect(() => { if (S.current?.grid) S.current.grid.visible = showGrid; }, [showGrid]);

  // ── Reactive: model URL ────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelUrl || !S.current?.scene) return;
    loadGLB(S.current, modelUrl, viewMode);
  }, [modelUrl]); // eslint-disable-line

  // ── Mouse wheel ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!S.current) return;
      S.current.cam.radius = Math.max(0.5, Math.min(25, S.current.cam.radius + (e.deltaY > 0 ? 0.4 : -0.4)));
      syncCamera(S.current.camera, S.current.cam);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!S.current) return;
    S.current.drag = { active: true, btn: e.button, x: e.clientX, y: e.clientY };
    S.current.autoSpin = false;
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!S.current?.drag.active) return;
    const dx = e.clientX - S.current.drag.x, dy = e.clientY - S.current.drag.y;
    S.current.drag.x = e.clientX; S.current.drag.y = e.clientY;
    if (e.shiftKey || S.current.drag.btn !== 0) {
      const spd = S.current.cam.radius * 0.0018;
      S.current.cam.panY -= dy * spd;
      S.current.cam.panX -= dx * spd * Math.cos(S.current.cam.theta);
    } else {
      S.current.cam.theta -= dx * 0.007;
      S.current.cam.phi = Math.max(0.05, Math.min(Math.PI - 0.05, S.current.cam.phi - dy * 0.007));
    }
    syncCamera(S.current.camera, S.current.cam);
  }, []);

  const onPointerUp = useCallback(() => { if (S.current) S.current.drag.active = false; }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: S.current?.drag?.active ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}