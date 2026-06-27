// Pure, deterministic scoring logic for NIST AI RMF control matching.
// No I/O — safe to unit test in Node and to run inside a Cloudflare Worker.
//
// Matching model
// --------------
// The reference files define WHICH control ids exist (the 72 scorable sub-points).
// An uploaded document is scored by which of those control ids it references.
// A control id like "GOVERN 1.1" is considered MATCHED when the corpus contains
// that identifier in any common written form:
//     GOVERN 1.1   Govern 1.1   [Govern 1.1]   GOVERN-1.1   govern_1.1   Govern1.1
//
// Why id-based matching: it makes scoring transparent and guarantees the two hard
// rules — a control is a set member (matched or not), so it contributes AT MOST
// 1 point no matter how many times it appears, and a function can never exceed
// its control count.

// Build a tolerant matcher for a single control id, e.g. "MEASURE 2.1".
// Guards against partial-number collisions: "2.1" must not match inside "2.10".
function makeControlRegex(id) {
  const [fn, num] = id.split(" ");
  const [major, minor] = num.split(".");
  // function word, flexible separators (space / dash / underscore / none),
  // major.minor with the dot literal; digit-boundary guards on both ends.
  const pattern =
    `\\b${fn}` +          // function word on a word boundary
    `[\\s\\-_:.]*` +       // optional separators
    `(?<!\\d)${major}\\.${minor}(?!\\d)`; // exact major.minor, not a prefix
  return new RegExp(pattern, "i");
}

// Pre-compile regexes once per control set.
export function compileControls(controlSet) {
  const compiled = {};
  for (const fn of controlSet.order) {
    compiled[fn] = controlSet.controls[fn].map((id) => ({
      id,
      re: makeControlRegex(id),
    }));
  }
  return compiled;
}

// Normalize corpus: collapse whitespace so "GOVERN\n1.1" still matches.
export function normalizeCorpus(text) {
  return String(text || "").replace(/\s+/g, " ");
}

// Score a corpus against the control set.
// Returns per-function breakdown (earned/max, matched ids, missed ids) and overall.
export function scoreCorpus(corpus, controlSet, compiled) {
  compiled = compiled || compileControls(controlSet);
  const normalized = normalizeCorpus(corpus);

  const functions = [];
  let totalEarned = 0;
  let totalMax = 0;

  for (const fn of controlSet.order) {
    const matched = [];
    const missed = [];
    // Each control is evaluated exactly once → at most 1 point. No double counting.
    for (const { id, re } of compiled[fn]) {
      if (re.test(normalized)) matched.push(id);
      else missed.push(id);
    }
    const max = compiled[fn].length;
    const earned = matched.length; // guaranteed 0..max
    functions.push({ name: fn, earned, max, matched, missed });
    totalEarned += earned;
    totalMax += max;
  }

  return {
    order: controlSet.order,
    functions,
    overall: { earned: totalEarned, max: totalMax },
  };
}
