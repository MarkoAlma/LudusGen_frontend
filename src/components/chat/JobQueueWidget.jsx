import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Image, Music2, Box, Loader2,
  CheckCircle2, XCircle, Clock4, ChevronRight,
  Cpu, Mic2, Layers, Wand2, Volume2, X
} from 'lucide-react';
import { useJobs } from '../../context/JobsContext';

// ── Panel-type → icon & palette ──────────────────────────────────
const PANEL_META = {
  chat: { icon: MessageSquare, label: 'Chat', color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' },
  code: { icon: Cpu, label: 'Code', color: '#3b82f6', glow: 'rgba(59,130,246,0.35)' },
  image: { icon: Image, label: 'Image', color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
  audio: { icon: Volume2, label: 'Audio', color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  music: { icon: Music2, label: 'Music', color: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  threed: { icon: Box, label: '3D', color: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  trellis: { icon: Layers, label: 'Trellis', color: '#38bdf8', glow: 'rgba(56,189,248,0.35)' },
  tripo: { icon: Cpu, label: 'Tripo', color: '#d946ef', glow: 'rgba(217,70,239,0.35)' },
  // meshy: { icon: LayoutGrid, label: 'Meshy', color: '#f97316', glow: 'rgba(249,115,22,0.35)' },
};

const STATUS_META = {
  running: { label: 'Running', ring: true },
  queued: { label: 'Queued', ring: false },
  done: { label: 'Done', ring: false },
  error: { label: 'Error', ring: false },
};

const mojibakeDecoder = typeof TextDecoder !== 'undefined'
  ? new TextDecoder('utf-8', { fatal: true })
  : null;

const MOJIBAKE_BYTE_BY_CODEPOINT = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x015a, 0x8c], [0x0164, 0x8d], [0x017d, 0x8e], [0x0179, 0x8f],
  [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94],
  [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98],
  [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x015b, 0x9c], [0x0165, 0x9d], [0x017e, 0x9e], [0x017a, 0x9f],
  [0x02c7, 0xa1], [0x02d8, 0xa2], [0x0141, 0xa3], [0x0104, 0xa5],
  [0x015e, 0xaa], [0x017b, 0xaf], [0x02db, 0xb2], [0x0142, 0xb3],
  [0x0105, 0xb9], [0x015f, 0xba], [0x013d, 0xbc], [0x02dd, 0xbd],
  [0x013e, 0xbe], [0x017c, 0xbf], [0x0154, 0xc0], [0x0102, 0xc3],
  [0x0139, 0xc5], [0x0106, 0xc6], [0x010c, 0xc8], [0x0118, 0xca],
  [0x011a, 0xcc], [0x010e, 0xcf], [0x0110, 0xd0], [0x0143, 0xd1],
  [0x0147, 0xd2], [0x0150, 0xd5], [0x0158, 0xd8], [0x016e, 0xd9],
  [0x0170, 0xdb], [0x0162, 0xde], [0x0155, 0xe0], [0x0103, 0xe3],
  [0x013a, 0xe5], [0x0107, 0xe6], [0x010d, 0xe8], [0x0119, 0xea],
  [0x011b, 0xec], [0x010f, 0xef], [0x0111, 0xf0], [0x0144, 0xf1],
  [0x0148, 0xf2], [0x0151, 0xf5], [0x0159, 0xf8], [0x016f, 0xf9],
  [0x0171, 0xfb], [0x0163, 0xfe], [0x02d9, 0xff],
]);

const MOJIBAKE_START_BYTES = new Set([0xc2, 0xc3, 0xc4, 0xc5, 0xe2]);
const MOJIBAKE_PATTERN = /[ÃÂĂĹÅâ][\s\S]?/;

function mojibakeByteForChar(char) {
  const codePoint = char?.codePointAt(0);
  if (codePoint == null) return null;
  if (codePoint <= 0xff) return codePoint;
  return MOJIBAKE_BYTE_BY_CODEPOINT.get(codePoint) ?? null;
}

function utf8SequenceLength(firstByte) {
  if (firstByte >= 0xc2 && firstByte <= 0xdf) return 2;
  if (firstByte >= 0xe0 && firstByte <= 0xef) return 3;
  if (firstByte >= 0xf0 && firstByte <= 0xf4) return 4;
  return 1;
}

function repairMojibakeText(value) {
  const text = String(value ?? '');
  if (!mojibakeDecoder || text.length === 0) return text;
  if (!MOJIBAKE_PATTERN.test(text)) return text;

  let repaired = '';
  let changed = false;

  for (let i = 0; i < text.length;) {
    const firstByte = mojibakeByteForChar(text[i]);
    if (!MOJIBAKE_START_BYTES.has(firstByte)) {
      repaired += text[i];
      i += 1;
      continue;
    }

    const sequenceLength = utf8SequenceLength(firstByte);
    const bytes = [];
    let canDecode = true;

    for (let offset = 0; offset < sequenceLength; offset += 1) {
      const nextByte = mojibakeByteForChar(text[i + offset]);
      if (nextByte == null) {
        canDecode = false;
        break;
      }
      bytes.push(nextByte);
    }

    if (canDecode && bytes.length === sequenceLength) {
      try {
        const decoded = mojibakeDecoder.decode(new Uint8Array(bytes));
        repaired += decoded;
        changed = true;
        i += sequenceLength;
        continue;
      } catch {
        // Keep the original text if the byte sequence was not valid UTF-8.
      }
    }

    repaired += text[i];
    i += 1;
  }

  return changed ? repaired.normalize('NFC') : text;
}

// Animated spinning ring for running jobs
function SpinningRing({ color }) {
  return (
    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <Motion.circle
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
  const displayTitle = repairMojibakeText(job.title || panelMeta.label);

  const isRunning = job.status === 'running';
  const isDone = job.status === 'done';
  const isError = job.status === 'error';
  const isQueued = job.status === 'queued';
  const hasCountdown = isQueued && job.countdown != null;

  const statusColor = isDone
    ? '#34d399'
    : isError
      ? '#f87171'
      : isQueued
        ? '#71717a'
        : panelMeta.color;

  return (
    <Motion.div
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
          <p className="text-[11px] font-black uppercase text-white/90 truncate leading-[1.35] py-px">
            {displayTitle}
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
          <Motion.div
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
            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Done
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 text-[8px] font-bold text-rose-400">
              <XCircle className="h-2.5 w-2.5" />
              Error
            </span>
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
          title="Stop / Delete"
        >
          <X className="w-3 h-3 transition-transform group-hover/cancel:scale-110" />
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover/row:text-zinc-400 transition-colors" />
      </div>
    </Motion.div>
  );
}

export default function JobQueueWidget({ onOpenJob, activeChatSessionId, activeMediaJob, activePanelType }) {
  const { jobs, cancelJob, updateJob } = useJobs();

  React.useEffect(() => {
    if (activePanelType !== 'chat' || !activeChatSessionId) return;

    jobs.forEach((job) => {
      if (
        (job.panelType === 'chat' || job.panelType === 'code') &&
        job.sessionId === activeChatSessionId &&
        (job.status === 'done' || job.status === 'error') &&
        !job.seenAt
      ) {
        updateJob(job.id, { seenAt: Date.now() });
      }
    });
  }, [activePanelType, activeChatSessionId, jobs, updateJob]);

  React.useEffect(() => {
    if (activePanelType !== 'image' && activePanelType !== 'audio') return;

    jobs.forEach((job) => {
      if (
        job.panelType === activePanelType &&
        (job.status === 'done' || job.status === 'error') &&
        !job.seenAt
      ) {
        updateJob(job.id, { seenAt: Date.now() });
      }
    });
  }, [activePanelType, jobs, updateJob]);

  const visibleJobs = [...jobs]
    .filter((job) => {
      const isForegroundChatJob =
        (job.panelType === 'chat' || job.panelType === 'code') &&
        job.sessionId &&
        activeChatSessionId === job.sessionId;
      const isForegroundMediaJob =
        (job.panelType === 'image' || job.panelType === 'audio') &&
        activeMediaJob?.panelType === job.panelType &&
        activeMediaJob?.jobId === job.id;
      const isActiveMediaPanelCompletedJob =
        (job.panelType === 'image' || job.panelType === 'audio') &&
        activePanelType === job.panelType &&
        (job.status === 'done' || job.status === 'error');

      if (isForegroundChatJob || isForegroundMediaJob || isActiveMediaPanelCompletedJob) return false;
      return job.status === 'running' || job.status === 'queued' || !job.seenAt;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const activeCount = visibleJobs.filter(j => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="relative z-20 mt-auto">
      {/* Top separator with gradient glow effect */}
      <div className="relative h-px mx-5 mb-4">
        <div className="absolute inset-0 bg-white/5" />
        {activeCount > 0 && (
          <Motion.div
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
              In progress
            </p>
          </div>

          {activeCount > 0 && (
            <Motion.span
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
              {activeCount} active
            </Motion.span>
          )}
        </div>

        {/* Job list */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto scrollbar-hide">
          <AnimatePresence initial={false}>
            {visibleJobs.length === 0 ? (
              <Motion.div
                key="empty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-5 rounded-2xl gap-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.05)' }}
              >
                <Wand2 className="w-4 h-4 text-zinc-700" />
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-700">
                  No active tasks
                </p>
              </Motion.div>
            ) : (
              visibleJobs.map((job) => (
                <Motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <JobRow job={job} onOpen={onOpenJob} onCancel={cancelJob} onMarkSeen={(id) => updateJob(id, { seenAt: Date.now() })} />
                </Motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
