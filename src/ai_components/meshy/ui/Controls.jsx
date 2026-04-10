// ui/controls.jsx — Toggle, SegControl, Select, MeshyRow, NumStepper, Collapsible, HistoryCard
import React, { useState, useRef, useEffect } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from './Primitives';

// ─── Toggle ──────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label, hint, color }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div>
        <p className="text-zinc-400 font-black text-[9px] uppercase tracking-[0.4em] italic leading-none mb-1">{label}</p>
        {hint && <p className="text-zinc-700 text-[8px] font-bold uppercase tracking-widest leading-none m-0">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4.5 rounded-full flex-shrink-0 cursor-pointer border-none transition-all duration-300 ${
          value ? '' : 'bg-white/[0.05]'
        }`}
        style={value ? { background: color || '#10b981', boxShadow: `0 0 10px ${color || '#10b981'}40` } : {}}
      >
        <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-300 ${
          value ? 'left-[18px]' : 'left-[2px]'
        }`} />
      </button>
    </div>
  );
}

// ─── SegControl ───────────────────────────────────────────────────────────────
export function SegControl({ value, options, onChange, color }) {
  return (
    <div className="flex bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden mb-3">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} 
            className={`flex-1 py-2 px-1 border-none text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all duration-300 ${
              isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
            }`}
            style={isActive ? { background: color || '#10b981' } : {}}
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
    <div className="mb-3" ref={ref}>
      {label && <p className="text-zinc-700 font-black text-[8px] uppercase tracking-[0.4em] italic mb-2 px-1">{label}</p>}
      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} 
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-300 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer"
        >
          {options.find((o) => o.value === value)?.label ?? value}
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-700 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[1000] rounded-xl bg-[#0d0d12] border border-white/10 shadow-2xl overflow-hidden p-1">
            {options.map((o) => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }} 
                className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer border-none transition-all ${
                  value === o.value ? 'bg-white/5 text-emerald-400' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]'
                }`}
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
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-zinc-600 font-black text-[9px] uppercase tracking-[0.4em] italic">{label}</span>
        {tip && (
          <Tooltip text={tip} side="right">
            <Info className="w-2.5 h-2.5 text-zinc-800 cursor-help" />
          </Tooltip>
        )}
        {premium && <span className="text-[8px] opacity-20">👑</span>}
      </div>
      {children}
    </div>
  );
}

// ─── NumStepper ───────────────────────────────────────────────────────────────
export function NumStepper({ value, onChange, min = 1, max = 4 }) {
  return (
    <div className="inline-flex items-center bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} 
        className={`w-8 h-8 flex items-center justify-center border-none bg-transparent transition-colors ${
          value <= min ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-200 hover:bg-white/5 cursor-pointer'
        } text-lg font-bold`}
      >‹</button>
      <span className="min-w-[2rem] text-center text-zinc-300 text-[11px] font-black font-mono">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} 
        className={`w-8 h-8 flex items-center justify-center border-none bg-transparent transition-colors ${
          value >= max ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-200 hover:bg-white/5 cursor-pointer'
        } text-lg font-bold`}
      >›</button>
    </div>
  );
}

// ─── Collapsible ──────────────────────────────────────────────────────────────
export function Collapsible({ title, icon, children, defaultOpen = false, color }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen((o) => !o)} 
        className="w-full flex items-center justify-between bg-none border-none cursor-pointer py-2 px-1 group"
      >
        <span className="flex items-center gap-3 text-zinc-500 group-hover:text-zinc-300 transition-colors text-[9px] font-black uppercase tracking-[0.4em] italic">
          {icon && React.cloneElement(icon, { className: "w-3 h-3 transition-colors", style: { color: open ? (color || '#10b981') : '#3f3f46' } })}
          {title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-800 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="py-2">{children}</div>}
    </div>
  );
}

// ─── HistoryCard ──────────────────────────────────────────────────────────────
const fmtDate = (d) => new Date(d).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function HistoryCard({ item, isActive, onSelect, color }) {
  return (
    <button onClick={() => onSelect(item)} 
      className={`w-full text-left rounded-2xl p-2.5 cursor-pointer transition-all duration-500 relative overflow-hidden group/card ${
        isActive 
          ? 'bg-white/[0.04] border border-white/10 shadow-2xl' 
          : 'bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10'
      }`}
    >
      <div className="flex gap-3 items-center relative z-10">
        <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-950 border border-white/5 flex items-center justify-center transition-transform duration-500 group-hover/card:scale-105`}>
          {item.thumbnail
            ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            : <Box className="w-5 h-5 text-zinc-800" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-200 font-black text-[10px] uppercase tracking-tight truncate m-0 group-hover/card:text-white transition-colors">
            {item.prompt || "Untitled Unit"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-zinc-700 font-black text-[8px] uppercase tracking-widest">{fmtDate(item.ts)}</span>
            {isActive && <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: color || '#10b981' }} />}
          </div>
        </div>
      </div>
      
      {/* Decorative pulse for active card */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-[shimmer_2s_infinite]" />
      )}
    </button>
  );
}