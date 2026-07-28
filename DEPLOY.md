# Cedar Health — deployment & handover

The site is a **Cloudflare Worker** (`src/index.js`) that serves the public site,
renders content from **D1** (database), stores uploaded images in **R2**, and hosts a
password-protected editor at **`/admin`**. Static files (CSS, JS, seed images, the admin
app) live in `public/` and are served via the Worker's assets binding.

```
src/            Worker code (router, API, server-rendered pages, auth)
public/         static assets + /admin editor app
migrations/     D1 schema (0001) and generated seed (0002)
scripts/        gen-seed.mjs — builds the seed + hashes the first admin password
wrangler.jsonc  Worker + D1 + R2 configuration
```

## One-time setup (per Cloudflare account)

Run from the repo root. You need `wrangler` logged in to the **correct account**
(`wrangler login`, then `wrangler whoami` to confirm).

1. **Create the database**

   ```bash
   wrangler d1 create cedarhealth
   ```
   Copy the `database_id` it prints into `wrangler.jsonc` (replace `PLACEHOLDER_DB_ID`).

2. **Create the image bucket** (needs the *R2* permission on your token)

   ```bash
   wrangler r2 bucket create cedarhealth-media
   ```

3. **Set the session secret** (used to sign login cookies — use a long random value)

   ```bash
   wrangler secret put SESSION_SECRET
   ```

4. **Create the schema + seed content and the first login**

   Pick the clinic's admin email and a temporary password, then:

   ```bash
   ADMIN_EMAIL="reception@cedarhealth.co" ADMIN_PASSWORD="a-good-temporary-password" npm run gen:seed
   wrangler d1 execute cedarhealth --remote --file=./migrations/0001_init.sql
   wrangler d1 execute cedarhealth --remote --file=./migrations/0002_seed.sql
   ```

5. **Deploy**

   ```bash
   wrangler deploy
   ```

6. **Custom domain** — in the Cloudflare dashboard (Workers & Pages → cedarhealth →
   Settings → Domains & Routes) add **cedarhealth.co** (and `www`). Or add a `routes`
   entry to `wrangler.jsonc`.

7. **First sign-in** — go to `https://<your-domain>/admin`, sign in with the admin
   email + temporary password from step 4, then **Account → change the password**.

## Everyday updates (the clinic, no developer needed)

The clinic signs in at **`/admin`** and edits content in plain-English forms
(homepage, services, doctors, hours, logo, etc.). Saving writes to D1 and the public
site updates **immediately** — no rebuild or deploy. Patient-intake submissions appear
under **Patient intake** (private; only signed-in staff can see them).

## Local development

```bash
npm run db:local     # create + seed the local database (first time only)
npm run dev          # http://localhost:8787   (editor at /admin)
```

`.dev.vars` holds the local `SESSION_SECRET` (git-ignored).

## Notes & follow-ups

- **Patient intake = Personal Health Information.** It is stored in D1 (access-controlled)
  and shown only to signed-in staff. Have the field list + privacy notice reviewed for
  **PHIPA / PIPEDA** before go-live, and consider a data-retention policy.
- The seeded doctor photos are the earlier images; the clinic can replace the logo and
  photos through the editor (Logo & clinic name / Doctors).
- To add another staff login, insert a row into `admins` with a hashed password
  (reuse `scripts/gen-seed.mjs` as a template) — or ask the developer.
