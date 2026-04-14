import React, { useRef, useEffect, useCallback } from 'react';

/**
 * ForumAnimatedBg — Combined animated background for the forum page.
 * Layers (all on a single 2D canvas for performance):
 *  1. Subtle grid
 *  2. Floating particles with constellation-style connecting lines
 *  3. Large glowing orbs (purple/blue) with slow drift
 *  4. Mouse-reactive glow (particles near cursor get brighter)
 */
export default function ForumAnimatedBg() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const orbsRef = useRef([]);

  const CONFIG = useRef({
    particleCount: 80,
    connectionDistance: 150,
    mouseRadius: 200,
    particleSpeed: 0.3,
    orbCount: 5,
    gridSize: 60,
    gridOpacity: 0.03,
    colors: {
      particle: [139, 92, 246],   // purple
      particleAlt: [59, 130, 246], // blue
      line: [139, 92, 246],
      orb1: [139, 92, 246],       // purple
      orb2: [59, 130, 246],       // blue
      orb3: [168, 85, 247],       // violet
    }
  }).current;

  const createParticles = useCallback((w, h) => {
    const particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * CONFIG.particleSpeed,
        vy: (Math.random() - 0.5) * CONFIG.particleSpeed - 0.1,
        radius: Math.random() * 2 + 0.5,
        color: Math.random() > 0.5 ? CONFIG.colors.particle : CONFIG.colors.particleAlt,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }
    return particles;
  }, [CONFIG]);

  const createOrbs = useCallback((w, h) => {
    const orbs = [];
    const orbConfigs = [
      { color: CONFIG.colors.orb1, size: 300, x: 0.2, y: 0.3 },
      { color: CONFIG.colors.orb2, size: 250, x: 0.8, y: 0.7 },
      { color: CONFIG.colors.orb3, size: 200, x: 0.5, y: 0.1 },
      { color: CONFIG.colors.orb1, size: 350, x: 0.1, y: 0.8 },
      { color: CONFIG.colors.orb2, size: 280, x: 0.9, y: 0.2 },
    ];
    for (let i = 0; i < CONFIG.orbCount && i < orbConfigs.length; i++) {
      const cfg = orbConfigs[i];
      orbs.push({
        x: cfg.x * w,
        y: cfg.y * h,
        baseX: cfg.x * w,
        baseY: cfg.y * h,
        radius: cfg.size,
        color: cfg.color,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: Math.random() * 0.0003 + 0.0001,
        speedY: Math.random() * 0.0003 + 0.0001,
        amplitudeX: Math.random() * 100 + 50,
        amplitudeY: Math.random() * 80 + 40,
      });
    }
    return orbs;
  }, [CONFIG]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    particlesRef.current = createParticles(w, h);
    orbsRef.current = createOrbs(w, h);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      particlesRef.current = createParticles(w, h);
      orbsRef.current = createOrbs(w, h);
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // ── Animation Loop ──
    let time = 0;
    const animate = () => {
      time++;
      ctx.clearRect(0, 0, w, h);

      // ── 1. Grid ──
      ctx.strokeStyle = `rgba(139, 92, 246, ${CONFIG.gridOpacity})`;
      ctx.lineWidth = 0.5;
      const gs = CONFIG.gridSize;
      for (let x = 0; x <= w; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // ── 2. Glowing Orbs ──
      ctx.globalCompositeOperation = 'lighter';
      for (const orb of orbsRef.current) {
        orb.x = orb.baseX + Math.sin(time * orb.speedX + orb.phaseX) * orb.amplitudeX;
        orb.y = orb.baseY + Math.cos(time * orb.speedY + orb.phaseY) * orb.amplitudeY;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        const [r, g, b] = orb.color;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.06)`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.02)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // ── 3. Particles + Connections ──
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update positions
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // Draw connections (constellation lines)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONFIG.connectionDistance) {
            const opacity = (1 - dist / CONFIG.connectionDistance) * 0.12;
            const [r, g, b] = CONFIG.colors.line;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const pulseFactor = 0.7 + Math.sin(p.pulse) * 0.3;
        const [r, g, b] = p.color;
        const finalOpacity = Math.min(0.5 * pulseFactor, 1);

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalOpacity * 0.5})`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulseFactor, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [CONFIG, createParticles, createOrbs]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0a0a1a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 1 }}
      />
      {/* Very subtle depth overlay — keeps text readable without darkening */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/20 via-transparent to-[#0a0a1a]/30" />
    </div>
  );
}
