import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedHistorySource = readFileSync(resolve(__dirname, "../Shared3DHistory.jsx"), "utf8");
const trellisGeneratorSource = readFileSync(resolve(__dirname, "../../trellis_studio/TrellisGenerator.jsx"), "utf8");

assert(
  sharedHistorySource.includes("resolveHistoryCollectionForTab"),
  "Shared3DHistory should resolve the Firestore collection from the active history tab",
);

assert(
  sharedHistorySource.includes("const resolvedFirestoreCollection = resolveHistoryCollectionForTab"),
  "Shared3DHistory should derive its Firestore subscription from the selected history tab",
);

assert(
  trellisGeneratorSource.includes("firestoreCollectionsByTab={{"),
  "TrellisGenerator should provide per-tab Firestore collections to Shared3DHistory",
);

assert(
  trellisGeneratorSource.includes("tripo: 'tripo_history'"),
  "TrellisGenerator should route the Tripo tab to tripo_history",
);

assert(
  trellisGeneratorSource.includes("trellis: 'trellis_history'"),
  "TrellisGenerator should keep the Trellis tab on trellis_history",
);

console.log("shared3DHistoryCollectionRouting assertions passed");
