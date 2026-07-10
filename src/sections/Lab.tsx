// THE LAB — the 3D movement library, and the seed of the Furnace app.
// The performer is Melina Jones Voss: a Soul-2-generated, rigged and
// animated 3D scan. Draw a movement and she performs it on a rotating
// stage while her working muscles are marked molten; tap a target to
// zoom onto it. The original procedural mannequin remains available as
// the "dummy" builds — and as the automatic fallback if her scan can't
// load on a given device or network.
//
// three.js and the stage module are loaded lazily when this section
// approaches the viewport, so the landing bundle never pays for them.
import { useEffect, useRef, useState } from 'react'
import { drawFrom, EXERCISES, MELINA_MOVEMENTS } from '../lab/exercises'
import { MUSCLES, type MuscleId } from '../lab/muscles'
import type { BuildKind, LabStage } from '../lab/stage'
import './lab.css'

type Status = 'idle' | 'loading' | 'ready' | 'failed'

const BUILDS: { id: BuildKind; label: string }[] = [
  { id: 'melina', label: 'Melina' },
  { id: 'man', label: 'Dummy · M' },
  { id: 'woman', label: 'Dummy · W' },
]

const libraryFor = (build: BuildKind) => (build === 'melina' ? MELINA_MOVEMENTS : EXERCISES)

export function Lab() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<LabStage | null>(null)
  const labelRefs = useRef(new Map<MuscleId, HTMLSpanElement>())
  const userDroveRef = useRef(false) // suppress the auto-dive after manual input

  const [status, setStatus] = useState<Status>('idle')
  const [build, setBuild] = useState<BuildKind>('melina')
  const [movement, setMovement] = useState(() => drawFrom(MELINA_MOVEMENTS))
  const [focused, setFocused] = useState<MuscleId | null>(null)
  const [charLoading, setCharLoading] = useState(false)
  const [fellBack, setFellBack] = useState(false)

  // Boot the 3D stage when the section gets close (once).
  useEffect(() => {
    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        setStatus('loading')
        try {
          const { createStage } = await import('../lab/stage')
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          const stage = createStage(canvasRef.current!, reduced, (s) => {
            setCharLoading(s === 'loading')
            if (s === 'failed') {
              // Melina's scan is unreachable: run the dummy instead.
              setFellBack(true)
              setBuild('woman')
            }
          })
          stage.setLabelSink((pts) => {
            // render-frequency positioning: direct DOM writes
            for (const p of pts) {
              const el = labelRefs.current.get(p.id)
              if (!el) continue
              el.style.transform = `translate(${p.x}px, ${p.y}px)`
              el.style.opacity = p.visible ? '1' : '0'
            }
          })
          stageRef.current = stage
          setStatus('ready')
        } catch {
          setStatus('failed') // no WebGL: the section degrades to copy
        }
      },
      { rootMargin: '600px' },
    )
    io.observe(sectionRef.current!)
    return () => {
      io.disconnect()
      stageRef.current?.dispose()
      stageRef.current = null
    }
  }, [])

  // Push build changes into the stage; redraw when the library changes.
  useEffect(() => {
    if (status !== 'ready') return
    stageRef.current?.setBuild(build)
    setMovement((cur) => {
      const lib = libraryFor(build)
      return lib.some((m) => m.id === cur.id) ? cur : drawFrom(lib)
    })
  }, [status, build])

  useEffect(() => {
    if (status !== 'ready') return
    stageRef.current?.setExercise(movement.id)
    userDroveRef.current = false
    setFocused(null)
    // The zoom moment: after one full rep, dive onto the primary
    // mover — unless the visitor has taken the wheel.
    const t = setTimeout(
      () => {
        if (!userDroveRef.current) setFocused(movement.muscles[0])
      },
      movement.tempo * 1000 + 400,
    )
    return () => clearTimeout(t)
  }, [status, movement])

  useEffect(() => {
    if (status === 'ready') stageRef.current?.focusMuscle(focused)
  }, [status, focused])

  function pickFocus(m: MuscleId | null) {
    userDroveRef.current = true
    setFocused(m)
  }

  const performer =
    build === 'melina' ? 'Melina Jones Voss' : build === 'man' ? 'male training dummy' : 'female training dummy'

  return (
    <section className="sect lab" id="the-lab" data-heat="0.8" data-phase="WORK" ref={sectionRef}>
      <div className="sect-inner">
        <header className="lab-head">
          <p className="data-label">The Lab — every movement, mapped</p>
          <h2>
            Know what
            <br />
            you&rsquo;re firing.
          </h2>
          <p className="lead">
            Melina draws a movement and shows you the work. The stage rotates, the working
            muscles burn molten — drag to orbit, tap a target to zoom in on it.
          </p>
        </header>

        <div className="lab-app">
          <div className="lab-stage" data-status={status}>
            <canvas
              ref={canvasRef}
              className="lab-canvas"
              role="img"
              aria-label={`Rotating 3D model of ${performer} performing a ${movement.name}. Highlighted muscles: ${movement.muscles.map((m) => MUSCLES[m]).join(', ')}.`}
            />
            {/* floating muscle tags, positioned per frame by the stage */}
            {status === 'ready' &&
              movement.muscles.map((m, i) => (
                <span
                  key={`${movement.id}-${m}`}
                  className="lab-tag"
                  // stagger each tag upward so co-located anchors never overlap
                  style={{ translate: `-50% calc(-140% - ${i * 115}%)` }}
                  ref={(el) => {
                    if (el) labelRefs.current.set(m, el)
                    else labelRefs.current.delete(m)
                  }}
                >
                  {MUSCLES[m]}
                </span>
              ))}
            {(status === 'loading' || charLoading) && (
              <p className="lab-boot data-label" role="status">
                {status === 'loading' ? 'Loading the rig…' : 'Loading Melina…'}
              </p>
            )}
            {status === 'failed' && (
              <p className="lab-boot data-label" role="status">
                This device can&rsquo;t run the 3D stage — the movement library still works in the
                app.
              </p>
            )}
          </div>

          <div className="lab-panel">
            <fieldset className="lab-field">
              <legend className="data-label">Performer</legend>
              <div className="lab-seg" role="radiogroup" aria-label="Choose the performer">
                {BUILDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={build === b.id}
                    className="lab-seg-btn"
                    onClick={() => {
                      setFellBack(false)
                      setBuild(b.id)
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              {fellBack && (
                <p className="lab-note" role="status">
                  Melina&rsquo;s 3D scan couldn&rsquo;t load here — running the dummy instead.
                </p>
              )}
            </fieldset>

            <div className="lab-field">
              <p className="data-label">Movement — drawn at random</p>
              <p className="lab-move">{movement.name}</p>
              <p className="lab-cue">{movement.cue}</p>
              <button
                type="button"
                className="btn-hot lab-draw"
                onClick={() => setMovement(drawFrom(libraryFor(build), movement.id))}
              >
                Draw next movement ({libraryFor(build).length} in the rack)
              </button>
            </div>

            <div className="lab-field">
              <p className="data-label" id="lab-targets-label">
                Targets — tap to zoom
              </p>
              <ul className="lab-chips" aria-labelledby="lab-targets-label">
                {movement.muscles.map((m, i) => (
                  <li key={m}>
                    <button
                      type="button"
                      className="lab-chip"
                      aria-pressed={focused === m}
                      onClick={() => pickFocus(focused === m ? null : m)}
                    >
                      <span className="lab-chip-coal" aria-hidden="true" />
                      {MUSCLES[m]}
                      {i === 0 && <small> · primary</small>}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="lab-fullbody"
                onClick={() => pickFocus(null)}
                disabled={focused === null}
              >
                Full body
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
