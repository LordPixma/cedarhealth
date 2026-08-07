// Server-side rendering of the public site (home + patient intake) from content.
// Preserves the exact markup/classes of the original design so styles.css applies
// unchanged.

import { esc, escLines, attr, rich, richLines } from "./lib/html.js";
import { resolveIntakeSchema } from "./lib/intake.js";

/* ------------------------------------------------------------------ icons */
const ICONS = {
  // services
  heart: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21Z"/>',
  child: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/>',
  syringe: '<path d="m14 4 6 6M18.5 5.5 15 9M4 20l7-7M9 15l-3 3m0 0-2 2m2-2 2 2"/><path d="m10.5 8.5 5 5"/>',
  flask: '<path d="M9 3h6M10 3v6.5L5.5 17a2.5 2.5 0 0 0 2.2 3.7h8.6A2.5 2.5 0 0 0 18.5 17L14 9.5V3"/><path d="M8 14h8"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  // benefits
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="m17 9 5-3v12l-5-3"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  monitor: '<path d="M4 4h16v12H4z"/><path d="M4 12h4l2-4 3 7 2-3h5M8 20h8"/>',
  globe: '<path d="M3 5h18M3 12h18M3 19h12"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  // contact
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M4 5c0 9 6 15 15 15l1-4-5-2-2 2a11 11 0 0 1-5-5l2-2-2-5-4 1Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
};
const SPRIG = '<path d="M16 3c1.8 2.7 3 5 3 7.6 0 1-.2 1.9-.6 2.8 1.4-.8 2.4-2 3.1-3.6.6 2.6.3 5-1 7.2-.8 1.4-1.9 2.4-3.2 3.1V29h-2.6v-8.9c-1.3-.7-2.4-1.7-3.2-3.1-1.3-2.2-1.6-4.6-1-7.2.7 1.6 1.7 2.8 3.1 3.6-.4-.9-.6-1.8-.6-2.8C13 8 14.2 5.7 16 3Z" fill="currentColor"/>';

function svc(icon) {
  return `<svg class="svc__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ICONS.heart}</svg>`;
}
function ben(icon) {
  return `<svg class="benefit__ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ICONS.clock}</svg>`;
}
function cic(icon) {
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg>`;
}

/* ------------------------------------------------------------ brand mark */
function brandMark(content) {
  const b = content.brand || {};
  const name = esc(b.name || "Cedar Health");
  const icon = b.logoUrl
    ? `<img class="brand__logo" src="${attr(b.logoUrl)}" alt="" />`
    : `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">${SPRIG}</svg>`;
  // Always render the name as text so it stays legible regardless of the logo image.
  return `${icon}<b>${name}</b>`;
}

/* --------------------------------------------------------- header/footer */
// Nav links that anchor to a homepage section disappear when that section is
// hidden in content.layout (see homeSectionPlan below).
const NAV_LINKS = [
  { section: "services", href: "/#services", label: "Services" },
  { section: "doctors", href: "/#doctors", label: "Our doctors" },
  { section: "steps", href: "/#visiting", label: "Visiting" },
  { section: "contact", href: "/#contact", label: "Contact" }
];

function navLinks(content, indent, sections) {
  const vis = visibleHomeSections(content);
  return NAV_LINKS.filter((l) => vis.has(l.section) && (!sections || sections.includes(l.section)))
    .map((l) => `<a href="${l.href}">${l.label}</a>`)
    .join("\n" + indent);
}

function header(content) {
  return `
  <header class="site-header" id="top">
    <div class="wrap">
      <a class="brand" href="/" aria-label="${attr(content.brand?.name || "Cedar Health")} home">
        ${brandMark(content)}
      </a>
      <nav class="nav" aria-label="Primary">
        ${navLinks(content, "        ")}
        <a class="btn" href="/intake">Register</a>
      </nav>
    </div>
  </header>`;
}

function footer(content) {
  const f = content.footer || {};
  return `
  <footer class="site-footer">
    <div class="wrap">
      <div>
        <a class="brand" href="/" aria-label="${attr(content.brand?.name || "Cedar Health")} home">
          ${brandMark(content)}
        </a>
        <p class="foot-tag">${rich(f.tagline || "")}</p>
      </div>
      <nav class="foot-nav" aria-label="Footer">
        ${navLinks(content, "        ", ["services", "doctors", "steps"])}
        <a href="/intake">Register</a>
      </nav>
    </div>
    <div class="wrap">
      <div class="foot-base">
        <span>&copy; <span id="year">2026</span> ${esc(content.brand?.name || "Cedar Health")} &middot; Niagara Falls, Ontario</span>
        <span>${esc(f.note || "")}</span>
      </div>
    </div>
  </footer>`;
}

/* ------------------------------------------------------------ document */
export function layout({ content, title, description, main, bodyClass = "" }) {
  return `<!DOCTYPE html>
<html lang="en-CA">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(description)}" />
  <meta property="og:title" content="${attr(title)}" />
  <meta property="og:description" content="${attr(description)}" />
  <meta property="og:type" content="website" />
  <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body class="${attr(bodyClass)}">
  <a class="skip" href="#main">Skip to content</a>
  ${header(content)}
  <main id="main">${main}</main>
  ${footer(content)}
  <script src="/script.js"></script>
</body>
</html>`;
}

/* ============================================================ HOME PAGE */
function heroHeading(hero) {
  const heading = esc(hero.heading || "");
  const em = esc(hero.emphasis || "");
  if (em && heading.includes(em)) {
    return heading.replace(em, `<em>${em}</em>`);
  }
  return heading;
}

export function renderHome(content) {
  const hero = content.hero || {};
  const phone = (content.contact?.phone || "").trim();
  const heroStyle = hero.photoUrl ? ` style="--hero-photo:url('${attr(hero.photoUrl)}')"` : "";
  // Without a phone number the secondary CTA anchors to the contact section —
  // unless that section is hidden, in which case send people to the intake form.
  const ctaFallback = visibleHomeSections(content).has("contact") ? "/#contact" : "/intake";

  const sections = homeSectionPlan(content)
    .filter((p) => p.show)
    .map((p) => HOME_SECTIONS[p.id](content))
    .join("\n");

  const main = `
    <section class="hero"${heroStyle}>
      <div class="wrap">
        <div class="hero__copy">
          <span class="pill"><span class="dot" aria-hidden="true"></span> ${esc(hero.pill || "")}</span>
          <p class="eyebrow">${esc(hero.eyebrow || "")}</p>
          <h1>${heroHeading(hero)}</h1>
          <p class="hero__lede">${rich(hero.lede || "")}</p>
          <div class="hero__cta">
            <a class="btn" href="/intake">${esc(hero.ctaPrimary || "Register as a patient")}</a>
            <a class="btn btn--ghost" href="${phone ? "tel:" + attr(phone.replace(/[^0-9+]/g, "")) : ctaFallback}">${esc(hero.ctaSecondary || "Call the clinic")}</a>
          </div>
          <ul class="hero__trust">
            ${(hero.trust || []).map((t) => `<li>${esc(t)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
${sections}
  `;

  return layout({
    content,
    title: content.seo?.title || "Cedar Health",
    description: content.seo?.description || "",
    main
  });
}

/* ------------------------- homepage sections ------------------------- */
// Each renders independently so content.layout can hide or reorder them.
// The hero is not part of the plan — it always renders first.

function stripSection(content) {
  return `
    <section class="strip" aria-label="At a glance">
      <div class="wrap">
        <ul class="strip__grid">
          ${(content.strip || []).map((s) => `<li><span class="strip__k">${esc(s.k)}</span><span class="strip__v">${esc(s.v)}</span></li>`).join("")}
        </ul>
      </div>
    </section>`;
}

function servicesSection(content) {
  return `
    <section class="section" id="services">
      <div class="wrap">
        ${sectionHead(content.services)}
        <div class="services-grid">
          ${(content.services?.items || []).map((it) => `
          <article class="svc reveal">
            ${svc(it.icon)}
            <h3>${esc(it.title)}</h3>
            <p>${rich(it.body)}</p>
          </article>`).join("")}
        </div>
      </div>
    </section>`;
}

function doctorsSection(content) {
  return `
    <section class="section section--tint" id="doctors">
      <div class="wrap">
        ${sectionHead(content.doctors)}
        <div class="docs">
          ${(content.doctors?.items || []).map((d) => `
          <article class="doc reveal">
            <div class="doc__photo">
              <img src="${attr(d.photoUrl)}" alt="Portrait of ${attr(d.name)}" width="760" height="760" loading="lazy" />
            </div>
            <div class="doc__body">
              <span class="role">${esc(d.role)}</span>
              <h3>${esc(d.name)}</h3>
              <p>${rich(d.bio)}</p>
            </div>
          </article>`).join("")}
        </div>
      </div>
    </section>`;
}

function benefitsSection(content) {
  return `
    <section class="section section--cedar">
      <div class="wrap">
        ${sectionHead(content.benefits, true)}
        <div class="benefits">
          ${(content.benefits?.items || []).map((b) => `
          <div class="benefit reveal">
            ${ben(b.icon)}
            <div><h3>${esc(b.title)}</h3><p>${rich(b.body)}</p></div>
          </div>`).join("")}
        </div>
      </div>
    </section>`;
}

function stepsSection(content) {
  return `
    <section class="section" id="visiting">
      <div class="wrap">
        ${sectionHead(content.steps)}
        <div class="steps">
          ${(content.steps?.items || []).map((s, i) => `
          <article class="step reveal">
            <span class="step__n">${String(i + 1).padStart(2, "0")}</span>
            <h3>${esc(s.title)}</h3>
            <p>${rich(s.body)}</p>
          </article>`).join("")}
        </div>
      </div>
    </section>`;
}

const HOME_SECTIONS = {
  strip: stripSection,
  services: servicesSection,
  doctors: doctorsSection,
  benefits: benefitsSection,
  steps: stepsSection,
  contact: contactSection
};

// Merge the saved layout with the canonical section list: unknown ids are
// dropped, duplicates ignored, and sections missing from the saved layout are
// appended (visible) in default order — so a stale layout can never lose one.
function homeSectionPlan(content) {
  const saved = Array.isArray(content.layout?.sections) ? content.layout.sections : [];
  const seen = new Set();
  const plan = [];
  for (const s of saved) {
    if (s && HOME_SECTIONS[s.id] && !seen.has(s.id)) {
      seen.add(s.id);
      plan.push({ id: s.id, show: s.show !== false });
    }
  }
  for (const id of Object.keys(HOME_SECTIONS)) {
    if (!seen.has(id)) plan.push({ id, show: true });
  }
  return plan;
}

function visibleHomeSections(content) {
  return new Set(homeSectionPlan(content).filter((p) => p.show).map((p) => p.id));
}

function sectionHead(sec, onDark = false) {
  if (!sec) return "";
  return `
        <div class="section__head reveal">
          <p class="eyebrow${onDark ? " on-dark" : ""}">${esc(sec.eyebrow || "")}</p>
          <h2>${esc(sec.title || "")}</h2>
          ${sec.body ? `<p>${rich(sec.body)}</p>` : ""}
        </div>`;
}

function contactSection(content) {
  const c = content.contact || {};
  const phone = (c.phone || "").trim();
  const email = (c.email || "").trim();
  const tbc = (label) => `<span class="tbc">${esc(label)}</span>`;
  return `
    <section class="section section--tint" id="contact">
      <div class="wrap">
        ${sectionHead(c)}
        <div class="contact-grid">
          <div class="reveal">
            <ul class="info-list">
              <li>
                ${cic("pin")}
                <div><div class="k">Clinic</div><div class="v">${escLines(c.address)}</div></div>
              </li>
              <li>
                ${cic("phone")}
                <div><div class="k">Phone</div><div class="v">${phone ? `<a href="tel:${attr(phone.replace(/[^0-9+]/g, ""))}">${esc(phone)}</a>` : tbc("To be confirmed")}</div></div>
              </li>
              <li>
                ${cic("mail")}
                <div><div class="k">Email</div><div class="v">${email ? `<a href="mailto:${attr(email)}">${esc(email)}</a>` : tbc("To be confirmed")}</div></div>
              </li>
            </ul>
            <div class="hours">
              <h3>Hours</h3>
              <table>
                ${(c.hours || []).map((h) => `<tr><td>${esc(h.d)}</td><td>${esc(h.t)}</td></tr>`).join("")}
              </table>
            </div>
          </div>

          <div class="form reveal">
            <h3>Become a patient</h3>
            <p class="sub">${rich(c.body || "New patients are welcome. Complete the intake form and we'll be in touch.")}</p>
            <a class="btn" href="/intake" style="width:100%;justify-content:center;margin-top:.4rem">Start the patient intake form</a>
            <p class="note">Takes about 10 minutes. In an emergency, call&nbsp;911.</p>
          </div>
        </div>
      </div>
    </section>`;
}

/* ========================================================== INTAKE PAGE */
// The privacy notice + intake intro are editable content (content.intake.*).

function field(f) {
  const col = `field field--col${f.cols || 12}`;
  const req = f.required ? " required" : "";
  const reqMark = f.required ? ' <span class="req" aria-hidden="true">*</span>' : "";
  const id = `f_${f.name}`;
  const ac = f.autocomplete ? ` autocomplete="${attr(f.autocomplete)}"` : "";
  const im = f.inputmode ? ` inputmode="${attr(f.inputmode)}"` : "";
  const val = f.value ? ` value="${attr(f.value)}"` : "";

  if (f.type === "note") {
    // Display-only paragraph; stores no answer.
    return `
      <div class="${col}">
        <p class="intake-section__intro">${rich(f.label)}</p>
      </div>`;
  }
  if (f.type === "consent") {
    return `
      <div class="consent-row${f.plain ? " consent-row--plain" : ""}">
        <input type="checkbox" id="${id}" name="${attr(f.name)}"${req} />
        <label for="${id}">${esc(f.label)}${reqMark}</label>
      </div>`;
  }
  if (f.type === "checkboxes") {
    return `
      <fieldset class="${col} checks">
        <legend>${esc(f.label)}</legend>
        <div class="checks__grid">
          ${(f.options || []).map((o, i) => `
            <label class="check"><input type="checkbox" name="${attr(f.name)}" value="${attr(o)}" /> <span>${esc(o)}</span></label>`).join("")}
        </div>
      </fieldset>`;
  }
  if (f.type === "textarea") {
    return `
      <div class="${col}">
        <label for="${id}">${esc(f.label)}${reqMark}</label>
        <textarea id="${id}" name="${attr(f.name)}"${req}></textarea>
      </div>`;
  }
  if (f.type === "select") {
    return `
      <div class="${col}">
        <label for="${id}">${esc(f.label)}${reqMark}</label>
        <select id="${id}" name="${attr(f.name)}"${req}>
          <option value="">Select…</option>
          ${(f.options || []).map((o) => `<option${f.value === o ? " selected" : ""}>${esc(o)}</option>`).join("")}
        </select>
      </div>`;
  }
  // text | email | tel | date | number
  return `
      <div class="${col}">
        <label for="${id}">${esc(f.label)}${reqMark}</label>
        <input type="${attr(f.type)}" id="${id}" name="${attr(f.name)}"${req}${ac}${im}${val} />
      </div>`;
}

export function renderIntake(content) {
  const intake = content.intake || {};
  const sections = resolveIntakeSchema(content).map((s) => `
    <fieldset class="intake-section">
      <legend><span class="intake-section__n">${s.id === "consent" ? "" : ""}</span>${esc(s.title)}</legend>
      ${s.intro ? `<p class="intake-section__intro">${esc(s.intro)}</p>` : ""}
      ${s.isConsent ? `<div class="privacy-notice"><strong>Privacy notice</strong><p>${richLines(intake.privacyNotice)}</p></div>` : ""}
      <div class="intake-grid">
        ${s.fields.map(field).join("")}
      </div>
    </fieldset>`).join("");

  const main = `
    <section class="intake-hero">
      <div class="wrap">
        <p class="eyebrow">Patient intake</p>
        <h1>Become a patient at ${esc(content.brand?.name || "Cedar Health")}</h1>
        <p class="intake-hero__lede">${rich(intake.lede || "")} Fields marked <span class="req">*</span> are required.</p>
        <p class="intake-emergency">⚠️ This form is not for emergencies or urgent medical problems. If you have a medical emergency, call <strong>911</strong>.</p>
      </div>
    </section>
    <section class="section intake-body">
      <div class="wrap">
        <form id="intakeForm" class="intake-form" novalidate>
          ${sections}
          <div class="intake-actions">
            <button type="submit" class="btn">Submit intake form</button>
            <p class="note">By submitting, you confirm you have read the privacy notice above.</p>
          </div>
          <div class="intake-error" id="intakeError" hidden></div>
        </form>

        <div class="intake-done" id="intakeDone" hidden>
          <div class="intake-done__card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>
            <h2>Thank you — we've received your intake form.</h2>
            <p>A member of the Cedar Health team will be in touch to confirm your registration and book your first appointment. If your needs change in the meantime, please call the clinic.</p>
            <a class="btn" href="/">Back to home</a>
          </div>
        </div>
      </div>
    </section>
    <script>${INTAKE_CLIENT_JS}</script>`;

  return layout({
    content,
    title: `Patient intake — ${content.brand?.name || "Cedar Health"}`,
    description: "Register as a new patient at Cedar Health. Complete the secure online patient intake form.",
    main,
    bodyClass: "page-intake"
  });
}

// Client-side submit handler for the intake form (inlined).
const INTAKE_CLIENT_JS = `
(function(){
  var form = document.getElementById('intakeForm');
  if (!form) return;
  var errBox = document.getElementById('intakeError');
  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    errBox.hidden = true;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Submitting…';
    var data = {};
    var fd = new FormData(form);
    for (var pair of fd.entries()) {
      var k = pair[0], v = pair[1];
      if (data[k] === undefined) data[k] = v;
      else if (Array.isArray(data[k])) data[k].push(v);
      else data[k] = [data[k], v];
    }
    // unchecked consent checkboxes won't appear; normalise the required ones
    fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); })
      .then(function(res){
        if (res.ok) {
          document.getElementById('intakeForm').hidden = true;
          document.getElementById('intakeDone').hidden = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          throw new Error(res.j && res.j.error ? res.j.error : 'Something went wrong.');
        }
      })
      .catch(function(e){
        errBox.textContent = e.message || 'Could not submit. Please try again, or call the clinic.';
        errBox.hidden = false;
        btn.disabled = false; btn.textContent = 'Submit intake form';
      });
  });
})();
`;
