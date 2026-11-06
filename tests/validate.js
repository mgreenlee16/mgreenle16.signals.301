#!/usr/bin/env node
/*
 * validate.js — stress-test every problem generator in Node.
 *   node tests/validate.js [runs-per-topic]
 * For each generated problem it checks that answers are finite, that the stored answer
 * (and a 4-significant-figure rounding of it) is accepted by the checker, that multiple-choice
 * options are distinct, that no "NaN"/"undefined" leaks into the text, and that verify() passes.
 */
"use strict";
const path = require("path");
const js = f => path.join(__dirname, "..", "assets", "js", f);
const CX = require(js("cx.js"));
const QZ = require(js("quiz.js"));
require(js("gen-exam1.js"));
require(js("gen-exam2.js"));
require(js("gen-final.js"));

const RUNS = +process.argv[2] || 300;
const sig4 = x => (x === 0 ? 0 : +x.toPrecision(4));
const fmt = z => `${sig4(z.re)}${z.im < 0 ? "-" : "+"}${Math.abs(sig4(z.im))}i`;
let bad = 0;
const fail = (id, msg, p) => {
  bad++;
  if (bad <= 40) console.log(`✗ ${id}: ${msg}\n   ${(p && p.q || "").replace(/\s+/g, " ").slice(0, 220)}`);
};

for (const id of QZ.ORDER) {
  const T = QZ.TOPICS[id];
  let n = 0;
  for (let r = 0; r < RUNS; r++) {
    let p;
    try { for (let t = 0; t < 20 && !p; t++) p = T.gen(QZ.R); } // null means "reject and retry", as in QZ
    catch (e) { fail(id, "threw " + e.stack.split("\n").slice(0, 2).join(" "), null); continue; }
    if (!p) { fail(id, "returned nothing", null); continue; }
    n++;
    const text = p.q + " " + (p.sol || "") + " " + (p.choices || []).join(" ") + " " + (p.fields || []).map(f => f.label).join(" ");
    if (/NaN|undefined|Infinity|\[object/.test(text)) fail(id, "bad text: " + (text.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/) || [""])[0], p);
    if (p.choices) {
      if (!(p.answer >= 0 && p.answer < p.choices.length)) fail(id, "answer index out of range", p);
      if (new Set(p.choices).size !== p.choices.length) fail(id, "duplicate choices", p);
    } else {
      if (!p.fields || !p.fields.length) { fail(id, "no fields", p); continue; }
      for (const f of p.fields) {
        for (const a0 of f.any || [f.ans]) {
          const a = CX.toC(a0);
          if (!isFinite(a.re) || !isFinite(a.im)) { fail(id, `non-finite answer for "${f.label}"`, p); continue; }
          if (f.kind === "num" && Math.abs(a.im) > 1e-9) fail(id, `complex answer in num field "${f.label}"`, p);
          if (!QZ.checkField(f, fmt(a)).ok) fail(id, `rounded answer ${fmt(a)} rejected for "${f.label}"`, p);
        }
      }
    }
    if (p.verify) {
      let ok;
      try { ok = p.verify(); } catch (e) { ok = false; }
      if (!ok) fail(id, "verify() failed", p);
    }
  }
  console.log(`${n === RUNS ? "✓" : "·"} ${id.padEnd(14)} ${n}/${RUNS}`);
}

// parser sanity
const P = s => QZ.parse(s);
const eq = (s, re, im = 0) => { const z = P(s); if (!z || Math.abs(z.re - re) > 1e-9 || Math.abs(z.im - im) > 1e-9) { bad++; console.log("✗ parse", s, z); } };
eq("3/2", 1.5); eq("sqrt(2)", Math.SQRT2); eq("2-3i", 2, -3); eq("e^(i*pi)", -1, 0); eq("2pi", 2 * Math.PI);
eq("i^i", Math.exp(-Math.PI / 2)); eq("|3+4i|", 5); eq("-2^2", -4); eq("2(1+i)", 2, 2);

console.log(bad ? `\n${bad} problem(s) found` : "\nall generators passed");
process.exit(bad ? 1 : 0);
