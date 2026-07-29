# Cedar Health

Website for **Cedar Health**, a family medical practice in Niagara Falls, Ontario —
with a built-in, client-editable CMS and an online patient-intake form. Runs entirely on
**Cloudflare** (Workers + D1 + R2). No third-party CMS, no monthly SaaS.

## What it does

- **Public site** (`/`) — server-rendered from editable content, same design throughout.
- **Editor** (`/admin`) — the clinic signs in with an email + password and edits the site
  in plain-English forms (homepage, services, doctors, hours, logo, …). Saves are **live
  instantly** — no rebuild, no developer.
- **Patient intake** (`/intake`) — a detailed, PHIPA-aware registration form. Submissions
  land in a private inbox in `/admin` and can be **exported to CSV**.

## Architecture

| Piece | Tech |
|---|---|
| Server + routing + rendering | Cloudflare **Worker** (`src/`) |
| Editable content & intake submissions | **D1** (SQLite) |
| Uploaded images (logo, hero, doctor photos) | **R2** |
| Login | email + password (PBKDF2) + signed cookie session |
| Static assets & the `/admin` app | `public/` via the Worker's assets binding |

```
src/
  index.js        Worker entry / router
  api.js          JSON API (auth, content, uploads, intake, CSV export)
  site.js         server-rendered home + intake pages
  lib/            auth, db (D1), defaults (content + intake schema), html
public/
  styles.css, script.js, images/
  admin/          the editor app (index.html, admin.css, admin.js)
migrations/       D1 schema (0001) + generated seed (0002)
scripts/gen-seed.mjs   builds the seed and hashes the first admin password
wrangler.jsonc    Worker + D1 + R2 config
DEPLOY.md         one-time setup + deploy steps + handover notes
```

## Run locally

```bash
npm install
npm run db:local     # create + seed the local database (first run only)
npm run dev          # http://localhost:8787   — editor at /admin
```

Local admin login is printed by the seed step (default `admin@cedarhealthcare.ca` /
`ChangeMe-Cedar2026!` unless you set `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Deploy

See **[DEPLOY.md](DEPLOY.md)** — create the D1 database and R2 bucket, set the
`SESSION_SECRET`, seed, `wrangler deploy`, then point the domain at the Worker.

## Notes

- Design palette/motif: *eastern white cedar* (arborvitae). Type pairs **Libre Franklin**
  (display) with **Inter** (body). Accessible by default (skip link, focus rings,
  `prefers-reduced-motion`).
- **Patient intake is Personal Health Information** — stored access-controlled in D1,
  visible only to signed-in staff. Have the field list + privacy notice reviewed for
  PHIPA/PIPEDA before go-live.
