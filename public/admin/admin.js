/* Cedar Health — website editor (admin SPA). Plain JS, no build step. */
(function () {
  "use strict";

  var state = { content: null, user: null, active: "hero", subStatus: "new", counts: null };

  /* ---------------- tiny helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
  function getPath(o, p) { return p.split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split("."); var last = ks.pop(); var t = ks.reduce(function (a, k) { return a[k]; }, o); t[last] = v; }

  function api(method, url, body, isForm) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      if (isForm) { opts.body = body; }
      else { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || "Request failed."); return j;
      });
    });
  }

  var toastT;
  function toast(msg, isErr) {
    var t = $("#toast"); t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------------- auth ---------------- */
  function init() {
    api("GET", "/api/me").then(function (j) { state.user = j.user; showApp(); })
      .catch(function () { showLogin(); });
  }
  function showLogin() { $("#login").classList.remove("hidden"); $("#app").classList.add("hidden"); }

  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = $("#loginBtn"); var err = $("#loginErr"); err.hidden = true;
    btn.disabled = true; btn.textContent = "Signing in…";
    api("POST", "/api/login", { email: $("#email").value, password: $("#password").value })
      .then(function (j) { state.user = j.user; showApp(); })
      .catch(function (e) { err.textContent = e.message; err.hidden = false; })
      .then(function () { btn.disabled = false; btn.textContent = "Sign in"; });
  });

  $("#signout").addEventListener("click", function (e) {
    e.preventDefault();
    api("POST", "/api/logout").then(function () { location.reload(); });
  });

  function showApp() {
    $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
    $("#whoami").textContent = state.user ? state.user.email : "";
    Promise.all([
      api("GET", "/api/content"),
      api("GET", "/api/submissions?status=new").catch(function () { return { counts: null }; })
    ]).then(function (res) {
      state.content = res[0].content;
      state.counts = res[1].counts;
      renderNav(); openSection(state.active);
    });
  }

  /* ---------------- navigation ---------------- */
  var NAV = [
    { id: "hero", label: "Homepage hero" },
    { id: "layout", label: "Homepage layout" },
    { id: "services", label: "Services" },
    { id: "doctors", label: "Doctors" },
    { id: "benefits", label: "Why families choose us" },
    { id: "steps", label: "How it works" },
    { id: "strip", label: "“At a glance” band" },
    { id: "contact", label: "Hours & contact" },
    { id: "brand", label: "Logo & clinic name" },
    { id: "seo", label: "Search / SEO" },
    { id: "footer", label: "Footer" },
    { id: "intake", label: "Intake form text" },
    { id: "intakeform", label: "Intake questions" },
    { sep: true },
    { id: "submissions", label: "Patient intake" },
    { id: "accesslog", label: "Access log" },
    { id: "staff", label: "Staff logins" },
    { id: "account", label: "Account" }
  ];

  function renderNav() {
    var html = NAV.map(function (n) {
      if (n.sep) return '<div class="sidebar__sep"></div>';
      var badge = "";
      if (n.id === "submissions" && state.counts && state.counts.new) badge = '<span class="badge">' + state.counts.new + "</span>";
      return '<button class="navlink' + (n.id === state.active ? " active" : "") + '" data-nav="' + n.id + '">' +
        "<span>" + esc(n.label) + "</span>" + badge + "</button>";
    }).join("");
    $("#sidebar").innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), function (b) {
      b.addEventListener("click", function () { openSection(b.getAttribute("data-nav")); });
    });
  }

  function openSection(id) {
    state.active = id; renderNav();
    if (id === "layout") return renderLayout();
    if (id === "intakeform") return renderIntakeBuilder();
    if (id === "submissions") return renderSubmissions();
    if (id === "accesslog") return renderAccessLog();
    if (id === "staff") return renderStaff();
    if (id === "account") return renderAccount();
    renderEditor(id);
  }

  /* ---------------- editor definitions ---------------- */
  var T = function (k, label, type, help) { return { k: k, label: label, type: type || "text", help: help }; };
  // Paragraph-type fields support light formatting (rendered safely server-side).
  var FMT = "You can use **bold** and [link text](https://example.com).";
  var EDITORS = {
    hero: { title: "Homepage hero", desc: "The top of your homepage — the first thing visitors see.", fields: [
      T("pill", "Green banner text", "text", "The little rounded badge, e.g. “Now accepting new patients”."),
      T("eyebrow", "Small label above the headline", "text"),
      T("heading", "Headline", "text"),
      T("emphasis", "Word to highlight in green", "text", "Type one word from the headline; it turns green."),
      T("lede", "Intro paragraph", "textarea", FMT),
      T("photoUrl", "Background photo", "image"),
      T("ctaPrimary", "Main button label", "text"),
      T("ctaSecondary", "Second button label", "text"),
      T("trust", "Checkmarked points", "tags")
    ]},
    services: { title: "Services", desc: "The “What we do” cards.", fields: [
      T("eyebrow", "Small label", "text"), T("title", "Section heading", "text"), T("body", "Intro line", "textarea", FMT),
      { k: "items", label: "Service cards", type: "list", item: [T("icon", "Icon", "icon"), T("title", "Title"), T("body", "Description", "textarea", FMT)] }
    ]},
    doctors: { title: "Doctors", desc: "Your physicians.", fields: [
      T("eyebrow", "Small label", "text"), T("title", "Section heading", "text"), T("body", "Intro line", "textarea", FMT),
      { k: "items", label: "Doctors", type: "list", item: [T("name", "Name"), T("role", "Role"), T("bio", "Short bio", "textarea", FMT), T("photoUrl", "Photo", "image")] }
    ]},
    benefits: { title: "Why families choose us", desc: "The dark green highlights band.", fields: [
      T("eyebrow", "Small label", "text"), T("title", "Section heading", "text"),
      { k: "items", label: "Points", type: "list", item: [T("icon", "Icon", "icon"), T("title", "Title"), T("body", "Description", "textarea", FMT)] }
    ]},
    steps: { title: "How it works", desc: "The numbered “what to expect” steps.", fields: [
      T("eyebrow", "Small label", "text"), T("title", "Section heading", "text"), T("body", "Intro line", "textarea", FMT),
      { k: "items", label: "Steps", type: "list", item: [T("title", "Title"), T("body", "Description", "textarea", FMT)] }
    ]},
    strip: { title: "“At a glance” band", desc: "The four quick facts under the hero.", arrayOf: [T("k", "Big word"), T("v", "Small line under it")] },
    contact: { title: "Hours & contact", desc: "Address, phone, email and opening hours.", fields: [
      T("eyebrow", "Small label", "text"), T("title", "Section heading", "text"), T("body", "Intro line", "textarea", FMT),
      T("address", "Clinic address", "textarea"), T("phone", "Phone number", "text"), T("email", "Email", "text"),
      { k: "hours", label: "Opening hours", type: "rows", item: [T("d", "Day(s)"), T("t", "Hours")] }
    ]},
    brand: { title: "Logo & clinic name", desc: "Your name and logo across the site.", fields: [
      T("name", "Clinic name", "text"),
      T("logoUrl", "Logo icon", "image", "A square icon/mark works best — the clinic name is shown as text beside it.")
    ]},
    seo: { title: "Search / SEO", desc: "How your site appears in Google and when shared.", fields: [
      T("title", "Page title", "text"), T("description", "Description", "textarea")
    ]},
    footer: { title: "Footer", desc: "The bottom of every page.", fields: [
      T("tagline", "Tagline", "textarea", FMT), T("note", "Small note (right side)", "text")
    ]},
    intake: { title: "Intake form text", desc: "Wording on the patient intake form.", fields: [
      T("lede", "Intro line (under the heading)", "textarea", FMT),
      T("privacyNotice", "Privacy notice (shown above the consent checkboxes)", "textarea", "This is the PHIPA notice patients agree to — have it reviewed by your privacy advisor. " + FMT)
    ]}
  };

  var draft = null;

  function renderEditor(id) {
    var ed = EDITORS[id];
    draft = clone(state.content[id]);
    var body = ed.arrayOf ? arrayEditor(ed) : ed.fields.map(function (f) { return fieldRow(f, f.k); }).join("");
    $("#main").innerHTML =
      '<div class="page-head"><h1>' + esc(ed.title) + "</h1><p>" + esc(ed.desc || "") + "</p></div>" +
      '<div class="card"><div class="fields">' + body + "</div></div>" +
      '<div class="save-bar"><button class="btn" id="saveBtn">Save changes</button>' +
      '<button class="btn btn--ghost" id="resetBtn">Undo</button><span class="saved hidden" id="savedMsg">✓ Saved</span></div>';
    bind();
    $("#saveBtn").addEventListener("click", function () { save(id); });
    $("#resetBtn").addEventListener("click", function () { renderEditor(id); });
  }

  /* field renderers (return HTML with data-bind / data-act) */
  function fieldRow(f, path) {
    if (f.type === "list") return listField(f, path);
    if (f.type === "rows") return rowsField(f, path);
    if (f.type === "tags") return tagsField(f, path);
    if (f.type === "image") return imageField(f, path);
    if (f.type === "icon") return iconField(f, path);
    var val = esc(getPath(draft, path));
    var input = f.type === "textarea"
      ? '<textarea data-bind="' + path + '">' + val + "</textarea>"
      : '<input type="text" data-bind="' + path + '" value="' + val + '" />';
    return '<div class="f"><label>' + esc(f.label) + "</label>" + input + help(f) + "</div>";
  }
  function help(f) { return f.help ? '<div class="help">' + esc(f.help) + "</div>" : ""; }

  // Names must exist in the site's ICONS map (src/site.js); unknown values fall
  // back to a sensible default when the page renders.
  var ICON_CHOICES = [
    ["heart", "Heart"], ["child", "Child"], ["syringe", "Syringe"], ["flask", "Lab flask"],
    ["pulse", "Pulse line"], ["clock", "Clock"], ["video", "Video call"], ["calendar", "Calendar"],
    ["monitor", "Health monitor"], ["globe", "Globe"], ["lock", "Padlock"], ["pin", "Map pin"],
    ["phone", "Phone"], ["mail", "Envelope"]
  ];
  function iconField(f, path) {
    var val = getPath(draft, path) || "";
    var known = ICON_CHOICES.some(function (c) { return c[0] === val; });
    var opts = ICON_CHOICES.map(function (c) {
      return '<option value="' + c[0] + '"' + (val === c[0] ? " selected" : "") + ">" + esc(c[1]) + "</option>";
    }).join("");
    if (val && !known) opts = '<option value="' + esc(val) + '" selected>' + esc(val) + "</option>" + opts;
    return '<div class="f"><label>' + esc(f.label) + '</label><select data-bind="' + path + '">' + opts + "</select>" + help(f) + "</div>";
  }

  function imageField(f, path) {
    var url = getPath(draft, path) || "";
    var thumb = url ? ' style="background-image:url(' + esc(url) + ')"' : "";
    return '<div class="f"><label>' + esc(f.label) + "</label>" +
      '<div class="imgfield">' +
      '<div class="imgfield__thumb"' + thumb + ">" + (url ? "" : "No image") + "</div>" +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="upload" data-path="' + path + '">Upload image</button>' +
      (url ? '<button type="button" class="btn btn--danger btn--sm" data-act="clearimg" data-path="' + path + '">Remove</button>' : "") +
      '<input type="file" accept="image/*" data-file="' + path + '" />' +
      "</div>" + help(f) + "</div>";
  }

  function tagsField(f, path) {
    var arr = getPath(draft, path) || [];
    var rows = arr.map(function (t, i) {
      return '<div class="tag-row"><input type="text" data-bind="' + path + "." + i + '" value="' + esc(t) + '" />' +
        '<button type="button" class="iconbtn" data-act="del" data-path="' + path + '" data-i="' + i + '">✕</button></div>';
    }).join("");
    return '<div class="f"><label>' + esc(f.label) + "</label><div class=\"tags\">" + rows +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="add" data-path="' + path + '" data-kind="tag" style="align-self:flex-start">+ Add</button></div>' + help(f) + "</div>";
  }

  function rowsField(f, path) {
    var arr = getPath(draft, path) || [];
    var rows = arr.map(function (row, i) {
      var cells = f.item.map(function (sf) {
        return '<input type="text" placeholder="' + esc(sf.label) + '" data-bind="' + path + "." + i + "." + sf.k + '" value="' + esc(row[sf.k]) + '" />';
      }).join("");
      return '<div class="tag-row">' + cells + '<button type="button" class="iconbtn" data-act="del" data-path="' + path + '" data-i="' + i + '">✕</button></div>';
    }).join("");
    return '<div class="f"><label>' + esc(f.label) + '</label><div class="tags">' + rows +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="add" data-path="' + path + '" data-kind="row" style="align-self:flex-start">+ Add row</button></div>' + help(f) + "</div>";
  }

  function listField(f, path) {
    var arr = getPath(draft, path) || [];
    var items = arr.map(function (item, i) { return itemCard(f, path, i, arr.length); }).join("");
    return '<div class="f"><label>' + esc(f.label) + "</label>" + items +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="add" data-path="' + path + '" data-kind="item">+ Add ' + esc(singular(f.label)) + "</button></div>";
  }
  function itemCard(f, path, i, n) {
    var sub = f.item.map(function (sf) { return fieldRow(sf, path + "." + i + "." + sf.k); }).join("");
    return '<div class="item"><div class="item__bar"><span class="item__title">#' + (i + 1) + "</span>" +
      '<span class="spacer"></span>' +
      '<button type="button" class="iconbtn" data-act="up" data-path="' + path + '" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
      '<button type="button" class="iconbtn" data-act="down" data-path="' + path + '" data-i="' + i + '"' + (i === n - 1 ? " disabled" : "") + ">↓</button>" +
      '<button type="button" class="iconbtn" data-act="del" data-path="' + path + '" data-i="' + i + '">✕</button></div>' +
      '<div class="fields">' + sub + "</div></div>";
  }
  function singular(s) { return s.replace(/s$/i, "").toLowerCase(); }

  function arrayEditor(ed) {
    // whole section is an array (e.g. strip). Wrap it as if a list field on the root.
    var f = { item: ed.arrayOf, label: ed.title };
    var arr = draft || [];
    var items = arr.map(function (item, i) { return itemCard(f, "__root", i, arr.length); }).join("");
    return '<div class="f">' + items +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="add" data-path="__root" data-kind="rootitem">+ Add</button></div>';
  }

  /* bind inputs + action buttons to the draft */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-bind]"), function (inp) {
      var apply = function () {
        var p = inp.getAttribute("data-bind");
        if (p.indexOf("__root") === 0) setPath({ __root: draft }, p, inp.value);
        else setPath(draft, p, inp.value);
      };
      inp.addEventListener("input", apply);
      inp.addEventListener("change", apply); // selects fire change, not always input
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-act]"), function (btn) {
      btn.addEventListener("click", function () { action(btn); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-file]"), function (inp) {
      inp.addEventListener("change", function () { doUpload(inp); });
    });
  }

  function refArray(path) {
    // returns the array referenced by path (handles __root)
    if (path === "__root") return draft;
    return getPath(draft, path);
  }

  function action(btn) {
    var act = btn.getAttribute("data-act");
    var path = btn.getAttribute("data-path");
    var i = parseInt(btn.getAttribute("data-i"), 10);
    var arr = refArray(path);
    if (act === "upload") { document.querySelector('[data-file="' + path + '"]').click(); return; }
    if (act === "clearimg") { setPath(draft, path, ""); return rerender(); }
    if (act === "del") { arr.splice(i, 1); return rerender(); }
    if (act === "up") { var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; return rerender(); }
    if (act === "down") { var u = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = u; return rerender(); }
    if (act === "add") {
      var kind = btn.getAttribute("data-kind");
      if (kind === "tag") arr.push("");
      else if (kind === "row") arr.push(blank(EDITORS[state.active].fields.filter(function (f) { return f.k === path; })[0].item));
      else if (kind === "rootitem") draft.push(blank(EDITORS[state.active].arrayOf));
      else { // item in a list field
        var fld = findListField(EDITORS[state.active], path);
        arr.push(blank(fld.item, fld));
      }
      return rerender();
    }
  }
  function findListField(ed, path) {
    var fields = ed.fields || [];
    for (var j = 0; j < fields.length; j++) if (fields[j].k === path) return fields[j];
    return null;
  }
  function blank(subfields, fld) {
    var o = {};
    subfields.forEach(function (sf) { o[sf.k] = sf.type === "image" ? "" : ""; });
    // preserve an icon default for services/benefits so SSR keeps rendering an icon
    if (fld && fld.k === "items" && state.active === "services") o.icon = "heart";
    if (fld && fld.k === "items" && state.active === "benefits") o.icon = "clock";
    return o;
  }

  function rerender() {
    // re-render the current editor from the mutated draft without touching state.content
    var id = state.active, ed = EDITORS[id];
    var saved = draft;
    var body = ed.arrayOf ? arrayEditor(ed) : ed.fields.map(function (f) { return fieldRow(f, f.k); }).join("");
    $(".card .fields") ? ($(".card").querySelector(".fields").innerHTML = body) : null;
    // simplest: rebuild whole card region
    var card = document.querySelector(".card");
    if (card) card.innerHTML = '<div class="fields">' + body + "</div>";
    draft = saved;
    bind();
  }

  function doUpload(inp) {
    var path = inp.getAttribute("data-file");
    var file = inp.files && inp.files[0];
    if (!file) return;
    toast("Uploading image…");
    var fd = new FormData(); fd.append("file", file);
    api("POST", "/api/upload", fd, true).then(function (j) {
      setPath(draft, path, j.url); rerender(); toast("Image uploaded");
    }).catch(function (e) { toast(e.message, true); });
  }

  function save(id) {
    var btn = $("#saveBtn"); btn.disabled = true; btn.textContent = "Saving…";
    api("PUT", "/api/content/" + id, draft).then(function () {
      state.content[id] = clone(draft);
      $("#savedMsg").classList.remove("hidden");
      toast("Saved — your website is updated");
      setTimeout(function () { $("#savedMsg") && $("#savedMsg").classList.add("hidden"); }, 2500);
    }).catch(function (e) { toast(e.message, true); })
      .then(function () { btn.disabled = false; btn.textContent = "Save changes"; });
  }

  /* ---------------- homepage layout ---------------- */
  var LAYOUT_ORDER = ["strip", "services", "doctors", "benefits", "steps", "contact"];
  var LAYOUT_NAMES = {
    strip: "“At a glance” band",
    services: "Services",
    doctors: "Doctors",
    benefits: "Why families choose us",
    steps: "How it works",
    contact: "Hours & contact"
  };
  var layoutDraft = null;

  // Same defensive merge the site performs: drop unknown ids, keep saved order,
  // append anything missing so every section always has a row here.
  function layoutPlan() {
    var saved = (state.content.layout && Array.isArray(state.content.layout.sections)) ? state.content.layout.sections : [];
    var seen = {}, plan = [];
    saved.forEach(function (s) {
      if (s && LAYOUT_NAMES[s.id] && !seen[s.id]) { seen[s.id] = 1; plan.push({ id: s.id, show: s.show !== false }); }
    });
    LAYOUT_ORDER.forEach(function (id) { if (!seen[id]) plan.push({ id: id, show: true }); });
    return plan;
  }

  function renderLayout() {
    layoutDraft = layoutPlan();
    $("#main").innerHTML =
      '<div class="page-head"><h1>Homepage layout</h1><p>Choose which sections appear on your homepage and their order. The hero always shows first. Menu links to a hidden section disappear automatically.</p></div>' +
      '<div class="card"><div id="layoutRows"></div></div>' +
      '<div class="save-bar"><button class="btn" id="layoutSave">Save changes</button>' +
      '<button class="btn btn--ghost" id="layoutReset">Undo</button><span class="saved hidden" id="savedMsg">✓ Saved</span></div>';
    drawLayoutRows();
    $("#layoutSave").addEventListener("click", saveLayout);
    $("#layoutReset").addEventListener("click", renderLayout);
  }

  function drawLayoutRows() {
    var rows = layoutDraft.map(function (s, i) {
      return '<div class="item__bar" style="padding:.55rem 0;border-bottom:1px solid var(--line)">' +
        '<label style="display:flex;align-items:center;gap:.55rem;cursor:pointer;flex:1">' +
        '<input type="checkbox" data-layout-show="' + i + '"' + (s.show ? " checked" : "") + ' /> ' +
        '<span class="item__title" style="font-weight:600' + (s.show ? "" : ";color:var(--muted)") + '">' + esc(LAYOUT_NAMES[s.id]) + "</span>" +
        (s.show ? "" : ' <span class="pill-status archived">hidden</span>') + "</label>" +
        '<button type="button" class="iconbtn" data-layout-move="-1" data-i="' + i + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="iconbtn" data-layout-move="1" data-i="' + i + '"' + (i === layoutDraft.length - 1 ? " disabled" : "") + ">↓</button>" +
        "</div>";
    }).join("");
    $("#layoutRows").innerHTML = rows;
    Array.prototype.forEach.call(document.querySelectorAll("[data-layout-show]"), function (cb) {
      cb.addEventListener("change", function () {
        layoutDraft[parseInt(cb.getAttribute("data-layout-show"), 10)].show = cb.checked;
        drawLayoutRows();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-layout-move]"), function (b) {
      b.addEventListener("click", function () {
        var i = parseInt(b.getAttribute("data-i"), 10);
        var d = parseInt(b.getAttribute("data-layout-move"), 10);
        var t = layoutDraft[i + d]; layoutDraft[i + d] = layoutDraft[i]; layoutDraft[i] = t;
        drawLayoutRows();
      });
    });
  }

  function saveLayout() {
    var btn = $("#layoutSave"); btn.disabled = true; btn.textContent = "Saving…";
    api("PUT", "/api/content/layout", { sections: layoutDraft })
      .then(function () {
        state.content.layout = { sections: clone(layoutDraft) };
        $("#savedMsg").classList.remove("hidden");
        toast("Saved — your website is updated");
        setTimeout(function () { $("#savedMsg") && $("#savedMsg").classList.add("hidden"); }, 2500);
      })
      .catch(function (e) { toast(e.message, true); })
      .then(function () { btn.disabled = false; btn.textContent = "Save changes"; });
  }

  /* ---------------- intake form builder ---------------- */
  // Six fields are locked because the submission API depends on them by name;
  // the server rejects any save that removes them (see src/lib/intake.js).
  var Q_LOCKED = { legal_first_name: 1, legal_last_name: 1, signature_name: 1, consent_collection: 1, consent_contact: 1, consent_accuracy: 1 };
  var Q_TYPES = [
    ["text", "Short answer"], ["textarea", "Long answer"], ["email", "Email"], ["tel", "Phone"],
    ["date", "Date"], ["number", "Number"], ["select", "Dropdown"], ["checkboxes", "Checkboxes"],
    ["consent", "Consent checkbox"], ["note", "Explanatory text (no answer)"]
  ];
  var Q_WIDTHS = [["12", "Full width"], ["6", "Half"], ["4", "Third"], ["3", "Quarter"]];
  var ibDraft = null;

  function sectionHasLocked(sec) {
    return (sec.fields || []).some(function (f) { return Q_LOCKED[f.name]; });
  }

  function renderIntakeBuilder() {
    ibDraft = clone(state.content.intakeForm || { sections: [] });
    $("#main").innerHTML =
      '<div class="page-head"><h1>Intake questions</h1>' +
      '<p>The questions on the patient intake form. Changes apply to new registrations — past submissions keep their answers, but answers to removed questions are no longer shown. ' +
      'Questions marked <span class="pill-status reviewed">locked</span> are required by the system and can’t be removed.</p></div>' +
      '<div id="ibArea"></div>' +
      '<div style="margin:0 0 1.2rem"><button class="btn btn--ghost btn--sm" id="ibAddSec">+ Add section</button></div>' +
      '<div class="save-bar"><button class="btn" id="ibSave">Save changes</button>' +
      '<button class="btn btn--ghost" id="ibReset">Undo</button><span class="saved hidden" id="savedMsg">✓ Saved</span></div>';
    drawBuilder();
    $("#ibSave").addEventListener("click", saveIntakeBuilder);
    $("#ibReset").addEventListener("click", renderIntakeBuilder);
    $("#ibAddSec").addEventListener("click", function () {
      ibDraft.sections.push({ title: "New section", fields: [] });
      drawBuilder();
    });
  }

  function ibFieldRow(f, si, fi, n) {
    var locked = !!Q_LOCKED[f.name];
    var isNote = f.type === "note";
    var typeOpts = Q_TYPES.map(function (t) {
      return '<option value="' + t[0] + '"' + (f.type === t[0] ? " selected" : "") + ">" + t[1] + "</option>";
    }).join("");
    var widthVal = String(f.cols || 12);
    var widthOpts = Q_WIDTHS.map(function (w) {
      return '<option value="' + w[0] + '"' + (widthVal === w[0] ? " selected" : "") + ">" + w[1] + "</option>";
    }).join("");
    if (!Q_WIDTHS.some(function (w) { return w[0] === widthVal; })) {
      widthOpts = '<option value="' + widthVal + '" selected>Custom (' + widthVal + "/12)</option>" + widthOpts;
    }
    var label = isNote
      ? '<textarea data-ib="' + si + "." + fi + '.label" style="min-height:56px">' + esc(f.label || "") + "</textarea>"
      : '<input type="text" data-ib="' + si + "." + fi + '.label" value="' + esc(f.label || "") + '" placeholder="Question label" />';
    var opts = (f.type === "select" || f.type === "checkboxes")
      ? '<div class="f" style="margin-top:.5rem"><label>Choices (one per line)</label>' +
        '<textarea data-ib-opts="' + si + "." + fi + '" style="min-height:70px">' + esc((f.options || []).join("\n")) + "</textarea></div>"
      : "";
    return '<div class="item"><div class="item__bar">' +
      '<span class="item__title">Q' + (fi + 1) + "</span>" +
      (locked ? '<span class="pill-status reviewed">locked</span>' : "") +
      '<span class="spacer"></span>' +
      '<button type="button" class="iconbtn" data-ib-act="fup" data-si="' + si + '" data-fi="' + fi + '"' + (fi === 0 ? " disabled" : "") + ">↑</button>" +
      '<button type="button" class="iconbtn" data-ib-act="fdown" data-si="' + si + '" data-fi="' + fi + '"' + (fi === n - 1 ? " disabled" : "") + ">↓</button>" +
      (locked ? "" : '<button type="button" class="iconbtn" data-ib-act="fdel" data-si="' + si + '" data-fi="' + fi + '">✕</button>') +
      "</div>" +
      '<div class="fields"><div class="f">' + label + "</div>" +
      '<div style="display:flex;gap:.7rem;flex-wrap:wrap;align-items:center">' +
      '<select data-ib-type="' + si + "." + fi + '"' + (locked ? " disabled" : "") + ' style="max-width:230px">' + typeOpts + "</select>" +
      (isNote ? "" : '<select data-ib-width="' + si + "." + fi + '" style="max-width:150px">' + widthOpts + "</select>") +
      (isNote || f.type === "checkboxes" ? "" :
        '<label style="display:flex;align-items:center;gap:.4rem;font-size:.9rem;cursor:pointer">' +
        '<input type="checkbox" data-ib-req="' + si + "." + fi + '"' + (f.required ? " checked" : "") + (locked ? " disabled" : "") + " /> Required</label>") +
      "</div>" + opts + "</div></div>";
  }

  function drawBuilder() {
    var html = ibDraft.sections.map(function (sec, si) {
      var canDelete = !sectionHasLocked(sec);
      var rows = (sec.fields || []).map(function (f, fi) { return ibFieldRow(f, si, fi, sec.fields.length); }).join("");
      return '<div class="card"><div class="item__bar" style="margin-bottom:.8rem">' +
        '<input type="text" data-ib-sec="' + si + '.title" value="' + esc(sec.title || "") + '" placeholder="Section title" style="flex:1;font-weight:600" />' +
        '<button type="button" class="iconbtn" data-ib-act="sup" data-si="' + si + '"' + (si === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="iconbtn" data-ib-act="sdown" data-si="' + si + '"' + (si === ibDraft.sections.length - 1 ? " disabled" : "") + ">↓</button>" +
        (canDelete ? '<button type="button" class="iconbtn" data-ib-act="sdel" data-si="' + si + '">✕</button>' : "") +
        "</div>" +
        '<div class="f" style="margin-bottom:.9rem"><label>Section intro (optional)</label>' +
        '<textarea data-ib-sec="' + si + '.intro" style="min-height:48px">' + esc(sec.intro || "") + "</textarea></div>" +
        rows +
        '<button type="button" class="btn btn--ghost btn--sm" data-ib-act="fadd" data-si="' + si + '">+ Add question</button>' +
        "</div>";
    }).join("");
    $("#ibArea").innerHTML = html;
    bindBuilder();
  }

  function bindBuilder() {
    var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
    each("[data-ib]", function (inp) {
      var apply = function () {
        var p = inp.getAttribute("data-ib").split(".");
        ibDraft.sections[+p[0]].fields[+p[1]][p[2]] = inp.value;
      };
      inp.addEventListener("input", apply); inp.addEventListener("change", apply);
    });
    each("[data-ib-sec]", function (inp) {
      var apply = function () {
        var p = inp.getAttribute("data-ib-sec").split(".");
        ibDraft.sections[+p[0]][p[1]] = inp.value;
      };
      inp.addEventListener("input", apply); inp.addEventListener("change", apply);
    });
    each("[data-ib-opts]", function (inp) {
      var apply = function () {
        var p = inp.getAttribute("data-ib-opts").split(".");
        ibDraft.sections[+p[0]].fields[+p[1]].options =
          inp.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      };
      inp.addEventListener("input", apply); inp.addEventListener("change", apply);
    });
    each("[data-ib-type]", function (sel) {
      sel.addEventListener("change", function () {
        var p = sel.getAttribute("data-ib-type").split(".");
        var f = ibDraft.sections[+p[0]].fields[+p[1]];
        f.type = sel.value;
        if ((f.type === "select" || f.type === "checkboxes") && !(f.options && f.options.length)) f.options = ["Option 1"];
        if (f.type !== "select" && f.type !== "checkboxes") delete f.options;
        drawBuilder();
      });
    });
    each("[data-ib-width]", function (sel) {
      sel.addEventListener("change", function () {
        var p = sel.getAttribute("data-ib-width").split(".");
        ibDraft.sections[+p[0]].fields[+p[1]].cols = parseInt(sel.value, 10);
      });
    });
    each("[data-ib-req]", function (cb) {
      cb.addEventListener("change", function () {
        var p = cb.getAttribute("data-ib-req").split(".");
        var f = ibDraft.sections[+p[0]].fields[+p[1]];
        if (cb.checked) f.required = true; else delete f.required;
      });
    });
    each("[data-ib-act]", function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-ib-act");
        var si = parseInt(btn.getAttribute("data-si"), 10);
        var fi = parseInt(btn.getAttribute("data-fi"), 10);
        var secs = ibDraft.sections, t;
        if (act === "sup") { t = secs[si - 1]; secs[si - 1] = secs[si]; secs[si] = t; }
        else if (act === "sdown") { t = secs[si + 1]; secs[si + 1] = secs[si]; secs[si] = t; }
        else if (act === "sdel") {
          if (!window.confirm("Remove this section and all its questions from the form? Past submissions keep their answers.")) return;
          secs.splice(si, 1);
        }
        else if (act === "fadd") { secs[si].fields.push({ name: "", label: "", type: "text" }); }
        else if (act === "fup") { t = secs[si].fields[fi - 1]; secs[si].fields[fi - 1] = secs[si].fields[fi]; secs[si].fields[fi] = t; }
        else if (act === "fdown") { t = secs[si].fields[fi + 1]; secs[si].fields[fi + 1] = secs[si].fields[fi]; secs[si].fields[fi] = t; }
        else if (act === "fdel") { secs[si].fields.splice(fi, 1); }
        drawBuilder();
      });
    });
  }

  // New questions get a stable id derived from their label once, at save time.
  // Ids never change afterwards — they key the stored submission data.
  function assignQuestionNames() {
    var taken = {};
    ibDraft.sections.forEach(function (s) { (s.fields || []).forEach(function (f) { if (f.name) taken[f.name] = 1; }); });
    ibDraft.sections.forEach(function (s) {
      (s.fields || []).forEach(function (f) {
        if (f.name) return;
        var base = (f.label || "question").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "question";
        var name = base, i = 2;
        while (taken[name]) { name = base + "_" + i; i++; }
        taken[name] = 1; f.name = name;
      });
    });
  }

  function saveIntakeBuilder() {
    assignQuestionNames();
    var btn = $("#ibSave"); btn.disabled = true; btn.textContent = "Saving…";
    api("PUT", "/api/content/intakeForm", { sections: ibDraft.sections })
      .then(function () {
        state.content.intakeForm = { sections: clone(ibDraft.sections) };
        $("#savedMsg").classList.remove("hidden");
        toast("Saved — the intake form is updated");
        setTimeout(function () { $("#savedMsg") && $("#savedMsg").classList.add("hidden"); }, 2500);
      })
      .catch(function (e) { toast(e.message, true); })
      .then(function () { btn.disabled = false; btn.textContent = "Save changes"; });
  }

  /* ---------------- submissions ---------------- */
  function renderSubmissions() {
    $("#main").innerHTML =
      '<div class="page-head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">' +
      '<div><h1>Patient intake</h1><p>Forms submitted by people registering as patients. This is private information — only signed-in staff can see it.</p></div>' +
      '<a class="btn btn--ghost btn--sm" href="/api/submissions/export" download>⬇ Export all (CSV)</a>' +
      '</div>' +
      '<div class="card" id="retentionCard" style="max-width:660px;margin-bottom:1.3rem">Loading…</div>' +
      '<div id="subArea">Loading…</div>';
    loadRetention();
    loadSubs();
  }
  function loadRetention() {
    api("GET", "/api/settings").then(function (j) {
      var d = (j.settings && j.settings.retentionDays) || 0;
      $("#retentionCard").innerHTML =
        '<h3 style="color:var(--cedar);font-size:1.05rem;margin:0 0 .4rem">Retention</h3>' +
        '<p style="color:var(--muted);font-size:.9rem;margin:0 0 .9rem">Automatically delete intake submissions after a set number of days — they contain health information, so keep them only as long as you need. Set to <b>0</b> to keep them until you delete them yourself.</p>' +
        '<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">' +
        '<span>Delete submissions older than</span>' +
        '<input type="number" id="retDays" min="0" max="3650" value="' + d + '" style="width:88px;padding:.5rem .6rem;border:1.5px solid var(--line);border-radius:8px;font:inherit" />' +
        '<span>days</span><button class="btn btn--sm" id="retBtn">Save</button>' +
        '<span class="help" style="color:var(--muted);margin-left:.3rem">' + (d > 0 ? "Auto-deletes after " + d + " days" : "Kept until manually deleted") + "</span></div>";
      $("#retBtn").addEventListener("click", function () {
        var btn = $("#retBtn"); btn.disabled = true;
        api("POST", "/api/settings", { retentionDays: $("#retDays").value })
          .then(function () { toast("Retention saved"); loadRetention(); })
          .catch(function (e) { toast(e.message, true); })
          .then(function () { btn.disabled = false; });
      });
    });
  }
  function loadSubs() {
    api("GET", "/api/submissions?status=" + (state.subStatus === "all" ? "" : state.subStatus)).then(function (j) {
      state.counts = j.counts; renderNav();
      var tabs = ["new", "reviewed", "archived", "all"].map(function (s) {
        var n = s === "all" ? j.counts.total : j.counts[s];
        return '<button class="sub-tab' + (s === state.subStatus ? " active" : "") + '" data-sub="' + s + '">' +
          s.charAt(0).toUpperCase() + s.slice(1) + " (" + (n || 0) + ")</button>";
      }).join("");
      var list = j.items.length ? j.items.map(subRow).join("") : '<div class="empty">No submissions here yet.</div>';
      $("#subArea").innerHTML = '<div class="sub-tabs">' + tabs + '</div><div class="sub-list">' + list + "</div>";
      Array.prototype.forEach.call(document.querySelectorAll("[data-sub]"), function (b) {
        b.addEventListener("click", function () { state.subStatus = b.getAttribute("data-sub"); loadSubs(); });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-open]"), function (b) {
        b.addEventListener("click", function () { openSub(b.getAttribute("data-open")); });
      });
    });
  }
  function fmtDate(ts) { try { return new Date(ts * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  function subRow(s) {
    return '<button class="sub-item" data-open="' + s.id + '">' +
      '<div><div class="sub-item__name">' + esc(s.patient_name || "(no name)") + "</div>" +
      '<div class="sub-item__meta">' + esc(s.patient_email || "") + " · " + fmtDate(s.created_at) + "</div></div>" +
      '<span class="sub-item__spacer"></span><span class="pill-status ' + s.status + '">' + s.status + "</span></button>";
  }
  function openSub(id) {
    api("GET", "/api/submissions/" + id).then(function (j) {
      var s = j.submission, schema = j.schema, d = s.data || {};
      var groups = schema.map(function (sec) {
        var rows = sec.fields.filter(function (f) { return f.type !== "note"; }).map(function (f) {
          var v = d[f.name];
          if (Array.isArray(v)) v = v.join(", ");
          if (f.type === "consent") v = d[f.name] ? "Yes" : "—";
          if (v == null || v === "") v = "—";
          return "<dt>" + esc(f.label || f.name) + "</dt><dd>" + esc(v) + "</dd>";
        }).join("");
        return "<h3>" + esc(sec.title) + "</h3><dl>" + rows + "</dl>";
      }).join("");
      $("#main").innerHTML =
        '<div class="detail">' +
        '<button class="btn btn--ghost btn--sm detail__back" id="backBtn">← Back to list</button>' +
        '<div class="page-head"><h1>' + esc(s.patient_name || "Submission") + '</h1><p>Received ' + fmtDate(s.created_at) + " · status: " + esc(s.status) + "</p></div>" +
        '<div style="margin-bottom:1.2rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">' +
        '<button class="btn btn--sm" data-st="reviewed">Mark reviewed</button>' +
        '<button class="btn btn--ghost btn--sm" data-st="archived">Archive</button>' +
        '<button class="btn btn--ghost btn--sm" data-st="new">Mark new</button>' +
        '<button class="btn btn--danger btn--sm" id="delSub" style="margin-left:auto">Delete permanently</button></div>' +
        '<div class="card">' + groups + "</div></div>";
      $("#backBtn").addEventListener("click", renderSubmissions);
      Array.prototype.forEach.call(document.querySelectorAll("[data-st]"), function (b) {
        b.addEventListener("click", function () {
          api("PATCH", "/api/submissions/" + id, { status: b.getAttribute("data-st") })
            .then(function () { toast("Updated"); renderSubmissions(); });
        });
      });
      $("#delSub").addEventListener("click", function () {
        if (!window.confirm("Permanently delete this patient's submission? This can't be undone.")) return;
        api("DELETE", "/api/submissions/" + id)
          .then(function () { toast("Submission deleted"); renderSubmissions(); })
          .catch(function (e) { toast(e.message, true); });
      });
    });
  }

  /* ---------------- access log ---------------- */
  function renderAccessLog() {
    $("#main").innerHTML =
      '<div class="page-head"><h1>Access log</h1><p>A record of who viewed, exported, or deleted patient intake information — your privacy audit trail. Most recent first.</p></div>' +
      '<div id="logArea">Loading…</div>';
    api("GET", "/api/access-log").then(function (j) {
      if (!j.log || !j.log.length) { $("#logArea").innerHTML = '<div class="empty">No access recorded yet.</div>'; return; }
      var rows = j.log.map(function (e) {
        var ref = e.detail ? esc(e.detail) : (e.submission_id ? "#" + e.submission_id : "");
        return '<div class="sub-item"><div><div class="sub-item__name">' + esc(e.admin_email || "unknown") +
          ' <span style="font-weight:400;color:var(--muted)">' + esc(e.action) + '</span> ' +
          (ref ? '<span>' + ref + "</span>" : "") + "</div>" +
          '<div class="sub-item__meta">' + fmtDate(e.created_at) + "</div></div></div>";
      }).join("");
      $("#logArea").innerHTML = '<div class="sub-list">' + rows + "</div>";
    });
  }

  /* ---------------- staff logins ---------------- */
  function renderStaff() {
    $("#main").innerHTML =
      '<div class="page-head"><h1>Staff logins</h1><p>People who can sign in here to edit the website and view patient intake. Everyone listed has full access.</p></div>' +
      '<div id="staffArea">Loading…</div>';
    loadStaff();
  }
  function loadStaff() {
    api("GET", "/api/admins").then(function (j) {
      var rows = j.admins.map(function (a) {
        var isMe = a.email === j.me;
        var canRemove = !isMe && j.admins.length > 1;
        return '<div class="sub-item"><div><div class="sub-item__name">' + esc(a.email) +
          (isMe ? ' <span class="pill-status reviewed">you</span>' : "") + "</div>" +
          '<div class="sub-item__meta">Added ' + fmtDate(a.created_at) + "</div></div>" +
          '<span class="sub-item__spacer"></span>' +
          '<button class="btn btn--ghost btn--sm" data-reset-admin="' + a.id + '" data-email="' + esc(a.email) + '" style="margin-right:.5rem">Reset password</button>' +
          (canRemove ? '<button class="btn btn--danger btn--sm" data-del-admin="' + a.id + '">Remove</button>' : "") +
          "</div>";
      }).join("");
      $("#staffArea").innerHTML =
        '<div class="sub-list" style="margin-bottom:1.6rem">' + rows + "</div>" +
        '<div class="card" style="max-width:480px"><h3 style="color:var(--cedar);font-size:1.15rem;margin-bottom:1rem">Add a staff login</h3><div class="fields">' +
        '<div class="f"><label>Email</label><input type="email" id="naEmail" autocomplete="off" /></div>' +
        '<div class="f"><label>Temporary password</label><input type="text" id="naPass" autocomplete="off" /><div class="help">At least 8 characters. Share it with them — they can change it later in Account.</div></div>' +
        '</div><div style="margin-top:1.1rem"><button class="btn" id="naBtn">Add login</button></div></div>';
      Array.prototype.forEach.call(document.querySelectorAll("[data-del-admin]"), function (b) {
        b.addEventListener("click", function () {
          if (!window.confirm("Remove this login? They will no longer be able to sign in.")) return;
          api("DELETE", "/api/admins/" + b.getAttribute("data-del-admin"))
            .then(function () { toast("Login removed"); loadStaff(); })
            .catch(function (e) { toast(e.message, true); });
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll("[data-reset-admin]"), function (b) {
        b.addEventListener("click", function () {
          var email = b.getAttribute("data-email");
          var pw = window.prompt("Set a new temporary password for " + email + " (at least 8 characters). Share it with them — they can change it under Account.");
          if (pw === null) return;
          if (pw.length < 8) { toast("Password must be at least 8 characters.", true); return; }
          api("POST", "/api/admins/" + b.getAttribute("data-reset-admin") + "/password", { password: pw })
            .then(function () { toast("Password reset for " + email); })
            .catch(function (e) { toast(e.message, true); });
        });
      });
      $("#naBtn").addEventListener("click", function () {
        var btn = $("#naBtn"); btn.disabled = true;
        api("POST", "/api/admins", { email: $("#naEmail").value, password: $("#naPass").value })
          .then(function () { toast("Login added"); loadStaff(); })
          .catch(function (e) { toast(e.message, true); })
          .then(function () { btn.disabled = false; });
      });
    });
  }

  /* ---------------- account ---------------- */
  function renderAccount() {
    $("#main").innerHTML =
      '<div class="page-head"><h1>Account</h1><p>Signed in as ' + esc(state.user.email) + ".</p></div>" +
      '<div class="card" style="max-width:460px"><div class="fields">' +
      '<div class="f"><label>Current password</label><input type="password" id="pwCur" /></div>' +
      '<div class="f"><label>New password</label><input type="password" id="pwNew" /><div class="help">At least 8 characters.</div></div>' +
      '<div class="f"><label>Confirm new password</label><input type="password" id="pwNew2" /></div>' +
      '</div><div style="margin-top:1.1rem"><button class="btn" id="pwBtn">Change password</button></div></div>';
    $("#pwBtn").addEventListener("click", function () {
      var cur = $("#pwCur").value, n1 = $("#pwNew").value, n2 = $("#pwNew2").value;
      if (n1 !== n2) return toast("New passwords don't match.", true);
      var btn = $("#pwBtn"); btn.disabled = true;
      api("POST", "/api/account/password", { current: cur, next: n1 })
        .then(function () { toast("Password changed"); $("#pwCur").value = $("#pwNew").value = $("#pwNew2").value = ""; })
        .catch(function (e) { toast(e.message, true); })
        .then(function () { btn.disabled = false; });
    });
  }

  init();
})();
