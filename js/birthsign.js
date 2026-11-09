/* ========================================================================
   birthsign.js — Cari rasi bintang dari tanggal lahir
   Menampilkan info ilmiah rasi zodiak + ilustrasi rasi yang "tergambar"
   dari titik bintang (animasi garis).
   ======================================================================== */
(function (global) {
  "use strict";
  const A = global.ZD.astro;
  const ZODIAC = global.ZD_ZODIAC || [];
  const STARS = global.ZD_STARS || [];
  const LINES = global.ZD_LINES || [];

  const GLYPH = { Ari: "♈", Tau: "♉", Gem: "♊", Cnc: "♋", Leo: "♌", Vir: "♍", Lib: "♎", Sco: "♏", Sgr: "♐", Cap: "♑", Aqr: "♒", Psc: "♓", Oph: "⛎" };

  // Rentang tanggal zodiak tropis (bulan 1-12, hari)
  const RANGES = [
    { id: "Cap", start: [12, 22], end: [1, 19] },
    { id: "Aqr", start: [1, 20], end: [2, 18] },
    { id: "Psc", start: [2, 19], end: [3, 20] },
    { id: "Ari", start: [3, 21], end: [4, 19] },
    { id: "Tau", start: [4, 20], end: [5, 20] },
    { id: "Gem", start: [5, 21], end: [6, 20] },
    { id: "Cnc", start: [6, 21], end: [7, 22] },
    { id: "Leo", start: [7, 23], end: [8, 22] },
    { id: "Vir", start: [8, 23], end: [9, 22] },
    { id: "Lib", start: [9, 23], end: [10, 22] },
    { id: "Sco", start: [10, 23], end: [11, 21] },
    { id: "Sgr", start: [11, 22], end: [12, 21] }
  ];

  function signFromDate(m, d) {
    for (const r of RANGES) {
      if (r.id === "Cap") {
        if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Cap";
        continue;
      }
      if ((m === r.start[0] && d >= r.start[1]) || (m === r.end[0] && d <= r.end[1])) return r.id;
    }
    return "Ari";
  }

  function zodiac(id) { return ZODIAC.find((z) => z.iau === id); }

  // ---- render ilustrasi rasi (proyeksi gnomonik pada bidang langit) ----
  function makeConstellationView(canvas) {
    const ctx = canvas.getContext("2d");
    let raf = null, progress = 0, target = null, t = 0;

    function resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function centroid(id) {
      const segs = LINES[id] || [];
      let sx = 0, sy = 0, n = 0;
      // rata-rata vektor untuk menangani pembungkusan RA
      let vx = 0, vy = 0, vz = 0;
      for (const seg of segs) for (const [ra, dec] of seg) {
        const r = ra * A.D2R, d = dec * A.D2R;
        vx += Math.cos(d) * Math.cos(r); vy += Math.cos(d) * Math.sin(r); vz += Math.sin(d); n++;
      }
      if (!n) return { ra: 0, dec: 0 };
      return { ra: A.norm360(Math.atan2(vy, vx) * A.R2D), dec: Math.atan2(vz, Math.hypot(vx, vy)) * A.R2D };
    }

    function draw() {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      if (!target) return;
      const info = centroid(target.id);
      const ra0 = info.ra * A.D2R, dec0 = info.dec * A.D2R;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H);
      // hitung skala dari sebaran bintang rasi agar pas
      const segs = LINES[target.id] || [];
      let maxd = 0;
      const proj = (ra, dec) => {
        const r = ra * A.D2R, d = dec * A.D2R;
        const cosc = Math.sin(dec0) * Math.sin(d) + Math.cos(dec0) * Math.cos(d) * Math.cos(r - ra0);
        if (cosc <= 0.05) return null;
        const X = Math.cos(d) * Math.sin(r - ra0) / cosc;
        const Y = (Math.cos(dec0) * Math.sin(d) - Math.sin(dec0) * Math.cos(d) * Math.cos(r - ra0)) / cosc;
        return { X, Y };
      };
      for (const seg of segs) for (const [ra, dec] of seg) {
        const p = proj(ra, dec); if (p) maxd = Math.max(maxd, Math.hypot(p.X, p.Y));
      }
      const scale = (R * 0.36) / Math.max(0.12, maxd);
      const toScreen = (p) => ({ x: cx + p.X * scale, y: cy - p.Y * scale });

      // bintang latar rasi ini
      const allPts = [];
      for (const seg of segs) for (const [ra, dec] of seg) allPts.push([ra, dec]);
      // bintang katalog di sekitar pusat
      const near = [];
      for (const s of STARS) {
        const p = proj(s[0], s[1]); if (!p) continue;
        if (Math.abs(p.X * scale) < W / 2 + 30 && Math.abs(p.Y * scale) < H / 2 + 30) near.push({ p, s });
      }
      for (const { p, s } of near) {
        const q = toScreen(p);
        const rad = Math.max(0.6, (6.2 - s[2]) * 0.5);
        const [r, g, b] = A.starColor(s[3]);
        const tw = 0.8 + 0.2 * Math.sin(t * 1.8 + s[0]);
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (0.35 + (6 - s[2]) / 8) * tw + ")";
        ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill();
      }

      // garis rasi dengan animasi menggambar
      let total = 0; const psegs = [];
      for (const seg of segs) {
        const arr = [];
        for (const [ra, dec] of seg) { const p = proj(ra, dec); arr.push(p); if (p && arr.length > 1 && arr[arr.length - 2]) { const a = arr[arr.length - 2]; total += Math.hypot(p.X - a.X, p.Y - a.Y); } }
        psegs.push(arr);
      }
      const drawLen = total * progress;
      let acc = 0;
      ctx.strokeStyle = "rgba(255,212,121,0.95)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "rgba(255,200,90,0.8)"; ctx.shadowBlur = 12;
      ctx.lineCap = "round";
      for (const arr of psegs) {
        ctx.beginPath(); let pen = false;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          if (!p) { pen = false; continue; }
          if (!pen) { ctx.moveTo(toScreen(p).x, toScreen(p).y); pen = true; continue; }
          const prev = arr[i - 1];
          const a = toScreen(prev), b = toScreen(p);
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          if (acc + d <= drawLen) { ctx.lineTo(b.x, b.y); acc += d; }
          else {
            const tt = d > 0 ? (drawLen - acc) / d : 0;
            ctx.lineTo(a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt);
            acc = drawLen;
          }
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // titik simpul bintang rasi
      if (progress > 0.9) {
        const alpha = (progress - 0.9) / 0.1;
        ctx.fillStyle = "rgba(255,240,190," + alpha + ")";
        for (const arr of psegs) for (const p of arr) { if (!p) continue; const q = toScreen(p); ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, Math.PI * 2); ctx.fill(); }
      }

      // label
      ctx.textAlign = "center";
      ctx.font = "700 13px Outfit, sans-serif";
      ctx.fillStyle = "rgba(255,212,121," + (0.4 + 0.6 * progress) + ")";
      ctx.fillText(global.ZD.constLabel(target.id), cx, H - 14);
    }

    function loop(ts) {
      t = (ts || 0) / 1000;
      if (progress < 1) progress = Math.min(1, progress + 0.014);
      draw();
      raf = requestAnimationFrame(loop);
    }

    return {
      show(id) { target = { id }; progress = 0; resize(); if (!raf) raf = requestAnimationFrame(loop); },
      stop() { if (raf) cancelAnimationFrame(raf); raf = null; },
      resize
    };
  }

  // ---- UI ----
  let view = null;

  function init() {
    const birthDate = document.getElementById("birthDate");
    const daySel = document.getElementById("birthDay");
    const monthSel = document.getElementById("birthMonth");
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    for (let i = 1; i <= 31; i++) daySel.insertAdjacentHTML("beforeend", '<option value="' + i + '">' + i + "</option>");
    months.forEach((m, i) => monthSel.insertAdjacentHTML("beforeend", '<option value="' + (i + 1) + '">' + m + "</option>"));

    document.getElementById("findSignBtn").addEventListener("click", () => {
      if (!birthDate.value) { birthDate.focus(); return; }
      const d = new Date(birthDate.value + "T00:00:00");
      showResult(d.getMonth() + 1, d.getDate());
    });
    document.getElementById("findSignBtn2").addEventListener("click", () => {
      showResult(parseInt(monthSel.value, 10), parseInt(daySel.value, 10));
    });

    // default: isi hari ini
    const now = new Date();
    birthDate.value = now.toISOString().slice(0, 10);
    daySel.value = now.getDate();
    monthSel.value = now.getMonth() + 1;
  }

  function showResult(m, d) {
    const id = signFromDate(m, d);
    const z = zodiac(id);
    if (!z) return;
    const box = document.getElementById("signResult");
    box.hidden = false;
    box.innerHTML = `
      <div class="sign-card">
        <div class="sign-head">
          <span class="sign-glyph">${GLYPH[id] || "✦"}</span>
          <div>
            <h3>${z.sign} · ${z.indo}</h3>
            <div class="sign-dates">${z.dates}</div>
          </div>
        </div>
        <p class="muted small">Rasi: ${z.lat} (${z.iau}) · Paling baik diamati: ${z.bestView}</p>
        <div class="sign-facts">
          <div class="fact"><span>Bintang tercerang</span><strong>${z.brightest.n}</strong><small class="muted">${z.brightest.d} · magnitudo ${z.brightest.mag.toFixed(2)}</small></div>
          <div class="fact"><span>Jarak bintang itu</span><strong>± ${z.brightest.ly} tahun cahaya</strong><small class="muted">1 tahun cahaya ≈ 9,46 triliun km</small></div>
          <div class="fact"><span>Luas area</span><strong>${z.area} derajat²</strong><small class="muted">peringkat ${z.rank} dari 88 rasi</small></div>
          <div class="fact"><span>Bintang utama</span><strong>${z.mainStars} bintang</strong><small class="muted">pola inti rasi</small></div>
        </div>
        <div class="sign-block">
          <h4>◆ Sains di balik rasi</h4>
          <p>${z.science}</p>
        </div>
        <div class="sign-block">
          <h4>◆ Mitologi</h4>
          <p>${z.myth}</p>
        </div>
        <div class="sign-block">
          <h4>◆ Objek menarik di sekitar rasi</h4>
          <ul>${z.objects.map((o) => "<li>" + o + "</li>").join("")}</ul>
        </div>
        <div class="sign-block fun-fact"><strong>✦ Fakta unik:</strong> ${z.funFact}</div>
        <div class="sign-block">
          <h4>◆ Tanggal &amp; astronomi</h4>
          <p class="muted small">Tanggal di atas memakai zodiak tropis (astrologi). Secara astronomis, Matahari sebenarnya melintasi 13 rasi — Ophiuchus juga termasuk! Delta sekitar 1 hari terjadi karena presesi poros Bumi selama ribuan tahun.</p>
        </div>
      </div>
      <div class="sign-visual">
        <div class="sign-map-wrap">
          <canvas id="signCanvas"></canvas>
          <div class="sign-map-cap">Ilustrasi pola bintang · garis tergambar otomatis</div>
        </div>
        <div class="panel small muted">
          <strong style="color:var(--gold)">Cara membaca:</strong> titik-titik terang adalah bintang asli pada posisinya di langit.
          Garis emas menghubungkan bintang-bintang pembentuk pola rasi. Kecerahan titik mewakili magnitudo bintang.
        </div>
      </div>`;

    if (view) view.stop();
    view = makeConstellationView(document.getElementById("signCanvas"));
    view.show(id);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  global.ZD = global.ZD || {};
  global.ZD.birthsign = { init, signFromDate, makeConstellationView };
})(window);
