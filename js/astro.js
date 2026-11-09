/* ========================================================================
   astro.js — Perhitungan astronomi untuk AstroZodiak
   Semua sudut dalam derajat kecuali disebut lain.
   Metode: waktu sideris, konversi ekuator<->ekliptika, posisi Matahari,
   Bulan, planet (algoritma Keplerian ringkas), fase Bulan, dan presesi.
   ======================================================================== */
(function (global) {
  "use strict";

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const sin = (d) => Math.sin(d * D2R);
  const cos = (d) => Math.cos(d * D2R);
  const tan = (d) => Math.tan(d * D2R);
  const asin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) * R2D;
  const atan2 = (y, x) => Math.atan2(y, x) * R2D;
  const norm360 = (x) => ((x % 360) + 360) % 360;
  const norm180 = (x) => { x = norm360(x); return x > 180 ? x - 360 : x; };

  // ---------- Waktu ----------
  function julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }
  function daysSinceJ2000(date) { return julianDate(date) - 2451545.0; }

  function gmstDeg(date) {
    const jd = julianDate(date);
    const T = (jd - 2451545.0) / 36525;
    let g = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T - (T * T * T) / 38710000;
    return norm360(g);
  }
  function lstDeg(date, lon) { return norm360(gmstDeg(date) + lon); }

  // ---------- Obliquity ----------
  function obliquity(date) {
    const T = daysSinceJ2000(date) / 36525;
    return 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
  }

  // ---------- Konversi ----------
  function eqToEcl(ra, dec, eps) {
    const lon = norm360(atan2(sin(ra) * cos(eps) + tan(dec) * sin(eps), cos(ra)));
    const lat = asin(sin(dec) * cos(eps) - cos(dec) * sin(eps) * sin(ra));
    return { lon, lat };
  }
  function eclToEq(lon, lat, eps) {
    const ra = norm360(atan2(sin(lon) * cos(eps) - tan(lat) * sin(eps), cos(lon)));
    const dec = asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon));
    return { ra, dec };
  }

  // ---------- Presesi (pergeseran bujur ekliptika / general precession) ----------
  // Efek visual utama precession: titik musim semi bergeser ~0.01397 derajat/tahun.
  const PRECESSION_DEG_PER_YEAR = 0.0139693;
  function precess(ra, dec, years, eps) {
    if (!years) return { ra, dec };
    const e = eqToEcl(ra, dec, eps);
    const lon2 = norm360(e.lon + PRECESSION_DEG_PER_YEAR * years);
    return eclToEq(lon2, e.lat, eps);
  }

  // ---------- Posisi alt/az ----------
  function altAz(ra, dec, lat, lst) {
    const H = lst - ra; // sudut jam
    const alt = asin(sin(dec) * sin(lat) + cos(dec) * cos(lat) * cos(H));
    let az = atan2(-sin(H) * cos(dec), sin(dec) * cos(lat) - cos(dec) * sin(lat) * cos(H));
    az = norm360(az);
    return { alt, az };
  }

  // ---------- Matahari ----------
  function sunPos(date) {
    const d = daysSinceJ2000(date);
    const w = 282.9404 + 4.70935e-5 * d;
    const e = 0.016709 - 1.151e-9 * d;
    const M = norm360(356.0470 + 0.9856002585 * d);
    const E = M + R2D * e * sin(M) * (1 + e * cos(M));
    const xv = cos(E) - e;
    const yv = Math.sqrt(1 - e * e) * sin(E);
    const lon = norm360(atan2(yv, xv) + w);
    return { lon, lonPeri: w, e, M };
  }
  function sunEq(date) {
    const s = sunPos(date);
    const eps = obliquity(date);
    const R = 1.00014 - 0.01671 * cos(s.M) - 0.00014 * cos(2 * s.M);
    const { ra, dec } = eclToEq(s.lon, 0, eps);
    return { ra, dec, eclLon: s.lon, dist: R };
  }

  // ---------- Bulan (presisi rendah, cukup untuk tampilan) ----------
  function moonPos(date) {
    const d = daysSinceJ2000(date);
    const eps = obliquity(date);
    const L = norm360(218.316 + 13.176396 * d);   // bujur rata-rata
    const M = norm360(134.963 + 13.064993 * d);   // anomali rata-rata
    const F = norm360(93.272 + 13.229350 * d);    // argumen lintang
    const lon = norm360(L + 6.289 * sin(M));
    const lat = 5.128 * sin(F);
    const dist = 385001 - 20905 * cos(M);          // km
    const { ra, dec } = eclToEq(lon, lat, eps);
    return { ra, dec, eclLon: lon, dist };
  }

  // ---------- Fase Bulan ----------
  function moonPhase(date) {
    const d = daysSinceJ2000(date);
    const sunLon = sunPos(date).lon;
    const moonLon = moonPos(date).eclLon;
    let elong = norm360(moonLon - sunLon);          // 0 = bulan baru, 180 = purnama
    const phase = elong / 360;                       // 0..1
    const illum = (1 - cos(elong)) / 2;              // fraksi terang
    const names = ["Bulan Baru", "Sabit Muda", "Kuartal Pertama", "Cembung Awal",
      "Bulan Purnama", "Cembung Akhir", "Kuartal Akhir", "Sabit Tua"];
    const idx = Math.round(elong / 45) % 8;
    return { phase, illum, elong, name: names[idx] };
  }

  // ---------- Planet (algoritma Keplerian ringkas) ----------
  const PLANETS = {
    Merkurius: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.0e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
    Venus: { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
    Mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
    Jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001] },
    Saturnus: { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282] }
  };
  function sunGeom(date) {
    const d = daysSinceJ2000(date);
    const w = 282.9404 + 4.70935e-5 * d;
    const e = 0.016709 - 1.151e-9 * d;
    const M = norm360(356.0470 + 0.9856002585 * d);
    const E = M + R2D * e * sin(M) * (1 + e * cos(M));
    const xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E);
    const v = atan2(yv, xv), r = Math.sqrt(xv * xv + yv * yv);
    const lon = norm360(v + w);
    return { x: r * cos(lon), y: r * sin(lon), z: 0, lon, r };
  }
  function heliocentric(p, d) {
    const N = norm360(p.N[0] + p.N[1] * d);
    const i = p.i[0] + p.i[1] * d;
    const w = norm360(p.w[0] + p.w[1] * d);
    const a = p.a[0];
    const e = p.e[0] + p.e[1] * d;
    const M = norm360(p.M[0] + p.M[1] * d);
    let E = M + R2D * e * sin(M) * (1 + e * cos(M));
    for (let k = 0; k < 6; k++) { E = E - (E - R2D * e * sin(E) - M) / (1 - e * cos(E)); }
    const xv = a * (cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * sin(E);
    const v = atan2(yv, xv), r = Math.sqrt(xv * xv + yv * yv);
    const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
    const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
    const zh = r * (sin(v + w) * sin(i));
    return { x: xh, y: yh, z: zh, r, v, lon: v + w };
  }
  function planetGeocentric(name, date) {
    const d = daysSinceJ2000(date);
    const p = PLANETS[name];
    if (!p) return null;
    const h = heliocentric(p, d);
    const s = sunGeom(date);
    const xg = h.x + s.x, yg = h.y + s.y, zg = h.z + s.z;
    const lon = norm360(atan2(yg, xg));
    const lat = atan2(zg, Math.sqrt(xg * xg + yg * yg));
    const dist = Math.sqrt(xg * xg + yg * yg + zg * zg);
    const eps = obliquity(date);
    const { ra, dec } = eclToEq(lon, lat, eps);
    // elongasi dari Matahari
    const elong = Math.acos(Math.max(-1, Math.min(1, cos(lon - s.lon) * cos(lat)))) * R2D;
    return { ra, dec, eclLon: lon, dist, elong };
  }
  function allPlanets(date) {
    return Object.keys(PLANETS).map((name) => ({ name, ...planetGeocentric(name, date) }));
  }

  // ---------- Matahari terbit/terbenam & senja ----------
  function sunAltAt(date, lat, lon) {
    const s = sunEq(date);
    return altAz(s.ra, s.dec, lat, lstDeg(date, lon)).alt;
  }
  // cari waktu ketika alt Matahari melintasi altTarget (derajat) pada hari tsb
  function findSunCross(dateLocalNoon, lat, lon, altTarget, dir) {
    // dir=+1 terbit, -1 terbenam; cari dalam ±12 jam
    let t = dateLocalNoon.getTime();
    const step = 4 * 60000; // 4 menit
    const sign = (x) => Math.sign(x - altTarget);
    let prev = sunAltAt(new Date(t), lat, lon);
    for (let k = 1; k <= 180; k++) {
      const tt = t + dir * k * step;
      const cur = sunAltAt(new Date(tt), lat, lon);
      if (prev < altTarget && cur >= altTarget || prev >= altTarget && cur < altTarget) {
        // interpolasi linear
        const frac = (altTarget - prev) / (cur - prev);
        return new Date(tt - dir * step + dir * step * frac);
      }
      prev = cur;
    }
    return null;
  }

  // ---------- Warna bintang dari indeks warna (B-V) ----------
  function starColor(bv) {
    if (bv == null || isNaN(bv)) bv = 0.65;
    // perkirakan suhu dari B-V, lalu warna sRGB kasar
    const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
    let r, g, b;
    const k = t / 100;
    if (k < 66) { r = 255; g = 99.47 * Math.log(k) - 161.12; b = k <= 19 ? 0 : 138.52 * Math.log(k - 10) - 305.04; }
    else { r = 329.7 * Math.pow(k - 60, -0.1332); g = 288.12 * Math.pow(k - 60, -0.0755); b = 255; }
    const cl = (x) => Math.max(0, Math.min(255, Math.round(x)));
    return [cl(r), cl(g), cl(b)];
  }

  function fmtHMS(h) { // jam desimal -> "HH:MM"
    h = ((h % 24) + 24) % 24;
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return String(mm === 60 ? hh + 1 : hh).padStart(2, "0") + ":" + String(mm === 60 ? 0 : mm).padStart(2, "0");
  }
  function fmtDeg(d, kind) {
    const s = d < 0 ? "-" : "+";
    const a = Math.abs(d);
    const deg = Math.floor(a);
    const min = Math.round((a - deg) * 60);
    if (kind === "lat") return s + deg + "° " + (min === 60 ? 0 : min) + "'";
    return deg + "° " + (min === 60 ? 0 : min) + "'";
  }

  global.ZD = global.ZD || {};
  global.ZD.astro = {
    D2R, R2D, sin, cos, tan, asin, atan2, norm360, norm180,
    julianDate, daysSinceJ2000, gmstDeg, lstDeg, obliquity,
    eqToEcl, eclToEq, precess, altAz,
    sunPos, sunEq, moonPos, moonPhase,
    allPlanets, planetGeocentric,
    sunAltAt, findSunCross,
    starColor, fmtHMS, fmtDeg
  };
})(window);
