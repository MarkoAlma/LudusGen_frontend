// src/ai_components/tripo/useGenerationPersist.js
//
// Handles generation state persistence across page reloads via localStorage.
// Tracks active taskId, requestId, stop reason, and progress snapshot.

const LS_KEY = "tripo_active_gen";

/**
 * @typedef {{
 *   taskId: string,
 *   requestId: string,
 *   startedAt: number,
 *   lastProgress: number,
 *   lastProgressAt: number,
 *   mode: string,
 *   prompt: string,
 *   modelVer: string,
 *   riggedId: string | null,
 *   opType: string | undefined,
 * }} PersistedGen
 */

export function persistGen(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...data, riggedId: data.riggedId ?? null, savedAt: Date.now() })); }
  catch { /* quota / private browsing */ }
}

export function loadPersistedGen() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Discard stale entries older than 10 minutes
    if (Date.now() - (data.savedAt ?? 0) > 10 * 60 * 1000) {
      clearPersistedGen();
      return null;
    }
    return data;
  } catch { return null; }
}

export function updatePersistedProgress(progress) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    localStorage.setItem(LS_KEY, JSON.stringify({
      ...data,
      lastProgress: progress,
      lastProgressAt: Date.now(),
    }));
  } catch { }
}

export function clearPersistedGen() {
  try { localStorage.removeItem(LS_KEY); } catch { }
}

export function markHistorySaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    localStorage.setItem(LS_KEY, JSON.stringify({ ...JSON.parse(raw), savedToHistory: true }));
  } catch { }
}

/* ─── parallel task persistence (tripo_active_tasks array) ────────── */
const LS_TASKS_KEY = "tripo_active_tasks";
const TASK_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function persistActiveTask(instance) {
  persistActiveTasks([instance]);
}

export function persistActiveTasks(instances) {
  try {
    const raw = localStorage.getItem(LS_TASKS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    
    instances.forEach(instance => {
      const idx = list.findIndex(e => e.instanceId === instance.instanceId);
      const entry = {
        instanceId: instance.instanceId,
        taskId: instance.taskId,
        status: instance.status ?? "running",
        mode: instance.mode,
        originalTaskId: instance.originalTaskId,
        label: instance.label,
        progress: instance.progress,
        startedAt: instance.startedAt,
        opType: instance.mode,
        snapshot: instance.snapshot ?? null,
        savedAt: Date.now(),
      };
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
    });
    
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(list));
  } catch { /* quota / private browsing */ }
}

export function removeActiveTask(instanceId) {
  try {
    const raw = localStorage.getItem(LS_TASKS_KEY);
    if (!raw) return;
    const list = JSON.parse(raw).filter(e => e.instanceId !== instanceId);
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(list));
  } catch { }
}

export function clearAllPersistedActiveTasks() {
  try { localStorage.removeItem(LS_TASKS_KEY); } catch (_) {}
}

export function loadPersistedActiveTasks() {
  try {
    const raw = localStorage.getItem(LS_TASKS_KEY);
    if (!raw) return [];
    const now = Date.now();
    return JSON.parse(raw).filter(e => now - (e.savedAt ?? 0) < TASK_TTL_MS);
  } catch { return []; }
}
