import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function FloatingCore({ 
    size = 1, 
    type = 'fragmented', // 'fragmented', 'box', 'torus', 'sphere'
    color = '#8b5cf6',
    speed = 1
}) {
  const containerRef = useRef(null);
  const scrollY = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // Size management
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 12 * size;

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(color, 30, 60);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // CORE GROUP
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const pieces = [];
    const radius = 4 * size;

    // GEOMETRY BRANCHING
    if (type === 'fragmented') {
        const fragmentCount = 32;
        for (let i = 0; i < fragmentCount; i++) {
            const geometry = new THREE.TetrahedronGeometry(Math.random() * 0.8 + 0.4, 0);
            const material = new THREE.MeshPhongMaterial({
                color: i % 2 === 0 ? color : '#3b82f6',
                flatShading: true,
                transparent: true,
                opacity: 0.6,
                shininess: 100,
                emissive: i % 2 === 0 ? '#4c1d95' : '#1e3a8a',
                emissiveIntensity: 0.2
            });

            const mesh = new THREE.Mesh(geometry, material);
            const phi = Math.acos(-1 + (2 * i) / fragmentCount);
            const theta = Math.sqrt(fragmentCount * Math.PI) * phi;
            
            mesh.position.setFromSphericalCoords(radius, phi, theta);
            mesh.lookAt(coreGroup.position);
            
            mesh.userData.normal = mesh.position.clone().normalize();
            mesh.userData.homePosition = mesh.position.clone();
            mesh.userData.rotationSpeed = {
                x: (Math.random() - 0.5) * 0.02 * speed,
                y: (Math.random() - 0.5) * 0.02 * speed
            };

            coreGroup.add(mesh);
            pieces.push(mesh);
        }
    } else if (type === 'box') {
        const geometry = new THREE.BoxGeometry(radius, radius, radius);
        const material = new THREE.MeshPhongMaterial({ 
            color, 
            wireframe: true, 
            emissive: color, 
            emissiveIntensity: 0.5 
        });
        const mesh = new THREE.Mesh(geometry, material);
        coreGroup.add(mesh);
        pieces.push(mesh);
    } else if (type === 'torus') {
        const geometry = new THREE.TorusGeometry(radius, radius * 0.3, 16, 100);
        const material = new THREE.MeshPhongMaterial({ 
            color, 
            wireframe: true, 
            emissive: color, 
            emissiveIntensity: 0.5 
        });
        const mesh = new THREE.Mesh(geometry, material);
        coreGroup.add(mesh);
        pieces.push(mesh);
    } else if (type === 'sphere') {
        const geometry = new THREE.IcosahedronGeometry(radius, 1);
        const material = new THREE.MeshPhongMaterial({ 
            color, 
            wireframe: true, 
            emissive: color, 
            emissiveIntensity: 0.5 
        });
        const mesh = new THREE.Mesh(geometry, material);
        coreGroup.add(mesh);
        pieces.push(mesh);
    }

    // INTERNAL PULSE
    const centerGlow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.4, 32, 32),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending })
    );
    coreGroup.add(centerGlow);

    // EVENT LISTENERS
    const handleScroll = () => { scrollY.current = window.scrollY; };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // ANIMATION
    let frame = 0;
    const animate = () => {
        frame = requestAnimationFrame(animate);
        
        const targetScroll = scrollY.current * 0.002;
        const expansion = Math.min(targetScroll * 4, 8);

        pieces.forEach((p) => {
            if (type === 'fragmented') {
                p.position.copy(p.userData.homePosition).add(
                    p.userData.normal.clone().multiplyScalar(expansion)
                );
                p.rotation.x += p.userData.rotationSpeed.x;
                p.rotation.y += p.userData.rotationSpeed.y;
            } else {
                p.rotation.x += 0.01 * speed;
                p.rotation.y += 0.005 * speed;
                p.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.05);
            }
        });

        coreGroup.rotation.y += 0.003 * speed;
        
        centerGlow.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);

        renderer.render(scene, camera);
    };

    animate();

    return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', handleScroll);
        if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
        renderer.dispose();
    };
  }, [size, type, color, speed]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px] perspective-1000" />
  );
}
