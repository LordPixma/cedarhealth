// Minimal HTML helpers for server-side rendering.

export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escape then convert newlines to <br> — for addresses and short multi-line text.
export function escLines(value) {
  return esc(value).replace(/\r?\n/g, "<br>");
}

// Escape a value for use inside a double-quoted attribute.
export function attr(value) {
  return esc(value);
}
