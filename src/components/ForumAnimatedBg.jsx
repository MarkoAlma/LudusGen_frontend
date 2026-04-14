import React, { useRef, useEffect, useCallback } from 'react';

/**
 * ForumAnimatedBg — Premium animated background for the forum.
 *
 * Layers (single 2D canvas, GPU-friendly):
 *  1. Dot-grid pattern (subtle, premium feel)
 *  2. Large ambient gradient orbs with slow parallax drift
 *  3. Multi-layer particles: tiny "dust" + medium "stars" + bright "diamonds"
 *  4. Constellation connection lines between nearby particles
 *  5. Slow horizontal light-sweep (premium accent)
 *  6. Subtle vignette for depth
 *
 * No mouse-reactive glow — clean, professional, always-on animation.
 */
export default function ForumAnimatedBg() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const orbsRef = useRef([]);
  const sweepsRef = useRef([]);

  const CONFIG = useRef({
    // Particles — 3 tiers for depth
    dustCount: 60,
    starCount: 35,
    diamondCount: 8,
    connectionDistance: 160,
    particleSpeed: 0.25,

    // Orbs
    orbCount: 6,

    // Grid
    dotSpacing: 40,
    dotRadius: 0.6,
    dotOpacity: 0.06,

    // Light sweeps
    sweepCount: 2,

    // Colors — premium palette: deep purple, electric blue, warm gold
    colors: {
      purple: [139, 92, 246],
      blue: [96, 165, 250],
      gold: [251, 191, 36],
      violet: [196, 130, 252],
      cyan: [34, 211, 238],
      line: [139, 92, 246],
    }
  }).current;

  const pickColor = useCallback((palette) => {
    const keys = Object.keys(palette).filter(k => k !== 'line');
    return palette[keys[Math.floor(Math.random() * keys.length)]];
  }, []);

  const createParticles = useCallback((w, h) => {
    const particles = [];

    // Tier 1: Dust — tiny, slow, very subtle
    for (let i = 0; i < CONFIG.dustCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * CONFIG.particleSpeed * 0.3,
        vy: (Math.random() - 0.5) * CONFIG.particleSpeed * 0.3 - 0.05,
        radius: Math.random() * 0.8 + 0.3,
        color: CONFIG.colors.purple,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.008 + 0.003,
        tier: 'dust',
        baseOpacity: 0.15,
      });
    }

    // Tier 2: Stars — medium, moderate glow
    for (let i = 0; i < CONFIG.starCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * CONFIG.particleSpeed,
        vy: (Math.random() - 0.5) * CONFIG.particleSpeed - 0.08,
        radius: Math.random() * 1.5 + 0.8,
        color: pickColor(CONFIG.colors),
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        tier: 'star',
        baseOpacity: 0.4,
      });
    }

    // Tier 3: Diamonds — bright, larger, slow pulse, rare
    for (let i = 0; i < CONFIG.diamondCount; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * CONFIG.particleSpeed * 0.5,
        vy: (Math.random() - 0.5) * CONFIG.particleSpeed * 0.5 - 0.03,
        radius: Math.random() * 2 + 1.5,
        color: Math.random() > 0.5 ? CONFIG.colors.gold : CONFIG.colors.violet,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.004,
        tier: 'diamond',
        baseOpacity: 0.6,
      });
    }

    return particles;
  }, [CONFIG, pickColor]);

  const createOrbs = useCallback((w, h) => {
    const orbConfigs = [
      { color: CONFIG.colors.purple, size: 400, x: 0.15, y: 0.25 },
      { color: CONFIG.colors.blue, size: 350, x: 0.8, y: 0.65 },
      { color: CONFIG.colors.gold, size: 250, x: 0.5, y: 0.1 },
      { color: CONFIG.colors.violet, size: 380, x: 0.1, y: 0.75 },
      { color: CONFIG.colors.cyan, size: 300, x: 0.85, y: 0.15 },
      { color: CONFIG.colors.purple, size: 450, x: 0.55, y: 0.85 },
    ];
    return orbConfigs.map((cfg) => ({
      x: cfg.x * w,
      y: cfg.y * h,
      baseX: cfg.x * w,
      baseY: cfg.y * h,
      radius: cfg.size,
      color: cfg.color,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: Math.random() * 0.0002 + 0.00008,
      speedY: Math.random() * 0.0002 + 0.00008,
      amplitudeX: Math.random() * 120 + 60,
      amplitudeY: Math.random() * 100 + 50,
      opacity: 0.04 + Math.random() * 0.02,
    }));
  }, [CONFIG]);

  const createSweeps = useCallback((w, h) => {
    const sweeps = [];
    for (let i = 0; i < CONFIG.sweepCount; i++) {
      sweeps.push({
        y: Math.random() * h,
        speed: Math.random() * 0.3 + 0.15,
        width: Math.random() * 200 + 150,
        color: i === 0 ? CONFIG.colors.purple : CONFIG.colors.blue,
        opacity: 0.015 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return sweeps;
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
    sweepsRef.current = createSweeps(w, h);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      particlesRef.current = createParticles(w, h);
      orbsRef.current = createOrbs(w, h);
      sweepsRef.current = createSweeps(w, h);
    };

    window.addEventListener('resize', handleResize);

    // ── Animation Loop ──
    let time = 0;
    const animate = () => {
      time++;
      ctx.clearRect(0, 0, w, h);

      // ═══════════════════════════════════════
      //  LAYER 1: Dot Grid
      // ═══════════════════════════════════════
      const gs = CONFIG.dotSpacing;
      ctx.fillStyle = `rgba(139, 92, 246, ${CONFIG.dotOpacity})`;
      for (let x = gs / 2; x < w; x += gs) {
        for (let y = gs / 2; y < h; y += gs) {
          ctx.beginPath();
          ctx.arc(x, y, CONFIG.dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ═══════════════════════════════════════
      //  LAYER 2: Ambient Gradient Orbs
      // ═══════════════════════════════════════
      ctx.globalCompositeOperation = 'lighter';
      for (const orb of orbsRef.current) {
        orb.x = orb.baseX + Math.sin(time * orb.speedX + orb.phaseX) * orb.amplitudeX;
        orb.y = orb.baseY + Math.cos(time * orb.speedY + orb.phaseY) * orb.amplitudeY;

        const [r, g, b] = orb.color;
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${orb.opacity})`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${orb.opacity * 0.4})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ═══════════════════════════════════════
      //  LAYER 3: Light Sweeps
      // ═══════════════════════════════════════
      for (const sweep of sweepsRef.current) {
        const sweepY = (sweep.y + time * sweep.speed) % (h + sweep.width * 2) - sweep.width;
        const [r, g, b] = sweep.color;
        const grad = ctx.createLinearGradient(0, sweepY - sweep.width / 2, 0, sweepY + sweep.width / 2);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${sweep.opacity})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY - sweep.width / 2, w, sweep.width);
      }
      ctx.globalCompositeOperation = 'source-over';

      // ═══════════════════════════════════════
      //  LAYER 4: Particles + Constellation Lines
      // ═══════════════════════════════════════
      const particles = particlesRef.current;

      // Update positions
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around edges with padding
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      // Constellation lines (only between stars and diamonds, not dust)
      const connectable = particles.filter(p => p.tier !== 'dust');
      for (let i = 0; i < connectable.length; i++) {
        for (let j = i + 1; j < connectable.length; j++) {
          const dx = connectable[i].x - connectable[j].x;
          const dy = connectable[i].y - connectable[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONFIG.connectionDistance) {
            const opacity = (1 - dist / CONFIG.connectionDistance) * 0.08;
            const [r, g, b] = CONFIG.colors.line;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(connectable[i].x, connectable[i].y);
            ctx.lineTo(connectable[j].x, connectable[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles by tier
      for (const p of particles) {
        const pulseFactor = 0.6 + Math.sin(p.pulse) * 0.4;
        const [r, g, b] = p.color;
        const finalOpacity = Math.min(p.baseOpacity * pulseFactor, 1);

        if (p.tier === 'dust') {
          // Simple dot, no glow
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.tier === 'star') {
          // Soft glow
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalOpacity * 0.4})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * pulseFactor, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.tier === 'diamond') {
          // Bright multi-layer glow + cross sparkle
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 5);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${finalOpacity * 0.5})`);
          glow.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${finalOpacity * 0.15})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 5, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity * 0.7})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.5 * pulseFactor, 0, Math.PI * 2);
          ctx.fill();

          // Cross sparkle
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${finalOpacity * 0.3})`;
          ctx.lineWidth = 0.5;
          const sparkleLen = p.radius * 3 * pulseFactor;
          ctx.beginPath();
          ctx.moveTo(p.x - sparkleLen, p.y);
          ctx.lineTo(p.x + sparkleLen, p.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - sparkleLen);
          ctx.lineTo(p.x, p.y + sparkleLen);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // ═══════════════════════════════════════
      //  LAYER 5: Vignette
      // ═══════════════════════════════════════
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      vignette.addColorStop(0, 'rgba(10, 10, 26, 0)');
      vignette.addColorStop(1, 'rgba(10, 10, 26, 0.35)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [CONFIG, createParticles, createOrbs, createSweeps, pickColor]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0a0a1a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
