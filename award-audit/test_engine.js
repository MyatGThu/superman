#!/usr/bin/env node
/* Self-check for the Award Audit engine. Every expected dollar figure below is
 * hand-computed from the rate tables, independently of the engine.
 * Run: node test_engine.js */

const { parseCSV, auditRoster, requiredPayForShift, weekKey } = require("./engine.js");

const eq = (a, b, msg) => {
  if (Math.abs(a - b) > 0.005) throw new Error(`${msg}: got ${a}, want ${b}`);
};
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };

const H = []; // default VIC holidays used unless overridden

// 1. HIGA L1 casual, Saturday 10:00-16:00, flat $28/hr paid.
//    6h x 26.44 x 1.50 = 237.96 required; paid 168.00; gap 69.96
let r = requiredPayForShift({ award: "higa", level: 1, employment: "casual",
  date: "2026-07-11", start: "10:00", end: "16:00", break_minutes: 0 }, H);
eq(r.required, 237.96, "HIGA casual Saturday");

// 2. HIGA L3 full-time, Tuesday 16:00-23:00.
//    3h x 27.97 + 4h x (27.97 + 2.81 evening flat) = 83.91 + 123.12 = 207.03
r = requiredPayForShift({ award: "higa", level: 3, employment: "full_time",
  date: "2026-07-07", start: "16:00", end: "23:00", break_minutes: 0 }, H);
eq(r.required, 207.03, "HIGA FT weekday evening");

// 3. Overnight: HIGA L1 casual, Friday 21:00 - Saturday 02:00.
//    Fri 21-24: 3h x (26.44x1.25 + 2.81) = 107.58
//    Sat 00-02: 2h x (26.44x1.50)        =  79.32   => 186.90
r = requiredPayForShift({ award: "higa", level: 1, employment: "casual",
  date: "2026-07-10", start: "21:00", end: "02:00", break_minutes: 0 }, H);
eq(r.required, 186.90, "HIGA overnight Fri->Sat");

// 4. GRIA L1 casual, Thursday 15:00-21:00.
//    3h x (27.81x1.25) + 3h x (27.81x1.50) = 104.2875 + 125.145 = 229.4325
r = requiredPayForShift({ award: "gria", level: 1, employment: "casual",
  date: "2026-07-09", start: "15:00", end: "21:00", break_minutes: 0 }, H);
eq(r.required, 229.4325, "GRIA casual evening");

// 5. Public holiday: GRIA L4 full-time, Melbourne Cup day, 9:00-17:00, 30m break.
//    7.5h x 29.45 x 2.25 = 496.96875
r = requiredPayForShift({ award: "gria", level: 4, employment: "full_time",
  date: "2026-11-03", start: "09:00", end: "17:00", break_minutes: 30 },
  ["2026-11-03"]);
eq(r.required, 496.96875, "GRIA public holiday with break");
ok(!r.unverifiedRate, "GRIA L4 is a verified rate");

// 6. Break comes off the cheapest band: HIGA FT Tue 16:00-23:00 with 60m break.
//    Break eats the 100% band: 2h x 27.97 + 4h x 30.78 = 55.94 + 123.12 = 179.06
r = requiredPayForShift({ award: "higa", level: 3, employment: "full_time",
  date: "2026-07-07", start: "16:00", end: "23:00", break_minutes: 60 }, H);
eq(r.required, 179.06, "break deducted from cheapest band");

// 7. Minimum engagement: GRIA casual 2h shift flags (3h minimum).
r = requiredPayForShift({ award: "gria", level: 1, employment: "casual",
  date: "2026-07-09", start: "10:00", end: "12:00", break_minutes: 0 }, H);
ok(r.flags.some(f => f.includes("minimum engagement")), "min engagement flag");

// 8. Unverified rate is reported: GRIA L2.
r = requiredPayForShift({ award: "gria", level: 2, employment: "casual",
  date: "2026-07-09", start: "10:00", end: "14:00", break_minutes: 0 }, H);
ok(r.unverifiedRate, "GRIA L2 flagged unverified");

// 9. End-to-end audit over CSV, including quoted field and a skipped row.
const csv = `employee,award,level,employment,date,start,end,break_minutes,paid_rate
"Nguyen, Josh",higa,1,casual,2026-07-11,10:00,16:00,0,28
Mia,higa,3,full_time,2026-07-07,16:00,23:00,0,29.58
Bad,unknown_award,1,casual,2026-07-11,10:00,16:00,0,28`;
const res = auditRoster(parseCSV(csv));
ok(res.findings.length === 2 && res.skipped.length === 1, "rows parsed/skipped");
ok(res.findings[0].employee === "Nguyen, Josh", "quoted CSV field");
eq(res.findings[0].gap, 69.96, "audit gap Saturday casual");
// Mia paid 29.58/hr x 7h = 207.06 >= 207.03 required -> ok
ok(res.findings[1].status === "ok", "compliant shift passes");
eq(res.totalGap, 69.96, "total gap sums underpaid only");

// 10. Weekly overtime flag: 5 x 9h = 45h in one week.
const otRows = [];
for (const d of ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10"])
  otRows.push({ employee: "Sam", award: "gria", level: 1, employment: "full_time",
    date: d, start: "08:00", end: "17:00", break_minutes: 0, paid_rate: "50" });
const ot = auditRoster(otRows);
ok(ot.findings.some(f => f.flags.some(fl => fl.includes("over 38h"))), "38h week flag");

// 11. weekKey: any day maps to its Monday.
ok(weekKey("2026-07-09") === "2026-07-06", "weekKey Thursday -> Monday");
ok(weekKey("2026-07-12") === "2026-07-06", "weekKey Sunday -> same Monday");

console.log("all checks passed");
