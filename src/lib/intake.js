// Editable intake-form schema: validation and resolution.
//
// The form definition lives in the `intakeForm` content section (editable in
// /admin) and defaults to INTAKE_SCHEMA. Six fields are LOCKED because the
// submission API depends on them by name: handleIntake() hard-requires the
// three consents, the signature, and the legal names, and uses the legal names
// for the stored patient_name. A form without them would reject every
// submission, so they can never be removed and their required flags can never
// be switched off.

import { INTAKE_SCHEMA } from "./defaults.js";

export const LOCKED_FIELDS = [
  "legal_first_name",
  "legal_last_name",
  "signature_name",
  "consent_collection",
  "consent_contact",
  "consent_accuracy"
];

// Types the public renderer knows how to draw. "note" renders its label as a
// paragraph of explanatory text and stores no answer.
export const FIELD_TYPES = ["text", "email", "tel", "date", "number", "textarea", "select", "checkboxes", "consent", "note"];

const MAX_SECTIONS = 30;
const MAX_FIELDS = 200;
const NAME_RE = /^[a-z0-9_]{1,60}$/;

const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);

function cleanField(f, errors) {
  if (!f || typeof f !== "object") { errors.push("A question entry is not an object."); return null; }
  const name = str(f.name, 60);
  const label = str(f.label, 600);
  const type = str(f.type, 20);
  if (!NAME_RE.test(name)) { errors.push(`Question id "${name}" is invalid.`); return null; }
  if (!label) { errors.push(`Question "${name}" has no label.`); return null; }
  if (!FIELD_TYPES.includes(type)) { errors.push(`Question "${name}" has unknown type "${type}".`); return null; }

  const out = { name, label, type };
  if (f.required) out.required = true;
  if (f.plain) out.plain = true;
  const cols = parseInt(f.cols, 10);
  if (cols >= 1 && cols <= 12) out.cols = cols;
  if (type === "select" || type === "checkboxes") {
    const options = (Array.isArray(f.options) ? f.options : []).map((o) => str(o, 200)).filter(Boolean).slice(0, 50);
    if (!options.length) { errors.push(`Question "${name}" needs at least one option.`); return null; }
    out.options = options;
  }
  for (const k of ["value", "autocomplete", "inputmode"]) {
    const v = str(f[k], 100);
    if (v) out[k] = v;
  }

  if (LOCKED_FIELDS.includes(name)) {
    const wantConsent = name.startsWith("consent_");
    if (wantConsent && type !== "consent") { errors.push(`"${name}" must stay a consent checkbox.`); return null; }
    if (!wantConsent && type === "consent") { errors.push(`"${name}" cannot be a consent checkbox.`); return null; }
    out.required = true; // locked fields are always required
  }
  return out;
}

// Validate + normalize an intakeForm object ({ sections: [...] }).
// Returns { ok: true, sections } or { ok: false, error }.
export function sanitizeIntakeForm(input) {
  const sections = input && Array.isArray(input.sections) ? input.sections : null;
  if (!sections || !sections.length) return { ok: false, error: "The form needs at least one section." };
  if (sections.length > MAX_SECTIONS) return { ok: false, error: `Too many sections (max ${MAX_SECTIONS}).` };

  const errors = [];
  const seen = new Set();
  let fieldCount = 0;
  const out = [];

  for (const s of sections) {
    if (!s || typeof s !== "object") { errors.push("A section entry is not an object."); continue; }
    const title = str(s.title, 200);
    if (!title) { errors.push("A section has no title."); continue; }
    const sec = { id: str(s.id, 60) || title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "section", title, fields: [] };
    const intro = str(s.intro, 1000);
    if (intro) sec.intro = intro;
    if (s.isConsent) sec.isConsent = true;
    for (const f of Array.isArray(s.fields) ? s.fields : []) {
      const cf = cleanField(f, errors);
      if (!cf) continue;
      if (seen.has(cf.name)) { errors.push(`Duplicate question id "${cf.name}".`); continue; }
      seen.add(cf.name);
      fieldCount++;
      sec.fields.push(cf);
    }
    if (sec.fields.length) out.push(sec);
  }

  if (errors.length) return { ok: false, error: errors[0] };
  if (fieldCount > MAX_FIELDS) return { ok: false, error: `Too many questions (max ${MAX_FIELDS}).` };
  const missing = LOCKED_FIELDS.filter((n) => !seen.has(n));
  if (missing.length) return { ok: false, error: `Required question "${missing[0]}" cannot be removed from the form.` };

  // The privacy notice renders above the section holding the consent boxes.
  for (const sec of out) {
    if (sec.fields.some((f) => f.name === "consent_collection")) sec.isConsent = true;
  }
  return { ok: true, sections: out };
}

// The schema the site/API should use: the saved intakeForm if it validates,
// otherwise the built-in default. A corrupted row can never break the form.
export function resolveIntakeSchema(content) {
  const saved = content && content.intakeForm;
  if (saved) {
    const res = sanitizeIntakeForm(saved);
    if (res.ok) return res.sections;
  }
  return INTAKE_SCHEMA;
}
