import { db } from '../../firebase/firebaseApp';
import { STYLE_OPTIONS } from './Constants';
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  addDoc,
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchGlbAsBlob(modelUrl, getIdToken) {
  if (!modelUrl) return null;

  // data URI — base64 fallback
  if (modelUrl.startsWith('data:')) return modelUrl;

  // URL feloldás
  let fetchUrl = modelUrl;
  if (modelUrl.startsWith('/api/')) {
    // BUG FIX: volt hardcoded http://localhost:3001 — production-ban törött
    fetchUrl = `${API_BASE}${modelUrl}`;
  } else if (modelUrl.includes('tripo3d.com')) {
    // tripo CDN CORS-blokkolt, saját proxy endpointja van (nem a trellis proxy!)
    fetchUrl = `${API_BASE}/api/tripo/model-proxy?url=${encodeURIComponent(modelUrl)}`;
  } else if (
    modelUrl.startsWith('https://s3.') ||
    modelUrl.includes('backblazeb2.com') ||
    modelUrl.includes('b2cdn.com')
  ) {
    fetchUrl = `${API_BASE}/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
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
// Firestore history — paginated load
//
// BUG FIX: orderBy("ts") → orderBy("createdAt")
// A régi itemeknek nincs ts mezőjük (csak createdAt serverTimestamp).
// A Firestore kihagyta ezeket a dokumentumokat az orderBy("ts") querynél.
// createdAt minden rekordban megvan. Client-side getItemTs() rendez pontosan.
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

  const items = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => getItemTs(b) - getItemTs(a));

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastDoc };
}

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — save
//
// BUG FIX: a firestore.js-ben lévő saveHistoryToFirestore elavult duplikátum
// volt, ami nem mentette a ts mezőt. Ez az egyetlen helyes verzió.
// ────────────────────────────────────────────────────────────────────────────

export async function saveHistoryToFirestore(userId, itemData) {
  const docRef = await addDoc(collection(db, 'trellis_history'), {
    userId,
    ...itemData,
    createdAt: serverTimestamp(),   // Firestore index + load
    ts: itemData.ts ?? Date.now(),  // client-side rendezés
  });
  return { docId: docRef.id };
}