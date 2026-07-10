// RECOVERY — the cool-down and the close. The world is cold again; a
// breathing pacer (pure CSS, 4-4-4 box breathing) brings the heart
// rate down. The CTA is honest: Furnace is a concept build, so the
// only ask is one more rep — "Run it back" restarts the session.
import './recovery.css'

const REPO_URL = 'https://github.com/MyatGThu/superman'

export function Recovery() {
  return (
    <section className="sect recovery" data-heat="0.1" data-phase="RECOVERY">
      <div className="sect-inner recovery-inner">
        <div className="pacer" role="img" aria-label="Breathing pacer: four seconds in, four held, four out">
          <div className="pacer-ring" aria-hidden="true" />
          <p className="pacer-labels" aria-hidden="true">
            <span>In&nbsp;4</span>
            <span>Hold&nbsp;4</span>
            <span>Out&nbsp;4</span>
          </p>
        </div>

        <h2>
          Session
          <br />
          complete.
        </h2>
        <p className="lead recovery-lead">
          Heart rate down, bar racked, numbers written. The furnace stays lit — be back under it
          tomorrow.
        </p>
        <p className="recovery-note">
          Furnace is a concept build — no app store, no waitlist, no tracking. Just this page,
          run hot.
        </p>
        <button type="button" className="btn-hot" onClick={() => window.scrollTo(0, 0)}>
          Run it back ↑
        </button>
      </div>

      <footer className="footer">
        <span className="footer-mark">
          FURNACE<span className="wordmark-coal" aria-hidden="true" />
        </span>
        <span>
          Set in Anybody &amp; Martian Mono · <a href={REPO_URL}>Source on GitHub</a>
        </span>
      </footer>
    </section>
  )
}
