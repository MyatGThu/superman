// WARM-UP — the hero. The thesis is the gym's oldest sentence, set so
// large it becomes the visual: ONE MORE REP. The type itself is under
// load: lines rack up like plates on entrance (rise + width settle),
// and "REP." physically compresses as you scroll away — Anybody's
// variable width axis doing the acting.
import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import './hero.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export function Hero() {
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // All motion is opt-in: reduced-motion users get the final frame.
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Entrance: each line rises out of its mask while its width
        // settles from stretched to solid — plates sliding onto a bar.
        gsap.from('.hero-line', {
          yPercent: 110,
          fontStretch: '150%',
          duration: 1.05,
          stagger: 0.11,
          ease: 'expo.out',
          delay: 0.1,
        })
        gsap.from('.hero-sub, .hero-cta', {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.12,
          ease: 'expo.out',
          delay: 0.55,
        })
        // Scroll: the last line grinds narrower under the leaving load.
        gsap.to('.hero-line--rep', {
          fontStretch: '62%',
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom 30%',
            scrub: true,
          },
        })
      })
    },
    { scope },
  )

  return (
    <section
      className="sect hero"
      id="one-more-rep"
      data-heat="0.07"
      data-phase="WARM-UP"
      ref={scope}
    >
      <div className="sect-inner">
        <p className="data-label hero-session">Session 001 — tonight</p>
        <h1 className="hero-title">
          {/* Masks clip the rising lines during the entrance. */}
          <span className="hero-mask">
            <span className="hero-line">One</span>
          </span>
          <span className="hero-mask">
            <span className="hero-line">More</span>
          </span>
          <span className="hero-mask">
            {/* The full stop is rendered as a molten block (see hero.css) */}
            <span className="hero-line hero-line--rep">Rep</span>
          </span>
        </h1>
        <p className="hero-sub lead">
          Furnace remembers every set, names tonight&rsquo;s number, and runs your rest to the
          second. The workout log that fights back.
        </p>
        <p className="hero-cta">
          <a className="btn-hot" href="#set-01">
            Start the session
          </a>
        </p>
      </div>
    </section>
  )
}
