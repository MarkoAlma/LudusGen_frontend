import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useLocation } from 'react-router-dom';
import HeroBg from '../assets/bg/hero_bg.png';
import WorkspaceBg from '../assets/bg/workspace_bg.png';

export default function InteractiveBG() {
  const containerRef = useRef(null);
  const location = useLocation();
  const scrollY = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });

  // Detect context
  const isWorkspace = location.pathname.startsWith('/chat') || 
                      location.pathname.startsWith('/image') || 
                      location.pathname.startsWith('/audio');

  useEffect(() => {
    if (!containerRef.current) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 25;

    // TEXTURE LOADER
    const loader = new THREE.TextureLoader();
    const bgTexture = loader.load(isWorkspace ? WorkspaceBg : HeroBg);
    
    // 0. BACKGROUND PARALLAX
    const bgGeometry = new THREE.PlaneGeometry(80, 50);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      map: bgTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -15;
    scene.add(bgMesh);

    // 1. THE FRAGMENTED NEURAL CORE (The "Cool" Object)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Fragment Logic: We create 32 separate pyramid-like pieces
    const fragmentCount = 32;
    const pieces = [];
    const radius = 6;

    for (let i = 0; i < fragmentCount; i++) {
        // Create a unique geometry for each shard (Small Tetras)
        const geometry = new THREE.TetrahedronGeometry(Math.random() * 2 + 1, 0);
        const material = new THREE.MeshPhongMaterial({
            color: i % 2 === 0 ? '#8b5cf6' : '#3b82f6',
            flatShading: true,
            transparent: true,
            opacity: 0.4,
            shininess: 100,
            emissive: i % 2 === 0 ? '#4c1d95' : '#1e3a8a',
            emissiveIntensity: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        // Randomly distribute on a spherical shell
        const phi = Math.acos(-1 + (2 * i) / fragmentCount);
        const theta = Math.sqrt(fragmentCount * Math.PI) * phi;
        
        mesh.position.setFromSphericalCoords(radius, phi, theta);
        mesh.lookAt(coreGroup.position);
        
        // Store original normal for expansion animation
        mesh.userData.normal = mesh.position.clone().normalize();
        mesh.userData.homePosition = mesh.position.clone();
        mesh.userData.rotationSpeed = {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02
        };

        coreGroup.add(mesh);
        pieces.push(mesh);
    }

    // INNER POWER SOURCE (Visible when "opened")
    const innerLightGeometry = new THREE.SphereGeometry(3, 32, 32);
    const innerLightMaterial = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending
    });
    const innerLight = new THREE.Mesh(innerLightGeometry, innerLightMaterial);
    coreGroup.add(innerLight);

    // 2. LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight('#8b5cf6', 20, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 3. PARTICLES (Deep Layer)
    const particleCount = 150;
    const pGeometry = new THREE.BufferGeometry();
    const pPosArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        pPosArray[i * 3 + 0] = (Math.random() - 0.5) * 80;
        pPosArray[i * 3 + 1] = (Math.random() - 0.5) * 60;
        pPosArray[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPosArray, 3));
    const pMaterial = new THREE.PointsMaterial({
        size: 0.1,
        color: '#8b5cf6',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    const pMesh = new THREE.Points(pGeometry, pMaterial);
    scene.add(pMesh);

    // EVENT LISTENERS
    const handleScroll = () => { scrollY.current = window.scrollY; };
    const handleMouseMove = (e) => {
        mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    let frame = 0;
    const animate = () => {
        frame = requestAnimationFrame(animate);

        // Smooth scroll progress
        const targetScroll = scrollY.current * 0.005;
        const expansionFactor = Math.min(targetScroll * 5, 20); // How much it "opens up"

        // Transform Fragments
        pieces.forEach((p, idx) => {
            // Expansion
            p.position.copy(p.userData.homePosition).add(
                p.userData.normal.clone().multiplyScalar(expansionFactor)
            );
            
            // Rotation
            p.rotation.x += p.userData.rotationSpeed.x;
            p.rotation.y += p.userData.rotationSpeed.y;
            
            // Dynamic Opacity based on expansion
            p.material.opacity = 0.4 + (targetScroll * 0.1);
        });

        // Global Core Rotation
        coreGroup.rotation.y += 0.003;

        // Inner Light Intensity
        innerLight.material.opacity = Math.min(targetScroll * 0.2, 0.4) + Math.sin(Date.now() * 0.005) * 0.05;
        innerLight.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.1);

        // Parallax BG
        bgMesh.position.y = targetScroll * 4;
        bgMesh.rotation.z = targetScroll * 0.1;

        // Camera Motion
        camera.position.x += (mouse.current.x * 3 - camera.position.x) * 0.05;
        camera.position.y += (mouse.current.y * 3 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    };

    animate();

    return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', handleResize);
        if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
    };
  }, [isWorkspace]);

  return (
    <div 
        ref={containerRef} 
        className="fixed inset-0 z-0 bg-[#03000a] pointer-events-none"
    >
        {/* Cinema Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#03000a]/80 via-transparent to-[#03000a] z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,#03000a_100%)] z-10" />
        
        {/* Glow Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[100vw] h-[100vw] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
    </div>
  );
}
