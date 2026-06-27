// Builds controls.json from the NIST AI RMF reference markdown files.
//
// Rationale:
//  - The five reference files (all.md, govern.md, map.md, measure.md, manage.md)
//    list control points, but use INCONSISTENT markdown formatting:
//      "### GOVERN 1.1"      (govern/measure/manage)
//      "  * ### MAP 1.1"     (map, indented list-style)
//  - Bare function headers ("# Govern", "# Map", ...) are category labels and are
//    NOT scorable.
//  - Only numbered sub-points (FUNCTION N.N) are scorable controls.
//
// Approach: scan every reference file for the canonical control-id pattern
// `(GOVERN|MAP|MEASURE|MANAGE)\s+\d+\.\d+`, normalize, and deduplicate. Loading
// all five files and deduping by id yields the correct union with no double counts.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const refDir = join(__dirname, "..", "reference");
const outFile = join(__dirname, "..", "functions", "api", "controls.json");

const FUNCTIONS = ["GOVERN", "MAP", "MEASURE", "MANAGE"]; // fixed display order
const ID_RE = /\b(GOVERN|MAP|MEASURE|MANAGE)\s+(\d+)\.(\d+)\b/gi;

const found = new Map(); // id -> {fn, major, minor}

for (const file of readdirSync(refDir)) {
  if (!file.toLowerCase().endsWith(".md")) continue;
  const text = readFileSync(join(refDir, file), "utf8");
  let m;
  while ((m = ID_RE.exec(text)) !== null) {
    const fn = m[1].toUpperCase();
    const major = parseInt(m[2], 10);
    const minor = parseInt(m[3], 10);
    const id = `${fn} ${major}.${minor}`;
    if (!found.has(id)) found.set(id, { fn, major, minor });
  }
}

// Group + sort numerically within each function.
const byFunction = {};
for (const fn of FUNCTIONS) byFunction[fn] = [];
for (const { fn, major, minor } of found.values()) {
  byFunction[fn].push({ id: `${fn} ${major}.${minor}`, major, minor });
}
for (const fn of FUNCTIONS) {
  byFunction[fn].sort((a, b) => a.major - b.major || a.minor - b.minor);
}

const controls = {};
let totalMax = 0;
for (const fn of FUNCTIONS) {
  const ids = byFunction[fn].map((c) => c.id);
  controls[fn] = ids;
  totalMax += ids.length;
}

const output = {
  generatedAt: new Date().toISOString(),
  order: FUNCTIONS,
  controls, // { GOVERN: [...ids], MAP: [...], MEASURE: [...], MANAGE: [...] }
  max: Object.fromEntries(FUNCTIONS.map((fn) => [fn, controls[fn].length])),
  totalMax,
};

writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n");

console.log("Wrote", outFile);
for (const fn of FUNCTIONS) console.log(`  ${fn}: ${controls[fn].length}`);
console.log("  TOTAL:", totalMax);
