import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseApp';
import { TRELLIS_COLLECTION } from './Constants';

// ────────────────────────────────────────────────────────────────────────────
// DEPRECATED: loadHistoryFromFirestore
// Csak visszafelé kompatibilitáshoz marad. Pagination nélkül tölti be az
// összes rekordot. Helyette: loadHistoryPageFromFirestore() from ./utils
// ────────────────────────────────────────────────────────────────────────────

export async function loadHistoryFromFirestore(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(i => i.status === 'succeeded' && i.model_url);
  } catch (e) {
    console.error('Firestore load hiba:', e.message, e.code);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DEPRECATED: saveHistoryToFirestore
// NEM menti a `ts` numerikus mezőt, ezért a client-side rendezés rossz.
// Helyette: saveHistoryToFirestore() from ./utils  ← ez a helyes verzió
// ────────────────────────────────────────────────────────────────────────────

// export async function saveHistoryToFirestore(userId, item) { ... }
// ↑ Szándékosan kommentezve ki — ne legyen kétféle verzió.
//   Importáld a utils.js-ből!

// ────────────────────────────────────────────────────────────────────────────
// deleteHistoryFromFirestore — teljes törlés (minden rekord egyszerre)
// ────────────────────────────────────────────────────────────────────────────

export async function deleteHistoryFromFirestore(userId) {
  if (!userId) return;
  try {
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, TRELLIS_COLLECTION, d.id))));
  } catch (e) {
    console.warn('Firestore history delete failed:', e.message);
  }
}