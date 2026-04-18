import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseApp';

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

  const updateJob = useCallback((id, patch) => {
    setJobs((prev) => normalizeJobs(prev.map((job) => (job.id === id ? { ...job, ...patch, updatedAt: patch.updatedAt ?? Date.now() } : job))));
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

  const value = useMemo(() => ({
    jobs,
    addJob,
    updateJob,
    markJobDone,
    markJobError,
    removeJob,
    clearSeenCompletedJobs,
  }), [jobs, addJob, updateJob, markJobDone, markJobError, removeJob, clearSeenCompletedJobs]);

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobs must be used within JobsProvider');
  return ctx;
}
