# NIST AI RMF Policy Scanner

A login-gated web app that checks how robustly an AI governance policy aligns to the
**NIST AI Risk Management Framework (AI RMF 1.0)** across all 72 subcategories, and
generates a tailored, NIST-aligned policy. Runs entirely on **Cloudflare**:

- **Cloudflare Workers** — the API and server-side logic (auth, role checks, routing)
- **Workers static assets** — the front-end (`/public`)
- **D1** — accounts, sessions, document metadata, scan history
- **R2** — uploaded and generated document bodies
- **Workers AI** — runs the policy assessment and generation (`@cf/meta/llama-3.3-70b-instruct`). Your content stays inside Cloudflare.

## Security model (read this)

- **Auth and role checks run in the Worker, server-side**, on every privileged
  endpoint. A non-admin cannot reach admin functions even by typing the admin URL —
  the page is just static HTML; the API enforces the role and returns 403.
- **Passwords are PBKDF2-hashed** (210k iterations, per-user salt). Plaintext is never stored.
- **Sessions** are opaque random tokens in an `HttpOnly; Secure; SameSite=Strict` cookie.
- **Per-account isolation**: every document query is filtered by `owner_id`, so one
  user's documents are never returned to another — including by guessing IDs.
- **Admin credentials are never in source.** The three admins are seeded from
  Cloudflare secrets at setup time.

---

## Prerequisites

- A Cloudflare account
- Node.js 18+ and `npm`
- Wrangler: `npm install` (installs the pinned version), then `npx wrangler login`

## Deploy

### 1. Install
```bash
npm install
```

### 2. Create the D1 database
```bash
npx wrangler d1 create nist-rmf-scanner
```
Copy the printed `database_id` into `wrangler.toml` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

### 3. Create the R2 bucket
```bash
npx wrangler r2 bucket create nist-rmf-documents
```

### 4. Initialize the schema
```bash
npm run db:init      # applies schema.sql to the remote D1 database
```

### 5. Set secrets (admin accounts + setup token)
Choose your own real values — these are NOT stored in the repo:
```bash
npx wrangler secret put SETUP_TOKEN     # any long random string you choose
npx wrangler secret put ADMIN1_USER
npx wrangler secret put ADMIN1_PASS
npx wrangler secret put ADMIN2_USER
npx wrangler secret put ADMIN2_PASS
npx wrangler secret put ADMIN3_USER
npx wrangler secret put ADMIN3_PASS
```

### 6. Deploy
```bash
npm run deploy
```
Wrangler prints your `*.workers.dev` URL (or your custom domain if configured).

### 7. Seed the admins (one time)
Call the guarded setup endpoint once. It only works while the users table is empty
and only with your `SETUP_TOKEN`:
```bash
curl -X POST https://YOUR-WORKER-URL/api/setup \
  -H "Content-Type: application/json" \
  -d '{"token":"THE_SETUP_TOKEN_YOU_SET"}'
```
You should get `{"ok":true,"adminsCreated":3}`. The three admins can now sign in and
create regular users from the **Admin** panel.

---

## Local development
```bash
npm run db:init:local      # schema into the local D1
npm run dev                # http://localhost:8787
```
Set local secrets in a `.dev.vars` file (git-ignored) using the same keys as above,
then POST `/api/setup` against `localhost:8787`.

---

## How the app flows

1. **`/`** — Landing. User runs the external risk scan, returns, clicks
   *I've finished my scan* → *Would you like to enhance your policy?* → **Yes** → login.
2. **`/login.html`** — Sign in.
3. **`/app.html`** — Workspace:
   - **Upload** `.pdf` / `.docx` / `.txt`. Text is extracted **in the browser**
     (pdf.js / mammoth) and stored privately to the account.
   - **Scan** — four Workers AI passes (Govern, Map, Measure, Manage) produce a
     per-subcategory `covered / partial / missing` rating, a robustness score, and a
     concrete improvement for each gap.
   - **Generate** — maps the user's content into the NIST structure; unsupplied
     fields become `[PLACEHOLDER: …]` (nothing is invented). Download as `.docx` or `.md`.
4. **`/admin.html`** — Admins create users, reset passwords, switch roles, and delete
   accounts (with a confirm prompt; the last admin and your own account are protected).

## Notes, limits, and honest caveats

- **The NIST template documents** (your AIRMF-000…015 set) are the *structural baseline*
  the rubric in `src/nist.js` is derived from. To use the full documents verbatim as
  generation templates, have an admin upload them or bundle them into R2 and extend
  `buildGeneratePrompt` to pull the matching template — the hooks are there.
- **Long policies are truncated** to ~24k characters per pass to stay within the model's
  context window. For very long policies, scan section by section.
- **Model output is AI-generated** and should be reviewed by a qualified person before
  any compliance claim. The scanner reports *documented design maturity*, not verified
  operating effectiveness.
- `.dev.vars`, `node_modules`, and any local D1 files should be git-ignored.

## File map
```
wrangler.toml          Cloudflare config (D1 / R2 / AI / assets bindings)
schema.sql             D1 schema
package.json           scripts
src/index.js           Worker entry: router + API + Workers AI calls
src/auth.js            PBKDF2 hashing, sessions, role guards
src/nist.js            72-subcategory rubric + scan/generate prompts
public/index.html      landing + scan-entry flow
public/login.html      sign in
public/app.html        upload / scan / generate workspace
public/admin.html      account management
public/client.js       API helpers + in-browser doc extraction + docx export
public/styles.css      styles
```
