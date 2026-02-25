import React from 'react';
import { T } from './tokens';
import { BG_OPTIONS } from './Constants';
import { Tooltip } from '../meshy/ui/Primitives';

// ────────────────────────────────────────────────────────────────────────────
// BgColorPicker Component
// ────────────────────────────────────────────────────────────────────────────
// Note: This component requires Tooltip component to be imported

export function BgColorPicker({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  
  const current = BG_OPTIONS.find(o => o.id === value) ?? BG_OPTIONS[0];
  
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={ref}>
      <Tooltip text="Háttér szín" side="bottom">
        <button onClick={() => setOpen(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: T.radius.sm, fontSize: 10, fontWeight: 700,
          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          color: '#6b7280',
          outline: open ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.07)',
        }}>
          {current.render()}
          <span style={{ color: '#4b5563', fontSize: 9 }}>▾</span>
        </button>
      </Tooltip>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999,
          width: 140, borderRadius: T.radius.md,
          background: '#090915', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)', padding: 6,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {BG_OPTIONS.map(opt => {
            const isActive = value === opt.id;
            return (
              <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                borderRadius: T.radius.sm, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: 'none', textAlign: 'left', width: '100%',
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: isActive ? '#e5e7eb' : '#6b7280', transition: 'all 0.12s',
              }}>
                {opt.render()} {opt.label}
                {isActive && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#4b5563' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}