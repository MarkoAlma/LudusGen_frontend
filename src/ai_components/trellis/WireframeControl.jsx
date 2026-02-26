import React from 'react';
import { T } from './tokens';
import { Tooltip } from '../meshy/ui/Primitives';

// ────────────────────────────────────────────────────────────────────────────
// WireframeControl Component
// ────────────────────────────────────────────────────────────────────────────
// Note: This component requires a Tooltip component to be imported

export function WireframeControl({ active, onToggle, opacity, onOpacityChange, color, onColorChange, accentColor }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  
  const pct = ((opacity - 0.05) / (1 - 0.05)) * 100;
  
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 0 }} ref={ref}>
      <Tooltip text={active ? 'Wire overlay kikapcsolása' : 'Wire overlay bekapcsolása'} side="bottom">
        <button onClick={onToggle} style={{
          padding: '3px 8px', borderRadius: open ? '6px 0 0 6px' : T.radius.sm,
          fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: active ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
          color: active ? accentColor : '#6b7280',
          outline: active ? `1px solid ${accentColor}40` : '1px solid rgba(255,255,255,0.07)',
        }}>Wire</button>
      </Tooltip>
      <Tooltip text="Wire beállítások" side="bottom">
        <button onClick={() => setOpen(v => !v)} style={{
          padding: '3px 5px', borderRadius: open ? '0 6px 6px 0' : T.radius.sm,
          fontSize: 9, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: open ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
          color: open ? accentColor : '#6b7280',
          outline: open ? `1px solid ${accentColor}40` : '1px solid rgba(255,255,255,0.07)',
          borderLeft: open ? `1px solid ${accentColor}25` : undefined, marginLeft: 1,
        }}>▾</button>
      </Tooltip>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
          width: 200, borderRadius: T.radius.lg, background: '#090915',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)', padding: 12,
        }}>
          <p style={{ color: '#e5e7eb', fontSize: 11, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.01em' }}>Wire overlay</p>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'SF Mono', monospace" }}>Átlátszóság</span>
              <span style={{ color: accentColor, fontSize: 10, fontWeight: 800, fontFamily: "'SF Mono', monospace" }}>{Math.round(opacity * 100)}%</span>
            </div>
            <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg,${accentColor}cc,${accentColor})`,
                width: `${pct}%`, pointerEvents: 'none',
                boxShadow: `0 0 6px ${accentColor}60`,
              }} />
              <input type="range" min={0.05} max={1} step={0.01} value={opacity}
                onChange={e => onOpacityChange(Number(e.target.value))}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'SF Mono', monospace" }}>Szín</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {['#ffffff', '#84cc16', '#60a5fa', '#f87171'].map(c => (
                <button key={c} onClick={() => onColorChange(c)} style={{
                  width: 16, height: 16, borderRadius: '50%', border: 'none',
                  background: c, cursor: 'pointer',
                  outline: color === c ? `2px solid ${accentColor}` : '2px solid transparent',
                  outlineOffset: 1, transition: 'outline-color 0.15s',
                }} />
              ))}
              <label style={{ cursor: 'pointer', position: 'relative', width: 16, height: 16 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px dashed #374151', background: color, cursor: 'pointer' }} />
                <input type="color" value={color} onChange={e => onColorChange(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </label>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#4b5563', fontSize: 10 }}>Wire overlay</span>
            <button onClick={onToggle} style={{
              position: 'relative', width: 32, height: 18, borderRadius: 9, flexShrink: 0,
              cursor: 'pointer', border: 'none',
              background: active ? accentColor : 'rgba(255,255,255,0.08)', transition: 'background 0.2s',
              boxShadow: active ? `0 0 10px ${accentColor}50` : 'none',
            }}>
              <span style={{
                position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s', left: active ? 16 : 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}