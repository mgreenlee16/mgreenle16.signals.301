/*
 * gen-final.js — problem generators for the Final: sinusoid response and Bode plots (Ch. 8),
 * filters (ideal, Butterworth, all-pass; Ch. 8–9) and the Fourier transform (Ch. 10–11).
 * Conventions follow the notes: y_ss(t) = |G(iω)| cos(ωt + φ(iω)) with φ = ∠G(iω),
 * Ĝ(ω) = ∫ e^{-iωt} g(t) dt and g(t) = (1/2π) ∫ e^{iωt} Ĝ(ω) dω.
 */
(function (root) {
  "use strict";
  const CX = root.CX || require("./cx.js");
  const QZ = root.QZ || require("./quiz.js");
  if (!root.GH || !root.GH.sp) { require("./gen-exam1.js"); require("./gen-exam2.js"); }
  const { C, abs, arg, tex, num } = CX;
  const { lin, ptex, fld, mc, sp, fr } = root.GH;
  const R = QZ.R, PI = Math.PI;
  const GROUP = { bode: "Sinusoid response & Bode", filters: "Filters", "fourier-transform": "Fourier transform" };
  const reg = (id, title, lesson, gen) => QZ.register(id, { title, exam: 3, group: GROUP[lesson], lesson }, gen);
  const Giw = (n, d, w) => CX.div(CX.polyval(n, C(0, w)), CX.polyval(d, C(0, w)));
  const dB = x => 20 * Math.log10(x);
  const nearR = (a, b, tol = 1e-7) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

  // random stable G with real poles (and maybe a zero), as {n, d, tex}
  function randG() {
    const v = R.int(0, 2);
    if (v === 0) { const a = R.int(1, 6), K = R.nz(-8, 10); return { n: [K], d: [1, a], t: fr(K, `s + ${a}`) }; }
    if (v === 1) { const [a, b] = R.distinct(2, 1, 6), K = R.nz(-6, 12); return { n: [K], d: [1, a + b, a * b], t: fr(K, `(s + ${a})(s + ${b})`) }; }
    const a = R.int(1, 5), z = R.nz(-4, 4), K = R.nz(-5, 6), b = R.int(1, 5);
    return { n: [K, -K * z], d: [1, a + b, a * b], t: fr(`${K === 1 ? "" : K === -1 ? "-" : K}${sp(z)}`, `(s + ${a})(s + ${b})`) };
  }

  // ======================= SINUSOID RESPONSE & BODE =======================
  reg("fr-steady", "Steady-state response to sinusoids", "bode", () => {
    const G = randG(), w = R.pick([1, 2, 3, 4, 5, 6, 8, 10]), A0 = R.int(-4, 4), B = R.nz(1, 6), useSin = Math.random() < 0.4;
    const g0 = G.n[G.n.length - 1] / G.d[G.d.length - 1], Gw = Giw(G.n, G.d, w), amp = B * abs(Gw), ph = arg(Gw);
    const trig = useSin ? "\\sin" : "\\cos";
    return {
      q: `<p>\\(G(s) = ${G.t}\\) is driven by \\(u(t) = ${lin([[A0, ""], [B, `${trig} ${w}t`]])}\\). The steady-state output is \\(y_{ss}(t) = c + M${trig}(${w}t + \\phi)\\). Find \\(c\\), \\(M\\) and \\(\\phi\\) (radians).</p>`,
      fields: [fld("c", g0 * A0), fld("M", amp), fld("φ (rad)", ph, "ang")],
      sol: `<p>\\(G\\) is stable (poles in the left half-plane), so each sinusoid passes through scaled by \\(|G(i\\omega)|\\) and shifted by \\(\\phi = \\angle G(i\\omega)\\), and the constant is scaled by \\(G(0)\\).</p><p>\\(G(0) = ${tex(g0)}\\), so \\(c = ${tex(g0 * A0)}\\). \\(G(${w}i) = ${CX.str(Gw, 4)}\\), so \\(|G(${w}i)| = ${num(abs(Gw))}\\), \\(M = ${B}\\cdot${num(abs(Gw))} = ${num(amp)}\\), and \\(\\phi = \\angle G(${w}i) = ${num(ph)}\\) rad. Watch the quadrant when computing the angle: a negative gain adds \\(\\pi\\).</p>`,
      verify: () => { // compare with a long simulation through residues
        const den = CX.conv(G.d, useSin ? [1, 0, w * w] : [1, 0, w * w]).map(c => c.re), numr = CX.conv(G.n, useSin ? [w] : [1, 0]).map(c => c.re);
        const pf = CX.residues(numr, den), t = 40 + 0.37;
        const ytr = CX.invLaplaceAt(pf, t) * B + g0 * A0;
        const yss = g0 * A0 + amp * (useSin ? Math.sin(w * t + ph) : Math.cos(w * t + ph));
        return nearR(ytr, yss, 1e-5);
      },
    };
  });
  reg("fr-bode", "Bode plots", "bode", () => {
    const v = R.int(0, 2);
    if (v === 0) {
      const G = randG(), w = R.pick([0.1, 1, 2, 5, 10, 100]), m = dB(abs(Giw(G.n, G.d, w)));
      return { q: `<p>Find the magnitude Bode plot value \\(20\\log_{10}|G(i\\omega)|\\) of \\(G(s) = ${G.t}\\) at \\(\\omega = ${w}\\) rad/s.</p>`, fields: [fld("dB", m, "num", 2e-3)],
        sol: `<p>\\(|G(${w}i)| = ${num(abs(Giw(G.n, G.d, w)))}\\), so \\(20\\log_{10}|G| = ${num(m)}\\) dB. Factor by factor: each \\(|i\\omega + a| = \\sqrt{\\omega^2 + a^2}\\).</p>` };
    }
    if (v === 1) {
      const nz = R.int(0, 1), np = R.int(1, 3) + nz, rel = np - nz;
      const right = `\\(-${20 * rel}\\) dB/decade`;
      return mc(`<p>A stable transfer function has ${np} poles and ${nz} zero${nz === 1 ? "" : "s"}, all real and below 10 rad/s. What is the slope of its magnitude Bode plot for \\(\\omega \\gg 10\\)?</p>`, right,
        Array.from(new Set([`\\(-${20 * np}\\) dB/decade`, `\\(-${20 * (rel + 1)}\\) dB/decade`, `\\(+${20 * rel}\\) dB/decade`, `\\(-${20 * (rel + 2)}\\) dB/decade`])).filter(x => x !== right).slice(0, 3),
        `<p>Each pole contributes \\(-20\\) dB/decade above its corner frequency and each zero \\(+20\\). At high frequency the slope is \\(-20(\\#\\text{poles} - \\#\\text{zeros}) = -${20 * rel}\\) dB/decade. A complex pair counts as two poles (\\(-40\\)).</p>`);
    }
    const K = R.pick([1, 10, 100, 0.1, 20]), a = R.pick([1, 2, 5, 10]);
    const g0 = K / a;
    return { q: `<p>\\(G(s) = ${fr(tex(K), `s + ${a}`)}\\). Find the low-frequency gain in dB and the corner (break) frequency.</p>`, fields: [fld("low-frequency gain (dB)", dB(g0)), fld("corner ω (rad/s)", a)],
      sol: `<p>For \\(\\omega \\ll ${a}\\), \\(|G| \\approx G(0) = ${tex(g0)}\\), so \\(20\\log_{10}${tex(g0)} = ${num(dB(g0))}\\) dB. The corner is at the pole, \\(\\omega = ${a}\\), where the true curve is 3 dB below the asymptote. Above it the plot falls at \\(-20\\) dB/decade, and the phase goes from \\(0\\) to \\(-\\pi/2\\), passing \\(-\\pi/4\\) at the corner.</p>` };
  });
  reg("fr-second", "Natural frequency, damping and resonance", "bode", () => {
    const wn = R.pick([1, 2, 3, 4, 5, 10]), zeta = R.pick([0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]);
    const b = 2 * zeta * wn, c = wn * wn;
    const wr = wn * Math.sqrt(1 - 2 * zeta * zeta), peak = 1 / (2 * zeta * Math.sqrt(1 - zeta * zeta));
    return {
      q: `<p>\\(G(s) = ${fr(tex(c), ptex([1, b, c]))}\\). Find the natural frequency \\(\\omega_n\\), damping ratio \\(\\zeta\\), resonance frequency \\(\\omega_r\\) and peak gain \\(|G(i\\omega_r)|\\).</p>`,
      fields: [fld("ωn", wn), fld("ζ", zeta), fld("ωr", wr), fld("|G(iωr)|", peak)],
      sol: `<p>Match \\(s^2 + 2\\zeta\\omega_ns + \\omega_n^2\\): \\(\\omega_n = \\sqrt{${tex(c)}} = ${wn}\\), \\(\\zeta = ${tex(b)}/(2\\cdot${wn}) = ${zeta}\\). Since \\(\\zeta \\le 1/\\sqrt2\\), the magnitude peaks at</p>$$\\omega_r = \\omega_n\\sqrt{1 - 2\\zeta^2} = ${num(wr)},\\qquad |G(i\\omega_r)| = \\frac{1}{2\\zeta\\sqrt{1-\\zeta^2}} = ${num(peak)}\\ (${num(dB(peak))}\\text{ dB}).$$<p>At \\(\\omega_n\\) itself, \\(|G(i\\omega_n)| = 1/(2\\zeta) = ${num(1 / (2 * zeta))}\\) and the phase is \\(-\\pi/2\\). The poles are \\(-\\zeta\\omega_n \\pm i\\omega_n\\sqrt{1-\\zeta^2}\\).</p>`,
      verify: () => { const f = w => abs(Giw([c], [1, b, c], w)); return nearR(f(wr), peak, 1e-9) && f(wr) >= f(wr * 1.01) && f(wr) >= f(wr * 0.99); },
    };
  });

  // ======================= FILTERS =======================
  const butterPoles = (n, wc) => Array.from({ length: n }, (_, k) => CX.mul(C(0, wc), CX.polar(1, (PI + 2 * PI * k) / (2 * n))));
  reg("flt-butter", "Butterworth filters", "filters", () => {
    const v = R.int(0, 2), n = R.int(1, 5), wc = R.pick([1, 2, 5, 10, 100]);
    if (v === 0) {
      const w = wc * R.pick([0.5, 2, 3, 5, 10]), hp = Math.random() < 0.4;
      const mag = hp ? 1 / Math.sqrt(1 + (wc / w) ** (2 * n)) : 1 / Math.sqrt(1 + (w / wc) ** (2 * n));
      return { q: `<p>For the order-${n} ${hp ? "high" : "low"}-pass Butterworth filter with cutoff \\(\\omega_c = ${wc}\\) rad/s, find \\(|G(i\\omega)|\\) and \\(20\\log_{10}|G(i\\omega)|\\) at \\(\\omega = ${w}\\).</p>`,
        fields: [fld("|G(iω)|", mag), fld("dB", dB(mag), "num", 2e-3)],
        sol: `<p>${hp ? `High-pass: \\(|H(i\\omega)|^2 = \\frac{(\\omega/\\omega_c)^{2n}}{1 + (\\omega/\\omega_c)^{2n}} = \\frac{1}{1 + (\\omega_c/\\omega)^{2n}}\\)` : `Low-pass: \\(|G(i\\omega)|^2 = \\frac{1}{1 + (\\omega/\\omega_c)^{2n}}\\)`}. With \\(\\omega/\\omega_c = ${num(w / wc)}\\) and \\(n = ${n}\\): \\(|G| = ${num(mag)}\\), i.e. \\(${num(dB(mag))}\\) dB. At the cutoff every Butterworth filter has \\(|G| = 1/\\sqrt2\\) (−3 dB).</p>`,
        verify: () => { const ps = butterPoles(n, wc); const d = CX.polyFromRoots(ps).map(c => c.re); const nm = hp ? [1, ...Array(n).fill(0)] : [wc ** n]; return nearR(abs(Giw(nm, d, w)), mag, 1e-8); } };
    }
    if (v === 1) {
      const nn = R.int(2, 5), ps = butterPoles(nn, wc), top = ps.reduce((a, b) => (b.im > a.im ? b : a));
      return { q: `<p>Find the poles of the order-${nn} low-pass Butterworth filter with \\(\\omega_c = ${wc}\\). Enter the pole with the largest imaginary part.</p>`,
        fields: [fld("Re λ", top.re), fld("Im λ", top.im)],
        sol: `<p>The poles are \\(\\lambda_k = i\\omega_ce^{i(\\pi + 2\\pi k)/2n}\\), \\(k = 0,\\dots,n-1\\): ${nn} points on the left half of the circle of radius ${wc}, spaced \\(\\pi/${nn}\\) apart, starting at angle \\(\\pi/2 + \\pi/${2 * nn}\\). The first one is \\(${wc}e^{i(\\pi/2 + \\pi/${2 * nn})} = ${CX.str(top, 4)}\\).</p>`,
        verify: () => nearR(abs(top), wc) && top.re < 0 };
    }
    const att = R.pick([20, 30, 40, 60]), ratio = R.pick([2, 3, 5, 10]);
    const nmin = Math.ceil(Math.log10(10 ** (att / 10) - 1) / (2 * Math.log10(ratio)));
    return { q: `<p>A low-pass Butterworth filter with cutoff \\(\\omega_c\\) must attenuate a signal at \\(\\omega = ${ratio}\\omega_c\\) by at least ${att} dB. What is the smallest order \\(n\\)?</p>`,
      fields: [fld("n", nmin)],
      sol: `<p>Need \\(10\\log_{10}(1 + ${ratio}^{2n}) \\ge ${att}\\), i.e. \\(${ratio}^{2n} \\ge 10^{${att / 10}} - 1\\), so \\(n \\ge \\frac{\\log_{10}(10^{${att / 10}} - 1)}{2\\log_{10}${ratio}} = ${num(Math.log10(10 ** (att / 10) - 1) / (2 * Math.log10(ratio)))}\\). Round up: \\(n = ${nmin}\\). (Far above cutoff the roll-off is \\(-20n\\) dB/decade.)</p>`,
      verify: () => dB(1 / Math.sqrt(1 + ratio ** (2 * nmin))) <= -att + 1e-9 && dB(1 / Math.sqrt(1 + ratio ** (2 * nmin - 2))) > -att };
  });
  reg("flt-type", "Filter types and ideal filters", "filters", () => {
    if (Math.random() < 0.5) {
      const a = R.int(1, 10), b = R.int(1, 6), types = [
        [fr(a, `s + ${a}`), "low-pass"], [fr("s", `s + ${a}`), "high-pass"], [fr(`${b}s`, `s^2 + ${b}s + ${a * a}`), "band-pass"],
        [fr(`s^2 + ${a * a}`, `s^2 + ${b}s + ${a * a}`), "band-stop (notch)"], [fr(`s - ${a}`, `s + ${a}`), "all-pass"]];
      const [G, kind] = R.pick(types);
      return mc(`<p>What kind of filter is \\(G(s) = ${G}\\)?</p>`, kind, ["low-pass", "high-pass", "band-pass", "band-stop (notch)", "all-pass"].filter(k => k !== kind).sort(() => Math.random() - 0.5).slice(0, 3),
        `<p>Check \\(|G(i\\omega)|\\) at \\(\\omega = 0\\) and \\(\\omega \\to \\infty\\). Low-pass: 1 then 0. High-pass: 0 then 1. Band-pass: 0 at both ends and peaks in between. Band-stop: 1 at both ends and zero at \\(\\omega = ${a}\\). All-pass: \\(|(i\\omega - ${a})/(i\\omega + ${a})| = 1\\) for every \\(\\omega\\); only the phase changes.</p>`);
    }
    const wc = R.pick([3, 5, 10]), ws = R.distinct(3, 1, 15).sort((x, y) => x - y), amps = ws.map(() => R.nz(1, 5)), hp = Math.random() < 0.4;
    const kept = ws.map((w, i) => ((hp ? w > wc : w < wc) ? amps[i] : 0));
    const total = kept.reduce((s, a) => s + a * a, 0) / 2;
    return { q: `<p>\\(u(t) = ${lin(ws.map((w, i) => [amps[i], `\\cos ${w}t`]))}\\) passes through an ideal ${hp ? "high" : "low"}-pass filter with cutoff \\(\\omega_c = ${wc}\\) rad/s (gain 1 in the pass band, 0 outside, no phase shift). Find the average power \\(\\overline{y^2}\\) of the steady-state output.</p>`,
      fields: [fld("average power", total)],
      sol: `<p>The ${hp ? "high" : "low"}-pass filter keeps frequencies ${hp ? "above" : "below"} ${wc}: \\(y_{ss} = ${lin(ws.map((w, i) => [kept[i], `\\cos ${w}t`])) || "0"}\\). Each \\(A\\cos\\omega t\\) has average power \\(A^2/2\\), and distinct frequencies are orthogonal, so the power is \\(${tex(total)}\\). (Ideal filters cannot be built: their impulse responses are nonzero for \\(t &lt; 0\\). Butterworth filters approximate them.)</p>` };
  });
  reg("flt-allpass", "All-pass filters and phase", "filters", () => {
    const a = R.int(1, 6), w = R.pick([0.5, 1, 2, 3, 5, 10]);
    const n = [1, -a], d = [1, a], G = Giw(n, d, w), ph = arg(G);
    return { q: `<p>\\(B(s) = ${fr(`s - ${a}`, `s + ${a}`)}\\). Find \\(|B(i\\omega)|\\) and the phase \\(\\angle B(i\\omega)\\) at \\(\\omega = ${w}\\).</p>`,
      fields: [fld("|B(iω)|", 1), fld("phase (rad)", ph, "ang")],
      sol: `<p>\\(|i\\omega - ${a}| = |i\\omega + ${a}| = \\sqrt{\\omega^2 + ${a * a}}\\), so \\(|B(i\\omega)| = 1\\) at every frequency: an all-pass filter (Blaschke product). The phase is \\(\\angle(i\\omega - ${a}) - \\angle(i\\omega + ${a}) = (\\pi - \\arctan\\tfrac{\\omega}{${a}}) - \\arctan\\tfrac{\\omega}{${a}} = \\pi - 2\\arctan\\tfrac{${w}}{${a}} = ${num(ph)}\\) rad. It sweeps from \\(\\pi\\) to 0 as \\(\\omega\\) goes from 0 to \\(\\infty\\).</p>`,
      verify: () => nearR(abs(G), 1) && Math.abs(CX.wrap(ph - (PI - 2 * Math.atan(w / a)))) < 1e-9 };
  });

  // ======================= FOURIER TRANSFORM =======================
  reg("ft-pairs", "Fourier transform pairs", "fourier-transform", () => {
    const v = R.int(0, 3), w = R.pick([0, 0.5, 1, 2, 3]);
    if (v === 0) { const a = R.int(1, 4), val = CX.div(1, C(a, w));
      return { q: `<p>Find \\(\\hat G(\\omega)\\) for \\(g(t) = e^{-${a}t}1_+(t)\\), and enter \\(\\hat G(${w})\\).</p>`, fields: [fld(`Ĝ(${w})`, val, "cx")],
        sol: `<p>\\(\\hat G(\\omega) = \\int_0^\\infty e^{-i\\omega t}e^{-${a}t}dt = \\frac{1}{i\\omega + ${a}}\\). (This is the Laplace transform at \\(s = i\\omega\\), valid because the pole \\(-${a}\\) is stable.) At \\(\\omega = ${w}\\): \\(${CX.str(val, 4)}\\).</p>`,
        verify: () => CX.near(CX.integrate(t => CX.mul(Math.exp(-a * t), CX.polar(1, -w * t)), 0, 40, 4000), val, 1e-6) }; }
    if (v === 1) { const a = R.int(1, 4), val = 2 * a / (a * a + w * w);
      return { q: `<p>Find \\(\\hat G(\\omega)\\) for \\(g(t) = e^{-${a}|t|}\\), and enter \\(\\hat G(${w})\\).</p>`, fields: [fld(`Ĝ(${w})`, val)],
        sol: `<p>Split at 0: \\(\\int_0^\\infty e^{-(${a}+i\\omega)t}dt + \\int_{-\\infty}^0 e^{(${a}-i\\omega)t}dt = \\frac1{${a}+i\\omega} + \\frac1{${a}-i\\omega} = \\frac{${2 * a}}{${a * a} + \\omega^2}\\), real because \\(g\\) is real and even. At \\(\\omega = ${w}\\): \\(${num(val)}\\).</p>`,
        verify: () => nearR(2 * CX.integrate(t => Math.exp(-a * t) * Math.cos(w * t), 0, 40, 4000).re, val, 1e-6) }; }
    if (v === 2) { const mu = R.pick([0.5, 1, 2, 3]), ww = w || 1, val = 2 * Math.sin(ww * mu) / ww;
      return { q: `<p>Find \\(\\hat G(\\omega)\\) for the pulse \\(g = 1\\) on \\([-${mu}, ${mu}]\\), zero elsewhere, and enter \\(\\hat G(${ww})\\) and \\(\\hat G(0)\\).</p>`, fields: [fld(`Ĝ(${ww})`, val), fld("Ĝ(0)", 2 * mu)],
        sol: `<p>\\(\\hat G(\\omega) = \\int_{-\\mu}^{\\mu}e^{-i\\omega t}dt = \\frac{2\\sin\\omega\\mu}{\\omega} = 2\\mu\\,\\mathrm{sinc}(\\omega\\mu)\\). At \\(\\omega = ${ww}\\): \\(${num(val)}\\); at 0 the limit is \\(2\\mu = ${2 * mu}\\) (the area).</p>`,
        verify: () => nearR(CX.integrate(t => Math.cos(ww * t), -mu, mu, 400).re, val, 1e-9) }; }
    const a = R.pick([0.5, 1, 2, 4]), val = Math.sqrt(PI / a) * Math.exp(-w * w / (4 * a));
    return { q: `<p>Find \\(\\hat G(\\omega)\\) for the Gaussian \\(g(t) = e^{-${a}t^2}\\), and enter \\(\\hat G(${w})\\).</p>`, fields: [fld(`Ĝ(${w})`, val)],
      sol: `<p>\\(\\mathcal F(e^{-at^2}) = \\sqrt{\\pi/a}\\,e^{-\\omega^2/4a}\\): a Gaussian transforms to a Gaussian. Here \\(\\sqrt{\\pi/${a}}e^{-${w * w}/${4 * a}} = ${num(val)}\\). A narrow pulse (large \\(a\\)) gives a wide spectrum, and vice versa.</p>`,
      verify: () => nearR(CX.integrate(t => Math.exp(-a * t * t) * Math.cos(w * t), -12, 12, 3000).re, val, 1e-6) };
  });
  reg("ft-props", "Fourier transform properties", "fourier-transform", () => {
    const v = R.int(0, 3);
    if (v === 0) { const t0 = R.int(1, 3), right = `\\(e^{-${t0}i\\omega}\\hat G(\\omega)\\)`;
      return mc(`<p>If \\(\\hat G = \\mathcal Fg\\), what is the Fourier transform of \\(g(t - ${t0})\\)?</p>`, right, [`\\(e^{${t0}i\\omega}\\hat G(\\omega)\\)`, `\\(\\hat G(\\omega - ${t0})\\)`, `\\(e^{-${t0}}\\hat G(\\omega)\\)`],
        `<p>\\(\\int e^{-i\\omega t}g(t - ${t0})dt = e^{-i\\omega${t0}}\\int e^{-i\\omega\\tau}g(\\tau)d\\tau\\). A delay multiplies by \\(e^{-i\\omega t_0}\\): the magnitude spectrum is unchanged and the phase falls linearly with \\(\\omega\\).</p>`); }
    if (v === 1) { const w0 = R.int(1, 5), right = `\\(\\hat G(\\omega - ${w0})\\)`;
      return mc(`<p>What is the Fourier transform of \\(e^{${w0}it}g(t)\\)?</p>`, right, [`\\(\\hat G(\\omega + ${w0})\\)`, `\\(e^{${w0}i\\omega}\\hat G(\\omega)\\)`, `\\(\\hat G(${w0}\\omega)\\)`],
        `<p>\\(\\int e^{-i\\omega t}e^{i${w0}t}g\\,dt = \\int e^{-i(\\omega - ${w0})t}g\\,dt = \\hat G(\\omega - ${w0})\\): modulation slides the spectrum to \\(\\omega_0 = ${w0}\\). So \\(\\cos(${w0}t)g(t) \\to \\tfrac12[\\hat G(\\omega - ${w0}) + \\hat G(\\omega + ${w0})]\\).</p>`); }
    if (v === 2) { const a = R.int(1, 4), E = 1 / a;
      return { q: `<p>Use Parseval, \\(\\int|g|^2dt = \\frac{1}{2\\pi}\\int|\\hat G|^2d\\omega\\), to evaluate \\(\\displaystyle\\int_{-\\infty}^{\\infty}\\frac{d\\omega}{\\omega^2 + ${a * a}}\\).</p>`, fields: [fld("value", PI / a)],
        sol: `<p>\\(g = e^{-${a}t}1_+(t)\\) has \\(|\\hat G|^2 = \\frac1{\\omega^2 + ${a * a}}\\) and \\(\\int|g|^2 = \\int_0^\\infty e^{-${2 * a}t}dt = \\tfrac{1}{${2 * a}}\\). So \\(\\int\\frac{d\\omega}{\\omega^2+${a * a}} = 2\\pi\\cdot\\tfrac1{${2 * a}} = \\frac{\\pi}{${a}} \\approx ${num(PI / a)}\\).</p>`,
        verify: () => nearR(2 * PI * E / 2, PI / a) }; }
    const k = R.pick([2, 3, 0.5]), right = `\\(\\frac{1}{${tex(k)}}\\hat G\\!\\left(\\frac{\\omega}{${tex(k)}}\\right)\\)`;
    return mc(`<p>What is the Fourier transform of \\(g(${tex(k)}t)\\)?</p>`, right, [`\\(${tex(k)}\\hat G(${tex(k)}\\omega)\\)`, `\\(\\hat G\\!\\left(\\frac{\\omega}{${tex(k)}}\\right)\\)`, `\\(\\frac1{${tex(k)}}\\hat G(${tex(k)}\\omega)\\)`],
      `<p>Substitute \\(\\tau = ${tex(k)}t\\): \\(\\int e^{-i\\omega t}g(${tex(k)}t)dt = \\frac1{${tex(k)}}\\int e^{-i(\\omega/${tex(k)})\\tau}g(\\tau)d\\tau\\). ${k > 1 ? "Compressing" : "Stretching"} in time ${k > 1 ? "stretches" : "compresses"} in frequency, the root of the uncertainty principle.</p>`);
  });
  reg("ft-sampling", "Nyquist sampling", "fourier-transform", () => {
    if (Math.random() < 0.5) {
      const fmax = R.pick([50, 100, 250, 400, 1000, 4000]);
      return { q: `<p>A signal is band-limited to \\(f_{\\max} = ${fmax}\\) Hz. What is the minimum sampling rate (Hz) and the largest sampling period (s) that allow exact reconstruction?</p>`,
        fields: [fld("Fs min (Hz)", 2 * fmax), fld("T max (s)", 1 / (2 * fmax))],
        sol: `<p>Nyquist: sample faster than twice the highest frequency, \\(F_s &gt; 2f_{\\max} = ${2 * fmax}\\) Hz, i.e. \\(T &lt; \\frac{\\pi}{\\omega_{\\max}} = \\frac{1}{2f_{\\max}} = ${num(1 / (2 * fmax))}\\) s. Then \\(g(t) = \\sum_k g(kT)\\,\\mathrm{sinc}\\big(\\pi(t - kT)/T\\big)\\).</p>` };
    }
    const Fs = R.pick([100, 200, 500, 1000]), f = Fs * R.pick([0.6, 0.7, 0.8, 0.9, 1.2, 1.3]) + R.int(-5, 5);
    const g = ((f % Fs) + Fs) % Fs, alias = g > Fs / 2 ? Fs - g : g;
    return { q: `<p>A ${f} Hz cosine is sampled at \\(F_s = ${Fs}\\) Hz. At what frequency (in \\([0, F_s/2]\\)) does it appear?</p>`, fields: [fld("apparent frequency (Hz)", alias)],
      sol: `<p>\\(${f} &gt; F_s/2 = ${Fs / 2}\\), so it aliases. Samples of \\(\\cos(2\\pi ft)\\) and \\(\\cos(2\\pi(f - \\ell F_s)t)\\) agree, and cosine is even, so fold into \\([0, F_s/2]\\): \\(|${f} - ${Math.round(f / Fs) * Fs}| = ${num(alias)}\\) Hz.</p>`,
      verify: () => [0, 1, 2, 3, 7].every(k => Math.abs(Math.cos(2 * PI * f * k / Fs) - Math.cos(2 * PI * alias * k / Fs)) < 1e-9) };
  });
  reg("ft-uncert", "The uncertainty principle", "fourier-transform", () => {
    const a = R.pick([0.25, 0.5, 1, 2, 4, 9]), sg = 1 / (2 * Math.sqrt(a)), sG = Math.sqrt(a);
    if (Math.random() < 0.5) return { q: `<p>For \\(g(t) = e^{-${a}t^2}\\), treat \\(|g|^2/\\|g\\|^2\\) and \\(|\\hat G|^2/(2\\pi\\|g\\|^2)\\) as probability densities. Find the time spread \\(\\sigma_g\\), the frequency spread \\(\\sigma_G\\), and their product.</p>`,
      fields: [fld("σg", sg), fld("σG", sG), fld("σg σG", 0.5)],
      sol: `<p>\\(|g|^2 = e^{-${2 * a}t^2}\\) is a normal density with variance \\(\\frac{1}{4\\cdot${a}}\\), so \\(\\sigma_g = \\frac{1}{2\\sqrt{${a}}} = ${num(sg)}\\). \\(\\hat G\\propto e^{-\\omega^2/(4\\cdot${a})}\\), so \\(|\\hat G|^2 \\propto e^{-\\omega^2/(2\\cdot${a})}\\) has variance \\(${a}\\) and \\(\\sigma_G = \\sqrt{${a}} = ${num(sG)}\\). The product is exactly \\(\\tfrac12\\): Gaussians achieve equality in \\(\\sigma_g\\sigma_G \\ge \\tfrac12\\).</p>`,
      verify: () => nearR(sg * sG, 0.5) };
    const s = R.pick([0.1, 0.25, 0.5, 2]);
    return { q: `<p>A pulse has time spread \\(\\sigma_g = ${s}\\) s. What is the smallest possible frequency spread \\(\\sigma_G\\) (rad/s)?</p>`, fields: [fld("σG min", 1 / (2 * s))],
      sol: `<p>The uncertainty principle \\(\\sigma_g\\sigma_G \\ge \\tfrac12\\) gives \\(\\sigma_G \\ge \\frac{1}{2\\cdot${s}} = ${num(1 / (2 * s))}\\) rad/s, with equality only for a Gaussian. A signal cannot be both short in time and narrow in frequency.</p>` };
  });
})(typeof window !== "undefined" ? window : globalThis);
