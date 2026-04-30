import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseApp';
import { API_BASE } from '../api/client';

const JOBS_STORAGE_KEY = 'ludusgen_active_jobs';
const JOBS_GUEST_KEY = 'guest';
const MAX_COMPLETED_JOBS = 5;

const JobsContext = createContext(null);

function storageKeyFor(uid) {
  return `${JOBS_STORAGE_KEY}:${uid || JOBS_GUEST_KEY}`;
}

function readStoredJobs(uid) {
  try {
    const raw = localStorage.getItem(storageKeyFor(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((job) => job && typeof job.id === 'string' && typeof job.status === 'string');
  } catch {
    return [];
  }
}

function writeStoredJobs(uid, jobs) {
  try {
    localStorage.setItem(storageKeyFor(uid), JSON.stringify(jobs));
  } catch {
    // ignore storage failures
  }
}

function normalizeJobs(jobs) {
  const running = jobs.filter((job) => job.status === 'running' || job.status === 'queued');
  const completed = jobs
    .filter((job) => job.status === 'done' || job.status === 'error')
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0))
    .slice(0, MAX_COMPLETED_JOBS);

  return [...running.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)), ...completed];
}

export function JobsProvider({ children }) {
  const [userUid, setUserUid] = useState(null);
  const [jobs, setJobs] = useState(() => normalizeJobs(readStoredJobs(null)));
  const cancelHandlersRef = useRef(new Map());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUserUid(currentUser?.uid || null);
      setJobs(normalizeJobs(readStoredJobs(currentUser?.uid || null)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    writeStoredJobs(userUid, jobs);
  }, [userUid, jobs]);

  const addJob = useCallback((job) => {
    setJobs((prev) => normalizeJobs([{ ...job }, ...prev.filter((item) => item.id !== job.id)]));
  }, []);

  const addJobs = useCallback((newJobs) => {
    setJobs((prev) => {
      const ids = new Set(newJobs.map(j => j.id));
      return normalizeJobs([...newJobs, ...prev.filter(j => !ids.has(j.id))]);
    });
  }, []);

  const updateJob = useCallback((id, patch) => {
    setJobs((prev) => normalizeJobs(prev.map((job) => (job.id === id ? { ...job, ...patch, updatedAt: patch.updatedAt ?? Date.now() } : job))));
  }, []);

  const updateJobs = useCallback((updates) => {
    setJobs((prev) => {
      const updateMap = new Map(updates.map(u => [u.id, u.patch]));
      return normalizeJobs(prev.map((job) => {
        const patch = updateMap.get(job.id);
        if (patch) return { ...job, ...patch, updatedAt: patch.updatedAt ?? Date.now() };
        return job;
      }));
    });
  }, []);

  const markJobDone = useCallback((id, patch = {}) => {
    setJobs((prev) => normalizeJobs(prev.map((job) => (job.id === id ? {
      ...job,
      ...patch,
      status: 'done',
      progress: patch.progress ?? 100,
      completedAt: patch.completedAt ?? Date.now(),
      updatedAt: patch.updatedAt ?? Date.now(),
      errorMessage: null,
    } : job))));
  }, []);

  // Ha a user már a panelen volt és "élőben" látta a generálást, azonnal látottnak jelöljük.
  // Ez megakadályozza, hogy a widget feleslegesen megjelenítse az értesítést.
  const markJobDoneAndSeen = useCallback((id, patch = {}) => {
    const now = Date.now();
    setJobs((prev) => normalizeJobs(prev.map((job) => (job.id === id ? {
      ...job,
      ...patch,
      status: 'done',
      progress: patch.progress ?? 100,
      completedAt: patch.completedAt ?? now,
      updatedAt: patch.updatedAt ?? now,
      seenAt: now,
      errorMessage: null,
    } : job))));
  }, []);

  const markJobError = useCallback((id, message) => {
    setJobs((prev) => normalizeJobs(prev.map((job) => (job.id === id ? {
      ...job,
      status: 'error',
      errorMessage: message,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    } : job))));
  }, []);

  const removeJob = useCallback((id) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));
  }, []);

  const registerCancelHandler = useCallback((id, fn) => {
    cancelHandlersRef.current.set(id, fn);
  }, []);

  const unregisterCancelHandler = useCallback((id) => {
    cancelHandlersRef.current.delete(id);
  }, []);

  const cancelJob = useCallback(async (id) => {
    const job = jobs.find((item) => item.id === id);

    // 1. Local cancel (stop poller/abort request)
    const fn = cancelHandlersRef.current.get(id);
    if (fn) {
      fn();
      cancelHandlersRef.current.delete(id);
    }

    // 2. Backend cancel (Tripo task endpoint, only when we have a taskId)
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token && job?.panelType === 'tripo' && job?.taskId) {
        fetch(`${API_BASE}/api/tripo/task/${job.taskId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (e) {}

    // 3. UI cleanup
    removeJob(id);
  }, [jobs, removeJob]);

  const clearSeenCompletedJobs = useCallback((panelType) => {
    setJobs((prev) => normalizeJobs(prev.map((job) => (
      (job.status === 'done' || job.status === 'error') && job.panelType === panelType
        ? { ...job, seenAt: Date.now(), updatedAt: Date.now() }
        : job
    )).filter((job) => {
      if (job.status === 'running' || job.status === 'queued') return true;
      if ((job.status === 'done' || job.status === 'error') && job.panelType === panelType) return !job.seenAt;
      return true;
    })));
  }, []);

  // ── Heartbeat a beragadt folyamatok ellen ────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setJobs((prev) => {
        let changed = false;
        const next = prev.map((job) => {
          if (job.status !== 'running' && job.status !== 'queued') return job;
          
          // Modellvagy Trellis generálásnál 30 perc, minden másnál 10 perc
          const timeout = (job.panelType === 'threed' || job.panelType === 'trellis' || job.panelType === 'tripo' || job.panelType === 'meshy') ? 1800000 : 600000;
          const lastUpdate = job.updatedAt || job.createdAt || 0;
          
          if (now - lastUpdate > timeout) {
            changed = true;
            return {
              ...job,
              status: 'error',
              errorMessage: 'Időtúllépés (Beragadt folyamat)',
              completedAt: now,
              updatedAt: now
            };
          }
          return job;
        });
        return changed ? normalizeJobs(next) : prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const value = useMemo(() => ({
    jobs,
    addJob,
    addJobs,
    updateJob,
    updateJobs,
    markJobDone,
    markJobDoneAndSeen,
    markJobError,
    removeJob,
    cancelJob,
    clearSeenCompletedJobs,
    registerCancelHandler,
    unregisterCancelHandler,
  }), [jobs, addJob, addJobs, updateJob, updateJobs, markJobDone, markJobDoneAndSeen, markJobError, removeJob, clearSeenCompletedJobs, registerCancelHandler, unregisterCancelHandler, cancelJob]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobs must be used within JobsProvider');
  return ctx;
}
