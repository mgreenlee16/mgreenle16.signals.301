/*
 * sys.js — helpers for transfer functions (window.SYS, also loadable in Node).
 * Polynomials are real coefficient arrays, highest power first, as in MATLAB.
 */
(function (root) {
  "use strict";
  const CX = root.CX || require("./cx.js");
  const { C, add, mul, div, abs, num, tex } = CX;

  // Parse "[1 2 3]", "1, 2, 3", "conv([1 2],[1 3])" or a polynomial in s such as "(s+1)(s^2+2s+5)".
  function parseVec(str) {
    const s = String(str).trim();
    if (/s/.test(s.replace(/conv/g, ""))) return polyFromExpr(s);
    let i = 0;
    const src = s;
    function ws() { while (/\s/.test(src[i] || "")) i++; }
    function vec() {
      ws();
      if (src.startsWith("conv", i)) {
        i += 4; ws(); if (src[i++] !== "(") throw new Error("conv(");
        const a = vec(); ws(); if (src[i++] !== ",") throw new Error("conv ,");
        const b = vec(); ws(); if (src[i++] !== ")") throw new Error("conv )");
        return CX.conv(a, b).map(c => c.re);
      }
      const br = src[i] === "[";
      if (br) i++;
      const out = [];
      let tok = "";
      const flush = () => { if (tok.trim()) out.push(CX.evalC(tok).re); tok = ""; };
      let depth = 0;
      while (i < src.length) {
        const ch = src[i];
        if (br && ch === "]" && depth === 0) { i++; break; }
        if (!br && depth === 0 && ch === ")") break;
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (depth === 0 && (ch === "," || ch === ";") && !br) { flush(); i++; continue; }
        if (depth === 0 && br && (ch === "," || /\s/.test(ch))) { flush(); i++; continue; }
        if (!br && depth === 0 && /\s/.test(ch)) { flush(); i++; continue; }
        tok += ch; i++;
      }
      flush();
      if (!out.length) throw new Error("empty vector");
      return out;
    }
    const v = vec();
    return v;
  }
  // Fit the coefficients of a polynomial expression in s by sampling (degree ≤ 12).
  function polyFromExpr(expr) {
    const f = CX.compile(expr);
    const N = 13, pts = Array.from({ length: N }, (_, k) => CX.polar(1.3, 2 * Math.PI * k / N));
    const vals = pts.map(s => CX.toC(f({ s })));
    // coefficients via inverse DFT on the circle: p(r e^{iθ}) = Σ c_m r^m e^{imθ}
    const c = [];
    for (let m = 0; m < N; m++) {
      let acc = C(0);
      pts.forEach((s, k) => { acc = add(acc, mul(vals[k], CX.polar(1, -2 * Math.PI * k * m / N))); });
      c.push(acc.re / N / Math.pow(1.3, m));
    }
    const clean = c.map(x => (Math.abs(x - Math.round(x)) < 1e-7 ? Math.round(x) : +x.toPrecision(10)));
    while (clean.length > 1 && Math.abs(clean[clean.length - 1]) < 1e-9) clean.pop();
    return clean.reverse();
  }
  const trim = p => { let i = 0; while (i < p.length - 1 && Math.abs(p[i]) < 1e-14) i++; return p.slice(i); };

  // g(t) in real form from a partial-fraction result, as LaTeX
  function realTex(pf, opt = {}) {
    const tv = opt.v || "t", parts = [];
    const used = new Set();
    const fmt = x => tex(Math.abs(x) < 1e-10 ? 0 : x);
    const powT = j => (j === 1 ? "" : j === 2 ? tv : `\\frac{${tv}^{${j - 1}}}{${[1, 1, 2, 6, 24, 120][j - 1]}}`);
    const expo = a => (Math.abs(a) < 1e-10 ? "" : `e^{${fmt(a) === "1" ? "" : fmt(a) === "-1" ? "-" : fmt(a)}${tv}}`);
    if (abs(pf.k) > 1e-10) parts.push([pf.k.re, "\\delta(t)"]);
    pf.terms.forEach((T, idx) => {
      if (used.has(idx)) return;
      const p = T.p, c = T.c;
      if (Math.abs(p.im) < 1e-9) { parts.push([c.re, `${powT(T.j)}${expo(p.re)}`]); return; }
      const mate = pf.terms.findIndex((U, k) => k !== idx && !used.has(k) && U.j === T.j && abs(CX.sub(U.p, CX.conj(p))) < 1e-7);
      if (mate >= 0) used.add(mate);
      used.add(idx);
      const w = Math.abs(p.im), cc = p.im > 0 ? c : CX.conj(c);
      const wt = `${fmt(w) === "1" ? "" : fmt(w)}${tv}`;
      parts.push([2 * cc.re, `${powT(T.j)}${expo(p.re)}\\cos ${wt}`]);
      parts.push([-2 * cc.im, `${powT(T.j)}${expo(p.re)}\\sin ${wt}`]);
    });
    const s = (root.GH && root.GH.lin) ? root.GH.lin(parts.filter(([c]) => Math.abs(c) > 1e-10)) : parts.map(([c, b]) => `${num(c)}${b}`).join(" + ");
    return s;
  }
  const respImpulse = (n, d) => { const pf = CX.residues(n, d); return t => CX.invLaplaceAt(pf, t); };
  const respStep = (n, d, u0 = 1) => { const pf = CX.residues(n.map(x => x * u0), CX.conv(d, [1, 0]).map(c => c.re)); return t => CX.invLaplaceAt(pf, t); };
  const evalG = (n, d, s) => div(CX.polyval(n, s), CX.polyval(d, s));
  const freq = (n, d, w) => evalG(n, d, C(0, w));
  const poles = d => CX.roots(d);
  const zeros = n => (trim(n).length > 1 ? CX.roots(n) : []);
  const stable = d => poles(d).every(p => p.re < -1e-9);
  // LaTeX for num/den
  const tfTex = (n, d, v = "s") => {
    const pt = root.GH && root.GH.ptex ? root.GH.ptex : (p => p.join(" "));
    return `\\frac{${pt(trim(n), v)}}{${pt(trim(d), v)}}`;
  };
  // Simple step metrics from samples
  function metrics(f, T, N = 2000) {
    const t = Array.from({ length: N + 1 }, (_, k) => k * T / N), y = t.map(f);
    const yf = y[N];
    let peak = -Infinity, tp = 0; y.forEach((v, k) => { if (v > peak) { peak = v; tp = t[k]; } });
    let ts = 0; for (let k = N; k >= 0; k--) { if (Math.abs(y[k] - yf) > 0.02 * Math.abs(yf || 1)) { ts = t[Math.min(N, k + 1)]; break; } }
    return { yf, peak, tp, ts, overshoot: yf ? Math.max(0, (peak - yf) / Math.abs(yf)) : 0 };
  }
  const SYS = { parseVec, polyFromExpr, realTex, respImpulse, respStep, evalG, freq, poles, zeros, stable, tfTex, metrics, trim };
  if (typeof module !== "undefined" && module.exports) module.exports = SYS;
  else root.SYS = SYS;
})(typeof window !== "undefined" ? window : globalThis);
