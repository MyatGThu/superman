# Award Audit

Fair Work underpayment checker for Australian small businesses.
Drop in a roster CSV, get a flag report against modern award minimums —
entirely in the browser, no server, **no payroll data ever leaves the machine**.

Open `index.html`, click "Try the sample roster". That's the demo.

## Why it sells

Since 1 January 2025, intentional underpayment is a **criminal offence**
(up to 10 years' jail / $8.25M fines). Small businesses that follow the
Voluntary Small Business Wage Compliance Code — which centres on checking
pay against the award and keeping records of doing so — are shielded from
prosecution. This tool is that check, plus the dated evidence pack.

Primary channel: **bookkeepers and BAS agents**, who each run payroll for
dozens of hospitality/retail clients. One subscription covers their whole
client list; every "flat $30/hr for everyone" payroll is a finding.

## Scope (v1)

| Covered | Not covered (flagged for review instead) |
|---|---|
| Hospitality Award MA000009, adult levels 1–6 | junior / apprentice / intro rates |
| General Retail Award MA000004, adult levels 1–8 | allowances (split shift, laundry, meals) |
| Casual loading, evening/night, Sat/Sun/public-holiday penalties | overtime *amounts* (over-38h weeks and long shifts are flagged) |
| Overnight shifts, unpaid breaks, min-engagement checks | enterprise agreements, annualised salaries |

Rates version: **2026-27** (effective first full pay period on or after
1 July 2026, Annual Wage Review +4.75%). Victorian 2026 public holidays
preloaded and editable in the UI.

## CSV format

```
employee,award,level,employment,date,start,end,break_minutes,paid_rate
"Chen, Mia",higa,3,full_time,2026-07-07,16:00,23:00,0,29.00
```

`award`: `higa` or `gria` · `employment`: `full_time`/`part_time`/`casual` ·
`paid_rate` (hourly) or `paid_amount` (gross for the shift). Overnight shifts
(end before start) roll into the next day automatically.

## Rate verification — DO THIS BEFORE CUSTOMER USE

Every rate in `engine.js` carries a `verified` flag. Entries marked
`verified: false` (GRIA levels 2, 3, 5, 6, 7, 8) were derived from the
2025-26 rates plus the 4.75% increase and must be confirmed against the
official pay guides (the report warns whenever findings rest on them):

- [Fair Work pay guides](https://www.fairwork.gov.au/pay-and-wages/minimum-wages/pay-guides) — HIGA MA000009 and GRIA MA000004 PDFs
- Long term, replace the static table with the [FWC Modern Awards Pay Database API](https://developer.fwc.gov.au/) (registration required)

## Verify the engine

```
node test_engine.js   # hand-computed pay checks: penalties, overnight, breaks, PH
```

## Disclaimer

Detection tool, not payroll software, not legal advice. Findings are
indicators for review with a qualified adviser.

## Roadmap (add when a customer asks)

- FWC MAPD API integration (live rates, more awards)
- Payroll-export import presets (Xero, MYOB, Employment Hero)
- Junior rates and allowances
- Restaurant (MA000119) and Fast Food (MA000003) awards
