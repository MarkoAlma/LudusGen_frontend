import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, "../TrellisGenerator.jsx"), "utf8");

const usesMotionComponent = source.includes("<motion.") || source.includes("<MotionSpan");
const importsMotion = source.includes("import { motion, AnimatePresence } from 'framer-motion';")
  || source.includes('import { motion, AnimatePresence } from "framer-motion";');

assert.equal(
  usesMotionComponent && !importsMotion,
  false,
  "TrellisGenerator should import motion whenever it renders motion.* elements",
);

console.log("trellisGeneratorMotionImport assertions passed");
