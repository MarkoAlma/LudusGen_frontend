// viewer/LightingControls.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Sun, Eye, Sparkles, RefreshCw, RotateCcw, Aperture, Grid } from 'lucide-react';
import { IconBtn, Tooltip } from '../ui/Primitives';

function MiniSlider({ label, value, min, max, step, onChange, color, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 800 }}>{display ?? value}</span>
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

function PopoverToggle({ label, sub, icon, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: '0 0 1px', display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon} {label}
        </p>
        {sub && <p style={{ color: '#4b5563', fontSize: 9, margin: 0 }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        cursor: 'pointer', border: 'none',
        background: value ? color : 'rgba(255,255,255,0.1)', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s', left: value ? 18 : 2,
        }} />
      </button>
    </div>
  );
}

function ColorDots({ colors, value, onChange, accentColor }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {colors.map((c) => (
        <Tooltip key={c.hex} text={c.label} side="top">
          <button onClick={() => onChange(c.hex)} style={{
            width: 18, height: 18, borderRadius: '50%', border: 'none',
            background: c.hex, cursor: 'pointer', flexShrink: 0,
            outline: value === c.hex ? `2px solid ${accentColor}` : '2px solid transparent',
            outlineOffset: 2, boxShadow: `0 0 6px ${c.hex}60`,
          }} />
        </Tooltip>
      ))}
      <Tooltip text="Egyéni szín" side="top">
        <label style={{ cursor: 'pointer', position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: value,
            border: '1.5px dashed rgba(255,255,255,0.3)',
            outline: !colors.some((c) => c.hex === value) ? `2px solid ${accentColor}` : '2px solid transparent',
            outlineOffset: 2,
          }} />
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </label>
      </Tooltip>
    </div>
  );
}

function SectionHead({ icon, label, color }) {
  return (
    <p style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 800, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
      {React.cloneElement(icon, { style: { width: 13, height: 13, color } })} {label}
    </p>
  );
}

const Divider = () => <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />;

// ── Inline color picker row ───────────────────────────────────────────────────
function InlineColorRow({ label, value, onChange, accentColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <label style={{ cursor: 'pointer', position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: value,
          border: `2px solid ${accentColor}40`,
          boxShadow: `0 0 6px ${value}60`,
        }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
      </label>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LightingControls({
  viewMode,
  lightMode, setLightMode,
  lightStrength, setLightStrength,
  lightRotation, setLightRotation,
  lightAutoRotate, setLightAutoRotate,
  lightAutoRotateSpeed, setLightAutoRotateSpeed,
  dramaticColor, setDramaticColor,
  bgLightOn, setBgLightOn,
  bgLightColor, setBgLightColor,
  bgLightSize, setBgLightSize,
  bgLightIntensity, setBgLightIntensity,
  gridColor1, setGridColor1,
  gridColor2, setGridColor2,
  color,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const sceneLightingActive = viewMode === 'normal';

  const MODES = [
    { id: 'studio',   icon: <Sun />,      tip: 'Studio' },
    { id: 'outdoor',  icon: <Eye />,      tip: 'Outdoor' },
    { id: 'dramatic', icon: <Sparkles />, tip: 'Dramatic' },
  ];

  const DRAMATIC_COLORS = [
    { hex: '#4400ff', label: 'Lila' },
    { hex: '#ff3300', label: 'Piros' },
    { hex: '#ff8800', label: 'Narancs' },
    { hex: '#00aaff', label: 'Kék' },
    { hex: '#00ff88', label: 'Zöld' },
  ];

  const BG_LIGHT_COLORS = [
    { hex: '#ffffff', label: 'Fehér' },
    { hex: '#ffe4b5', label: 'Meleg' },
    { hex: '#b0c4ff', label: 'Hideg' },
    { hex: '#d4b0ff', label: 'Lila' },
    { hex: '#b0ffd4', label: 'Zöld' },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }} ref={ref}>

      {/* Mode buttons — only in normal/rgb mode */}
      {sceneLightingActive && MODES.map((l) => (
        <IconBtn key={l.id} icon={l.icon} tip={l.tip} active={lightMode === l.id}
          color={color} onClick={() => setLightMode(l.id)} side="bottom" />
      ))}

      <Tooltip text="Lighting beállítások" side="bottom">
        <button onClick={() => setOpen((o) => !o)} style={{
          width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? `${color}28` : 'rgba(255,255,255,0.04)',
          color: open ? color : '#6b7280',
          outline: open ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
          fontSize: 13, transition: 'all 0.15s',
        }}>⚙</button>
      </Tooltip>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 999,
          width: 240, borderRadius: 14, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
          background: '#0f0f23', border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)', padding: 14,
        }}>
          <div style={{
            position: 'absolute', top: -6, right: 10, width: 12, height: 12,
            background: '#0f0f23', border: '1px solid rgba(255,255,255,0.12)',
            borderBottom: 'none', borderRight: 'none', transform: 'rotate(45deg)',
          }} />

          {/* ── Scene Lighting ── */}
          {sceneLightingActive ? (
            <>
              <SectionHead icon={<Sun />} label="Scene Lighting" color={color} />
              <MiniSlider label="Strength" min={0.1} max={3} step={0.05}
                value={lightStrength} onChange={setLightStrength}
                color={color} display={`${lightStrength.toFixed(2)}×`} />
              <MiniSlider label="Rotation" min={0} max={360} step={1}
                value={lightRotation} onChange={setLightRotation}
                color={color} display={`${lightRotation}°`} />
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
              <PopoverToggle
                label="Auto-Rotate Light" sub="Forgó megvilágítás"
                icon={<RefreshCw style={{ width: 11, height: 11 }} />}
                value={lightAutoRotate} onChange={setLightAutoRotate} color={color}
              />
              {lightAutoRotate && (
                <div style={{ marginTop: 10 }}>
                  <MiniSlider label="Speed" min={0.1} max={3} step={0.1}
                    value={lightAutoRotateSpeed} onChange={setLightAutoRotateSpeed}
                    color={color} display={`${lightAutoRotateSpeed.toFixed(1)}×`} />
                </div>
              )}
              {lightMode === 'dramatic' && (
                <>
                  <Divider />
                  <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dramatic szín
                  </span>
                  <ColorDots colors={DRAMATIC_COLORS} value={dramaticColor ?? '#4400ff'}
                    onChange={setDramaticColor} accentColor={color} />
                </>
              )}
              <Divider />
            </>
          ) : (
            <>
              <div style={{
                marginBottom: 12, padding: '7px 10px', borderRadius: 9,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <p style={{ color: '#4b5563', fontSize: 10, margin: 0, lineHeight: 1.5 }}>
                  Scene lighting csak <span style={{ color: '#6b7280', fontWeight: 700 }}>RGB</span> módban elérhető.
                </p>
              </div>
            </>
          )}

          {/* ── Background Light ── */}
          <SectionHead icon={<Aperture />} label="Background Light" color={color} />
          <PopoverToggle
            label="Háttér fény" sub="3D mélységű glow a modell mögött"
            icon={<Aperture style={{ width: 11, height: 11 }} />}
            value={bgLightOn} onChange={setBgLightOn} color={color}
          />
          {bgLightOn && (
            <div style={{ marginTop: 10 }}>
              <MiniSlider label="Erősség" min={0.01} max={1} step={0.01}
                value={bgLightIntensity} onChange={setBgLightIntensity}
                color={color} display={`${Math.round(bgLightIntensity * 100)}%`} />
              <MiniSlider label="Méret" min={1} max={14} step={0.5}
                value={bgLightSize} onChange={setBgLightSize}
                color={color} display={`${bgLightSize.toFixed(0)}`} />
              <span style={{ color: '#9ca3af', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Szín</span>
              <ColorDots colors={BG_LIGHT_COLORS} value={bgLightColor}
                onChange={setBgLightColor} accentColor={color} />
            </div>
          )}

          <Divider />

          {/* ── Grid Colors ── */}
          <SectionHead icon={<Grid />} label="Grid Szín" color={color} />
          <InlineColorRow label="Fővonalak" value={gridColor1} onChange={setGridColor1} accentColor={color} />
          <InlineColorRow label="Rácsok" value={gridColor2} onChange={setGridColor2} accentColor={color} />

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[
              { label: 'Sötét', c1: '#1e1e3a', c2: '#111128' },
              { label: 'Szürke', c1: '#333333', c2: '#1a1a1a' },
              { label: 'Fehér', c1: '#cccccc', c2: '#999999' },
              { label: 'Zöld', c1: '#0a2a0a', c2: '#051505' },
            ].map((p) => (
              <button key={p.label}
                onClick={() => { setGridColor1(p.c1); setGridColor2(p.c2); }}
                style={{
                  flex: 1, padding: '4px 0', borderRadius: 7, fontSize: 9, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: gridColor1 === p.c1 ? `${color}30` : 'rgba(255,255,255,0.05)',
                  color: gridColor1 === p.c1 ? color : '#6b7280',
                  outline: gridColor1 === p.c1 ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.06)',
                }}>{p.label}</button>
            ))}
          </div>

          <Divider />

          {/* Reset */}
          <button onClick={() => {
            setLightStrength(1); setLightRotation(0);
            setLightAutoRotate(false); setLightAutoRotateSpeed(0.5);
            setDramaticColor('#4400ff');
            setBgLightOn(true); setBgLightColor('#ffffff');
            setBgLightSize(4); setBgLightIntensity(0.10);
            setGridColor1('#1e1e3a'); setGridColor2('#111128');
          }} style={{
            width: '100%', padding: '6px 0', borderRadius: 9,
            fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: 'rgba(255,255,255,0.04)', color: '#6b7280',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            <RotateCcw style={{ width: 10, height: 10 }} /> Reset All
          </button>
        </div>
      )}
    </div>
  );
}