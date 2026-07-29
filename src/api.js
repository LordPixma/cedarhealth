// JSON API. Public: GET /api/content, POST /api/intake.
// Authenticated (clinic session): content writes, uploads, submissions, account.

import { verifyPassword, hashPassword, createSession, verifySession } from "./lib/auth.js";
import { CONTENT_SECTIONS, INTAKE_SCHEMA } from "./lib/defaults.js";
import { esc } from "./lib/html.js";
import {
  getAllContent, setContent,
  getAdminByEmail, setAdminPassword, createAdmin, listAdmins, deleteAdminById, countAdmins, setAdminPasswordById,
  addSubmission, listSubmissions, getSubmission, setSubmissionStatus, submissionCounts, allSubmissions,
  deleteSubmission, getSettings, logAccess, listAccessLog
} from "./lib/db.js";

const COOKIE = "cedar_session";
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });

/* ---------------- session helpers ---------------- */
function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > -1 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}
function sessionCookie(token, url, maxAge) {
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
async function currentUser(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token || !env.SESSION_SECRET) return null;
  return verifySession(token, env.SESSION_SECRET);
}

/* ---------------- router ---------------- */
export async function handleApi(request, env, url, ctx) {
  const path = url.pathname.replace(/\/+$/, "") || "/api";
  const method = request.method.toUpperCase();

  try {
    // ---- public ----
    if (path === "/api/content" && method === "GET") {
      return json({ content: await getAllContent(env) });
    }
    if (path === "/api/intake" && method === "POST") {
      return handleIntake(request, env, ctx);
    }
    if (path === "/api/login" && method === "POST") {
      return handleLogin(request, env, url);
    }
    if (path === "/api/logout" && method === "POST") {
      return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` });
    }

    // ---- everything below requires a session ----
    const user = await currentUser(request, env);
    if (path === "/api/me") {
      return user ? json({ user: { email: user.email } }) : json({ user: null }, 401);
    }
    if (!user) return json({ error: "Not signed in." }, 401);

    if (path.startsWith("/api/content/") && method === "PUT") {
      const section = decodeURIComponent(path.slice("/api/content/".length));
      if (!CONTENT_SECTIONS.includes(section)) return json({ error: "Unknown section." }, 400);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid body." }, 400);
      await setContent(env, section, body);
      return json({ ok: true });
    }

    if (path === "/api/upload" && method === "POST") {
      return handleUpload(request, env);
    }

    if (path === "/api/submissions" && method === "GET") {
      const status = url.searchParams.get("status") || null;
      const [items, counts] = await Promise.all([
        listSubmissions(env, { status, limit: 200 }),
        submissionCounts(env)
      ]);
      return json({ items, counts });
    }
    if (path === "/api/submissions/export" && method === "GET") {
      const status = url.searchParams.get("status") || null;
      const rows = await allSubmissions(env, status);
      const csv = buildCsv(rows);
      const date = new Date().toISOString().slice(0, 10);
      await logAccess(env, { admin_email: user.email, action: "exported", detail: rows.length + " records" });
      return new Response("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cedar-health-patient-intake-${date}.csv"`
        }
      });
    }
    if (path.startsWith("/api/submissions/") && method === "GET") {
      const id = parseInt(path.slice("/api/submissions/".length), 10);
      const sub = await getSubmission(env, id);
      if (!sub) return json({ error: "Not found." }, 404);
      await logAccess(env, { admin_email: user.email, action: "viewed", submission_id: id, detail: sub.patient_name });
      return json({ submission: sub, schema: INTAKE_SCHEMA });
    }
    if (path.startsWith("/api/submissions/") && method === "PATCH") {
      const id = parseInt(path.slice("/api/submissions/".length), 10);
      const body = await request.json().catch(() => ({}));
      const status = ["new", "reviewed", "archived"].includes(body.status) ? body.status : null;
      if (!status) return json({ error: "Invalid status." }, 400);
      await setSubmissionStatus(env, id, status);
      await logAccess(env, { admin_email: user.email, action: "marked " + status, submission_id: id });
      return json({ ok: true });
    }
    if (path.startsWith("/api/submissions/") && method === "DELETE") {
      const id = parseInt(path.slice("/api/submissions/".length), 10);
      if (!id) return json({ error: "Invalid submission." }, 400);
      const sub = await getSubmission(env, id);
      await deleteSubmission(env, id);
      await logAccess(env, { admin_email: user.email, action: "deleted", submission_id: id, detail: sub ? sub.patient_name : null });
      return json({ ok: true });
    }

    if (path === "/api/settings" && method === "GET") {
      return json({ settings: await getSettings(env) });
    }
    if (path === "/api/settings" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      let days = parseInt(body.retentionDays, 10);
      if (isNaN(days) || days < 0) return json({ error: "Enter a number of days (0 to keep forever)." }, 400);
      if (days > 3650) days = 3650;
      await setContent(env, "settings", { retentionDays: days });
      return json({ ok: true, settings: { retentionDays: days } });
    }

    if (path === "/api/access-log" && method === "GET") {
      return json({ log: await listAccessLog(env, { limit: 200 }) });
    }

    if (path === "/api/account/password" && method === "POST") {
      return handlePasswordChange(request, env, user);
    }

    // ---- staff / admin logins ----
    if (path === "/api/admins" && method === "GET") {
      return json({ admins: await listAdmins(env), me: user.email });
    }
    if (path === "/api/admins" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
      if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
      if (await getAdminByEmail(env, email)) return json({ error: "That email already has a login." }, 409);
      await createAdmin(env, email, await hashPassword(password));
      return json({ ok: true });
    }
    if (/^\/api\/admins\/\d+\/password$/.test(path) && method === "POST") {
      const id = parseInt(path.split("/")[3], 10);
      const body = await request.json().catch(() => ({}));
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
      const changed = await setAdminPasswordById(env, id, await hashPassword(password));
      if (!changed) return json({ error: "That login no longer exists." }, 404);
      return json({ ok: true });
    }
    if (path.startsWith("/api/admins/") && method === "DELETE") {
      const id = parseInt(path.slice("/api/admins/".length), 10);
      if (id === user.sub) return json({ error: "You can't remove the login you're signed in with." }, 400);
      if ((await countAdmins(env)) <= 1) return json({ error: "At least one admin login must remain." }, 400);
      await deleteAdminById(env, id);
      return json({ ok: true });
    }

    return json({ error: "Not found." }, 404);
  } catch (err) {
    return json({ error: "Server error." }, 500);
  }
}

/* ---------------- handlers ---------------- */
async function handleLogin(request, env, url) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return json({ error: "Enter your email and password." }, 400);

  const admin = await getAdminByEmail(env, email);
  // Verify even when the admin is missing, to reduce timing differences.
  const ok = admin ? await verifyPassword(password, admin.password_hash) : await verifyPassword(password, "pbkdf2$100000$x$y");
  if (!admin || !ok) return json({ error: "Incorrect email or password." }, 401);

  const token = await createSession({ sub: admin.id, email: admin.email }, env.SESSION_SECRET, 60 * 60 * 12);
  return json({ ok: true, user: { email: admin.email } }, 200, { "Set-Cookie": sessionCookie(token, url, 60 * 60 * 12) });
}

async function handlePasswordChange(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const current = String(body.current || "");
  const next = String(body.next || "");
  if (next.length < 8) return json({ error: "New password must be at least 8 characters." }, 400);
  const admin = await getAdminByEmail(env, user.email);
  if (!admin || !(await verifyPassword(current, admin.password_hash))) {
    return json({ error: "Current password is incorrect." }, 401);
  }
  await setAdminPassword(env, user.email, await hashPassword(next));
  return json({ ok: true });
}

async function handleUpload(request, env) {
  const form = await request.formData().catch(() => null);
  const file = form && form.get("file");
  if (!file || typeof file === "string") return json({ error: "No file provided." }, 400);
  if (file.size > 8 * 1024 * 1024) return json({ error: "Image must be under 8 MB." }, 400);
  const type = file.type || "application/octet-stream";
  if (!/^image\//.test(type)) return json({ error: "Please upload an image file." }, 400);

  const ext = (file.name.split(".").pop() || "img").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const id = Array.from(rand).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = `uploads/${Date.now()}-${id}.${ext || "img"}`;

  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" }
  });
  return json({ ok: true, url: `/media/${key}` });
}

async function handleIntake(request, env, ctx) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid submission." }, 400);

  // Guard against oversized payloads.
  const raw = JSON.stringify(body);
  if (raw.length > 200_000) return json({ error: "Submission too large." }, 413);

  // Required consents and signature.
  const missing = [];
  for (const f of ["consent_collection", "consent_contact", "consent_accuracy"]) {
    if (!body[f]) missing.push(f);
  }
  if (!String(body.signature_name || "").trim()) missing.push("signature_name");
  if (!String(body.legal_first_name || "").trim() || !String(body.legal_last_name || "").trim()) missing.push("name");
  if (missing.length) return json({ error: "Please complete all required fields and consents." }, 400);

  const name = `${String(body.legal_first_name).trim()} ${String(body.legal_last_name).trim()}`.trim();
  await addSubmission(env, {
    kind: "intake",
    patient_name: name.slice(0, 200),
    patient_email: String(body.email || "").slice(0, 200),
    patient_phone: String(body.phone_mobile || body.phone_home || "").slice(0, 60),
    data: body
  });
  // Email a formatted copy to the clinic (best-effort — never blocks/fails the submission).
  if (ctx && env.EMAIL && intakeRecipients(env).length) {
    ctx.waitUntil(sendIntakeEmail(env, body, name).catch((e) => console.error("intake email failed:", e && e.message)));
  }
  return json({ ok: true });
}

/* ---------------- intake notification email ---------------- */
// INTAKE_EMAIL_TO holds one or more clinic addresses, comma-separated.
function intakeRecipients(env) {
  return String(env.INTAKE_EMAIL_TO || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function formatIntakeEmail(data, name) {
  const textLines = ["A new patient registration was submitted through the website.", ""];
  const htmlSections = [];
  for (const section of INTAKE_SCHEMA) {
    textLines.push(section.title.toUpperCase());
    const rows = [];
    for (const f of section.fields) {
      if (f.type === "note") continue;
      let v = data[f.name];
      if (f.type === "consent") v = data[f.name] ? "Yes" : "No";
      else if (Array.isArray(v)) v = v.join(", ");
      if (v == null || v === "") v = "—";
      textLines.push("  " + (f.label || f.name) + ": " + v);
      rows.push(`<tr><td style="padding:4px 14px 4px 0;color:#555;vertical-align:top">${esc(f.label || f.name)}</td><td style="padding:4px 0;color:#111">${esc(v)}</td></tr>`);
    }
    textLines.push("");
    htmlSections.push(`<h3 style="color:#1b3a2a;margin:18px 0 4px;font-size:15px">${esc(section.title)}</h3><table style="border-collapse:collapse;font-size:14px">${rows.join("")}</table>`);
  }
  const html = `<div style="max-width:660px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#111">
    <h2 style="color:#1b3a2a;margin:0 0 4px">New patient registration</h2>
    <p style="color:#555;margin:0 0 8px">Submitted through the Cedar Health website.</p>
    ${htmlSections.join("")}
    <hr style="border:none;border-top:1px solid #ddd;margin:20px 0">
    <p style="color:#888;font-size:12px">This message contains personal health information — please handle it securely. You can also view and manage submissions in the website admin.</p>
  </div>`;
  return { subject: `New patient registration — ${name}`, text: textLines.join("\n"), html };
}

async function sendIntakeEmail(env, data, name) {
  const to = intakeRecipients(env);
  if (!to.length) return;
  const { subject, text, html } = formatIntakeEmail(data, name);
  const domain = (to[0].split("@")[1] || "").trim();
  const from = (env.INTAKE_EMAIL_FROM || "noreply@" + domain).trim();
  // Every recipient goes in `to` (max 50) — one send, one identical copy each.
  await env.EMAIL.send({
    to,
    from: { email: from, name: "Cedar Health Website" },
    subject,
    text,
    html
  });
}

/* ---------------- CSV export ---------------- */
function csvCell(v) {
  v = String(v == null ? "" : v);
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function buildCsv(rows) {
  const fields = INTAKE_SCHEMA.flatMap((s) => s.fields.filter((f) => f.type !== "note"));
  const headers = ["ID", "Submitted", "Status", "Name", "Email", "Phone"].concat(fields.map((f) => f.label || f.name));
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) {
    const d = r.data || {};
    const base = [r.id, new Date(r.created_at * 1000).toISOString(), r.status, r.patient_name || "", r.patient_email || "", r.patient_phone || ""];
    const rest = fields.map((f) => {
      let v = d[f.name];
      if (f.type === "consent") return d[f.name] ? "Yes" : "";
      if (Array.isArray(v)) v = v.join("; ");
      return v == null ? "" : v;
    });
    lines.push(base.concat(rest).map(csvCell).join(","));
  }
  return lines.join("\r\n");
}
