# Learn Signals · AAE 301

An interactive study site for **AAE 301, Signal Analysis for Aerospace Engineering** (Purdue). It has lessons with live figures, worked examples, and problem generators that write a new exam-style problem each time you finish one, check your answer, and show a worked solution.

Live site (once GitHub Pages is enabled): `https://mgreenlee16.github.io/mgreenle16.signals.301/`

## Contents

**Exam 1 (complete)**

| Page | What's in it |
| --- | --- |
| `lessons/complex.html` | Complex arithmetic, polar form, powers and roots, logs and complex powers, phasors. 3 interactives. |
| `lessons/inner-products.html` | Linear spaces, inner products on ℂⁿ and L²(0,τ), Cauchy–Schwarz, orthogonal expansions, Parseval, best approximation. 3 interactives. |
| `lessons/fourier-series.html` | Coefficients, cosine–sine and harmonic forms, spectra, Parseval, truncation error, Gibbs, shift/modulation/derivative rules, leakage. 4 interactives. |
| `lessons/dft.html` | Sampling, the DFT matrix, MATLAB `fft`/`ifft` ordering, Nyquist and aliasing, the FFT, reading spectra in Hz. 4 interactives. |
| `exams/exam1.html` | Objectives checklist, formula sheet, common mistakes, four exam-style problems with solutions, practice-exam generator (optional 50-minute timer), progress by topic. |
| `practice.html` | All 18 Exam 1 problem generators in one drill, with per-topic accuracy. |
| `tools/complex.html`, `tools/fourier.html`, `tools/dft.html` | Complex calculator; Fourier series calculator (any piecewise f(t)); MATLAB-style fft/ifft calculator. |

**Exam 2 and Final:** shown as "coming soon". They will be added when that material is uploaded.

## Conventions

Notation follows the course notes (A. E. Frazho, *Notes on Signals and Systems*):

- f(t) = Σ aₖ e^(−ikω₀t), with aₖ = (1/τ)∫₀^τ f(t) e^(+ikω₀t) dt and ω₀ = 2π/τ
- (f, g) = (1/τ)∫₀^τ f ḡ dt on L²(0, τ)
- F_ν[j, k] = e^(−2πijk/ν), so `ifft(samples)` = [a₀, a₁, …, a₋₁]

Some lecture slides use e^(+jkω₀t). The lessons point out where this flips a sign.

## Layout

```
assets/css/style.css        theme (light/dark), layout, quiz styles
assets/js/cx.js             complex arithmetic, expression parser, quadrature, FFT
assets/js/ui.js             site chrome, controls, SVG plots, complex plane, site map
assets/js/quiz.js           problem-generator engine (drill, practice exam, mastery)
assets/js/gen-exam1.js      Exam 1 problem generators
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

## Adding Exam 2 and the Final

Add lesson pages under `lessons/`, register new generators in a new `assets/js/gen-exam2.js` with `QZ.register(id, {title, exam: 2, group, lesson}, gen)`, and remove the `soon` flags for those entries in `LESSONS`, `TOOLS` and `EXAMS` in `assets/js/ui.js`.

The practice problems are original problems in the style of the course's exams, not copies of them. This is a study aid, not an official course page.
