// ui/primitives.jsx — Tooltip, Modal, IconBtn, StatusPill
import React, { useState, useRef } from 'react';
import { Box, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

// ─── Tooltip ────────────────────────────────────────────────────────────────
export function Tooltip({ text, children, side = 'top', delay = 300, style, className }) {
  const [vis, setVis] = useState(false);
  const t = useRef(null);
  const show = () => { t.current = setTimeout(() => setVis(true), delay); };
  const hide = () => { clearTimeout(t.current); setVis(false); };
  const pos = {
    top:    { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 8px)',    left: '50%', transform: 'translateX(-50%)' },
    left:   { right: 'calc(100% + 8px)',  top: '50%',  transform: 'translateY(-50%)' },
    right:  { left: 'calc(100% + 8px)',   top: '50%',  transform: 'translateY(-50%)' },
  }[side];

  return (
    <div 
      className={`relative inline-flex ${className || ''}`} 
      onMouseEnter={show} 
      onMouseLeave={hide}
      style={style}
    >
      {children}
      {vis && (
        <div className="absolute z-[10000] pointer-events-none bg-zinc-950/90 text-zinc-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg white-space-nowrap border border-white/10 shadow-2xl"
          style={pos}
        >
          {text}
        </div>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0a0a0f] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] rounded-[2rem] flex flex-col overflow-hidden w-full max-h-[90vh]" 
        style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]">
          <span className="text-white font-black text-[11px] uppercase tracking-[0.4em] italic leading-none">{title}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border-none cursor-pointer flex items-center justify-center text-zinc-500 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto scrollbar-hide flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── IconBtn ─────────────────────────────────────────────────────────────────
export function IconBtn({ icon, tip, onClick, active, color, disabled = false, side = 'top', size = 32 }) {
  const c = color || '#10b981';
  const btn = (
    <button
      onClick={disabled ? undefined : onClick}
      className={`relative rounded-xl border-none transition-all duration-300 flex items-center justify-center shrink-0 ${
        disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
      } ${
        active ? 'bg-white/[0.03] shadow-lg' : 'bg-white/[0.01] hover:bg-white/[0.04]'
      }`}
      style={{
        width: size, height: size,
        color: active ? c : '#52525b',
        border: active ? `1px solid ${c}40` : '1px solid white/5'
      }}
    >
      {React.cloneElement(icon, { className: "w-1/2 h-1/2" })}
      {active && (
        <div className="absolute inset-0 blur-md opacity-20 rounded-[inherit]" style={{ backgroundColor: c }} />
      )}
    </button>
  );
  return tip ? <Tooltip text={tip} side={side}>{btn}</Tooltip> : btn;
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
const S_CFG = {
  idle:        { Icon: Box,          label: 'IDLE',    bg: 'rgba(255,255,255,0.02)', col: '#3f3f46' },
  pending:     { Icon: Loader2,      label: 'PENDING', bg: 'rgba(16,185,129,0.05)',  col: '#10b981', spin: true },
  in_progress: { Icon: Loader2,      label: 'FORGING', bg: 'rgba(16,185,129,0.1)',   col: '#34d399', spin: true },
  succeeded:   { Icon: CheckCircle2, label: 'READY',   bg: 'rgba(16,185,129,0.15)',  col: '#059669' },
  failed:      { Icon: AlertCircle,  label: 'FAIL',    bg: 'rgba(239,68,68,0.1)',    col: '#ef4444' },
  expired:     { Icon: AlertCircle,  label: 'VOID',    bg: 'rgba(255,255,255,0.02)', col: '#27272a' },
};

export function StatusPill({ status }) {
  const c = S_CFG[status?.toLowerCase()] || S_CFG.idle;
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border border-white/5 shadow-sm"
      style={{ background: c.bg, color: c.col }}
    >
      <c.Icon className={`w-2.5 h-2.5 ${c.spin ? 'animate-spin' : ''}`} />
      {c.label}
    </span>
  );
}