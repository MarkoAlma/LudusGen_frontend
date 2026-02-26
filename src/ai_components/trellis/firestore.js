import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseApp';
import { TRELLIS_COLLECTION } from './Constants';

// ────────────────────────────────────────────────────────────────────────────
// Firestore History Operations
// ────────────────────────────────────────────────────────────────────────────

/**
 * Load user's Trellis generation history from Firestore
 * @param {string} userId
 * @returns {Promise<Array>}
 */
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

/**
 * Save a new generation to Firestore history
 * @param {string} userId
 * @param {Object} item
 * @returns {Promise<string|null>} Document ID or null
 */
export async function saveHistoryToFirestore(userId, item) {
  if (!userId) return null;
  try {
    const docRef = await addDoc(collection(db, TRELLIS_COLLECTION), {
      ...item,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.warn('Firestore history save failed:', e.message);
    return null;
  }
}

/**
 * Delete all of a user's history from Firestore
 * @param {string} userId
 * @returns {Promise<void>}
 */
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