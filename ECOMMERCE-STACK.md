# Ecommerce Stack — Skills, Libraries & Tools Catalog

Curated for the `lastone` build: a solo-founder, no-inventory, automation-first Shopify
POD brand. **Last updated:** 2026-08-24 · URLs marked ✅ were fetched and verified;
unmarked entries were found via search and should be verified before deep reliance.

Companion to [LIBRARIES.md](./LIBRARIES.md) (general web libraries). Custom skills built
for this business live in [`skills/`](./skills/).

## Categories
- [Official Shopify AI tooling](#official-shopify-ai-tooling)
- [Shopify skills (community)](#shopify-skills-community)
- [Ecommerce operations skills](#ecommerce-operations-skills)
- [Marketing, SEO & brand skills](#marketing-seo--brand-skills)
- [Email / Klaviyo](#email--klaviyo)
- [Print-on-demand tooling](#print-on-demand-tooling)
- [Premium storefront frontend libraries](#premium-storefront-frontend-libraries)
- [WooCommerce (tracked, not used)](#woocommerce-tracked-not-used)
- [Gap analysis → custom skills built here](#gap-analysis--custom-skills-built-here)

---

## Official Shopify AI tooling

| Tool | URL | What it does |
|---|---|---|
| Shopify agent-skills ✅ | https://github.com/Shopify/agent-skills | Official. 15 developer skills: `shopify-admin`, `shopify-storefront-graphql`, `shopify-liquid`, `shopify-hydrogen`, `shopify-functions`, `shopify-custom-data`, Polaris extension skills, etc. Install via `npx skill`. |
| Shopify AI Toolkit ✅ | https://github.com/Shopify/Shopify-AI-Toolkit | Official, MIT. Dev MCP server + scripts for docs search, GraphQL/Liquid validation, CLI store execution. `claude plugin install shopify-ai-toolkit@claude-plugins-official`. Telemetry on by default (env-var opt-out). |
| Dev MCP / AI toolkit docs ✅ | https://shopify.dev/docs/apps/build/ai-toolkit | Connects coding agents to Shopify docs, API schemas, validation. Docs-only mode needs no store auth. |
| Storefront MCP | https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront | Every store exposes a hosted `/api/mcp` endpoint: catalog search, carts, policy Q&A. Paired with Customer Account MCP + Checkout MCP + UCP (Google partnership, Jan 2026). |
| shop-chat-agent | https://github.com/Shopify/shop-chat-agent | Official reference app: MCP-powered on-storefront AI chat widget. |
| Sidekick | (in Shopify admin) | First-party admin AI: drafts theme sections, segments, Flow automations; voice on mobile. Not portable as a skill — admin-locked. |

## Shopify skills (community)

| Repo | URL | What it does |
|---|---|---|
| baslefeber/shopify-skills ✅ | https://github.com/baslefeber/shopify-skills | 8 senior-dev-judgment skills: theme best practices, CRO audit, performance audit, SEO structured data, a11y audit, metafields architect, section builder, Liquid AI review. |
| kgelster/awesome-ecom-skills ✅ | https://github.com/kgelster/awesome-ecom-skills | 9 agency-playbook skills: catalog audit, taxonomy, SEO metadata backfill, alt-text, Matrixify bulk ops, redirects, JSON-LD. "Preview-before-mutate" safety model. |
| domocarroll/shopify-builds ✅ | https://github.com/domocarroll/shopify-builds | 12 skills + 6 agents for theme/Hydrogen/app dev. v0.1, unproven; explicitly excludes product creation + copywriting. |

## Ecommerce operations skills

| Repo | URL | What it does |
|---|---|---|
| mardab96/ecommerce-claude-skills ✅ | https://github.com/mardab96/ecommerce-claude-skills | 20 operator-decision skills: checkout friction, ad-waste triage, contribution margin, LTV/cohorts, churn, launch readiness. Diagnostic, not build/execute. |
| finsilabs/awesome-ecommerce-skills ✅ | https://github.com/finsilabs/awesome-ecommerce-skills | Broadest index found: 178 skills / 17 categories across Shopify, WooCommerce, BigCommerce, Magento, SFCC. Unopinionated catalog. |
| takechanman1228/claude-ecom | https://github.com/takechanman1228/claude-ecom | Order/sales CSVs → KPI-decomposition business reviews. |
| noique/cross-border-ecommerce-skills | https://github.com/noique/cross-border-ecommerce-skills | Product selection, market research, sourcing IP risk, listing copy for cross-border/dropship. |

## Marketing, SEO & brand skills

| Repo | URL | What it does |
|---|---|---|
| thatrebeccarae/claude-marketing ✅ | https://github.com/thatrebeccarae/claude-marketing | 56 skills / 6 packs incl. a DTC Pack (Klaviyo, Shopify, GA4, Looker). The most directly relevant "marketing department" collection found. |
| AgriciDaniel/claude-seo ✅ | https://github.com/AgriciDaniel/claude-seo | 25 sub-skills / 18 agents: technical SEO, E-E-A-T, Schema.org, GEO/AEO, **ecommerce SEO** (product schema incl. `hasMerchantReturnPolicy`, `shippingDetails`), hreflang. |
| cofoundy/brand-skills ✅ | https://github.com/cofoundy/brand-skills | 15 brand-lifecycle skills (naming → strategy → voice → guidelines → audit) producing a reusable `brand.yaml`. Use for Phase 0 brand creation. |
| inhouseseo/superseo-skills | https://github.com/inhouseseo/superseo-skills | 11 agency-tested SEO skills (audits, links, E-E-A-T, semantic gaps). |
| AgriciDaniel/claude-blog | https://github.com/AgriciDaniel/claude-blog | 30 sub-skills, 5-gate content pipeline for Google + AI-citation optimization. |
| adkit/ads-skills | https://github.com/adkit/ads-skills | Per-platform (Google/Meta/TikTok) ads skills: structure, targeting, creative, budget. |
| AgriciDaniel/claude-ads | https://github.com/AgriciDaniel/claude-ads | 12-platform paid-media audits with deterministic scoring. |
| zubair-trabzada/ai-ads-claude | https://github.com/zubair-trabzada/ai-ads-claude | Ad copy generation across 5 platforms, 15 skills / 5 agents. |
| travisvn/awesome-claude-skills ✅ | https://github.com/travisvn/awesome-claude-skills | General skills index — confirmed zero ecommerce entries (evidence for the gap analysis below). |
| anthropics/skills ✅ | https://github.com/anthropics/skills | Official Anthropic skills — docs/design/dev only; zero ecommerce coverage today. |

## Email / Klaviyo

| Tool | URL | What it does |
|---|---|---|
| Klaviyo MCP server ✅ | https://developers.klaviyo.com/en/docs/klaviyo_mcp_server | First-party, 200+ tools: campaigns, flows, segments, catalog, analytics, coupons, webhooks. Remote connector `mcp.klaviyo.com/mcp` or local via `uvx`. **The execution layer our `ecommerce-email-flows` skill drives.** |
| CosmoBlk/email-marketing-bible | https://github.com/CosmoBlk/email-marketing-bible | 55K-word reference skill for welcome/cart/post-purchase/win-back flows. |
| AgriciDaniel/claude-email | https://github.com/AgriciDaniel/claude-email | Composition, deliverability audit, automation sequences. |

## Print-on-demand tooling

| Tool | URL | What it does |
|---|---|---|
| Purple-Horizons/printful-mcp ✅ | https://github.com/Purple-Horizons/printful-mcp | Python MCP server, 17 tools over Printful API v2: catalog (300+ items), orders, shipping rates, **mockup generation**, file upload, analytics. The most concrete POD agent tool found. |
| PrintKK skill | via mcpmarket.com listing | Wraps PrintKK.com API. Unverified. |
| Printify / Gelato | — | **No Claude-integrable skill/MCP found for either** (as of Aug 2026) — dashboard-only AI. Integration goes through their REST APIs; a build candidate if Printify becomes primary. |

## Premium storefront frontend libraries

Additions to [LIBRARIES.md](./LIBRARIES.md) scope, specific to premium store builds
(see `lastone/docs/04-design-playbook.md` for usage rules):

| Library | GitHub | Why it's here |
|---|---|---|
| Lenis | https://github.com/darkroomengineering/lenis | De facto standard smooth scroll on premium stores (MIT, active). |
| Swiper | https://github.com/nolimits4web/swiper | Touch-friendly PDP galleries/carousels. |
| GSAP + ScrollTrigger | https://github.com/greensock/GSAP | Subtle section reveals — already in LIBRARIES.md; use per playbook motion rules. |
| View Transitions API | https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API | Baseline since Oct 2025; zero-dependency list→PDP transitions inside Liquid's no-framework constraint. |
| Kiwi Sizing / Sizely | Shopify App Store | Size-chart/fit apps — the highest-leverage "premium" feature for return reduction (~70% of fashion returns are fit). |

## WooCommerce (tracked, not used)

Platform decision went to Shopify (`lastone/docs/02-platform-decision.md`). Tracked for
awareness: `woocommerce/woocommerce-claude` (official analytics plugin),
`woocommerce/agent-skills` (official, extension development), `Automattic/wordpress-agent-skills`,
`WordPress/agent-skills`, `cocart-headless/cocart-skills`. Woo's native MCP (10.3+) is
developer-preview and conversational-only.

---

## Gap analysis → custom skills built here

Survey conclusion (Aug 2026): official + community ecosystems are scoped to Shopify
*developers*, marketing *teams*, or generic diagnostics — never to one person running the
whole POD funnel alone. Confirmed gaps and the custom skills in [`skills/`](./skills/)
that fill them:

| # | Gap (confirmed by survey) | Custom skill |
|---|---|---|
| 1 | End-to-end store builder/launch orchestrator (closest attempt, shopify-builds v0.1, excludes products + copy) | [`skills/shopify-store-builder`](./skills/shopify-store-builder/SKILL.md) |
| 2 | POD product pipeline: design → IP screen → mockup → margin math → listing → sync | [`skills/pod-product-factory`](./skills/pod-product-factory/SKILL.md) |
| 3 | Brand design system → Liquid theme implementation bridge | [`skills/premium-store-design`](./skills/premium-store-design/SKILL.md) |
| 4 | Email flow *builder* (Klaviyo MCP can execute; no skill authors POD-aware flows end-to-end) | [`skills/ecommerce-email-flows`](./skills/ecommerce-email-flows/SKILL.md) |
| 5 | POD trademark/IP + platform-content-policy screening before printing | [`skills/pod-ip-screening`](./skills/pod-ip-screening/SKILL.md) |
| 6 | Live cross-system margin / true-CAC reconciliation | [`skills/ecommerce-margin-watch`](./skills/ecommerce-margin-watch/SKILL.md) |
| — | Ecommerce SEO writing — **NOT built custom**: best-covered area already (claude-seo, superseo, kgelster). Adopt external. | adopt: AgriciDaniel/claude-seo |

Expansion policy (owner's standing instruction): never rely only on existing/built-in
skills — keep surveying the ecosystem (the repos above ship fast) and keep adding to this
catalog and to `skills/`. Re-run the ecosystem survey at each build phase.
