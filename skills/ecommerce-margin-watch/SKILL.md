---
name: ecommerce-margin-watch
description: Continuously reconcile true unit economics for a POD store — live supplier base costs + Shopify pricing + ad spend + tool costs + returns provisioning — into per-product margins, blended true CAC, and go/no-go dashboard numbers. Use for the weekly numbers ritual, before/after any price or supplier change, at phase gates, and whenever ads are running. Fills a confirmed gap: existing skills analyze supplied data one-off; nothing reconciles across systems continuously.
---

# Ecommerce Margin Watch

Why this exists: **68% of DTC brands underestimate true CAC by 20–40%** because they only
count the ad platform's reported CPA — the main reason founders believe they're closer to
profitable than they are. This skill computes the honest numbers on a schedule and holds
them against the plan's pre-committed gates.

## Data pulls (each run)

1. **Supplier costs** — live base cost + shipping per SKU from Printful/Printify APIs
   (never cached >7 days; the "Fyul" duopoly can reprice underneath us).
2. **Store** — Shopify: prices, orders, AOV, conversion rate, discounts given.
3. **Ad spend** — Meta/TikTok via official APIs only (spend, reported CPA — recorded but
   never trusted as CAC).
4. **Fixed stack** — plan + app subscriptions (from the runbook's tool ledger).
5. **Returns/chargebacks** — actuals; floor the provision at 5% of revenue even when
   actuals are lower (apparel runs 20–40% return rates; POD 20–30%).

## Compute

```
per-product gross     = retail − base − ship_subsidy − processing(2.9%+$0.30)
per-product margin %  = gross / retail                     [flag < 35%]
breakeven CAC         = AOV × blended gross margin %
TRUE CAC              = (ad spend + content/tool costs + discounts) / new customers
blended CAC           = TRUE CAC weighted across paid + organic orders
net margin            = (revenue − COGS − ads − tools − returns provision) / revenue
runway burn           = ad-testing fund remaining ÷ current monthly net burn
```

## Report (weekly ritual — Karpathy rule 8: visualize everything)

One page, same order every week:
- Store up / orders flowing to supplier / flows sending (the silent-failure check)
- Revenue, orders, AOV, conversion rate (vs. 1.0–1.5% new-store baseline)
- TRUE CAC vs. breakeven CAC — **the number that decides everything**
- Email/SMS % of revenue (target ramp: 15–20% by mo 7–9, 25–30% by mo 13–18)
- Per-product margin table, flagged rows first; any supplier repricing since last run
- Returns/chargeback rate (chargebacks > 0.5% = red alert — processor-hold territory)
- Ad-fund remaining + months of runway
- Phase-gate tracker: distance to the month-6 (breakeven ±$500) and month-12
  ($1,500+/mo net, rising) go/no-go lines

## Alert rules (surface immediately, don't wait for the weekly)

- Any product margin drops below 35% (supplier repricing or discount stacking)
- TRUE CAC exceeds breakeven CAC for 14 consecutive days while ads run
- Chargeback rate crosses 0.5%
- Zero orders for 48h while sessions are normal (checkout/supplier-sync breakage)
- A flow's revenue/recipient falls >50% below its trailing 8-week mean

## Honesty rules

- Never report ad-platform CPA as CAC. Never exclude "one-time" costs — they recur.
- Attribute organic modestly (last-click, not platform-claimed).
- The gates are pre-committed in BUSINESS_PLAN.md; this skill reports distance to them —
  it does not move them.

## Related

`pod-product-factory` Gate 4 (same math, pre-publish) · mardab96/ecommerce-claude-skills
(one-off diagnostics) · build repo docs/05 (all benchmark sources) · A2X + QuickBooks
(the books of record this reconciles against).
