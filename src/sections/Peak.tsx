// PEAK — max effort. The one drenched moment on the page: the world
// goes molten and the visitor is handed the scroll-stopper — a button
// you have to physically hold while it grinds toward 100%, slowing
// near the top exactly like a heavy single. Break it and the target
// from SET 02 (142.5 kg) becomes a logged PR. Sparks fly; each further
// break adds +2.5 kg, because a broken limit is just the next target.
//
// Interaction notes:
// - pointer events cover mouse + touch; keyboard users press Enter or
//   Space once and the charge completes on its own (holding a key is
//   not an accessible requirement).
// - reduced motion: no shake, no particles — the fill and the logged
//   result still happen (meaning stays, motion goes).
import { useEffect, useRef, useState } from 'react'
import './peak.css'

const PR_START = 142.5 // the engine's call from SET 02
const PR_STEP = 2.5
// Charge rate: ~2 s to full, decelerating near the top (the grind).
const CHARGE = (p: number) => 0.95 * (1.18 - p)
const DECAY = 1.6 // release early and the bar slides back down
const SPARK_COLORS = ['#ffe9d6', '#ffc46b', '#ff9a3c', '#f97316']

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number // seconds remaining
  max: number
  size: number
  color: string
}

export function Peak() {
  const [prs, setPrs] = useState<number[]>([])
  const stageRef = useRef<HTMLDivElement>(null)
  const holdRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Transient interaction state — rAF-frequency, so refs, not state.
  const charge = useRef({ p: 0, holding: false, auto: false, raf: 0 })
  const sparks = useRef<Spark[]>([])

  // One MediaQueryList for the component's lifetime; its .matches stays
  // live, so reading it in the draw loop costs nothing.
  const [rmQuery] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)'))
  const reducedMotion = () => rmQuery.matches

  // ---- the charge loop (hold-to-break) ----
  function paintCharge() {
    const { p } = charge.current
    holdRef.current!.style.setProperty('--charge', p.toFixed(4))
    stageRef.current!.classList.toggle('is-straining', p > 0.55 && !reducedMotion())
  }

  function chargeLoop(now: number, last: number) {
    const c = charge.current
    const dt = Math.min(0.05, (now - last) / 1000)
    if (c.holding || c.auto) {
      c.p = Math.min(1, c.p + dt * CHARGE(c.p))
    } else {
      c.p = Math.max(0, c.p - dt * DECAY)
    }
    paintCharge()
    if (c.p >= 1) {
      c.p = 0
      c.holding = false
      c.auto = false
      paintCharge()
      breakLimit()
      return
    }
    if (c.p > 0 || c.holding || c.auto) {
      c.raf = requestAnimationFrame((n) => chargeLoop(n, now))
    }
  }

  function startHold(auto = false) {
    const c = charge.current
    if (c.holding || c.auto) return
    c[auto ? 'auto' : 'holding'] = true
    cancelAnimationFrame(c.raf)
    c.raf = requestAnimationFrame((n) => chargeLoop(n, n - 16))
  }

  function endHold() {
    charge.current.holding = false
  }

  function breakLimit() {
    setPrs((prev) => [...prev, PR_START + prev.length * PR_STEP])
    navigator.vibrate?.(40)
    if (!reducedMotion()) burst()
  }

  // ---- sparks ----
  function burst() {
    const canvas = canvasRef.current!
    const btn = holdRef.current!.getBoundingClientRect()
    const box = canvas.getBoundingClientRect()
    const cx = btn.left + btn.width / 2 - box.left
    const cy = btn.top - box.top
    for (let i = 0; i < 130; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
      const speed = 220 + Math.random() * 520
      sparks.current.push({
        x: cx + (Math.random() - 0.5) * btn.width * 0.7,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.9,
        max: 1.6,
        size: 1.5 + Math.random() * 2.5,
        color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
      })
    }
  }

  // Canvas lifecycle: size to the section, draw only while on screen.
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let running = false
    let last = 0

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // ambient embers drifting up from the bottom edge
      if (!reducedMotion() && sparks.current.length < 260 && Math.random() < 0.35) {
        sparks.current.push({
          x: Math.random() * canvas.offsetWidth,
          y: canvas.offsetHeight + 4,
          vx: (Math.random() - 0.5) * 14,
          vy: -24 - Math.random() * 46,
          life: 3 + Math.random() * 3,
          max: 6,
          size: 1 + Math.random() * 1.8,
          color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
        })
      }

      sparks.current = sparks.current.filter((s) => {
        s.life -= dt
        if (s.life <= 0) return false
        s.vy += 420 * dt * (s.max < 2 ? 1 : 0) // gravity only on burst sparks
        s.x += s.vx * dt
        s.y += s.vy * dt
        ctx.globalAlpha = Math.min(1, s.life / (s.max * 0.4))
        ctx.fillStyle = s.color
        ctx.fillRect(s.x * dpr, s.y * dpr, s.size * dpr, s.size * dpr)
        return true
      })
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    // Only burn CPU while PEAK is actually visible.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(draw)
      } else if (!entry.isIntersecting && running) {
        running = false
        cancelAnimationFrame(raf)
      }
    })
    io.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  // Never leave the charge loop running after unmount.
  useEffect(() => () => cancelAnimationFrame(charge.current.raf), [])

  const latest = prs[prs.length - 1]

  return (
    <section className="sect peak" data-heat="1" data-phase="PEAK">
      <canvas className="peak-sparks" ref={canvasRef} aria-hidden="true" />
      <div className="sect-inner peak-stage" ref={stageRef}>
        <h2 className="peak-title">
          Your limit
          <br />
          is listening.
        </h2>
        <p className="peak-lead">
          The bar from SET 02 is loaded — 142.5 kg, the number the engine picked. It only counts
          if you take it past the sticking point. Don&rsquo;t let go early.
        </p>

        <button
          type="button"
          ref={holdRef}
          className="peak-hold"
          onPointerDown={(e) => {
            e.preventDefault() // no text selection / focus flicker mid-grind
            startHold()
          }}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
              e.preventDefault()
              startHold(true)
            }
          }}
        >
          <span className="peak-hold-fill" aria-hidden="true" />
          <span className="peak-hold-label">
            {prs.length === 0 ? 'Hold to break it' : 'Hold to break the next one'}
          </span>
        </button>

        {/* Result: announced politely, styled like a log entry. */}
        <p className="peak-result" role="status">
          {latest !== undefined && (
            <>
              <span className="peak-result-chip">PR</span> {latest.toFixed(1)} kg — logged.
              {prs.length === 1 ? ' It won’t last either.' : ` That’s ${prs.length} tonight.`}
            </>
          )}
        </p>
      </div>
    </section>
  )
}
