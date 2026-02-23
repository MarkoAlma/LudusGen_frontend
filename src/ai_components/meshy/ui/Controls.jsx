// ui/controls.jsx — Toggle, SegControl, Select, MeshyRow, NumStepper, Collapsible, HistoryCard
import React, { useState, useRef, useEffect } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from './Primitives';
// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label, hint, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div>
        <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: '0 0 2px' }}>{label}</p>
        {hint && <p style={{ color: '#4b5563', fontSize: 10, margin: 0 }}>{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
          cursor: 'pointer', border: 'none',
          background: value ? (color || '#84cc16') : 'rgba(255,255,255,0.1)',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s', left: value ? 18 : 2,
        }} />
      </button>
    </div>
  );
}

// ─── SegControl ───────────────────────────────────────────────────────────────
export function SegControl({ value, options, onChange, color }) {
  return (
    <div style={{
      display: 'flex', borderRadius: 10, overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: 10,
    }}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, padding: '6px 4px', border: 'none', fontSize: 11, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
            background: isActive ? (color || '#84cc16') : 'transparent',
            color: isActive ? '#fff' : '#6b7280',
          }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#d1d5db'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6b7280'; }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ marginBottom: 10 }} ref={ref}>
      {label && <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>{label}</p>}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen((o) => !o)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', borderRadius: 9, fontSize: 11, color: '#e5e7eb',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
        }}>
          {options.find((o) => o.value === value)?.label ?? value}
          {open ? <ChevronUp style={{ width: 12, height: 12, color: '#6b7280' }} /> : <ChevronDown style={{ width: 12, height: 12, color: '#6b7280' }} />}
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
            borderRadius: 10, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}>
            {options.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} style={{
                width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: 11, cursor: 'pointer',
                color: value === o.value ? '#a78bfa' : '#d1d5db',
                background: value === o.value ? 'rgba(124,58,237,0.12)' : 'transparent', border: 'none',
              }}
                onMouseEnter={(e) => { if (value !== o.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={(e) => { if (value !== o.value) e.currentTarget.style.background = 'transparent'; }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MeshyRow ─────────────────────────────────────────────────────────────────
export function MeshyRow({ label, tip, children, premium }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
        <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {tip && (
          <Tooltip text={tip} side="right">
            <Info style={{ width: 11, height: 11, color: '#374151', cursor: 'help' }} />
          </Tooltip>
        )}
        {premium && <span style={{ fontSize: 10 }}>👑</span>}
      </div>
      {children}
    </div>
  );
}

// ─── NumStepper ───────────────────────────────────────────────────────────────
export function NumStepper({ value, onChange, min = 1, max = 4 }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 0, borderRadius: 9,
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden',
    }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={{
        width: 26, height: 28, border: 'none', background: 'transparent',
        color: value <= min ? '#2d2d45' : '#9ca3af',
        cursor: value <= min ? 'not-allowed' : 'pointer', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>‹</button>
      <span style={{ minWidth: 24, textAlign: 'center', color: '#e5e7eb', fontSize: 13, fontWeight: 700 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} style={{
        width: 26, height: 28, border: 'none', background: 'transparent',
        color: value >= max ? '#2d2d45' : '#9ca3af',
        cursor: value >= max ? 'not-allowed' : 'pointer', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>›</button>
    </div>
  );
}

// ─── Collapsible ──────────────────────────────────────────────────────────────
export function Collapsible({ title, icon, children, defaultOpen = false, color }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: 11, fontWeight: 700 }}>
          {icon && React.cloneElement(icon, { style: { width: 11, height: 11, color: color || '#7c3aed' } })}
          {title}
        </span>
        {open ? <ChevronUp style={{ width: 12, height: 12, color: '#4b5563' }} /> : <ChevronDown style={{ width: 12, height: 12, color: '#4b5563' }} />}
      </button>
      {open && <div style={{ paddingBottom: 6 }}>{children}</div>}
    </div>
  );
}

// ─── HistoryCard ──────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function HistoryCard({ item, isActive, onSelect, color }) {
  return (
    <button onClick={() => onSelect(item)} style={{
      width: '100%', textAlign: 'left', borderRadius: 12, padding: 10, cursor: 'pointer',
      transition: 'all 0.15s',
      background: isActive ? `${color}15` : 'rgba(255,255,255,0.025)',
      border: `1px solid ${isActive ? color + '42' : 'rgba(255,255,255,0.06)'}`,
    }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {item.thumbnail
            ? <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 16 }}>📦</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#d1d5db', fontSize: 11, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prompt}</p>
          <p style={{ color: '#374151', fontSize: 9, margin: 0 }}>{fmtDate(item.ts)}</p>
        </div>
      </div>
    </button>
  );
}