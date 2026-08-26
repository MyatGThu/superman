---
name: editorial-swiss-storefront
description: "Apply a luxury editorial Swiss design system to a storefront: high-contrast serif display over a grotesque workhorse, exposed 12-column grid with hairline rules, oversized numbered section indexes, architecture-portfolio product presentation, and strictly fail-open motion. Use when a store must court a premium, influencer and press facing audience: presenting products the way architecture portfolios present projects, without sacrificing PDP mechanics, accessibility, or Core Web Vitals."
---

# Editorial Swiss Storefront

Core law: luxury is subtraction plus precision. One serif voice used huge and rarely,
one grotesque doing 90 percent of the pixels, one accent used once per viewport,
photography and film carrying all the color, and a grid you can see. Motion is an
enhancement layer over a page that is complete without it.

## Reference patterns (verified 2026-08-26; steal the pattern, never the asset)

- big.dk / snohetta.com: projects as a captioned index; photography dominant; chrome
  nearly invisible; hairline dividers; arrow-driven horizontal galleries.
- toteme.com: monochrome restraint, sentence case display, alternating image and text
  blocks, negative space as the brand.
- hunzag.com / jadeswim.com / eresparis.com: luxury swim ships quiet type, white
  grounds, unadorned tabular prices, zero promo overlays, and earns its press marquee.
- 2026 roundups: oversized high-contrast serif headlines as design elements,
  asymmetric offsets, subtle scroll reveals only. Pure Swiss is softening; pair the
  strict grid with editorial warmth.

## Type method

- TWO families, FIVE weight instances total, both from one performant source (Google
  Fonts with preconnect, display swap, pinned instances). A display serif that ships
  few weights (Instrument Serif's single 400 roman plus italic is ideal) makes the cap
  structural. The grotesque (Instrument Sans class) carries body, UI, labels at
  400/500/600.
- The display face NEVER appears in tables, size charts, forms, buttons, prices, nav,
  or below its stated floor (28px). Pressure test the grotesque at 13px in a size
  chart before committing; 13px is the global floor.
- Sentence case for display; tracked uppercase only at the 13px label tier.
  Flush left, ragged right, always. Hierarchy comes from size and placement.
- font-variant-numeric: tabular-nums on every price, table, and counter. Verify the
  served instance actually has tnum (render 111.00 against 888.00) or pin numerals to
  a fallback that does.

## Grid and showcase method

- 12 columns, 8px base, generous fluid gutters, section padding around 10vh. EXPOSE
  the grid: full-bleed 1px hairline rules between sections, hairline frames on forms
  and toolbars. Hairlines are a dedicated decorative token, never a text color.
- Number the page: every section gets an oversized ghost numeral (grotesque, tabular,
  aria-hidden, hairline-tone) plus a 13px tracked label ("02 / THE RANGE"). Numbered
  structure is the Swiss signature and costs zero performance.
- Present products like an architecture office presents projects: the INDEX list is
  the primary catalog view. Row = counter, name in the serif, metadata in 13px muted,
  tabular price right-aligned, hairline below. Hover may float an image swatch;
  mobile shows an inline thumbnail. Offer a grid as the secondary view, asymmetric
  (alternating cell widths), never marketplace-uniform.
- Captions everywhere: every editorial image gets a 13px figure caption ("Fig. 02
  Back, size 10 shown on 175cm"). Captions are the cheapest editorial signal there is.
- Asymmetry by vertical offset: pair blocks start at different heights on the grid.
  Full-bleed video earns at most one moment per page.
- The footer is a sign-off: the wordmark set enormous in the serif across the full
  grid, link columns and legal at 13px beneath. One optional inverse (dark) beat per
  site, maximum.

## Color method

- Light gallery ground (warm paper, not #FFF), near-black ink (never #000), ONE warm
  neutral for bands and mats, ONE accent with a hard quantity budget: one accent
  element per viewport, normally the primary CTA. Add an annealed dark variant of the
  accent hue for text links so the accent can speak without a filled chip.
- Compute (do not eyeball) WCAG contrast for every text-on-surface pair, including
  the 13px tier at AA 4.5:1, including accent surfaces (dark ink on the accent, never
  white unless proven). Ghost numerals are decorative and exempt only while
  aria-hidden and meaning-free.

## Motion restraint (all of it fail-open)

- Base page is fully styled and visible with zero JavaScript; no opacity:0 in CSS.
  One init guard covers missing CDN, JS off, and prefers-reduced-motion.
- Allowed: micro-parallax inside overflow-hidden frames (transform-only, about 6
  percent travel, scrubbed, never the hero, max two per viewport); ONE reveal pattern
  (small y plus fade, once, below the fold only); horizontal rails built on native
  overflow-x with scroll-snap, enhanced (never replaced) by arrow buttons.
- Hidden scrollbars: scrollbar-width none plus ::-webkit-scrollbar display none on
  rails, optionally on the document; if the document scrollbar goes, ship a 1px
  scroll-progress hairline (CSS scroll-driven animation, degrades to absent) and keep
  keyboard scrolling and focus outlines untouched.
- LCP is untouchable: preloaded poster image as the LCP element, video fades in after
  loadeddata, no transform-scale on playing video ever, all scripts deferred, only
  transform and opacity animate (zero CLS by construction).

## What to avoid

- Scroll-jacking, pinned horizontal sections, entrance animation on every element,
  Ken Burns on video, animated nav or prices, more than one reveal pattern.
- Tracked uppercase display type, centered body copy, the display face in UI.
- Fake luxury signals: invented press logos, "as seen on" without a real placement,
  false scarcity on made-to-order goods. Made-to-order IS the story; numbered drops
  with real dates are truthful scarcity.
- Accent sprawl: the moment the accent appears twice in a viewport, one is wrong.
- More than five weight instances, any text below 13px, hairlines used as text color.

## Acceptance gates

- 13px chart test passes; tabular numerals verified; every text pair AA-computed.
- JS disabled: every page sells (working forms, visible content, scrollable rails).
- prefers-reduced-motion: no motion beyond native scrolling.
- Mobile LCP under 2.5s, CLS under 0.1, with motion enabled.
- PDP still passes the full Baymard checklist in premium-store-design; editorial
  never overrides button size selectors, visible returns policy, or on-body imagery.

## Related

- `premium-store-design` (this skill's parent law: photography, whitespace, PDP
  mechanics, budget order; editorial-swiss is a styling of it, not a replacement)
- Build repo spec: `lastone/docs/16-editorial-redesign.md` (the concrete redesign
  this skill was distilled from: tokens, block plans, motion choreography)
- Companion catalogs: `ECOMMERCE-STACK.md` frontend table, `LIBRARIES.md` (GSAP)