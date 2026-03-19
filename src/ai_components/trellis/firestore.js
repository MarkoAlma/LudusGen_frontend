// firestore.js — DEPRECATED helpers
// Ezek a függvények a utils.js-be kerültek át, ahol egységes importokkal és
// validációval vannak ellátva. Ez a fájl csak visszafelé kompatibilitás miatt marad,
// és a utils.js-ből re-exportálja a függvényeket.

export {
  loadHistoryPageFromFirestore,
  saveHistoryToFirestore,
  deleteHistoryFromFirestore,
} from './utils';
