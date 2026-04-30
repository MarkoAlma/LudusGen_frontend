export function resolveHistoryCollectionForTab(
  activeTab,
  firestoreCollection = "trellis_history",
  firestoreCollectionsByTab = null,
) {
  if (firestoreCollectionsByTab?.[activeTab]) {
    return firestoreCollectionsByTab[activeTab];
  }

  return firestoreCollection;
}
