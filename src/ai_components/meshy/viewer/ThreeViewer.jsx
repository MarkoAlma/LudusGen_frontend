// viewer/ThreeViewer.jsx — Three.js 3D viewport
import React, { useRef, useEffect, useCallback } from 'react';
import {
  loadScript, syncCamera, buildPlaceholder,
  createSunLight, setSunLightProps,
  applyLights, applyViewMode, applyWireframeOverlay,
  setSceneBg, setBgLight, updateBgLightPosition,
  setGridColor, loadGLB,
} from './threeHelpers';

export default function ThreeViewer({
  color, viewMode, lightMode, showGrid,
  modelUrl, onReady,
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
  bgColor = 'default',
  bgLightOn = true,
  bgLightColor = '#ffffff',
  bgLightSize = 4,
  bgLightIntensity = 0.10,
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
    let resizeObs;

    (async () => {
      if (!window.THREE) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
      if (!window.THREE.GLTFLoader) await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js');
      const THREE = window.THREE;
      const W = el.clientWidth || 640, H = el.clientHeight || 480;

      const scene    = new THREE.Scene();
      const camera   = new THREE.PerspectiveCamera(45, W / H, 0.01, 10000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

      // Sun: frozen world matrix — renderer cannot move it
      const sunLight = createSunLight(THREE, scene);

      const cam = { theta: 0.4, phi: Math.PI / 3, radius: 6, panX: 0, panY: 0 };
      syncCamera(camera, cam);

      S.current = {
        THREE, scene, camera, renderer, grid, lightGroup, placeholder,
        model: null, origMaterials: new Map(), cam,
        bgLight: null, sunLight, _camDir: null,
        autoSpin, lightAutoRotate, lightAutoRotateSpeed,
        drag: { active: false, mode: 'orbit', x: 0, y: 0 },
        frame: null,
      };

      applyLights(S.current, lightMode, color, lightStrength, lightRotation, dramaticColor, viewMode);
      applyViewMode(S.current, viewMode);
      setSceneBg(S.current, bgColor);
      setBgLight(S.current, bgLightOn, bgLightColor, bgLightSize, bgLightIntensity);

      const clock = new THREE.Clock();
      const loop = () => {
        S.current.frame = requestAnimationFrame(loop);
        const dt = clock.getDelta();

        if (S.current.autoSpin && !S.current.drag.active) {
          S.current.cam.theta += 0.004;
          syncCamera(camera, S.current.cam);
        }
        if (S.current.lightAutoRotate) {
          S.current.lightGroup.rotation.y += S.current.lightAutoRotateSpeed * dt;
        }

        updateBgLightPosition(S.current);
        renderer.render(scene, camera);
      };
      loop();

      resizeObs = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix();
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

  useEffect(() => { if (S.current) S.current.autoSpin = autoSpin; }, [autoSpin]);
  useEffect(() => { if (S.current?.scene) setSceneBg(S.current, bgColor); }, [bgColor]);
  useEffect(() => {
    if (!S.current?.scene) return;
    setBgLight(S.current, bgLightOn, bgLightColor, bgLightSize, bgLightIntensity);
  }, [bgLightOn, bgLightColor, bgLightSize, bgLightIntensity]);

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
  }, [lightAutoRotate, lightAutoRotateSpeed, lightRotation]);

  useEffect(() => { if (S.current?.grid) S.current.grid.visible = showGrid; }, [showGrid]);

  useEffect(() => {
    if (!modelUrl || !S.current?.scene) return;
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
      if (S.current.autoSpin) { S.current.autoSpin = false; if (onSpinStop) onSpinStop(); }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [onSpinStop]);

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!S.current) return;
    let dragMode = 'orbit';
    if (e.button === 0 && e.shiftKey) dragMode = 'model';
    else if (e.button !== 0)          dragMode = 'pan';
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