/* Melbourne Adult Venue Locator - map + address list only.
 * No navigator.geolocation call anywhere in this file: distances are
 * precomputed in data.js from the fixed CBD_ORIGIN, never the viewer. */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const map = document.getElementById("map");
const detail = document.getElementById("detail");
const rows = document.getElementById("rows");

const sorted = [...VENUES].sort((a, b) => a.distanceKm - b.distanceKm);

function km(n) { return n.toFixed(1).replace(".", "·") + " km"; } // nbsp binds number to unit

function show(v, trigger) {
  document.querySelectorAll(".pin, tr").forEach(el => el.classList.remove("active"));
  if (trigger) trigger.classList.add("active");
  detail.innerHTML =
    `<h2>${v.name}</h2>
     <p class="addr">${v.street}, ${v.suburb}</p>
     <p class="dist">${km(v.distanceKm)} from the CBD</p>`;
}

// origin marker (fixed CBD reference point, not the viewer)
const origin = document.createElement("div");
origin.className = "origin";
origin.title = CBD_ORIGIN.label;
map.appendChild(origin);

VENUES.forEach(v => {
  const pin = document.createElement("button");
  pin.className = "pin";
  pin.style.left = v.map.x + "%";
  pin.style.top = v.map.y + "%";
  pin.setAttribute("aria-label", `${v.name}, ${v.street}, ${v.suburb}`);
  pin.innerHTML = '<span class="dot"></span>';
  pin.addEventListener("click", () => show(v, pin));
  map.appendChild(pin);
});

rows.innerHTML = sorted.map(v =>
  `<tr data-id="${v.id}"><td colspan="3"><button class="row-btn">
     <span class="name">${v.name}</span> &middot;
     <span class="addr">${v.street}, ${v.suburb}</span>
   </button></td><td class="dist">${km(v.distanceKm)}</td></tr>`
).join("");
rows.querySelectorAll("tr").forEach(tr => {
  tr.querySelector("button").addEventListener("click", () => {
    const v = VENUES.find(x => x.id === tr.dataset.id);
    show(v, tr);
    document.querySelector(`.pin[aria-label^="${v.name}"]`)?.classList.add("active");
  });
});

// drag to rotate the map around its Z axis; pins counter-rotate to stay upright
let dragging = false, startX = 0, rz = -10;
map.addEventListener("pointerdown", e => { dragging = true; startX = e.clientX; map.setPointerCapture(e.pointerId); });
map.addEventListener("pointermove", e => {
  if (!dragging || REDUCED) return;
  const next = Math.max(-35, Math.min(15, rz + (e.clientX - startX) / 6));
  map.style.setProperty("--rz", next + "deg");
  document.querySelectorAll(".pin").forEach(p => p.style.setProperty("--rz", next + "deg"));
});
map.addEventListener("pointerup", () => {
  dragging = false;
  rz = parseFloat(getComputedStyle(map).getPropertyValue("--rz")) || rz;
});
