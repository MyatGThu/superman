---
name: weather-merchandising
description: "Build and operate a weather-based storefront on Shopify: state-level visitor location, cached weather data, product weather-tagging, dynamic homepage and collection ranking, and weather-triggered Klaviyo events. Use when implementing or modifying the weather store feature, tagging products for weather, tuning thresholds, or wiring weather email triggers. Built for the Australian market first."
---

# Weather Merchandising

Implements the weather-based store defined in `lastone/docs/10-weather-store-design.md`.
That spec is the authority; this skill is the operating procedure. If the spec and this
skill disagree, the spec wins and this skill gets updated.

## The five rules that never bend

1. **Cache by state, never call per visitor.** One scheduled job (every 30-60 min)
   fetches the 8 AU capitals and writes one JSON blob (shop metafield or App Proxy KV).
   The theme reads the blob. Roughly 400 API calls/day total, independent of traffic.
2. **Picker first, IP second, GPS never.** Manual 8-state picker shown once, persisted
   as `au_state` in localStorage, pre-filled by ipwho.is (fallback ipapi.co). No browser
   Geolocation API for this feature.
3. **Fail open.** API down, blob stale, JS blocked: the store renders default
   merchandising untouched. The weather layer is enhancement, not a dependency.
4. **Compliant sources only.** MVP: OpenWeatherMap free tier with on-screen attribution
   (commercial use allowed). Upgrade: Open-Meteo Standard (USD 29/mo, includes BOM
   ACCESS-G). Never Open-Meteo's free tier on a revenue store (non-commercial terms),
   never api.weather.bom.gov.au directly (unauthorized for reuse).
5. **Zero performance cost.** Default view renders server-side; weather variant hydrates
   after paint. No blocking third-party requests. LCP under 2.5s mobile, verified with
   the weather endpoint mocked slow and mocked down.

## Data model

- Blob: `{ updated, states: { QLD: { tempC, condition, rainProb, uv, category } } }`.
- Categories: hot (>= 28C), cold (<= 15C), wet (high rainProb, applied as overlay),
  mild (otherwise). Thresholds are config, tuned from real data, changes logged.
- Products: metafield `custom.weather_suitability` (list: hot/mild/cold/wet) mirrored
  as `weather:*` tags. Tag-based automated collections are the no-JS fallback path.
  Tagging happens in `pod-product-factory` Gate 5; never bulk-tag without product data.

## Storefront behaviour

- Homepage hero + featured collection branch on the visitor state's category. Copy
  references the real condition ("31 degrees in Brisbane today").
- Collection pages re-rank weather-matched products first. Nothing is hidden.
- Attribution for the weather source rendered on-screen near the module.
- Privacy: one-line collection notice at the picker, paragraph in the privacy policy.

## Email triggers

The cache job pushes a Klaviyo custom event on category change, keyed to each
subscriber's stored state, so storefront and email use identical data. A cold snap in
VIC fires the hoodie flow; a hot streak in QLD fires swim. Frequency-cap these flows
(max one weather-triggered send per subscriber per week).

## Verification checklist per change

- [ ] Two simulated states render correctly (one hot, one cold)
- [ ] Wet overlay verified on a rainy-state simulation
- [ ] API mocked down: default merchandising renders, no console errors
- [ ] Stale blob (>3h): falls back to default
- [ ] Lighthouse LCP unchanged vs baseline
- [ ] Picker persists across reload; change-state control works
- [ ] Attribution visible; privacy notice present

## Related

`lastone/docs/10-weather-store-design.md` (spec) · `lastone/docs/09-australia-adaptation.md`
(market rules) · `pod-product-factory` (tagging gate) · `ecommerce-email-flows` (flow
frequency rules) · `premium-store-design` (motion and performance budgets).
