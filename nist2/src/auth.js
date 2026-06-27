// auth.js
// Server-side authentication and authorization. Runs only inside the Worker.
// Passwords are hashed with PBKDF2 (WebCrypto). Sessions are opaque random
// tokens stored in D1 and delivered as HttpOnly, Secure, SameSite cookies.
// Role checks are enforced here, on the server, for every privileged action.

const PBKDF2_ITERATIONS = 210000;
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const enc = new TextEncoder();

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function randomHex(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { salt: toHex(salt), hash: toHex(bits) };
}

// Constant-time-ish comparison of two equal-length hex strings.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex);
  return safeEqual(hash, expectedHashHex);
}

export async function createSession(db, userId) {
  const token = randomHex(32);
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  return { token, expires };
}

export function sessionCookie(token, expires) {
  const exp = new Date(expires * 1000).toUTCString();
  // HttpOnly: not readable by JS. Secure: HTTPS only. SameSite=Strict: CSRF guard.
  return `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=${exp}`;
}
export function clearCookie() {
  return "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}

function parseCookies(req) {
  const header = req.headers.get("Cookie") || "";
  const out = {};
  header.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

// Resolves the current user from the session cookie, or null. Expired sessions
// are rejected (and lazily cleaned up).
export async function getCurrentUser(req, db) {
  const token = parseCookies(req).session;
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.username, u.role
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`
    )
    .bind(token)
    .first();
  if (!row) return null;
  if (row.expires_at < Math.floor(Date.now() / 1000)) {
    await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return { id: row.id, username: row.username, role: row.role };
}

export async function destroySession(req, db) {
  const token = parseCookies(req).session;
  if (token) await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

// Guards. Throw an object the router turns into a 401/403.
export function requireUser(user) {
  if (!user) throw { status: 401, message: "Authentication required." };
  return user;
}
export function requireAdmin(user) {
  requireUser(user);
  if (user.role !== "admin") throw { status: 403, message: "Administrator role required." };
  return user;
}

export { randomHex };
