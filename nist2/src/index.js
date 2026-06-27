// index.js — Cloudflare Worker entry point.
// Serves the JSON API under /api/* and falls through to static assets (the
// front-end in /public) for everything else. Bindings (see wrangler.toml):
//   env.DB   - D1 database (accounts, sessions, document metadata, scans)
//   env.R2   - R2 bucket (uploaded + generated document bodies)
//   env.AI   - Workers AI (runs the policy assessment + generation)
//   env.ASSETS - static asset binding for the front-end

import {
  hashPassword, verifyPassword, createSession, sessionCookie, clearCookie,
  getCurrentUser, destroySession, requireUser, requireAdmin, randomHex,
} from "./auth.js";
import { FUNCTIONS, buildScanPrompt, buildGeneratePrompt } from "./nist.js";

const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct";
const MAX_POLICY_CHARS = 24000; // keep each prompt within context limits

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await route(req, env, url);
      } catch (e) {
        const status = e && e.status ? e.status : 500;
        const message = e && e.message ? e.message : "Internal error.";
        if (status === 500) console.error(e);
        return json({ error: message }, status);
      }
    }
    // Front-end static assets.
    return env.ASSETS.fetch(req);
  },
};

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw { status: 400, message: "Invalid JSON body." };
  }
}

async function route(req, env, url) {
  const p = url.pathname;
  const m = req.method;
  const db = env.DB;

  // ---- One-time setup: seed the three admin accounts from secrets. ----
  // Guarded by SETUP_TOKEN and only runs while the users table is empty.
  if (p === "/api/setup" && m === "POST") {
    const { token } = await readJson(req);
    if (!env.SETUP_TOKEN || token !== env.SETUP_TOKEN)
      throw { status: 403, message: "Invalid setup token." };
    const existing = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
    if (existing.n > 0) throw { status: 409, message: "Already initialized." };

    const admins = [
      { u: env.ADMIN1_USER, p: env.ADMIN1_PASS },
      { u: env.ADMIN2_USER, p: env.ADMIN2_PASS },
      { u: env.ADMIN3_USER, p: env.ADMIN3_PASS },
    ];
    let created = 0;
    for (const a of admins) {
      if (!a.u || !a.p) continue;
      const { salt, hash } = await hashPassword(a.p);
      await db
        .prepare("INSERT INTO users (username, role, salt, pass_hash) VALUES (?, 'admin', ?, ?)")
        .bind(a.u, salt, hash)
        .run();
      created++;
    }
    if (created === 0)
      throw { status: 400, message: "No admin credentials found in secrets." };
    return json({ ok: true, adminsCreated: created });
  }

  // ---- Auth ----
  if (p === "/api/login" && m === "POST") {
    const { username, password } = await readJson(req);
    if (!username || !password) throw { status: 400, message: "Username and password required." };
    const row = await db
      .prepare("SELECT id, username, role, salt, pass_hash FROM users WHERE username = ?")
      .bind(username)
      .first();
    // Run a verify even on miss to blunt timing/user-enumeration.
    const ok = row
      ? await verifyPassword(password, row.salt, row.pass_hash)
      : await verifyPassword(password, "00".repeat(16), "00".repeat(32));
    if (!row || !ok) throw { status: 401, message: "Invalid username or password." };
    const { token, expires } = await createSession(db, row.id);
    return json(
      { username: row.username, role: row.role },
      200,
      { "Set-Cookie": sessionCookie(token, expires) }
    );
  }

  if (p === "/api/logout" && m === "POST") {
    await destroySession(req, db);
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  if (p === "/api/me" && m === "GET") {
    const user = await getCurrentUser(req, db);
    if (!user) return json({ authenticated: false }, 200);
    return json({ authenticated: true, username: user.username, role: user.role });
  }

  // ---- Admin: account management (role-guarded server-side) ----
  if (p === "/api/admin/users" && m === "GET") {
    const user = await getCurrentUser(req, db);
    requireAdmin(user);
    const { results } = await db
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at")
      .all();
    return json({ users: results });
  }

  if (p === "/api/admin/users" && m === "POST") {
    const user = await getCurrentUser(req, db);
    requireAdmin(user);
    const { username, password, role } = await readJson(req);
    if (!username || !password) throw { status: 400, message: "Username and password required." };
    const r = role === "admin" ? "admin" : "user";
    const dup = await db.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
    if (dup) throw { status: 409, message: "Username already exists." };
    const { salt, hash } = await hashPassword(password);
    const res = await db
      .prepare("INSERT INTO users (username, role, salt, pass_hash) VALUES (?, ?, ?, ?)")
      .bind(username, r, salt, hash)
      .run();
    return json({ id: res.meta.last_row_id, username, role: r }, 201);
  }

  let mUser = p.match(/^\/api\/admin\/users\/(\d+)$/);
  if (mUser && m === "PATCH") {
    const user = await getCurrentUser(req, db);
    requireAdmin(user);
    const id = Number(mUser[1]);
    const { password, role } = await readJson(req);
    const target = await db.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).first();
    if (!target) throw { status: 404, message: "User not found." };
    if (password) {
      const { salt, hash } = await hashPassword(password);
      await db.prepare("UPDATE users SET salt = ?, pass_hash = ? WHERE id = ?").bind(salt, hash, id).run();
    }
    if (role === "admin" || role === "user") {
      await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, id).run();
    }
    // Changing credentials invalidates that account's existing sessions.
    await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
    return json({ ok: true });
  }

  if (mUser && m === "DELETE") {
    const user = await getCurrentUser(req, db);
    requireAdmin(user);
    const id = Number(mUser[1]);
    if (id === user.id) throw { status: 400, message: "You cannot delete your own account." };
    // Don't allow removing the last remaining admin.
    const target = await db.prepare("SELECT id, role FROM users WHERE id = ?").bind(id).first();
    if (!target) throw { status: 404, message: "User not found." };
    if (target.role === "admin") {
      const admins = await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").first();
      if (admins.n <= 1) throw { status: 400, message: "Cannot delete the last administrator." };
    }
    await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
    await db.prepare("DELETE FROM documents WHERE owner_id = ?").bind(id).run();
    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  // ---- Documents (scoped to the owning account) ----
  if (p === "/api/documents" && m === "GET") {
    const user = await getCurrentUser(req, db);
    requireUser(user);
    const { results } = await db
      .prepare("SELECT id, filename, kind, created_at FROM documents WHERE owner_id = ? ORDER BY created_at DESC")
      .bind(user.id)
      .all();
    return json({ documents: results });
  }

  if (p === "/api/documents" && m === "POST") {
    const user = await getCurrentUser(req, db);
    requireUser(user);
    const { filename, text, kind } = await readJson(req);
    if (!filename || !text) throw { status: 400, message: "filename and text required." };
    const key = `${user.id}/${randomHex(8)}-${filename}`;
    await env.R2.put(key, text);
    const res = await db
      .prepare("INSERT INTO documents (owner_id, filename, kind, r2_key) VALUES (?, ?, ?, ?)")
      .bind(user.id, filename, kind || "upload", key)
      .run();
    return json({ id: res.meta.last_row_id, filename }, 201);
  }

  let mDoc = p.match(/^\/api\/documents\/(\d+)$/);
  if (mDoc && (m === "GET" || m === "DELETE")) {
    const user = await getCurrentUser(req, db);
    requireUser(user);
    const id = Number(mDoc[1]);
    // Ownership is part of the WHERE clause — another user's id simply returns nothing.
    const doc = await db
      .prepare("SELECT id, filename, kind, r2_key FROM documents WHERE id = ? AND owner_id = ?")
      .bind(id, user.id)
      .first();
    if (!doc) throw { status: 404, message: "Document not found." };
    if (m === "DELETE") {
      await env.R2.delete(doc.r2_key);
      await db.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    const body = await env.R2.get(doc.r2_key);
    const text = body ? await body.text() : "";
    return json({ id: doc.id, filename: doc.filename, kind: doc.kind, text });
  }

  // ---- Scan: assess a policy against the NIST AI RMF (Workers AI) ----
  if (p === "/api/scan" && m === "POST") {
    const user = await getCurrentUser(req, db);
    requireUser(user);
    const { documentId, text } = await readJson(req);
    const policy = await resolvePolicyText(env, db, user, documentId, text);

    const results = [];
    for (const fn of FUNCTIONS) {
      const { system, user: userPrompt } = buildScanPrompt(fn, policy);
      const out = await env.AI.run(AI_MODEL, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      });
      results.push(parseFunctionResult(fn, out.response));
    }

    const summary = summarize(results);
    await db
      .prepare("INSERT INTO scans (owner_id, summary_json) VALUES (?, ?)")
      .bind(user.id, JSON.stringify({ summary, results }))
      .run();
    return json({ summary, results });
  }

  // ---- Generate: produce an enhanced, NIST-aligned policy (Markdown) ----
  if (p === "/api/generate" && m === "POST") {
    const user = await getCurrentUser(req, db);
    requireUser(user);
    const { documentId, text, orgFields } = await readJson(req);
    const policy = await resolvePolicyText(env, db, user, documentId, text);

    let markdown = `# Enhanced AI Governance Policy\n\n*Aligned to the NIST AI Risk Management Framework (AI RMF 1.0).*\n\n`;
    for (const fn of FUNCTIONS) {
      const { system, user: userPrompt } = buildGeneratePrompt(fn, policy, orgFields);
      const out = await env.AI.run(AI_MODEL, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      });
      markdown += `\n${(out.response || "").trim()}\n`;
    }

    // Persist the generated policy as a document owned by this user.
    const key = `${user.id}/${randomHex(8)}-enhanced-policy.md`;
    await env.R2.put(key, markdown);
    await db
      .prepare("INSERT INTO documents (owner_id, filename, kind, r2_key) VALUES (?, ?, 'generated', ?)")
      .bind(user.id, "enhanced-policy.md", key)
      .run();
    return json({ markdown });
  }

  throw { status: 404, message: "Not found." };
}

// Resolve policy text from either a stored (owned) document or inline text.
async function resolvePolicyText(env, db, user, documentId, text) {
  let policy = text || "";
  if (documentId) {
    const doc = await db
      .prepare("SELECT r2_key FROM documents WHERE id = ? AND owner_id = ?")
      .bind(Number(documentId), user.id)
      .first();
    if (!doc) throw { status: 404, message: "Document not found." };
    const body = await env.R2.get(doc.r2_key);
    policy = body ? await body.text() : "";
  }
  policy = policy.trim();
  if (!policy) throw { status: 400, message: "No policy text provided." };
  if (policy.length > MAX_POLICY_CHARS) policy = policy.slice(0, MAX_POLICY_CHARS);
  return policy;
}

// The model is asked for strict JSON; extract it defensively.
function parseFunctionResult(fn, raw) {
  const text = (raw || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start > -1 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(obj.items)) return { function: fn, items: obj.items };
    } catch {
      /* fall through */
    }
  }
  return { function: fn, items: [], error: "Could not parse model output for this function." };
}

function summarize(results) {
  let covered = 0, partial = 0, missing = 0, total = 0;
  for (const r of results) {
    for (const it of r.items || []) {
      total++;
      if (it.status === "covered") covered++;
      else if (it.status === "partial") partial++;
      else missing++;
    }
  }
  const score = total ? Math.round(((covered + partial * 0.5) / total) * 100) : 0;
  return { total, covered, partial, missing, robustnessScore: score };
}
