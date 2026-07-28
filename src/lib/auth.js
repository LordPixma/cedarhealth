// Authentication primitives — password hashing (PBKDF2) and signed session
// tokens (HMAC-SHA256). Uses WebCrypto, which is available both in the Cloudflare
// Worker runtime and in Node 22 (so the seed script can reuse hashPassword()).

const PBKDF2_ITERATIONS = 100_000;
const enc = new TextEncoder();

/* ---------- base64url helpers ---------- */
function bytesToB64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- password hashing ---------- */
async function pbkdf2(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

// Returns a self-describing string:  pbkdf2$<iters>$<saltB64url>$<hashB64url>
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64url(salt)}$${bytesToB64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, itersStr, saltB64, hashB64] = String(stored).split("$");
    if (scheme !== "pbkdf2") return false;
    const salt = b64urlToBytes(saltB64);
    const expected = b64urlToBytes(hashB64);
    const actual = await pbkdf2(password, salt, parseInt(itersStr, 10));
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

/* ---------- session tokens (stateless, HMAC-signed) ---------- */
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

export async function createSession(payload, secret, maxAgeSeconds = 60 * 60 * 12) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds };
  const bodyB64 = bytesToB64url(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(bodyB64));
  return `${bodyB64}.${bytesToB64url(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [bodyB64, sigB64] = token.split(".");
  const expectedSig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(bodyB64));
  if (!constantTimeEqual(bytesToB64url(expectedSig), sigB64)) return null;
  let body;
  try { body = JSON.parse(new TextDecoder().decode(b64urlToBytes(bodyB64))); }
  catch { return null; }
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}
