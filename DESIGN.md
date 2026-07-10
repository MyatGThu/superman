# DESIGN.md — Furnace

## Aesthetic lane (named, per brand register)

“Night-gym poster meets instrument panel” — Nike-poster conviction in the
type, Teenage-Engineering discipline in the data readouts. Explicitly NOT:
editorial-serif magazine, SaaS-cream, acid-green terminal, red rage-gym.

## Signature element

**The Effort HUD + heat arc.** A fixed readout (effort % · BPM · phase) climbs
as you scroll, and the page's ambient color literally heats from cold night
indigo to molten orange, peaking at the drenched PEAK section, cooling through
RECOVERY. The page is one training session; scroll position is effort.

## Structure = information

Sections follow a real workout arc, so the sequence encodes truth:

1. **WARM-UP** (hero) — kinetic headline, HUD at resting heart rate
2. **THE WORK** — three sets (features), numbered because sets ARE a sequence:
   SET 01 The Log (interactive set logger) · SET 02 The Engine
   (self-drawing progression chart) · SET 03 The Clock (working rest timer)
   — then **THE LAB** (heat 0.8): a 3D movement library. The performer is
   Melina Jones Voss, a Soul-2-generated rigged 3D scan running baked
   exercise clips; her working muscles are marked with molten X-ray nodes
   anchored to her bones. The procedural iron mannequin (man/woman)
   remains as alternate performers and the automatic fallback. The camera
   dives onto the primary mover. Styled as product UI — the seed of the app.
3. **PEAK** — drenched molten; hold-to-break-your-limit interaction
4. **THE PROOF** — testimonials as training-log entries
5. **RECOVERY** — breathing pacer, honest CTA, footer

## Color (OKLCH only)

Seed: `oklch(0.36 0.14 260)` (indigo, hue 260). Strategy: **Committed →
Drenched at PEAK.** The temperature axis indigo→molten IS the brand.

```css
--bg:          oklch(0.11 0 0);          /* iron black, chroma 0        */
--surface:     oklch(0.16 0.012 262);    /* panel, faint night tint     */
--ink:         oklch(0.95 0.01 262);     /* chalk white                 */
--muted:       oklch(0.72 0.02 262);     /* secondary text, ≥5:1 on bg  */
--night:       oklch(0.36 0.14 260);     /* primary — deep indigo wash  */
--night-lift:  oklch(0.74 0.11 262);     /* interactive indigo (links)  */
--heat:        oklch(0.68 0.19 42);      /* molten orange accent        */
--heat-deep:   oklch(0.44 0.145 36);     /* drench bg — white text 4.5:1 */
```

Text on saturated molten fills is chalk-white (Helmholtz–Kohlrausch);
poster-scale display type on the PEAK drench may be near-black (poster move,
WCAG ≥7:1).

## Type

- **Display:** Anybody Variable (wght 100–900, wdth 50–150). Used at extreme
  weight/width. The width axis is the kinetic signature: headlines compress
  like a lifter under a bar.
- **Body / data:** Martian Mono Variable. Register reason: the product IS a
  training log with timers — mono is the vernacular of rep counts and plate
  math, not a "technical" costume. Body ≥1rem, measure ≤65ch, line-height
  1.6+ (light-on-dark compensation).
- Scale: fluid clamp() for display, ratio ≥1.25; fixed rem for body.

## Motion

- Scroll choreography via GSAP ScrollTrigger, scrubbed: heat variable, HUD
  values, chart draw. Ease-out-expo family only; no bounce.
- One orchestrated hero entrance (bar-path rise + width settle), not
  fade-on-scroll for every section.
- Interactions: hold-to-break (resistance ramp, spark burst on canvas),
  working rest timer, tap-to-log demo, breathing pacer.
- `prefers-reduced-motion`: heat still changes (color, not movement), scrub
  transforms disabled, hold-to-break completes without shake, pacer becomes
  a slow crossfade.

## Imagery

Deliberately zero stock photography: the imagery is the living product —
interactive app UI demos, a self-drawing progression chart, canvas sparks,
the breathing pacer. Poster-graphic identity, self-contained assets,
no external requests.

## Honesty rule

Furnace is a concept. No dead App-Store badges, no fake waitlist. The final
CTA owns it: "Run it back" restarts the session (scrolls to top) — one more
rep, literally. Repo link in the footer.
