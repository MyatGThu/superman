/* Award Audit engine - checks roster/pay data against Fair Work modern award
 * minimums. Detection tool only: it flags likely underpayments, it is not
 * payroll software and not legal advice.
 *
 * Supported awards (adult rates, 2026-27, effective first full pay period on
 * or after 1 July 2026):
 *   higa - Hospitality Industry (General) Award MA000009, levels 1-6
 *   gria - General Retail Industry Award MA000004, levels 1-8
 *
 * Rate provenance: entries marked verified were confirmed against published
 * 2026-27 pay-guide figures. Entries marked unverified are derived from the
 * 2025-26 rates + the 4.75% Annual Wage Review increase and MUST be checked
 * against the official Fair Work pay guide PDF before customer use:
 *   https://www.fairwork.gov.au/pay-and-wages/minimum-wages/pay-guides
 */

const RATES = {
  higa: {
    name: "Hospitality Industry (General) Award [MA000009]",
    base: { // adult ordinary hourly rate, full-time/part-time
      1: { rate: 26.44, verified: true },
      2: { rate: 27.08, verified: true },  // casual $33.85 published / 1.25
      3: { rate: 27.97, verified: true },
      4: { rate: 29.45, verified: true },  // casual $36.81 published / 1.25
      5: { rate: 31.30, verified: true },  // casual $39.13 published / 1.25
      6: { rate: 32.13, verified: true },  // casual $40.16 published / 1.25
    },
    casualLoading: 0.25,
    // multiplier applies to base; flat is $/hr added on weekday segments only
    // (weekend/PH percentages replace, not stack with, evening/night loadings)
    bands: {
      weekday:  { perm: 1.00, casual: 1.25 },
      evening:  { perm: 1.00, casual: 1.25, flat: 2.81 }, // Mon-Fri 7pm-midnight
      night:    { perm: 1.00, casual: 1.25, flat: 4.22 }, // Mon-Fri midnight-7am
      saturday: { perm: 1.25, casual: 1.50 },
      sunday:   { perm: 1.50, casual: 1.75 },
      publicHoliday: { perm: 2.25, casual: 2.50 },
    },
    eveningStart: 19, nightEnd: 7,
    minEngagementHours: { casual: 2, part_time: 0 },
    maxOrdinaryDailyHours: 11.5,
  },
  gria: {
    name: "General Retail Industry Award [MA000004]",
    base: {
      1: { rate: 27.81, verified: true },
      2: { rate: 28.46, verified: false }, // 2025-26 $27.17 + 4.75%
      3: { rate: 28.90, verified: false }, // 2025-26 $27.59 + 4.75%
      4: { rate: 29.45, verified: true },  // casual $36.81 published / 1.25
      5: { rate: 30.68, verified: false }, // 2025-26 $29.29 + 4.75%
      6: { rate: 31.12, verified: false }, // 2025-26 $29.71 + 4.75%
      7: { rate: 32.69, verified: false }, // 2025-26 $31.21 + 4.75%
      8: { rate: 34.01, verified: false }, // 2025-26 $32.47 + 4.75%
    },
    casualLoading: 0.25,
    bands: {
      weekday:  { perm: 1.00, casual: 1.25 },
      evening:  { perm: 1.25, casual: 1.50 }, // Mon-Fri after 6pm
      saturday: { perm: 1.25, casual: 1.50 },
      sunday:   { perm: 1.50, casual: 1.75 },
      publicHoliday: { perm: 2.25, casual: 2.50 },
    },
    eveningStart: 18,
    ordinarySpanStart: 7, // work before 7am flagged for review (outside span)
    minEngagementHours: { casual: 3, part_time: 3 },
    maxOrdinaryDailyHours: 11,
  },
};

// Victorian public holidays 2026. Grand Final Friday (25 Sep) is tentative
// until gazetted - confirm before relying on it. Overridable in the UI.
const VIC_PUBLIC_HOLIDAYS_2026 = [
  "2026-01-01", "2026-01-26", "2026-03-09", "2026-04-03", "2026-04-04",
  "2026-04-05", "2026-04-06", "2026-04-25", "2026-06-08", "2026-09-25",
  "2026-11-03", "2026-12-25", "2026-12-26", "2026-12-28",
];

const RATES_VERSION = "2026-27 (effective 1 July 2026, AWR +4.75%)";

// --- CSV ---------------------------------------------------------------------

function parseCSV(text) {
  // RFC4180-ish: quoted fields, escaped quotes, CRLF. No embedded newlines.
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { fields.push(cur); cur = ""; }
      else cur += ch;
    }
    fields.push(cur);
    rows.push(fields.map(f => f.trim()));
  }
  const header = rows.shift().map(h => h.toLowerCase().replace(/\s+/g, "_"));
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

// --- shift maths -------------------------------------------------------------

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return (+m[1]) * 60 + (+m[2]);
}

function dayType(dateStr, holidays) {
  if (holidays.includes(dateStr)) return "publicHoliday";
  const dow = new Date(dateStr + "T12:00:00").getDay();
  return dow === 6 ? "saturday" : dow === 0 ? "sunday" : "weekday";
}

function nextDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function bandFor(award, dtype, hour) {
  if (dtype !== "weekday") return dtype;
  if (award === "higa") {
    if (hour < RATES.higa.nightEnd) return "night";
    if (hour >= RATES.higa.eveningStart) return "evening";
    return "weekday";
  }
  // gria: before-7am handled as a review flag, not a rate band
  return hour >= RATES.gria.eveningStart ? "evening" : "weekday";
}

/* Split a shift into (band, minutes) segments. Overnight shifts roll into the
 * next calendar day (whose day-type may differ). Unpaid break minutes are
 * deducted from the cheapest band first - conservative: the audit never
 * overstates an underpayment because of break placement. */
function shiftSegments(award, dateStr, startMin, endMin, breakMin, holidays) {
  const segs = {}; // band -> minutes
  let flags = [];
  const spans = endMin > startMin
    ? [[dateStr, startMin, endMin]]
    : [[dateStr, startMin, 1440], [nextDate(dateStr), 0, endMin]];
  for (const [d, s, e] of spans) {
    const dtype = dayType(d, holidays);
    for (let t = s; t < e; t += 1) {
      const band = bandFor(award, dtype, Math.floor(t / 60));
      segs[band] = (segs[band] || 0) + 1;
      if (award === "gria" && dtype === "weekday" &&
          Math.floor(t / 60) < RATES.gria.ordinarySpanStart) {
        flags.push("before-7am");
      }
    }
  }
  if (flags.length) flags = ["Work before 7am is outside the GRIA ordinary span - check overtime rules"];
  // deduct break from cheapest band(s)
  let remaining = breakMin;
  const cheapest = Object.keys(segs).sort((a, b) => {
    const A = RATES[award].bands[a], B = RATES[award].bands[b];
    return (A.perm + (A.flat || 0) / 30) - (B.perm + (B.flat || 0) / 30);
  });
  for (const band of cheapest) {
    if (remaining <= 0) break;
    const take = Math.min(segs[band], remaining);
    segs[band] -= take;
    remaining -= take;
  }
  return { segs, flags };
}

function requiredPayForShift(row, holidays) {
  const award = RATES[row.award];
  const level = award.base[+row.level];
  const isCasual = row.employment === "casual";
  const startMin = toMinutes(row.start), endMin = toMinutes(row.end);
  const breakMin = +(row.break_minutes || 0);
  const { segs, flags } = shiftSegments(
    row.award, row.date, startMin, endMin, breakMin, holidays);
  let required = 0;
  const parts = [];
  for (const [band, mins] of Object.entries(segs)) {
    if (!mins) continue;
    const b = award.bands[band];
    const mult = isCasual ? b.casual : b.perm;
    const rate = level.rate * mult + (b.flat || 0);
    required += (mins / 60) * rate;
    parts.push(`${(mins / 60).toFixed(2)}h ${band} @ $${rate.toFixed(2)}`);
  }
  const paidHours = (endMin > startMin ? endMin - startMin
                     : 1440 - startMin + endMin) / 60 - breakMin / 60;
  // minimum engagement check
  const minEng = award.minEngagementHours[row.employment] || 0;
  if (minEng && paidHours < minEng) {
    flags.push(`Shift is ${paidHours.toFixed(2)}h - below the ${minEng}h minimum engagement for ${row.employment.replace("_", "-")} staff`);
  }
  if (paidHours > award.maxOrdinaryDailyHours) {
    flags.push(`Shift exceeds ${award.maxOrdinaryDailyHours}h of ordinary hours - overtime rates likely apply (not computed by this tool)`);
  }
  return { required, paidHours, parts, flags, unverifiedRate: !level.verified };
}

// --- audit -------------------------------------------------------------------

function auditRoster(rows, opts = {}) {
  const holidays = opts.publicHolidays || VIC_PUBLIC_HOLIDAYS_2026;
  const findings = [], skipped = [];
  const weeklyHours = {}; // employee|isoWeek -> hours

  rows.forEach((row, i) => {
    const n = i + 2; // header is line 1
    row.award = (row.award || "").toLowerCase();
    row.employment = (row.employment || "").toLowerCase();
    if (!RATES[row.award]) return skipped.push({ line: n, reason: `unknown award "${row.award}"` });
    if (!RATES[row.award].base[+row.level]) return skipped.push({ line: n, reason: `unsupported level "${row.level}" for ${row.award}` });
    if (!["full_time", "part_time", "casual"].includes(row.employment)) return skipped.push({ line: n, reason: `unknown employment type "${row.employment}"` });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || toMinutes(row.start) === null || toMinutes(row.end) === null) return skipped.push({ line: n, reason: "bad date/time format (need YYYY-MM-DD and HH:MM)" });

    const { required, paidHours, parts, flags, unverifiedRate } =
      requiredPayForShift(row, holidays);
    const paid = row.paid_amount !== undefined && row.paid_amount !== ""
      ? +row.paid_amount
      : row.paid_rate !== undefined && row.paid_rate !== ""
        ? +row.paid_rate * paidHours
        : NaN;
    if (Number.isNaN(paid)) return skipped.push({ line: n, reason: "need paid_amount or paid_rate column" });

    const gap = required - paid;
    const wk = weekKey(row.date);
    const wkId = `${row.employee}|${wk}`;
    weeklyHours[wkId] = (weeklyHours[wkId] || 0) + paidHours;

    findings.push({
      line: n, employee: row.employee, award: row.award, level: +row.level,
      employment: row.employment, date: row.date, start: row.start, end: row.end,
      paidHours, required: round2(required), paid: round2(paid),
      gap: round2(gap), breakdown: parts, flags, unverifiedRate,
      status: gap > 0.01 ? "underpaid" : flags.length ? "review" : "ok",
    });
  });

  for (const f of findings) {
    const wkId = `${f.employee}|${weekKey(f.date)}`;
    if (weeklyHours[wkId] > 38 && !f._wkFlagged) {
      findings.filter(x => `${x.employee}|${weekKey(x.date)}` === wkId)
        .forEach(x => { x._wkFlagged = true; });
      f.flags.push(`${f.employee} worked ${weeklyHours[wkId].toFixed(1)}h in week of ${weekKey(f.date)} - over 38h, overtime rates likely apply (not computed)`);
      if (f.status === "ok") f.status = "review";
    }
  }

  const underpaid = findings.filter(f => f.status === "underpaid");
  return {
    findings, skipped,
    totalGap: round2(underpaid.reduce((s, f) => s + f.gap, 0)),
    shiftsFlagged: underpaid.length,
    employeesAffected: [...new Set(underpaid.map(f => f.employee))],
    usedUnverifiedRates: findings.some(f => f.unverifiedRate),
    ratesVersion: RATES_VERSION,
  };
}

function weekKey(dateStr) {
  // Monday of the week, as YYYY-MM-DD
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function round2(x) { return Math.round(x * 100) / 100; }

const api = { RATES, RATES_VERSION, VIC_PUBLIC_HOLIDAYS_2026, parseCSV,
              shiftSegments, requiredPayForShift, auditRoster, weekKey };
if (typeof module !== "undefined") module.exports = api;
if (typeof window !== "undefined") window.AwardAudit = api;
