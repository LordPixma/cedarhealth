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

// Escape, then allow **bold** and [text](url) links — for paragraph-type content
// fields. Runs on the escaped string, so no other markup can get through. Link
// URLs must be http(s), mailto:, tel:, or site-relative (/...); anything else is
// left as literal text.
export function rich(value) {
  let s = esc(value);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\[([^\]\n]+)\]\(([^()\s]+)\)/g, (m, text, url) => {
    if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(url)) {
      const ext = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${url}"${ext}>${text}</a>`;
    }
    return m;
  });
  return s;
}

// rich() plus newlines to <br> — for multi-line paragraph fields.
export function richLines(value) {
  return rich(value).replace(/\r?\n/g, "<br>");
}
