# Learn Signals · AAE 301

An interactive study site for **AAE 301, Signal Analysis for Aerospace Engineering** (Purdue). It has lessons with live figures, worked examples, and problem generators that write a new exam-style problem each time you finish one, check your answer, and show a worked solution.

Live site (once GitHub Pages is enabled): `https://mgreenlee16.github.io/mgreenle16.signals.301/`

## Contents

| Exam | Lessons (`lessons/`) | Review |
| --- | --- | --- |
| Exam 1 | `complex`, `inner-products`, `fourier-series`, `dft` | `exams/exam1.html` |
| Exam 2 (Laplace chapter) | `laplace`, `inverse-laplace`, `transfer-functions` | `exams/exam2.html` |
| Final | `state-space`, `bode`, `filters`, `fourier-transform` | `exams/final.html` (new material or cumulative) |

Each lesson has prose in the course notation, live interactive figures (31 in all), worked examples, and a problem generator. Altogether there are 48 generator topics, each producing endless exam-style problems with checked answers and worked solutions.

- `practice.html`: every generator in one drill, filtered by exam, with per-topic accuracy.
- `tools/`: `complex` (complex calculator), `fourier` (Fourier series of any piecewise f(t)), `dft` (MATLAB-style fft/ifft), `laplace` (partial fractions like MATLAB's `residue`, inverse Laplace), `system` (transfer-function analyzer: poles, stability, step/impulse responses, Bode plot, steady-state output).

## Conventions

Notation follows the course textbook (A. E. Frazho, *Notes on Signals and Systems*) and lecture notes:

- f(t) = Σ aₖ e^(−ikω₀t), with aₖ = (1/τ)∫₀^τ f(t) e^(+ikω₀t) dt and ω₀ = 2π/τ
- (f, g) = (1/τ)∫₀^τ f ḡ dt on L²(0, τ)
- F_ν[j, k] = e^(−2πijk/ν), so `ifft(samples)` = [a₀, a₁, …, a₋₁]
- G(s) = ∫₀^∞ e^(−st) g(t) dt; steady state y_ss = |G(iω)| cos(ωt + ∠G(iω))
- Ĝ(ω) = ∫ e^(−iωt) g(t) dt, g(t) = (1/2π) ∫ e^(iωt) Ĝ(ω) dω

Some lecture slides use e^(+jkω₀t). The lessons point out where this flips a sign.

## Layout

```
assets/css/style.css        theme (light/dark), layout, quiz styles
assets/js/cx.js             complex arithmetic, expression parser, quadrature, FFT
assets/js/ui.js             site chrome, controls, SVG plots, complex plane, site map
assets/js/quiz.js           problem-generator engine (drill, practice exam, mastery)
assets/js/gen-exam1.js      Exam 1 problem generators
assets/js/gen-exam2.js      Exam 2 problem generators (Laplace, partial fractions, transfer functions, state space)
assets/js/gen-final.js      Final problem generators (sinusoid response, Bode, filters, Fourier transform)
assets/js/sys.js            transfer-function helpers (parsing, residues in real form, responses)
assets/vendor/katex/        KaTeX 0.16.9 (MIT), served locally
tests/validate.js           runs every generator thousands of times and checks the answers
```

There is no build step: every page is plain HTML. Progress, theme and text size are saved in the browser's localStorage.

## Testing

```bash
node tests/validate.js 2000
```

For each generator this checks that answers are finite, that a rounded answer is accepted, that multiple-choice options are distinct, that no `NaN`/`undefined` leaks into the text, and that each problem's independent `verify()` check passes (numerical integration, MATLAB-style ifft, and so on).

## Publishing with GitHub Pages

1. Merge the working branch into `main`.
2. In the repository, go to **Settings → Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. The site appears at `https://mgreenlee16.github.io/mgreenle16.signals.301/` within a minute or two.

The practice problems are original problems in the style of the course's exams, not copies of them. This is a study aid, not an official course page.
