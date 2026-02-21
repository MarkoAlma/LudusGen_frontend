// viewer/LightingControls.jsx — Lighting strength, rotation & auto-rotate popover
import React, { useState, useRef, useEffect } from 'react';
import { Sun, Eye, Sparkles, RefreshCw, RotateCcw } from 'lucide-react';
import { IconBtn, Tooltip } from '../ui/Primitives';

// ─── Small slider ────────────────────────────────────────────────────────────
function MiniSlider({ label, value, min, max, step, onChange, color, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color: color, fontSize: 11, fontWeight: 800 }}>{display ?? value}</span>
      </div>
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg,${color},#8b5cf6)`, width: `${pct}%`, pointerEvents: 'none',
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
    </div>
  );
}

// ─── LightingControls ─────────────────────────────────────────────────────────
export default function LightingControls({
  lightMode, setLightMode,
  lightStrength, setLightStrength,
  lightRotation, setLightRotation,
  lightAutoRotate, setLightAutoRotate,
  lightAutoRotateSpeed, setLightAutoRotateSpeed,
  color,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const MODES = [
    { id: 'studio',   icon: <Sun />,      tip: 'Studio' },
    { id: 'outdoor',  icon: <Eye />,      tip: 'Outdoor' },
    { id: 'dramatic', icon: <Sparkles />, tip: 'Dramatic' },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }} ref={ref}>
      {/* Mode buttons */}
      {MODES.map((l) => (
        <IconBtn key={l.id} icon={l.icon} tip={l.tip} active={lightMode === l.id}
          color={color} onClick={() => setLightMode(l.id)} side="bottom" />
      ))}

      {/* Settings popover trigger */}
      <Tooltip text="Lighting beállítások" side="bottom">
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: open ? `${color}28` : 'rgba(255,255,255,0.04)',
            color: open ? color : '#6b7280',
            outline: open ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
            fontSize: 13, transition: 'all 0.15s',
          }}
        >
          ⚙
        </button>
      </Tooltip>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 999,
          width: 220, borderRadius: 14,
          background: '#0f0f23', border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)', padding: 14,
        }}>
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: -6, right: 10, width: 12, height: 12,
            background: '#0f0f23', border: '1px solid rgba(255,255,255,0.12)',
            borderBottom: 'none', borderRight: 'none', transform: 'rotate(45deg)',
          }} />

          <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sun style={{ width: 13, height: 13, color }} /> Lighting
          </p>

          {/* Strength */}
          <MiniSlider
            label="Strength" min={0.1} max={3} step={0.05}
            value={lightStrength} onChange={setLightStrength}
            color={color} display={`${lightStrength.toFixed(2)}×`}
          />

          {/* Rotation */}
          <MiniSlider
            label="Rotation" min={0} max={360} step={1}
            value={lightRotation} onChange={setLightRotation}
            color={color} display={`${lightRotation}°`}
          />

          {/* Quick rotation presets */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[0, 90, 180, 270].map((deg) => (
              <button key={deg} onClick={() => setLightRotation(deg)} style={{
                flex: 1, padding: '4px 0', borderRadius: 7, fontSize: 10, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: lightRotation === deg ? `${color}30` : 'rgba(255,255,255,0.05)',
                color: lightRotation === deg ? color : '#6b7280',
                outline: lightRotation === deg ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
              }}>{deg}°</button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />

          {/* Auto-rotate toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: lightAutoRotate ? 10 : 0 }}>
            <div>
              <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: '0 0 1px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw style={{ width: 11, height: 11 }} /> Auto-Rotate Light
              </p>
              <p style={{ color: '#4b5563', fontSize: 9, margin: 0 }}>Forgó megvilágítás</p>
            </div>
            <button onClick={() => setLightAutoRotate((v) => !v)} style={{
              position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
              cursor: 'pointer', border: 'none',
              background: lightAutoRotate ? color : 'rgba(255,255,255,0.1)',
              transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s', left: lightAutoRotate ? 18 : 2,
              }} />
            </button>
          </div>

          {/* Speed (shown only when auto-rotate on) */}
          {lightAutoRotate && (
            <MiniSlider
              label="Speed" min={0.1} max={3} step={0.1}
              value={lightAutoRotateSpeed} onChange={setLightAutoRotateSpeed}
              color={color} display={`${lightAutoRotateSpeed.toFixed(1)}×`}
            />
          )}

          {/* Reset button */}
          <button onClick={() => {
            setLightStrength(1);
            setLightRotation(0);
            setLightAutoRotate(false);
            setLightAutoRotateSpeed(0.5);
          }} style={{
            marginTop: 4, width: '100%', padding: '6px 0', borderRadius: 9,
            fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: 'rgba(255,255,255,0.04)', color: '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <RotateCcw style={{ width: 10, height: 10 }} /> Reset Lighting
          </button>
        </div>
      )}
    </div>
  );
}