/*
 * cx.js — the math behind the site: complex arithmetic, a small expression parser,
 * numerical Fourier coefficients, the DFT/FFT (MATLAB conventions), polynomials and
 * partial fractions. Loadable in the browser (window.CX) and in Node (module.exports).
 *
 * Conventions follow the AAE 301 notes (Frazho):
 *   f(t) = Σ a_k e^{-i k ω0 t},  a_k = (1/τ) ∫_0^τ f(t) e^{+i k ω0 t} dt,  ω0 = 2π/τ
 *   a = ifft(samples) in MATLAB gives [a_0, a_1, …, a_n, a_{-m}, …, a_{-1}].
 */
(function (root) {
  "use strict";

  // ---------- complex numbers ----------
  const C = (re, im = 0) => ({ re, im });
  const isC = z => z && typeof z === "object" && "re" in z;
  const toC = z => (isC(z) ? z : C(z, 0));
  const add = (a, b) => (a = toC(a), b = toC(b), C(a.re + b.re, a.im + b.im));
  const sub = (a, b) => (a = toC(a), b = toC(b), C(a.re - b.re, a.im - b.im));
  const mul = (a, b) => (a = toC(a), b = toC(b), C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re));
  const div = (a, b) => {
    a = toC(a); b = toC(b);
    const d = b.re * b.re + b.im * b.im;
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const conj = z => (z = toC(z), C(z.re, -z.im));
  const neg = z => (z = toC(z), C(-z.re, -z.im));
  const abs = z => (z = toC(z), Math.hypot(z.re, z.im));
  const arg = z => (z = toC(z), Math.atan2(z.im, z.re));
  const scale = (z, s) => (z = toC(z), C(z.re * s, z.im * s));
  const polar = (r, th) => C(r * Math.cos(th), r * Math.sin(th));
  const cexp = z => (z = toC(z), polar(Math.exp(z.re), z.im));
  const clog = z => (z = toC(z), C(Math.log(abs(z)), arg(z)));
  const cpow = (a, b) => {
    a = toC(a); b = toC(b);
    if (a.re === 0 && a.im === 0) return (b.re === 0 && b.im === 0) ? C(1) : C(0);
    if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 64) { // exact-ish integer powers
      let r = C(1), base = a, n = Math.abs(b.re);
      while (n) { if (n & 1) r = mul(r, base); base = mul(base, base); n >>= 1; }
      return b.re < 0 ? div(1, r) : r;
    }
    return cexp(mul(b, clog(a)));
  };
  const csqrt = z => cpow(z, 0.5);
  const csin = z => (z = toC(z), C(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im)));
  const ccos = z => (z = toC(z), C(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im)));
  const ctan = z => div(csin(z), ccos(z));
  const near = (a, b, tol = 1e-9) => abs(sub(a, b)) <= tol * Math.max(1, abs(b));
  // Wrap an angle into (-π, π]
  const wrap = th => { let t = th % (2 * Math.PI); if (t <= -Math.PI) t += 2 * Math.PI; if (t > Math.PI) t -= 2 * Math.PI; return t; };

  // ---------- number formatting ----------
  function num(x, d = 4) {
    if (!isFinite(x)) return x > 0 ? "∞" : x < 0 ? "−∞" : "—";
    if (Math.abs(x) < 1e-10) return "0";
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-9) return String(r).replace("-", "−");
    const a = Math.abs(x);
    let s = a >= 1e5 || a < 1e-3 ? x.toExponential(d - 1) : String(Number(x.toPrecision(d)));
    return s.replace("-", "−");
  }
  // Plain-text complex number, e.g. "2 − 3i"
  function str(z, d = 4) {
    z = toC(z);
    const re = Math.abs(z.re) < 1e-10 * Math.max(1, abs(z)) ? 0 : z.re;
    const im = Math.abs(z.im) < 1e-10 * Math.max(1, abs(z)) ? 0 : z.im;
    if (im === 0) return num(re, d);
    const ims = num(Math.abs(im), d) === "1" ? "" : num(Math.abs(im), d);
    if (re === 0) return (im < 0 ? "−" : "") + ims + "i";
    return num(re, d) + (im < 0 ? " − " : " + ") + ims + "i";
  }
  // Recognize small rationals and multiples of π for exact-looking LaTeX output
  function frac(x, maxDen = 64) {
    for (let d = 1; d <= maxDen; d++) {
      const n = Math.round(x * d);
      if (Math.abs(x - n / d) < 1e-9 * Math.max(1, Math.abs(x))) return [n, d];
    }
    return null;
  }
  function tex(x, d = 4) { // real → LaTeX
    if (Math.abs(x) < 1e-12) return "0";
    const f = frac(x, 48);
    if (f) {
      const [n, q] = f;
      if (q === 1) return String(n);
      return (n < 0 ? "-" : "") + `\\tfrac{${Math.abs(n)}}{${q}}`;
    }
    const s = Math.SQRT2;
    for (const [v, name] of [[s, "\\sqrt{2}"], [Math.sqrt(3), "\\sqrt{3}"], [Math.sqrt(5), "\\sqrt{5}"], [Math.PI, "\\pi"]]) {
      const g = frac(x / v, 12);
      if (g) {
        const [n, q] = g, sign = n < 0 ? "-" : "", an = Math.abs(n);
        const top = (an === 1 ? "" : an) + name;
        return sign + (q === 1 ? top : `\\tfrac{${top}}{${q}}`);
      }
      const h = frac(x * v, 12); // n/(q·v) for things like 1/π
      if (h && name === "\\pi") {
        const [n, q] = h, sign = n < 0 ? "-" : "";
        return sign + `\\tfrac{${Math.abs(n)}}{${q === 1 ? "" : q}\\pi}`;
      }
    }
    return num(x, d).replace("−", "-");
  }
  function ctex(z, d = 4) { // complex → LaTeX
    z = toC(z);
    const big = Math.max(1, abs(z));
    const re = Math.abs(z.re) < 1e-10 * big ? 0 : z.re;
    const im = Math.abs(z.im) < 1e-10 * big ? 0 : z.im;
    if (im === 0) return tex(re, d);
    let ims = tex(Math.abs(im), d);
    if (ims === "1") ims = "";
    const imPart = ims.includes("frac") ? `${ims}\\,i` : `${ims}i`;
    if (re === 0) return (im < 0 ? "-" : "") + imPart;
    return tex(re, d) + (im < 0 ? " - " : " + ") + imPart;
  }
  function angTex(th) { // angle → LaTeX, preferring multiples of π
    const f = frac(th / Math.PI, 60);
    if (f) {
      const [n, q] = f;
      if (n === 0) return "0";
      const sign = n < 0 ? "-" : "", an = Math.abs(n);
      const top = (an === 1 ? "" : an) + "\\pi";
      return sign + (q === 1 ? top : `\\tfrac{${top}}{${q}}`);
    }
    return num(th, 4).replace("−", "-");
  }

  // ---------- expression parser ----------
  // Grammar: expr := cmp ; cmp := sum (( < | > | <= | >= ) sum)? ; sum := prod ((+|-) prod)* ;
  // prod := unary ((*|/|implicit) unary)* ; unary := (+|-) unary | pow ; pow := atom (^ unary)? ;
  // atom := number | name | name(args) | (expr) | |expr|
  const FUN = {
    sin: csin, cos: ccos, tan: ctan, exp: cexp, log: clog, ln: clog, sqrt: csqrt,
    abs: z => C(abs(z)), conj, re: z => C(toC(z).re), im: z => C(toC(z).im),
    real: z => C(toC(z).re), imag: z => C(toC(z).im), angle: z => C(arg(z)), arg: z => C(arg(z)),
    sinh: z => scale(sub(cexp(z), cexp(neg(z))), 0.5), cosh: z => scale(add(cexp(z), cexp(neg(z))), 0.5),
    atan: z => C(Math.atan(toC(z).re)), asin: z => C(Math.asin(toC(z).re)), acos: z => C(Math.acos(toC(z).re)),
    sign: z => C(Math.sign(toC(z).re)), floor: z => C(Math.floor(toC(z).re)),
    step: z => C(toC(z).re >= 0 ? 1 : 0), u: z => C(toC(z).re >= 0 ? 1 : 0),
    sq: z => mul(z, z),
  };
  const FUN2 = {
    mod: (a, b) => { const x = toC(a).re, m = toC(b).re; return C(((x % m) + m) % m); },
    atan2: (a, b) => C(Math.atan2(toC(a).re, toC(b).re)),
    min: (a, b) => C(Math.min(toC(a).re, toC(b).re)), max: (a, b) => C(Math.max(toC(a).re, toC(b).re)),
    pow: cpow,
  };
  function tokenize(src) {
    const s = src.replace(/\*\*/g, "^").replace(/[−–]/g, "-").replace(/×|·/g, "*").replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/τ/g, "tau").replace(/ω/g, "w");
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
        out.push({ t: "num", v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        const m = s.slice(i).match(/^[a-zA-Z_][a-zA-Z_0-9]*/);
        out.push({ t: "id", v: m[0] }); i += m[0].length; continue;
      }
      if ("<>".includes(c) && s[i + 1] === "=") { out.push({ t: "op", v: c + "=" }); i += 2; continue; }
      if ("+-*/^(),<>|".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
      throw new Error(`Unexpected character "${c}"`);
    }
    return out;
  }
  // Returns a function (vars) => complex. vars: { t: number, ... }
  function compile(src) {
    const tk = tokenize(String(src));
    let p = 0;
    const peek = () => tk[p], next = () => tk[p++];
    const isOp = v => peek() && peek().t === "op" && peek().v === v;
    const expect = v => { if (!isOp(v)) throw new Error(`Expected "${v}"`); p++; };
    function parseExpr() {
      const a = parseSum();
      if (peek() && peek().t === "op" && ["<", ">", "<=", ">="].includes(peek().v)) {
        const op = next().v, b = parseSum();
        return env => {
          const x = toC(a(env)).re, y = toC(b(env)).re;
          return C(op === "<" ? +(x < y) : op === ">" ? +(x > y) : op === "<=" ? +(x <= y) : +(x >= y));
        };
      }
      return a;
    }
    function parseSum() {
      let a = parseProd();
      while (isOp("+") || isOp("-")) {
        const op = next().v, b = parseProd(), l = a;
        a = op === "+" ? env => add(l(env), b(env)) : env => sub(l(env), b(env));
      }
      return a;
    }
    function startsAtom() {
      const q = peek();
      return q && (q.t === "num" || q.t === "id" || (q.t === "op" && q.v === "("));
    }
    function parseProd() {
      let a = parseUnary();
      for (;;) {
        if (isOp("*") || isOp("/")) {
          const op = next().v, b = parseUnary(), l = a;
          a = op === "*" ? env => mul(l(env), b(env)) : env => div(l(env), b(env));
        } else if (startsAtom()) { // implicit multiplication: 2pi, 3i, 2(t+1), t sin(t)
          const b = parsePow(), l = a;
          a = env => mul(l(env), b(env));
        } else break;
      }
      return a;
    }
    function parseUnary() {
      if (isOp("-")) { next(); const a = parseUnary(); return env => neg(a(env)); }
      if (isOp("+")) { next(); return parseUnary(); }
      return parsePow();
    }
    function parsePow() {
      const a = parseAtom();
      if (isOp("^")) { next(); const b = parseUnary(); return env => cpow(a(env), b(env)); }
      return a;
    }
    function parseAtom() {
      const q = next();
      if (!q) throw new Error("Unexpected end of expression");
      if (q.t === "num") { const v = C(q.v); return () => v; }
      if (q.t === "op" && q.v === "(") { const a = parseExpr(); expect(")"); return a; }
      if (q.t === "op" && q.v === "|") { const a = parseExpr(); expect("|"); return env => C(abs(a(env))); }
      if (q.t === "id") {
        const name = q.v;
        if (isOp("(")) {
          next();
          const args = [parseExpr()];
          while (isOp(",")) { next(); args.push(parseExpr()); }
          expect(")");
          const lname = name.toLowerCase();
          if (lname === "if") {
            if (args.length !== 3) throw new Error("if(condition, a, b) needs three arguments");
            return env => (toC(args[0](env)).re ? args[1](env) : args[2](env));
          }
          if (FUN[lname] && args.length === 1) { const f = FUN[lname]; return env => f(args[0](env)); }
          if (FUN2[lname] && args.length === 2) { const f = FUN2[lname]; return env => f(args[0](env), args[1](env)); }
          throw new Error(`Unknown function "${name}"`);
        }
        if (name === "pi") return () => C(Math.PI);
        if (name === "e") return () => C(Math.E);
        if (name === "i" || name === "j") return () => C(0, 1);
        return env => {
          if (env && name in env) return toC(env[name]);
          throw new Error(`Unknown variable "${name}"`);
        };
      }
      throw new Error(`Unexpected "${q.v}"`);
    }
    const f = parseExpr();
    if (p < tk.length) throw new Error(`Unexpected "${tk[p].v}"`);
    return f;
  }
  const evalC = (src, env = {}) => toC(compile(src)(env));

  // ---------- integration ----------
  // Composite Gauss–Legendre (5 points per panel): exact to high order on smooth pieces.
  const GL_X = [0, -0.5384693101056831, 0.5384693101056831, -0.9061798459386640, 0.9061798459386640];
  const GL_W = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891];
  function integrate(f, a, b, panels = 200) { // f returns number or complex
    let re = 0, im = 0;
    const h = (b - a) / panels;
    for (let p = 0; p < panels; p++) {
      const c = a + (p + 0.5) * h;
      for (let k = 0; k < 5; k++) {
        const v = f(c + 0.5 * h * GL_X[k]), w = GL_W[k] * 0.5 * h;
        if (typeof v === "number") re += w * v; else { re += w * v.re; im += w * v.im; }
      }
    }
    return C(re, im);
  }
  // Fourier coefficient a_k of f on (0, τ). `breaks` lists discontinuities so each smooth piece is integrated separately.
  function fsCoef(f, tau, k, breaks = [], panels = 120) {
    const w0 = 2 * Math.PI / tau;
    const pts = [0, ...breaks.filter(b => b > 0 && b < tau).sort((x, y) => x - y), tau];
    let s = C(0);
    for (let j = 0; j + 1 < pts.length; j++) {
      s = add(s, integrate(t => mul(toC(f(t)), polar(1, k * w0 * t)), pts[j], pts[j + 1], panels));
    }
    return scale(s, 1 / tau);
  }
  function normSq(f, tau, breaks = [], panels = 120) { // (1/τ)∫|f|²
    const pts = [0, ...breaks.filter(b => b > 0 && b < tau).sort((x, y) => x - y), tau];
    let s = 0;
    for (let j = 0; j + 1 < pts.length; j++) s += integrate(t => { const v = toC(f(t)); return v.re * v.re + v.im * v.im; }, pts[j], pts[j + 1], panels).re;
    return s / tau;
  }
  // L2(a,b) inner product with the 1/(b-a) normalization of the notes
  function inner(f, g, a, b, panels = 400) {
    return scale(integrate(t => mul(toC(f(t)), conj(toC(g(t)))), a, b, panels), 1 / (b - a));
  }

  // ---------- DFT / FFT (MATLAB conventions) ----------
  // fft:  X_r = Σ_j x_j e^{-2πi j r/ν};   ifft:  x_j = (1/ν) Σ_r X_r e^{+2πi j r/ν}
  function dftRaw(x, sign) {
    const n = x.length, out = new Array(n);
    for (let r = 0; r < n; r++) {
      let re = 0, im = 0;
      for (let j = 0; j < n; j++) {
        const z = toC(x[j]), th = sign * 2 * Math.PI * ((j * r) % n) / n;
        const c = Math.cos(th), s = Math.sin(th);
        re += z.re * c - z.im * s; im += z.re * s + z.im * c;
      }
      out[r] = C(re, im);
    }
    return out;
  }
  function fftRadix2(x, sign) { // iterative Cooley–Tukey; length must be a power of two
    const n = x.length, re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) { const z = toC(x[i]); re[i] = z.re; im[i] = z.im; }
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = sign * 2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ar = re[i + k], ai = im[i + k];
          const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ar + br; im[i + k] = ai + bi;
          re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    return Array.from(re, (v, i) => C(v, im[i]));
  }
  const pow2 = n => n > 0 && (n & (n - 1)) === 0;
  const fft = x => (pow2(x.length) ? fftRadix2(x, -1) : dftRaw(x, -1));
  const ifft = x => (pow2(x.length) ? fftRadix2(x, 1) : dftRaw(x, 1)).map(z => scale(z, 1 / x.length));
  // Harmonic held in 0-based slot r of an ifft array of length ν (notes: n = ν/2 for even ν, (ν−1)/2 for odd)
  const slotHarmonic = (r, nu) => (r <= Math.floor(nu / 2) ? r : r - nu);
  const harmonicSlot = (k, nu) => ((k % nu) + nu) % nu;
  // The ν×ν DFT matrix of the notes: F[j][k] = λ_j^k, λ_j = e^{-2πij/ν}
  const dftMatrix = nu => Array.from({ length: nu }, (_, j) => Array.from({ length: nu }, (_, k) => polar(1, -2 * Math.PI * ((j * k) % nu) / nu)));

  // ---------- polynomials (coefficients highest power first, like MATLAB) ----------
  function polyval(p, s) { let r = C(0); for (const c of p) r = add(mul(r, s), c); return r; }
  function conv(a, b) {
    const out = Array.from({ length: a.length + b.length - 1 }, () => C(0));
    a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = add(out[i + j], mul(x, y)); }));
    return out;
  }
  const polyFromRoots = rs => rs.reduce((p, r) => conv(p, [C(1), neg(r)]), [C(1)]);
  function trimPoly(p) {
    let i = 0;
    while (i < p.length - 1 && abs(p[i]) < 1e-14) i++;
    return p.slice(i).map(toC);
  }
  // Durand–Kerner roots, then Newton polish
  function roots(p) {
    p = trimPoly(p);
    const n = p.length - 1;
    if (n < 1) return [];
    const lead = p[0], q = p.map(c => div(c, lead));
    let z = Array.from({ length: n }, (_, k) => mul(polar(1, 2 * Math.PI * k / n + 0.4), C(1 + abs(q[n] || 0) ** (1 / n))));
    for (let it = 0; it < 2000; it++) {
      let delta = 0;
      z = z.map((zi, i) => {
        let den = C(1);
        z.forEach((zj, j) => { if (j !== i) den = mul(den, sub(zi, zj)); });
        const step = div(polyval(q, zi), den);
        delta = Math.max(delta, abs(step));
        return sub(zi, step);
      });
      if (delta < 1e-14) break;
    }
    return z.map(r => C(Math.abs(r.re) < 1e-9 ? 0 : r.re, Math.abs(r.im) < 1e-9 ? 0 : r.im));
  }
  function polyDeriv(p) { const n = p.length - 1; return p.slice(0, -1).map((c, i) => scale(c, n - i)); }
  // Polynomial division: returns {q, r}
  function polyDiv(num, den) {
    num = trimPoly(num); den = trimPoly(den);
    const out = [], r = num.slice();
    while (r.length >= den.length) {
      const c = div(r[0], den[0]);
      out.push(c);
      for (let i = 0; i < den.length; i++) r[i] = sub(r[i], mul(c, den[i]));
      r.shift();
    }
    return { q: out.length ? out : [C(0)], r: r.length ? r : [C(0)] };
  }
  // Group nearly-equal roots into {p, m} with multiplicity m
  function clusterRoots(rs, tol = 1e-4) {
    const groups = [];
    rs.forEach(r => {
      const g = groups.find(g => abs(sub(g.sum.re !== undefined ? scale(g.sum, 1 / g.m) : g.sum, r)) < tol);
      if (g) { g.sum = add(g.sum, r); g.m++; } else groups.push({ sum: r, m: 1 });
    });
    return groups.map(g => {
      const p = scale(g.sum, 1 / g.m);
      const snap = v => { const k = Math.round(v * 1e6) / 1e6; return Math.abs(v - k) < 1e-6 ? k : v; };
      return { p: C(snap(p.re), snap(p.im)), m: g.m };
    });
  }
  // Taylor coefficients of polynomial p about s0: p(s) = Σ c_j (s - s0)^j, returned lowest order first
  function taylorAt(p, s0, nTerms) {
    const out = [];
    let d = p.slice();
    let fact = 1;
    for (let j = 0; j < nTerms; j++) {
      out.push(scale(polyval(d, s0), 1 / fact));
      d = d.length > 1 ? polyDeriv(d) : [C(0)];
      fact *= j + 1;
    }
    return out;
  }
  /*
   * Partial fractions of G(s) = num(s)/den(s).
   * Returns { k: direct term (constant, if deg num = deg den), terms: [{p, j, c}] meaning c/(s-p)^j }
   * Pole multiplicities come from clustering the numerical roots of den (or from `poles` if given).
   */
  function residues(num, den, poles) {
    num = trimPoly(num); den = trimPoly(den);
    let kdir = C(0);
    if (num.length >= den.length) {
      const { q, r } = polyDiv(num, den);
      if (q.length > 1) throw new Error("Improper G(s): the degree of the numerator exceeds the denominator");
      kdir = q[0]; num = r;
    }
    const lead = den[0];
    const groups = poles || clusterRoots(roots(den));
    const terms = [];
    groups.forEach(({ p, m }) => {
      // h(s) = (s-p)^m G(s) = num(s) / (lead · Π_{other poles} (s-q)^{mq})
      const others = [];
      groups.forEach(g => { if (g !== groups.find(x => x.p === p)) for (let i = 0; i < g.m; i++) others.push(g.p); });
      const rest = polyFromRoots(others).map(c => mul(c, lead));
      const nT = taylorAt(num, p, m), dT = taylorAt(rest, p, m);
      // series division h = nT / dT up to order m-1
      const h = [];
      for (let j = 0; j < m; j++) {
        let s = nT[j];
        for (let i = 1; i <= j; i++) s = sub(s, mul(dT[i], h[j - i]));
        h.push(div(s, dT[0]));
      }
      // c/(s-p)^{m-j} has coefficient h[j]
      for (let j = 0; j < m; j++) terms.push({ p, j: m - j, c: h[j] });
    });
    return { k: kdir, terms };
  }
  // Inverse Laplace of the partial-fraction terms at time t (ignoring the δ from a direct term)
  function invLaplaceAt(pf, t) {
    let s = C(0);
    pf.terms.forEach(({ p, j, c }) => {
      let fact = 1; for (let i = 2; i < j; i++) fact *= i;
      s = add(s, scale(mul(c, cexp(scale(p, t))), Math.pow(t, j - 1) / fact));
    });
    return s.re;
  }

  // ---------- misc ----------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

  const CX = {
    C, toC, add, sub, mul, div, conj, neg, abs, arg, scale, polar, exp: cexp, log: clog, pow: cpow, sqrt: csqrt,
    sin: csin, cos: ccos, near, wrap, num, str, frac, tex, ctex, angTex, compile, evalC, integrate, fsCoef, normSq, inner,
    fft, ifft, dftRaw, slotHarmonic, harmonicSlot, dftMatrix, polyval, conv, polyFromRoots, roots, polyDiv, polyDeriv,
    clusterRoots, residues, invLaplaceAt, gcd, linspace,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = CX;
  else root.CX = CX;
})(typeof window !== "undefined" ? window : globalThis);
