/* ========================================================================
   starfield.js — Latar belakang langit bergerak:
   titik bintang berkelip, parallax mengikuti kursor, bintang jatuh (meteor),
   dan pita Bima Sakti samar.
   ======================================================================== */
(function (global) {
  "use strict";

  function initStarfield() {
    const canvas = document.getElementById("bg-stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, DPR = Math.min(global.devicePixelRatio || 1, 2);
    let stars = [], meteors = [];
    let mouseX = 0.5, mouseY = 0.5, tx = 0.5, ty = 0.5;
    let lastMeteor = 0;
    const reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      W = canvas.clientWidth || global.innerWidth;
      H = canvas.clientHeight || global.innerHeight;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildStars();
    }

    function buildStars() {
      const count = Math.round((W * H) / 5200);
      stars = [];
      for (let i = 0; i < count; i++) {
        const depth = Math.random();
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.3 + Math.random() * (depth > 0.85 ? 1.5 : 0.9),
          base: 0.25 + Math.random() * 0.75,
          tw: 0.5 + Math.random() * 2.2,
          ph: Math.random() * Math.PI * 2,
          depth: 0.25 + depth * 0.75,
          tint: pickTint()
        });
      }
    }

    function pickTint() {
      const r = Math.random();
      if (r > 0.92) return [180, 205, 255];
      if (r > 0.82) return [255, 226, 190];
      if (r > 0.74) return [200, 220, 255];
      return [235, 240, 255];
    }

    function spawnMeteor() {
      const fromLeft = Math.random() > 0.5;
      const speed = 0.45 + Math.random() * 0.5;
      meteors.push({
        x: fromLeft ? -80 : W + 80,
        y: Math.random() * H * 0.55,
        vx: (fromLeft ? 1 : -1) * speed * 9,
        vy: speed * 3.4,
        life: 1, len: 90 + Math.random() * 130,
        w: 1 + Math.random() * 1.6
      });
    }

    let t0 = performance.now();
    function frame(now) {
      const dt = Math.min(50, now - t0) / 1000; t0 = now;
      tx += (mouseX - tx) * 0.04;
      ty += (mouseY - ty) * 0.04;
      ctx.clearRect(0, 0, W, H);

      // Pita Bima Sakti samar
      const g = ctx.createLinearGradient(0, H * 0.15, W, H * 0.85);
      g.addColorStop(0, "rgba(120,150,255,0)");
      g.addColorStop(0.45, "rgba(150,170,255,0.10)");
      g.addColorStop(0.5, "rgba(200,210,255,0.16)");
      g.addColorStop(0.55, "rgba(150,170,255,0.10)");
      g.addColorStop(1, "rgba(120,150,255,0)");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "blur(22px)";
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.05);
      ctx.bezierCurveTo(W * 0.4, H * 0.35, W * 0.6, H * 0.55, W, H * 0.95);
      ctx.lineTo(W, H * 1.05);
      ctx.bezierCurveTo(W * 0.6, H * 0.7, W * 0.4, H * 0.5, 0, H * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const time = now / 1000;
      for (const s of stars) {
        const px = s.x - (tx - 0.5) * 26 * s.depth;
        const py = s.y - (ty - 0.5) * 26 * s.depth;
        const tw = reduce ? 1 : (0.55 + 0.45 * Math.sin(time * s.tw + s.ph));
        const a = s.base * tw;
        const [r, gg, b] = s.tint;
        ctx.beginPath();
        ctx.fillStyle = "rgba(" + r + "," + gg + "," + b + "," + a.toFixed(3) + ")";
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.2) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(" + r + "," + gg + "," + b + "," + (a * 0.14).toFixed(3) + ")";
          ctx.arc(px, py, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Meteor
      if (!reduce && now - lastMeteor > 3600 && Math.random() < 0.02) { spawnMeteor(); lastMeteor = now; }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx; m.y += m.vy;
        m.life -= dt * 0.55;
        if (m.life <= 0 || m.x < -200 || m.x > W + 200 || m.y > H + 200) { meteors.splice(i, 1); continue; }
        const ang = Math.atan2(m.vy, m.vx);
        const x2 = m.x - Math.cos(ang) * m.len;
        const y2 = m.y - Math.sin(ang) * m.len;
        const grd = ctx.createLinearGradient(m.x, m.y, x2, y2);
        grd.addColorStop(0, "rgba(255,255,255," + (0.95 * m.life).toFixed(3) + ")");
        grd.addColorStop(0.3, "rgba(160,210,255," + (0.5 * m.life).toFixed(3) + ")");
        grd.addColorStop(1, "rgba(160,210,255,0)");
        ctx.strokeStyle = grd;
        ctx.lineWidth = m.w;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255," + m.life.toFixed(3) + ")";
        ctx.arc(m.x, m.y, m.w * 1.3, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    global.addEventListener("resize", resize);
    global.addEventListener("pointermove", (e) => {
      mouseX = e.clientX / global.innerWidth;
      mouseY = e.clientY / global.innerHeight;
    });
    resize();
    requestAnimationFrame(frame);
  }

  global.ZD = global.ZD || {};
  global.ZD.initStarfield = initStarfield;
  global.ZD.starfield = { initStarfield };
})(window);
