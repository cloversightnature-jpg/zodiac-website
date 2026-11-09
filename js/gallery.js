/* ========================================================================
   gallery.js — Galeri Foto Pengguna
   Foto unggahan pengguna disimpan lokal di browser (localStorage),
   dilengkapi koleksi contoh bertema astrofotografi.
   ======================================================================== */
(function (global) {
  "use strict";

  const KEY = "az_gallery_v1";
  const IMG = "https://coresg-normal.trae.ai/api/ide/v1/tool_text_to_image?image_size=landscape_4_3&prompt=";

  const SAMPLES = [
    { src: IMG + encodeURIComponent("Milky Way galaxy arching over mountain silhouette at night, long exposure astrophotography, deep blue purple nebula sky, thousands of stars, ultra detailed, photorealistic"), caption: "Bima Sakti di atas pegunungan", by: "Koleksi contoh" },
    { src: IMG + encodeURIComponent("Orion constellation in the night sky, astrophotography, Betelgeuse and Rigel stars, faint nebula glow, deep space, photorealistic"), caption: "Rasi Orion sang Pemburu", by: "Koleksi contoh" },
    { src: IMG + encodeURIComponent("Full moon close-up with detailed craters, dark night sky astrophotography, sharp detail, photorealistic"), caption: "Purnama & kawahnya", by: "Koleksi contoh" },
    { src: IMG + encodeURIComponent("Circular star trails rotating around Polaris, long exposure night sky photography, dark blue tones, photorealistic"), caption: "Jejak bintang mengelilingi Polaris", by: "Koleksi contoh" },
    { src: IMG + encodeURIComponent("Andromeda galaxy M31 photographed through a telescope, spiral galaxy astrophotography, dark space background, photorealistic"), caption: "Galaksi Andromeda (M31)", by: "Koleksi contoh" },
    { src: IMG + encodeURIComponent("Bright meteor shooting star over desert night sky with the Milky Way, astrophotography, photorealistic"), caption: "Meteor melintas di langit gurun", by: "Koleksi contoh" }
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (_) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (_) { alert("Penyimpanan browser penuh. Hapus beberapa foto dulu."); return false; }
  }

  function render() {
    const grid = document.getElementById("galleryGrid");
    const mine = load();
    grid.innerHTML = "";
    if (!mine.length) {
      grid.insertAdjacentHTML("beforeend", '<div class="gal-empty">Belum ada foto unggahanmu. Koleksi contoh di bawah ini bisa jadi inspirasi.</div>');
    }
    mine.forEach((p) => {
      const el = document.createElement("div");
      el.className = "gal-item";
      el.innerHTML = `<img src="${p.src}" alt="${(p.caption || "Foto langit").replace(/"/g, "")}" loading="lazy" />
        <button class="gal-del" title="Hapus">✕</button>
        <div class="gal-cap">${p.caption || "Tanpa keterangan"}<br><span class="muted small">Foto kamu · ${p.date || ""}</span></div>`;
      el.querySelector(".gal-del").addEventListener("click", () => {
        const list = load().filter((x) => x.id !== p.id);
        save(list); render();
      });
      grid.appendChild(el);
    });
    SAMPLES.forEach((s) => {
      const el = document.createElement("div");
      el.className = "gal-item";
      el.innerHTML = `<img src="${s.src}" alt="${s.caption}" loading="lazy" />
        <div class="gal-cap">${s.caption}<br><span class="muted small">${s.by}</span></div>`;
      grid.appendChild(el);
    });
  }

  function downscale(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1280;
          let w = img.width, h = img.height;
          if (Math.max(w, h) > MAX) { const k = MAX / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const cx = c.getContext("2d");
          cx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(files) {
    const caption = (document.getElementById("photoCaption").value || "").trim();
    const list = load();
    const stamp = new Date().toLocaleDateString("id-ID");
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const src = await downscale(f);
        list.unshift({ id: "p" + Date.now() + Math.random().toString(36).slice(2, 7), src, caption, date: stamp });
      } catch (_) { /* abaikan berkas yang gagal */ }
    }
    if (save(list)) { document.getElementById("photoCaption").value = ""; render(); }
  }

  function init() {
    const input = document.getElementById("photoInput");
    const drop = document.querySelector(".upload-drop");
    input.addEventListener("change", () => { handleFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });
    document.getElementById("clearGallery").addEventListener("click", () => {
      if (confirm("Hapus semua foto unggahanmu? Tindakan ini tidak bisa dibatalkan.")) { localStorage.removeItem(KEY); render(); }
    });
    render();
  }

  global.ZD = global.ZD || {};
  global.ZD.gallery = { init };
})(window);
