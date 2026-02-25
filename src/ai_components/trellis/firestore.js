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
  serverTimestamp 
} from 'firebase/firestore';
import { TRELLIS_COLLECTION } from './constants';

// ────────────────────────────────────────────────────────────────────────────
// Firestore History Operations
// ────────────────────────────────────────────────────────────────────────────
// Note: Requires 'db' (Firestore instance) to be passed or imported

/**
 * Load user's Trellis generation history from Firestore
 * @param {string} userId - User ID
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Array>} - Array of history items
 */
export async function loadHistoryFromFirestore(userId, db) {
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
 * @param {string} userId - User ID
 * @param {Object} item - Generation item to save
 * @param {Object} db - Firestore database instance
 * @returns {Promise<string|null>} - Document ID or null on failure
 */
export async function saveHistoryToFirestore(userId, item, db) {
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
 * Delete all user's history from Firestore
 * @param {string} userId - User ID
 * @param {Object} db - Firestore database instance
 * @returns {Promise<void>}
 */
export async function deleteHistoryFromFirestore(userId, db) {
  if (!userId) return;
  try {
    const q = query(
      collection(db, TRELLIS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(doc(db, TRELLIS_COLLECTION, d.id)));
    await Promise.all(deletePromises);
  } catch (e) {
    console.warn('Firestore history delete failed:', e.message);
  }
}