/* Cedar Health — light progressive enhancement (site-wide) */
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

  // Safety net: never leave content hidden (covers no-scroll page captures and
  // any IntersectionObserver edge cases). Real scrolling still animates earlier.
  setTimeout(function () {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }, 1500);
})();
