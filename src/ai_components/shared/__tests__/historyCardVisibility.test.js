import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../HistoryCard.jsx"), "utf8");
const effectStart = source.indexOf("if (isImageSet) return undefined;");
assert.notEqual(effectStart, -1, "model thumbnail effect was not found");

const dependencyStart = source.indexOf("}, [", effectStart);
const dependencyEnd = source.indexOf("]);", dependencyStart);
const dependencies = source.slice(dependencyStart, dependencyEnd);

assert.match(
  dependencies,
  /\bisVisible\b/,
  "HistoryCard must rerun thumbnail loading after IntersectionObserver marks it visible"
);

console.log("historyCardVisibility tests passed");
