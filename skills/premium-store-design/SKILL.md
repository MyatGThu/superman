---
name: premium-store-design
description: Apply a premium design system to a Shopify storefront — typography, color, whitespace, PDP mechanics, and disciplined motion — bridging brand design tokens into Liquid theme implementation. Use when designing or restyling store pages, choosing a theme, building custom sections, or reviewing a storefront for "premium" feel. Fills the confirmed gap that no existing skill bridges brand design systems into Shopify theme output.
---

# Premium Store Design

Core law (from the 2026 premium-site research): **premium feel = editorial photography +
restrained typography + generous whitespace + boring PDP mechanics done right. Not
motion.** Excessive scroll/entrance animation measurably hurts Core Web Vitals and
conversion, and punishes the mobile majority first.

## Reference patterns (steal these, not their assets)

- Jacquemus/Skims: photography IS the product; UI chrome nearly invisible.
- Aesop: literary editorial copy + type discipline out-premiums any animation.
- Cuup: premium expressed as fit-UX depth (size systems, calculators).
- Triangl: small disciplined SKU count → simple IA; restraint reads expensive.
- Reformation/ALD: an editorial/lookbook channel ("Stories") beside commerce.

## Design tokens (define once, in the theme's settings/CSS custom properties)

- **Type:** ONE display face for hero/campaign (high-contrast serif: Canela, GT Alpina,
  Instrument Serif; free fallback Playfair Display) + ONE workhorse grotesque sans for
  all UI/body (Söhne, Neue Montreal; free: Satoshi or Inter). **Pressure-test at 13px**
  in size charts and mobile filters before committing — the classic failure is a hero
  font illegible in a spec table.
- **Color:** neutral/skin-tone or near-monochrome base; ONE accent reserved for CTAs;
  photography carries the color story, never UI chrome.
- **Space:** generous negative space, restrained grid — the cheapest "looks expensive"
  lever that exists.
- Full light-theme token set on `:root`; test both themes if the storefront offers dark.

## Theme selection

| Pick | When |
|---|---|
| Symmetry ($340) | fashion-editorial, campaign imagery, moderate catalog — default |
| Prestige (~$400) | luxury-minimal, small catalog; 78.7% CWV pass rate across live stores; most common premium theme → REQUIRE custom section/CSS differentiation |
| Focal ($320–350) | campaign-photography-led / activewear energy |
| Impact / Broadcast ($380–400) | large catalog CRO / storytelling-first |

Never headless/Hydrogen for this build (2–3× cost multiplier, Plus-tier economics).
Custom needs → custom sections + metaobjects, inside the theme.

## PDP acceptance checklist (Baymard 2026 — ship blocked until all pass)

- [ ] Button-style size selectors (never dropdowns) — cited +15–20% add-to-cart
- [ ] Color swatches with image switch on hover/tap
- [ ] Inline size chart (metaobject-driven) + simple fit quiz — fit causes ~70% of fashion returns
- [ ] On-body/model shot + scale reference in every image set
- [ ] Return/final-sale policy visible ON the PDP (60% of shoppers look there)
- [ ] Guest wishlist (no forced account)
- [ ] Estimated total cost incl. shipping before checkout
- [ ] Customer review photos browsable
- [ ] Quick-add on collection grids (hover modal desktop / corner tap-icon mobile)

## Motion rules

**Allowed:** Lenis smooth scroll · GSAP/ScrollTrigger subtle section fade/slide reveals ·
Swiper PDP galleries · CSS View Transitions API (Baseline Oct 2025 — zero-dependency
list→PDP and quick-shop transitions inside Liquid's no-framework constraint; verify
graceful degradation).
**Banned:** scroll-jacking, parallax, entrance animation on every element, infinite
scroll on collections, anything delaying LCP. Budget: LCP < 2.5s mobile, always.

## Budget order (spend in this order, stop when out)

1. Photography/creative direction (one styled sample day-shoot)
2. Copywriting system (editorial voice, consistent)
3. Theme + custom sections to de-genericize
4. Fit/size app + review app
5. Motion polish — last, minimal

## Liquid implementation notes

- Tokens as CSS custom properties in `settings_data`/theme CSS; sections read them —
  never hardcode colors/fonts in sections.
- Custom sections: schema-exposed settings so future edits don't need code.
- Size charts as metaobjects rendered by snippet — one source of truth per garment class.
- Validate all Liquid with Shopify-AI-Toolkit's validators before deploy.

## Related

`shopify-store-builder` (sequencing) · baslefeber/shopify-skills (CRO/perf/a11y audits
post-build) · build repo `lastone/docs/04-design-playbook.md` (full sourced playbook) ·
companion catalog `ECOMMERCE-STACK.md` frontend table.
