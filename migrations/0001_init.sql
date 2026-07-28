-- Cedar Health — database schema
-- Safe to re-run: every object uses IF NOT EXISTS.

-- Editable site content. One row per section; `data` is a JSON blob.
CREATE TABLE IF NOT EXISTS content (
  section     TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Clinic staff who can sign in to /admin.
CREATE TABLE IF NOT EXISTS admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Patient intake submissions (Personal Health Information — access-controlled).
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  kind          TEXT NOT NULL DEFAULT 'intake',
  status        TEXT NOT NULL DEFAULT 'new',      -- new | reviewed | archived
  patient_name  TEXT,                              -- denormalised for the inbox list
  patient_email TEXT,
  patient_phone TEXT,
  data          TEXT NOT NULL                      -- full submission as JSON
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status  ON submissions (status);
