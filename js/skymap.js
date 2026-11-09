/* ========================================================================
   skymap.js — Mesin peta langit
   - Proyeksi stereografik (az/alt) untuk pengamatan dari lokasi tertentu
   - Bintang dari katalog nyata, warna sesuai suhu (indeks B-V)
   - Garis & nama rasi, horizon + mata angin, pita Bima Sakti
   - Planet (Merkurius..Saturnus), presesi untuk time travel
   - Interaksi: geser untuk memutar, scroll untuk zoom, klik bintang
   - Animasi garis rasi "tergambar" dari titik bintang
   ======================================================================== */
(function (global) {
  "use strict";
  const A = global.ZD.astro;

  // Matriks rotasi galaktik -> ekuator J2000
  const GAL = [
    [-0.0548755604, -0.8734370902, -0.4838350155],
    [0.4941094279, -0.4448296300, 0.7469822445],
    [-0.8676661490, -0.1980763734, 0.4559837762]
  ];
  function galToEq(l, b) {
    const lr = l * A.D2R, br = b * A.D2R;
    const x = Math.cos(br) * Math.cos(lr), y = Math.cos(br) * Math.sin(lr), z = Math.sin(br);
    const X = GAL[0][0] * x + GAL[0][1] * y + GAL[0][2] * z;
    const Y = GAL[1][0] * x + GAL[1][1] * y + GAL[1][2] * z;
    const Z = GAL[2][0] * x + GAL[2][1] * y + GAL[2][2] * z;
    return { ra: A.norm360(Math.atan2(Y, X) * A.R2D), dec: Math.asin(Math.max(-1, Math.min(1, Z))) * A.R2D };
  }

  const CONST_NAME = global.ZD_CONST_NAMES || {};
  const CONST_ID = global.ZD_CONST_ID || {};
  const NAMED = global.ZD_NAMED_STARS || [];
  const STARS = global.ZD_STARS || [];
  const LINES = global.ZD_LINES || {};

  function constLabel(id) {
    return CONST_ID[id] || (CONST_NAME[id] && CONST_NAME[id].en) || id;
  }

  class SkyMap {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({
        lat: -5.1477, lon: 119.4327, date: new Date(),
        centerAz: 180, centerAlt: 42, zoom: 100,
        showLines: true, showNames: true, showHorizon: true, showMW: true,
        showPlanets: true, showStarNames: true,
        precessionYears: 0,
        highlight: null, // id rasi yang disorot
        highlightProgress: 0,
        onStarClick: null
      }, opts || {});
      this.W = 0; this.H = 0; this.DPR = Math.min(global.devicePixelRatio || 1, 2);
      this.dirty = true;
      this._t = 0; this._lst = 0; this._eps = 23.44;
      this._drag = null;
      this._bindEvents();
      this.resize();
    }

    set(state) {
      Object.assign(this.opts, state);
      this.dirty = true;
    }

    resize() {
      const c = this.canvas;
      this.W = c.clientWidth || 640;
      this.H = c.clientHeight || 400;
      c.width = Math.floor(this.W * this.DPR);
      c.height = Math.floor(this.H * this.DPR);
      this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
      this.dirty = true;
    }

    _bindEvents() {
      const c = this.canvas;
      c.addEventListener("pointerdown", (e) => {
        this._drag = { x: e.clientX, y: e.clientY, moved: 0 };
        c.setPointerCapture(e.pointerId);
      });
      c.addEventListener("pointermove", (e) => {
        if (!this._drag) return;
        const dx = e.clientX - this._drag.x, dy = e.clientY - this._drag.y;
        this._drag.x = e.clientX; this._drag.y = e.clientY;
        this._drag.moved += Math.abs(dx) + Math.abs(dy);
        const k = 0.28 * (100 / this.opts.zoom);
        this.opts.centerAz = A.norm360(this.opts.centerAz - dx * k);
        this.opts.centerAlt = Math.max(2, Math.min(90, this.opts.centerAlt + dy * k));
        this.dirty = true;
      });
      c.addEventListener("pointerup", (e) => {
        if (this._drag && this._drag.moved < 6) this._handleClick(e);
        this._drag = null;
        try { c.releasePointerCapture(e.pointerId); } catch (_) { }
      });
      c.addEventListener("pointercancel", () => { this._drag = null; });
      c.addEventListener("wheel", (e) => {
        e.preventDefault();
        this.opts.zoom = Math.max(40, Math.min(340, this.opts.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
        this.dirty = true;
        if (this.onZoom) this.onZoom(this.opts.zoom);
      }, { passive: false });
    }

    _handleClick(e) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best = null, bestD = 900;
      for (const p of (this._lastPoints || [])) {
        const d = (p.x - mx) ** 2 + (p.y - my) ** 2;
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best && this.opts.onStarClick) this.opts.onStarClick(best);
    }

    // ---- proyeksi ----
    _makeProjector() {
      const { centerAz, centerAlt, zoom } = this.opts;
      const R = Math.min(this.W, this.H) / 2;
      this.scale = (R * (zoom / 100)) / 2.55;
      this.cx = this.W / 2;
      this.cy = this.H / 2;
      const a0 = centerAlt * A.D2R, z0 = centerAz * A.D2R;
      const sinA0 = Math.sin(a0), cosA0 = Math.cos(a0);
      this.proj = (az, alt) => {
        const a = alt * A.D2R, z = az * A.D2R;
        const d = z - z0;
        const cosc = sinA0 * Math.sin(a) + cosA0 * Math.cos(a) * Math.cos(d);
        if (cosc < -0.15) return null; // di belakang
        const k = 2 / (1 + cosc);
        const X = k * Math.cos(a) * Math.sin(d);
        const Y = k * (cosA0 * Math.sin(a) - sinA0 * Math.cos(a) * Math.cos(d));
        return { x: this.cx + this.scale * X, y: this.cy - this.scale * Y };
      };
    }

    _applyPrecession(ra, dec) {
      if (!this.opts.precessionYears) return { ra, dec };
      return A.precess(ra, dec, this.opts.precessionYears, this._eps);
    }

    render() {
      const ctx = this.ctx;
      const { lat, lon, date } = this.opts;
      this._eps = A.obliquity(date);
      const lst = A.lstDeg(date, lon);
      this._lst = lst;
      this._makeProjector();
      ctx.clearRect(0, 0, this.W, this.H);

      // latar gradasi langit
      const bg = ctx.createRadialGradient(this.cx, this.cy * 0.85, 10, this.cx, this.cy, Math.max(this.W, this.H) * 0.8);
      bg.addColorStop(0, "rgba(14,22,58,0.95)");
      bg.addColorStop(0.55, "rgba(8,12,34,0.95)");
      bg.addColorStop(1, "rgba(3,4,12,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, this.W, this.H);

      if (this.opts.showMW) this._drawMilkyWay();

      const pts = [];
      // ---- bintang ----
      for (let i = 0; i < STARS.length; i++) {
        const s = STARS[i];
        let ra = s[0], dec = s[1];
        if (this.opts.precessionYears) { const p = this._applyPrecession(ra, dec); ra = p.ra; dec = p.dec; }
        const aa = A.altAz(ra, dec, lat, lst);
        if (aa.alt < -1) continue;
        const q = this.proj(aa.az, aa.alt);
        if (!q) continue;
        if (q.x < -20 || q.x > this.W + 20 || q.y < -20 || q.y > this.H + 20) continue;
        const mag = s[2];
        const rad = Math.max(0.5, (6.2 - mag) * 0.62) * (0.85 + this.opts.zoom / 260);
        const tw = 0.82 + 0.18 * Math.sin(this._t * 1.6 + i);
        const [r, g, b] = A.starColor(s[3]);
        const alpha = Math.min(1, 0.35 + (6.0 - mag) / 6) * tw;
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + alpha.toFixed(3) + ")";
        ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill();
        if (mag < 2.2) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (alpha * 0.16).toFixed(3) + ")";
          ctx.arc(q.x, q.y, rad * 3.4, 0, Math.PI * 2); ctx.fill();
        }
        pts.push({ x: q.x, y: q.y, mag, ra: s[0], dec: s[1] });
      }
      this._lastPoints = pts;

      // ---- planet ----
      if (this.opts.showPlanets) this._drawPlanets(lst);

      // ---- garis rasi ----
      if (this.opts.showLines) this._drawConstellationLines(lst);

      // ---- nama rasi ----
      if (this.opts.showNames) this._drawConstellationNames(lst);

      // ---- nama bintang terang ----
      if (this.opts.showStarNames) this._drawStarNames(lst);

      // ---- horizon + mata angin ----
      if (this.opts.showHorizon) this._drawHorizon();

      this._drawCompassBadge(lst);
    }

    _drawMilkyWay() {
      const ctx = this.ctx;
      const { lat } = this.opts;
      const lst = this._lst;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const path = [];
      for (let l = 0; l <= 360; l += 3) {
        const eq = galToEq(l, 0);
        const aa = A.altAz(eq.ra, eq.dec, lat, lst);
        const q = this.proj(aa.az, aa.alt);
        if (aa.alt < -2 || !q) { path.push(null); continue; }
        path.push(q);
      }
      // gambar segmen dengan blur
      ctx.filter = "blur(10px)";
      ctx.strokeStyle = "rgba(150,170,255,0.22)";
      ctx.lineWidth = Math.min(this.W, this.H) * 0.085;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      let seg = [];
      const flush = () => {
        if (seg.length > 1) {
          ctx.beginPath();
          ctx.moveTo(seg[0].x, seg[0].y);
          for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
          ctx.stroke();
        }
        seg = [];
      };
      for (const p of path) { if (p) seg.push(p); else flush(); }
      flush();
      ctx.filter = "none";
      ctx.restore();
    }

    _drawConstellationLines(lst) {
      const ctx = this.ctx;
      const { lat } = this.opts;
      const hl = this.opts.highlight;
      const hlProgress = this.opts.highlightProgress || 0;
      for (const id in LINES) {
        const segs = LINES[id];
        const isHL = hl === id;
        if (hl && !isHL) {
          ctx.strokeStyle = "rgba(120,150,220,0.10)";
          ctx.lineWidth = 0.8;
        } else if (isHL) {
          ctx.strokeStyle = "rgba(255,212,121,0.95)";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "rgba(255,212,121,0.8)";
          ctx.shadowBlur = 10;
        } else {
          ctx.strokeStyle = "rgba(140,170,255,0.32)";
          ctx.lineWidth = 0.9;
        }
        // hitung total panjang untuk animasi
        let total = 0; const projSegs = [];
        for (const seg of segs) {
          const ps = [];
          for (const [ra0, dec0] of seg) {
            let ra = ra0, dec = dec0;
            if (this.opts.precessionYears) { const p = this._applyPrecession(ra, dec); ra = p.ra; dec = p.dec; }
            const aa = A.altAz(ra, dec, lat, lst);
            const q = aa.alt < -1 ? null : this.proj(aa.az, aa.alt);
            ps.push(q);
            if (q && ps.length > 1 && ps[ps.length - 2]) {
              const a = ps[ps.length - 2];
              total += Math.hypot(q.x - a.x, q.y - a.y);
            }
          }
          projSegs.push(ps);
        }
        const drawLen = isHL ? total * hlProgress : Infinity;
        let acc = 0;
        for (const ps of projSegs) {
          ctx.beginPath();
          let pen = false;
          for (let i = 0; i < ps.length; i++) {
            const q = ps[i];
            if (!q) { pen = false; continue; }
            if (!pen) { ctx.moveTo(q.x, q.y); pen = true; continue; }
            const prev = ps[i - 1];
            const d = prev ? Math.hypot(q.x - prev.x, q.y - prev.y) : 0;
            if (acc + d <= drawLen) {
              ctx.lineTo(q.x, q.y); acc += d;
            } else {
              const t = d > 0 ? (drawLen - acc) / d : 0;
              if (prev) ctx.lineTo(prev.x + (q.x - prev.x) * t, prev.y + (q.y - prev.y) * t);
              acc = drawLen;
            }
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
      // gambar titik simpul bintang pada rasi yang disorot
      if (hl && LINES[hl] && hlProgress > 0.98) {
        ctx.fillStyle = "rgba(255,235,180,0.95)";
        for (const seg of LINES[hl]) for (const [ra0, dec0] of seg) {
          let ra = ra0, dec = dec0;
          if (this.opts.precessionYears) { const p = this._applyPrecession(ra, dec); ra = p.ra; dec = p.dec; }
          const aa = A.altAz(ra, dec, lat, lst);
          if (aa.alt < -1) continue;
          const q = this.proj(aa.az, aa.alt); if (!q) continue;
          ctx.beginPath(); ctx.arc(q.x, q.y, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    _drawConstellationNames(lst) {
      const ctx = this.ctx;
      const { lat } = this.opts;
      ctx.font = "600 12px Outfit, sans-serif";
      ctx.textAlign = "center";
      for (const id in LINES) {
        const segs = LINES[id];
        let sx = 0, sy = 0, n = 0;
        for (const seg of segs) {
          for (const [ra0, dec0] of seg) {
            let ra = ra0, dec = dec0;
            if (this.opts.precessionYears) { const p = this._applyPrecession(ra, dec); ra = p.ra; dec = p.dec; }
            const aa = A.altAz(ra, dec, lat, lst);
            if (aa.alt < 8) continue;
            const q = this.proj(aa.az, aa.alt); if (!q) continue;
            sx += q.x; sy += q.y; n++;
          }
        }
        if (n < 3) continue;
        const x = sx / n, y = sy / n;
        if (x < 0 || x > this.W || y < 0 || y > this.H) continue;
        const isHL = this.opts.highlight === id;
        ctx.fillStyle = isHL ? "rgba(255,212,121,0.95)" : "rgba(150,180,255,0.55)";
        ctx.font = isHL ? "700 14px Outfit, sans-serif" : "600 12px Outfit, sans-serif";
        ctx.fillText(constLabel(id), x, y);
      }
    }

    _drawStarNames(lst) {
      const ctx = this.ctx;
      const { lat } = this.opts;
      ctx.textAlign = "left";
      for (const s of NAMED) {
        if (s.mag > 1.7 && this.opts.zoom < 150) continue;
        let ra = s.ra, dec = s.dec;
        if (this.opts.precessionYears) { const p = this._applyPrecession(ra, dec); ra = p.ra; dec = p.dec; }
        const aa = A.altAz(ra, dec, lat, lst);
        if (aa.alt < 5) continue;
        const q = this.proj(aa.az, aa.alt); if (!q) continue;
        if (q.x < 0 || q.x > this.W || q.y < 0 || q.y > this.H) continue;
        ctx.fillStyle = "rgba(200,225,255,0.75)";
        ctx.font = "500 10.5px Inter, sans-serif";
        ctx.fillText(s.n, q.x + 6, q.y + 3);
      }
    }

    _drawPlanets(lst) {
      const ctx = this.ctx;
      const { lat, date } = this.opts;
      const colors = { Merkurius: "#cbb9a0", Venus: "#fff3cf", Mars: "#ff8256", Jupiter: "#ffd9a0", Saturnus: "#ffe9b0" };
      let planets;
      try { planets = A.allPlanets(date); } catch (_) { return; }
      for (const p of planets) {
        const aa = A.altAz(p.ra, p.dec, lat, lst);
        if (aa.alt < 0) continue;
        const q = this.proj(aa.az, aa.alt); if (!q) continue;
        if (q.x < 0 || q.x > this.W || q.y < 0 || q.y > this.H) continue;
        const col = colors[p.name] || "#fff";
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.shadowColor = col; ctx.shadowBlur = 12;
        ctx.arc(q.x, q.y, 3.1, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "600 10px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(p.name, q.x + 7, q.y + 3);
      }
    }

    _drawHorizon() {
      const ctx = this.ctx;
      const pts = [];
      for (let a = 0; a <= 360; a += 2) {
        const q = this.proj(a, 0);
        pts.push(q);
      }
      ctx.save();
      ctx.setLineDash([6, 7]);
      ctx.strokeStyle = "rgba(120,220,255,0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); let pen = false;
      for (const q of pts) { if (!q) { pen = false; continue; } if (!pen) { ctx.moveTo(q.x, q.y); pen = true; } else ctx.lineTo(q.x, q.y); }
      ctx.stroke();
      ctx.restore();

      const dirs = [["U", 0], ["T", 90], ["S", 180], ["B", 270]];
      ctx.font = "700 15px Outfit, sans-serif";
      ctx.textAlign = "center";
      for (const [label, az] of dirs) {
        const q = this.proj(az, 0);
        if (!q) continue;
        const dx = q.x - this.cx, dy = q.y - this.cy;
        const len = Math.hypot(dx, dy) || 1;
        const x = q.x + (dx / len) * 16, y = q.y + (dy / len) * 16;
        if (x < 0 || x > this.W || y < 0 || y > this.H) continue;
        ctx.fillStyle = "rgba(160,235,255,0.95)";
        ctx.fillText(label, x, y + 5);
      }
    }

    _drawCompassBadge(lst) {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = "500 11px Inter, sans-serif";
      ctx.fillStyle = "rgba(180,200,255,0.7)";
      ctx.textAlign = "right";
      const lstH = lst / 15;
      ctx.fillText("Waktu Sideris Lokal: " + A.fmtHMS(lstH), this.W - 12, this.H - 12);
      ctx.restore();
    }

    loop(ts) {
      this._t = (ts || 0) / 1000;
      if (this.opts.highlight && this.opts.highlightProgress < 1) {
        this.opts.highlightProgress = Math.min(1, this.opts.highlightProgress + 0.012);
      }
      this.render();
    }
  }

  global.ZD.SkyMap = SkyMap;
  global.ZD.constLabel = constLabel;
})(window);
