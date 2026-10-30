/*
 * gen-exam1.js — problem generators for Exam 1: complex numbers, inner products,
 * Fourier series and the DFT. Conventions follow the course notes:
 *   f(t) = Σ a_k e^{-ikω0t},  a_k = (1/τ)∫_0^τ f(t) e^{+ikω0t} dt,  ⟨f,g⟩ = (1/τ)∫_0^τ f ḡ dt,
 *   F_ν[j][k] = e^{-2πijk/ν},  ifft(samples) = [a_0, a_1, …, a_{-1}].
 */
(function (root) {
  "use strict";
  const CX = root.CX || require("./cx.js");
  const QZ = root.QZ || require("./quiz.js");
  const { C, add, sub, mul, div, conj, abs, arg, polar, scale, tex, ctex, angTex, num } = CX;
  const PI = Math.PI;
  const H = root.GH = {}; // shared helpers for the other generator files

  // ---------- LaTeX helpers ----------
  // terms: [[coef, body]] → "c1 body1 + c2 body2 ..." (coef may be complex, body may be "")
  function lin(terms) {
    let out = "";
    terms.forEach(([c, b]) => {
      c = CX.toC(c);
      if (CX.abs(c) < 1e-12) return;
      const real = Math.abs(c.im) < 1e-12, pureIm = Math.abs(c.re) < 1e-12;
      let s, neg = false;
      if (real) { neg = c.re < 0; s = tex(Math.abs(c.re)); if (s === "1" && b) s = ""; }
      else if (pureIm) { neg = c.im < 0; s = ctex(C(0, Math.abs(c.im))); if (s === "i" && b) s = "i\\,"; }
      else s = `(${ctex(c)})`;
      out += (out ? (neg ? " - " : " + ") : (neg ? "-" : "")) + s + b;
    });
    return out || "0";
  }
  // polynomial with real coefficients, highest power first
  function ptex(p, v = "s") {
    const n = p.length - 1;
    return lin(p.map((c, i) => { const e = n - i; return [CX.toC(c).re, e === 0 ? "" : e === 1 ? v : `${v}^{${e}}`]; }));
  }
  const z = (a, b) => C(a, b);
  const P = w => `\\left(${ctex(w)}\\right)`;
  const fld = (label, ans, kind = "num", tol) => ({ label, ans, kind, tol });
  const ReIm = (w, name = "") => [fld(`Re ${name}`, CX.toC(w).re), fld(`Im ${name}`, CX.toC(w).im)];
  function mc(q, correct, wrong, sol) {
    const items = H.R.shuffle([correct, ...wrong]);
    return { q, choices: items, answer: items.indexOf(correct), sol };
  }
  Object.assign(H, { lin, ptex, P, fld, ReIm, mc, R: QZ.R });
  const R = QZ.R;
  const GROUP = { complex: "Complex numbers", "inner-products": "Inner products", "fourier-series": "Fourier series", dft: "DFT & FFT" };
  const reg = (id, title, lesson, gen) => QZ.register(id, { title, exam: 1, group: GROUP[lesson], lesson }, gen);

  // ======================= COMPLEX NUMBERS =======================
  const cint = () => z(R.nz(-5, 5), R.nz(-5, 5));
  reg("cx-arith", "Complex arithmetic", "complex", () => {
    const v = R.int(0, 3), a = cint(), b = cint();
    if (v === 0) {
      const w = mul(a, b);
      return { q: `<p>Compute \\(${P(a)}${P(b)}\\).</p>`, fields: ReIm(w),
        sol: `<p>Multiply out with \\(i^2=-1\\): \\((x_1+iy_1)(x_2+iy_2) = x_1x_2-y_1y_2 + i(x_1y_2+y_1x_2)\\).</p>$$= (${tex(a.re * b.re)} - (${tex(a.im * b.im)})) + i(${tex(a.re * b.im)} + (${tex(a.im * b.re)})) = ${ctex(w)}.$$` };
    }
    if (v === 1) {
      const w = div(a, b), d = b.re ** 2 + b.im ** 2, nmr = mul(a, conj(b));
      return { q: `<p>Find the real and imaginary parts of \\(\\dfrac{${ctex(a)}}{${ctex(b)}}\\).</p>`, fields: ReIm(w),
        sol: `<p>Multiply top and bottom by the conjugate of the denominator, \\(${ctex(conj(b))}\\):</p>$$\\frac{${P(a).slice(0)}${P(conj(b))}}{|${ctex(b)}|^2} = \\frac{${ctex(nmr)}}{${d}} = ${ctex(w)}.$$` };
    }
    if (v === 2) {
      const n = R.int(2, 3), w = CX.pow(a, n);
      return { q: `<p>Compute \\(${P(a)}^{${n}}\\) by direct multiplication.</p>`, fields: ReIm(w),
        sol: `<p>\\(${P(a)}^2 = ${ctex(mul(a, a))}\\)${n === 3 ? `, then multiply once more by \\(${ctex(a)}\\)` : ""}: the result is \\(${ctex(w)}\\).</p>` };
    }
    const c = cint(), w = div(mul(a, conj(b)), c);
    return { q: `<p>Let \\(\\gamma_1 = ${ctex(a)}\\), \\(\\gamma_2 = ${ctex(b)}\\), \\(\\gamma_3=${ctex(c)}\\). Compute \\(\\gamma_1\\overline{\\gamma_2}/\\gamma_3\\).</p>`, fields: ReIm(w),
      sol: `<p>\\(\\overline{\\gamma_2} = ${ctex(conj(b))}\\), so \\(\\gamma_1\\overline{\\gamma_2} = ${ctex(mul(a, conj(b)))}\\). Dividing by \\(\\gamma_3\\) (multiply by \\(\\overline{\\gamma_3}/|\\gamma_3|^2 = ${ctex(conj(c))}/${c.re ** 2 + c.im ** 2}\\)) gives \\(${ctex(w)}\\).</p>` };
  });

  reg("cx-polar", "Magnitude & angle", "complex", () => {
    const v = R.int(0, 2);
    if (v === 0) {
      const w = z(R.nz(-4, 4), R.nz(-4, 4));
      const th = arg(w);
      const quad = w.re > 0 ? "x > 0, so the angle is just \\(\\arctan(y/x)\\)" : w.im >= 0 ? "x < 0 and y ≥ 0, so add π: angle = π + arctan(y/x)" : "x < 0 and y < 0, so subtract π: angle = −π + arctan(y/x)";
      return { q: `<p>Write \\(z = ${ctex(w)}\\) in polar form \\(re^{i\\theta}\\) with \\(\\theta \\in (-\\pi, \\pi]\\).</p>`,
        fields: [fld("r = |z|", abs(w)), fld("θ (rad)", th, "ang")],
        sol: `<p>\\(r = \\sqrt{${w.re}^2+${w.im}^2} = \\sqrt{${w.re ** 2 + w.im ** 2}} \\approx ${num(abs(w))}\\). Here ${quad}: \\(\\theta \\approx ${num(th)}\\) rad. (MATLAB: <code>abs</code>, <code>angle</code>; or atan2(y, x).)</p>` };
    }
    const s = R.pick([z(1, 0), z(-1, 0), z(0, 1), z(0, -1)]);
    const zs = [cint(), cint(), cint(), cint()];
    const nnum = v === 1 ? 2 : 1;
    const top = zs.slice(0, nnum), bot = zs.slice(nnum, 4 - (v === 1 ? 0 : 1));
    let w = s; top.forEach(t => (w = mul(w, t))); bot.forEach(b => (w = div(w, b)));
    const mags = l => l.map(t => t.re ** 2 + t.im ** 2);
    const sTex = s.re === 1 ? "" : s.re === -1 ? "-" : s.im === 1 ? "i" : "-i";
    const sAng = arg(s);
    const angSum = sAng + top.reduce((a, t) => a + arg(t), 0) - bot.reduce((a, t) => a + arg(t), 0);
    return { q: `<p>Find the magnitude and angle (in \\((-\\pi,\\pi]\\)) of $$\\gamma = \\frac{${sTex}${top.map(P).join("")}}{${bot.map(P).join("")}}.$$</p>`,
      fields: [fld("|γ|", abs(w)), fld("angle γ (rad)", arg(w), "ang")],
      sol: `<p>Magnitudes multiply/divide, angles add/subtract:</p>$$|\\gamma| = \\sqrt{\\frac{${mags(top).join("\\cdot")}}{${mags(bot).join("\\cdot")}}} \\approx ${num(abs(w))}$$<p>angle \\(= ${sAng ? angTex(sAng) + " + " : ""}${top.map(t => num(arg(t))).join(" + ")} - (${bot.map(t => num(arg(t))).join(" + ")}) \\approx ${num(angSum)}\\), which is \\(${num(arg(w))}\\) after wrapping into \\((-\\pi,\\pi]\\).</p>` };
  });

  const BASES = [
    { t: "1+i", z: z(1, 1), r: "\\sqrt2", th: PI / 4, l2: 0.5 }, { t: "1-i", z: z(1, -1), r: "\\sqrt2", th: -PI / 4, l2: 0.5 },
    { t: "-1+i", z: z(-1, 1), r: "\\sqrt2", th: 3 * PI / 4, l2: 0.5 }, { t: "\\sqrt3+i", z: z(Math.sqrt(3), 1), r: "2", th: PI / 6, l2: 1 },
    { t: "1+\\sqrt3\\,i", z: z(1, Math.sqrt(3)), r: "2", th: PI / 3, l2: 1 }, { t: "-\\sqrt3+i", z: z(-Math.sqrt(3), 1), r: "2", th: 5 * PI / 6, l2: 1 },
    { t: "1-\\sqrt3\\,i", z: z(1, -Math.sqrt(3)), r: "2", th: -PI / 3, l2: 1 }, { t: "-2+2i", z: z(-2, 2), r: "2\\sqrt2", th: 3 * PI / 4, l2: 1.5 },
  ];
  reg("cx-power", "Powers via polar form", "complex", () => {
    const b = R.pick(BASES);
    if (Math.random() < 0.6) {
      const n = R.int(3, 12), w = CX.pow(b.z, n);
      return { q: `<p>Use the polar form to compute \\((${b.t})^{${n}}\\).</p>`, fields: ReIm(w),
        sol: `<p>\\(${b.t} = ${b.r}\\,e^{i${angTex(b.th)}}\\), so by De Moivre</p>$$(${b.t})^{${n}} = ${b.r}^{${n}}\\,e^{i\\,${angTex(n * b.th)}} = ${num(abs(w))}\\,e^{i(${angTex(CX.wrap(n * b.th))})} = ${ctex(C(Math.round(w.re * 1e6) / 1e6, Math.round(w.im * 1e6) / 1e6))}.$$` };
    }
    const n = R.int(100, 3000), p = n * b.l2, th = CX.wrap(n * b.th);
    return { q: `<p>Write \\((${b.t})^{${n}}\\) as \\(2^{p}e^{i\\theta}\\) with \\(\\theta\\in(-\\pi,\\pi]\\).</p>`,
      fields: [fld("p", p), fld("θ", th, "ang")],
      sol: `<p>\\(${b.t} = ${b.r}\\,e^{i${angTex(b.th)}} = 2^{${tex(b.l2)}}e^{i${angTex(b.th)}}\\). Raising to the ${n}th power multiplies the exponent of 2 by ${n} and the angle by ${n}:</p>$$2^{${tex(p)}}\\,e^{i\\,${angTex(n * b.th)}},\\quad ${angTex(n * b.th)} \\equiv ${angTex(th)} \\pmod{2\\pi}.$$<p>(The Fall 2026 midterm asked exactly this for \\((1+i)^{2026} = 2^{1013} i\\).)</p>` };
  });

  const TARGETS = [
    { t: "1", w: z(1, 0) }, { t: "-1", w: z(-1, 0) }, { t: "i", w: z(0, 1) }, { t: "-i", w: z(0, -1) }, { t: "8i", w: z(0, 8) },
    { t: "-8", w: z(-8, 0) }, { t: "16", w: z(16, 0) }, { t: "1+i", w: z(1, 1) }, { t: "1-i", w: z(1, -1) }, { t: "-27", w: z(-27, 0) },
    { t: "\\tfrac{\\sqrt3}{2}+\\tfrac{i}{2}", w: z(Math.sqrt(3) / 2, 0.5) }, { t: "-1-i", w: z(-1, -1) }, { t: "-4", w: z(-4, 0) },
  ];
  function allRoots(w, n) {
    const r = Math.pow(abs(w), 1 / n), th = arg(w);
    return Array.from({ length: n }, (_, k) => polar(r, (th + 2 * PI * k) / n));
  }
  reg("cx-roots", "Roots & roots of unity", "complex", () => {
    const v = R.int(0, 2);
    if (v === 2) {
      const n = R.int(3, 12), k = R.int(1, n - 1);
      return { q: `<p>The \\(n = ${n}\\) roots of \\(\\lambda^{${n}} = 1\\) are \\(\\lambda_k = e^{2\\pi i k/${n}}\\). Give \\(\\lambda_{${k}}\\).</p>`,
        fields: ReIm(polar(1, 2 * PI * k / n), "λ"),
        sol: `<p>\\(\\lambda_{${k}} = e^{i\\,${angTex(2 * PI * k / n)}} = \\cos(${angTex(2 * PI * k / n)}) + i\\sin(${angTex(2 * PI * k / n)}) \\approx ${CX.str(polar(1, 2 * PI * k / n), 4)}\\). The roots of unity sit evenly on the unit circle, ${tex(360 / n)}° apart; they sum to zero.</p>` };
    }
    const T = R.pick(TARGETS), n = R.int(2, 6), rts = allRoots(T.w, n);
    const rTex = tex(Math.pow(abs(T.w), 1 / n)) , th = arg(T.w);
    const list = rts.map((q, k) => `${num(abs(q))}e^{i(${angTex((th + 2 * PI * k) / n)})}`).join(",\\; ");
    if (v === 0) {
      return { q: `<p>Find all solutions of \\(\\lambda^{${n}} = ${T.t}\\). Enter the root with the <b>smallest angle in \\([0, 2\\pi)\\)</b>.</p>`,
        fields: [fld("|λ|", abs(rts[0])), fld("angle in [0,2π)", ((arg(rts[0]) % (2 * PI)) + 2 * PI) % (2 * PI) < 1e-12 ? 0 : rts.map(q => ((arg(q) % (2 * PI)) + 2 * PI) % (2 * PI)).sort((a, b) => a - b)[0], "ang")],
        sol: `<p>Write \\(${T.t} = ${num(abs(T.w))}e^{i(${angTex(th)} + 2\\pi k)}\\). Take the ${n}th root of the magnitude and divide the angle by ${n}:</p>$$\\lambda_k = ${num(abs(T.w))}^{1/${n}}\\,e^{i(${angTex(th)}+2\\pi k)/${n}},\\quad k=0,\\dots,${n - 1}:\\quad ${list}.$$<p>All roots lie on the circle of radius \\(${rTex}\\), spaced \\(2\\pi/${n}\\) apart.</p>` };
    }
    const a = R.pick([z(1, 0), z(0, 1), z(0, -1), z(2, 0), z(-1, 0)]), b = CX.neg(mul(a, T.w));
    return { q: `<p>Solve \\(${lin([[a, `\\lambda^{${n}}`], [b, ""]])} = 0\\). Enter <b>any one</b> of the ${n} roots as a single complex number (for example <code>1.2-0.5i</code> or <code>2*e^(i*pi/6)</code>).</p>`,
      fields: [{ label: "λ", ans: rts[0], any: rts, kind: "cx" }],
      sol: `<p>Isolate the power: \\(\\lambda^{${n}} = ${ctex(CX.neg(div(b, a)))}\\). Then</p>$$\\lambda_k = ${num(abs(T.w))}^{1/${n}}\\,e^{i(${angTex(th)}+2\\pi k)/${n}}:\\quad ${list}.$$<p>Keep the \\(2\\pi k\\) <i>before</i> dividing, or you only find one root.</p>` };
  });

  reg("cx-euler", "Euler's formula & complex powers", "complex", () => {
    const v = R.int(0, 5);
    if (v === 0) {
      const k = R.int(-1, 1);
      return { q: `<p>Using \\(i = e^{i(\\pi/2 + 2\\pi k)}\\), the values of \\(i^i\\) are \\(e^{-(\\pi/2+2\\pi k)}\\). Give the value for \\(k = ${k}\\).</p>`,
        fields: [fld("i^i", Math.exp(-(PI / 2 + 2 * PI * k)))],
        sol: `<p>\\(i^i = (e^{i(\\pi/2+2\\pi k)})^i = e^{i\\cdot i(\\pi/2+2\\pi k)} = e^{-(\\pi/2+2\\pi k)}\\). With \\(k=${k}\\): \\(e^{${tex(-(0.5 + 2 * k))}\\pi} \\approx ${num(Math.exp(-(PI / 2 + 2 * PI * k)))}\\). It is real!</p>` };
    }
    if (v === 1) {
      const a = R.int(2, 5), w = CX.exp(C(0, Math.log(a)));
      return { q: `<p>Compute the principal value of \\(${a}^{\\,i}\\) (use \\(${a} = e^{\\ln ${a}}\\)).</p>`, fields: ReIm(w),
        sol: `<p>\\(${a}^i = e^{i\\ln ${a}} = \\cos(\\ln ${a}) + i\\sin(\\ln ${a}) \\approx ${CX.str(w, 4)}\\). It has magnitude 1.</p>` };
    }
    if (v === 2) {
      const b = R.int(1, 3), f = R.pick(["cos", "sin"]);
      const w = f === "cos" ? C(Math.cosh(b), 0) : C(0, Math.sinh(b));
      return { q: `<p>Use \\(\\cos\\theta = \\frac{e^{i\\theta}+e^{-i\\theta}}{2}\\), \\(\\sin\\theta = \\frac{e^{i\\theta}-e^{-i\\theta}}{2i}\\) to compute \\(\\${f}(${b === 1 ? "" : b}i)\\).</p>`, fields: ReIm(w),
        sol: f === "cos" ? `<p>\\(\\cos(${b}i) = \\frac{e^{-${b}}+e^{${b}}}{2} = \\cosh ${b} \\approx ${num(w.re)}\\). Note it exceeds 1: cosine is only bounded on the real line.</p>` : `<p>\\(\\sin(${b}i) = \\frac{e^{-${b}}-e^{${b}}}{2i} = i\\,\\frac{e^{${b}}-e^{-${b}}}{2} = i\\sinh ${b} \\approx ${num(w.im)}i\\).</p>` };
    }
    if (v === 3) {
      const n = R.int(4, 13);
      let s = C(0); for (let k = 0; k <= n; k++) s = add(s, CX.pow(C(0, 1), k));
      const w = mul(C(1, -1), s);
      return { q: `<p>Calculate \\((1-i)(1 + i + i^2 + \\cdots + i^{${n}})\\).</p>`, fields: ReIm(w),
        sol: `<p>Powers of \\(i\\) cycle \\(1, i, -1, -i\\), and each block of four sums to 0. So the sum equals the leftover terms: \\(${ctex(s)}\\). Alternatively \\((1-i)\\sum = \\frac{(1-i)(1-i^{${n + 1}})}{1-i} = 1 - i^{${n + 1}}\\). Either way the product is \\(${ctex(w)}\\).</p>` };
    }
    if (v === 4) {
      const k = R.int(-1, 1), w = C(0, PI / 2 + 2 * PI * k);
      return { q: `<p>All values of \\(\\ln(i)\\) are \\(i(\\pi/2 + 2\\pi k)\\). Give the value for \\(k=${k}\\).</p>`, fields: ReIm(w),
        sol: `<p>\\(i = e^{i(\\pi/2+2\\pi k)}\\), so \\(\\ln i = i(\\pi/2+2\\pi k)\\); for \\(k=${k}\\) this is \\(${num(w.im)}i\\).</p>` };
    }
    const pool = [
      ["\\sin\\theta\\sin\\phi", "\\tfrac{\\cos(\\theta-\\phi)-\\cos(\\theta+\\phi)}{2}", ["\\tfrac{\\cos(\\theta+\\phi)-\\cos(\\theta-\\phi)}{2}", "\\tfrac{\\sin(\\theta+\\phi)+\\sin(\\theta-\\phi)}{2}", "\\cos(\\theta-\\phi)\\cos(\\theta+\\phi)"]],
      ["\\cos\\theta\\cos\\phi", "\\tfrac{\\cos(\\theta+\\phi)+\\cos(\\theta-\\phi)}{2}", ["\\cos(\\theta+\\phi)+\\cos(\\theta-\\phi)", "\\tfrac{\\cos(\\theta-\\phi)-\\cos(\\theta+\\phi)}{2}", "\\tfrac{\\sin(\\theta+\\phi)-\\sin(\\theta-\\phi)}{2}"]],
      ["\\sin 2\\theta", "2\\sin\\theta\\cos\\theta", ["\\sin^2\\theta-\\cos^2\\theta", "2\\sin\\theta", "\\cos^2\\theta-\\sin^2\\theta"]],
      ["\\cos^2\\theta", "\\tfrac{1+\\cos2\\theta}{2}", ["\\tfrac{1-\\cos2\\theta}{2}", "1+\\sin^2\\theta", "\\tfrac{\\cos2\\theta}{2}"]],
      ["\\sin^3\\theta", "\\tfrac{3\\sin\\theta-\\sin3\\theta}{4}", ["\\tfrac{\\sin3\\theta-3\\sin\\theta}{4}", "\\tfrac{3\\sin\\theta+\\sin3\\theta}{4}", "\\sin(\\theta^3)"]],
    ];
    const [lhs, c, wr] = R.pick(pool);
    return mc(`<p>Expanding with \\(e^{i\\theta} = \\cos\\theta + i\\sin\\theta\\), which expression equals \\(${lhs}\\)?</p>`, `\\(${c}\\)`, wr.map(s => `\\(${s}\\)`),
      `<p>Write each sine/cosine as exponentials, multiply, and regroup into \\(\\frac{e^{ix}\\pm e^{-ix}}{2}\\) pairs. The result is \\(${lhs} = ${c}\\).</p>`);
  });

  const PH = [0, PI / 6, PI / 4, PI / 3, PI / 2, -PI / 4, -PI / 3, PI];
  reg("cx-sinusoid", "Adding sinusoids (phasors)", "complex", () => {
    const w = R.pick([1, 2, 3, 5]), al = R.nz(-4, 4), be = R.nz(-4, 4);
    const wt = w === 1 ? "t" : `${w}t`;
    if (Math.random() < 0.4) {
      const ps = CX.arg(C(al, be));
      return { q: `<p>Write \\(${lin([[al, `\\cos ${wt}`], [be, `\\sin ${wt}`]])}\\) as \\(r\\cos(${wt} - \\psi)\\).</p>`,
        fields: [fld("r", Math.hypot(al, be)), fld("ψ", ps, "ang")],
        sol: `<p>\\(\\alpha\\cos x + \\beta\\sin x = \\sqrt{\\alpha^2+\\beta^2}\\cos(x-\\psi)\\) with \\(\\psi = \\text{angle}(\\alpha + i\\beta) = \\text{angle}(${ctex(C(al, be))})\\). So \\(r = \\sqrt{${al * al + be * be}} \\approx ${num(Math.hypot(al, be))}\\), \\(\\psi \\approx ${num(ps)}\\) (mind the quadrant!).</p>` };
    }
    const th = R.pick(PH), ph = R.pick(PH);
    const zz = sub(polar(al, th), mul(C(0, 1), polar(be, ph)));
    const arg1 = th ? `${wt} ${th < 0 ? "-" : "+"} ${angTex(Math.abs(th))}` : wt, arg2 = ph ? `${wt} ${ph < 0 ? "-" : "+"} ${angTex(Math.abs(ph))}` : wt;
    return { q: `<p>Express \\(${lin([[al, `\\cos(${arg1})`], [be, `\\sin(${arg2})`]])}\\) as a single sinusoid \\(r\\cos(${wt} + \\varphi)\\), \\(r \\ge 0\\).</p>`,
      fields: [fld("r", abs(zz)), fld("φ", arg(zz), "ang")],
      sol: `<p>Phasors: \\(\\alpha\\cos(\\omega t+\\theta) + \\beta\\sin(\\omega t+\\phi) = \\Re\\{(\\alpha e^{i\\theta} - i\\beta e^{i\\phi})e^{i\\omega t}\\}\\). Here</p>$$\\alpha e^{i\\theta} - i\\beta e^{i\\phi} = ${CX.str(polar(al, th), 4)} - i(${CX.str(polar(be, ph), 4)}) = ${CX.str(zz, 4)} = r e^{i\\varphi},$$<p>so \\(r \\approx ${num(abs(zz))}\\) and \\(\\varphi \\approx ${num(arg(zz))}\\) rad.</p>`,
      verify: () => [0.3, 1.1, 2.7].every(t => Math.abs(al * Math.cos(w * t + th) + be * Math.sin(w * t + ph) - abs(zz) * Math.cos(w * t + arg(zz))) < 1e-9) };
  });

  // ======================= INNER PRODUCTS =======================
  const vec = n => Array.from({ length: n }, () => z(R.int(-3, 3), R.int(-3, 3)));
  const ip = (f, g) => f.reduce((s, fk, k) => add(s, mul(fk, conj(g[k]))), C(0));
  const vtex = v => `\\begin{bmatrix}${v.map(ctex).join("\\\\")}\\end{bmatrix}`;
  const nsq = f => f.reduce((s, x) => s + abs(x) ** 2, 0);
  reg("ip-vec", "Inner products in ℂⁿ", "inner-products", () => {
    const f = vec(3), g = vec(3), v = R.int(0, 3);
    const intro = `<p>Let \\(f = ${vtex(f)}\\) and \\(g = ${vtex(g)}\\) in \\(\\mathbb{C}^3\\) with the standard inner product \\((f,g) = \\sum_k f_k\\overline{g_k}\\).</p>`;
    const prod = `\\((f,g) = ${f.map((fk, k) => `${P(fk)}\\overline{${P(g[k])}}`).join(" + ")} = ${ctex(ip(f, g))}\\)`;
    if (v === 0) return { q: intro + `<p>Compute \\((f, g)\\).</p>`, fields: ReIm(ip(f, g)), sol: `<p>Conjugate the second vector's entries: ${prod}.</p>` };
    if (v === 1) return { q: intro + `<p>Compute \\(\\|f\\|^2\\).</p>`, fields: [fld("‖f‖²", nsq(f))], sol: `<p>\\(\\|f\\|^2 = \\sum |f_k|^2 = ${f.map(x => abs(x) ** 2).join(" + ")} = ${nsq(f)}\\).</p>` };
    if (v === 2) { const d = f.map((x, k) => sub(x, g[k])); return { q: intro + `<p>Find the distance \\(\\|f - g\\|\\).</p>`, fields: [fld("‖f − g‖", Math.sqrt(nsq(d)))], sol: `<p>\\(f - g = ${vtex(d)}\\), so \\(\\|f-g\\|^2 = ${d.map(x => abs(x) ** 2).join(" + ")} = ${nsq(d)}\\) and the distance is \\(\\sqrt{${nsq(d)}} \\approx ${num(Math.sqrt(nsq(d)))}\\).</p>` }; }
    const c = R.pick([z(0, 2), z(1, 1), z(-3, 0), z(0, -1), z(2, -1)]), w = mul(conj(c), ip(f, g));
    return { q: intro + `<p>Compute \\((f, ${ctex(c)}\\,g)\\).</p>`, fields: ReIm(w),
      sol: `<p>The inner product is conjugate-linear in the second slot: \\((f, cg) = \\bar c\\,(f,g)\\). With ${prod}: \\(\\overline{${ctex(c)}}\\,(f,g) = ${P(conj(c))}${P(ip(f, g))} = ${ctex(w)}\\).</p>` };
  });

  reg("ip-func", "Inner products in L²(0,τ)", "inner-products", () => {
    const v = R.int(0, 5), tau = R.int(1, 3);
    const nrm = `(f,g) = \\frac{1}{${tau === 1 ? "1" : tau}}\\int_0^{${tau}} f(t)\\overline{g(t)}\\,dt`;
    const mon = m => (m === 0 ? "1" : m === 1 ? "t" : `t^{${m}}`);
    if (v === 0) {
      const m = R.int(0, 3), n = R.int(0, 3), ans = tau ** (m + n) / (m + n + 1);
      return { q: `<p>In \\(L^2(0, ${tau})\\) with \\(${nrm}\\), compute \\((${mon(m)}, ${mon(n)})\\).</p>`, fields: [fld("value", ans)],
        sol: `$$\\frac{1}{${tau}}\\int_0^{${tau}} t^{${m + n}}\\,dt = \\frac{1}{${tau}}\\cdot\\frac{${tau}^{${m + n + 1}}}{${m + n + 1}} = ${tex(ans)}.$$<p>Don't forget the \\(1/\\tau\\) normalization the course uses.</p>` };
    }
    if (v === 1) {
      const m = R.int(0, 2), n = R.int(1, 2), a = R.nz(-3, 3), b = R.nz(-3, 3);
      const ans = C(a * tau ** m / (m + 1), -b * tau ** (m + n) / (m + n + 1));
      return { q: `<p>In \\(L^2(0, ${tau})\\) with \\(${nrm}\\), compute \\(\\big(${mon(m)},\\; ${lin([[a, ""], [C(0, b), mon(n)]])}\\big)\\).</p>`, fields: ReIm(ans),
        sol: `<p>Conjugate the second function: \\(\\overline{${lin([[a, ""], [C(0, b), mon(n)]])}} = ${lin([[a, ""], [C(0, -b), mon(n)]])}\\). Then</p>$$\\frac{1}{${tau}}\\int_0^{${tau}} ${mon(m) === "1" ? "" : mon(m)}\\left(${lin([[a, ""], [C(0, -b), mon(n)]])}\\right)dt = ${tex(ans.re)} ${ans.im < 0 ? "-" : "+"} ${tex(Math.abs(ans.im))}\\,i.$$` };
    }
    if (v === 2) {
      const a = R.nz(-3, 3), b = R.nz(-3, 3), cplx = Math.random() < 0.4;
      const ans = cplx ? a * a + b * b * tau * tau / 3 : a * a + a * b * tau + b * b * tau * tau / 3;
      const ftex = cplx ? lin([[a, ""], [C(0, b), "t"]]) : lin([[a, ""], [b, "t"]]);
      return { q: `<p>In \\(L^2(0, ${tau})\\) (normalized), find \\(\\|${ftex}\\|^2\\).</p>`, fields: [fld("‖f‖²", ans)],
        sol: cplx ? `<p>\\(|${ftex}|^2 = ${a * a} + ${b * b}t^2\\) (real part squared plus imaginary part squared), so \\(\\|f\\|^2 = \\frac{1}{${tau}}\\int_0^{${tau}}(${a * a} + ${b * b}t^2)\\,dt = ${tex(ans)}\\).</p>` : `<p>\\(\\|f\\|^2 = \\frac{1}{${tau}}\\int_0^{${tau}} (${a * a} ${a * b < 0 ? "-" : "+"} ${Math.abs(2 * a * b)}t + ${b * b}t^2)\\,dt = ${a * a} ${a * b < 0 ? "-" : "+"} ${Math.abs(a * b * tau)} + ${tex(b * b * tau * tau / 3)} = ${tex(ans)}\\).</p>` };
    }
    if (v === 3) {
      const d = R.int(1, 4), c = (1 / 3 + d / 2) / (0.5 + d);
      return { q: `<p>In \\(L^2(0,1)\\), find the constant \\(c\\) so that \\(g(t) = t - c\\) is orthogonal to \\(f(t) = t + ${d}\\).</p>`, fields: [fld("c", c)],
        sol: `$$0 = \\int_0^1 (t+${d})(t-c)\\,dt = \\tfrac13 + \\tfrac{${d}}{2} - c\\left(\\tfrac12 + ${d}\\right) \\;\\Rightarrow\\; c = ${tex(c)}.$$<p>(The midterm asked this with \\(f = t+1\\), giving \\(c = 5/9\\).)</p>` };
    }
    if (v === 4) {
      const p = R.int(1, 3), q = R.pick([1, 2, 4]), L = R.pick([1, 2, 4, 8]);
      const a = p * PI / q, val = (1 - Math.cos(2 * a * L)) / (4 * a * L);
      const orth = Math.abs(val) < 1e-9;
      const arg = `${p === 1 ? "" : p}\\pi t${q === 1 ? "" : "/" + q}`;
      return mc(`<p>Are \\(f(t) = \\cos(${arg})\\) and \\(g(t) = \\sin(${arg})\\) orthogonal in \\(L^2(0, ${L})\\)?</p>`,
        orth ? "Yes: (f, g) = 0" : `No: (f, g) ≈ ${num(val)}`,
        orth ? [`No: (f, g) = ${num(1 / (4 * a))}`, "Only if we drop the 1/τ factor", "Cosine and sine are never orthogonal"] : ["Yes: (f, g) = 0", "Cosine and sine are always orthogonal", `No: (f, g) = ${num(-val)}`],
        `<p>\\(\\cos x\\sin x = \\tfrac12\\sin 2x\\), so</p>$$(f,g) = \\frac{1}{${L}}\\int_0^{${L}}\\tfrac12\\sin(2\\cdot${tex(a / PI)}\\pi t)\\,dt = \\frac{1-\\cos(${tex(2 * a * L / PI)}\\pi)}{4\\cdot ${tex(a / PI)}\\pi\\cdot ${L}} ${orth ? "= 0" : `\\approx ${num(val)}`}.$$<p>They are orthogonal exactly when the interval holds a whole number of periods of \\(\\sin(2\\cdot${tex(a / PI)}\\pi t)\\). (This is the "AI solution" trap on the practice test: always integrate the actual product.)</p>`);
    }
    const a = R.pick([1, 2, 1 / 4, 1 / 2, 3 / 2]), L = R.pick([1, 2]);
    const val = 0.5 + Math.sin(2 * a * PI * L) / (4 * a * PI * L);
    return { q: `<p>Compute \\(\\|\\cos(${tex(a)}\\pi t)\\|^2\\) in \\(L^2(0, ${L})\\) (normalized inner product).</p>`, fields: [fld("‖f‖²", val)],
      sol: `<p>\\(\\cos^2 x = \\tfrac{1+\\cos 2x}{2}\\), so</p>$$\\|f\\|^2 = \\frac{1}{${L}}\\int_0^{${L}}\\frac{1+\\cos(${tex(2 * a)}\\pi t)}{2}dt = \\frac12 + \\frac{\\sin(${tex(2 * a * L)}\\pi)}{${tex(4 * a * L)}\\pi} \\approx ${num(val)}.$$<p>When the interval holds whole periods this is exactly ½ (that is why \\(\\|\\cos k\\omega_0 t\\|^2 = \\tfrac12\\)).</p>` };
  });

  const OBASES = [
    [[1, 1, 0], [1, -1, 0], [0, 0, 1]], [[1, 1, 1], [1, -1, 0], [1, 1, -2]], [[1, 2, 0], [-2, 1, 0], [0, 0, 3]],
    [[1, 0, 0, 1], [0, 1, 1, 0], [2, 0, 0, -2], [0, 3, -3, 0]], [[1, 1, 1, 1], [1, -1, 1, -1], [1, 1, -1, -1], [1, -1, -1, 1]],
  ];
  reg("ip-expand", "Orthogonal expansions & Parseval", "inner-products", () => {
    const B = R.pick(OBASES), n = B[0].length, f = Array.from({ length: n }, () => R.int(-4, 5));
    const dot = (x, y) => x.reduce((s, xi, i) => s + xi * y[i], 0);
    const a = B.map(p => dot(f, p) / dot(p, p));
    const k = R.int(0, n - 1), v = R.int(0, 2);
    const q0 = `<p>The vectors \\(${B.map((p, i) => `\\psi_{${i + 1}} = ${vtex(p.map(x => C(x)))}`).join(",\\;")}\\) form an orthogonal basis of \\(\\mathbb{C}^{${n}}\\). Let \\(f = ${vtex(f.map(x => C(x)))}\\) and write \\(f = \\sum a_k \\psi_k\\).</p>`;
    const coef = `<p>\\(a_k = \\dfrac{(f,\\psi_k)}{\\|\\psi_k\\|^2}\\): ${B.map((p, i) => `\\(a_{${i + 1}} = ${dot(f, p)}/${dot(p, p)} = ${tex(a[i])}\\)`).join(", ")}.</p>`;
    if (v === 0) return { q: q0 + `<p>Find \\(a_{${k + 1}}\\).</p>`, fields: [fld(`a_${k + 1}`, a[k])], sol: coef };
    if (v === 1) {
      const e2 = a[k] ** 2 * dot(B[k], B[k]);
      return { q: q0 + `<p>Approximate \\(f\\) by dropping the \\(\\psi_{${k + 1}}\\) term: \\(p = \\sum_{j\\ne ${k + 1}} a_j\\psi_j\\). Find \\(\\|f - p\\|^2\\).</p>`, fields: [fld("‖f − p‖²", e2)],
        sol: coef + `<p>The error is exactly the dropped term: \\(\\|f-p\\|^2 = |a_{${k + 1}}|^2\\|\\psi_{${k + 1}}\\|^2 = ${tex(a[k] ** 2)}\\cdot ${dot(B[k], B[k])} = ${tex(e2)}\\).</p>` };
    }
    return { q: q0 + `<p>Verify Parseval: compute \\(\\sum_k |a_k|^2\\|\\psi_k\\|^2\\).</p>`, fields: [fld("Σ|a_k|²‖ψ_k‖²", dot(f, f))],
      sol: coef + `<p>\\(\\sum |a_k|^2\\|\\psi_k\\|^2 = ${a.map((x, i) => `${tex(x * x)}\\cdot${dot(B[i], B[i])}`).join(" + ")} = ${dot(f, f)} = \\|f\\|^2\\), as Parseval promises.</p>` };
  });

  // ======================= FOURIER SERIES =======================
  // interval choices: ω0 and how kω0t prints
  const TAUS = [
    { tau: 2 * PI, tt: "2\\pi", w0: 1, arg: k => (k === 1 ? "t" : `${k}t`) },
    { tau: 1, tt: "1", w0: 2 * PI, arg: k => `${2 * k}\\pi t` },
    { tau: 2, tt: "2", w0: PI, arg: k => (k === 1 ? "\\pi t" : `${k}\\pi t`) },
  ];
  H.TAUS = TAUS;
  // coefficient map helpers: Map k -> complex
  function addCoef(m, k, c) { m.set(k, add(m.get(k) || C(0), c)); }
  function trigToCoef(terms) { // terms: {type:'c'|'s'|'e-'|'e+'|'const', k, A}
    const m = new Map();
    terms.forEach(t => {
      if (t.type === "const") addCoef(m, 0, C(t.A));
      if (t.type === "c") { addCoef(m, t.k, C(t.A / 2)); addCoef(m, -t.k, C(t.A / 2)); }
      if (t.type === "s") { addCoef(m, t.k, C(0, t.A / 2)); addCoef(m, -t.k, C(0, -t.A / 2)); }
      if (t.type === "e-") addCoef(m, t.k, CX.toC(t.A));
      if (t.type === "e+") addCoef(m, -t.k, CX.toC(t.A));
    });
    return m;
  }
  H.trigToCoef = trigToCoef;
  const coefOf = (m, k) => m.get(k) || C(0);
  const power = m => [...m.values()].reduce((s, c) => s + abs(c) ** 2, 0);
  function trigTex(terms, T) {
    return lin(terms.map(t => t.type === "const" ? [t.A, ""] : t.type === "c" ? [t.A, `\\cos(${T.arg(t.k)})`] : t.type === "s" ? [t.A, `\\sin(${T.arg(t.k)})`]
      : t.type === "e-" ? [t.A, `e^{-i${T.arg(t.k)}}`] : [t.A, `e^{i${T.arg(t.k)}}`]));
  }
  function coefTable(m) {
    const ks = [...m.keys()].filter(k => abs(m.get(k)) > 1e-12).sort((a, b) => a - b);
    return ks.map(k => `a_{${k}} = ${ctex(m.get(k))}`).join(",\\; ");
  }
  reg("fs-trig", "Fourier coefficients of trig sums", "fourier-series", () => {
    const T = R.pick(TAUS);
    const ks = R.distinct(R.int(2, 3), 1, 6);
    const terms = [];
    if (Math.random() < 0.7) terms.push({ type: "const", A: R.nz(-6, 6) });
    ks.forEach(k => { const r = R.int(0, 2); if (r !== 1) terms.push({ type: "c", k, A: R.nz(-8, 8) }); if (r !== 0) terms.push({ type: "s", k, A: R.nz(-8, 8) }); });
    if (Math.random() < 0.25) terms.push({ type: R.pick(["e-", "e+"]), k: R.int(1, 7), A: R.nz(-6, 6) });
    const m = trigToCoef(terms);
    const ftex = trigTex(terms, T);
    const q0 = `<p>Let \\(f(t) = ${ftex}\\) in \\(L^2(0, ${T.tt})\\), with \\(f = \\sum a_k e^{-ik\\omega_0 t}\\).</p>`;
    const conv = `<p>Here \\(\\omega_0 = 2\\pi/\\tau = ${T.w0 === 1 ? "1" : T.w0 === PI ? "\\pi" : "2\\pi"}\\). Use \\(\\cos x = \\frac{e^{ix}+e^{-ix}}{2}\\), \\(\\sin x = \\frac{e^{ix}-e^{-ix}}{2i}\\): a term \\(\\alpha\\cos + \\beta\\sin\\) at harmonic \\(k\\) gives \\(a_k = \\frac{\\alpha+i\\beta}{2}\\) and \\(a_{-k} = \\frac{\\alpha - i\\beta}{2}\\); a term \\(c\\,e^{-ik\\omega_0t}\\) adds \\(c\\) to \\(a_k\\) (and \\(c\\,e^{+ik\\omega_0t}\\) adds to \\(a_{-k}\\)). Result: \\(${coefTable(m)}\\), all others 0.</p>`;
    const v = R.int(0, 4);
    const kq = R.pick([...m.keys()].filter(k => k !== 0).concat([R.int(-7, 7)]));
    if (v === 0) return { q: q0 + `<p>Find \\(a_{${kq}}\\).</p>`, fields: ReIm(coefOf(m, kq), `a_${kq}`), sol: conv };
    if (v === 1) {
      const k = Math.abs(kq) || 1, al = add(coefOf(m, k), coefOf(m, -k)), be = mul(C(0, 1), sub(coefOf(m, -k), coefOf(m, k)));
      return { q: q0 + `<p>Writing \\(f = a_0 + \\sum_{k\\ge1}(\\alpha_k\\cos k\\omega_0t + \\beta_k\\sin k\\omega_0 t)\\), find \\(\\alpha_{${k}}\\) and \\(\\beta_{${k}}\\).</p>`,
        fields: [{ label: `α_${k}`, ans: al, kind: "cx" }, { label: `β_${k}`, ans: be, kind: "cx" }],
        sol: conv + `<p>\\(\\alpha_k = a_k + a_{-k} = ${ctex(al)}\\), \\(\\beta_k = i(a_{-k} - a_k) = ${ctex(be)}\\). (Exponential terms contribute too: they are not "real" sinusoids, so \\(\\alpha_k, \\beta_k\\) can be complex.)</p>` };
    }
    if (v === 2) {
      const P2 = power(m);
      return { q: q0 + `<p>Use Parseval to find \\(\\|f\\|^2 = \\frac{1}{${T.tt}}\\int_0^{${T.tt}} |f(t)|^2dt\\).</p>`, fields: [fld("‖f‖²", P2)],
        sol: conv + `<p>Parseval: \\(\\|f\\|^2 = \\sum |a_k|^2 = ${[...m.values()].filter(c => abs(c) > 1e-12).map(c => tex(abs(c) ** 2)).join(" + ")} = ${tex(P2)}\\). Cross terms between different harmonics integrate to zero, so there is no need to expand \\(|f|^2\\).</p>` };
    }
    if (v === 3) {
      const P2 = power(m) * T.tau;
      return { q: q0 + `<p>Compute \\(\\int_0^{${T.tt}} |f(t)|^2dt\\) (no \\(1/\\tau\\)).</p>`, fields: [fld("∫|f|²dt", P2)],
        sol: conv + `<p>\\(\\int_0^\\tau |f|^2 = \\tau\\sum|a_k|^2 = ${T.tt}\\cdot ${tex(power(m))} = ${tex(P2) === num(P2) ? num(P2) : tex(P2)}\\). (Exam trap: the question may omit the \\(1/\\tau\\).)</p>` };
    }
    return { q: q0 + `<p>Find the power spectrum value \\(|a_{${kq}}|^2\\).</p>`, fields: [fld(`|a_${kq}|²`, abs(coefOf(m, kq)) ** 2)], sol: conv + `<p>\\(|a_{${kq}}|^2 = ${tex(abs(coefOf(m, kq)) ** 2)}\\). For real \\(f\\) the power spectrum is symmetric: \\(|a_k| = |a_{-k}|\\).</p>` };
  });

  reg("fs-identity", "Fourier series from identities", "fourier-series", () => {
    const v = R.int(0, 2);
    let terms, ftex, how;
    if (v === 0) { const c = R.nz(-4, 4), d = R.nz(-8, 8); terms = [{ type: "const", A: c }, { type: "s", k: 1, A: 3 * d / 4 }, { type: "s", k: 3, A: -d / 4 }]; ftex = `${lin([[c, ""], [d, "\\sin^3 t"]])}`; how = `\\(\\sin^3 t = \\frac{3\\sin t - \\sin 3t}{4}\\)`; }
    else if (v === 1) { const A = R.nz(-6, 6), p = R.int(2, 9), q = R.int(1, p - 1); terms = [{ type: "c", k: p + q, A: A / 2 }, { type: "c", k: p - q, A: A / 2 }]; ftex = `${tex(A)}\\cos(${p}t)\\cos(${q === 1 ? "" : q}t)`; how = `\\(\\cos a\\cos b = \\frac{\\cos(a+b) + \\cos(a-b)}{2}\\)`; }
    else { const c = R.nz(-4, 4), A = R.nz(-6, 6), k = R.int(1, 4); terms = [{ type: "const", A: c + A / 2 }, { type: "c", k: 2 * k, A: A / 2 }]; ftex = `${lin([[c, ""], [A, `\\cos^2(${k === 1 ? "" : k}t)`]])}`; how = `\\(\\cos^2 x = \\frac{1+\\cos 2x}{2}\\)`; }
    const m = trigToCoef(terms), ks = [...m.keys()].filter(k => abs(m.get(k)) > 1e-12);
    const kq = R.pick(ks.filter(k => k !== 0).length ? ks.filter(k => k !== 0) : ks);
    const f = t => (v === 0 ? terms[0].A + (4 * terms[1].A / 3) * Math.sin(t) ** 3 : v === 1 ? terms[0].A * 2 * Math.cos(((terms[0].k + terms[1].k) / 2) * t) * Math.cos(((terms[0].k - terms[1].k) / 2) * t) : terms[0].A - terms[1].A + 2 * terms[1].A * Math.cos(terms[1].k / 2 * t) ** 2);
    return { q: `<p>Find the Fourier series of \\(f(t) = ${ftex}\\) on \\([0, 2\\pi]\\) in the form \\(\\sum a_k e^{-ikt}\\). Give \\(a_{${kq}}\\) and the total power \\(\\frac{1}{2\\pi}\\int_0^{2\\pi}|f|^2dt\\).</p>`,
      fields: [{ label: `a_${kq}`, ans: coefOf(m, kq), kind: "cx" }, fld("total power", power(m))],
      sol: `<p>Use ${how} to turn \\(f\\) into a sum of sinusoids, then read off coefficients: \\(${coefTable(m)}\\). Parseval gives power \\(\\sum|a_k|^2 = ${tex(power(m))}\\).</p>`,
      verify: () => { const a = CX.fsCoef(f, 2 * PI, kq); return CX.near(a, coefOf(m, kq), 1e-6) && Math.abs(CX.normSq(f, 2 * PI) - power(m)) < 1e-6; } };
  });

  reg("fs-period", "Period & fundamental frequency", "fourier-series", () => {
    const p = R.int(1, 9), q = R.int(1, 9); if (p === q) return null;
    const g = CX.gcd(p, q), tau = 2 / g;
    return { q: `<p>What is the fundamental period \\(\\tau\\) of \\(f(t) = \\cos(${p === 1 ? "" : p}\\pi t) + \\sin(${q === 1 ? "" : q}\\pi t)\\), and its fundamental angular frequency \\(\\omega_0\\)?</p>`,
      fields: [fld("τ", tau), fld("ω0", PI * g)],
      sol: `<p>The angular frequencies are \\(${p}\\pi\\) and \\(${q}\\pi\\). The fundamental \\(\\omega_0\\) is the largest number dividing both: \\(\\omega_0 = \\gcd(${p},${q})\\pi = ${g === 1 ? "" : g}\\pi\\), so \\(\\tau = 2\\pi/\\omega_0 = ${tex(tau)}\\). Then the terms are harmonics \\(k = ${p / g}\\) and \\(${q / g}\\).</p>` };
  });

  // piecewise waveforms on (0, τ) with closed-form coefficients
  const WAVES = [
    { name: "square", desc: "f(t) = A on [0, π), −A on [π, 2π)", tau: 2 * PI, tt: "2\\pi", A: true, breaks: [PI], f: (t, A) => (t < PI ? A : -A),
      a: (k, A) => (k === 0 ? C(0) : k % 2 ? C(0, 2 * A / (PI * k)) : C(0)), ak: "a_0 = 0,\\; a_k = \\frac{2iA}{\\pi k}\\;(k\\text{ odd}),\\; 0\\;(k\\text{ even})", n2: A => A * A,
      how: "a_k = \\frac{1}{2\\pi}\\left[\\int_0^\\pi Ae^{ikt}dt - \\int_\\pi^{2\\pi}Ae^{ikt}dt\\right] = \\frac{A(e^{ik\\pi}-1)}{i\\pi k}" },
    { name: "triangle", desc: "the triangle f(t) = 2t on [0, ½], 2(1 − t) on [½, 1]", tau: 1, tt: "1", breaks: [0.5], f: t => (t <= 0.5 ? 2 * t : 2 * (1 - t)),
      a: k => (k === 0 ? C(0.5) : C(((-1) ** Math.abs(k) - 1) / (PI * PI * k * k))), ak: "a_0 = \\tfrac12,\\; a_k = \\frac{(-1)^k - 1}{\\pi^2k^2}", n2: () => 1 / 3,
      how: "integrate by parts on each half (this is Midterm problem 3.1a)" },
    { name: "vee", desc: "the V-shape f(t) = 1 − 2t on [0, ½], 2t − 1 on [½, 1]", tau: 1, tt: "1", breaks: [0.5], f: t => Math.abs(1 - 2 * t),
      a: k => (k === 0 ? C(0.5) : C((1 - (-1) ** Math.abs(k)) / (PI * PI * k * k))), ak: "a_0 = \\tfrac12,\\; a_k = \\frac{1-(-1)^k}{\\pi^2k^2}", n2: () => 1 / 3,
      how: "note f = 1 − (triangle), so a_k = −a_k^{tri} for k ≠ 0" },
    { name: "saw", desc: "f(t) = t on [0, 2π)", tau: 2 * PI, tt: "2\\pi", breaks: [], f: t => t,
      a: k => (k === 0 ? C(PI) : C(0, -1 / k)), ak: "a_0 = \\pi,\\; a_k = \\frac{1}{ik} = -\\frac{i}{k}", n2: () => 4 * PI * PI / 3,
      how: "\\int_0^{2\\pi}te^{ikt}dt = \\left[\\frac{te^{ikt}}{ik}\\right]_0^{2\\pi} - \\frac{1}{ik}\\int_0^{2\\pi}e^{ikt}dt = \\frac{2\\pi}{ik}" },
    { name: "saw1", desc: "f(t) = t on [0, 1)", tau: 1, tt: "1", breaks: [], f: t => t,
      a: k => (k === 0 ? C(0.5) : C(0, -1 / (2 * PI * k))), ak: "a_0 = \\tfrac12,\\; a_k = -\\frac{i}{2\\pi k}", n2: () => 1 / 3,
      how: "integrate by parts; the boundary term gives \\frac{1}{2\\pi i k}" },
    { name: "pulse", desc: "the even pulse f = 1 on [0, δ] ∪ [2π − δ, 2π], 0 otherwise, with δ = π/3", tau: 2 * PI, tt: "2\\pi", breaks: [PI / 3, 2 * PI - PI / 3], f: t => (t <= PI / 3 || t >= 2 * PI - PI / 3 ? 1 : 0),
      a: k => (k === 0 ? C(1 / 3) : C(Math.sin(k * PI / 3) / (PI * k))), ak: "a_0 = \\frac{\\delta}{\\pi},\\; a_k = \\frac{\\sin k\\delta}{\\pi k}", n2: () => 1 / 3,
      how: "f is even, so a_k is real: a_k = \\frac{1}{2\\pi}\\int_{-\\delta}^{\\delta}\\cos(kt)\\,dt" },
    { name: "halfsin", desc: "the half-wave rectified sine f = sin t on [0, π], 0 on [π, 2π]", tau: 2 * PI, tt: "2\\pi", breaks: [PI], f: t => (t <= PI ? Math.sin(t) : 0),
      a: k => (k === 0 ? C(1 / PI) : Math.abs(k) === 1 ? C(0, k / 4) : k % 2 === 0 ? C(-1 / (PI * (k * k - 1))) : C(0)),
      ak: "a_0 = \\tfrac1\\pi,\\; a_{\\pm1} = \\pm\\tfrac{i}{4},\\; a_k = -\\frac{1}{\\pi(k^2-1)}\\;(k\\text{ even}),\\; 0\\;(k\\text{ odd}\\ge3)", n2: () => 1 / 4,
      how: "write \\sin t = \\frac{e^{it}-e^{-it}}{2i}; handle k = ±1 separately" },
    { name: "halfcos", desc: "f = cos t on [0, π], 0 on [π, 2π]", tau: 2 * PI, tt: "2\\pi", breaks: [PI], f: t => (t <= PI ? Math.cos(t) : 0),
      a: k => (k === 0 ? C(0) : Math.abs(k) === 1 ? C(0.25) : k % 2 === 0 ? C(0, k / (PI * (k * k - 1))) : C(0)),
      ak: "a_0 = 0,\\; a_{\\pm1} = \\tfrac14,\\; a_k = \\frac{ik}{\\pi(k^2-1)}\\;(k\\text{ even}),\\; 0\\;(k\\text{ odd}\\ge3)", n2: () => 1 / 4,
      how: "\\frac{1}{4\\pi}\\int_0^\\pi (e^{i(k+1)t} + e^{i(k-1)t})dt; for k = 1 the second exponential is 1, so don't divide by k − 1 = 0" },
    { name: "exp", desc: "f(t) = e^{−t} on [0, 2π)", tau: 2 * PI, tt: "2\\pi", breaks: [], f: t => Math.exp(-t),
      a: k => div(C(1 - Math.exp(-2 * PI)), mul(C(2 * PI), C(1, -k))), ak: "a_k = \\frac{1 - e^{-2\\pi}}{2\\pi(1 - ik)}", n2: () => (1 - Math.exp(-4 * PI)) / (4 * PI),
      how: "\\frac{1}{2\\pi}\\int_0^{2\\pi}e^{(ik-1)t}dt = \\frac{e^{2\\pi(ik-1)}-1}{2\\pi(ik-1)}" },
    { name: "tsq", desc: "f(t) = t² on [0, 1)", tau: 1, tt: "1", breaks: [], f: t => t * t,
      a: k => (k === 0 ? C(1 / 3) : C(1 / (2 * PI * PI * k * k), -1 / (2 * PI * k))), ak: "a_0 = \\tfrac13,\\; a_k = \\frac{1}{2\\pi^2k^2} - \\frac{i}{2\\pi k}", n2: () => 1 / 5,
      how: "integrate by parts twice" },
  ];
  H.WAVES = WAVES;
  reg("fs-wave", "Coefficients of standard waveforms", "fourier-series", () => {
    const W = R.pick(WAVES), A = W.A ? R.pick([1, 2, 3, 0.5]) : 1, k = R.nz(-5, 5) * (Math.random() < 0.85 ? 1 : 0);
    const v = R.int(0, 2), name = W.A ? W.desc.replace("A", tex(A)).replace("−A", "−" + tex(A)) : W.desc;
    const a = W.a(k, A), sol0 = `<p>With \\(\\omega_0 = ${W.tau === 1 ? "2\\pi" : "1"}\\): \\(${W.how}\\). This gives</p>$$${W.ak}${W.A ? `\\quad(A = ${tex(A)})` : ""}.$$`;
    const verify = () => CX.near(CX.fsCoef(t => W.f(t, A), W.tau, k, W.breaks, 400), W.a(k, A), 1e-5);
    if (v === 0) return { q: `<p>Let ${name} in \\(L^2(0, ${W.tt})\\), \\(f = \\sum a_k e^{-ik\\omega_0t}\\). Find \\(a_{${k}}\\).</p>`, fields: ReIm(a, `a_${k}`), sol: sol0 + `<p>For \\(k = ${k}\\): \\(a_{${k}} = ${ctex(a)}\\) \\(\\approx ${CX.str(a, 4)}\\).</p>`, verify };
    if (v === 1) {
      const kk = Math.abs(k) || 1, al = add(W.a(kk, A), W.a(-kk, A)), be = mul(C(0, 1), sub(W.a(-kk, A), W.a(kk, A)));
      return { q: `<p>Let ${name} in \\(L^2(0, ${W.tt})\\). In the cosine–sine form \\(a_0 + \\sum(\\alpha_k\\cos k\\omega_0 t + \\beta_k\\sin k\\omega_0t)\\), find \\(\\alpha_{${kk}}\\) and \\(\\beta_{${kk}}\\).</p>`,
        fields: [fld(`α_${kk}`, al.re), fld(`β_${kk}`, be.re)], sol: sol0 + `<p>Since \\(f\\) is real, \\(\\alpha_k = 2\\Re a_k\\) and \\(\\beta_k = 2\\Im a_k\\): \\(\\alpha_{${kk}} \\approx ${num(al.re)}\\), \\(\\beta_{${kk}} \\approx ${num(be.re)}\\).</p>`, verify };
    }
    const n = R.int(1, 4);
    let kept = 0; for (let j = -n; j <= n; j++) kept += abs(W.a(j, A)) ** 2;
    const err = W.n2(A) - kept;
    return { q: `<p>Let ${name} in \\(L^2(0, ${W.tt})\\) and \\(p_{${n}} = \\sum_{k=-${n}}^{${n}} a_k e^{-ik\\omega_0 t}\\). Find \\(\\|f\\|^2\\) and the squared error \\(\\|f - p_{${n}}\\|^2\\).</p>`,
      fields: [fld("‖f‖²", W.n2(A)), fld(`‖f − p${n}‖²`, err)],
      sol: sol0 + `<p>\\(\\|f\\|^2 = \\frac{1}{\\tau}\\int|f|^2 = ${num(W.n2(A))}\\). By Parseval the error is what's left over: \\(\\|f-p_{${n}}\\|^2 = \\|f\\|^2 - \\sum_{|k|\\le ${n}}|a_k|^2 = ${num(W.n2(A))} - ${num(kept)} \\approx ${num(err)}\\).</p>`,
      verify: () => Math.abs(CX.normSq(t => W.f(t, A), W.tau, W.breaks, 400) - W.n2(A)) < 1e-6 };
  });

  reg("fs-props", "Shift, derivative & other rules", "fourier-series", () => {
    const T = R.pick(TAUS);
    const ks = R.distinct(R.int(2, 3), -3, 3), base = new Map();
    ks.forEach(k => base.set(k, C(R.int(-3, 3), R.int(-3, 3))));
    if ([...base.values()].every(c => abs(c) < 1e-12)) base.set(1, C(1, 1));
    const list = `\\(${[...base.keys()].sort((a, b) => a - b).map(k => `a_{${k}} = ${ctex(base.get(k))}`).join(",\\; ")}\\)`;
    const q0 = `<p>A \\(\\tau\\)-periodic \\(f = \\sum a_k e^{-ik\\omega_0 t}\\) with \\(\\tau = ${T.tt}\\) has ${list}, all other \\(a_k = 0\\).</p>`;
    const v = R.int(0, 5), w0t = T.w0 === 1 ? "1" : T.w0 === PI ? "\\pi" : "2\\pi";
    const get = k => base.get(k) || C(0);
    const k = R.pick([...base.keys()].filter(k => abs(get(k)) > 0 && k !== 0).concat([1]));
    if (v === 0) {
      const Tsh = R.pick([1 / 4, 1 / 2, 1 / 3, 1 / 6]) * T.tau, ph = k * T.w0 * Tsh, ans = mul(get(k), polar(1, ph));
      return { q: q0 + `<p>Let \\(g(t) = f(t - ${tex(Tsh / PI) !== num(Tsh / PI) ? tex(Tsh / PI) + "\\pi" : tex(Tsh)})\\). Find the coefficient \\(a'_{${k}}\\) of \\(g\\).</p>`, fields: ReIm(ans),
        sol: `<p>\\(g(t) = \\sum a_k e^{-ik\\omega_0(t - T)} = \\sum (a_k e^{ik\\omega_0 T})e^{-ik\\omega_0t}\\), so \\(a'_k = a_k e^{ik\\omega_0T}\\). Here \\(k\\omega_0T = ${angTex(ph)}\\): \\(a'_{${k}} = ${P(get(k))}e^{i${angTex(ph)}} = ${ctex(ans)}\\). A time shift only rotates the phase: \\(|a'_k| = |a_k|\\).</p>` };
    }
    if (v === 1) {
      const n = R.nz(-2, 2), kk = R.pick([...base.keys()].map(j => j + n)), ans = get(kk - n);
      return { q: q0 + `<p>Let \\(h(t) = e^{${n < 0 ? "" : "-"}i${Math.abs(n) === 1 ? "" : Math.abs(n)}\\omega_0 t}f(t)\\). Find the coefficient \\(a''_{${kk}}\\) of \\(h\\).</p>`, fields: ReIm(ans),
        sol: `<p>\\(e^{-in\\omega_0t}f = \\sum a_k e^{-i(k+n)\\omega_0t}\\), so the spectrum slides: \\(a''_k = a_{k-n}\\). With \\(n = ${n}\\): \\(a''_{${kk}} = a_{${kk - n}} = ${ctex(ans)}\\).</p>` };
    }
    if (v === 2) {
      const ans = mul(C(0, -k * T.w0), get(k));
      return { q: q0 + `<p>Find the coefficient \\(b_{${k}}\\) of \\(\\dot f(t) = \\sum b_k e^{-ik\\omega_0t}\\).</p>`, fields: ReIm(ans),
        sol: `<p>Differentiate term by term: \\(\\frac{d}{dt}e^{-ik\\omega_0 t} = -ik\\omega_0 e^{-ik\\omega_0 t}\\), so \\(b_k = -ik\\omega_0 a_k = -i(${k})(${w0t})${P(get(k))} \\approx ${CX.str(ans, 4)}\\). Careful: with the engineering convention \\(e^{+jk\\omega_0t}\\) (some lecture slides) the sign flips to \\(+jk\\omega_0\\).</p>` };
    }
    if (v === 3) {
      const ans = conj(get(-k));
      return { q: q0 + `<p>Find the coefficient \\(a'_{${k}}\\) of \\(\\overline{f(t)}\\).</p>`, fields: ReIm(ans),
        sol: `<p>\\(\\overline{f} = \\sum \\overline{a_k}e^{+ik\\omega_0t} = \\sum \\overline{a_{-k}}e^{-ik\\omega_0t}\\), so \\(a'_k = \\overline{a_{-k}}\\): \\(a'_{${k}} = \\overline{a_{${-k}}} = ${ctex(ans)}\\). (If \\(f\\) is real this says \\(a_{-k} = \\overline{a_k}\\).)</p>` };
    }
    if (v === 4) {
      const ans = div(mul(C(0, 1), get(k)), C(k * T.w0));
      return { q: q0 + `<p>Let \\(g(t) = \\int_0^t (f(s) - a_0)\\,ds\\). For \\(k \\ne 0\\), find \\(b_{${k}}\\) in \\(g = \\sum b_k e^{-ik\\omega_0t}\\).</p>`, fields: ReIm(ans),
        sol: `<p>\\(\\dot g = f - a_0\\), and differentiating \\(g\\) multiplies its coefficients by \\(-ik\\omega_0\\). So \\(-ik\\omega_0 b_k = a_k\\), \\(b_k = \\frac{i a_k}{k\\omega_0} \\approx ${CX.str(ans, 4)}\\). (Midterm 3.2 used this trick; \\(b_0\\) must be found separately.)</p>` };
    }
    let ans = C(0); for (const [m, am] of base) ans = add(ans, mul(am, get(k - m)));
    return { q: q0 + `<p>Find the coefficient \\(c_{${k}}\\) of \\(f(t)^2 = \\sum c_k e^{-ik\\omega_0t}\\).</p>`, fields: ReIm(ans),
      sol: `<p>Multiplying series convolves the coefficients: \\(c_k = \\sum_m a_m a_{k-m}\\). For \\(k = ${k}\\): \\(${[...base.keys()].map(m => `a_{${m}}a_{${k - m}}`).join(" + ")} = ${ctex(ans)}\\).</p>` };
  });

  reg("fs-concepts", "Convergence, Gibbs & symmetry", "fourier-series", () => {
    const pool = [
      () => mc("<p>The partial sums \\(p_n\\) of the square wave's Fourier series overshoot near each jump. As \\(n\\to\\infty\\), the overshoot…</p>", "stays about 9% of the jump, but squeezes closer to the jump", ["shrinks to zero", "grows without bound", "disappears once n is odd"], "<p>That is the Gibbs phenomenon: a continuous \\(p_n\\) approximating a discontinuous \\(f\\). The overshoot is about 8.9% of the jump for every \\(n\\), but its width shrinks, so \\(\\|f - p_n\\| \\to 0\\) anyway.</p>"),
      () => mc("<p>By Dirichlet's theorem, at a jump \\(t_0\\) of a piecewise-smooth \\(f\\), the Fourier series converges to…</p>", "\\(\\tfrac12[f(t_0^+) + f(t_0^-)]\\), the midpoint of the jump", ["\\(f(t_0^+)\\)", "\\(f(t_0^-)\\)", "nothing: it diverges"], "<p>The series converges to the average of the left and right limits at a jump, and to \\(f(t)\\) wherever \\(f\\) is continuous.</p>"),
      () => { const a = R.int(1, 4), b = R.int(5, 9); return mc(`<p>\\(f(t) = t\\) on \\([0, 2\\pi)\\) has \\(f(0) \\ne f(2\\pi)\\). What does its Fourier series converge to at \\(t = 0\\)?</p>`, "\\(\\pi\\)", ["\\(0\\)", "\\(2\\pi\\)", "it diverges"], "<p>The \\(2\\pi\\)-periodic extension jumps from \\(2\\pi\\) down to 0 at \\(t = 0\\); the series gives the average \\(\\pi\\). This is also why Gibbs appears at the endpoints when \\(f(0) \\ne f(\\tau)\\).</p>"); },
      () => mc("<p>If \\(f\\) is real and <b>even</b> on a period, which coefficients vanish?</p>", "All \\(\\beta_k\\) (sine terms); the \\(a_k\\) are real", ["All \\(\\alpha_k\\) and \\(a_0\\)", "Only \\(a_0\\)", "None"], "<p>\\(f(t)\\sin(k\\omega_0t)\\) is odd, so its integral over a symmetric period is zero: \\(\\beta_k = 0\\), and \\(a_k = \\alpha_k/2\\) is real.</p>"),
      () => mc("<p>If \\(f\\) is real and <b>odd</b>, which coefficients vanish?</p>", "\\(a_0\\) and all \\(\\alpha_k\\); the \\(a_k\\) are purely imaginary", ["All \\(\\beta_k\\)", "Only the even-\\(k\\) terms", "None"], "<p>\\(f\\cos(k\\omega_0t)\\) is odd, so \\(\\alpha_k = 0\\) and \\(a_0 = 0\\); \\(a_k = i\\beta_k/2\\).</p>"),
      () => { const a = R.pick([3, 4, 5, 10]); const n = R.int(5, 9); return mc(`<p>A real function has \\(a_{${n}} = ${a} + ${a - 1}i\\). What is \\(a_{-${n}}\\)?</p>`, `\\(${a} - ${a - 1}i\\)`, [`\\(-${a} - ${a - 1}i\\)`, `\\(${a} + ${a - 1}i\\)`, `\\(-${a} + ${a - 1}i\\)`], "<p>For real \\(f\\), \\(a_{-k} = \\overline{a_k}\\) (book exercise 2.2.1 problem 8).</p>"); },
      () => mc("<p>Which function is <b>not</b> in \\(L^2(0,1)\\)?</p>", "\\(t^{-1/2}\\)", ["\\(t^{-1/4}\\)", "\\(\\sin(1/t)\\)", "\\(e^{t}\\)"], "<p>\\(\\int_0^1 |t^{-1/2}|^2dt = \\int_0^1 t^{-1}dt = \\infty\\). The others have finite \\(\\int|f|^2\\) (\\(t^{-1/4}\\) gives \\(\\int t^{-1/2} = 2\\)).</p>"),
      () => mc("<p>The coefficients of the triangle wave decay like \\(1/k^2\\) while the square wave's decay like \\(1/k\\). Why?</p>", "The triangle is continuous with \\(f(0) = f(\\tau)\\); the square wave has jumps", ["The triangle has a larger period", "The square wave is odd", "The triangle has no DC term"], "<p>Each jump in \\(f\\) (or its periodic extension) makes the coefficients decay only like \\(1/k\\). Continuity, with a piecewise-smooth derivative, gives \\(1/k^2\\) (Wiener algebra, uniform convergence, no Gibbs).</p>"),
      () => mc("<p>\\(\\{\\cos k\\omega_0t, \\sin k\\omega_0t\\}_{k\\ge1}\\cup\\{1\\}\\) in \\(L^2(0,\\tau)\\) (normalized) is…</p>", "orthogonal but not orthonormal: \\(\\|\\cos\\|^2 = \\|\\sin\\|^2 = \\tfrac12\\)", ["orthonormal", "not orthogonal", "orthonormal only when \\(\\tau = 2\\pi\\)"], "<p>Midterm 2.1: the set is orthogonal; \\(\\|1\\| = 1\\) but \\(\\|\\cos k\\omega_0t\\|^2 = \\tfrac12\\). Rescale by \\(\\sqrt2\\) to make it orthonormal.</p>"),
      () => mc("<p>When does the basis \\(\\{u_k\\}\\) of an inner-product space form an orthonormal basis?</p>", "\\((u_i, u_j) = \\delta_{ij}\\) for all \\(i, j\\)", ["\\((u_i,u_j) = 0\\) for \\(i\\ne j\\)", "\\(\\|u_i\\| = 1\\) for every \\(i\\)", "the \\(u_i\\) are linearly independent"], "<p>Orthonormal = orthogonal and unit length, which is exactly \\((u_i,u_j) = \\delta_{ij}\\) (Lecture 6 clicker question).</p>"),
      () => mc("<p>\\(f\\) on \\([-\\mu,\\mu]\\) has coefficients \\(a_k\\). The shifted function \\(f(t-\\mu)\\) on \\([0, 2\\mu]\\) has coefficients…</p>", "\\(d_k = (-1)^k a_k\\)", ["\\(d_k = a_k\\)", "\\(d_k = -a_k\\)", "\\(d_k = a_{k-1}\\)"], "<p>\\(d_k = a_k e^{ik\\omega_0\\mu} = a_k e^{ik\\pi} = (-1)^k a_k\\), since \\(\\omega_0\\mu = \\pi\\). Same power spectrum.</p>"),
    ];
    return R.pick(pool)();
  });

  // ======================= DFT =======================
  reg("dft-matrix", "The DFT matrix F_ν", "dft", () => {
    const nu = R.pick([3, 4, 5, 6, 8]), v = R.int(0, 3);
    if (v === 0) {
      const j = R.int(1, nu - 1), k = R.int(1, nu - 1), w = polar(1, -2 * PI * ((j * k) % nu) / nu);
      return { q: `<p>Give the entry of the \\(${nu}\\times${nu}\\) DFT matrix \\(F_{${nu}}\\) in row \\(j = ${j}\\), column \\(k = ${k}\\) (rows and columns counted from 0).</p>`, fields: ReIm(w),
        sol: `<p>\\(F_\\nu[j,k] = \\lambda_j^k = e^{-2\\pi i jk/\\nu}\\). Here \\(jk = ${j * k} \\equiv ${(j * k) % nu} \\pmod{${nu}}\\), so the entry is \\(e^{-2\\pi i\\cdot ${(j * k) % nu}/${nu}} \\approx ${CX.str(w, 4)}\\).</p>` };
    }
    if (v === 1) {
      const j = R.int(1, nu - 1), k = R.int(1, nu - 1), w = scale(polar(1, 2 * PI * ((j * k) % nu) / nu), 1 / nu);
      return { q: `<p>Give the entry \\((j, k) = (${j}, ${k})\\) of \\(F_{${nu}}^{-1}\\) (counting from 0).</p>`, fields: ReIm(w),
        sol: `<p>\\(F_\\nu^{-1} = \\frac1\\nu F_\\nu^* = \\frac1\\nu\\overline{F_\\nu}\\) (and \\(F_\\nu\\) is symmetric). So the entry is \\(\\frac1{${nu}}e^{+2\\pi i\\cdot${(j * k) % nu}/${nu}} \\approx ${CX.str(w, 4)}\\).</p>` };
    }
    if (v === 2) {
      const m = R.int(1, Math.floor((nu - 1) / 2)), s = R.pick([1, -1]) * m, slot = s >= 0 ? s + 1 : nu + s + 1;
      return { q: `<p>In MATLAB, <code>a = ifft(y)</code> with \\(\\nu = ${nu}\\) samples. Which index of <code>a</code> (MATLAB counts from 1) holds \\(a_{${s}}\\)?</p>`, fields: [fld("index", slot)],
        sol: `<p>The order is \\([a_0, a_1, \\dots, a_n, a_{-m}, \\dots, a_{-1}]\\). Nonnegative \\(k\\) sit at index \\(k+1\\); negative \\(k\\) wrap to index \\(\\nu + k + 1\\). So \\(a_{${s}}\\) is <code>a(${slot})</code>.</p>` };
    }
    const n4 = 4, y = Array.from({ length: n4 }, () => R.int(-3, 4)), a = CX.ifft(y), kk = R.pick([0, 1, 2, -1]), slot = (kk + 4) % 4;
    return { q: `<p>Samples \\(y = [${y.join(",\\;")}]^T\\) (\\(\\nu = 4\\)). With \\(F_4 = \\begin{bmatrix}1&1&1&1\\\\1&-i&-1&i\\\\1&-1&1&-1\\\\1&i&-1&-i\\end{bmatrix}\\) and \\(u = F_4^{-1}y = [a_0, a_1, a_2, a_{-1}]^T\\), find \\(a_{${kk}}\\).</p>`, fields: ReIm(a[slot]),
      sol: `<p>\\(F_4^{-1} = \\tfrac14\\overline{F_4}\\), so \\(a_{${kk}} = \\tfrac14\\sum_j y_j\\,e^{+2\\pi i j(${slot})/4} = ${ctex(a[slot])}\\). Note \\(a_0\\) is always the mean of the data (${tex(y.reduce((s, x) => s + x, 0) / 4)} here).</p>` };
  });

  reg("dft-ifft", "Function ↔ ifft array", "dft", () => {
    const nu = R.pick([4, 5, 6, 8]), K = Math.floor((nu - 1) / 2);
    const terms = [{ type: "const", A: R.nz(-6, 8) }];
    const ks = R.distinct(Math.min(2, K), 1, K);
    ks.forEach(k => { const r = R.int(0, 2); if (r !== 1) terms.push({ type: "c", k, A: R.nz(-6, 6) }); if (r !== 0) terms.push({ type: "s", k, A: R.nz(-6, 6) }); });
    const m = trigToCoef(terms), T = TAUS[0];
    const arr = Array.from({ length: nu }, (_, r) => coefOf(m, CX.slotHarmonic(r, nu)));
    const harm = Array.from({ length: nu }, (_, r) => CX.slotHarmonic(r, nu));
    if (Math.random() < 0.55) {
      const idx = R.int(1, nu);
      return { q: `<p>\\(g(t) = ${trigTex(terms, T)}\\) is sampled at \\(t_k = 2\\pi k/${nu}\\), \\(k = 0,\\dots,${nu - 1}\\). Find <code>a(${idx})</code> where <code>a = ifft(g)</code>.</p>`, fields: ReIm(arr[idx - 1]),
        sol: `<p>With enough samples, <code>ifft</code> returns the Fourier coefficients in the order of harmonics \\([${harm.join(", ")}]\\). Convert: \\(a_k = (\\alpha_k + i\\beta_k)/2\\), \\(a_{-k} = \\overline{a_k}\\). So <code>a</code> \\(= [${arr.map(c => ctex(c)).join(",\\;")}]\\), and <code>a(${idx})</code> holds \\(a_{${harm[idx - 1]}} = ${ctex(arr[idx - 1])}\\).</p>`,
        verify: () => { const s = Array.from({ length: nu }, (_, j) => { const t = 2 * PI * j / nu; return terms.reduce((acc, q) => acc + (q.type === "const" ? q.A : q.type === "c" ? q.A * Math.cos(q.k * t) : q.A * Math.sin(q.k * t)), 0); }); const a = CX.ifft(s); return a.every((c, i) => CX.near(c, arr[i], 1e-9)); } };
    }
    const k = R.pick(ks), al = 2 * coefOf(m, k).re, be = 2 * coefOf(m, k).im;
    return { q: `<p>A real signal on \\([0, 2\\pi]\\) gives <code>a = ifft(g)</code> \\(= [${arr.map(c => ctex(c)).join(",\\;")}]\\) (\\(\\nu = ${nu}\\)). Writing \\(g = a_0 + \\sum(\\alpha_k\\cos kt + \\beta_k\\sin kt)\\), find \\(a_0\\), \\(\\alpha_{${k}}\\), \\(\\beta_{${k}}\\).</p>`,
      fields: [fld("a0", coefOf(m, 0).re), fld(`α_${k}`, al), fld(`β_${k}`, be)],
      sol: `<p>Slot \\(k+1\\) holds \\(a_k\\): \\(a_{${k}} = ${ctex(coefOf(m, k))}\\). For real signals \\(\\alpha_k = 2\\Re a_k = ${tex(al)}\\), \\(\\beta_k = 2\\Im a_k = ${tex(be)}\\). The constant is <code>a(1)</code> \\(= ${tex(coefOf(m, 0).re)}\\), not doubled. Don't add the negative-frequency slots again: each pair is already one sinusoid. So \\(g = ${trigTex(terms, T)}\\).</p>` };
  });

  reg("dft-freq", "Reading FFT spectra (Hz, bins, Nyquist)", "dft", () => {
    const v = R.int(0, 5);
    const N = R.pick([1024, 2048, 4096]), Fs = R.pick([500, 1000, 2000, 8000]);
    if (v === 0) {
      const [r1, r2] = R.distinct(2, 20, N / 2 - 20).sort((a, b) => a - b);
      const idx = [r1 + 1, r2 + 1, N - r2 + 1, N - r1 + 1];
      return { q: `<p>\\(f(t) = \\sum_n \\xi_n\\cos(2\\pi f_n t)\\) is sampled \\(N = ${N}\\) times at \\(F_s = ${Fs}\\) Hz. <code>|fft(x)|²</code> has peaks at MATLAB indices ${idx.join(", ")}. How many cosines are there, and what are their frequencies (low, high) in Hz?</p>`,
        fields: [fld("number of cosines", 2), fld("f low (Hz)", r1 * Fs / N), fld("f high (Hz)", r2 * Fs / N)],
        sol: `<p>Bin spacing \\(\\Delta f = F_s/N = ${num(Fs / N)}\\) Hz. MATLAB index \\(k\\) is bin \\(r = k-1\\). Bins \\(r > N/2\\) are negative frequencies \\(r - N\\). Here the peaks at ${idx[2]} and ${idx[3]} mirror ${idx[1]} and ${idx[0]} (\\(${idx[2] - 1} = ${N} - ${r2}\\)). A real cosine makes a ± pair, so there are 2 cosines, at \\(${r1}\\Delta f \\approx ${num(r1 * Fs / N)}\\) Hz and \\(${r2}\\Delta f \\approx ${num(r2 * Fs / N)}\\) Hz.</p>` };
    }
    if (v === 1) {
      const r = R.int(10, N - 10), idx = r + 1, fft = (r <= N / 2 ? r : r - N) * Fs / N;
      return { q: `<p>\\(f(t) = \\sum \\eta_n e^{-i2\\pi f_n t}\\) (complex exponentials) is sampled \\(N = ${N}\\) times at \\(F_s = ${Fs}\\) Hz. <code>fft(x)</code> has a peak at MATLAB index ${idx}. What is the corresponding \\(f_n\\) (signed, Hz)?</p>`,
        fields: [fld("f_n (Hz)", -fft)],
        sol: `<p>Bin \\(r = ${r}\\) has signed frequency \\(${r <= N / 2 ? r : `(${r} - ${N})`}\\cdot F_s/N = ${num(fft)}\\) Hz. MATLAB's <code>fft</code> uses the kernel \\(e^{-i2\\pi rj/N}\\), and the signal is written with \\(e^{-i2\\pi f_n t}\\), so a peak at FFT frequency \\(f\\) means \\(f_n = -f \\approx ${num(-fft)}\\) Hz (Midterm 4.3). With <code>ifft</code> (the course's \\(a_k\\)) there is no sign flip.</p>` };
    }
    if (v === 2) {
      const f0 = R.int(2, 60) * Fs / N * R.int(1, 3), r = Math.round(f0 * N / Fs);
      return { q: `<p>A real cosine at \\(${num(r * Fs / N)}\\) Hz is sampled \\(N = ${N}\\) times at \\(F_s = ${Fs}\\) Hz. At which two MATLAB indices of <code>fft(x)</code> do the peaks appear?</p>`,
        fields: [fld("lower index", r + 1), fld("higher index", N - r + 1)],
        sol: `<p>\\(r = f N/F_s = ${r}\\), so index \\(r + 1 = ${r + 1}\\), and its mirror at \\(N - r + 1 = ${N - r + 1}\\).</p>` };
    }
    if (v === 3) {
      const n = R.int(8, 16), nu = 2 ** n;
      return { q: `<p>For \\(\\nu = 2^{${n}}\\) points, about how many times faster is the FFT (\\(\\approx \\nu\\log_2\\nu\\) operations) than the direct matrix product (\\(\\approx\\nu^2\\))?</p>`, fields: [fld("speed-up", nu / n)],
        sol: `<p>\\(\\nu^2/(\\nu\\log_2\\nu) = \\nu/\\log_2\\nu = 2^{${n}}/${n} \\approx ${num(nu / n)}\\). This is why the course uses \\(\\nu = 2^{12} = 4096\\) and up.</p>` };
    }
    if (v === 4) {
      const Tw = R.pick([2, 4, 10, 20]), k = R.int(3, 40), P = R.pick([1, 4, 9, 2.25, 6.25]);
      return { q: `<p>\\(g(t) = \\alpha\\cos(\\omega t)\\), \\(\\alpha > 0\\), is sampled at \\(t_k = ${Tw}k/N\\) for large \\(N\\). The power spectrum \\(|a_k|^2\\) of <code>ifft(g)</code> peaks at \\(k = ${k}\\) with height ${num(P)}. Find \\(\\alpha\\) and \\(\\omega\\) (rad/s).</p>`,
        fields: [fld("α", 2 * Math.sqrt(P)), fld("ω", 2 * PI * k / Tw)],
        sol: `<p>Window \\(\\tau = ${Tw}\\), so \\(\\omega_0 = 2\\pi/${Tw}\\) and \\(\\omega = ${k}\\omega_0 = ${tex(2 * k / Tw)}\\pi \\approx ${num(2 * PI * k / Tw)}\\). A cosine splits into two exponentials of amplitude \\(\\alpha/2\\): \\(|a_k| = \\sqrt{${num(P)}} = \\alpha/2\\), so \\(\\alpha = ${num(2 * Math.sqrt(P))}\\).</p>` };
    }
    const K = R.int(3, 12), nu = R.int(K + 1, 2 * K + 4);
    const ok = nu >= 2 * K + 1, alias = ((K % nu) + nu) % nu, aliasH = alias > nu / 2 ? alias - nu : alias;
    return mc(`<p>A trigonometric polynomial with highest harmonic \\(${K}\\) (frequencies \\(-${K}\\omega_0,\\dots,${K}\\omega_0\\)) is sampled at \\(\\nu = ${nu}\\) equally spaced points over one period. Can <code>ifft</code> recover it exactly?</p>`,
      ok ? `Yes: \\(\\nu \\ge 2\\cdot${K}+1 = ${2 * K + 1}\\)` : `No: harmonic ${K} aliases to harmonic ${aliasH}`,
      ok ? [`No: harmonic ${K} aliases`, "Only if ν is a power of 2", "Only the cosine terms"] : [`Yes: \\(\\nu > ${K}\\) is enough`, "Yes, if ν is a power of 2", `No: harmonic ${K} aliases to harmonic ${K - 1}`],
      `<p>The Nyquist condition for this setting is that all harmonics lie strictly inside \\((-\\nu/2, \\nu/2)\\), i.e. \\(\\nu \\ge 2K+1\\). Sampling cannot tell \\(e^{-ik\\omega_0t}\\) from \\(e^{-i(k+\\ell\\nu)\\omega_0t}\\), so harmonic ${K} looks like harmonic \\(${K} \\bmod ${nu} \\to ${aliasH}\\). (Example from the notes: \\(2\\sin 4t\\) sampled 5 times looks like \\(-2\\sin t\\).)</p>`);
  });
})(typeof window !== "undefined" ? window : globalThis);
