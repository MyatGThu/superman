// SET 03 — THE CLOCK. A rest timer that actually runs. 90 seconds,
// down to the decisecond. Button state lives in React; the ticking
// digits and ring are written straight to the DOM from a rAF loop —
// re-rendering a component tree 60× a second to move a clock hand
// would be the wrong tool.
//
// Timing uses performance.now() deltas, not setInterval: interval
// timers drift, and a rest timer that lies defeats the feature.
import { useEffect, useRef, useState } from 'react'
import './set-clock.css'

const REST_SECONDS = 90

type ClockState = 'idle' | 'running' | 'paused' | 'done'

const fmt = (s: number) => {
  const clamped = Math.max(0, s)
  const m = Math.floor(clamped / 60)
  const sec = Math.floor(clamped % 60)
  const d = Math.floor((clamped * 10) % 10)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${d}`
}

export function SetClock() {
  const [state, setState] = useState<ClockState>('idle')
  const digitsRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  // Mutable clock internals — deliberately not React state (see header).
  const clock = useRef({ remaining: REST_SECONDS, raf: 0, last: 0 })

  function paint() {
    const { remaining } = clock.current
    digitsRef.current!.textContent = fmt(remaining)
    ringRef.current!.style.setProperty('--frac', String(remaining / REST_SECONDS))
  }

  function stopLoop() {
    cancelAnimationFrame(clock.current.raf)
  }

  function loop(now: number) {
    const c = clock.current
    c.remaining -= (now - c.last) / 1000
    c.last = now
    if (c.remaining <= 0) {
      c.remaining = 0
      paint()
      setState('done')
      return
    }
    paint()
    c.raf = requestAnimationFrame(loop)
  }

  function start() {
    clock.current.last = performance.now()
    clock.current.raf = requestAnimationFrame(loop)
    setState('running')
  }

  function pause() {
    stopLoop()
    setState('paused')
  }

  function reset() {
    stopLoop()
    clock.current.remaining = REST_SECONDS
    paint()
    setState('idle')
  }

  // Never leave a rAF running after unmount.
  useEffect(() => stopLoop, [])

  const running = state === 'running'

  return (
    <section className="sect set-clock" id="set-03" data-heat="0.66" data-phase="WORK">
      <span className="set-numeral" aria-hidden="true">
        03
      </span>
      <div className="sect-inner set-grid set-grid--flip">
        {/* The demo: a real 90-second rest clock. */}
        <div className="clock" data-state={state}>
          <div className="clock-ring" ref={ringRef}>
            <span className="clock-digits" ref={digitsRef}>
              {fmt(REST_SECONDS)}
            </span>
            <span className="data-label clock-tag">rest</span>
          </div>
          <div className="clock-actions">
            <button
              type="button"
              className="btn-hot clock-toggle"
              onClick={running ? pause : state === 'done' ? reset : start}
            >
              {state === 'idle' && 'Start the rest'}
              {state === 'running' && 'Pause'}
              {state === 'paused' && 'Resume'}
              {state === 'done' && 'Run it again'}
            </button>
            {(state === 'running' || state === 'paused') && (
              <button type="button" className="clock-reset" onClick={reset}>
                Reset
              </button>
            )}
          </div>
          {/* Announced once when rest expires — the only live region here. */}
          <p className="clock-alert" role="status">
            {state === 'done' ? 'Rest over. Back under the bar.' : ''}
          </p>
        </div>

        <div className="set-copy">
          <h2>
            Rest is part
            <br />
            of the work.
          </h2>
          <p className="lead">
            Ninety seconds. Not ninety-five. The clock guards your recovery so the next set gets
            everything you have. Start it — see how long ninety really is.
          </p>
        </div>
      </div>
    </section>
  )
}
