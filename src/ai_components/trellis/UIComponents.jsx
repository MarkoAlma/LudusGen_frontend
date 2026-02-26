import React from 'react';
import { T } from './tokens';

// ────────────────────────────────────────────────────────────────────────────
// Common UI Components
// ────────────────────────────────────────────────────────────────────────────

export function SectionLabel({ icon, children, color, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      marginBottom: 8, padding: '0 1px',
    }}>
      {icon && React.cloneElement(icon, {
        style: { width: 10, height: 10, color, flexShrink: 0 }
      })}
      <span style={{
        color: '#6b7280', fontSize: 9, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontFamily: "'SF Mono', monospace",
      }}>
        {children}
      </span>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  );
}

export function Pill({ children, color, active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 9, fontWeight: 700, padding: '2px 7px',
      borderRadius: 999,
      background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
      color: active ? color : '#4b5563',
      border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      letterSpacing: '0.02em',
    }}>
      {children}
    </span>
  );
}

export function Card({ children, style: extStyle, glow, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: T.radius.lg,
      overflow: 'hidden',
      boxShadow: glow ? `0 0 0 1px ${color}20, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      ...extStyle,
    }}>
      {children}
    </div>
  );
}

export function MiniSlider({ label, value, min, max, step, onChange, color, display }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{
          color: '#4b5563', fontSize: 9, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em',
          fontFamily: "'SF Mono', monospace",
        }}>{label}</span>
        <span style={{ color, fontSize: 10, fontWeight: 800, fontFamily: "'SF Mono', monospace" }}>{display ?? value}</span>
      </div>
      <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          width: `${Math.min(100, pct)}%`, pointerEvents: 'none',
          boxShadow: `0 0 6px ${color}60`,
        }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
    </div>
  );
}

export function NumInput({ label, value, onChange, min, max, color, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div>
          <span style={{ color: '#4b5563', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'SF Mono', monospace" }}>{label}</span>
          {hint && <span style={{ color: '#374151', fontSize: 9, display: 'block', marginTop: 1 }}>{hint}</span>}
        </div>
        <input
          type="number" min={min} max={max} value={value}
          onChange={e => {
            const v = Number(e.target.value);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          style={{
            width: 80, padding: '4px 9px', borderRadius: T.radius.sm,
            fontSize: 11, fontWeight: 700, color,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${color}25`,
            outline: 'none', textAlign: 'right', fontFamily: "'SF Mono', monospace",
            transition: 'border-color 0.2s',
          }}
        />
      </div>
    </div>
  );
}

export function ToggleRow({ label, hint, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, margin: '0 0 1px' }}>{label}</p>
        {hint && <p style={{ color: '#374151', fontSize: 9, margin: 0 }}>{hint}</p>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        position: 'relative', width: 36, height: 20, borderRadius: 10,
        cursor: 'pointer', border: 'none',
        background: value ? color : 'rgba(255,255,255,0.08)',
        transition: 'background 0.2s', flexShrink: 0,
        boxShadow: value ? `0 0 10px ${color}50` : 'none',
      }}>
        <span style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s', left: value ? 18 : 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </button>
    </div>
  );
}