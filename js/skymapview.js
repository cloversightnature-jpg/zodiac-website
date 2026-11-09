/* ========================================================================
   skymapview.js — Pengendali menu "Peta Langit"
   ======================================================================== */
(function (global) {
  "use strict";
  const A = global.ZD.astro;
  const NAMED = global.ZD_NAMED_STARS || [];

  let map = null;

  function fmtDateTimeInput(d) {
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function hud() {
    const lat = parseFloat(document.getElementById("latInput").value);
    const lon = parseFloat(document.getElementById("lonInput").value);
    const dt = new Date(document.getElementById("mapTime").value || Date.now());
    const lst = A.lstDeg(dt, lon);
    const s = A.sunEq(dt);
    const sunAA = A.altAz(s.ra, s.dec, lat, lst);
    const sky = sunAA.alt < -18 ? "Malam gelap" : sunAA.alt < 0 ? "Malam" : sunAA.alt < 6 ? "Senja" : "Siang (bintang tak terlihat)";
    document.getElementById("mapHud").innerHTML =
      `<div><strong>${dt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</strong></div>
       <div>${A.fmtDeg(lat, "lat")} , ${A.fmtDeg(lon)} · LST ${A.fmtHMS(lst / 15)}</div>
       <div>Kondisi langit: ${sky}</div>
       <div class="muted small">Arah hadap: Az ${map.opts.centerAz.toFixed(0)}° · Ketinggian pusat ${map.opts.centerAlt.toFixed(0)}°</div>`;
  }

  function update() {
    if (!map) return;
    const lat = parseFloat(document.getElementById("latInput").value);
    const lon = parseFloat(document.getElementById("lonInput").value);
    let dt = new Date(document.getElementById("mapTime").value || Date.now());
    if (isNaN(dt.getTime())) dt = new Date();
    map.set({
      lat, lon, date: dt,
      showLines: document.getElementById("toggleLines").checked,
      showNames: document.getElementById("toggleNames").checked,
      showHorizon: document.getElementById("toggleHorizon").checked,
      showMW: document.getElementById("toggleMW").checked,
      zoom: parseFloat(document.getElementById("zoomRange").value)
    });
    hud();
  }

  function useGeo() {
    if (!navigator.geolocation) { alert("Browser tidak mendukung deteksi lokasi."); return; }
    const btn = document.getElementById("geoBtn");
    btn.textContent = "⏳ Mencari lokasi…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById("latInput").value = pos.coords.latitude.toFixed(4);
        document.getElementById("lonInput").value = pos.coords.longitude.toFixed(4);
        document.getElementById("mapTime").value = fmtDateTimeInput(new Date());
        btn.textContent = "📍 Lokasi terdeteksi";
        update();
        setTimeout(() => { btn.textContent = "📍 Gunakan Lokasiku"; }, 2500);
      },
      () => { btn.textContent = "📍 Gunakan Lokasiku"; alert("Tidak bisa mengambil lokasi. Aktifkan izin lokasi atau isi koordinat manual."); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function starClick(p) {
    // cari bintang bernama terdekat
    let best = null, bestD = 1e9;
    for (const s of NAMED) {
      const d = Math.hypot(((s.ra - p.ra + 540) % 360 - 180), s.dec - p.dec);
      if (d < bestD) { bestD = d; best = s; }
    }
    const hudEl = document.getElementById("mapHud");
    if (best && bestD < 0.6) {
      hudEl.insertAdjacentHTML("afterbegin",
        `<div style="color:var(--gold)">★ <strong>${best.n}</strong> (${best.id}) — mag ${best.mag.toFixed(2)}, RA ${A.fmtHMS(best.ra / 15)}, Dec ${A.fmtDeg(best.dec)}</div>`);
      setTimeout(hud, 6000);
    } else {
      hudEl.insertAdjacentHTML("afterbegin",
        `<div style="color:var(--cyan)">◦ Bintang tanpa nama (RA ${A.fmtHMS(p.ra / 15)}, Dec ${A.fmtDeg(p.dec)}, mag ${p.mag.toFixed(1)})</div>`);
      setTimeout(hud, 4000);
    }
  }

  function init() {
    const canvas = document.getElementById("skyCanvas");
    map = new global.ZD.SkyMap(canvas, {
      centerAz: 180, centerAlt: 42, zoom: 130, showStarNames: false,
      onStarClick: starClick
    });
    document.getElementById("mapTime").value = fmtDateTimeInput(new Date());

    document.getElementById("geoBtn").addEventListener("click", useGeo);
    document.getElementById("latInput").addEventListener("input", update);
    document.getElementById("lonInput").addEventListener("input", update);
    document.getElementById("mapTime").addEventListener("change", update);
    document.getElementById("mapNowBtn").addEventListener("click", () => {
      document.getElementById("mapTime").value = fmtDateTimeInput(new Date()); update();
    });
    document.getElementById("mapResetBtn").addEventListener("click", () => {
      map.set({ centerAz: 180, centerAlt: 42, zoom: 130 });
      document.getElementById("zoomRange").value = 130; hud();
    });
    ["toggleLines", "toggleNames", "toggleHorizon", "toggleMW"].forEach((id) =>
      document.getElementById(id).addEventListener("change", update));
    document.getElementById("zoomRange").addEventListener("input", (e) => { map.set({ zoom: parseFloat(e.target.value) }); hud(); });

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
  global.ZD.skymapview = { init, onShow };
})(window);
