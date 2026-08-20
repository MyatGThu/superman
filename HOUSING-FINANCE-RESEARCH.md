# Housing & Finance Research — Catalog

Libraries, tools, data sources, and skills for **researching apartment hunting, loans,
and financing** — each with its verified GitHub repository (where one exists) and a
related Claude Agent Skill.

**Last updated:** 2026-08-20 · **Items:** 32 · All GitHub URLs verified to resolve.

> Financial-math and budgeting tools here are **region-agnostic**; the **data sources
> lean US** (Census / HUD / FRED / CFPB). Ask to swap in another country's data sources.

## Categories
- [Apartment & Housing Search / Data](#apartment--housing-search--data)
- [Loans, Mortgage & Financial Math](#loans-mortgage--financial-math)
- [Personal Finance, Budgeting & Money Management](#personal-finance-budgeting--money-management)
- [Research Skills, Claude Skills & Authoritative Data](#research-skills-claude-skills--authoritative-data)

---

## Apartment & Housing Search / Data

| Tool | GitHub | Kind | Claude skill | Helps you… |
|---|---|---|---|---|
| HomeHarvest | https://github.com/ZacharyHampton/HomeHarvest | library | xlsx | Scrape Zillow/Redfin/Realtor for-sale & rental listings into a table for comps. |
| uszipcode | https://github.com/MacHu-GWU/uszipcode-project | data-source | xlsx | Query US ZIP data (population, median income, home value, rent) to compare areas offline. |
| geopy | https://github.com/geopy/geopy | library | — | Geocode addresses and compute distances to estimate commute/amenity proximity. |
| OSMnx | https://github.com/gboeing/osmnx | library | — | Pull street networks & nearby amenities to quantify walkability and transit access. |
| census (DataMade) | https://github.com/datamade/census | library | xlsx | Query the US Census API for income, rent-burden, and housing-stock data by area. |
| censusdis | https://github.com/censusdis/censusdis | library | xlsx | Discover, load, and map US Census data for neighborhood & affordability research. |
| pandas-datareader | https://github.com/pydata/pandas-datareader | library | xlsx | Pull FRED/economic series (mortgage rates, price & rent indexes) into pandas. |
| hudpy | https://github.com/etam4260/hudpy | library | xlsx | Query HUD APIs (Fair Market Rents, Income Limits, ZIP crosswalks) for affordability. |

## Loans, Mortgage & Financial Math

| Tool | GitHub | Kind | Claude skill | Helps you… |
|---|---|---|---|---|
| numpy-financial | https://github.com/numpy/numpy-financial | library | xlsx | Compute loan payments, interest splits, and time-value-of-money (pmt, ipmt, irr, npv). |
| FinancePy | https://github.com/domokane/FinancePy | library | xlsx | Model mortgage cash flows, discounting, and bond/loan valuation. |
| QuantLib | https://github.com/lballabio/QuantLib | library | xlsx | Rigorous interest, day-count, and amortizing-loan cash-flow modeling (C++/Python). |
| mortgage | https://github.com/jbmohler/mortgage | library | xlsx | Compute monthly payment, total interest, APR, and full amortization schedules. |
| amortization | https://github.com/roniemartinez/amortization | library | xlsx | Generate full payment/interest breakdown schedules (library or CLI). |
| Formula.js | https://github.com/formulajs/formulajs | library | xlsx | Excel financial functions (PMT, IPMT, RATE, NPER, NPV, IRR) in JS for calculators. |
| finance.js | https://github.com/ebradyjobory/finance.js | library | xlsx | Common finance calcs (compound interest, PV/FV, amortization, IRR, NPV) in JS. |
| Dinero.js | https://github.com/dinerojs/dinero.js | library | — | Handle money with integer precision — no float errors when summing payments. |
| LoanJS | https://github.com/kfiku/LoanJS | library | xlsx | Generate loan installment schedules (equal/decreasing) with principal/interest split. |

## Personal Finance, Budgeting & Money Management

| Tool | GitHub | Kind | Claude skill | Helps you… |
|---|---|---|---|---|
| Firefly III | https://github.com/firefly-iii/firefly-iii | app | xlsx | Self-hosted budgeting; test whether a rent/loan payment fits your cashflow. |
| Actual Budget | https://github.com/actualbudget/actual | app | xlsx | Local-first envelope budgeting to confirm income covers rent/loan. |
| Maybe | https://github.com/maybe-finance/maybe | app | xlsx | Aggregate accounts & net worth to gauge affordability before a lease/loan. |
| Ghostfolio | https://github.com/ghostfolio/ghostfolio | app | xlsx | Track wealth/liquidity available toward a deposit or down payment. |
| GnuCash | https://github.com/Gnucash/gnucash | app | xlsx | Double-entry accounting with a built-in loan/mortgage amortization calculator. |
| beancount | https://github.com/beancount/beancount | library | xlsx | Plain-text accounting to model income, expenses, and savings runway. |
| ledger | https://github.com/ledger/ledger | library | xlsx | CLI double-entry accounting; run cashflow reports for what you can sustain. |
| hledger | https://github.com/simonmichael/hledger | app | xlsx | Plain-text accounting (CLI/TUI/web) to forecast rent/loan affordability. |

## Research Skills, Claude Skills & Authoritative Data

| Item | GitHub | Kind | Claude skill | Helps you… |
|---|---|---|---|---|
| anthropics/skills | https://github.com/anthropics/skills | skill | — | Official Anthropic Agent Skills (xlsx, pdf, docx…) Claude loads for this research. |
| `xlsx` (Claude skill) | — | skill | xlsx | Build mortgage amortization, affordability, and rent-vs-buy financial models. |
| `pdf` (Claude skill) | — | skill | pdf | Read/extract terms from leases, loan estimates, and closing-disclosure PDFs. |
| `docx` (Claude skill) | — | skill | docx | Draft/parse rental applications, offer letters, and loan paperwork. |
| fredapi | https://github.com/mortada/fredapi | library | xlsx | Pull FRED data (30-yr mortgage rates, CPI rent, home-price series) for financing research. |
| cenpy | https://github.com/cenpy-devs/cenpy | library | — | Discover & download US Census/ACS housing-cost and demographic tables. |
| cfpb/hmda-platform | https://github.com/cfpb/hmda-platform | data-source | — | CFPB HMDA platform/API: authoritative loan-level mortgage data (rates, approvals, denials). |

---

### How these fit together
- **Find & compare places** → HomeHarvest + geopy/OSMnx + Census/HUD data.
- **Judge affordability** → a budgeting app (Firefly III / Actual) to see what payment fits.
- **Model the loan** → numpy-financial / mortgage / amortization for payments & schedules.
- **Ground it in real rates** → FRED (via fredapi / pandas-datareader) and CFPB HMDA.
- **Let Claude do the paperwork** → `xlsx` (models), `pdf` (read the lease/loan docs), `docx` (draft applications).

> The `Claude skill` column names an Agent Skill relevant to that tool; “—” means none maps directly.
> Skills marked `— GitHub` live inside [anthropics/skills](https://github.com/anthropics/skills).
