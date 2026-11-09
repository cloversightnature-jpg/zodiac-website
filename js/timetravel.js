/* ========================================================================
   timetravel.js — Perjalanan waktu pada langit
   Menampilkan bagaimana langit berubah akibat rotasi, revolusi, dan
   presesi poros Bumi (geseran posisi bintang ~1,4° per abad).
   ======================================================================== */
(function (global) {
  "use strict";
  const A = global.ZD.astro;

  let map = null, baseDate = new Date(), years = 0, started = false;

  function fmtLocal(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function targetDate() {
    const d = new Date(baseDate.getTime());
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  function update() {
    if (!map) return;
    const dt = targetDate();
    map.set({
      lat: parseFloat(document.getElementById("ttLat").value),
      lon: parseFloat(document.getElementById("ttLon").value),
      date: dt,
      precessionYears: years,
      showPlanets: Math.abs(years) < 300,
      showStarNames: true
    });
    // label tahun & catatan
    const yl = document.getElementById("ttYearsLabel");
    yl.textContent = years >= 0 ? "+" + years + " tahun" : years + " tahun";
    const note = document.getElementById("ttNote");
    const y = dt.getFullYear();
    if (years === 0) {
      note.innerHTML = "Sedang menampilkan waktu seperti yang kamu pilih. Geser slider untuk melihat efek rotasi (jam), revolusi (musim), dan presesi (abad).";
    } else {
      note.innerHTML = `Tahun <strong>${y}</strong> (${years > 0 ? "masa depan" : "masa lalu"}). Karena presesi poros Bumi, posisi bintang bergeser ± ${(Math.abs(years) * 0.01397).toFixed(1)}° dari posisinya sekarang — Polaris tidak selalu menjadi bintang utara!`;
    }
    document.getElementById("ttDatetime").value = fmtLocal(baseDate);
    updateHud(dt);
  }

  function updateHud(dt) {
    const hud = document.getElementById("ttHud");
    const lat = parseFloat(document.getElementById("ttLat").value);
    const lon = parseFloat(document.getElementById("ttLon").value);
    const lst = A.lstDeg(dt, lon);
    const s = A.sunEq(dt);
    const sunAA = A.altAz(s.ra, s.dec, lat, lst);
    hud.innerHTML = `
      <div><strong>${dt.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}</strong></div>
      <div>Posisi: ${A.fmtDeg(lat, "lat")} , ${A.fmtDeg(lon)} · Zona lokal</div>
      <div>Waktu Sideris Lokal (LST): ${A.fmtHMS(lst / 15)}</div>
      <div>Ketinggian Matahari: ${sunAA.alt.toFixed(0)}° ${sunAA.alt < -18 ? "(malam astronomis gelap)" : sunAA.alt < 0 ? "(malam)" : sunAA.alt < 6 ? "(senja)" : "(siang)"}</div>`;
  }

  function setPreset(key) {
    const now = new Date();
    baseDate = key === "now" ? now : new Date(baseDate.getTime());
    years = 0;
    const d = new Date(baseDate.getTime());
    switch (key) {
      case "+1h": d.setHours(d.getHours() + 1); break;
      case "+6h": d.setHours(d.getHours() + 6); break;
      case "+1d": d.setDate(d.getDate() + 1); break;
      case "+1mo": d.setMonth(d.getMonth() + 1); break;
      case "+6mo": d.setMonth(d.getMonth() + 6); break;
      case "+1y": d.setFullYear(d.getFullYear() + 1); break;
      case "-100y": years = -100; break;
      case "+2000y": years = 2000; break;
    }
    if (key !== "-100y" && key !== "+2000y") baseDate = d;
    document.getElementById("ttDatetime").value = fmtLocal(baseDate);
    document.getElementById("ttYears").value = years;
    update();
  }

  function init() {
    const canvas = document.getElementById("ttCanvas");
    map = new global.ZD.SkyMap(canvas, { lat: -5.1477, lon: 119.4327, date: new Date(), centerAz: 180, centerAlt: 40, zoom: 95, showStarNames: false });
    baseDate = new Date();
    document.getElementById("ttDatetime").value = fmtLocal(baseDate);

    document.getElementById("ttDatetime").addEventListener("change", (e) => {
      baseDate = new Date(e.target.value || Date.now());
      document.getElementById("ttYears").value = years;
      update();
    });
    document.getElementById("ttLat").addEventListener("input", update);
    document.getElementById("ttLon").addEventListener("input", update);
    document.getElementById("ttYears").addEventListener("input", (e) => { years = parseInt(e.target.value, 10); update(); });
    document.querySelectorAll("[data-tt]").forEach((b) => b.addEventListener("click", () => setPreset(b.dataset.tt)));

    map.onZoom = () => { };

    function loop(ts) {
      if (canvas.clientWidth) { map._t = ts / 1000; map.render(); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    global.addEventListener("resize", () => map.resize());
    update();
  }

  function onShow() { if (map) { map.resize(); update(); } }

  global.ZD = global.ZD || {};
  global.ZD.timetravel = { init, onShow };
})(window);
