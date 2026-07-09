/* Peachy shared effects - no libraries.
 * parallax: elements with [data-depth] drift against scroll & pointer.
 * reveal:   .reveal elements animate in on first view (IntersectionObserver).
 * pop:      .pop headlines get per-letter bubble-pop spans.
 * tilt:     .tilt cards rotate in 3D toward the pointer.
 * Pages that inject cards after load call enhance() again - it only wires
 * elements it hasn't seen (data-fx marker). */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });

function enhance(root = document) {
  root.querySelectorAll(".pop:not([data-fx])").forEach(el => {
    el.dataset.fx = "1";
    if (REDUCED) return;
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "pop-letter";
      s.style.setProperty("--i", i);
      s.textContent = ch === " " ? " " : ch; // nbsp: inline-block spans collapse bare spaces
      s.setAttribute("aria-hidden", "true");
      el.appendChild(s);
    });
  });

  root.querySelectorAll(".reveal:not([data-fx])").forEach(el => {
    el.dataset.fx = "1";
    io.observe(el);
  });

  root.querySelectorAll(".tilt:not([data-fx])").forEach(card => {
    card.dataset.fx = "1";
    if (REDUCED) return;
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(700px) rotateY(${x * 10}deg) rotateX(${y * -10}deg) translateZ(8px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}
window.enhance = enhance;
enhance();

// --- parallax (scroll + gentle pointer drift) -----------------------------
const layers = [...document.querySelectorAll("[data-depth]")];
let px = 0, py = 0;
function drift() {
  if (REDUCED) return;
  const sy = scrollY;
  layers.forEach(el => {
    const d = +el.dataset.depth;
    el.style.transform =
      `translate3d(${px * 30 * d}px, ${sy * -d + py * 20 * d}px, 0)`;
  });
}
addEventListener("scroll", drift, { passive: true });
addEventListener("pointermove", e => {
  px = e.clientX / innerWidth - 0.5;
  py = e.clientY / innerHeight - 0.5;
  drift();
}, { passive: true });
drift();

// --- active nav ------------------------------------------------------------
const here = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll("nav a").forEach(a => {
  if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page");
});
