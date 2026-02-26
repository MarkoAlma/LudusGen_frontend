import { db } from '../../firebase/firebaseApp';
import { STYLE_OPTIONS } from './Constants';

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
  // Numerikus ts mező (Date.now()) — legmegbízhatóbb
  if (typeof item.ts === 'number' && item.ts > 0) return item.ts;
  // Firestore Timestamp objektum
  if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
  // ISO string vagy ms szám
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!isNaN(t)) return t;
  }
  // ts lehet Firestore Timestamp is
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
// GLB fetcher
// ────────────────────────────────────────────────────────────────────────────

export async function fetchGlbAsBlob(modelUrl, getIdToken) {
  if (!modelUrl) return null;

  // data URI — base64 fallback
  if (modelUrl.startsWith('data:')) return modelUrl;

  // URL feloldás
  let fetchUrl = modelUrl;
  if (modelUrl.startsWith('/api/')) {
    fetchUrl = `http://localhost:3001${modelUrl}`;
  } else if (
    modelUrl.startsWith('https://s3.') ||
    modelUrl.includes('backblazeb2.com') ||
    modelUrl.includes('b2cdn.com')
  ) {
    fetchUrl = `http://localhost:3001/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
  }

  let token = '';
  try {
    token = getIdToken ? await getIdToken() : '';
  } catch (e) {
    console.warn('fetchGlbAsBlob: getIdToken hiba:', e?.message ?? e);
  }

  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const r = await fetch(fetchUrl, { headers });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`GLB letöltés sikertelen: HTTP ${r.status} — ${fetchUrl}\n${body.slice(0, 200)}`);
  }

  const blob = await r.blob();
  return URL.createObjectURL(blob);
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

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — paginated
// ────────────────────────────────────────────────────────────────────────────

import {
  collection, query, where, orderBy, limit as firestoreLimit,
  startAfter, getDocs,
} from "firebase/firestore";

/**
 * Fetches one page of Trellis history for a user, ordered newest-first.
 * Sorting is done client-side to avoid requiring a composite Firestore index.
 *
 * @param {string} userId
 * @param {{ limit: number, startAfter: import("firebase/firestore").DocumentSnapshot|null }} opts
 * @returns {Promise<{ items: object[], lastDoc: import("firebase/firestore").DocumentSnapshot|null }>}
 */
export async function loadHistoryPageFromFirestore(userId, { limit = 10, startAfter: cursor = null } = {}) {
  const constraints = [
    where("userId", "==", userId),
    firestoreLimit(limit),
  ];

  if (cursor) constraints.push(startAfter(cursor));

  const q    = query(collection(db, "trellis_history"), ...constraints);
  const snap = await getDocs(q);

  const items = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    // Robusztus rendezés: ts (number) > createdAt (Timestamp) > createdAt (string) > 0
    .sort((a, b) => getItemTs(b) - getItemTs(a));

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastDoc };
}

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — save
// ────────────────────────────────────────────────────────────────────────────

import { collection as col, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Saves a new Trellis history item to Firestore.
 *
 * @param {string} userId
 * @param {object} itemData  — prompt, name, status, model_url, params, style, ts
 * @returns {Promise<{ docId: string }>}
 */
export async function saveHistoryToFirestore(userId, itemData) {
  const docRef = await addDoc(col(db, "trellis_history"), {
    userId,
    ...itemData,
    createdAt: serverTimestamp(),   // Firestore server timestamp (indexeléshez)
    ts: itemData.ts ?? Date.now(),  // numerikus ts (kliens oldali rendezéshez)
  });
  return { docId: docRef.id };
}