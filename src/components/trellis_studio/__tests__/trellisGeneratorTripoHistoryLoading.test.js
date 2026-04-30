import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TrellisGenerator.jsx"), "utf8");

assert.equal(
  source.includes("useSearchParams"),
  true,
  "TrellisGenerator should read URL params so Tripo selections can be restored after refresh",
);

assert.equal(
  source.includes("fetchGlbAsBlob"),
  true,
  "TrellisGenerator should load Tripo history models through the shared blob/proxy helper",
);

assert.equal(
  source.includes('n.set("tripoTaskId", item.taskId)'),
  true,
  "TrellisGenerator should sync the selected Tripo task into the URL",
);

assert.equal(
  source.includes("setModelUrl(item.model_url);"),
  false,
  "TrellisGenerator should not hand raw history URLs straight to the viewer",
);

assert.equal(
  source.includes("defaultTab={defaultHistoryTab}"),
  true,
  "TrellisGenerator should open the Tripo history tab when the URL targets a Tripo task",
);

console.log("trellisGeneratorTripoHistoryLoading assertions passed");
