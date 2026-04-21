import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Image, Music2, Box, Loader2,
  CheckCircle2, XCircle, Clock4, ChevronRight,
  Cpu, Mic2, Layers, Wand2, Volume2, LayoutGrid, X
} from 'lucide-react';
import { useJobs } from '../../context/JobsContext';

// ── Panel-type → icon & palette ──────────────────────────────────
const PANEL_META = {
  chat:   { icon: MessageSquare, label: 'Chat',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' },
  image:  { icon: Image,        label: 'Kép',     color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  audio:  { icon: Volume2,      label: 'Hang',    color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  music:  { icon: Music2,       label: 'Zene',    color: '#06b6d4', glow: 'rgba(6,182,212,0.35)'  },
  threed: { icon: Box,          label: '3D',      color: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  trellis:{ icon: Layers,       label: 'Trellis', color: '#38bdf8', glow: 'rgba(56,189,248,0.35)' },
  tripo:  { icon: Cpu,          label: 'Tripo',   color: '#d946ef', glow: 'rgba(217,70,239,0.35)' },
  meshy:  { icon: LayoutGrid,   label: 'Meshy',   color: '#f97316', glow: 'rgba(249,115,22,0.35)' },
};

const STATUS_META = {
  running: { label: 'Folyamat',  ring: true  },
  queued:  { label: 'Várólista', ring: false },
  done:    { label: 'Kész',      ring: false },
  error:   { label: 'Hiba',      ring: false },
};

// Animated spinning ring for running jobs
function SpinningRing({ color }) {
  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <motion.circle
        cx="18" cy="18" r="15"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="20 75"
        animate={{ rotate: [0, 360] }}
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

function JobRow({ job, onOpen, onCancel, onMarkSeen }) {
  const { cancelJob } = useJobs();
  const panelMeta = PANEL_META[job.panelType] || PANEL_META.chat;
  const statusMeta = STATUS_META[job.status] || STATUS_META.queued;
  const PanelIcon = panelMeta.icon;
  const progress = Math.max(0, Math.min(job.progress ?? 0, 100));

  const isRunning = job.status === 'running';
  const isDone    = job.status === 'done';
  const isError   = job.status === 'error';
  const isQueued  = job.status === 'queued';
  const hasCountdown = isQueued && job.countdown != null;

  const statusColor = isDone
    ? '#34d399'
    : isError
    ? '#f87171'
    : isQueued
    ? '#71717a'
    : panelMeta.color;

  return (
    <motion.div
      onClick={() => { if (isDone || isError) onMarkSeen?.(job.id); onOpen(job); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (isDone || isError) onMarkSeen?.(job.id); onOpen(job); } }}
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left group/row relative overflow-hidden cursor-pointer outline-none"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid rgba(255,255,255,0.07)`,
        boxShadow: isRunning ? `0 0 18px -6px ${panelMeta.glow}` : 'none',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Hover shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at 30% 50%, ${panelMeta.color}08, transparent 70%)` }} />

      {/* Left accent line */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full transition-all duration-500"
        style={{
          backgroundColor: statusColor,
          boxShadow: isRunning ? `0 0 8px ${statusColor}` : 'none',
          opacity: isRunning || isDone || isError ? 1 : 0.35,
        }}
      />

      {/* Panel-type icon pill */}
      <div className="relative flex-shrink-0 w-9 h-9">
        {/* Soft glow behind icon */}
        <div className="absolute inset-0 rounded-[11px] opacity-20 blur-[8px] transition-opacity duration-500"
          style={{ background: panelMeta.color }}
        />
        <div
          className="relative z-10 w-9 h-9 rounded-[11px] flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${panelMeta.color}22, ${panelMeta.color}10)`,
            border: `1px solid ${panelMeta.color}30`,
            color: panelMeta.color,
          }}
        >
          {isRunning && <SpinningRing color={panelMeta.color} />}
          <PanelIcon className="w-[15px] h-[15px] relative z-10" />
        </div>
      </div>

      {/* Text + progress */}
      <div className="min-w-0 flex-1 relative z-10">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/90 truncate leading-none">
            {job.title}
          </p>

          {/* Status badge / countdown cancel */}
          {hasCountdown ? (
            <button
              onClick={e => { e.stopPropagation(); onCancel?.(job.id); }}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-150"
              style={{
                background: 'rgba(239,68,68,0.12)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.28)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
            >
              <X style={{ width: 8, height: 8 }} />
              {job.countdown}s
            </button>
          ) : (
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em]"
              style={{
                background: `${statusColor}18`,
                color: statusColor,
                border: `1px solid ${statusColor}28`,
              }}
            >
              {statusMeta.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              background: isError
                ? '#f87171'
                : isDone
                ? `linear-gradient(90deg, #34d399, #10b981)`
                : `linear-gradient(90deg, ${panelMeta.color}, ${panelMeta.color}cc)`,
              boxShadow: isRunning ? `0 0 8px ${panelMeta.color}90` : 'none',
            }}
          />
        </div>

        {/* Bottom row: type label + percent */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-600">
            {panelMeta.label}
          </span>
          {isRunning && (
            <span className="text-[8px] font-bold tabular-nums" style={{ color: panelMeta.color }}>
              {progress}%
            </span>
          )}
          {isDone && (
            <span className="text-[8px] font-bold text-emerald-400">✓ Kész</span>
          )}
          {isError && (
            <span className="text-[8px] font-bold text-rose-400">✕ Hiba</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 ml-auto relative z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            cancelJob(job.id);
          }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-90 group/cancel"
          title="Leállítás / Törlés"
        >
          <X className="w-3 h-3 transition-transform group-hover/cancel:scale-110" />
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover/row:text-zinc-400 transition-colors" />
      </div>
    </motion.div>
  );
}

export default function JobQueueWidget({ onOpenJob }) {
  const { jobs, cancelJob, updateJob } = useJobs();
  const visibleJobs = [...jobs]
    .filter((job) => job.status === 'running' || job.status === 'queued' || !job.seenAt)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const activeCount = visibleJobs.filter(j => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="relative z-20 mt-auto">
      {/* Top separator with gradient glow effect */}
      <div className="relative h-px mx-5 mb-4">
        <div className="absolute inset-0 bg-white/5" />
        {activeCount > 0 && (
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }}
          />
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            {/* Pulse dot */}
            {activeCount > 0 ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-zinc-700" />
            )}
            <p className="text-[9px] font-black uppercase tracking-[0.32em] text-zinc-400">
              Folyamatban
            </p>
          </div>

          {activeCount > 0 && (
            <motion.span
              key={activeCount}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
              style={{
                background: 'rgba(139,92,246,0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(139,92,246,0.25)',
              }}
            >
              {activeCount} aktív
            </motion.span>
          )}
        </div>

        {/* Job list */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto scrollbar-hide">
          <AnimatePresence initial={false}>
            {visibleJobs.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-5 rounded-2xl gap-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)' }}
              >
                <Wand2 className="w-4 h-4 text-zinc-700" />
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-700">
                  Nincs aktív feladat
                </p>
              </motion.div>
            ) : (
              visibleJobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <JobRow job={job} onOpen={onOpenJob} onCancel={cancelJob} onMarkSeen={(id) => updateJob(id, { seenAt: Date.now() })} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
