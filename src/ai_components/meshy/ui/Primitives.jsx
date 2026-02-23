// ui/primitives.jsx — Tooltip, Modal, IconBtn, StatusPill
import React, { useState, useRef } from 'react';
import { Box, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

// ─── Tooltip ────────────────────────────────────────────────────────────────
export function Tooltip({ text, children, side = 'top', delay = 300 }) {
  const [vis, setVis] = useState(false);
  const t = useRef(null);
  const show = () => { t.current = setTimeout(() => setVis(true), delay); };
  const hide = () => { clearTimeout(t.current); setVis(false); };
  const pos = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 6px)',    left: '50%', transform: 'translateX(-50%)' },
    left:   { right: 'calc(100% + 6px)',  top: '50%',  transform: 'translateY(-50%)' },
    right:  { left: 'calc(100% + 6px)',   top: '50%',  transform: 'translateY(-50%)' },
  }[side];

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {vis && (
        <div style={{
          position: 'absolute', zIndex: 9999, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.85)', color: '#e5e7eb', fontSize: 11,
          padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
          ...pos,
        }}>{text}</div>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    }} onClick={onClose}>
      <div style={{
        width, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)',
        borderRadius: 18, background: '#0f0f23',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
        }}>
          <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 800 }}>{title}</span>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
          }}><X style={{ width: 13, height: 13 }} /></button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, scrollbarWidth: 'thin' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── IconBtn ─────────────────────────────────────────────────────────────────
export function IconBtn({ icon, tip, onClick, active, color, disabled = false, side = 'top', size = 28 }) {
  const c = color || '#7c3aed';
  const btn = (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: size, height: size, borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? `${c}28` : 'rgba(255,255,255,0.04)',
        color: active ? c : '#6b7280', opacity: disabled ? 0.35 : 1,
        outline: active ? `1px solid ${c}50` : '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { if (!active && !disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#d1d5db'; } }}
      onMouseLeave={(e) => { if (!active && !disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6b7280'; } }}
    >
      {React.cloneElement(icon, { style: { width: size * 0.5, height: size * 0.5 } })}
    </button>
  );
  return tip ? <Tooltip text={tip} side={side}>{btn}</Tooltip> : btn;
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
const S_CFG = {
  idle:        { Icon: Box,          label: 'Várakozás',    bg: 'rgba(255,255,255,0.06)', col: '#6b7280' },
  pending:     { Icon: Loader2,      label: 'Feldolgozás…', bg: 'rgba(124,58,237,0.15)', col: '#a78bfa', spin: true },
  in_progress: { Icon: Loader2,      label: 'Generálás…',   bg: 'rgba(59,130,246,0.15)', col: '#60a5fa', spin: true },
  succeeded:   { Icon: CheckCircle2, label: 'Elkészült',    bg: 'rgba(16,185,129,0.14)', col: '#34d399' },
  failed:      { Icon: AlertCircle,  label: 'Hiba',         bg: 'rgba(239,68,68,0.14)',  col: '#f87171' },
  expired:     { Icon: AlertCircle,  label: 'Lejárt',       bg: 'rgba(245,158,11,0.14)', col: '#fbbf24' },
};

export function StatusPill({ status }) {
  const c = S_CFG[status?.toLowerCase()] || S_CFG.idle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
      borderRadius: 999, background: c.bg, color: c.col, fontSize: 11, fontWeight: 700,
    }}>
      <c.Icon style={{ width: 11, height: 11, ...(c.spin ? { animation: 'spin 1s linear infinite' } : {}) }} />
      {c.label}
    </span>
  );
}