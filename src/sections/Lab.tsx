// THE LAB — the 3D movement library, and the seed of the Furnace app.
// Pick a build (man / woman), draw a random movement, and watch an
// articulated mannequin perform it on a rotating stage while the
// working muscles ignite. Tapping a target chip flies the camera onto
// that muscle; after the first rep the camera dives onto the primary
// mover by itself.
//
// three.js and the stage module are loaded lazily when this section
// approaches the viewport, so the landing bundle never pays for them.
import { useEffect, useRef, useState } from 'react'
import { drawExercise, EXERCISES } from '../lab/exercises'
import { MUSCLES, type MuscleId, type Sex } from '../lab/muscles'
import type { LabStage } from '../lab/stage'
import './lab.css'

type Status = 'idle' | 'loading' | 'ready' | 'failed'

export function Lab() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<LabStage | null>(null)
  const labelRefs = useRef(new Map<MuscleId, HTMLSpanElement>())
  const userDroveRef = useRef(false) // suppress the auto-dive after manual input

  const [status, setStatus] = useState<Status>('idle')
  const [sex, setSex] = useState<Sex>('man')
  const [exercise, setExercise] = useState(() => drawExercise())
  const [focused, setFocused] = useState<MuscleId | null>(null)

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
          const stage = createStage(canvasRef.current!, reduced)
          stage.setLabelSink((pts) => {
            // scroll/render-frequency positioning: direct DOM writes
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

  // Push React state into the imperative stage.
  useEffect(() => {
    if (status === 'ready') stageRef.current?.setSex(sex)
  }, [status, sex])

  useEffect(() => {
    if (status !== 'ready') return
    stageRef.current?.setExercise(exercise.id)
    userDroveRef.current = false
    setFocused(null)
    // The promised zoom moment: after one full rep, dive onto the
    // primary mover — unless the visitor has taken the wheel.
    const t = setTimeout(
      () => {
        if (!userDroveRef.current) setFocused(exercise.muscles[0])
      },
      exercise.tempo * 1000 + 400,
    )
    return () => clearTimeout(t)
  }, [status, exercise])

  useEffect(() => {
    if (status === 'ready') stageRef.current?.focusMuscle(focused)
  }, [status, focused])

  function pickFocus(m: MuscleId | null) {
    userDroveRef.current = true
    setFocused(m)
  }

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
            Pick your build and Furnace draws a movement. The stage rotates, the working muscles
            burn molten — drag to orbit, tap a target to zoom in on it.
          </p>
        </header>

        <div className="lab-app">
          <div className="lab-stage" data-status={status}>
            <canvas
              ref={canvasRef}
              className="lab-canvas"
              role="img"
              aria-label={`Rotating 3D ${sex === 'man' ? 'male' : 'female'} mannequin performing a ${exercise.name}. Highlighted muscles: ${exercise.muscles.map((m) => MUSCLES[m]).join(', ')}.`}
            />
            {/* floating muscle tags, positioned per frame by the stage */}
            {status === 'ready' &&
              exercise.muscles.map((m, i) => (
                <span
                  key={`${exercise.id}-${m}`}
                  className="lab-tag"
                  // stagger each tag upward so co-located pads (e.g.
                  // delts + triceps overhead) never overlap
                  style={{ translate: `-50% calc(-140% - ${i * 115}%)` }}
                  ref={(el) => {
                    if (el) labelRefs.current.set(m, el)
                    else labelRefs.current.delete(m)
                  }}
                >
                  {MUSCLES[m]}
                </span>
              ))}
            {status === 'loading' && (
              <p className="lab-boot data-label" role="status">
                Loading the rig…
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
              <legend className="data-label">Build</legend>
              <div className="lab-seg" role="radiogroup" aria-label="Choose your build">
                {(['man', 'woman'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={sex === s}
                    className="lab-seg-btn"
                    onClick={() => setSex(s)}
                  >
                    {s === 'man' ? 'Man' : 'Woman'}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="lab-field">
              <p className="data-label">Movement — drawn at random</p>
              <p className="lab-move">{exercise.name}</p>
              <p className="lab-cue">{exercise.cue}</p>
              <button
                type="button"
                className="btn-hot lab-draw"
                onClick={() => setExercise(drawExercise(exercise.id))}
              >
                Draw next movement ({EXERCISES.length} in the rack)
              </button>
            </div>

            <div className="lab-field">
              <p className="data-label" id="lab-targets-label">
                Targets — tap to zoom
              </p>
              <ul className="lab-chips" aria-labelledby="lab-targets-label">
                {exercise.muscles.map((m, i) => (
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
