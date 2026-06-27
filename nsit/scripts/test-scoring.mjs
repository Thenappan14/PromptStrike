import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compileControls, scoreCorpus } from "../functions/api/_scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const controlSet = JSON.parse(
  readFileSync(join(__dirname, "..", "functions", "api", "controls.json"), "utf8")
);

let pass = 0,
  fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log("  ok  -", name);
  } else {
    fail++;
    console.error("  FAIL-", name);
  }
}

const compiled = compileControls(controlSet);

// 1. Empty corpus → all zero, max correct.
{
  const r = scoreCorpus("", controlSet, compiled);
  check("empty corpus overall earned = 0", r.overall.earned === 0);
  check("empty corpus total max = 72", r.overall.max === 72);
  check("order is GOVERN,MAP,MEASURE,MANAGE",
    r.order.join(",") === "GOVERN,MAP,MEASURE,MANAGE");
}

// 2. Single control matches exactly one point.
{
  const r = scoreCorpus("We address Govern 1.1 in our policy.", controlSet, compiled);
  const g = r.functions.find((f) => f.name === "GOVERN");
  check("single govern 1.1 → GOVERN earned 1", g.earned === 1);
  check("matched id is GOVERN 1.1", g.matched[0] === "GOVERN 1.1");
  check("overall earned = 1", r.overall.earned === 1);
}

// 3. No double counting — same control many times = 1 point.
{
  const corpus = "Govern 1.1 Govern 1.1 [Govern 1.1] GOVERN-1.1 govern_1.1 Govern1.1";
  const r = scoreCorpus(corpus, controlSet, compiled);
  const g = r.functions.find((f) => f.name === "GOVERN");
  check("repeated govern 1.1 still earns exactly 1", g.earned === 1);
}

// 4. Partial-number safety: "Measure 2.1" must not be triggered by "Measure 2.10".
{
  const r = scoreCorpus("Measure 2.10 only", controlSet, compiled);
  const m = r.functions.find((f) => f.name === "MEASURE");
  check("Measure 2.10 matches MEASURE 2.10", m.matched.includes("MEASURE 2.10"));
  check("Measure 2.10 does NOT match MEASURE 2.1", !m.matched.includes("MEASURE 2.1"));
}

// 5. Category labels are not scorable: "[Govern]" / "[Map]" alone earn nothing.
{
  const r = scoreCorpus("[Govern] [Map] [Measure] [Manage]", controlSet, compiled);
  check("bare function labels earn 0", r.overall.earned === 0);
}

// 6. Score never exceeds max even if every id + noise present.
{
  const everything = controlSet.order
    .flatMap((fn) => controlSet.controls[fn])
    .join(" ") + " " + controlSet.order.flatMap((fn) => controlSet.controls[fn]).join(" ");
  const r = scoreCorpus(everything, controlSet, compiled);
  let ok = true;
  for (const f of r.functions) ok = ok && f.earned === f.max && f.earned <= f.max;
  check("all controls present twice → each function == max (no overflow)", ok);
  check("overall == total max (72/72)", r.overall.earned === 72 && r.overall.max === 72);
}

// 7. Whitespace/newline tolerance.
{
  const r = scoreCorpus("see\nMANAGE\n4.3\nhere", controlSet, compiled);
  const m = r.functions.find((f) => f.name === "MANAGE");
  check("newline-split MANAGE 4.3 matches", m.matched.includes("MANAGE 4.3"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
