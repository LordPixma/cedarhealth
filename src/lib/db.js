// Data-access helpers over D1. Content falls back to DEFAULT_CONTENT so the
// site always renders, even before anything has been saved.

import { DEFAULT_CONTENT } from "./defaults.js";

/* ---------------- content ---------------- */

// Returns the full content object: saved rows overlaid on the defaults.
export async function getAllContent(env) {
  const merged = structuredClone(DEFAULT_CONTENT);
  try {
    const { results } = await env.DB.prepare("SELECT section, data FROM content").all();
    for (const row of results || []) {
      try { merged[row.section] = JSON.parse(row.data); } catch { /* keep default */ }
    }
  } catch {
    // DB not migrated yet — defaults are fine for a first render.
  }
  return merged;
}

export async function setContent(env, section, dataObject) {
  const json = JSON.stringify(dataObject);
  await env.DB.prepare(
    `INSERT INTO content (section, data, updated_at) VALUES (?, ?, unixepoch())
     ON CONFLICT(section) DO UPDATE SET data = excluded.data, updated_at = unixepoch()`
  ).bind(section, json).run();
}

/* ---------------- admins ---------------- */

export async function getAdminByEmail(env, email) {
  return env.DB.prepare("SELECT * FROM admins WHERE email = ?")
    .bind(String(email || "").trim().toLowerCase())
    .first();
}

export async function countAdmins(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM admins").first();
  return row ? row.n : 0;
}

export async function setAdminPassword(env, email, passwordHash) {
  await env.DB.prepare(
    "UPDATE admins SET password_hash = ?, updated_at = unixepoch() WHERE email = ?"
  ).bind(passwordHash, String(email).trim().toLowerCase()).run();
}

export async function createAdmin(env, email, passwordHash) {
  await env.DB.prepare(
    "INSERT INTO admins (email, password_hash) VALUES (?, ?)"
  ).bind(String(email).trim().toLowerCase(), passwordHash).run();
}

/* ---------------- submissions (patient intake / PHI) ---------------- */

export async function addSubmission(env, { kind = "intake", patient_name, patient_email, patient_phone, data }) {
  const res = await env.DB.prepare(
    `INSERT INTO submissions (kind, patient_name, patient_email, patient_phone, data)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(kind, patient_name || null, patient_email || null, patient_phone || null, JSON.stringify(data)).run();
  return res.meta.last_row_id;
}

export async function listSubmissions(env, { status = null, limit = 100, offset = 0 } = {}) {
  const where = status ? "WHERE status = ?" : "";
  const stmt = env.DB.prepare(
    `SELECT id, created_at, kind, status, patient_name, patient_email, patient_phone
       FROM submissions ${where}
      ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  const bound = status ? stmt.bind(status, limit, offset) : stmt.bind(limit, offset);
  const { results } = await bound.all();
  return results || [];
}

// Full rows (with parsed data) for CSV export.
export async function allSubmissions(env, status = null) {
  const where = status ? "WHERE status = ?" : "";
  const stmt = env.DB.prepare(
    `SELECT id, created_at, status, patient_name, patient_email, patient_phone, data
       FROM submissions ${where} ORDER BY created_at DESC`
  );
  const { results } = await (status ? stmt.bind(status) : stmt).all();
  return (results || []).map(function (r) {
    try { r.data = JSON.parse(r.data); } catch { r.data = {}; }
    return r;
  });
}

export async function getSubmission(env, id) {
  const row = await env.DB.prepare("SELECT * FROM submissions WHERE id = ?").bind(id).first();
  if (!row) return null;
  try { row.data = JSON.parse(row.data); } catch { row.data = {}; }
  return row;
}

export async function setSubmissionStatus(env, id, status) {
  await env.DB.prepare("UPDATE submissions SET status = ? WHERE id = ?").bind(status, id).run();
}

export async function submissionCounts(env) {
  const { results } = await env.DB.prepare(
    "SELECT status, COUNT(*) AS n FROM submissions GROUP BY status"
  ).all();
  const counts = { new: 0, reviewed: 0, archived: 0, total: 0 };
  for (const r of results || []) { counts[r.status] = r.n; counts.total += r.n; }
  return counts;
}
