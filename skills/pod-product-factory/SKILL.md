---
name: pod-product-factory
description: Run the print-on-demand product pipeline end to end — design concept → IP/policy screening → supplier product selection → margin math → mockups → listing copy → publish to Shopify (and Etsy) with supplier sync. Use when creating new POD products, batch-launching a design drop, or auditing an existing catalog's margins. Fills the confirmed ecosystem gap: pieces exist in isolation (Printful MCP, copy skills, image gen) but nothing chains them with margin math and trademark screening.
---

# POD Product Factory

Turns a design concept into live, margin-safe, legally-screened products. Every product
passes SIX gates in order; a failure at any gate stops that design (log it, move on —
losers are the cost of finding winners).

## Gate 1 — Concept fit

- Design serves the brand's ONE identity niche (self-identification test: would a member
  say "that's me"?). Reject generic art with no niche hook.
- Plan drops in batches: 5–10 designs per drop, 40+ designs before judging the niche.
  Power law: 15–25% of designs ever sell; 5–10% produce most revenue.

## Gate 2 — IP / policy screen (hard gate)

Run the `pod-ip-screening` skill. No design proceeds without a PASS. Never: festival
names, team/OEM logos, brand marks, celebrity likenesses, or ad-policy-violating imagery.

## Gate 3 — Supplier & garment selection

- Primary Printful (consistency), alt Printify (choice — **pin the print provider
  manually; default "Printify Choice" routes by availability/rating, not quality or
  proximity**), Gelato configured as fallback.
- Swim: one-piece ~$25.45 base (Printful), bikini set ~$18–23 (Printify). Evergreen:
  premium blanks only (premium feel is the strategy; never compete on price).
- **Sample rule:** any NEW garment/provider combination gets a physical sample ordered and
  inspected (swim: opacity when wet, fit on curves, color accuracy) before it can be
  published. No exceptions. Samples become UGC content.

## Gate 4 — Margin math (hard gate)

Compute per variant before publishing:

```
gross = retail − base_cost − est_shipping_subsidy − processing(2.9% + $0.30)
breakeven_CAC = AOV × gross_margin_pct
```

- Reject if gross margin < 35% or gross < $12/unit.
- Target AOV $60–80 via bundles (two-piece sets, matched sets) → breakeven CAC $24–32.
  A standalone item priced so breakeven CAC < $20 needs a bundle path defined.
- Provision 5–10% of revenue for returns/chargebacks in all projections.

## Gate 5 — Assets & listing

- Mockups: supplier mockup API (printful-mcp `generate mockups`) + at least one
  lifestyle/on-body image per hero product (sample photos beat renders).
- Listing copy: editorial voice per brand guide — design story (metafield), fabric/fit
  notes, size chart reference, care. Title format: `[Design name] [garment] — [niche hook]`.
  SEO: adopt external ecommerce-SEO skill (AgriciDaniel/claude-seo) for product schema
  (`hasMerchantReturnPolicy`, `shippingDetails`).
- Alt text on every image (accessibility + SEO).

## Gate 6 — Publish & sync

- Push to Shopify via MCP/Admin API with metafields populated; auto-collections pick it
  up via tags/metafields.
- Mirror to Etsy (validation channel) with Etsy-optimized title/tags.
- Verify: PDP renders, variants orderable, supplier sync shows the product mapped, ONE
  test order routes to the supplier correctly (first product of every drop).

## Batch audit mode

On request, re-run Gate 4 across the live catalog against current supplier base costs
(supplier APIs) — supplier price changes silently erode margins (watch the
Printful/Printify "Fyul" consolidation). Flag any product whose margin slipped below 35%.

## Related

`pod-ip-screening` (Gate 2) · `ecommerce-margin-watch` (ongoing Gate-4 monitoring) ·
`shopify-store-builder` (structure) · Purple-Horizons/printful-mcp (execution layer) ·
build repo docs 01/05 for niche + financial rules.
