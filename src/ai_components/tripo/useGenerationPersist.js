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
  } catch {}
}

export function clearPersistedGen() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

export function markHistorySaved() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    localStorage.setItem(LS_KEY, JSON.stringify({ ...JSON.parse(raw), savedToHistory: true }));
  } catch {}
}
