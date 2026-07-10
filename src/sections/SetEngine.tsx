// SET 02 — THE ENGINE. The progressive-overload feature shown as what
// it is: ten weeks of top sets and the number the engine picks next.
// The line draws itself as you scroll through the section (scrubbed
// stroke-dashoffset), so reading the page enacts the training history.
import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import './set-engine.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// Ten weeks of back-squat top sets (kg) and the engine's next call.
const HISTORY = [120, 122.5, 125, 125, 127.5, 130, 132.5, 135, 137.5, 140]
const NEXT = 142.5

// --- static SVG geometry, computed once at module load ---
const W = 640
const H = 300
const PLOT = { x0: 24, x1: 584, y0: 24, y1: 264 } // drawing area
const KG_MIN = 115
const KG_MAX = 150

const xFor = (week: number) => PLOT.x0 + (week * (PLOT.x1 - PLOT.x0)) / HISTORY.length
const yFor = (kg: number) => PLOT.y1 - ((kg - KG_MIN) / (KG_MAX - KG_MIN)) * (PLOT.y1 - PLOT.y0)

const LINE_D = HISTORY.map((kg, i) => `${i ? 'L' : 'M'}${xFor(i)} ${yFor(kg)}`).join(' ')
const LAST = { x: xFor(HISTORY.length - 1), y: yFor(HISTORY[HISTORY.length - 1]) }
const TARGET = { x: xFor(HISTORY.length), y: yFor(NEXT) }
const GRID_KG = [120, 130, 140]

export function SetEngine() {
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // One scrubbed timeline: line draws, markers land, target pops.
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 70%',
            end: 'center 45%',
            scrub: true,
          },
        })
        tl.fromTo(
          '.engine-line',
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, ease: 'none', duration: 1 },
        )
          .from('.engine-dot', { opacity: 0, stagger: 0.04, duration: 0.1 }, 0.1)
          .from('.engine-next', { opacity: 0, duration: 0.25 }, 0.95)
      })
    },
    { scope },
  )

  return (
    <section className="sect set-engine" id="set-02" data-heat="0.48" data-phase="WORK" ref={scope}>
      <span className="set-numeral" aria-hidden="true">
        02
      </span>
      <div className="sect-inner">
        <div className="set-copy">
          <h2>
            It names
            <br />
            tonight&rsquo;s number.
          </h2>
          <p className="lead">
            The engine reads your history and picks the smallest weight that still moves you
            forward. Ten weeks of back squat, one verdict. Argue with it by lifting it.
          </p>
        </div>

        <figure className="engine-panel">
          <figcaption className="data-label engine-head">
            Back squat — top set, last 10 weeks
          </figcaption>
          <svg
            className="engine-chart"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Line chart: back squat top set rising from 120 to 140 kilograms over ten weeks. The engine's next target: ${NEXT} kilograms.`}
          >
            {/* horizontal grid + kg labels */}
            {GRID_KG.map((kg) => (
              <g key={kg}>
                <line
                  className="engine-grid"
                  x1={PLOT.x0}
                  x2={PLOT.x1}
                  y1={yFor(kg)}
                  y2={yFor(kg)}
                />
                <text className="engine-axis" x={PLOT.x1 + 8} y={yFor(kg) + 4}>
                  {kg}
                </text>
              </g>
            ))}

            {/* the history line — pathLength=1 makes the dash scrub trivial */}
            <path className="engine-line" d={LINE_D} pathLength={1} />

            {/* week markers */}
            {HISTORY.map((kg, i) => (
              <rect
                key={i}
                className="engine-dot"
                x={xFor(i) - 3}
                y={yFor(kg) - 3}
                width="6"
                height="6"
              />
            ))}

            {/* the engine's call: dashed reach to next week's target */}
            <g className="engine-next">
              <line
                className="engine-next-line"
                x1={LAST.x}
                y1={LAST.y}
                x2={TARGET.x}
                y2={TARGET.y}
              />
              <rect
                className="engine-next-dot"
                x={TARGET.x - 4}
                y={TARGET.y - 4}
                width="8"
                height="8"
              />
              <text className="engine-next-label" x={TARGET.x - 12} y={TARGET.y - 16}>
                NEXT · {NEXT} KG (+2.5)
              </text>
            </g>
          </svg>
        </figure>
      </div>
    </section>
  )
}
