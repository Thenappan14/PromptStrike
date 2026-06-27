# NIST AI RMF Document Scorer

A Cloudflare-hosted web app that scores uploaded documents against the
**NIST AI Risk Management Framework (AI RMF) Playbook** controls.

Upload one or more `.docx`, `.pdf`, or `.xlsx` files. The backend extracts and
concatenates their text into a single corpus, matches it against the framework's
scorable control points, and returns a transparent breakdown per function
(GOVERN, MAP, MEASURE, MANAGE) plus an overall score.

## Architecture

- **Frontend** — `public/index.html`, a static page served by **Cloudflare Pages**.
- **Backend** — **Cloudflare Pages Functions**:
  - `POST /api/score` (`functions/api/score.js`) — upload, extract, match, score.
  - `GET /api/controls` (`functions/api/controls.js`) — the scorable control set.
- **Text extraction** (`functions/api/_extract.js`):
  - `.docx` / `.xlsx` — Office Open XML (zip of XML) unzipped with `fflate`, text recovered from the relevant XML parts.
  - `.pdf` — extracted with `unpdf` (a serverless-friendly pdf.js build).
- **Scoring** (`functions/api/_scoring.js`) — pure, deterministic, unit-tested.

## The control set

`functions/api/controls.json` is generated from the reference markdown in
`reference/` by `scripts/build-controls.mjs`. Only **numbered sub-points** are
scorable; bare function headers (Govern, Map, Measure, Manage) are category
labels and are **not** scored.

| Function | Scorable controls |
|----------|-------------------|
| GOVERN   | 19 |
| MAP      | 18 |
| MEASURE  | 22 |
| MANAGE   | 13 |
| **Total**| **72** |

Regenerate after editing the reference files:

```bash
npm run build:controls
```

## How matching and scoring work

The reference files define **which** control ids exist. A document is scored by
**which of those ids it references**. A control such as `GOVERN 1.1` counts as
matched when the corpus contains that identifier in any common written form:

```
GOVERN 1.1   Govern 1.1   [Govern 1.1]   GOVERN-1.1   govern_1.1   Govern1.1
```

This id-based model makes the two hard rules structural, not just enforced:

- **At most 1 point per control.** Each control is a set member — matched or not —
  so repeating `Govern 1.1` a hundred times still earns exactly 1 point.
- **A function can never exceed its max.** `earned` is the count of matched
  controls, bounded by the number of controls. The UI bar is capped the same way.
- **No deductions.** Unmatched controls are simply 0.

The matcher guards against partial-number collisions: `Measure 2.1` is **not**
triggered by `Measure 2.10`.

## Results

- Per function, in fixed order **GOVERN → MAP → MEASURE → MANAGE** (uppercase),
  shown as `earned / max` with the matched and not-matched control ids listed.
- **Overall** as `total earned / total max` (out of 72).

## Errors handled

- Unsupported file type (anything other than `.docx`, `.pdf`, `.xlsx`).
- Unreadable / corrupt file — reported per file; other files still score.
- Empty file or a file with no extractable text — reported, not counted.
- No readable text across the whole upload — a clear message, HTTP 422.

## Local development

```bash
npm install
npm test                 # runs the scoring test suite (13 checks)
npm run dev              # wrangler pages dev — serves the app locally
```

`npm run dev` runs Pages + Functions locally with the `nodejs_compat` flag.

## Deploy to Cloudflare

You need a Cloudflare account and the Wrangler CLI (`npm install` provides it).

### Option A — Git integration (recommended)

1. Push this repository to GitHub/GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Build command:** `npm run build:controls`
   - **Build output directory:** `public`
4. **Settings → Functions → Compatibility flags:** add `nodejs_compat`
   (also set a Compatibility date of `2024-11-01` or later).
5. Deploy. Every push redeploys.

### Option B — Direct upload with Wrangler

```bash
npm install
npm run build:controls
npx wrangler login
npx wrangler pages deploy public
```

`wrangler.toml` already sets `pages_build_output_dir = "public"`,
`compatibility_date`, and the `nodejs_compat` flag.

> Note: the `functions/` directory is bundled automatically by Cloudflare Pages;
> `fflate` and `unpdf` are bundled from `node_modules` during the build.

## Project layout

```
public/index.html              static frontend (Cloudflare Pages)
functions/api/score.js         POST /api/score  — upload, extract, score
functions/api/controls.js      GET  /api/controls — scorable control set
functions/api/_extract.js      docx/xlsx/pdf text extraction
functions/api/_scoring.js      pure matching + scoring (unit tested)
functions/api/controls.json    generated control set (72 controls)
scripts/build-controls.mjs     regenerate controls.json from reference/
scripts/test-scoring.mjs       scoring test suite
reference/*.md                 NIST AI RMF Playbook source files
wrangler.toml, package.json    Cloudflare + build config
```
