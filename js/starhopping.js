/* ========================================================================
   starhopping.js — Metode star hopping langkah demi langkah
   Setiap rute menghubungkan bintang-bintang yang sudah dikenal untuk
   menemukan bintang/objek target. Dilengkapi ilustrasi langit yang
   menggambar jalur hop secara animasi.
   ======================================================================== */
(function (global) {
  "use strict";
  const A = global.ZD.astro;
  const NAMED = global.ZD_NAMED_STARS || [];
  const STARS = global.ZD_STARS || [];
  const LINES = global.ZD_LINES || [];

  function star(name) {
    const s = NAMED.find((x) => x.n === name);
    return s ? { n: s.n, ra: s.ra, dec: s.dec, mag: s.mag } : null;
  }
  const R = (arr) => arr.map(star).filter(Boolean);

  const ROUTES = [
    {
      id: "orion-sirius", title: "Sabuk Orion → Sirius",
      desc: "Menemukan bintang paling terang di langit.",
      steps: [
        { title: "Mulai dari Sabuk Orion",
          text: "Kenali tiga bintang sejajar di tengah Orion — inilah 'sabuk' pemburu: Mintaka, Alnilam, dan Alnitak. Hampir semua orang dapat mengenali pola ini.",
          path: R(["Mintaka", "Alnilam", "Alnitak"]) },
        { title: "Perpanjang garis sabuk",
          text: "Tarik garis lurus yang melewati sabuk dari kanan atas (Mintaka) menuju kiri bawah (Alnitak), lalu teruskan sejauh sekitar tiga kali panjang sabuk.",
          path: R(["Mintaka", "Alnilam", "Alnitak"]) },
        { title: "Tiba di Sirius",
          text: "Ujung perpanjangan itu adalah Sirius (α Canis Majoris), bintang paling terang di langit malam — magnitudo −1,46 dan berjarak hanya 8,6 tahun cahaya.",
          path: R(["Mintaka", "Alnilam", "Alnitak", "Sirius"]) }
      ]
    },
    {
      id: "bigdipper-polaris", title: "Gayung Besar → Polaris",
      desc: "Menemukan arah utara dari Ursa Major.",
      steps: [
        { title: "Kenali Gayung Besar",
          text: "Tujuh bintang terang Ursa Major membentuk gayung raksasa: Dubhe, Merak, Phecda, Megrez, Alioth, Mizar, dan Alkaid.",
          path: R(["Dubhe", "Merak", "Phecda", "Megrez", "Alioth", "Mizar", "Alkaid"]) },
        { title: "Perpanjang sisi mangkuk",
          text: "Ambil dua bintang di ujung mangkuk: Merak (bawah) dan Dubhe (atas). Tarik garis dari Merak melewati Dubhe dan teruskan sekitar lima kali jaraknya.",
          path: R(["Merak", "Dubhe", "Polaris"]) },
        { title: "Itulah Polaris",
          text: "Kamu tiba di Polaris (Bintang Utara), yang hampir tepat berada di atas kutub utara langit. Tingginya di langit sama dengan garis lintangmu — itulah sebabnya ia penunjuk arah utara.",
          path: R(["Merak", "Dubhe", "Polaris"]) }
      ]
    },
    {
      id: "arc-arcturus-spica", title: "Lengkung ke Arcturus & Spica",
      desc: "Rumus klasik: 'arc to Arcturus, speed on to Spica'.",
      steps: [
        { title: "Ikuti gagang gayung",
          text: "Mulai dari gagang Gayung Besar: Alioth, Mizar, dan Alkaid. Bentuklah lengkungan mengikuti ketiga bintang itu.",
          path: R(["Alioth", "Mizar", "Alkaid"]) },
        { title: "Lengkungkan ke Arcturus",
          text: "Teruskan lengkungan sejauh kira-kira panjang seluruh gayung. Kamu akan menemukan Arcturus (α Boötis), bintang jingga paling terang di belahan utara.",
          path: R(["Alioth", "Mizar", "Alkaid", "Arcturus"]) },
        { title: "Teruskan ke Spica",
          text: "Lanjutkan lengkungan dengan sudut yang sama ke arah selatan — di sanalah Spica (α Virginis), bintang biru-putih di rasi Virgo.",
          path: R(["Arcturus", "Spica"]) }
      ]
    },
    {
      id: "orion-aldebaran", title: "Sabuk Orion → Aldebaran → Pleiades",
      desc: "Menuju gugus bintang paling terkenal.",
      steps: [
        { title: "Mulai dari sabuk lagi",
          text: "Dari sabuk Orion, kali ini kita melangkah ke arah berlawanan dari Sirius — ke arah timur laut.",
          path: R(["Mintaka", "Alnilam", "Alnitak"]) },
        { title: "Menuju Aldebaran",
          text: "Tarik garis dari Alnitak melewati kepala Orion; kamu akan menemukan Aldebaran, mata jingga sang banteng (α Tauri).",
          path: R(["Alnitak", "Aldebaran"]) },
        { title: "Terus ke Pleiades",
          text: "Lanjutkan sepanjang sisi 'tanduk' Banteng sampai kamu melihat Gugus Pleiades (M45) — sekumpulan bintang yang tampak seperti kerumunan cahaya; bintang terangnya Alcyone.",
          path: R(["Aldebaran", "Alcyone"]) }
      ]
    },
    {
      id: "summer-triangle", title: "Segitiga Musim Panas",
      desc: "Tiga bintang terang yang membentuk segitiga raksasa.",
      steps: [
        { title: "Vega, Deneb, Altair",
          text: "Cari tiga bintang terang yang membentuk segitiga besar: Vega (Lyra) di puncak, Deneb (Cygnus) di sisi kiri, dan Altair (Aquila) di kanan.",
          path: R(["Vega", "Deneb", "Altair"]) },
        { title: "Bacaan berguna",
          text: "Segitiga ini menandai langit musim panas. Di antara Vega dan Altair terletak bintang ganda indah Albireo dan jalur Bima Sakti — bagus untuk dijelajahi dengan teropong.",
          path: R(["Vega", "Deneb", "Altair"]) }
      ]
    },
    {
      id: "cassiopeia-polaris", title: "Cassiopeia → Polaris",
      desc: "Cara lain menemukan arah utara.",
      steps: [
        { title: "Kenali Cassiopeia",
          text: "Cassiopeia berbentuk huruf W (atau M) di langit utara. Kelima bintangnya: Caph, Schedar, Gamma Cas, Ruchbah, dan Epsilon Cas.",
          path: R(["Caph", "Schedar", "Gamma Cas", "Ruchbah", "Epsilon Cas"]) },
        { title: "Arahkan ke Polaris",
          text: "Tarik garis dari bintang paling terang, Schedar, menuju ke arah utara — kamu akan bertemu Polaris. Cassiopeia dan Gayung Besar berada di sisi berlawanan Polaris.",
          path: R(["Schedar", "Polaris"]) }
      ]
    }
  ];

  let canvas, ctx, current = null, stepIdx = 0, prog = 0, t = 0;

  function routeStars(route) {
    const seen = {}, out = [];
    route.steps.forEach((s) => s.path.forEach((p) => { if (!seen[p.n]) { seen[p.n] = 1; out.push(p); } }));
    return out;
  }
  function center(route) {
    const pts = routeStars(route);
    let vx = 0, vy = 0, vz = 0;
    pts.forEach((p) => { const r = p.ra * A.D2R, d = p.dec * A.D2R;
      vx += Math.cos(d) * Math.cos(r); vy += Math.cos(d) * Math.sin(r); vz += Math.sin(d); });
    return { ra: A.norm360(Math.atan2(vy, vx) * A.R2D), dec: Math.atan2(vz, Math.hypot(vx, vy)) * A.R2D };
  }

  function draw() {
    if (!canvas || !current) return;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W) return;
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(W * dpr)) { canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const c = center(current);
    const ra0 = c.ra * A.D2R, dec0 = c.dec * A.D2R;
    const cx = W / 2, cy = H / 2;
    const proj = (ra, dec) => {
      const r = ra * A.D2R, d = dec * A.D2R;
      const cosc = Math.sin(dec0) * Math.sin(d) + Math.cos(dec0) * Math.cos(d) * Math.cos(r - ra0);
      if (cosc <= 0.02) return null;
      const X = Math.cos(d) * Math.sin(r - ra0) / cosc;
      const Y = (Math.cos(dec0) * Math.sin(d) - Math.sin(dec0) * Math.cos(d) * Math.cos(r - ra0)) / cosc;
      return { X, Y };
    };
    // skala agar semua bintang rute masuk
    let maxd = 0;
    routeStars(current).forEach((p) => { const q = proj(p.ra, p.dec); if (q) maxd = Math.max(maxd, Math.hypot(q.X, q.Y)); });
    const scale = (Math.min(W, H) * 0.36) / Math.max(0.15, maxd);
    const toS = (q) => ({ x: cx + q.X * scale, y: cy - q.Y * scale });

    // latar
    const bg = ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.max(W, H) * 0.75);
    bg.addColorStop(0, "rgba(12,18,48,0.9)"); bg.addColorStop(1, "rgba(3,4,12,1)");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // bintang katalog sekitar
    for (const s of STARS) {
      const q = proj(s[0], s[1]); if (!q) continue;
      const x = cx + q.X * scale, y = cy - q.Y * scale;
      if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
      const rad = Math.max(0.5, (6.2 - s[2]) * 0.5);
      const [r, g, b] = A.starColor(s[3]);
      const tw = 0.8 + 0.2 * Math.sin(t * 1.7 + s[0]);
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + ((0.3 + (6 - s[2]) / 9) * tw).toFixed(3) + ")";
      ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }

    // garis rasi samar sebagai konteks
    ctx.strokeStyle = "rgba(120,150,220,0.18)"; ctx.lineWidth = 0.9;
    for (const id in LINES) {
      for (const seg of LINES[id]) {
        ctx.beginPath(); let pen = false;
        for (const [ra, dec] of seg) { const q = proj(ra, dec); if (!q) { pen = false; continue; }
          const s = toS(q); if (!pen) { ctx.moveTo(s.x, s.y); pen = true; } else ctx.lineTo(s.x, s.y); }
        ctx.stroke();
      }
    }

    // ---- jalur hop animasi ----
    const path = current.steps[stepIdx].path;
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // garis dasar samar
    ctx.strokeStyle = "rgba(111,227,255,0.25)"; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
    ctx.beginPath(); let pen = false;
    path.forEach((p) => { const q = proj(p.ra, p.dec); if (!q) { pen = false; return; } const s = toS(q);
      if (!pen) { ctx.moveTo(s.x, s.y); pen = true; } else ctx.lineTo(s.x, s.y); });
    ctx.stroke();
    ctx.setLineDash([]);

    // garis tergambar sesuai progress
    const total = path.length - 1;
    ctx.strokeStyle = "rgba(111,227,255,0.95)";
    ctx.lineWidth = 2.6; ctx.shadowColor = "rgba(111,227,255,0.9)"; ctx.shadowBlur = 12;
    const drawn = prog * total;
    ctx.beginPath(); let pen2 = false; let head = null;
    for (let i = 1; i < path.length; i++) {
      if (drawn < i - 1) break;
      const a = toS(proj(path[i - 1].ra, path[i - 1].dec));
      const b = toS(proj(path[i].ra, path[i].dec));
      const f = Math.min(1, drawn - (i - 1));
      const bx = a.x + (b.x - a.x) * f, by = a.y + (b.y - a.y) * f;
      if (!pen2) { ctx.moveTo(a.x, a.y); pen2 = true; }
      ctx.lineTo(bx, by);
      head = { x: bx, y: by };
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (head && prog > 0.02 && prog < 1) {
      ctx.beginPath(); ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.arc(head.x, head.y, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // marker & label bintang
    ctx.textAlign = "center";
    path.forEach((p, i) => {
      const q = proj(p.ra, p.dec); if (!q) return;
      const s = toS(q);
      const isTarget = i === path.length - 1 && stepIdx === current.steps.length - 1;
      ctx.beginPath();
      ctx.fillStyle = isTarget ? "rgba(255,212,121,1)" : "rgba(180,220,255,1)";
      ctx.shadowColor = isTarget ? "rgba(255,212,121,0.9)" : "rgba(140,200,255,0.8)";
      ctx.shadowBlur = 14;
      ctx.arc(s.x, s.y, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = "600 12px Outfit, sans-serif";
      ctx.fillStyle = "rgba(230,240,255,0.95)";
      ctx.fillText(p.n, s.x, s.y - 12);
    });
  }

  function loop(ts) {
    t = (ts || 0) / 1000;
    if (prog < 1) prog = Math.min(1, prog + 0.02);
    if (canvas && canvas.clientWidth) draw();
    requestAnimationFrame(loop);
  }

  function renderList() {
    const box = document.getElementById("hopList");
    box.innerHTML = "<h3>Pilih rute</h3>" + ROUTES.map((r, i) =>
      `<button class="hop-item${i === 0 ? " is-active" : ""}" data-i="${i}"><strong>${r.title}</strong><span>${r.desc}</span></button>`
    ).join("");
    box.querySelectorAll(".hop-item").forEach((b) => b.addEventListener("click", () => {
      box.querySelectorAll(".hop-item").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      selectRoute(parseInt(b.dataset.i, 10));
    }));
  }

  function selectRoute(i) {
    current = ROUTES[i]; stepIdx = 0;
    renderStep();
  }

  function renderStep() {
    if (!current) return;
    const s = current.steps[stepIdx];
    prog = 0;
    document.getElementById("hopStepTitle").textContent = s.title;
    document.getElementById("hopStepText").textContent = s.text;
    document.getElementById("hopCounter").textContent = (stepIdx + 1) + " / " + current.steps.length;
    document.getElementById("hopBar").style.width = ((stepIdx + 1) / current.steps.length * 100) + "%";
    document.getElementById("hopPrev").disabled = stepIdx === 0;
    document.getElementById("hopNext").disabled = stepIdx === current.steps.length - 1;
    document.getElementById("hopHud").innerHTML =
      `<div><strong>${current.title}</strong></div><div class="muted small">${s.path.map((p) => p.n).join(" → ")}</div>`;
    document.getElementById("hopNext").textContent = stepIdx === current.steps.length - 1 ? "Selesai ✓" : "Berikutnya →";
  }

  function init() {
    canvas = document.getElementById("hopCanvas");
    ctx = canvas.getContext("2d");
    renderList();
    selectRoute(0);
    document.getElementById("hopPrev").addEventListener("click", () => { if (stepIdx > 0) { stepIdx--; renderStep(); } });
    document.getElementById("hopNext").addEventListener("click", () => { if (stepIdx < current.steps.length - 1) { stepIdx++; renderStep(); } });
    requestAnimationFrame(loop);
  }

  function onShow() { draw(); }

  global.ZD = global.ZD || {};
  global.ZD.starhopping = { init, onShow };
})(window);
