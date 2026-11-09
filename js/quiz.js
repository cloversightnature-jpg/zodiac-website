/* ========================================================================
   quiz.js — Kuis Astronomi
   ======================================================================== */
(function (global) {
  "use strict";

  const BANK = [
    { q: "Bintang apa yang paling terang di langit malam?", o: ["Sirius", "Polaris", "Betelgeuse", "Vega"], a: 0, e: "Sirius (α Canis Majoris) bermagnitudo −1,46 — paling terang, berjarak 8,6 tahun cahaya." },
    { q: "Berapa luas area rasi Virgo dibanding rasi lain?", o: ["Terkecil", "Terbesar kedua dari 88 rasi", "Sedang saja", "Terbesar"], a: 1, e: "Virgo adalah rasi terbesar kedua di langit (1.294 derajat persegi). Yang terbesar adalah Hydra." },
    { q: "Apa nama bintang paling terang di rasi Taurus?", o: ["Antares", "Aldebaran", "Regulus", "Spica"], a: 1, e: "Aldebaran (α Tau) adalah raksasa oranye, 'mata' sang banteng, berjarak sekitar 65 tahun cahaya." },
    { q: "Rasi zodiak 'ke-13' yang nyata dilalui Matahari adalah…", o: ["Cetus", "Ophiuchus", "Orion", "Hydra"], a: 1, e: "Matahari melintasi Ophiuchus selama sekitar 18 hari (30 Nov–18 Des) — diabaikan astrologi modern." },
    { q: "Di rasi mana letak pusat galaksi Bima Sakti (Sagittarius A*)?", o: ["Scorpius", "Sagittarius", "Virgo", "Cygnus"], a: 1, e: "Lubang hitam supermasif Sagittarius A* berada di arah rasi Sagittarius." },
    { q: "Apa nama bintang penunjuk arah utara?", o: ["Vega", "Polaris", "Arcturus", "Capella"], a: 1, e: "Polaris hampir tepat di atas kutub utara langit, sehingga tampak diam sementara bintang lain berputar." },
    { q: "Berapa lama cahaya Matahari sampai ke Bumi?", o: ["8 detik", "8 menit", "8 jam", "8 hari"], a: 1, e: "Jarak Bumi–Matahari ±150 juta km, cahaya menempuhnya dalam sekitar 8 menit 20 detik." },
    { q: "Gugus bintang 'Sarang Lebah' (M44) terletak di rasi…", o: ["Cancer", "Leo", "Gemini", "Aries"], a: 0, e: "M44 (Praesepe) berada di rasi Cancer dan dapat terlihat dengan mata telanjang di langit gelap." },
    { q: "Antares, si 'saingan Mars', adalah bintang jenis…", o: ["Katai putih", "Raksasa biru", "Super raksasa merah", "Bintang neutron"], a: 2, e: "Antares adalah super raksasa merah berjari-jari ±700 kali Matahari." },
    { q: "Apa yang menyebabkan posisi bintang bergeser perlahan selama ribuan tahun?", o: ["Rotasi Bumi", "Presesi poros Bumi", "Angin matahari", "Gerak Bulan"], a: 1, e: "Presesi poros Bumi menggeser posisi kutub langit ±50,3 detik busur per tahun (±1,4° per abad)." },
    { q: "Rasi yang berbentuk huruf W di langit utara adalah…", o: ["Cassiopeia", "Cygnus", "Lyra", "Perseus"], a: 0, e: "Cassiopeia berbentuk W (atau M) dan membantu menemukan Polaris." },
    { q: "Hujan meteor Geminid berasal dari…", o: ["Komet Halley", "Asteroid 3200 Phaethon", "Komet Swift-Tuttle", "Sisa supernova"], a: 1, e: "Geminid (pertengahan Desember) berasal dari puing asteroid 3200 Phaethon — bukan komet." },
    { q: "Nebula Kepiting (M1) di rasi Taurus adalah sisa dari…", o: ["Kelahiran bintang", "Ledakan supernova tahun 1054", "Tabrakan galaksi", "Bintang ganda"], a: 1, e: "M1 adalah sisa supernova yang dicatat astronom Tiongkok pada 1054 M, kini menampung sebuah pulsar." },
    { q: "Spica, bintang paling terang rasi Virgo, sebenarnya adalah…", o: ["Bintang tunggal", "Sistem bintang ganda", "Gugus bintang", "Galaksi jauh"], a: 1, e: "Spica adalah sistem bintang ganda rapat yang saling mengorbit, berjarak ±250 tahun cahaya." }
  ];

  const N = 10;
  let deck = [], idx = 0, score = 0, answered = false;

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function best() { return parseInt(localStorage.getItem("az_quiz_best") || "0", 10); }

  function start() {
    deck = shuffle(BANK).slice(0, N);
    idx = 0; score = 0;
    document.getElementById("quizResult").hidden = true;
    document.getElementById("quizPanel").hidden = false;
    showBest();
    renderQ();
  }

  function showBest() { document.getElementById("quizBest").textContent = "Skor terbaikmu: " + best() + " / " + N; }

  function renderQ() {
    answered = false;
    const q = deck[idx];
    document.getElementById("quizProgress").textContent = "Soal " + (idx + 1) + " dari " + N;
    document.getElementById("quizScore").textContent = "Skor: " + score;
    document.getElementById("quizQuestion").textContent = q.q;
    const ex = document.getElementById("quizExplain"); ex.hidden = true; ex.textContent = "";
    document.getElementById("quizNext").disabled = true;
    document.getElementById("quizNext").textContent = idx === N - 1 ? "Lihat Hasil →" : "Lanjut →";

    const opts = document.getElementById("quizOptions");
    opts.innerHTML = "";
    // acak urutan opsi
    const order = shuffle(q.o.map((_, i) => i));
    order.forEach((oi) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = q.o[oi];
      b.dataset.correct = oi === q.a ? "1" : "0";
      b.addEventListener("click", () => answer(b));
      opts.appendChild(b);
    });
  }

  function answer(btn) {
    if (answered) return;
    answered = true;
    const correct = btn.dataset.correct === "1";
    document.querySelectorAll("#quizOptions .opt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.correct === "1") b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    if (correct) score++;
    document.getElementById("quizScore").textContent = "Skor: " + score;
    const ex = document.getElementById("quizExplain");
    ex.hidden = false;
    ex.innerHTML = (correct ? "✔ Benar! " : "✘ Belum tepat. ") + deck[idx].e;
    document.getElementById("quizNext").disabled = false;
  }

  function next() {
    if (idx === N - 1) return finish();
    idx++; renderQ();
  }

  function finish() {
    document.getElementById("quizPanel").hidden = true;
    const res = document.getElementById("quizResult");
    res.hidden = false;
    if (score > best()) localStorage.setItem("az_quiz_best", score);
    const pct = Math.round(score / N * 100);
    let title = "Selesai!";
    if (pct === 100) title = "Sempurna! 🌟";
    else if (pct >= 80) title = "Hebat! 🚀";
    else if (pct >= 60) title = "Bagus! ✨";
    else title = "Terus belajar! 🔭";
    document.getElementById("quizResultTitle").textContent = title;
    document.getElementById("quizResultText").innerHTML =
      `Skormu <strong>${score} / ${N}</strong> (${pct}%). Skor terbaik: <strong>${best()} / ${N}</strong>.`;
  }

  function init() {
    document.getElementById("quizNext").addEventListener("click", next);
    document.getElementById("quizRestart").addEventListener("click", start);
    start();
  }

  global.ZD = global.ZD || {};
  global.ZD.quiz = { init };
})(window);
