/*
 * gen-exam2.js — problem generators for Exam 2: Laplace transforms, partial fractions and ODEs,
 * transfer functions (circuits, stability, final value, mass–spring–damper) and state space.
 * Conventions follow the course notes: G(s) = ∫_0^∞ e^{-st} g(t) dt, MATLAB polynomial order
 * (highest power first), and residues r_k at poles p_k so that g(t) = Σ r_k e^{p_k t}.
 */
(function (root) {
  "use strict";
  const CX = root.CX || require("./cx.js");
  const QZ = root.QZ || require("./quiz.js");
  if (!root.GH) require("./gen-exam1.js");
  const { C, add, sub, mul, div, abs, tex, ctex, num } = CX;
  const { lin, ptex, fld, mc } = root.GH;
  const R = QZ.R;
  const GROUP = { laplace: "Laplace transform", "inverse-laplace": "Partial fractions & ODEs", "transfer-functions": "Transfer functions", "state-space": "State space" };
  const reg = (id, title, lesson, gen) => QZ.register(id, { title, exam: 2, group: GROUP[lesson], lesson }, gen);

  // ---------- helpers ----------
  const spn = p => (p === 0 ? "s" : `s ${p < 0 ? "+" : "-"} ${tex(Math.abs(p))}`); // s - p, no parentheses
  const sp = p => (p === 0 ? "s" : `(${spn(p)})`);
  const quad = (a, w) => `(${ptex([1, -2 * a, a * a + w * w])})`;
  const fr = (n, d) => `\\dfrac{${n}}{${d}}`;
  const ex = p => (p === 0 ? "" : `e^{${p === 1 ? "" : p === -1 ? "-" : tex(p)}t}`);
  const polyR = rs => CX.polyFromRoots(rs.map(r => CX.toC(r))).map(c => c.re);
  const convR = (a, b) => CX.conv(a, b).map(c => c.re);
  const pv = (p, s) => CX.polyval(p, CX.toC(s));
  const term = (pf, p, j = 1) => { const t = pf.terms.find(t => abs(sub(t.p, CX.toC(p))) < 1e-6 && t.j === j); return t ? t.c : C(0); };
  const G = (n, d, s) => div(pv(n, s), pv(d, s));
  const nearR = (a, b, tol = 1e-7) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
  const mat = M => `\\begin{bmatrix}${M.map(r => r.map(x => tex(x)).join("&")).join("\\\\")}\\end{bmatrix}`;
  const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
  const Hn = Object.assign(root.GH, { spn, sp, quad, fr, polyR, convR });

  // ======================= LAPLACE TRANSFORM =======================
  // time-domain building blocks: body (LaTeX), f(t), F(s), and the transform as LaTeX given the coefficient
  function block() {
    const type = R.pick(["const", "exp", "tn", "cos", "sin", "ecos", "esin", "texp"]);
    const c = R.nz(-5, 6), a = R.nz(-4, 2), w = R.int(1, 5), n = R.int(1, 3);
    const cs = c === 1 ? "" : c === -1 ? "-" : tex(c);
    switch (type) {
      case "const": return { c, body: "", f: () => 1, F: s => div(1, s), Ft: fr(tex(c), "s"), amax: 0, name: "the constant (unit step)" };
      case "exp": return { c, body: ex(a), f: t => Math.exp(a * t), F: s => div(1, sub(s, a)), Ft: fr(tex(c), spn(a)), amax: a, name: `\\(e^{at}\\) with \\(a = ${a}\\)` };
      case "tn": return { c, body: n === 1 ? "t" : `t^{${n}}`, f: t => t ** n, F: s => div(fact(n), CX.pow(CX.toC(s), n + 1)), Ft: fr(tex(c * fact(n)), n === 0 ? "s" : `s^{${n + 1}}`), amax: 0, name: `\\(t^n\\): \\(n!/s^{n+1}\\)` };
      case "cos": return { c, body: `\\cos ${w === 1 ? "" : w}t`, f: t => Math.cos(w * t), F: s => div(s, add(mul(s, s), w * w)), Ft: fr(`${cs}s`, `s^2 + ${w * w}`), amax: 0, name: "\\(\\cos\\omega t\\): \\(s/(s^2+\\omega^2)\\)" };
      case "sin": return { c, body: `\\sin ${w === 1 ? "" : w}t`, f: t => Math.sin(w * t), F: s => div(w, add(mul(s, s), w * w)), Ft: fr(tex(c * w), `s^2 + ${w * w}`), amax: 0, name: "\\(\\sin\\omega t\\): \\(\\omega/(s^2+\\omega^2)\\)" };
      case "ecos": return { c, body: `${ex(a)}\\cos ${w === 1 ? "" : w}t`, f: t => Math.exp(a * t) * Math.cos(w * t), F: s => div(sub(s, a), add(mul(sub(s, a), sub(s, a)), w * w)), Ft: fr(`${cs}(${spn(a)})`, `${sp(a)}^2 + ${w * w}`), amax: a, name: "\\(e^{at}\\cos\\omega t\\): \\((s-a)/((s-a)^2+\\omega^2)\\)" };
      case "esin": return { c, body: `${ex(a)}\\sin ${w === 1 ? "" : w}t`, f: t => Math.exp(a * t) * Math.sin(w * t), F: s => div(w, add(mul(sub(s, a), sub(s, a)), w * w)), Ft: fr(tex(c * w), `${sp(a)}^2 + ${w * w}`), amax: a, name: "\\(e^{at}\\sin\\omega t\\): \\(\\omega/((s-a)^2+\\omega^2)\\)" };
      default: return { c, body: `t${ex(a)}`, f: t => t * Math.exp(a * t), F: s => div(1, mul(sub(s, a), sub(s, a))), Ft: fr(tex(c), `${sp(a)}^2`), amax: a, name: "\\(te^{at}\\): \\(1/(s-a)^2\\)" };
    }
  }
  reg("lp-pairs", "Laplace transform pairs", "laplace", () => {
    const k = R.int(2, 3), bs = [];
    while (bs.length < k) { const b = block(); if (!bs.some(x => x.body === b.body)) bs.push(b); }
    const gt = lin(bs.map(b => [b.c, b.body]));
    const amax = Math.max(...bs.map(b => b.amax)), s0 = Math.max(1, Math.floor(amax) + R.int(1, 2));
    const Gs = s => bs.reduce((acc, b) => add(acc, scaleC(b.F(s), b.c)), C(0));
    const val = Gs(C(s0)).re;
    const Gt = bs.map(b => b.Ft).join(" + ").replace(/\+ \\dfrac\{-/g, "- \\dfrac{");
    if (Math.random() < 0.35) {
      const b = bs[0];
      const wrong = [fr(tex(b.c), `${b.amax ? sp(-b.amax) : "s"}`), fr(`${tex(b.c)}s`, "s^2 - 4"), fr(tex(b.c), "s^2")].filter(x => x !== b.Ft);
      const opts = Array.from(new Set(wrong)).slice(0, 3);
      return mc(`<p>Which is the Laplace transform of \\(${lin([[b.c, b.body]])}\\)?</p>`, `\\(${b.Ft}\\)`, opts.map(o => `\\(${o}\\)`),
        `<p>Use the pair for ${b.name}, with linearity: \\(\\mathcal L\\{${lin([[b.c, b.body]])}\\} = ${b.Ft}\\).</p>`);
    }
    return {
      q: `<p>Find the Laplace transform \\(G(s)\\) of \\(g(t) = ${gt}\\) for \\(t \\ge 0\\). To check, enter the value \\(G(${s0})\\).</p>`,
      fields: [fld(`G(${s0})`, val)],
      sol: `<p>The transform is linear, so transform term by term with the table:</p>$$G(s) = ${Gt}.$$<p>${bs.map(b => b.name).join("; ")}.</p><p>At \\(s = ${s0}\\): \\(G(${s0}) \\approx ${num(val)}\\).</p>`,
      verify: () => nearR(CX.integrate(t => Math.exp(-s0 * t) * bs.reduce((a, b) => a + b.c * b.f(t), 0), 0, 60, 6000).re, val, 1e-6),
    };
  });
  const scaleC = (z, k) => CX.scale(CX.toC(z), k);

  reg("lp-props", "Laplace properties", "laplace", () => {
    const v = R.int(0, 5);
    if (v === 0) { // derivative rule
      const a = R.nz(-4, 3), c = R.nz(-4, 5), s0 = Math.max(1, a + R.int(1, 3));
      const G0 = c / (s0 - a), ans = s0 * G0 - c;
      return { q: `<p>Let \\(g(t) = ${lin([[c, ex(a)]])}\\). Use the derivative rule \\(\\mathcal L\\{\\dot g\\} = sG(s) - g(0)\\) to find \\(\\mathcal L\\{\\dot g\\}\\), and enter its value at \\(s = ${s0}\\).</p>`,
        fields: [fld(`L{ġ}(${s0})`, ans)],
        sol: `<p>\\(G(s) = ${fr(tex(c), spn(a))}\\) and \\(g(0) = ${c}\\), so \\(sG(s) - g(0) = ${fr(`${tex(c)}s`, spn(a))} - ${tex(c)} = ${fr(tex(c * a), spn(a))}\\). This matches \\(\\dot g = ${lin([[c * a, ex(a)]])}\\). At \\(s=${s0}\\): \\(${num(ans)}\\).</p>`,
        verify: () => nearR(ans, c * a / (s0 - a)) };
    }
    if (v === 1) { // integral rule
      const w = R.int(1, 4), c = R.nz(-3, 4), s0 = R.int(1, 3), ans = c * w / (s0 * s0 + w * w) / s0;
      return { q: `<p>Find \\(\\mathcal L\\left\\{\\int_0^t ${lin([[c, `\\sin ${w}x`]])}\\,dx\\right\\}\\) and enter its value at \\(s = ${s0}\\).</p>`, fields: [fld(`value at s = ${s0}`, ans)],
        sol: `<p>Integration divides by \\(s\\): \\(\\mathcal L\\{\\int_0^t g\\} = G(s)/s = ${fr(tex(c * w), `s(s^2 + ${w * w})`)}\\), which is \\(${num(ans)}\\) at \\(s = ${s0}\\).</p>`,
        verify: () => nearR(CX.integrate(t => Math.exp(-s0 * t) * c * (1 - Math.cos(w * t)) / w, 0, 60, 6000).re, ans, 1e-6) };
    }
    if (v === 2) { // delay
      const a = R.int(1, 4), t0 = R.int(1, 3), s0 = R.int(1, 2), ans = Math.exp(-s0 * t0) / (s0 + a);
      return { q: `<p>Find the Laplace transform of \\(g(t) = e^{-${a}(t-${t0})}\\,1_+(t-${t0})\\) (zero before \\(t = ${t0}\\)), and enter its value at \\(s = ${s0}\\).</p>`, fields: [fld(`G(${s0})`, ans)],
        sol: `<p>Shifting rule: \\(\\mathcal L\\{f(t-t_0)1_+(t-t_0)\\} = e^{-st_0}F(s)\\) with \\(f = ${ex(-a)}\\). So \\(G(s) = ${fr(`e^{-${t0}s}`, `s + ${a}`)}\\), and \\(G(${s0}) = e^{-${s0 * t0}}/${s0 + a} \\approx ${num(ans)}\\).</p>`,
        verify: () => nearR(CX.integrate(t => Math.exp(-s0 * t) * Math.exp(-a * (t - t0)), t0, 80, 6000).re, ans, 1e-6) };
    }
    if (v === 3) { // convolution
      const [a, b] = R.distinct(2, -4, -1), t1 = R.pick([1, 2]), ans = (Math.exp(a * t1) - Math.exp(b * t1)) / (a - b);
      return { q: `<p>Compute the convolution \\((g\\otimes u)(t) = \\int_0^t g(t-\\sigma)u(\\sigma)\\,d\\sigma\\) for \\(g = ${ex(a)}\\) and \\(u = ${ex(b)}\\), using Laplace transforms. Enter its value at \\(t = ${t1}\\).</p>`,
        fields: [fld(`(g⊗u)(${t1})`, ans)],
        sol: `<p>\\(\\mathcal L\\{g\\otimes u\\} = G(s)U(s) = ${fr("1", `${sp(a)}${sp(b)}`)} = ${fr(tex(1 / (a - b)), spn(a))} + ${fr(tex(1 / (b - a)), spn(b))}\\). So \\((g\\otimes u)(t) = ${fr(`${ex(a)} - ${ex(b)}`, tex(a - b))}\\), which is \\(${num(ans)}\\) at \\(t = ${t1}\\).</p>`,
        verify: () => nearR(CX.integrate(sg => Math.exp(a * (t1 - sg)) * Math.exp(b * sg), 0, t1, 400).re, ans, 1e-8) };
    }
    if (v === 4) { // multiplication by e^{at}
      const a = R.nz(-4, 3), w = R.int(1, 5);
      const right = `${fr(`${w}`, `${sp(a)}^2 + ${w * w}`)}`;
      return mc(`<p>Given \\(\\mathcal L\\{\\sin ${w}t\\} = ${fr(w, `s^2+${w * w}`)}\\), what is \\(\\mathcal L\\{${ex(a)}\\sin ${w}t\\}\\)?</p>`, `\\(${right}\\)`,
        [`\\(${fr(w, `${sp(-a)}^2 + ${w * w}`)}\\)`, `\\(${fr(`${w}`, `s^2 + ${w * w}`)}\\cdot${fr(1, spn(a))}\\)`, `\\(${fr(`${sp(a)}`, `${sp(a)}^2 + ${w * w}`)}\\)`],
        `<p>Multiplying by \\(e^{at}\\) replaces \\(s\\) by \\(s - a\\): \\(\\mathcal L\\{e^{at}g\\} = G(s-a)\\). With \\(a = ${a}\\), \\(s \\to ${spn(a)}\\).</p>`);
    }
    const t0 = R.int(1, 3);
    return mc(`<p>What is the Laplace transform of \\(g(t) = e^{-(t-${t0})}\\) for \\(t \\ge 0\\) (no step function)?</p>`, `\\(${fr(`e^{${t0}}`, "s+1")}\\)`,
      [`\\(${fr(`e^{-${t0}s}`, "s+1")}\\)`, `\\(${fr(1, `s+1`)}\\)`, `\\(${fr(`e^{-${t0}}`, "s+1")}\\)`],
      `<p>\\(e^{-(t-${t0})} = e^{${t0}}e^{-t}\\) for all \\(t\\ge0\\), so the transform is \\(e^{${t0}}/(s+1)\\). The shift rule \\(e^{-st_0}G(s)\\) applies only to \\(g(t-t_0)1_+(t-t_0)\\), which is zero on \\([0,t_0)\\). This is the warning example in the notes.</p>`);
  });

  // ======================= PARTIAL FRACTIONS & ODEs =======================
  function numFor(poles, deg) { // random integer numerator of given degree, nonzero at every pole
    for (let tries = 0; tries < 50; tries++) {
      const p = Array.from({ length: deg + 1 }, (_, i) => (i === 0 ? R.nz(-4, 6) : R.int(-6, 9)));
      if (poles.every(q => abs(pv(p, q)) > 1e-9)) return p;
    }
    return [1];
  }
  reg("pf-real", "Partial fractions: distinct real poles", "inverse-laplace", () => {
    const n = R.pick([2, 3, 3]), poles = R.distinct(n, -6, 1).sort((a, b) => b - a);
    const nm = numFor(poles, R.int(0, n - 1)), den = polyR(poles), pf = CX.residues(nm, den);
    const res = poles.map(p => term(pf, p).re);
    const den2 = poles.map(sp).join("");
    return {
      q: `<p>Find the partial fraction expansion and the inverse Laplace transform of</p>$$G(s) = ${fr(ptex(nm), den2)}.$$<p>Enter the coefficient of each term.</p>`,
      fields: poles.map((p, i) => fld(`coefficient of \\(\\frac{1}{${spn(p)}}\\)`, res[i])),
      sol: `<p>Cover-up: \\(a_j = [G(s)(s - \\lambda_j)]_{s=\\lambda_j}\\).</p>${poles.map((p, i) => `$$a_{${i + 1}} = \\left[${fr(ptex(nm), poles.filter(q => q !== p).map(sp).join("") || "1")}\\right]_{s=${p}} = ${fr(num(pv(nm, p).re), num(poles.filter(q => q !== p).reduce((a, q) => a * (p - q), 1)))} = ${tex(res[i])}$$`).join("")}<p>So</p>$$G(s) = ${poles.map((p, i) => fr(tex(res[i]), spn(p))).join(" + ").replace(/\+ \\dfrac\{-/g, "- \\dfrac{")},\\qquad g(t) = ${lin(poles.map((p, i) => [res[i], ex(p)]))}.$$<p>In MATLAB: <code>[r,p] = residue([${nm.join(" ")}], [${den.map(x => num(x)).join(" ")}])</code>.</p>`,
      verify: () => [0.37, 2.1].every(s => CX.near(G(nm, den, C(s)), poles.reduce((a, p, i) => add(a, div(res[i], s - p)), C(0)), 1e-9)),
    };
  });
  reg("pf-complex", "Partial fractions: complex poles", "inverse-laplace", () => {
    const a = R.int(-3, 0), w = R.int(1, 3), hasReal = Math.random() < 0.65, p = R.int(-4, 0);
    const lam = C(a, w);
    const den = hasReal ? convR([1, -p], [1, -2 * a, a * a + w * w]) : [1, -2 * a, a * a + w * w];
    const poleList = hasReal ? [C(p), lam, CX.conj(lam)] : [lam, CX.conj(lam)];
    const nm = numFor(poleList, R.int(0, hasReal ? 1 : 1));
    const pf = CX.residues(nm, den), g = term(pf, lam), A = hasReal ? term(pf, p).re : 0;
    const B = 2 * g.re, Cc = -2 * g.im;
    const fields = [fld(`residue γ at \\(${ctex(lam)}\\)`, g, "cx")];
    if (hasReal) fields.push(fld(`A (coefficient of \\(${ex(p) || "1"}\\))`, A));
    fields.push(fld(`B (of \\(${ex(a)}\\cos ${w === 1 ? "" : w}t\\))`, B), fld(`C (of \\(${ex(a)}\\sin ${w === 1 ? "" : w}t\\))`, Cc));
    return {
      q: `<p>Let</p>$$G(s) = ${fr(ptex(nm), `${hasReal ? sp(p) : ""}${quad(a, w)}`)}.$$<p>Find the residue \\(\\gamma\\) at the pole \\(${ctex(lam)}\\), and write \\(g(t) = ${hasReal ? `A${ex(p)} + ` : ""}${ex(a)}\\big(B\\cos ${w === 1 ? "" : w}t + C\\sin ${w === 1 ? "" : w}t\\big)\\).</p>`,
      fields,
      sol: `<p>The quadratic has roots \\(${a} \\pm ${w === 1 ? "" : w}i\\). ${hasReal ? `The real pole gives \\(A = [G(s)${sp(p)}]_{s=${p}} = ${tex(A)}\\). ` : ""}For the complex pole, cover up its own factor:</p>$$\\gamma = \\left[${fr(ptex(nm), `${hasReal ? sp(p) : ""}(s - (${ctex(CX.conj(lam))}))`)}\\right]_{s = ${ctex(lam)}} = ${ctex(g)}.$$<p>The conjugate pole has residue \\(\\bar\\gamma\\). By Lemma 1 of the notes, \\(\\frac{\\gamma}{s-a-i\\omega} + \\frac{\\bar\\gamma}{s-a+i\\omega} \\to 2\\Re(\\gamma)e^{at}\\cos\\omega t - 2\\Im(\\gamma)e^{at}\\sin\\omega t\\). So \\(B = 2\\Re\\gamma = ${tex(B)}\\) and \\(C = -2\\Im\\gamma = ${tex(Cc)}\\).</p>`,
      verify: () => [0.5, 1.7].every(t => nearR(A * Math.exp(p * t) * (hasReal ? 1 : 0) + Math.exp(a * t) * (B * Math.cos(w * t) + Cc * Math.sin(w * t)), CX.invLaplaceAt(pf, t), 1e-8)),
    };
  });
  reg("pf-repeated", "Partial fractions: repeated poles", "inverse-laplace", () => {
    const [p, q] = R.distinct(2, -4, 0);
    const den = convR(polyR([p, p]), [1, -q]), nm = numFor([p, q], R.int(0, 2));
    const pf = CX.residues(nm, den);
    const c2 = term(pf, p, 2).re, c1 = term(pf, p, 1).re, d = term(pf, q, 1).re;
    const np = pv(nm, p).re, ndp = pv(CX.polyDeriv(nm.map(x => C(x))), p).re;
    return {
      q: `<p>Find the partial fraction expansion of</p>$$G(s) = ${fr(ptex(nm), `${sp(p)}^2${sp(q)}`)} = ${fr("c_2", `${sp(p)}^2`)} + ${fr("c_1", spn(p))} + ${fr("d", spn(q))},$$<p>and hence \\(g(t) = c_2t${ex(p)} + c_1${ex(p)} + d${ex(q)}\\).</p>`,
      fields: [fld("c₂", c2), fld("c₁", c1), fld("d", d)],
      sol: `<p>\\(d = [G(s)${sp(q)}]_{s=${q}} = ${fr(num(pv(nm, q).re), num((q - p) ** 2))} = ${tex(d)}\\). Multiply by \\(${sp(p)}^2\\): \\(h(s) = ${fr(ptex(nm), spn(q))}\\). Then \\(c_2 = h(${p}) = ${tex(c2)}\\) and \\(c_1 = h'(${p}) = \\frac{n'(${p})(${p} - (${q})) - n(${p})}{(${p} - (${q}))^2} = \\frac{${num(ndp)}\\cdot${p - q} - (${num(np)})}{${(p - q) ** 2}} = ${tex(c1)}\\).</p><p>(Equivalently, subtract the \\(c_2\\) term and use cover-up again, as in the notes.) So \\(g(t) = ${lin([[c2, `t${ex(p)}`], [c1, ex(p)], [d, ex(q)]])}\\).</p>`,
      verify: () => [0.3, 2.2].every(s => CX.near(G(nm, den, C(s)), C(c2 / (s - p) ** 2 + c1 / (s - p) + d / (s - q)), 1e-9)),
    };
  });
  reg("pf-proper", "Proper G(s): direct term and δ(t)", "inverse-laplace", () => {
    const [p1, p2] = R.distinct(2, -5, 0).sort((a, b) => b - a), b2 = R.nz(-3, 4);
    const nm = [b2, R.int(-6, 8), R.int(-6, 8)], den = polyR([p1, p2]);
    if ([p1, p2].some(p => Math.abs(pv(nm, p).re) < 1e-9)) return null;
    const pf = CX.residues(nm, den), r1 = term(pf, p1).re, r2 = term(pf, p2).re;
    return {
      q: `<p>\\(G(s) = ${fr(ptex(nm), `${sp(p1)}${sp(p2)}`)}\\) has numerator and denominator of the same degree. Write \\(G(s) = k + ${fr("r_1", spn(p1))} + ${fr("r_2", spn(p2))}\\) and \\(g(t) = k\\,\\delta(t) + r_1${ex(p1) || "\\cdot1"} + r_2${ex(p2) || "\\cdot1"}\\).</p>`,
      fields: [fld("k", b2), fld("r₁", r1), fld("r₂", r2)],
      sol: `<p>The direct term is \\(k = G(\\infty) = ${b2}\\) (ratio of leading coefficients). Cover-up gives \\(r_1 = [G(s)${sp(p1)}]_{s=${p1}} = ${tex(r1)}\\) and \\(r_2 = [G(s)${sp(p2)}]_{s=${p2}} = ${tex(r2)}\\). The constant \\(k\\) transforms back to \\(k\\delta(t)\\): \\(g(t) = ${tex(b2)}\\delta(t) + ${lin([[r1, ex(p1)], [r2, ex(p2)]])}\\). MATLAB's <code>[r,p,k] = residue(num,den)</code> returns the same \\(k\\).</p>`,
      verify: () => CX.near(pf.k, C(b2)) && CX.near(G(nm, den, C(0.7)), C(b2 + r1 / (0.7 - p1) + r2 / (0.7 - p2)), 1e-9),
    };
  });
  reg("pf-ode", "Solving ODEs with Laplace", "inverse-laplace", () => {
    if (Math.random() < 0.3) { // first order with exponential forcing
      const a = R.int(1, 5), b = R.nz(-4, 2), c = R.nz(-6, 6), y0 = R.int(-4, 4);
      if (b === -a) return null;
      const B = c / (b + a), A = y0 - B;
      return { q: `<p>Solve \\(\\dot y + ${a}y = ${lin([[c, ex(b)]])}\\), \\(y(0) = ${y0}\\), in the form \\(y(t) = A${ex(-a)} + B${ex(b)}\\).</p>`, fields: [fld("A", A), fld("B", B)],
        sol: `<p>Transform: \\(sY - ${y0} + ${a}Y = ${fr(tex(c), spn(b))}\\), so \\(Y = ${fr(y0, `s+${a}`)} + ${fr(tex(c), `(s+${a})${sp(b)}`)}\\). Cover-up on the second term: \\(B = ${fr(c, `${b}+${a}`)} = ${tex(B)}\\), and its \\(1/(s+${a})\\) part is \\(-B\\). So \\(A = ${y0} - B = ${tex(A)}\\).</p>`,
        verify: () => nearR(A + B, y0) && nearR(-a * A + b * B + a * (A + B), c) };
    }
    const [p1, p2] = R.distinct(2, -5, -1).sort((x, y) => y - x), a1 = -(p1 + p2), a0 = p1 * p2;
    const yf = R.int(-3, 4), c = a0 * yf, y0 = R.int(-3, 4), y1 = R.int(-8, 8);
    if (!c && !y0 && !y1) return null;
    // Y = (y0 s^2 + (y1 + a1 y0) s + c) / (s (s-p1)(s-p2))
    const nm = [y0, y1 + a1 * y0, c], den = convR([1, 0], polyR([p1, p2]));
    const pf = CX.residues(nm, den), A = term(pf, 0).re, B = term(pf, p1).re, Cc = term(pf, p2).re;
    return {
      q: `<p>Solve \\(\\ddot y + ${a1}\\dot y + ${a0}y = ${c}\\) with \\(y(0) = ${y0}\\), \\(\\dot y(0) = ${y1}\\). Write \\(y(t) = A + B${ex(p1)} + C${ex(p2)}\\).</p>`,
      fields: [fld("A", A), fld("B", B), fld("C", Cc)],
      sol: `<p>Transform with \\(\\mathcal L\\{\\ddot y\\} = s^2Y - sy(0) - \\dot y(0)\\) and \\(\\mathcal L\\{\\dot y\\} = sY - y(0)\\):</p>$$(s^2 + ${a1}s + ${a0})Y = ${lin([[y0, "s"], [y1 + a1 * y0, ""]])} + ${fr(c, "s")} \\;\\Rightarrow\\; Y(s) = ${fr(ptex(nm), `s${sp(p1)}${sp(p2)}`)}.$$<p>Cover-up: \\(A = [sY]_{s=0} = ${tex(A)}\\) (the final value \\(${c}/${a0}\\)), \\(B = [Y${sp(p1)}]_{s=${p1}} = ${tex(B)}\\), \\(C = [Y${sp(p2)}]_{s=${p2}} = ${tex(Cc)}\\). Check: \\(A + B + C = ${tex(A + B + Cc)} = y(0)\\). ✓</p>`,
      verify: () => nearR(A + B + Cc, y0) && nearR(p1 * B + p2 * Cc, y1) && nearR(a0 * A, c),
    };
  });

  // ======================= TRANSFER FUNCTIONS =======================
  reg("tf-ode", "Transfer function of an ODE", "transfer-functions", () => {
    const n = R.pick([2, 3]), a = Array.from({ length: n }, () => R.int(-3, 9)); a[n - 1] = R.nz(1, 9);
    const b1 = R.int(0, 3), b0 = R.nz(-5, 8);
    const lhs = lin([[1, `y^{(${n})}`.replace("y^{(2)}", "\\ddot y").replace("y^{(3)}", "y^{(3)}")], ...a.map((c, i) => { const k = n - 1 - i; return [c, k === 2 ? "\\ddot y" : k === 1 ? "\\dot y" : "y"]; })]);
    const rhs = lin([[b1, "\\dot u"], [b0, "u"]]);
    const den = [1, ...a], nmr = b1 ? [b1, b0] : [b0];
    const Gt = fr(ptex(nmr), ptex(den));
    if (Math.random() < 0.5) {
      const wrong = [fr(ptex(den), ptex(nmr)), fr(tex(b0), ptex(den)), fr(ptex(nmr), ptex([1, ...a.map((c, i) => (i === a.length - 1 ? c : -c))]))].filter(x => x !== Gt);
      return mc(`<p>What is the transfer function \\(G = Y/U\\) of \\(${lhs} = ${rhs}\\)?</p>`, `\\(${Gt}\\)`, Array.from(new Set(wrong)).slice(0, 3).map(x => `\\(${x}\\)`),
        `<p>Set all initial conditions to zero and transform: each derivative becomes a power of \\(s\\). Then \\((${ptex(den)})Y = (${ptex(nmr)})U\\), so \\(G(s) = ${Gt}\\).</p>`);
    }
    const g0 = b0 / a[n - 1], s1 = C(1), g1 = G(nmr, den, s1).re;
    if (!isFinite(g1)) return null;
    return { q: `<p>For \\(${lhs} = ${rhs}\\), find the transfer function \\(G(s) = Y(s)/U(s)\\). Enter its DC gain \\(G(0)\\) and the value \\(G(1)\\).</p>`,
      fields: [fld("G(0)", g0), fld("G(1)", g1)],
      sol: `<p>Zero initial conditions: \\((${ptex(den)})Y = (${ptex(nmr)})U\\), so \\(G(s) = ${Gt}\\). Then \\(G(0) = ${fr(b0, a[n - 1])} = ${tex(g0)}\\) and \\(G(1) = ${fr(b1 + b0, den.reduce((x, y) => x + y, 0))} = ${tex(g1)}\\).</p>`,
      verify: () => nearR(g1, (b1 + b0) / den.reduce((x, y) => x + y, 0)) };
  });
  reg("tf-stability", "Stability and the final value theorem", "transfer-functions", () => {
    const parts = [], poles = [];
    const nReal = R.int(1, 2);
    for (let i = 0; i < nReal; i++) { const p = R.pick([-5, -4, -3, -2, -1, -1, 0, 1, 2]); parts.push(sp(p)); poles.push(C(p)); }
    if (Math.random() < 0.7) { const a = R.pick([-3, -2, -1, -1, 0, 1]), w = R.int(1, 3); parts.push(quad(a, w)); poles.push(C(a, w), C(a, -w)); }
    const z = R.int(-5, 5), K = R.nz(1, 12), u0 = R.nz(-4, 6);
    const stable = poles.every(p => p.re < -1e-12);
    const den = poles.reduce((acc, p) => CX.conv(acc, [C(1), CX.neg(p)]), [C(1)]).map(c => c.re);
    const nmr = [K, -K * z];
    const g0 = G(nmr, den, C(0)).re, yinf = g0 * u0;
    if (poles.some(p => abs(sub(p, C(z))) < 1e-9)) return null;
    const Gtex = fr(z === 0 ? `${K === 1 ? "" : K}s` : `${K === 1 ? "" : K}(${spn(z)})`, parts.join(""));
    const correct = stable ? `Stable; \\(y(\\infty) = ${tex(yinf)}\\)` : "Unstable; \\(y(\\infty)\\) is not defined";
    const wrong = stable ? [`Stable; \\(y(\\infty) = ${tex(u0)}\\)`, "Unstable; \\(y(\\infty)\\) is not defined", `Stable; \\(y(\\infty) = ${tex(-yinf)}\\)`, "Stable; \\(y(\\infty) = 0\\)"]
      : [isFinite(yinf) ? `Stable; \\(y(\\infty) = ${tex(yinf)}\\)` : `Stable; \\(y(\\infty) = \\infty\\)`, `Stable; \\(y(\\infty) = ${tex(u0)}\\)`, "Stable; \\(y(\\infty) = 0\\)"];
    const opts = Array.from(new Set(wrong.filter(w => w !== correct))).slice(0, 3);
    return mc(`<p>\\(G(s) = ${Gtex}\\) is driven by the constant input \\(u(t) = ${u0}\\) with zero initial conditions. Is \\(G\\) stable, and what is \\(y(\\infty)\\)?</p>`, correct, opts,
      `<p>The poles are \\(${poles.map(p => ctex(p)).join(",\\ ")}\\). ${stable ? `All lie in the open left half-plane, so \\(G\\) is stable and the final value theorem gives \\(y(\\infty) = G(0)u_0 = ${tex(g0)}\\cdot${u0} = ${tex(yinf)}\\).` : `At least one pole has \\(\\Re\\lambda \\ge 0\\), so \\(G\\) is not stable. The final value theorem does not apply: the output grows, or (for poles on the imaginary axis) oscillates without settling, or (for a pole at 0 together with the step's own pole) ramps.`}</p>`);
  });
  reg("tf-circuit", "Circuits and impedance", "transfer-functions", () => {
    const v = R.int(0, 3);
    if (v === 0) { // series RLC, output across C/R/L
      const Lv = R.pick([1, 1, 2]), Cv = R.pick([0.5, 0.25, 0.2, 0.1, 1]), Rv = R.pick([1, 2, 3, 4, 6]), V0 = R.pick([5, 10, 12]);
      const out = R.pick(["C", "R", "L"]);
      const den = [Lv * Cv, Rv * Cv, 1], rs = CX.roots(den), lam = rs.reduce((a, b) => (b.im > a.im ? b : a));
      const yinf = out === "C" ? V0 : 0;
      const nmr = { C: "1", R: `${tex(Rv * Cv)}s`, L: `${tex(Lv * Cv)}s^2` }[out];
      return { q: `<p>A series loop has a voltage source \\(u\\), a resistor \\(R = ${Rv}\\,\\Omega\\), an inductor \\(L = ${Lv}\\) H and a capacitor \\(C = ${Cv}\\) F. The output \\(y\\) is the voltage across the ${{ C: "capacitor", R: "resistor", L: "inductor" }[out]}. Find the pole with the larger imaginary part (enter real and imaginary parts), and \\(y(\\infty)\\) when \\(u(t) = ${V0}\\) V.</p>`,
        fields: [fld("Re λ", lam.re), fld("Im λ", lam.im), fld("y(∞) (V)", yinf)],
        sol: `<p>Impedances add in series: \\(R + Ls + \\frac1{Cs}\\), so \\(I = \\frac{Cs\\,U}{LCs^2 + RCs + 1}\\) and the output is \\(Z_{\\text{out}}I\\):</p>$$G(s) = ${fr(nmr, ptex(den))}.$$<p>Poles: roots of \\(${ptex(den)}\\), i.e. \\(${ctex(lam)}\\)${Math.abs(lam.im) > 1e-9 ? ` and its conjugate (underdamped: oscillates at ${num(lam.im)} rad/s, decays like \\(e^{${num(lam.re)}t}\\))` : " (both real: no oscillation)"}. Stable, so \\(y(\\infty) = G(0)\\cdot${V0} = ${yinf}\\) V. ${out === "C" ? "At steady state no current flows, so the whole source voltage sits on the capacitor." : "At steady state the current is zero, so there is no voltage across R or L."}</p>`,
        verify: () => abs(pv(den, lam)) < 1e-9 };
    }
    if (v === 1) { // impedance combination at s0
      const Rv = R.int(1, 5), Lv = R.int(1, 3), Cv = R.pick([0.5, 0.25, 1]), s0 = R.int(1, 3), k = R.int(0, 2);
      const ZR = Rv, ZL = Lv * s0, ZC = 1 / (Cv * s0), par = (a, b) => a * b / (a + b);
      const [desc, val, formula] = [
        [`a resistor \\(R = ${Rv}\\) in series with an inductor \\(L = ${Lv}\\) and capacitor \\(C = ${Cv}\\) in parallel`, ZR + par(ZL, ZC), `R + \\frac{Ls\\cdot\\frac1{Cs}}{Ls + \\frac1{Cs}} = R + \\frac{Ls}{LCs^2 + 1}`],
        [`a resistor \\(R = ${Rv}\\) and a capacitor \\(C = ${Cv}\\) in parallel, in series with an inductor \\(L = ${Lv}\\)`, ZL + par(ZR, ZC), `Ls + \\frac{R}{RCs + 1}`],
        [`a resistor \\(R = ${Rv}\\), inductor \\(L = ${Lv}\\) and capacitor \\(C = ${Cv}\\) all in parallel`, 1 / (1 / ZR + 1 / ZL + 1 / ZC), `\\left(\\frac1R + \\frac1{Ls} + Cs\\right)^{-1} = \\frac{RLs}{RLCs^2 + Ls + R}`],
      ][k];
      return { q: `<p>Find the impedance \\(Z(s)\\) of ${desc}, and enter \\(Z(${s0})\\).</p>`, fields: [fld(`Z(${s0})`, val)],
        sol: `<p>Impedances: \\(Z_R = R\\), \\(Z_L = Ls\\), \\(Z_C = 1/(Cs)\\). Series impedances add; parallel ones combine as \\((1/Z_1 + 1/Z_2)^{-1}\\).</p>$$Z(s) = ${formula},\\qquad Z(${s0}) \\approx ${num(val)}.$$`,
        verify: () => isFinite(val) };
    }
    if (v === 2) { // divider R1 with (R2 || C)
      const R1 = R.int(1, 4), R2 = R.int(1, 4), Cv = R.pick([0.5, 0.25, 1, 2]);
      const pole = -(R1 + R2) / (R1 * R2 * Cv), g0 = R2 / (R1 + R2);
      return { q: `<p>A source \\(u\\) drives a resistor \\(R_1 = ${R1}\\) in series with the parallel pair \\(R_2 = ${R2}\\), \\(C = ${Cv}\\). The output \\(y\\) is the voltage across the parallel pair. Find \\(G(0)\\) and the pole of \\(G(s)\\).</p>`,
        fields: [fld("G(0)", g0), fld("pole", pole)],
        sol: `<p>Voltage divider: \\(G = \\frac{Z_2}{Z_1 + Z_2}\\) with \\(Z_1 = R_1\\), \\(Z_2 = \\frac{R_2}{R_2Cs + 1}\\). So</p>$$G(s) = \\frac{R_2}{R_1R_2Cs + R_1 + R_2} = ${fr(R2, ptex([R1 * R2 * Cv, R1 + R2]))}.$$<p>\\(G(0) = \\frac{R_2}{R_1+R_2} = ${tex(g0)}\\) (the capacitor is an open circuit at DC). The pole is \\(-\\frac{R_1+R_2}{R_1R_2C} = ${tex(pole)}\\).</p>`,
        verify: () => nearR(R1 * R2 * Cv * pole + R1 + R2, 0) && nearR(R2 / (R1 + R2), g0) };
    }
    return mc("<p>Which list gives the impedances of a resistor, an inductor and a capacitor?</p>", "\\(R,\\quad Ls,\\quad \\dfrac{1}{Cs}\\)",
      ["\\(R,\\quad \\dfrac1{Ls},\\quad Cs\\)", "\\(\\dfrac1R,\\quad Ls,\\quad Cs\\)", "\\(R,\\quad L,\\quad C\\)"],
      "<p>\\(v = Ri\\), \\(v = L\\,di/dt\\) and \\(i = C\\,dv/dt\\). In the \\(s\\)-domain with zero initial conditions these give \\(V = RI\\), \\(V = LsI\\) and \\(V = I/(Cs)\\).</p>");
  });
  reg("tf-msd", "Mass–spring–damper", "transfer-functions", () => {
    const m = R.pick([1, 1, 2]), k = R.pick([2, 4, 5, 8, 10, 13]) * m, c = R.pick([1, 2, 3, 4, 6]) * m, u0 = R.nz(1, 10);
    const den = [m, c, k], rs = CX.roots(den), lam = rs.reduce((a, b) => (b.im > a.im ? b : a));
    const wn = Math.sqrt(k / m), zeta = c / (2 * Math.sqrt(m * k));
    const v = R.int(0, 1);
    if (v === 0) return { q: `<p>A mass \\(m = ${m}\\) kg on a spring \\(k = ${k}\\) N/m with damper \\(c = ${c}\\) N·s/m obeys \\(m\\ddot y + c\\dot y + ky = u\\). A constant force \\(u = ${u0}\\) N is applied from rest. Find \\(y(\\infty)\\), the natural frequency \\(\\omega_n = \\sqrt{k/m}\\), and the damping ratio \\(\\zeta = c/(2\\sqrt{mk})\\).</p>`,
      fields: [fld("y(∞) (m)", u0 / k), fld("ωn (rad/s)", wn), fld("ζ", zeta)],
      sol: `<p>\\(G(s) = \\frac{1}{ms^2 + cs + k} = ${fr(1, ptex(den))}\\). It is stable (all coefficients positive), so \\(y(\\infty) = G(0)u_0 = u_0/k = ${tex(u0 / k)}\\) m. \\(\\omega_n = \\sqrt{${k}/${m}} = ${num(wn)}\\), \\(\\zeta = ${c}/(2\\sqrt{${m * k}}) = ${num(zeta)}\\) (${zeta < 1 ? "underdamped: it oscillates" : zeta === 1 ? "critically damped" : "overdamped: no oscillation"}).</p>`,
      verify: () => nearR(lam.re * lam.re + lam.im * lam.im, zeta < 1 ? wn * wn : lam.re * lam.re) };
    return { q: `<p>For \\(${m === 1 ? "" : m}\\ddot y + ${c}\\dot y + ${k}y = u\\), find the poles of \\(G(s)\\). Enter the one with the larger imaginary part (or the larger real part, if both are real).</p>`,
      fields: [fld("Re λ", lam.re), fld("Im λ", Math.max(0, lam.im))],
      sol: `<p>\\(G(s) = ${fr(1, ptex(den))}\\). The quadratic formula gives \\(\\lambda = \\frac{-${c} \\pm\\sqrt{${c * c} - ${4 * m * k}}}{${2 * m}}\\), so \\(\\lambda = ${rs.map(r => ctex(r)).join(",\\ ")}\\). ${Math.abs(lam.im) > 1e-9 ? `The response oscillates at \\(|\\Im\\lambda| = ${num(lam.im)}\\) rad/s and decays like \\(e^{${num(lam.re)}t}\\).` : "Both poles are real, so there is no oscillation."}</p>`,
      verify: () => abs(pv(den, lam)) < 1e-8 };
  });
  reg("tf-response", "Impulse and step responses", "transfer-functions", () => {
    if (Math.random() < 0.45) { // impulse of underdamped 2nd order
      const a = R.int(-3, -1), w = R.int(1, 4), K = R.nz(1, 10);
      return { q: `<p>Find the impulse response of \\(G(s) = ${fr(K, quad(a, w))}\\) in the form \\(g(t) = Me^{-\\sigma t}\\sin(\\omega t)\\).</p>`,
        fields: [fld("M", K / w), fld("σ", -a), fld("ω", w)],
        sol: `<p>Complete the square: \\(${ptex([1, -2 * a, a * a + w * w])} = ${sp(a)}^2 + ${w * w}\\). Then \\(G(s) = ${fr(tex(K / w) + `\\cdot ${w}`, `${sp(a)}^2 + ${w}^2`)}\\), and \\(\\mathcal L\\{e^{at}\\sin\\omega t\\} = \\frac{\\omega}{(s-a)^2+\\omega^2}\\) gives \\(g(t) = ${tex(K / w)}${ex(a)}\\sin ${w}t\\).</p>`,
        verify: () => nearR(CX.invLaplaceAt(CX.residues([K], [1, -2 * a, a * a + w * w]), 0.8), K / w * Math.exp(a * 0.8) * Math.sin(w * 0.8), 1e-8) };
    }
    const [p1, p2] = R.distinct(2, -5, -1).sort((x, y) => y - x), K = R.nz(1, 12), u0 = R.nz(1, 6);
    const den = convR([1, 0], polyR([p1, p2])), pf = CX.residues([K * u0], den);
    const A = term(pf, 0).re, B = term(pf, p1).re, Cc = term(pf, p2).re;
    return { q: `<p>\\(G(s) = ${fr(K, `${sp(p1)}${sp(p2)}`)}\\) is driven by the step \\(u(t) = ${u0}\\) from rest. Write the output as \\(y(t) = A + B${ex(p1)} + C${ex(p2)}\\).</p>`,
      fields: [fld("A", A), fld("B", B), fld("C", Cc)],
      sol: `<p>\\(Y(s) = G(s)\\frac{${u0}}{s} = ${fr(K * u0, `s${sp(p1)}${sp(p2)}`)}\\). Cover-up: \\(A = G(0)\\cdot${u0} = ${tex(A)}\\) (the final value), \\(B = \\left[${fr(K * u0, `s${sp(p2)}`)}\\right]_{s=${p1}} = ${tex(B)}\\), \\(C = \\left[${fr(K * u0, `s${sp(p1)}`)}\\right]_{s=${p2}} = ${tex(Cc)}\\). Check: \\(y(0) = A + B + C = 0\\). ✓</p>`,
      verify: () => nearR(A + B + Cc, 0, 1e-9) && nearR(A, K * u0 / (p1 * p2)) };
  });

  // ======================= STATE SPACE =======================
  function intA() { // integer 2x2 matrix with integer eigenvalues l1 > l2, plus P with A = P diag P^{-1}
    const [l1, l2] = R.distinct(2, -5, 1).sort((a, b) => b - a), k = R.nz(-2, 2);
    const P = R.sign() > 0 ? [[1, k], [0, 1]] : [[1, 0], [k, 1]];
    const Pi = P[0][1] ? [[1, -P[0][1]], [0, 1]] : [[1, 0], [-P[1][0], 1]];
    const Dg = [[l1, 0], [0, l2]];
    const mm = (X, Y) => [[X[0][0] * Y[0][0] + X[0][1] * Y[1][0], X[0][0] * Y[0][1] + X[0][1] * Y[1][1]], [X[1][0] * Y[0][0] + X[1][1] * Y[1][0], X[1][0] * Y[0][1] + X[1][1] * Y[1][1]]];
    return { A: mm(mm(P, Dg), Pi), P, Pi, l1, l2 };
  }
  reg("ss-tf", "State space → transfer function", "state-space", () => {
    const useInt = Math.random() < 0.5;
    const A = useInt ? intA().A : [[R.int(-4, 3), R.int(-3, 3)], [R.int(-4, 3), R.int(-4, 3)]];
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0], tr = A[0][0] + A[1][1];
    if (det === 0) return null;
    const B = [R.int(-2, 3), R.int(-2, 3)], Cm = [R.int(-2, 3), R.int(-2, 3)], D = R.pick([0, 0, 1]);
    if (!B[0] && !B[1]) return null;
    const n1 = Cm[0] * B[0] + Cm[1] * B[1];
    const n0 = Cm[0] * (-A[1][1] * B[0] + A[0][1] * B[1]) + Cm[1] * (A[1][0] * B[0] - A[0][0] * B[1]);
    const g0 = n0 / det + D;
    return {
      q: `<p>\\(\\dot x = Ax + Bu,\\ y = Cx + Du\\) with</p>$$A = ${mat(A)},\\quad B = ${mat(B.map(b => [b]))},\\quad C = ${mat([Cm])},\\quad D = ${D}.$$<p>Write \\(G(s) = C(sI-A)^{-1}B + D = \\dfrac{n_1s + n_0}{s^2 + \\alpha_1s + \\alpha_0} + D\\). Find \\(\\alpha_1, \\alpha_0, n_1, n_0\\) and the DC gain \\(G(0)\\).</p>`,
      fields: [fld("α₁", -tr), fld("α₀", det), fld("n₁", n1), fld("n₀", n0), fld("G(0)", g0)],
      sol: `<p>\\(\\det(sI - A) = s^2 - (\\operatorname{tr}A)s + \\det A = ${ptex([1, -tr, det])}\\); its roots are the poles (the eigenvalues of \\(A\\)). For a \\(2\\times2\\) matrix, \\((sI-A)^{-1} = \\frac{1}{\\det(sI-A)}\\begin{bmatrix}s - ${A[1][1]} & ${A[0][1]}\\\\ ${A[1][0]} & s - ${A[0][0]}\\end{bmatrix}\\).</p><p>Multiplying \\(C\\,\\mathrm{adj}(sI-A)\\,B\\) gives \\(n_1 = CB = ${n1}\\) and \\(n_0 = ${n0}\\). So \\(G(s) = ${fr(ptex([n1, n0]), ptex([1, -tr, det]))}${D ? " + 1" : ""}\\), and \\(G(0) = D - CA^{-1}B = ${tex(g0)}\\).</p>`,
      verify: () => { const s = C(0.7, 0.3); const M = [[sub(s, A[0][0]), C(-A[0][1])], [C(-A[1][0]), sub(s, A[1][1])]]; const dt = sub(mul(M[0][0], M[1][1]), mul(M[0][1], M[1][0]));
        const x1 = div(sub(mul(M[1][1], B[0]), mul(M[0][1], B[1])), dt), x2 = div(sub(mul(M[0][0], B[1]), mul(M[1][0], B[0])), dt);
        return CX.near(add(add(mul(Cm[0], x1), mul(Cm[1], x2)), D), add(div(add(mul(n1, s), n0), add(add(mul(s, s), mul(-tr, s)), det)), D), 1e-9); },
    };
  });
  reg("ss-exp", "Eigenvalues and the free response", "state-space", () => {
    const { A, P, Pi, l1, l2 } = intA(), x0 = [R.int(-3, 3), R.int(-3, 3)];
    if (!x0[0] && !x0[1]) return null;
    // x(t) = P diag(e^{l t}) Pi x0 → x1(t) = P[0][0] z1 e^{l1 t} + P[0][1] z2 e^{l2 t}, z = Pi x0
    const z1 = Pi[0][0] * x0[0] + Pi[0][1] * x0[1], z2 = Pi[1][0] * x0[0] + Pi[1][1] * x0[1];
    const c1 = P[0][0] * z1, c2 = P[0][1] * z2;
    const stable = l1 < 0;
    return {
      q: `<p>For \\(\\dot x = Ax\\) with \\(A = ${mat(A)}\\) and \\(x(0) = ${mat(x0.map(v => [v]))}\\), find the eigenvalues \\(\\lambda_1 &gt; \\lambda_2\\) of \\(A\\), and write the first state as \\(x_1(t) = c_1e^{\\lambda_1t} + c_2e^{\\lambda_2t}\\).</p>`,
      fields: [fld("λ₁", l1), fld("λ₂", l2), fld("c₁", c1), fld("c₂", c2)],
      sol: `<p>\\(\\det(\\lambda I - A) = ${ptex([1, -(A[0][0] + A[1][1]), A[0][0] * A[1][1] - A[0][1] * A[1][0]], "\\lambda")} = (\\lambda - (${l1}))(\\lambda - (${l2}))\\). The solution is \\(x(t) = e^{At}x(0)\\), with \\(e^{At} = \\mathcal L^{-1}\\{(sI - A)^{-1}\\}\\), and every entry of \\(e^{At}\\) is a combination of \\(e^{${l1}t}\\) and \\(e^{${l2}t}\\).</p><p>Fit \\(x_1(t) = c_1e^{${l1}t} + c_2e^{${l2}t}\\) to \\(x_1(0) = c_1 + c_2 = ${x0[0]}\\) and \\(\\dot x_1(0) = ${l1}c_1 + ${l2}c_2 = (Ax(0))_1 = ${A[0][0] * x0[0] + A[0][1] * x0[1]}\\). This gives \\(c_1 = ${tex(c1)}\\), \\(c_2 = ${tex(c2)}\\). The system is ${stable ? "stable: both eigenvalues are negative" : "not stable: an eigenvalue is ≥ 0"}.</p>`,
      verify: () => nearR(c1 + c2, x0[0]) && nearR(l1 * c1 + l2 * c2, A[0][0] * x0[0] + A[0][1] * x0[1]),
    };
  });
  reg("ss-realize", "ODE ↔ state space", "state-space", () => {
    const a1 = R.int(1, 7), a0 = R.nz(-4, 9), b = R.nz(1, 6);
    const right = `\\(A = ${mat([[0, 1], [-a0, -a1]])},\\ B = ${mat([[0], [b]])},\\ C = ${mat([[1, 0]])}\\)`;
    return mc(`<p>Write \\(\\ddot y + ${a1}\\dot y + ${lin([[a0, "y"]])} = ${b}u\\) in state-space form with state \\(x = [\\,y,\\ \\dot y\\,]^T\\).</p>`, right,
      [`\\(A = ${mat([[0, 1], [a0, a1]])},\\ B = ${mat([[0], [b]])},\\ C = ${mat([[1, 0]])}\\)`, `\\(A = ${mat([[0, -a0], [1, -a1]])},\\ B = ${mat([[b], [0]])},\\ C = ${mat([[0, 1]])}\\)`, `\\(A = ${mat([[-a1, -a0], [1, 0]])},\\ B = ${mat([[0], [b]])},\\ C = ${mat([[1, 0]])}\\)`],
      `<p>With \\(x_1 = y\\), \\(x_2 = \\dot y\\): \\(\\dot x_1 = x_2\\) and \\(\\dot x_2 = \\ddot y = -${a0}x_1 - ${a1}x_2 + ${b}u\\). The output is \\(y = x_1\\). Check: \\(\\det(sI - A) = s^2 + ${a1}s + ${a0}\\), the characteristic polynomial of the ODE, and \\(G(s) = ${fr(b, ptex([1, a1, a0]))}\\).</p>`);
  });

  if (typeof module !== "undefined" && module.exports) module.exports = Hn;
})(typeof window !== "undefined" ? window : globalThis);
