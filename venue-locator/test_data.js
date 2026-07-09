#!/usr/bin/env node
/* Self-check for the venue locator dataset. Run: node test_data.js
 * Includes a schema guard: fails loudly if a rate/roster/review field
 * is ever added, since that's an explicit scope boundary, not an
 * accident to catch after the fact. */
const { CBD_ORIGIN, VENUES, bySuburb } = require("./data.js");

const ok = (c, m) => { if (!c) throw new Error(m); };

const FORBIDDEN_KEYS = ["rate", "price", "cost", "roster", "schedule",
  "availability", "review", "rating", "score", "hours"];

ok(VENUES.length >= 8, "enough venues to be a useful map");
for (const v of VENUES) {
  ok(v.id && v.name && v.street && v.suburb, `${v.id}: identity + address fields present`);
  ok(typeof v.distanceKm === "number" && v.distanceKm > 0, `${v.id}: positive distance`);
  ok(v.map && v.map.x >= 0 && v.map.x <= 100 && v.map.y >= 0 && v.map.y <= 100,
     `${v.id}: map coords in range`);
  const keys = Object.keys(v).map(k => k.toLowerCase());
  for (const bad of FORBIDDEN_KEYS)
    ok(!keys.some(k => k.includes(bad)), `${v.id}: schema must not carry a "${bad}" field`);
}

// CBD origin is a fixed point, not viewer-derived - no lat/lng from a browser API
ok(CBD_ORIGIN.label && CBD_ORIGIN.x === 50 && CBD_ORIGIN.y === 50,
   "CBD origin is the fixed map center");

// distances actually radiate outward - furthest entries read as outer suburbs
const sorted = [...VENUES].sort((a, b) => a.distanceKm - b.distanceKm);
ok(sorted[0].distanceKm < 2, "closest venue is inside/near the CBD");
ok(sorted[sorted.length - 1].distanceKm > 20, "furthest venue is well out in the suburbs");

const groups = bySuburb(VENUES);
ok(Object.keys(groups).length >= 6, "spans multiple suburbs");

console.log("all checks passed");
