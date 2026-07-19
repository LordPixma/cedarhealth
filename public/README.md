# Cedar Health

Single-page website for **Cedar Health**, a new family medical practice in Niagara, Ontario.
Static HTML/CSS/JS — **no build step** — designed to deploy on **Cloudflare Pages** straight from a GitHub repo.

## Structure

```
cedar-health/
├── index.html                 # the whole page
├── styles.css                 # design tokens + layout
├── script.js                  # reveals, header state, form handler
├── images/
│   ├── favicon.svg
│   ├── hero.jpg                # full-width hero background
│   ├── dr-moyo-esenamunjor.jpg
│   └── dr-osarugue-esenamunjor.jpg
└── README.md
```

Design notes: palette and motif are rooted in *eastern white cedar* (arborvitae, the "tree of life"), native to the Niagara escarpment. Type pairs **Libre Franklin** (display/headings) with **Inter** (body), loaded from Google Fonts. Accessible by default — skip link, keyboard focus rings, and `prefers-reduced-motion` respected.

---

## Deploy to Cloudflare Pages (via GitHub)

1. **Create the repo and push:**
   ```bash
   cd cedar-health
   git init
   git add .
   git commit -m "Cedar Health site"
   git branch -M main
   git remote add origin git@github.com:LordPixma/cedar-health.git   # adjust as needed
   git push -u origin main
   ```

2. **In the Cloudflare dashboard:** Workers & Pages → Create → **Pages** → *Connect to Git* → pick the repo.

3. **Build settings:**
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: **`/`** (repo root)

4. **Save and Deploy.** Every push to `main` redeploys. Add your custom domain (e.g. `cedarhealth.co`) under the project's *Custom domains* tab.

> Prefer Wrangler? `npx wrangler pages deploy . --project-name cedar-health` does the same from the CLI.

---

## Before you go live — fill these in

Everything below is marked in the page with cedarwood-coloured *"to be confirmed"* text or an HTML comment, so it's easy to find.

| What | Where |
|---|---|
| Street address (Niagara) | `index.html` → Contact → "Clinic" |
| Clinic phone | Contact → "Phone" (also update the hero **Call the clinic** button to a `tel:` link) |
| Clinic email | Contact → "Email" **and** `CLINIC_EMAIL` in `script.js` |
| OHIP billing wording | Contact → "Coverage" |
| Opening hours | Contact → `.hours` table (currently placeholder) |
| Bilingual staff — which languages | Benefits → "Bilingual staff" |
| Doctor bios | Doctors section — see note below |

**Doctor bios:** the two bios are placeholder *philosophy* statements written to be safe and generic. Replace them with the doctors' own words. I deliberately avoided stating credentials (medical school, years in practice, registration numbers) and pronouns — please add only what's verified.

---

## The registration form

Out of the box the form needs **no backend**: on submit it opens the visitor's email client with the details pre-filled (edit `CLINIC_EMAIL` in `script.js`). That works the moment you deploy.

To capture submissions server-side instead, add a **Cloudflare Pages Function**. Create `functions/api/register.js`:

```js
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  // e.g. forward via MailChannels, write to D1/KV, or hit a webhook
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
```

Then in `script.js`, replace the `mailto` block with a `fetch("/api/register", { method: "POST", body: JSON.stringify(...) })`. (Given your stack, D1 for records or KV for a simple queue both fit.)

---

## Images

**Hero background** — `images/hero.jpg` is the full-width photo behind the headline. The current image is a free-for-commercial-use stock photo from **Pexels** ([*"A Doctor Talking the Patient"*](https://www.pexels.com/photo/a-doctor-talking-the-patient-7579831/), mirrored horizontally so the doctor faces into the copy) — the [Pexels licence](https://www.pexels.com/license/) allows commercial use with no attribution required. To change it, just drop a new landscape image in at `images/hero.jpg` (≈1900px wide, keep it under ~500 KB); a green scrim is applied over it in CSS for legibility, and if the file is ever missing the hero falls back to a clean dark-green gradient. Swapping in a real photo of the clinic or team later is a good upgrade.

The two portraits in `images/` were resized to 760×760 for web. Higher-resolution originals exist — if you want crisper images, drop the full-size files in and keep the same filenames. They're shown in colour with a light polish (`filter: saturate(1.03) contrast(1.02)` on `.doc__photo img` in `styles.css`) — adjust or remove that rule to taste.
