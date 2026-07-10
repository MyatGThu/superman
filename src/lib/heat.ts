// ---------------------------------------------------------------------
// The heat controller — the page's central scroll system.
//
// "Heat" is one ambient number (0 cold → 1 molten) that models effort
// across the session. Each <section> declares its temperature with
// data-heat / data-phase; this module interpolates between section
// midpoints as the visitor scrolls, smooths the value, and fans it out:
//
//   1. as the --heat CSS custom property on <html> — all color work
//      (background warming, glow tints, the HUD bar) is done by CSS
//      color-mix(), so JS writes exactly ONE number per frame;
//   2. to subscribers (the Effort HUD), which write text into the DOM
//      directly — no React re-renders at scroll frequency.
// ---------------------------------------------------------------------
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export interface HeatSample {
  heat: number // smoothed 0…1
  phase: string // label of the nearest section, e.g. "WARM-UP"
}

export interface HeatController {
  /** Start tracking [data-heat] sections inside root. Returns cleanup. */
  attach(root: HTMLElement): () => void
  /** Subscribe to per-frame samples. Returns unsubscribe. */
  subscribe(fn: (s: HeatSample) => void): () => void
}

interface Band {
  mid: number // document-space y of the section's midpoint
  heat: number
  phase: string
}

export function createHeatController(): HeatController {
  let bands: Band[] = []
  const listeners = new Set<(s: HeatSample) => void>()
  let current = 0
  let lastWritten = -1
  let phase = ''

  // Re-measure section midpoints. Runs on attach and whenever
  // ScrollTrigger refreshes (resize, font load, orientation change).
  function measure(root: HTMLElement) {
    bands = [...root.querySelectorAll<HTMLElement>('[data-heat]')]
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          mid: r.top + window.scrollY + r.height / 2,
          heat: Number(el.dataset.heat) || 0,
          phase: el.dataset.phase ?? '',
        }
      })
      .sort((a, b) => a.mid - b.mid)
  }

  // Piecewise-linear heat target for the current scroll position:
  // the viewport's center is compared against section midpoints.
  function target(): HeatSample {
    const y = window.scrollY + window.innerHeight / 2
    const first = bands[0]
    const last = bands[bands.length - 1]
    if (y <= first.mid) return first
    if (y >= last.mid) return last
    let i = 1
    while (bands[i].mid < y) i++
    const a = bands[i - 1]
    const b = bands[i]
    const t = (y - a.mid) / (b.mid - a.mid)
    return {
      heat: a.heat + (b.heat - a.heat) * t,
      phase: t < 0.5 ? a.phase : b.phase,
    }
  }

  return {
    attach(root) {
      measure(root)
      const onRefresh = () => measure(root)
      ScrollTrigger.addEventListener('refresh', onRefresh)

      const html = document.documentElement
      // gsap.ticker gives us a single shared rAF loop; deltaRatio keeps
      // the exponential smoothing frame-rate independent.
      const tick = () => {
        if (!bands.length) return
        const t = target()
        current += (t.heat - current) * Math.min(1, 0.09 * gsap.ticker.deltaRatio(60))
        // Skip DOM writes when nothing perceptible changed.
        if (Math.abs(current - lastWritten) < 0.0005 && t.phase === phase) return
        lastWritten = current
        if (t.phase !== phase) {
          phase = t.phase
          // Exposed for CSS: e.g. the top wordmark fades once the
          // warm-up is over so it never collides with section headings.
          html.dataset.phase = phase
        }
        html.style.setProperty('--heat', current.toFixed(4))
        const sample = { heat: current, phase }
        listeners.forEach((fn) => fn(sample))
      }
      gsap.ticker.add(tick)

      return () => {
        gsap.ticker.remove(tick)
        ScrollTrigger.removeEventListener('refresh', onRefresh)
      }
    },

    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
