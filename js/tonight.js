/* ========================================================================
   tonight.js — Menu "Langit Malam Ini"
   Ringkasan langit malam ini: fase Bulan, waktu gelap astronomis,
   rasi bintang menonjol, planet terlihat, dan objek menarik.
   ======================================================================== */
(function (global) {
  "use strict";
  const A = global.ZD.astro;
  const LINES = global.ZD_LINES || {};
  const CONST_NAME = global.ZD_CONST_NAMES || {};

  // Beberapa objek langit terkenal (Messiér / NGC): [ra, dec, nama, jenis]
  const DSO = [
    [83.822, -5.391, "Nebula Orion (M42)", "Nebula"],
    [56.75, 24.117, "Gugus Pleiades (M45)", "Gugus terbuka"],
    [10.685, 41.269, "Galaksi Andromeda (M31)", "Galaksi"],
    [270.9, -24.383, "Nebula Laguna (M8)", "Nebula"],
    [268.45, -34.792, "Gugus Ptolemy (M7)", "Gugus terbuka"],
    [250.423, 36.46, "Gugus Hercules (M13)", "Gugus bola"],
    [130.1, 19.667, "Gugus Sarang Lebah (M44)", "Gugus terbuka"],
    [279.1, -23.905, "Nebula Trifid (M20)", "Nebula"],
    [283.766, -26.227, "Nebula Omega (M17)", "Nebula"],
    [332.826, 36.46, "Gugus Bola M15", "Gugus bola"],
    [18.346, 3.545, "Nebula Helix (NGC 7293)", "Nebula planeter"],
    [259.28, 18.01, "Gugus Bola M12", "Gugus bola"]
  ];

  const DIRS = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"];
  function dirName(az) { return DIRS[Math.round(A.norm360(az) / 45) % 8]; }

  function centroid(id) {
    const segs = LINES[id] || [];
    let vx = 0, vy = 0, vz = 0, n = 0;
    for (const seg of segs) for (const [ra, dec] of seg) {
      const r = ra * A.D2R, d = dec * A.D2R;
      vx += Math.cos(d) * Math.cos(r); vy += Math.cos(d) * Math.sin(r); vz += Math.sin(d); n++;
    }
    if (!n) return null;
    return { ra: A.norm360(Math.atan2(vy, vx) * A.R2D), dec: Math.atan2(vz, Math.hypot(vx, vy)) * A.R2D };
  }

  const ID_NAMES = global.ZD_CONST_ID || {};
  function nameOf(id) { return ID_NAMES[id] || (CONST_NAME[id] && CONST_NAME[id].en) || id; }

  let map = null, started = false;

  function nightRef() {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d;
  }

  function compute() {
    const lat = parseFloat(document.getElementById("nightLat").value);
    const lon = parseFloat(document.getElementById("nightLon").value);
    const ref = nightRef();
    const lst = A.lstDeg(ref, lon);

    // ---- Bulan ----
    const mp = A.moonPhase(ref);
    const moon = A.moonPos(ref);
    const moonAA = A.altAz(moon.ra, moon.dec, lat, lst);

    // ---- Matahari ----
    const noon = new Date(ref); noon.setHours(12, 0, 0, 0);
    const set = A.findSunCross(noon, lat, lon, -0.833, +1);
    const rise = A.findSunCross(noon, lat, lon, -0.833, -1);
    const darkStart = A.findSunCross(noon, lat, lon, -18, +1);
    const darkEnd = A.findSunCross(noon, lat, lon, -18, -1);

    // ---- Rasi menonjol (alt > 25°) ----
    const up = [];
    for (const id in LINES) {
      const c = centroid(id); if (!c) continue;
      const aa = A.altAz(c.ra, c.dec, lat, lst);
      if (aa.alt > 25) up.push({ id, alt: aa.alt, az: aa.az });
    }
    up.sort((a, b) => b.alt - a.alt);
    const top = up.slice(0, 10);
    const zodiacUp = up.filter((u) => ["Ari", "Tau", "Gem", "Cnc", "Leo", "Vir", "Lib", "Sco", "Sgr", "Cap", "Aqr", "Psc", "Oph"].includes(u.id)).slice(0, 6);

    // ---- Planet ----
    let planets = [];
    try { planets = A.allPlanets(ref).filter((p) => A.altAz(p.ra, p.dec, lat, lst).alt > 0)
      .map((p) => ({ ...p, aa: A.altAz(p.ra, p.dec, lat, lst) }))
      .sort((a, b) => b.aa.alt - a.aa.alt); } catch (_) { }

    // ---- Objek menarik ----
    const dso = [];
    for (const [ra, dec, name, type] of DSO) {
      const aa = A.altAz(ra, dec, lat, lst);
      if (aa.alt > 20) dso.push({ name, type, alt: aa.alt, az: aa.az });
    }
    dso.sort((a, b) => b.alt - a.alt);

    render({ ref, lat, lon, lst, mp, moonAA, set, rise, darkStart, darkEnd, top, zodiacUp, planets, dso });
    if (map) map.set({ lat, lon, date: ref, centerAz: 180, centerAlt: 45, zoom: 92 });
  }

  function card(title, body, icon) {
    return `<div class="night-card"><h3>${icon || "✦"} ${title}</h3>${body}</div>`;
  }

  function fmtTime(d) { return d ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"; }

  function render(d) {
    const grid = document.getElementById("tonightGrid");
    const moonPct = Math.round(d.mp.illum * 100);
    const moonVis = d.moonAA.alt > 0;

    const listItems = (arr) => arr.map((u) => `<li><span>${nameOf(u.id)}</span><span class="alt">${u.alt.toFixed(0)}° · ${dirName(u.az)}</span></li>`).join("");

    grid.innerHTML = [
      card("Waktu & Lokasi",
        `<p class="big">${d.ref.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
         <p class="muted small">Pukul 21:00 waktu lokal · ${A.fmtDeg(d.lat, "lat")} , ${A.fmtDeg(d.lon)}</p>
         <p class="muted small">Waktu Sideris Lokal: <strong>${A.fmtHMS(d.lst / 15)}</strong></p>`, "🕘"),

      card("Fase Bulan",
        `<div style="display:flex;align-items:center;gap:16px">
           <div class="moon-dot" style="box-shadow: inset ${(-22 + 44 * Math.cos(d.mp.elong * A.D2R)).toFixed(0)}px 0 0 #06080f, 0 0 20px rgba(200,220,255,0.4)"></div>
           <div><p class="big">${moonPct}%</p><p class="muted small">${d.mp.name}</p></div>
         </div>
         <p class="muted small" style="margin-top:10px">Posisi Bulan pukul 21:00: ${moonVis ? d.moonAA.alt.toFixed(0) + "° di " + dirName(d.moonAA.az) : "di bawah horizon"}</p>`, "🌙"),

      card("Gelap Sepenuhnya",
        `<ul class="night-list">
           <li><span>Matahari terbenam</span><span class="alt">${fmtTime(d.set)}</span></li>
           <li><span>Senja astronomis berakhir</span><span class="alt">${fmtTime(d.darkStart)}</span></li>
           <li><span>Langit mulai terang</span><span class="alt">${fmtTime(d.darkEnd)}</span></li>
           <li><span>Matahari terbit</span><span class="alt">${fmtTime(d.rise)}</span></li>
         </ul>
         <p class="muted small" style="margin-top:8px">Waktu terbaik mengamati: setelah senja astronomis hingga sebelum langit mulai terang.</p>`, "🌌"),

      card("Rasi Menonjol Malam Ini",
        d.top.length ? `<ul class="night-list">${listItems(d.top.slice(0, 6))}</ul>` : `<p class="muted small">Rendah di horizon.</p>`, "✨"),

      card("Rasi Zodiak Terlihat",
        d.zodiacUp.length ? `<ul class="night-list">${listItems(d.zodiacUp)}</ul>` : `<p class="muted small">Tidak ada rasi zodiak yang cukup tinggi saat ini.</p>`, "♈"),

      card("Planet Terlihat",
        d.planets.length
          ? `<ul class="night-list">${d.planets.map((p) => `<li><span>${p.name}</span><span class="alt">${p.aa.alt.toFixed(0)}° · ${dirName(p.aa.az)}</span></li>`).join("")}</ul>
             <p class="muted small" style="margin-top:8px">Planet bersinar mantap (tidak berkelip) berbeda dari bintang.</p>`
          : `<p class="muted small">Tidak ada planet terang di atas horizon pukul 21:00 malam ini.</p>`, "🪐"),

      card("Objek Langit Menarik",
        d.dso.length
          ? `<div>${d.dso.slice(0, 6).map((o) => `<span class="dso-tag">${o.name} · ${o.alt.toFixed(0)}°</span>`).join("")}</div>
             <p class="muted small" style="margin-top:10px">Sebagian besar butuh teropong/teleskop, kecuali Pleiades, Andromeda, dan Nebula Orion yang bisa terlihat mata telanjang di langit gelap.</p>`
          : `<p class="muted small">Belum ada objek menarik yang tinggi saat ini.</p>`, "🔭"),

      card("Peta Langit Sekarang",
        `<div class="map-wrap" style="margin-top:0"><canvas id="tonightCanvas"></canvas>
          <div class="map-hint">Geser untuk memutar · zoom dengan scroll</div></div>`, "🗺️"),

      card("Tips Mengamati",
        `<ul class="night-list">
           <li><span>Hindari cahaya kota</span><span class="alt">cari tempat gelap</span></li>
           <li><span>Beri mata 20 menit</span><span class="alt">adaptasi gelap</span></li>
           <li><span>Gunakan cahaya merah</span><span class="alt">jaga penglihatan</span></li>
           <li><span>Cek peta langit</span><span class="alt">menu Peta Langit</span></li>
         </ul>`, "💡")
    ].join("");

    const cv = document.getElementById("tonightCanvas");
    if (!map) map = new global.ZD.SkyMap(cv, { showStarNames: false });
    else map.canvas = cv, map.ctx = cv.getContext("2d"), map.dirty = true;
    map.resize();
    map.set({ lat: d.lat, lon: d.lon, date: d.ref, centerAz: 180, centerAlt: 45, zoom: 92 });
    if (!started) { started = true; loop(); }
  }

  function loop(ts) {
    const cv = document.getElementById("tonightCanvas");
    if (cv && cv.clientWidth && map) { map._t = (ts || 0) / 1000; map.render(); }
    requestAnimationFrame(loop);
  }

  function useGeo() {
    if (!navigator.geolocation) { alert("Browser tidak mendukung deteksi lokasi."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById("nightLat").value = pos.coords.latitude.toFixed(4);
        document.getElementById("nightLon").value = pos.coords.longitude.toFixed(4);
        document.getElementById("nightPlace").textContent = "Lokasi terdeteksi";
        compute();
      },
      () => { document.getElementById("nightPlace").textContent = "Izin lokasi ditolak — pakai koordinat manual"; },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function init() {
    document.getElementById("nightGeoBtn").addEventListener("click", useGeo);
    document.getElementById("nightLat").addEventListener("input", compute);
    document.getElementById("nightLon").addEventListener("input", compute);
    compute();
  }

  function onShow() { if (map) { const cv = document.getElementById("tonightCanvas"); if (cv) { map.canvas = cv; map.ctx = cv.getContext("2d"); map.resize(); } compute(); } }

  global.ZD = global.ZD || {};
  global.ZD.tonight = { init, compute, onShow };
})(window);
