# web-repos-and-skills

Curated catalogs of useful software libraries, tools, and Claude skills — plus custom
skills built where the ecosystem has gaps.

## Catalogs

- **[LIBRARIES.md](./LIBRARIES.md)** — popular **website libraries** (3D, animation, UI
  frameworks, styling, data viz, maps, media, utilities). 🔁 Auto-refreshed monthly.
- **[ECOMMERCE-STACK.md](./ECOMMERCE-STACK.md)** — **ecommerce skills, AI tooling &
  libraries** for the [`lastone`](https://github.com/myatgthu/lastone) automated-store
  build: official Shopify AI tooling, community skill repos (verified), Klaviyo MCP,
  POD tooling, premium-storefront frontend stack, and the gap analysis.
- **[HOUSING-FINANCE-RESEARCH.md](./HOUSING-FINANCE-RESEARCH.md)** — libraries, tools,
  data sources, and skills for **researching apartment hunting, loans, and financing**.
- **[MOBILE-APP-STACK.md](./MOBILE-APP-STACK.md)** contains **React Native skills adopted
  from the Vercel libraries** for the planned iOS and Android app build: nine skills,
  vendored under `skills/`, each verified against its source repo.

## Skills (`skills/`)

Two kinds live side by side: **adopted** skills vendored from external repos per the
expansion policy (currently the nine Vercel skills listed in MOBILE-APP-STACK.md), and
**custom** skills built from an August 2026 ecosystem survey that confirmed no existing
skill covers the solo POD-founder persona end to end:

| Skill | Fills the gap |
|---|---|
| [`shopify-store-builder`](./skills/shopify-store-builder/SKILL.md) | Brand idea → live premium store, one sequenced run |
| [`pod-product-factory`](./skills/pod-product-factory/SKILL.md) | Design → IP screen → margin math → mockups → listing → sync |
| [`premium-store-design`](./skills/premium-store-design/SKILL.md) | Brand design system → Liquid theme implementation |
| [`ecommerce-email-flows`](./skills/ecommerce-email-flows/SKILL.md) | POD-aware Klaviyo lifecycle flows, authored + deployed |
| [`pod-ip-screening`](./skills/pod-ip-screening/SKILL.md) | Trademark/copyright/policy hard gate before printing |
| [`ecommerce-margin-watch`](./skills/ecommerce-margin-watch/SKILL.md) | Live true-CAC and margin reconciliation, weekly ritual |
| [`weather-merchandising`](./skills/weather-merchandising/SKILL.md) | State-based weather storefront: cached weather, product tagging, dynamic ranking |

Expansion policy: never rely only on existing/built-in skills — keep surveying the
ecosystem and expanding this repo. Re-survey at each build phase of `lastone`.

URL verification is explicit, not assumed: entries marked ✅ in ECOMMERCE-STACK were
fetched and confirmed to resolve; unmarked entries came from search and should be verified
before you rely on them.
