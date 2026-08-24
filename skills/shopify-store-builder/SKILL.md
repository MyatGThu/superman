---
name: shopify-store-builder
description: Orchestrate a complete Shopify store launch for a solo-founder POD brand — brand inputs → theme, navigation, policies, collections, products, copy — in one sequenced run. Use when setting up a new Shopify store, rebuilding store structure, or auditing launch readiness. Fills the ecosystem gap where existing skills cover only developer tasks (Shopify/agent-skills) or exclude products and copywriting (shopify-builds).
---

# Shopify Store Builder

Sequences "brand idea → live premium store" end to end. Non-developer operable: uses the
Shopify MCP tools (or Admin GraphQL API) for every mutation; never asks the owner to click
through the admin except for owner-only items (payments, domain — see
`lastone/docs/06-launch-checklist.md`).

## Prerequisites

- Shopify store exists with API/MCP access (owner completed the **Phase 0** items in
  `lastone/docs/06-launch-checklist.md`).
- Brand package: name, one-line positioning, identity niche, type pair, palette
  (generate with `cofoundy/brand-skills` or equivalent if missing).
- Theme decision made (default: Symmetry $340 for fashion-editorial; Prestige ~$400 for
  luxury-minimal small catalog — see `premium-store-design` skill for the full rules).

## Build sequence (do not reorder; verify each step before the next)

1. **Store settings** — legal name, currency, timezone, unit system; checkout: guest
   checkout ON, tipping OFF; enable Shopify Tax.
2. **Policies** — generate and install: refund/return (POD-aware: replacement/store-credit
   model, hygiene final-sale clause for swim/intimates, visible sizing disclaimer),
   privacy, ToS, shipping (production time 2–7 days + transit stated honestly, per-region).
3. **Structure** — metafields/metaobjects FIRST, before products: define
   `product.fit_notes`, `product.fabric`, `product.size_chart` (metaobject reference),
   `product.design_story`. Never model custom data as tags or description hacks.
4. **Collections** — automated collections on product metafields/tags (e.g. `swim`,
   `evergreen`, per-design-family). Navigation: flat, ≤2 levels; collection landing pages
   get editorial intro copy.
5. **Theme install + configuration** — apply the design tokens from `premium-store-design`.
   Homepage sections: hero (campaign image) → featured collection → identity/story block →
   social proof → email capture. No more than 6 sections at launch.
6. **PDP template** — the Baymard punch-list is the acceptance test: button-style size
   selectors (never dropdowns), color swatches with image switch, inline size-chart
   metaobject render, return policy block on-page, on-body photo slot, review widget slot,
   guest wishlist. Quick-add on collection grids.
7. **Products** — import via `pod-product-factory` skill output (never hand-create).
   Launch minimum: 20–40 designs (POD power law: 15–25% of designs ever sell).
8. **Apps, lean stack only** — Klaviyo, Judge.me (free), a size-chart app (Kiwi
   Sizing/Sizely), the POD supplier app. Nothing else at launch. Every app is a monthly
   cost + failure point.
9. **Email flows** — hand off to `ecommerce-email-flows` skill; flows must be live
   BEFORE launch traffic.
10. **Pre-launch QA** — place a real test order end-to-end (order → POD routing → tracking
    email); run Lighthouse on home/collection/PDP (LCP < 2.5s mobile); check every
    Baymard punch-list item; verify policies render in checkout footer.

## Verification rules (Karpathy guidelines apply)

- One step at a time; render/click/test-order after each before proceeding.
- Prove the pipeline with ONE product end-to-end before importing the catalog.
- Log every non-obvious decision to the build repo's `docs/` with date + why.

## Anti-patterns

- Building later-phase features at launch (upsell/loyalty apps; the coffee subscription
  layer is Phase 4 — see the roadmap in `lastone/BUSINESS_PLAN.md`).
- Custom checkout work (gated to Shopify Plus; not for this build).
- Headless/Hydrogen (2–3× cost multiplier; premium theme + custom sections instead).
- More than 3 options per product (platform ceiling is 3 options / 2,048 variants).

## Related

`premium-store-design` (tokens + theme rules) · `pod-product-factory` (products) ·
`ecommerce-email-flows` (flows) · Shopify/agent-skills + Shopify-AI-Toolkit (developer
reference + validation) · build repo `lastone` docs 02/04.
