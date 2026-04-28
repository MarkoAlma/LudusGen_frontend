import { db } from '../../firebase/firebaseApp';
import { STYLE_OPTIONS } from './Constants';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  addDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

// ────────────────────────────────────────────────────────────────────────────
// Style helpers
// ────────────────────────────────────────────────────────────────────────────

export function stripStylePrefix(prompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return prompt;
  if (prompt.startsWith(style.prefix)) return prompt.slice(style.prefix.length);
  return prompt;
}

export function applyStylePrefix(rawPrompt, styleId) {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style?.prefix) return rawPrompt;
  return style.prefix + rawPrompt;
}

// ────────────────────────────────────────────────────────────────────────────
// Date formatter
// ────────────────────────────────────────────────────────────────────────────

export function fmtDate(d) {
  if (!d) return '';
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toLocaleString('hu-HU', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Robust timestamp extractor
// Handles: ts (number), createdAt (Firestore Timestamp), createdAt (ISO string)
// ────────────────────────────────────────────────────────────────────────────

export function getItemTs(item) {
  if (typeof item.ts === 'number' && item.ts > 0) return item.ts;
  if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (item.ts?.toDate) return item.ts.toDate().getTime();
  return 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Default params
// ────────────────────────────────────────────────────────────────────────────

export const defaultParams = {
  slat_cfg_scale: 3.0,
  ss_cfg_scale: 7.5,
  slat_sampling_steps: 25,
  ss_sampling_steps: 25,
  seed: 0,
  randomSeed: false,
};

// ────────────────────────────────────────────────────────────────────────────
// GLB fetcher — VITE_API_URL-t használ, production-ban is működik
// ────────────────────────────────────────────────────────────────────────────

import { API_BASE } from '../../api/client';

const HISTORY_THUMB_FETCH_LIMIT = 2;
let activeHistoryThumbFetches = 0;
const historyThumbFetchQueue = [];
const historyThumbFetchInFlight = new Map();

function runLimitedHistoryThumbFetch(task) {
  return new Promise((resolve, reject) => {
    const start = async () => {
      activeHistoryThumbFetches += 1;
      try {
        resolve(await task());
      } catch (error) {
        reject(error);
      } finally {
        activeHistoryThumbFetches -= 1;
        const next = historyThumbFetchQueue.shift();
        if (next) next();
      }
    };

    if (activeHistoryThumbFetches < HISTORY_THUMB_FETCH_LIMIT) {
      start();
      return;
    }

    historyThumbFetchQueue.push(start);
  });
}

export async function fetchGlbAsBlob(modelUrl, getIdToken, taskId = null) {
  if (!modelUrl) return null;
  if (modelUrl.startsWith('data:')) return modelUrl;

  let fetchUrl = modelUrl;
  if (modelUrl.startsWith('/api/')) {
    fetchUrl = `${API_BASE}${modelUrl}`;
  } else if (modelUrl.includes('tripo3d.com') || modelUrl.includes('tripo3d.ai')) {
    fetchUrl = `${API_BASE}/api/tripo/model-proxy?url=${encodeURIComponent(modelUrl)}${taskId ? `&taskId=${taskId}` : ''}`;
  } else if (
    modelUrl.startsWith('https://s3.') ||
    modelUrl.includes('backblazeb2.com') ||
    modelUrl.includes('b2cdn.com')
  ) {
    fetchUrl = `${API_BASE}/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
  }

  const tryFetch = async (url) => {
    let token = '';
    try {
      token = getIdToken ? await getIdToken() : '';
    } catch (e) {
      console.warn('fetchGlbAsBlob: getIdToken hiba:', e?.message ?? e);
    }
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { headers });
  };

  let r = await tryFetch(fetchUrl);

  // Retry once if 401 or 502 (proxy might be refreshing the URL)
  if (!r.ok && [401, 502].includes(r.status)) {
    console.warn(`fetchGlbAsBlob: attempt 1 failed (${r.status}), retrying in 1s...`);
    await new Promise(res => setTimeout(res, 1000));
    r = await tryFetch(fetchUrl);
  }

  if (!r.ok) {
    if (r.status === 410) {
      throw new Error("A modell lejárt vagy törölve lett a forrás szerverről (Tripo).");
    }
    const body = await r.text().catch(() => '');
    throw new Error(`GLB letöltés sikertelen: HTTP ${r.status}${body ? ` — ${body.slice(0, 100)}` : ""}`);
  }

  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

/**
 * Fetch model as ArrayBuffer (for thumbnail generation).
 * Returns { buffer: ArrayBuffer, blobUrl: string }
 */
export async function fetchModelData(modelUrl, getIdToken, taskId = null) {
  return runLimitedHistoryThumbFetch(async () => {
    if (!modelUrl) return null;
    if (modelUrl.startsWith('data:')) return null;

    let fetchUrl = modelUrl;
    if (modelUrl.startsWith('/api/')) {
      fetchUrl = `${API_BASE}${modelUrl}`;
    } else if (modelUrl.includes('tripo3d.com') || modelUrl.includes('tripo3d.ai')) {
      fetchUrl = `${API_BASE}/api/tripo/model-proxy?url=${encodeURIComponent(modelUrl)}${taskId ? `&taskId=${taskId}` : ''}`;
    } else if (
      modelUrl.startsWith('https://s3.') ||
      modelUrl.includes('backblazeb2.com') ||
      modelUrl.includes('b2cdn.com')
    ) {
      fetchUrl = `${API_BASE}/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
    }

    const tryFetch = async (url) => {
      let token = '';
      try {
        token = getIdToken ? await getIdToken() : '';
      } catch (e) {
        console.warn('fetchModelData: getIdToken hiba:', e?.message ?? e);
      }
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return fetch(url, { headers });
    };

    const inFlightKey = `${taskId ?? "no-task"}|${fetchUrl}`;
    let requestPromise = historyThumbFetchInFlight.get(inFlightKey);

    if (!requestPromise) {
      requestPromise = (async () => {
        let r = await tryFetch(fetchUrl);

        if (!r.ok && [401, 502].includes(r.status)) {
          // Retry on auth expiration or transient gateway errors, but SKIP permanent errors like 410 Gone
          console.warn(`fetchModelData: attempt 1 failed (${r.status}), retrying in 1.2s...`);
          await new Promise(res => setTimeout(res, 1200));
          r = await tryFetch(fetchUrl);
        }

        if (!r.ok) {
          const err = new Error(`Model fetch failed: HTTP ${r.status}`);
          err.status = r.status;
          throw err;
        }

        return r.arrayBuffer();
      })();

      historyThumbFetchInFlight.set(inFlightKey, requestPromise);
    }

    try {
      const sharedBuffer = await requestPromise;
      const buffer = sharedBuffer.slice(0);
      const blob = new Blob([buffer]);
      const blobUrl = URL.createObjectURL(blob);
      return { buffer, blobUrl };
    } finally {
      if (historyThumbFetchInFlight.get(inFlightKey) === requestPromise) {
        historyThumbFetchInFlight.delete(inFlightKey);
      }
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// SSE stream reader
// ────────────────────────────────────────────────────────────────────────────

export async function streamChat(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const raw = trimmed.slice(6);
      if (raw === '[DONE]') continue;
      try { accumulated += JSON.parse(raw).delta || ''; } catch { /* skip */ }
    }
  }

  return accumulated;
}

// History TTL: 7 days in milliseconds
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — paginated load
//
// BUG FIX: orderBy("ts") → orderBy("createdAt")
// A régi itemeknek nincs ts mezőjük (csak createdAt serverTimestamp).
// A Firestore kihagyta ezeket a dokumentumokat az orderBy("ts") querynél.
// createdAt minden rekordban megvan. Client-side getItemTs() rendez pontosan.
//
// TTL: expired items (older than 7 days) are filtered out client-side.
// The /api/tripo/history/expired endpoint handles server-side cleanup.
// ────────────────────────────────────────────────────────────────────────────

export async function loadHistoryPageFromFirestore(userId, { limit = 10, startAfter: cursor = null } = {}) {
  const constraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),  // BUG FIX: volt orderBy('ts', 'desc')
    firestoreLimit(limit),
  ];

  if (cursor) constraints.push(startAfter(cursor));

  const q = query(collection(db, 'trellis_history'), ...constraints);
  const snap = await getDocs(q);

  const now = Date.now();
  const items = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    // Filter out expired items (older than TTL)
    .filter((item) => {
      const ts = getItemTs(item);
      return ts === 0 || (now - ts) < HISTORY_TTL_MS;
    })
    .sort((a, b) => getItemTs(b) - getItemTs(a));

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastDoc };
}

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — save
//
// BUG FIX: a firestore.js-ben lévő saveHistoryToFirestore elavult duplikátum
// volt, ami nem mentette a ts mezőt. Ez az egyetlen helyes verzió.
//
// TTL: expiresAt mező = most + 7 nap (ms). Firestore TTL policy használható
// ezzel a mezővel automatikus törléshez (ha engedélyezve van).
// ────────────────────────────────────────────────────────────────────────────

export async function saveHistoryToFirestore(userId, itemData, docId = null, firestoreCollection = 'trellis_history') {
  if (!userId) { console.warn('[saveHistoryToFirestore] called without userId — skipped'); return { docId: null }; }
  const now = Date.now();
  const data = {
    userId,
    ...itemData,
    createdAt: serverTimestamp(),
    ts: itemData.ts ?? now,
    expiresAt: now + HISTORY_TTL_MS,
  };
  if (docId) {
    const docRef = doc(db, firestoreCollection, docId);
    await setDoc(docRef, data, { merge: true });
    return { docId };
  }
  const docRef = await addDoc(collection(db, firestoreCollection), data);
  return { docId: docRef.id };
}
