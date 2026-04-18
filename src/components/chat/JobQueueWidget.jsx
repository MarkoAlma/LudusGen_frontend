import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, XCircle, Clock3, ChevronRight } from 'lucide-react';
import { useJobs } from '../../context/JobsContext';

const STATUS_META = {
  running: { label: 'Fut', icon: Activity, tone: 'text-emerald-400' },
  queued: { label: 'Sor', icon: Clock3, tone: 'text-zinc-400' },
  done: { label: 'Kész', icon: CheckCircle2, tone: 'text-sky-400' },
  error: { label: 'Hiba', icon: XCircle, tone: 'text-rose-400' },
};

function JobRow({ job, onOpen }) {
  const meta = STATUS_META[job.status] || STATUS_META.queued;
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onOpen(job)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-white/5 ${meta.tone}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-white truncate">{job.title}</p>
          <span className={`text-[8px] font-black uppercase tracking-[0.25em] ${meta.tone}`}>{meta.label}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <div className="h-full rounded-full bg-white/30" style={{ width: `${Math.max(0, Math.min(job.progress ?? 0, 100))}%` }} />
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600" />
    </button>
  );
}

function JobList({ jobs, onOpen }) {
  if (!jobs.length) {
    return (
      <motion.div
        key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-dashed border-white/5 bg-white/[0.02] px-3 py-4 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-700 text-center"
      >
        Nincs aktív feladat
      </motion.div>
    );
  }

  return jobs.map((job) => (
    <motion.div
      key={job.id}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <JobRow job={job} onOpen={onOpen} />
    </motion.div>
  ));
}

export default function JobQueueWidget({ onOpenJob }) {
  const { jobs } = useJobs();
  const visibleJobs = [...jobs]
    .filter((job) => job.status === 'running' || job.status === 'queued' || !job.seenAt)
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

  return (
    <div className="px-5 py-4 border-t border-white/5 relative z-20">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500">Folyamatban</p>
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-zinc-700 mt-1">Legfrissebb elöl</p>
        </div>
        <Activity className="w-4 h-4 text-zinc-600" />
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-hide">
        <AnimatePresence initial={false}>
          <JobList jobs={visibleJobs} onOpen={onOpenJob} />
        </AnimatePresence>
      </div>
    </div>
  );
}
