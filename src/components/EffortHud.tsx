// The Effort HUD — the page's signature element. A fixed instrument
// strip along the bottom edge: phase label, a segmented effort bar,
// simulated heart rate, and effort %. It renders once; after that the
// heat controller streams values in and we write the DOM directly via
// refs (scroll-frequency data must never go through React state).
import { useEffect, useRef } from 'react'
import type { HeatController } from '../lib/heat'
import './effort-hud.css'

// Resting → max heart rate for the simulated session readout.
const BPM_MIN = 62
const BPM_MAX = 188

export function EffortHud({ controller }: { controller: HeatController }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const phaseRef = useRef<HTMLSpanElement>(null)
  const bpmRef = useRef<HTMLSpanElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)

  useEffect(
    () =>
      controller.subscribe(({ heat, phase }) => {
        // Direct DOM writes — this callback runs on scroll frames.
        phaseRef.current!.textContent = phase
        bpmRef.current!.textContent = String(Math.round(BPM_MIN + heat * (BPM_MAX - BPM_MIN)))
        pctRef.current!.textContent = String(Math.round(heat * 100))
        // Redline state: the bar pulses when effort maxes out.
        rootRef.current!.dataset.redline = heat > 0.96 ? 'true' : 'false'
      }),
    [controller],
  )

  // Decorative, continuously-changing readout: hidden from the
  // accessibility tree so it never spams screen readers.
  return (
    <div className="hud" ref={rootRef} aria-hidden="true">
      <span className="hud-cell hud-phase" ref={phaseRef}>
        WARM-UP
      </span>
      {/* The bar's fill width and color come straight from --heat in CSS —
          no JS involved. */}
      <div className="hud-bar">
        <div className="hud-bar-fill" />
      </div>
      <span className="hud-cell hud-bpm">
        <span ref={bpmRef}>62</span>
        {' '}BPM
      </span>
      <span className="hud-cell hud-pct">
        <span ref={pctRef}>0</span>%
      </span>
    </div>
  )
}
