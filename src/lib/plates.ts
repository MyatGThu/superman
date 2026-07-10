// Plate math: what to load per side of a 20 kg bar.
// Greedy decomposition over standard plates — greedy is exact here
// because every plate divides the next one up cleanly.
const BAR_KG = 20
const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]

/** Per-side plate list for a target barbell weight, heaviest first.
 *  Returns [] when the bar alone covers it (or the target is invalid). */
export function platesPerSide(totalKg: number): number[] {
  let perSide = (totalKg - BAR_KG) / 2
  if (!Number.isFinite(perSide) || perSide <= 0) return []
  const out: number[] = []
  for (const p of PLATES_KG) {
    while (perSide >= p - 1e-9) {
      out.push(p)
      perSide -= p
    }
  }
  return out
}

/** "25 · 10 · 2.5" — display form used by the set-logger demo. */
export function platesLabel(totalKg: number): string {
  const plates = platesPerSide(totalKg)
  return plates.length ? plates.join(' · ') : 'empty bar'
}
