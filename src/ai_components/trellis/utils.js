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
  deleteDoc,
  doc,
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
// GLB fetcher
// ────────────────────────────────────────────────────────────────────────────

export async function fetchGlbAsBlob(modelUrl, getIdToken) {
  if (!modelUrl) return null;

  // data URI — base64 fallback
  if (modelUrl.startsWith('data:')) return modelUrl;

  // URL feloldás
  let fetchUrl = modelUrl;
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  if (modelUrl.startsWith('/api/')) {
    fetchUrl = `${BASE}${modelUrl}`;
  } else if (
    modelUrl.startsWith('https://s3.') ||
    modelUrl.includes('backblazeb2.com') ||
    modelUrl.includes('b2cdn.com')
  ) {
    fetchUrl = `${BASE}/api/trellis/proxy?url=${encodeURIComponent(modelUrl)}`;
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

  // Validáció: nem üres és valóban bináris GLB (magic: 0x46546C67 = "glTF")
  if (blob.size < 12) {
    throw new Error(`GLB letöltés sikertelen: túl kis fájl (${blob.size} byte)`);
  }
  const header = await blob.slice(0, 4).arrayBuffer();
  const magic  = new Uint8Array(header);
  const isGlb  = magic[0] === 0x67 && magic[1] === 0x6C && magic[2] === 0x54 && magic[3] === 0x46;
  if (!isGlb) {
    // Nem GLB — valószínűleg JSON hibaüzenet érkezett a szerver ről
    const text = await blob.text().catch(() => '');
    throw new Error(`Érvénytelen GLB fájl (nem bináris GLTF): ${text.slice(0, 300)}`);
  }

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

  if (!res.ok) {
    console.error('streamChat HTTP error:', res.status);
    return '';
  }

  const reader  = res.body.getReader();
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
// ────────────────────────────────────────────────────────────────────────────

const TRELLIS_COLLECTION = 'trellis_history';

/**
 * Fetches one page of Trellis history for a user, ordered newest-first.
 * Uses `ts` field for ordering (set at save time as Date.now()).
 * Falls back to client-side sort for robustness.
 *
 * @param {string} userId
 * @param {{ limit: number, startAfter: import("firebase/firestore").DocumentSnapshot|null }} opts
 * @returns {Promise<{ items: object[], lastDoc: import("firebase/firestore").DocumentSnapshot|null }>}
 */
export async function loadHistoryPageFromFirestore(userId, { limit = 10, startAfter: cursor = null } = {}) {
  if (!userId) return { items: [], lastDoc: null };

  const constraints = [
    where('userId', '==', userId),
    where('status', '==', 'succeeded'),   // csak sikeres generálások
    orderBy('ts', 'desc'),
    firestoreLimit(limit),
  ];

  if (cursor) constraints.push(startAfter(cursor));

  try {
    const q    = query(collection(db, TRELLIS_COLLECTION), ...constraints);
    const snap = await getDocs(q);

    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      // Kizárjuk azokat amiknek nincs model_url (mentési hiba edge case)
      .filter((i) => !!i.model_url)
      // Kliens oldali rendezés — robusztus, ha a ts mező hiányzik néhány régi dokuból
      .sort((a, b) => getItemTs(b) - getItemTs(a));

    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { items, lastDoc };
  } catch (e) {
    console.error('loadHistoryPageFromFirestore hiba:', e.message, e.code);
    // Ha a lekérdezés index-hiány miatt bukik (pl. composite index nincs),
    // fallback: rendezés nélküli lekérdezés + kliens-oldali sort
    if (e.code === 'failed-precondition' || e.message?.includes('index')) {
      console.warn('Composite index hiányzik, fallback rendezés nélkül...');
      const q2   = query(collection(db, TRELLIS_COLLECTION), where('userId', '==', userId), firestoreLimit(limit * 3));
      const snap2 = await getDocs(q2);
      const items2 = snap2.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((i) => i.status === 'succeeded' && !!i.model_url)
        .sort((a, b) => getItemTs(b) - getItemTs(a))
        .slice(0, limit);
      return { items: items2, lastDoc: null };
    }
    return { items: [], lastDoc: null };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — save
// ────────────────────────────────────────────────────────────────────────────

/**
 * Saves a new Trellis history item to Firestore.
 * Always sets both `ts` (numeric, for ordering) and `createdAt` (Firestore server timestamp).
 *
 * @param {string} userId
 * @param {object} itemData  — prompt, name, status, model_url, params, style, ts
 * @returns {Promise<{ docId: string | null }>}
 */
export async function saveHistoryToFirestore(userId, itemData) {
  if (!userId) return { docId: null };

  // Validáció: csak succeeded + model_url-lel rendelkező itemeket mentünk
  if (!itemData.model_url) {
    console.warn('saveHistoryToFirestore: model_url hiányzik, mentés kihagyva');
    return { docId: null };
  }

  try {
    const docRef = await addDoc(collection(db, TRELLIS_COLLECTION), {
      userId,
      prompt:    itemData.prompt    ?? '',
      name:      itemData.name      ?? null,
      status:    itemData.status    ?? 'succeeded',
      model_url: itemData.model_url,
      params:    itemData.params    ?? {},
      style:     itemData.style     ?? 'nostyle',
      ts:        typeof itemData.ts === 'number' ? itemData.ts : Date.now(),
      createdAt: serverTimestamp(),
    });
    return { docId: docRef.id };
  } catch (e) {
    console.warn('saveHistoryToFirestore hiba:', e.message);
    return { docId: null };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Firestore history — delete all
// ────────────────────────────────────────────────────────────────────────────

/**
 * Deletes all Trellis history documents for a user from Firestore.
 * (Backend-side delete is preferred; this is a client-side fallback.)
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteHistoryFromFirestore(userId) {
  if (!userId) return;
  try {
    const q    = query(collection(db, TRELLIS_COLLECTION), where('userId', '==', userId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, TRELLIS_COLLECTION, d.id))));
  } catch (e) {
    console.warn('deleteHistoryFromFirestore hiba:', e.message);
  }
}
