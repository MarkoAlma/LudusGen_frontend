import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../HistoryCard.jsx"), "utf8");

assert.match(
  source,
  /getModelPreviewImageUrl/,
  "HistoryCard should use Tripo model preview images before rendering FBX thumbnails"
);

const previewIndex = source.indexOf("getModelPreviewImageUrl");
const fetchIndex = source.indexOf("fetchModelData(item.model_url");

assert.ok(fetchIndex > previewIndex, "model preview image handling should run before model data fetching");

assert.match(
  source,
  /\/api\/tripo\/task\//,
  "HistoryCard should recover preview images for older model history entries from Tripo task metadata"
);

console.log("historyCardModelPreview tests passed");
