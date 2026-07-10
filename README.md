# FURNACE — one more rep

**Live site: https://myatgthu.github.io/superman/**

A concept marketing site for a gym app, built to be scrolled the way a session
is trained. The page **is** a workout: it opens cold, heats up as you put work
in, peaks molten, and cools back down. A fixed Effort HUD (phase · effort bar ·
BPM) tracks you the whole way, and the interactive centerpiece asks you to
physically hold a button through the sticking point to break a PR.

> Furnace is fictional. No app store, no waitlist, no tracking — the honest CTA
> at the end is "Run it back."

---

## The experience

| Phase | Section | Heat | What happens |
|---|---|---|---|
| WARM-UP | `Hero` | 0.07 | Kinetic headline — lines rack up like plates; "REP" compresses under load as you scroll away |
| WORK | `SetLog` (SET 01) | 0.28 | A **live set logger**: steppers, plate math per side, log five sets |
| WORK | `SetEngine` (SET 02) | 0.48 | Ten weeks of top sets **draw themselves** as you scroll; the engine names the next target (142.5 kg) |
| WORK | `SetClock` (SET 03) | 0.66 | A **real 90-second rest timer** — rAF + `performance.now()`, drift-free |
| PEAK | `Peak` | 1.00 | Drenched molten. **Hold-to-break**: ~2 s grind with resistance, screen strain, spark burst, PR logged |
| COOL-DOWN | `Proof` | 0.45 | Testimonials as training-log entries |
| RECOVERY | `Recovery` | 0.10 | CSS-only box-breathing pacer, honest close, footer |

**The heat system** is the site's one signature: every section declares
`data-heat`; a single controller interpolates between section midpoints on
scroll, smooths the value, and writes **one CSS variable** (`--heat`) per
frame. All color follows from it via `color-mix()` — the background warms,
the chart line and clock ring glow hotter, the HUD border ignites. JS moves
one number; CSS does the design.

## Stack

- **Vite + React 19 + TypeScript** — component composition for the sections,
  static build output
- **GSAP ScrollTrigger** (`@gsap/react`) — scrubbed scroll choreography
- **Anybody Variable** (display; the width axis powers the "type under load"
  moves) + **Martian Mono Variable** (data/body — the vernacular of rep
  counts and plate math), self-hosted via Fontsource
- Zero external requests at runtime; zero stock photography — the imagery is
  the living product UI, the self-drawing chart, canvas sparks, the pacer

## Architecture

```
index.html                  document shell, meta, inline SVG favicon
src/
  main.tsx                  entry: fonts, global styles, React mount
  App.tsx                   page composition in session order; owns the
                            heat controller and passes it down
  lib/
    heat.ts                 THE core: scroll → smoothed --heat variable +
                            subscriber stream (HUD). One rAF, one DOM write
    plates.ts               pure plate-math (greedy decomposition, exact)
    plates.check.ts         runnable assertions for plates.ts (npm run check)
  components/
    EffortHud.tsx/.css      fixed instrument strip; DOM written via refs at
                            scroll frequency — never through React state
  sections/
    Hero.tsx/.css           entrance + scroll compression (GSAP matchMedia)
    SetLog.tsx/.css         interactive logger demo (useState — user events)
    SetEngine.tsx/.css      SVG chart, geometry hoisted to module scope,
                            scrubbed stroke-dashoffset draw
    SetClock.tsx/.css       rest timer; digits/ring via refs, status in state
    Peak.tsx/.css           hold-to-break interaction + spark canvas
                            (IntersectionObserver-gated rAF)
    Proof.tsx/.css          log-entry testimonials; JS-optional reveal
    Recovery.tsx/.css       CSS-only breathing pacer, close, footer
  styles/
    tokens.css              design tokens: OKLCH palette, type scale,
                            spacing, easing, z-order — and the --heat mixes
    base.css                reset, element defaults, shared section shell
```

Performance decisions worth naming (from the Vercel React guidelines):
scroll-frequency values live in refs and CSS variables, never React state;
static SVG geometry is computed once at module load; the spark canvas only
runs while PEAK is on screen; fonts are subset per script via unicode-range;
`prefers-reduced-motion` swaps every animation for a static or color-only
equivalent (the chart ships fully drawn, content is never gated on a reveal).

## Design system

Full rationale in [DESIGN.md](DESIGN.md) (direction) and
[PRODUCT.md](PRODUCT.md) (brief). Short version: iron-black base (chroma 0),
night-indigo primary at hue 260, molten-orange accent — and the page's
temperature interpolates between them **in oklab**, because the oklch hue
wheel would route indigo→orange through magenta, and heated iron doesn't
glow pink.

## Develop

```bash
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build → dist/
npm run preview   # serve the production build
npm run check     # run the plate-math assertions
```

## Hosting

**Currently: GitHub Pages**, deployed from the `gh-pages` branch (the built
`dist/`, with `.nojekyll`). Nothing else to configure — the site is fully
static. If the URL above ever 404s, re-enable it in
**Settings → Pages → Deploy from a branch → `gh-pages` / (root)**.

To redeploy after changes:

```bash
npm run build
git worktree add /tmp/ghp gh-pages
rm -rf /tmp/ghp/* && cp -r dist/* /tmp/ghp/ && touch /tmp/ghp/.nojekyll
cd /tmp/ghp && git add -A && git commit -m "Deploy" && git push origin gh-pages
```

**GitHub Pages vs Vercel?** For this site, Pages is the right call: it's
free, already wired to this repo, and a static bundle needs nothing more.
Reach for Vercel if you later want a custom domain with zero DNS fuss,
preview deployments per PR, or analytics — importing the repo in the Vercel
dashboard (framework: Vite, base path removed from `vite.config.ts`) is all
it takes.

## Accessibility

Semantic landmarks and headings, skip link, keyboard path for the
hold-to-break (press Enter — holding a key is not an accessible
requirement), live regions only where a result is announced (timer end, PR
logged), 44px touch targets, tabular numerals on every readout, body
contrast ≥ 7:1, decorative readouts (`.hud`, numerals, sparks) hidden from
the accessibility tree, and full `prefers-reduced-motion` coverage.
