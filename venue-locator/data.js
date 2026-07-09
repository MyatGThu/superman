/* Melbourne Adult Venue Locator - address-only dataset.
 * ponytail: fields are deliberately limited to identity + location. No
 * rates, no rosters, no ratings/reviews fields exist in this schema at
 * all - that is a scope decision, not an oversight, so adding any of
 * those back requires a deliberate schema change, not a UI tweak.
 *
 * DEMO DATA: names are fictional, streets are real Melbourne street names
 * but WITHOUT a house number, so nothing here claims to pinpoint a real
 * business at a real address. Victoria abolished the brothel licensing
 * register in Dec 2023 (full decriminalisation), so there is no current
 * public dataset to source real listings from - plug verified data in
 * here if you have a legitimate source for it.
 *
 * distanceKm is straight-line distance from the fixed CBD_ORIGIN below,
 * NOT the viewer's location - this app never requests geolocation. */

const CBD_ORIGIN = { label: "Melbourne CBD (GPO)", x: 50, y: 50 };

const VENUES = [
  { id: "v1", name: "The Velvet Room", street: "Elizabeth St", suburb: "Melbourne (CBD)", distanceKm: 0.6, map: { x: 52, y: 46 } },
  { id: "v2", name: "Onyx House", street: "Franklin St", suburb: "Melbourne (CBD)", distanceKm: 0.9, map: { x: 47, y: 44 } },
  { id: "v3", name: "Crimson Lounge", street: "City Rd", suburb: "Southbank", distanceKm: 1.8, map: { x: 55, y: 58 } },
  { id: "v4", name: "Noir Club", street: "Wellington St", suburb: "Collingwood", distanceKm: 3.4, map: { x: 66, y: 40 } },
  { id: "v5", name: "Amber Suites", street: "Brunswick St", suburb: "Fitzroy", distanceKm: 3.9, map: { x: 60, y: 33 } },
  { id: "v6", name: "The Ruby Door", street: "Church St", suburb: "Richmond", distanceKm: 4.5, map: { x: 68, y: 55 } },
  { id: "v7", name: "Velour Lounge", street: "Chapel St", suburb: "Prahran", distanceKm: 6.8, map: { x: 62, y: 70 } },
  { id: "v8", name: "Midnight Rose", street: "Fitzroy St", suburb: "St Kilda", distanceKm: 8.2, map: { x: 58, y: 82 } },
  { id: "v9", name: "The Obsidian", street: "Sydney Rd", suburb: "Brunswick", distanceKm: 6.1, map: { x: 44, y: 20 } },
  { id: "v10", name: "Scarlet Manor", street: "Barkly St", suburb: "Footscray", distanceKm: 7.4, map: { x: 22, y: 46 } },
  { id: "v11", name: "The Lantern House", street: "Springvale Rd", suburb: "Dandenong", distanceKm: 31.0, map: { x: 84, y: 88 } },
  { id: "v12", name: "Twilight Rooms", street: "Nepean Hwy", suburb: "Frankston", distanceKm: 41.0, map: { x: 66, y: 96 } },
];

function bySuburb(venues) {
  const groups = {};
  for (const v of venues) (groups[v.suburb] ??= []).push(v);
  return groups;
}

const api = { CBD_ORIGIN, VENUES, bySuburb };
if (typeof module !== "undefined") module.exports = api;
if (typeof window !== "undefined") Object.assign(window, api);
