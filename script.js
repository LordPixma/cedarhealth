/* Cedar Health — light progressive enhancement */
(function () {
  "use strict";

  // current year in footer
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // header border once scrolled
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("is-stuck", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // scroll-reveal (respects reduced motion via CSS fallback)
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* -------------------------------------------------------
     Registration form.
     Default (no backend): opens the visitor's email client
     with the details pre-filled — works on a plain static
     deploy with zero setup.

     To capture submissions server-side instead, point this at
     a Cloudflare Pages Function (e.g. /api/register) or a form
     service, and replace the mailto block below with a fetch().
     ------------------------------------------------------- */
  var CLINIC_EMAIL = "hello@cedarhealth.example"; // <-- replace with the real inbox

  var form = document.getElementById("registerForm");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var phone = (data.get("phone") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var subject = "New patient registration — " + name;
      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Phone: " + phone + "\n\n" +
        (message ? "Notes:\n" + message + "\n" : "");

      window.location.href =
        "mailto:" + CLINIC_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
    });
  }
})();
