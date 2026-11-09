/* ========================================================================
   main.js — Orkestrator: navigasi antar menu, efek visual, dan inisialisasi
   ======================================================================== */
(function (global) {
  "use strict";

  const VIEWS = ["beranda", "tanggal-lahir", "peta-langit", "time-travel", "langit-malam-ini", "star-hopping", "kuis", "galeri"];

  function currentFromHash() {
    const h = (location.hash || "#beranda").slice(1);
    return VIEWS.includes(h) ? h : "beranda";
  }

  function show(name, push) {
    VIEWS.forEach((v) => {
      const el = document.getElementById("view-" + v);
      if (el) el.hidden = v !== name;
    });
    document.querySelectorAll(".nav-link").forEach((a) =>
      a.classList.toggle("is-active", a.dataset.nav === name));
    document.getElementById("mainNav").classList.remove("open");
    document.getElementById("navToggle").setAttribute("aria-expanded", "false");
    if (push !== false) history.replaceState(null, "", "#" + name);

    // beri tahu modul agar menyesuaikan ukuran kanvas
    const hooks = {
      "peta-langit": () => global.ZD.skymapview && global.ZD.skymapview.onShow(),
      "time-travel": () => global.ZD.timetravel && global.ZD.timetravel.onShow(),
      "langit-malam-ini": () => global.ZD.tonight && global.ZD.tonight.onShow(),
      "star-hopping": () => global.ZD.starhopping && global.ZD.starhopping.onShow()
    };
    if (hooks[name]) requestAnimationFrame(() => hooks[name]());
    global.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initNav() {
    document.getElementById("navToggle").addEventListener("click", (e) => {
      const nav = document.getElementById("mainNav");
      const open = nav.classList.toggle("open");
      e.currentTarget.setAttribute("aria-expanded", String(open));
    });
    window.addEventListener("hashchange", () => show(currentFromHash(), false));
  }

  // Efek sorot kursor pada kartu fitur
  function initCardGlow() {
    document.querySelectorAll(".feature-card").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  // Animasi angka statistik di beranda
  function initStats() {
    const targets = [
      { el: document.getElementById("statStars"), to: 2851, dur: 1600 },
      { el: document.getElementById("statConst"), to: 88, dur: 1200 }
    ];
    targets.forEach((t) => {
      if (!t.el) return;
      const start = performance.now();
      function step(now) {
        const k = Math.min(1, (now - start) / t.dur);
        const e = 1 - Math.pow(1 - k, 3);
        t.el.textContent = Math.round(t.to * e).toLocaleString("id-ID");
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // Ilustrasi rasi Ursa Major di beranda (animasi menggambar)
  function initHero() {
    const canvas = document.getElementById("hero-constellation");
    if (!canvas || !global.ZD.birthsign) return;
    const view = global.ZD.birthsign.makeConstellationView(canvas);
    view.show("UMa");
    global.addEventListener("resize", () => view.resize());
  }

  function init() {
    initNav();
    initCardGlow();
    initStats();
    initHero();
    if (global.ZD.starfield) global.ZD.starfield.initStarfield();
    if (global.ZD.skymapview) global.ZD.skymapview.init();
    if (global.ZD.birthsign) global.ZD.birthsign.init();
    if (global.ZD.timetravel) global.ZD.timetravel.init();
    if (global.ZD.tonight) global.ZD.tonight.init();
    if (global.ZD.starhopping) global.ZD.starhopping.init();
    if (global.ZD.quiz) global.ZD.quiz.init();
    if (global.ZD.gallery) global.ZD.gallery.init();
    show(currentFromHash(), false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
