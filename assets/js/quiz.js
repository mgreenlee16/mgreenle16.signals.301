/*
 * quiz.js — the problem-generator engine.
 *
 * Generators register with QZ.register(id, meta, gen). gen(R) returns a problem:
 *   { q: html, fields: [{ label, ans, kind: "num"|"cx"|"ang", tol, any: [answers] }] }
 *   or { q, choices: [html...], answer: index }
 *   plus sol: html (worked solution) and optional verify(): boolean used by tests/validate.js.
 * Answers typed by the student are parsed by CX.evalC, so "3/2", "sqrt(2)", "pi/4", "2-3i",
 * "2^(1/10) e^(i pi/20)" are all accepted. Angles are compared modulo 2π.
 *
 * QZ.mount(el, opts) puts an endless drill on a page; QZ.exam(el, opts) builds a practice exam;
 * QZ.mastery(el, ids) shows per-topic accuracy saved in localStorage.
 */
(function (root) {
  "use strict";
  const CXL = root.CX || (typeof require !== "undefined" ? require("./cx.js") : null);
  const TOPICS = {};
  const ORDER = [];

  // ---------- random helpers ----------
  const R = {
    int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    nz(a, b) { let v; do v = R.int(a, b); while (v === 0); return v; },
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    sign: () => (Math.random() < 0.5 ? -1 : 1),
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    distinct(n, a, b, avoid = []) { const out = []; let guard = 0; while (out.length < n && guard++ < 1000) { const v = R.int(a, b); if (!out.includes(v) && !avoid.includes(v)) out.push(v); } return out; },
  };

  function register(id, meta, gen) {
    TOPICS[id] = Object.assign({ id, gen }, meta);
    ORDER.push(id);
  }

  // ---------- answer checking ----------
  function parse(str) {
    const s = String(str).trim();
    if (!s) return null;
    try {
      const z = CXL.evalC(s);
      if (!isFinite(z.re) || !isFinite(z.im)) return null;
      return z;
    } catch (e) { return null; }
  }
  function close(z, ans, kind, tol) {
    const a = CXL.toC(ans);
    const scale = Math.max(1, CXL.abs(a));
    const t = (tol || 2e-3) * scale + 1e-9;
    if (kind === "ang") {
      if (Math.abs(z.im) > t) return false;
      const d = CXL.wrap(z.re - a.re);
      return Math.abs(d) <= (tol || 2e-3) * Math.max(1, Math.abs(a.re)) + 1e-6;
    }
    if (kind === "num" && Math.abs(z.im) > t) return false;
    return CXL.abs(CXL.sub(z, a)) <= t;
  }
  function checkField(f, input) {
    const z = parse(input);
    if (!z) return { ok: false, bad: true };
    const answers = f.any || [f.ans];
    return { ok: answers.some(a => close(z, a, f.kind, f.tol)) };
  }

  // ---------- progress ----------
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem("sg.qz." + k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem("sg.qz." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };
  function record(id, ok) {
    const s = LS.get(id) || { n: 0, c: 0, h: [] };
    s.n++; if (ok) s.c++;
    s.h.push(ok ? 1 : 0); if (s.h.length > 20) s.h.shift();
    LS.set(id, s);
    const g = LS.get("_all") || { n: 0, c: 0, streak: 0, best: 0 };
    g.n++; if (ok) { g.c++; g.streak++; g.best = Math.max(g.best, g.streak); } else g.streak = 0;
    LS.set("_all", g);
  }
  const stats = id => LS.get(id) || { n: 0, c: 0, h: [] };

  // ---------- rendering helpers ----------
  const ts = el => { if (root.UI) root.UI.whenMath(() => root.UI.typeset(el)); };
  const escAttr = s => String(s).replace(/"/g, "&quot;");
  function make(id) {
    const T = TOPICS[id];
    for (let tries = 0; tries < 20; tries++) {
      try {
        const p = T.gen(R);
        if (p) { p.topic = id; return p; }
      } catch (e) { if (tries === 19) throw e; }
    }
    return null;
  }
  function fieldsHTML(p, uid) {
    if (p.choices) {
      return `<div class="qz-opts">${p.choices.map((c, k) => `<button type="button" data-k="${k}">${c}</button>`).join("")}</div>`;
    }
    return `<div class="qz-fields">${p.fields.map((f, k) => `<label>${f.label}<input type="text" inputmode="text" autocomplete="off" spellcheck="false" data-k="${k}" id="${uid}-${k}" aria-label="${escAttr(f.label.replace(/<[^>]+>|\\\(|\\\)/g, ""))}"></label>`).join("")}</div>`;
  }
  const HELP = `Type numbers or expressions: <code>-3/2</code>, <code>sqrt(2)</code>, <code>pi/4</code>, <code>2-3i</code>, <code>e^(-pi/2)</code>, <code>2^(1/10)*e^(i*pi/20)</code>. Angles in radians; any angle equal mod 2π is accepted. About 3 significant figures is enough.`;

  /*
   * mount(el, { topics: [ids], title, exam, chooser: true|false })
   * An endless drill: answer, see the worked solution, then get a fresh problem.
   */
  function mount(target, opts) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const all = (opts.topics || ORDER.filter(id => !opts.exam || TOPICS[id].exam === opts.exam)).filter(id => TOPICS[id]);
    const uid = "qz" + Math.random().toString(36).slice(2, 8);
    let active = all.slice();
    let cur = null, state = "ask", tries = 0, sessionN = 0, sessionC = 0;
    const chooser = opts.chooser !== false && all.length > 1;
    let chips = "";
    if (chooser) {
      let lastGroup = null;
      chips = `<div class="qz-topics">` + all.map(id => {
        const T = TOPICS[id];
        const grp = opts.groupBy ? `<span class="grp">${T.group || ""}</span>` : "";
        const head = opts.groupBy && T.group !== lastGroup ? (lastGroup = T.group, grp) : "";
        return `${head}<label><input type="checkbox" value="${id}" checked>${T.title}</label>`;
      }).join("") + `</div>`;
    }
    el.classList.add("qz");
    el.innerHTML = `<div class="qz-head"><span class="ttl">${opts.title || "Problem generator"}</span>
        <span class="stats" aria-live="polite"></span></div>${chips}
      <div class="qz-body"><div class="qz-meta"></div><div class="qz-q"></div><div class="qz-in"></div>
      <div class="qz-actions"><button type="button" class="primary qz-check">Check</button>
        <button type="button" class="qz-show">Show solution</button>
        <button type="button" class="qz-next">New problem →</button>
        <span class="qz-verdict" aria-live="polite"></span></div>
      <div class="qz-sol"></div><div class="qz-help">${HELP}</div></div>`;
    const $ = s => el.querySelector(s);
    const statsEl = $(".stats"), meta = $(".qz-meta"), qEl = $(".qz-q"), inEl = $(".qz-in"), solEl = $(".qz-sol"), verdict = $(".qz-verdict");
    const btnCheck = $(".qz-check"), btnShow = $(".qz-show"), btnNext = $(".qz-next");
    function updateStats() {
      const g = LS.get("_all") || { streak: 0, best: 0 };
      statsEl.textContent = `this session ${sessionC}/${sessionN} · streak ${g.streak || 0} · best ${g.best || 0}`;
    }
    function fresh() {
      if (!active.length) active = all.slice();
      const id = active[Math.floor(Math.random() * active.length)];
      cur = make(id);
      state = "ask"; tries = 0;
      meta.textContent = TOPICS[id].title + (TOPICS[id].lessonTitle ? " · " + TOPICS[id].lessonTitle : "");
      qEl.innerHTML = cur.q;
      inEl.innerHTML = fieldsHTML(cur, uid);
      solEl.innerHTML = `<b>Worked solution</b>${cur.sol}`;
      solEl.classList.remove("show");
      verdict.textContent = ""; verdict.className = "qz-verdict";
      btnCheck.style.display = cur.choices ? "none" : "";
      btnCheck.disabled = false;
      ts(qEl); ts(inEl); ts(solEl);
      if (cur.choices) inEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => choose(+b.dataset.k)));
      else inEl.querySelectorAll("input").forEach(inp => inp.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); state === "done" ? fresh() : check(); } }));
      const first = inEl.querySelector("input, button");
      if (first && opts.autofocus !== false && sessionN > 0) first.focus({ preventScroll: true });
    }
    function finish(ok) {
      if (tries === 1 || state === "reveal") { sessionN++; if (ok) sessionC++; record(cur.topic, ok); }
      state = "done";
      solEl.classList.add("show");
      updateStats();
      btnNext.focus({ preventScroll: true });
      if (opts.onAnswer) opts.onAnswer(cur.topic, ok);
    }
    function check() {
      if (state === "done" || cur.choices) return;
      const inputs = [...inEl.querySelectorAll("input")];
      if (inputs.every(i => !i.value.trim())) { verdict.textContent = "Enter an answer first."; verdict.className = "qz-verdict"; return; }
      tries++;
      let all = true, bad = false;
      inputs.forEach((inp, k) => {
        const r = checkField(cur.fields[k], inp.value);
        inp.classList.toggle("ok", r.ok); inp.classList.toggle("no", !r.ok);
        if (!r.ok) all = false; if (r.bad) bad = true;
      });
      if (all) { verdict.textContent = tries === 1 ? "Correct!" : "Correct."; verdict.className = "qz-verdict good"; finish(true); }
      else {
        verdict.textContent = bad ? "Couldn't read one of the answers; check the syntax." : "Not quite. Try again, or show the solution.";
        verdict.className = "qz-verdict bad";
        if (tries === 1) { sessionN++; record(cur.topic, false); updateStats(); tries = 99; }
      }
    }
    function choose(k) {
      if (state === "done") return;
      tries++;
      const btns = inEl.querySelectorAll("button");
      btns.forEach(b => b.classList.remove("wrong"));
      btns[cur.answer].classList.add("right");
      if (k !== cur.answer) btns[k].classList.add("wrong");
      const ok = k === cur.answer;
      verdict.textContent = ok ? "Correct!" : "Not quite. The highlighted choice is right.";
      verdict.className = "qz-verdict " + (ok ? "good" : "bad");
      tries = 1; finish(ok);
    }
    btnCheck.addEventListener("click", check);
    btnShow.addEventListener("click", () => {
      if (state !== "done") {
        if (cur.choices) { const btns = inEl.querySelectorAll("button"); btns[cur.answer].classList.add("right"); }
        else cur.fields.forEach((f, k) => { const inp = inEl.querySelector(`#${uid}-${k}`); if (inp && !inp.value) inp.placeholder = "see solution"; });
        if (tries === 0) { sessionN++; record(cur.topic, false); }
        state = "done"; solEl.classList.add("show"); updateStats();
        verdict.textContent = ""; btnNext.focus({ preventScroll: true });
      }
    });
    btnNext.addEventListener("click", fresh);
    el.querySelectorAll(".qz-topics input").forEach(cb => cb.addEventListener("change", () => {
      active = [...el.querySelectorAll(".qz-topics input:checked")].map(c => c.value);
      if (!active.length) { cb.checked = true; active = [cb.value]; }
      if (cur && !active.includes(cur.topic)) fresh();
    }));
    updateStats();
    fresh();
    return { next: fresh };
  }

  /*
   * exam(el, { topics, count, minutes, title }) — a printable practice exam drawn from the topics,
   * graded all at once, regenerated on demand.
   */
  function exam(target, opts) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const pool = (opts.topics || ORDER).filter(id => TOPICS[id]);
    const uid = "ex" + Math.random().toString(36).slice(2, 8);
    let probs = [], timer = null, t0 = 0, submitted = false;
    el.innerHTML = `<div class="exam-bar"><button type="button" class="primary ex-new" style="background:var(--accent);color:#fff;border-color:var(--accent)">Generate a new practice exam</button>
      <label>Questions <select class="ex-count">${[6, 8, 10, 12, 15].map(n => `<option ${n === (opts.count || 8) ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label><input type="checkbox" class="ex-timed"> Timed (${opts.minutes || 50} min)</label>
      <span class="timer"></span></div><div class="ex-body"><p class="prose" style="color:var(--muted)">Press the button to draw a random exam from the topics below. Each exam is different.</p></div>`;
    const body = el.querySelector(".ex-body"), timerEl = el.querySelector(".timer");
    function draw() {
      const n = +el.querySelector(".ex-count").value;
      const order = [];
      let bag = R.shuffle(pool);
      while (order.length < n) { if (!bag.length) bag = R.shuffle(pool); order.push(bag.pop()); }
      probs = order.map(make);
      submitted = false;
      body.innerHTML = probs.map((p, i) => `<div class="exam-q" data-i="${i}"><div class="num">Problem ${i + 1} · ${TOPICS[p.topic].title}</div>
        <div class="qz-q">${p.q}</div>${fieldsHTML(p, uid + "-" + i)}<div class="qz-verdict"></div><div class="qz-sol"><b>Worked solution</b>${p.sol}</div></div>`).join("") +
        `<div class="exam-bar" style="margin-top:1rem"><button type="button" class="ex-submit" style="font-weight:600">Submit and grade</button><span class="ex-score"></span></div>`;
      body.querySelectorAll(".exam-q").forEach(box => {
        const p = probs[+box.dataset.i];
        if (p.choices) box.querySelectorAll(".qz-opts button").forEach(b => b.addEventListener("click", () => {
          if (submitted) return;
          box.querySelectorAll(".qz-opts button").forEach(x => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true"); box.dataset.pick = b.dataset.k;
          box.querySelectorAll(".qz-opts button").forEach(x => { x.style.outline = x === b ? "2px solid var(--accent)" : ""; });
        }));
      });
      body.querySelector(".ex-submit").addEventListener("click", grade);
      ts(body);
      clearInterval(timer); timerEl.textContent = "";
      if (el.querySelector(".ex-timed").checked) {
        t0 = Date.now();
        const lim = (opts.minutes || 50) * 60;
        timer = setInterval(() => {
          const left = Math.max(0, lim - Math.round((Date.now() - t0) / 1000));
          timerEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`;
          if (!left) { clearInterval(timer); grade(); }
        }, 1000);
      }
    }
    function grade() {
      if (submitted) return;
      submitted = true; clearInterval(timer);
      let score = 0;
      body.querySelectorAll(".exam-q").forEach(box => {
        const p = probs[+box.dataset.i];
        let ok;
        if (p.choices) {
          const k = box.dataset.pick === undefined ? -1 : +box.dataset.pick;
          ok = k === p.answer;
          const btns = box.querySelectorAll(".qz-opts button");
          btns[p.answer].classList.add("right");
          if (k >= 0 && !ok) btns[k].classList.add("wrong");
        } else {
          ok = true;
          box.querySelectorAll("input").forEach((inp, k) => {
            const r = checkField(p.fields[k], inp.value);
            inp.classList.toggle("ok", r.ok); inp.classList.toggle("no", !r.ok);
            if (!r.ok) ok = false;
          });
        }
        if (ok) score++;
        record(p.topic, ok);
        const v = box.querySelector(".qz-verdict");
        v.textContent = ok ? "Correct" : "Incorrect"; v.className = "qz-verdict " + (ok ? "good" : "bad");
        box.querySelector(".qz-sol").classList.add("show");
      });
      body.querySelector(".ex-score").innerHTML = `<b>Score: ${score} / ${probs.length}</b> (${Math.round(100 * score / probs.length)}%)` + (t0 && el.querySelector(".ex-timed").checked ? ` · ${Math.round((Date.now() - t0) / 60000)} min` : "");
      if (opts.onGrade) opts.onGrade();
    }
    el.querySelector(".ex-new").addEventListener("click", draw);
  }

  // mastery(el, ids): per-topic accuracy bars
  function mastery(target, ids) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const render = () => {
      el.innerHTML = `<div class="mastery">${ids.filter(id => TOPICS[id]).map(id => {
        const s = stats(id), pct = s.h.length ? Math.round(100 * s.h.reduce((a, b) => a + b, 0) / s.h.length) : 0;
        return `<div><b>${TOPICS[id].title}</b><br><span style="color:var(--muted)">${s.n ? `${s.c}/${s.n} correct · last ${s.h.length}: ${pct}%` : "not tried yet"}</span>
          <div class="bar"><span style="width:${pct}%"></span></div></div>`;
      }).join("")}</div>`;
    };
    render();
    return { render };
  }

  const QZ = { register, mount, exam, mastery, TOPICS, ORDER, R, parse, checkField, close, stats };
  if (typeof module !== "undefined" && module.exports) module.exports = QZ;
  else root.QZ = QZ;
})(typeof window !== "undefined" ? window : globalThis);
