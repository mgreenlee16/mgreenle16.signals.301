/*
 * ui.js — site chrome (top bar, theme, text size), site map, control wiring, presets, tabs,
 * SVG plotting (lines and stems), a draggable complex plane, and math rendering.
 * Every page sets <body data-root="./" or "../">.
 */
(function () {
  "use strict";
  const ROOT = document.body.dataset.root || "./";
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sg." + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("sg." + k, v); } catch (e) { /* storage unavailable */ } },
  };

  // ---------- site map ----------
  // exam: 1, 2 or 3 (final). topics: the problem-generator topics that drill this lesson.
  const LESSONS = [
    { part: "Exam 1 · Complex numbers, Fourier series and the DFT", exam: 1 },
    { slug: "complex", n: 1, exam: 1, title: "Complex Numbers",
      blurb: "Arithmetic, conjugates, polar form and Euler's formula, powers and roots, roots of unity, iⁱ, and adding sinusoids with phasors.",
      tags: ["3 interactives", "worked examples", "problem generator"] },
    { slug: "inner-products", n: 2, exam: 1, title: "Inner Products & Orthogonal Expansions",
      blurb: "Linear spaces, inner products on ℂⁿ and L²(0,τ), norms and distance, Cauchy–Schwarz, orthogonal bases, Parseval and best approximation.",
      tags: ["3 interactives", "worked examples", "problem generator"] },
    { slug: "fourier-series", n: 3, exam: 1, title: "Fourier Series",
      blurb: "The coefficients aₖ, the cosine–sine and harmonic forms, symmetry, spectra and Parseval, truncation error, Gibbs, Dirichlet convergence, and the shift, derivative and integral rules.",
      tags: ["4 interactives", "worked examples", "problem generator"] },
    { slug: "dft", n: 4, exam: 1, title: "The DFT & FFT",
      blurb: "Trigonometric polynomials and sampling, the DFT matrix F_ν and its inverse, MATLAB's ifft ordering, Nyquist and aliasing, the FFT, and reading frequencies off a spectrum.",
      tags: ["4 interactives", "worked examples", "problem generator"] },
    { part: "Exam 2 · Laplace transforms, transfer functions and state space", exam: 2 },
    { slug: "laplace", n: 5, exam: 2, title: "The Laplace Transform",
      blurb: "Definition and region of convergence, the table of pairs, linearity, multiplication by eᵃᵗ, derivatives and integrals, convolution, the delay rule and the delta function.",
      tags: ["2 interactives", "worked examples", "problem generator"] },
    { slug: "inverse-laplace", n: 6, exam: 2, title: "Partial Fractions & Differential Equations",
      blurb: "Poles and zeros, cover-up for real, complex and repeated poles, the direct term and δ(t), MATLAB's residue, and solving ODEs with initial conditions.",
      tags: ["2 interactives", "worked examples", "problem generator"] },
    { slug: "transfer-functions", n: 7, exam: 2, title: "Transfer Functions, Circuits & Stability",
      blurb: "Transfer functions and impulse responses, RLC circuits and impedance, stability, the final value theorem, and the mass–spring–damper.",
      tags: ["3 interactives", "worked examples", "problem generator"] },
    { slug: "state-space", n: 8, exam: 2, title: "State Space",
      blurb: "ẋ = Ax + Bu, y = Cx + Du; the matrix exponential, eigenvalues and stability, G(s) = C(sI − A)⁻¹B + D, and writing ODEs in state-space form.",
      tags: ["2 interactives", "worked examples", "problem generator"] },
    { part: "Final · Frequency response, filters and the Fourier transform", exam: 3 },
    { soon: true, exam: 3, title: "Final exam lessons",
      blurb: "Coming closer to the final: sinusoid response, Bode plots and filters, and the Fourier transform." },
  ];
  const TOOLS = [
    { slug: "complex", kicker: "Exam 1", title: "Complex Calculator", blurb: "Evaluate any complex expression: rectangular and polar forms, conjugate, all n-th roots, plotted on the complex plane." },
    { slug: "fourier", kicker: "Exam 1", title: "Fourier Series Calculator", blurb: "Type f(t) (piecewise with if()), pick τ: get aₖ, αₖ, βₖ, γₖ, ψₖ, ‖f‖², truncation error, the partial sum and the spectrum." },
    { slug: "dft", kicker: "Exam 1", title: "DFT / FFT Calculator", blurb: "MATLAB-style fft and ifft of any list, with the harmonic held in each slot, or sample a function at ν points." },
    { slug: "laplace", kicker: "Exam 2", title: "Partial Fractions & Inverse Laplace", blurb: "Enter num and den in MATLAB order: poles, residues like MATLAB's residue, the direct term, g(t) in real form, and a plot." },
    { slug: "system", kicker: "Exam 2", title: "Transfer Function Analyzer", blurb: "Enter G(s): poles and zeros on the s-plane, stability, G(0), and the impulse and step responses." },
  ];
  const EXAMS = [
    { slug: "exam1", n: 1, title: "Exam 1 Review", blurb: "Learning objectives checklist, formula sheet, exam-style worked problems and a timed practice exam generator for Chapters 1–3." },
    { slug: "exam2", n: 2, title: "Exam 2 Review", blurb: "Objectives checklist, Laplace table and formula sheet, exam-style problems and a practice exam generator. Covers Laplace transforms, partial fractions, transfer functions, circuits, stability, state space and mass–spring–damper systems." },
    { slug: "final", n: 3, soon: true, title: "Final Exam Review", blurb: "Coming closer to the exam. Cumulative review: frequency response, Bode plots, filters and the Fourier transform, plus everything from Exams 1 and 2." },
  ];
  const GLYPH = {
    complex: '<line x1="90" y1="4" x2="90" y2="60" class="axisl"/><line x1="30" y1="32" x2="150" y2="32" class="axisl"/><circle cx="90" cy="32" r="22" class="fan"/><line x1="90" y1="32" x2="122" y2="12" class="sig2"/><circle cx="122" cy="12" r="3.5" class="accfill"/><line x1="90" y1="32" x2="122" y2="52" class="sig1 dashl"/><text x="126" y="12" class="small">z</text><text x="126" y="58" class="small">z̄</text>',
    "inner-products": '<line x1="30" y1="54" x2="160" y2="54" class="axisl"/><line x1="40" y1="54" x2="150" y2="54" class="sig1"/><line x1="40" y1="54" x2="120" y2="10" class="sig2"/><line x1="120" y1="10" x2="120" y2="54" class="dashl axisl"/><text x="124" y="12" class="small">f</text><text x="150" y="48" class="small">g</text><text x="60" y="48" class="small">proj</text>',
    "fourier-series": '<path d="M10 46 L10 18 L50 18 L50 46 L90 46 L90 18 L130 18 L130 46 L170 46" class="axisl" style="fill:none"/><path d="M10 32 C14 14,22 14,30 18 S44 22,50 32 S56 50,70 46 S86 46,90 32 S96 14,110 18 S126 22,130 32 S136 50,150 46 S166 46,170 32" class="sig2" style="fill:none"/><text x="12" y="62" class="small">p₅(t) → f(t)</text>',
    dft: '<line x1="10" y1="54" x2="170" y2="54" class="axisl"/>' + [14, 34, 54, 74, 94, 114, 134, 154].map((x, i) => { const h = [6, 30, 8, 4, 4, 8, 30, 6][i]; return `<line x1="${x}" y1="54" x2="${x}" y2="${54 - h}" class="sig1"/><circle cx="${x}" cy="${54 - h}" r="3" class="accfill"/>`; }).join("") + '<text x="60" y="12" class="small">|fft(x)|² peaks</text>',
    laplace: '<line x1="90" y1="4" x2="90" y2="60" class="axisl"/><line x1="10" y1="32" x2="170" y2="32" class="axisl"/><rect x="100" y="4" width="70" height="56" class="okfill"/><text x="62" y="18" class="label hot">×</text><text x="62" y="54" class="label hot">×</text><text x="40" y="38" class="label hot">×</text><text x="112" y="20" class="small">ℜs &gt; γ</text>',
    "inverse-laplace": '<line x1="10" y1="32" x2="170" y2="32" class="axisl"/><path d="M10 50 C30 4,46 4,60 30 S90 58,110 36 S150 26,170 32" class="sig2" style="fill:none"/><text x="96" y="14" class="small">Σ rₖ e^(pₖt)</text>',
    "transfer-functions": '<rect x="62" y="16" width="56" height="32" rx="5" class="box"/><text x="76" y="37" class="label">G(s)</text><line x1="10" y1="32" x2="62" y2="32" class="sig1"/><line x1="118" y1="32" x2="170" y2="32" class="sig2"/><text x="14" y="26" class="small">U(s)</text><text x="140" y="26" class="small">Y(s)</text>',
    "state-space": '<rect x="14" y="20" width="44" height="24" class="box"/><text x="20" y="36" class="small">∫ dt</text><line x1="58" y1="32" x2="92" y2="32" class="axisl"/><path d="M92 32 l12 -10 l8 20 l8 -20 l8 20 l8 -20 l8 20 l6 -10" class="sig1" style="fill:none"/><rect x="150" y="18" width="22" height="28" class="okfill"/><text x="16" y="60" class="small">ẋ = Ax + Bu</text>',
  };

  // ---------- chrome ----------
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(store.get("theme", "auto"));
  let fsPx = parseFloat(store.get("fs", "17"));
  document.documentElement.style.setProperty("--fs", fsPx + "px");
  const listeners = [];

  function buildTopbar() {
    const here = document.body.dataset.section || "";
    const header = document.createElement("header");
    header.className = "topbar";
    const themeIcon = { auto: "◐", light: "☀", dark: "☾" };
    header.innerHTML = `
      <div class="topbar-inner">
        <a class="brand" href="${ROOT}index.html">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12 C4 3,7 3,9 12 S14 21,17 12 S21 5,23 9" stroke="var(--accent)" fill="none" stroke-width="2.2"/><circle cx="9" cy="12" r="1.8" fill="var(--hot)"/></svg>
          Learn Signals · AAE 301
        </a>
        <nav>
          <a href="${ROOT}index.html#lessons" ${here === "lessons" ? 'aria-current="page"' : ""}>Lessons</a>
          <a href="${ROOT}practice.html" ${here === "practice" ? 'aria-current="page"' : ""}>Practice</a>
          <a href="${ROOT}index.html#exams" ${here === "exams" ? 'aria-current="page"' : ""}>Exams</a>
          <a href="${ROOT}index.html#tools" ${here === "tools" ? 'aria-current="page"' : ""}>Tools</a>
          <a href="${ROOT}about.html" ${here === "about" ? 'aria-current="page"' : ""}>About</a>
        </nav>
        <div class="tools">
          <button id="fsDown" title="Smaller text" aria-label="Smaller text">A−</button>
          <button id="fsUp" title="Larger text" aria-label="Larger text">A+</button>
          <button id="themeBtn" title="Theme: ${store.get("theme", "auto")}" aria-label="Change theme">${themeIcon[store.get("theme", "auto")] || "◐"}</button>
        </div>
      </div>`;
    document.body.prepend(header);
    header.querySelector("#fsDown").onclick = () => setFs(fsPx - 1);
    header.querySelector("#fsUp").onclick = () => setFs(fsPx + 1);
    const tb = header.querySelector("#themeBtn");
    tb.onclick = () => {
      const order = ["auto", "light", "dark"];
      const next = order[(order.indexOf(store.get("theme", "auto")) + 1) % 3];
      store.set("theme", next); applyTheme(next);
      tb.title = "Theme: " + next; tb.textContent = themeIcon[next];
    };
  }
  function setFs(v) {
    fsPx = Math.min(24, Math.max(13, v));
    store.set("fs", String(fsPx));
    document.documentElement.style.setProperty("--fs", fsPx + "px");
  }
  function setGamma() { /* kept for wire() presets compatibility */ }

  function buildFooter() {
    const f = document.createElement("footer");
    f.innerHTML = `<div class="inner">
      <b style="color:var(--chrome-text)">Learn Signals</b> by Michael Greenlee: interactive study notes for AAE 301, Signal Analysis for Aerospace Engineering, at Purdue.
      Notation follows the course notes (A. E. Frazho, <i>Notes on Signals and Systems</i>), in particular f(t) = Σ aₖ e<sup>−ikω₀t</sup> with aₖ = (1/τ)∫ f(t) e<sup>+ikω₀t</sup> dt,
      the 1/τ-normalized inner product on L²(0,τ), and MATLAB's <code>fft</code>/<code>ifft</code> conventions. Problems are generated at random and checked numerically. This is a study aid, not an official course page.
      Code under the MIT License.</div>`;
    document.body.append(f);
  }

  function buildPager() {
    const slug = document.body.dataset.lesson;
    if (!slug) return;
    const list = LESSONS.filter(l => l.slug && !l.soon);
    const i = list.findIndex(l => l.slug === slug);
    if (i < 0) return;
    const prev = list[i - 1];
    let next = list[i + 1];
    if (next && next.exam !== list[i].exam) next = { review: `exam${list[i].exam}` };
    const nav = document.createElement("nav");
    nav.className = "pager";
    nav.innerHTML = `<span>${prev ? `<a href="${prev.slug}.html">← ${prev.n}. ${prev.title}</a>` : `<a href="${ROOT}index.html#lessons">← All lessons</a>`}</span>
      <span>${next && next.review ? `<a href="${ROOT}exams/${next.review}.html">Exam ${next.review.slice(4)} review →</a>` : next ? `<a href="${next.slug}.html">${next.n}. ${next.title} →</a>` : `<a href="${ROOT}exams/exam2.html">Exam 2 review →</a>`}</span>`;
    document.querySelector("main").append(nav);
  }
  // ---------- math ----------
  let mathReady = false;
  const mathWaiters = [];
  function loadMath() {
    const base = ROOT + "assets/vendor/katex/"; // KaTeX 0.16.9, vendored (MIT)
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = base + "katex.min.css";
    document.head.append(link);
    const s1 = document.createElement("script");
    s1.src = base + "katex.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = base + "auto-render.min.js";
      s2.onload = () => { mathReady = true; typeset(document.querySelector("main")); mathWaiters.splice(0).forEach(f => f()); };
      document.head.append(s2);
    };
    document.head.append(s1);
  }
  function typeset(el) {
    if (!mathReady || !el) return;
    window.renderMathInElement(el, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }],
      throwOnError: false,
    });
  }

  // ---------- helpers ----------
  function fmt(x, sig = 4) {
    if (x === null || x === undefined || Number.isNaN(x)) return "—";
    if (typeof x !== "number") return String(x);
    if (!isFinite(x)) return "∞";
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e6 || a < 1e-3)) return x.toExponential(sig - 1).replace(/e\+?(-?\d+)/, (m, e) => "×10" + sup(e));
    return Number(x.toPrecision(sig)).toString();
  }
  function sup(e) {
    const map = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(e).split("").map(c => map[c]).join("");
  }
  const $ = (sel, el = document) => el.querySelector(sel);
  const val = id => parseFloat(document.getElementById(id).value);

  function setSeg(seg, v) {
    seg.dataset.value = v;
    seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.value === String(v) ? "true" : "false"));
  }

  // Wire every range/number/select inside `scope` to render(); keep <output> in sync; handle presets.
  function wire(scope, render) {
    const root = typeof scope === "string" ? document.querySelector(scope) : scope;
    const inputs = root.querySelectorAll("input, select");
    const sync = () => {
      inputs.forEach(inp => {
        const out = root.querySelector(`output[for="${inp.id}"]`);
        if (out) {
          const d = inp.dataset.dec !== undefined ? +inp.dataset.dec : 2;
          out.textContent = parseFloat(inp.value).toFixed(d) + (inp.dataset.unit || "");
        }
      });
      render();
    };
    inputs.forEach(inp => { inp.addEventListener("input", sync); if (inp.tagName === "SELECT") inp.addEventListener("change", sync); });
    root.querySelectorAll(".seg").forEach(seg => {
      seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { setSeg(seg, b.dataset.value); sync(); }));
    });
    root.querySelectorAll("[data-preset]").forEach(btn => btn.addEventListener("click", () => {
      const p = JSON.parse(btn.dataset.preset);
      Object.entries(p).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (!el) return;
        if (el.classList.contains("seg")) setSeg(el, v); else el.value = v;
      });
      sync();
    }));
    listeners.push(sync);
    sync();
    return sync;
  }
  const seg = id => document.getElementById(id).dataset.value;
  const live = (labSel, html) => { const el = document.querySelector(labSel + " .live"); if (el) el.innerHTML = html; };

  function readout(el, items) {
    (typeof el === "string" ? document.querySelector(el) : el).innerHTML =
      items.map(([k, v, note]) => `<div><span>${k}</span><b>${typeof v === "number" ? fmt(v) : v}</b>${note ? `<small>${note}</small>` : ""}</div>`).join("");
  }
  // rows: [label, value] or [label, relation, value] (3 columns) or {sub: "heading"}
  function table(el, head, rows, cls = "") {
    (typeof el === "string" ? document.querySelector(el) : el).innerHTML =
      `<table class="data ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
      rows.map(r => r.sub ? `<tr class="sub"><td colspan="${head.length}">${r.sub}</td></tr>`
        : `<tr>${r.map(c => `<td>${typeof c === "number" ? fmt(c) : c}</td>`).join("")}</tr>`).join("") +
      "</tbody></table>";
  }

  // ---------- tabs ----------
  function initTabs(root = document) {
    root.querySelectorAll(".tabs").forEach(t => {
      if (t.dataset.ready) return;
      t.dataset.ready = "1";
      const btns = t.querySelectorAll(".tablist button"), panels = t.querySelectorAll(".panel");
      const show = i => {
        btns.forEach((b, k) => b.setAttribute("aria-selected", k === i ? "true" : "false"));
        panels.forEach((p, k) => p.classList.toggle("active", k === i));
      };
      btns.forEach((b, i) => b.addEventListener("click", () => show(i)));
      show(0);
    });
  }

  // ---------- self-check quiz ----------
  // items: [{ q, opts: [...], a: index, why }]
  function quiz(target, items) {
    const el = document.querySelector(target);
    el.classList.add("quiz");
    el.innerHTML = `<span class="score">0 / ${items.length}</span><b>Pick an answer to see whether it is right, and why.</b><ol>` +
      items.map((it, i) => `<li data-i="${i}"><div class="qtext">${it.q}</div><div class="opts">${it.opts.map((o, k) => `<button data-k="${k}">${o}</button>`).join("")}</div><div class="why">${it.why}</div></li>`).join("") + "</ol>";
    const done = new Set(), right = new Set();
    el.querySelectorAll("li").forEach(li => {
      const it = items[+li.dataset.i];
      li.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        const k = +b.dataset.k;
        li.querySelectorAll("button").forEach(x => x.classList.remove("right", "wrong"));
        b.classList.add(k === it.a ? "right" : "wrong");
        li.querySelectorAll("button")[it.a].classList.add("right");
        const why = li.querySelector(".why");
        why.innerHTML = (k === it.a ? "<b style='color:var(--good)'>Correct.</b> " : "<b style='color:var(--bad)'>Not quite.</b> ") + it.why;
        why.classList.add("show");
        typeset(why);
        if (!done.has(li.dataset.i)) { done.add(li.dataset.i); if (k === it.a) right.add(li.dataset.i); }
        el.querySelector(".score").textContent = `${right.size} / ${items.length} right first time`;
      }));
    });
  }

  // ---------- plotting ----------
  function niceTicks(a, b, n = 6) {
    const span = b - a;
    if (!(span > 0)) return [a];
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toPrecision(12));
    return out;
  }
  function logTicks(lo, hi) {
    const L0 = Math.log10(lo), L1 = Math.log10(hi), ks = L1 - L0 > 3 ? [1] : [1, 2, 5], out = [];
    for (let e = Math.floor(L0); e <= Math.ceil(L1); e++) for (const k of ks) {
      const v = k * Math.pow(10, e);
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
    }
    return out;
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  let clipId = 0;

  /*
   * plot(target, opts)
   *  opts: { w, h, xlabel, ylabel, xlim, ylim, logx, logy, series:[{x,y,label,c,dash,width,fill}],
   *          points:[{x,y,c,label}], vlines:[{x,label,c}], hlines:[{y,label,c}], bands:[{x0,x1,label}],
   *          notes:[{x,y,text,anchor}], legend:"tr"|"tl"|"br"|"bl"|false }
   */
  function plot(target, o) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    const W = o.w || 640, H = o.h || 360, m = { l: o.logy ? 70 : 60, r: 16, t: 14, b: 44 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const finite = v => typeof v === "number" && isFinite(v);
    const xs = [], ys = [];
    (o.series || []).concat(o.stems || []).forEach(s => s.x.forEach((x, i) => { if (finite(x) && finite(s.y[i])) { xs.push(x); ys.push(s.y[i]); } }));
    (o.stems || []).forEach(s => { if (s.x.length) ys.push(s.base || 0); });
    const xlim = o.xlim || [Math.min(...xs), Math.max(...xs)];
    let ylim = o.ylim;
    if (!ylim) {
      const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.06 || 1;
      ylim = o.logy ? [lo, hi] : [lo - pad, hi + pad];
    }
    const tx = o.logx ? v => Math.log10(v) : v => v, ty = o.logy ? v => Math.log10(v) : v => v;
    const X0 = tx(xlim[0]), X1 = tx(xlim[1]), Y0 = ty(ylim[0]), Y1 = ty(ylim[1]);
    const X = x => m.l + ((tx(x) - X0) / (X1 - X0)) * pw;
    const Y = y => m.t + ph - ((ty(y) - Y0) / (Y1 - Y0)) * ph;
    const cid = "clip" + (++clipId);
    const parts = [`<defs><clipPath id="${cid}"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>`];
    const xt = o.xticks || (o.logx ? logTicks(xlim[0], xlim[1]) : niceTicks(xlim[0], xlim[1], o.nx || 7));
    const yt = o.yticks || (o.logy ? logTicks(ylim[0], ylim[1]) : niceTicks(ylim[0], ylim[1], o.ny || 6));
    const g = [`<g class="axis">`];
    (o.bands || []).forEach(b => g.push(`<rect x="${X(b.x0)}" y="${m.t}" width="${X(b.x1) - X(b.x0)}" height="${ph}" fill="var(--surface-2)"/>` +
      (b.label ? `<text class="ticklabel" x="${(X(b.x0) + X(b.x1)) / 2}" y="${m.t + 12}" text-anchor="middle">${esc(b.label)}</text>` : "")));
    xt.forEach(v => g.push(`<line class="gridline" x1="${X(v)}" x2="${X(v)}" y1="${m.t}" y2="${m.t + ph}"/>`,
      `<text class="ticklabel" x="${X(v)}" y="${m.t + ph + 16}" text-anchor="middle">${fmt(v, 4)}</text>`));
    yt.forEach(v => g.push(`<line class="gridline" x1="${m.l}" x2="${m.l + pw}" y1="${Y(v)}" y2="${Y(v)}"/>`,
      `<text class="ticklabel" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 3)}</text>`));
    g.push(`<path d="M${m.l} ${m.t}V${m.t + ph}H${m.l + pw}" fill="none"/>`);
    if (o.xlabel) g.push(`<text class="axlabel" x="${m.l + pw / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xlabel)}</text>`);
    if (o.ylabel) g.push(`<text class="axlabel" transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle">${esc(o.ylabel)}</text>`);
    g.push("</g>");
    parts.push(g.join(""));
    const body = [`<g clip-path="url(#${cid})">`];
    (o.series || []).forEach((s, k) => {
      let d = "", pen = false, first = null, last = null;
      s.x.forEach((x, i) => {
        const y = s.y[i];
        if (!finite(x) || !finite(y) || (o.logy && y <= 0) || (o.logx && x <= 0)) { pen = false; return; }
        const px = X(x).toFixed(1), py = Y(y).toFixed(1);
        d += (pen ? "L" : "M") + px + " " + py;
        if (!first) first = px; last = px;
        pen = true;
      });
      const c = s.c || (k % 6) + 1;
      if (s.fill && first) body.push(`<path class="area c${c}" d="${d}L${last} ${Y(o.logy ? ylim[0] : Math.max(ylim[0], 0))}L${first} ${Y(o.logy ? ylim[0] : Math.max(ylim[0], 0))}Z"/>`);
      body.push(`<path class="series c${c}${s.dash ? " dash" : ""}" d="${d}"${s.width ? ` style="stroke-width:${s.width}"` : ""}/>`);
    });
    (o.stems || []).forEach((s, k) => {
      const c = s.c || 1, base = Y(Math.max(ylim[0], Math.min(ylim[1], s.base || 0)));
      s.x.forEach((x, i) => {
        const y = s.y[i];
        if (!finite(x) || !finite(y) || (o.logy && y <= 0)) return;
        body.push(`<line class="series c${c}" style="stroke-width:${s.width || 2}" x1="${X(x)}" x2="${X(x)}" y1="${base}" y2="${Y(y)}"/>`);
        if (s.dots !== false) body.push(`<circle class="marker c${c}" cx="${X(x)}" cy="${Y(y)}" r="${s.r || 3.2}"/>`);
      });
    });
    (o.vlines || []).forEach(v => body.push(`<line class="series c${v.c || 6} dash" style="stroke-width:1.2" x1="${X(v.x)}" x2="${X(v.x)}" y1="${m.t}" y2="${m.t + ph}"/>` +
      (v.label ? `<text class="ticklabel" x="${X(v.x) + 4}" y="${m.t + 12}">${esc(v.label)}</text>` : "")));
    (o.hlines || []).forEach(v => body.push(`<line class="series c${v.c || 6} dash" style="stroke-width:1.2" x1="${m.l}" x2="${m.l + pw}" y1="${Y(v.y)}" y2="${Y(v.y)}"/>` +
      (v.label ? `<text class="ticklabel" x="${m.l + pw - 4}" y="${Y(v.y) - 4}" text-anchor="end">${esc(v.label)}</text>` : "")));
    (o.notes || []).forEach(n => body.push(`<text class="ticklabel" x="${X(n.x)}" y="${Y(n.y)}" text-anchor="${n.anchor || "start"}" style="fill:var(--text)">${esc(n.text)}</text>`));
    (o.points || []).forEach(p => {
      if (!finite(p.x) || !finite(p.y)) return;
      body.push(`<circle class="marker c${p.c || 1}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${p.r || 5}"/>`);
      if (p.label) body.push(`<text class="ticklabel" x="${X(p.x) + 8}" y="${Y(p.y) - 8}" style="fill:var(--text)">${esc(p.label)}</text>`);
    });
    body.push("</g>");
    parts.push(body.join(""));
    const named = (o.series || []).concat((o.stems || []).map(s => ({ ...s, stem: 1 }))).map((s, k) => ({ ...s, c: s.c || (k % 6) + 1 })).filter(s => s.label);
    if (named.length && o.legend !== false) {
      const pos = o.legend || "tr", lw = o.legendWidth || 160, lh = 16 * named.length + 8;
      const lx = pos.includes("r") ? m.l + pw - lw - 6 : m.l + 8;
      const ly = pos.includes("t") ? m.t + 6 : m.t + ph - lh - 6;
      const L = [`<g class="legend"><rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="6" fill="var(--surface)" stroke="var(--border)" opacity=".94"/>`];
      named.forEach((s, i) => L.push(`<line class="series c${s.c}${s.dash ? " dash" : ""}" x1="${lx + 8}" x2="${lx + 30}" y1="${ly + 12 + 16 * i}" y2="${ly + 12 + 16 * i}"/>`,
        `<text x="${lx + 36}" y="${ly + 16 + 16 * i}">${esc(s.label)}</text>`));
      L.push("</g>");
      parts.push(L.join(""));
    }
    el.innerHTML = `<svg class="plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || o.ylabel || "plot")}">${parts.join("")}</svg>`;
    return { X, Y };
  }
  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  const logspace = (a, b, n) => linspace(Math.log10(a), Math.log10(b), n).map(v => Math.pow(10, v));


  /*
   * cplane(target, opts) — an SVG complex plane.
   * opts: { R: half-width, w, h, points:[{z:{re,im}, c, label, r, drag:true, ray:true}], circles:[{r, c, dash}],
   *         polys:[{pts:[{re,im}], c, closed}], onDrag(i, z) }
   * Returns { redraw(points) }.
   */
  function cplane(target, o) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    const W = o.w || 420, H = o.h || 420, R = o.R || 4;
    const sx = W / (2 * R), sy = H / (2 * R * H / W);
    const Ry = R * H / W;
    const X = re => W / 2 + re * sx, Y = im => H / 2 - im * sy;
    let st = o;
    function draw() {
      const p = [];
      const step = R <= 2 ? 0.5 : R <= 6 ? 1 : Math.ceil(R / 5);
      for (let v = -Math.floor(R / step) * step; v <= R; v += step) {
        p.push(`<line x1="${X(v)}" x2="${X(v)}" y1="0" y2="${H}" class="gridl"/>`);
        if (Math.abs(v) > 1e-9) p.push(`<text x="${X(v)}" y="${H / 2 + 13}" text-anchor="middle" class="tick">${+v.toFixed(2)}</text>`);
      }
      for (let v = -Math.floor(Ry / step) * step; v <= Ry; v += step) {
        p.push(`<line y1="${Y(v)}" y2="${Y(v)}" x1="0" x2="${W}" class="gridl"/>`);
        if (Math.abs(v) > 1e-9) p.push(`<text x="${W / 2 - 4}" y="${Y(v) + 4}" text-anchor="end" class="tick">${+v.toFixed(2)}</text>`);
      }
      p.push(`<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="axisl"/><line y1="0" y2="${H}" x1="${W / 2}" x2="${W / 2}" class="axisl"/>`);
      p.push(`<text x="${W - 6}" y="${H / 2 - 6}" text-anchor="end" class="tick">ℜ</text><text x="${W / 2 + 6}" y="12" class="tick">ℑ</text>`);
      (st.circles || []).forEach(c => p.push(`<circle cx="${X(c.cx || 0)}" cy="${Y(c.cy || 0)}" r="${c.r * sx}" class="ring c${c.c || 6}${c.dash ? " dashl" : ""}"/>`));
      (st.polys || []).forEach(q => {
        const d = q.pts.map((z, i) => (i ? "L" : "M") + X(z.re).toFixed(1) + " " + Y(z.im).toFixed(1)).join("") + (q.closed ? "Z" : "");
        p.push(`<path d="${d}" class="series c${q.c || 2}${q.dash ? " dash" : ""}" style="fill:none;stroke-width:${q.width || 1.6}"/>`);
      });
      (st.points || []).forEach((q, i) => {
        if (!isFinite(q.z.re) || !isFinite(q.z.im)) return;
        if (q.ray) p.push(`<line x1="${X(q.from ? q.from.re : 0)}" y1="${Y(q.from ? q.from.im : 0)}" x2="${X(q.z.re)}" y2="${Y(q.z.im)}" class="series c${q.c || 1}${q.dash ? " dash" : ""}" style="stroke-width:2"/>`);
        p.push(`<circle data-i="${i}" cx="${X(q.z.re)}" cy="${Y(q.z.im)}" r="${q.r || (q.drag ? 8 : 4.5)}" class="marker c${q.c || 1}${q.drag ? " handle" : ""}"/>`);
        if (q.label) p.push(`<text x="${X(q.z.re) + 9}" y="${Y(q.z.im) - 8}" class="plabel">${esc(q.label)}</text>`);
      });
      svg.innerHTML = p.join("");
    }
    // the <svg> element persists across redraws so that pointer capture survives a drag
    el.innerHTML = `<svg class="cplane plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || "complex plane")}"></svg>`;
    const svg = el.querySelector("svg");
    let dragging = -1;
    const toZ = ev => {
      const r = svg.getBoundingClientRect();
      const px = (ev.clientX - r.left) * W / r.width, py = (ev.clientY - r.top) * H / r.height;
      return { re: (px - W / 2) / sx, im: (H / 2 - py) / sy };
    };
    svg.addEventListener("pointerdown", ev => {
      const t = ev.target.closest("[data-i]");
      if (t && st.points[+t.dataset.i].drag) { dragging = +t.dataset.i; svg.setPointerCapture(ev.pointerId); ev.preventDefault(); }
      else if (st.onClick) { st.onClick(toZ(ev)); }
    });
    svg.addEventListener("pointermove", ev => { if (dragging >= 0 && st.onDrag) st.onDrag(dragging, toZ(ev)); });
    svg.addEventListener("pointerup", () => { dragging = -1; });
    draw();
    return { redraw(next) { st = Object.assign({}, st, next); draw(); } };
  }

  // ---------- home page cards ----------
  function cards(target, kind, exam) {
    const el = document.querySelector(target);
    if (!el) return;
    if (kind === "lessons") {
      let html = "";
      LESSONS.filter(l => !exam || l.exam === exam).forEach(l => {
        if (l.part) { html += `${html ? "</div>" : ""}<h3 class="eyebrow" style="margin-top:1.6rem">${l.part}</h3><div class="grid">`; return; }
        if (l.soon) { html += `<div class="card soon"><span class="kicker">Coming soon</span><h3>${l.title}</h3><p>${l.blurb}</p></div>`; return; }
        html += `<a class="card" href="${ROOT}lessons/${l.slug}.html"><div class="glyph"><svg class="diagram" viewBox="0 0 180 64">${GLYPH[l.slug] || ""}</svg></div>
          <span class="kicker">Lesson ${l.n}</span><h3>${l.title}</h3><p>${l.blurb}</p>
          <div class="tags">${(l.tags || []).map(t => `<span class="pill">${t}</span>`).join("")}</div></a>`;
      });
      el.innerHTML = html + "</div>";
    } else if (kind === "exams") {
      el.innerHTML = `<div class="grid">${EXAMS.map(c => {
        const k = c.n === 3 ? "Final" : "Exam " + c.n;
        return c.soon ? `<div class="card soon"><span class="kicker">${k} · coming soon</span><h3>${c.title}</h3><p>${c.blurb}</p></div>`
          : `<a class="card" href="${ROOT}exams/${c.slug}.html"><span class="kicker">${k}</span><h3>${c.title}</h3><p>${c.blurb}</p></a>`;
      }).join("")}</div>`;
    } else {
      el.innerHTML = `<div class="grid">${TOOLS.map(c => `<a class="card" href="${ROOT}tools/${c.slug}.html">
        <span class="kicker">${c.kicker}</span><h3>${c.title}</h3><p>${c.blurb}</p></a>`).join("")}</div>`;
    }
  }

  window.UI = {
    wire, val, seg, setSeg, live, fmt, readout, table, plot, cplane,
    linspace, logspace, cards, quiz, initTabs, typeset, $, LESSONS, TOOLS, EXAMS, store, ROOT,
    whenMath: fn => { if (mathReady) fn(); else mathWaiters.push(fn); },
  };

  buildTopbar();
  initTabs();
  document.addEventListener("DOMContentLoaded", () => { buildPager(); buildFooter(); loadMath(); });
})();
