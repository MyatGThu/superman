// Page composition. The page IS a training session, so sections are
// arranged in workout order: warm-up → three working sets → peak →
// cool-down → recovery. Each declares its own temperature (data-heat)
// and phase label; the shared heat controller reads them at scroll time.
import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createHeatController } from './lib/heat'
import { EffortHud } from './components/EffortHud'
import { Hero } from './sections/Hero'
import { SetLog } from './sections/SetLog'
import { SetEngine } from './sections/SetEngine'
import { SetClock } from './sections/SetClock'
import { Lab } from './sections/Lab'
import { Peak } from './sections/Peak'
import { Proof } from './sections/Proof'
import { Recovery } from './sections/Recovery'

export default function App() {
  // Lazy init: one controller instance for the app's lifetime. It is
  // passed down as a stable prop — its identity never changes, so it
  // never causes re-renders.
  const [controller] = useState(createHeatController)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const detach = controller.attach(mainRef.current!)
    // Variable fonts shift layout when they land; re-measure sections then.
    document.fonts.ready.then(() => ScrollTrigger.refresh())
    return detach
  }, [controller])

  return (
    <>
      <a className="skip-link" href="#set-01">
        Skip to the work
      </a>

      <header className="topbar">
        <a className="wordmark" href="#one-more-rep" aria-label="Furnace — back to top">
          FURNACE<span className="wordmark-coal" aria-hidden="true" />
        </a>
      </header>

      <main ref={mainRef}>
        <Hero />
        <SetLog />
        <SetEngine />
        <SetClock />
        <Lab />
        <Peak />
        <Proof />
        <Recovery />
      </main>

      <EffortHud controller={controller} />
    </>
  )
}
