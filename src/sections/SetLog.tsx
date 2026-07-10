// SET 01 — THE LOG. The feature is demonstrated, not described: a live
// set logger the visitor can actually work. Steppers adjust weight and
// reps, the plate math updates instantly, and logging a set appends to
// tonight's list. All state is user-triggered, so plain useState is
// exactly right here.
import { useState } from 'react'
import { platesLabel } from '../lib/plates'
import './set-log.css'

interface LoggedSet {
  weight: number
  reps: number
}

const WEIGHT_STEP = 2.5
const TARGET_SETS = 5

export function SetLog() {
  const [weight, setWeight] = useState(120)
  const [reps, setReps] = useState(5)
  const [logged, setLogged] = useState<LoggedSet[]>([
    { weight: 120, reps: 5 },
    { weight: 120, reps: 5 },
  ])

  const done = logged.length >= TARGET_SETS

  function logSet() {
    if (done) return
    // Functional update keeps this correct even if clicks batch.
    setLogged((prev) => [...prev, { weight, reps }])
  }

  return (
    <section className="sect set-log" id="set-01" data-heat="0.28" data-phase="WORK">
      <span className="set-numeral" aria-hidden="true">
        01
      </span>
      <div className="sect-inner set-grid">
        <div className="set-copy">
          <h2>
            Log it before
            <br />
            your breath settles.
          </h2>
          <p className="lead">
            Two taps a set: weight, reps, done. Furnace does the plate math while you chalk up.
            Try it — this one is live.
          </p>
        </div>

        {/* The demo: a working slice of the app's set logger. */}
        <div className="logger" role="group" aria-label="Set logger demo">
          <p className="data-label logger-head">Tonight — back squat</p>

          <div className="logger-row">
            <span className="logger-field-label" id="log-weight-label">
              Weight
            </span>
            <div className="stepper" role="group" aria-labelledby="log-weight-label">
              <button
                type="button"
                onClick={() => setWeight((w) => Math.max(20, w - WEIGHT_STEP))}
                aria-label="Decrease weight by 2.5 kilograms"
              >
                −
              </button>
              <output className="stepper-value">
                {weight.toFixed(1)}
                <small> kg</small>
              </output>
              <button
                type="button"
                onClick={() => setWeight((w) => w + WEIGHT_STEP)}
                aria-label="Increase weight by 2.5 kilograms"
              >
                +
              </button>
            </div>
          </div>

          <div className="logger-row">
            <span className="logger-field-label" id="log-reps-label">
              Reps
            </span>
            <div className="stepper" role="group" aria-labelledby="log-reps-label">
              <button
                type="button"
                onClick={() => setReps((r) => Math.max(1, r - 1))}
                aria-label="Decrease reps by one"
              >
                −
              </button>
              <output className="stepper-value">{reps}</output>
              <button
                type="button"
                onClick={() => setReps((r) => r + 1)}
                aria-label="Increase reps by one"
              >
                +
              </button>
            </div>
          </div>

          <p className="logger-plates">
            Per side: <strong>{platesLabel(weight)}</strong>
          </p>

          <button type="button" className="logger-log btn-hot" onClick={logSet} disabled={done}>
            {done ? 'All five logged' : `Log set ${logged.length + 1} of ${TARGET_SETS}`}
          </button>

          <ol className="logger-list">
            {logged.map((s, i) => (
              <li key={i}>
                <span>Set {i + 1}</span>
                <span>
                  {s.weight.toFixed(1)} kg × {s.reps}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
