#!/usr/bin/env node
/* Self-check for Peachy data + helpers. Run: node test_data.js */
const { VENUES, QUOTES, DAYS, quoteOfDay, cheapest, money } = require("./data.js");

const ok = (c, m) => { if (!c) throw new Error(m); };

// data integrity - a bad row would render as "undefined" in the UI
ok(VENUES.length >= 8, "enough venues");
for (const v of VENUES) {
  ok(v.id && v.name && v.area && v.emoji, `${v.id}: identity fields`);
  ok(v.coffee > 0 && v.dish.price > 0, `${v.id}: positive prices`);
  ok(v.discount.day >= 0 && v.discount.day <= 6, `${v.id}: valid deal day`);
  ok(v.dish.health >= 1 && v.dish.health <= 5, `${v.id}: health 1-5`);
  ok(v.map.x >= 0 && v.map.x <= 100 && v.map.y >= 0 && v.map.y <= 100,
     `${v.id}: map coords in %`);
}
ok(QUOTES.length >= 20 && QUOTES.every(q => q.text && q.by), "quote archive complete");
ok(DAYS.length === 7, "seven days");

// quote of the day: deterministic per date, always in range
const d1 = new Date("2026-07-09"), d2 = new Date("2026-07-09T23:59:00");
ok(quoteOfDay(d1) === quoteOfDay(d2), "same quote all day");
ok(quoteOfDay(new Date("2026-07-10")) !== quoteOfDay(d1) ||
   QUOTES.length === 1, "changes across days");
for (let i = 0; i < 400; i++) {
  const q = quoteOfDay(new Date(2026, 0, 1 + i));
  ok(q && q.text, "quote defined for day offset " + i);
}

// cheapest: hand-checked against the dataset
ok(cheapest(VENUES, v => v.coffee).id === "banh", "cheapest coffee is $3.50 banh mi");
ok(cheapest(VENUES, v => v.dish.price).id === "duchess", "cheapest dish is $8 scones");
ok(money(3.5) === "$3.50", "money format");

console.log("all checks passed");
