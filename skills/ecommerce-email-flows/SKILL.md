---
name: ecommerce-email-flows
description: Author and deploy the complete Klaviyo lifecycle flow set for a POD ecommerce brand — welcome, abandoned cart, post-purchase (production-time-aware), winback, browse abandonment — with POD-specific logic like misprint/replacement handling and honest shipping expectations. Use when setting up email/SMS automation, auditing flow performance against benchmarks, or adding a new flow. Fills the confirmed gap: Klaviyo's MCP can execute, but no skill authors POD-aware flows end to end.
---

# Ecommerce Email Flows (POD-aware)

Email flows are the single highest-ROI automation in the business: 30–41% of email
revenue from ~5% of sends (P90 brands: 58–65%). Welcome + abandoned cart alone = 40–60%
of flow revenue. **Flows go live BEFORE the first sale, not after.**

Execution layer: Klaviyo MCP server (`mcp.klaviyo.com/mcp`, 200+ tools) or Klaviyo API.
Free tier to 250 profiles is fine at launch.

## The launch flow set (build in this order)

### 1. Welcome series (trigger: list signup)
- 3 emails: brand story/identity (immediately) → best sellers + social proof (day 2) →
  first-order incentive (day 4; bundle discount, not blanket %, protects margin).
- Benchmark: $2.65/recipient average, $20+ top decile; 12–18% conversion at P90.

### 2. Abandoned cart (trigger: checkout started, not completed)
- 3 touches: 1h (reminder + product image) → 24h (objection handling: size guide link,
  return policy, reviews) → 48h (incentive only if margin allows; bundle upsell instead
  where possible).
- Benchmarks: ~50.5% open / 3.33% order rate / $3.65 per recipient ($28.89 P90);
  8–12% recovery at P90.

### 3. Post-purchase (trigger: order placed) — the POD-specific one
- Immediately: thank-you + **honest timeline** ("made to order for you: 2–7 days
  production, then shipping") — set expectations before the "where's my order" ticket.
- On fulfillment webhook: tracking + care instructions (garment-specific metafield pull).
- Delivery +3 days: review request handoff (Judge.me handles its own — do NOT double-send;
  suppress Klaviyo's if Judge.me's is active) + UGC ask (photo tag incentive).
- Delivery +14 days: cross-sell within the identity niche (matched set, next drop).
- **Misprint/quality branch:** a reply or support tag on "damaged/misprint/wrong item"
  routes to the replacement path (POD = replacement/store-credit, not warehouse returns);
  escalate to human — never auto-promise a refund.

### 4. Winback (trigger: no purchase in 60–90 days)
- Identity-led ("new drops for [niche]") before discount-led. Suppress after 2 sends.

### 5. Browse abandonment (trigger: viewed product, no cart, 24h)
- One email, product + social proof. Low volume early; enable once traffic justifies.

## Seasonal logic (swim-anchor brand)

- Feb–Jul: swim-forward content blocks; launch-window campaign (must be live by Feb–Mar).
- Aug–Jan: evergreen apparel forward; swim suppressed from hero slots.
- Segment by purchase category to rotate hero products automatically.

## Rules

- Segment from day 1: engaged (opened <90d) vs. everyone; send campaigns to engaged only
  (deliverability protection).
- SMS only after email flows prove out (adds ~$15/mo + per-message; higher ROI later).
- CAN-SPAM: business address in footer (owner's launch-checklist item).
- Every flow gets a test send + a live trigger test before activation (Karpathy rule 9:
  prove it fires, alert when it doesn't, weekly human check documented in the runbook).
- Target trajectory: email/SMS at 15–20% of revenue by months 7–9, 25–30% by months 13–18.
  Audit against these numbers monthly; a flow below benchmark gets ONE variable changed
  at a time.

## Related

`shopify-store-builder` (step 9) · Klaviyo MCP docs (execution) ·
CosmoBlk/email-marketing-bible + thatrebeccarae/claude-marketing DTC pack (reference
content) · build repo docs 03/05 for the revenue-share benchmarks.
