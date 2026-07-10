// COOL-DOWN — THE PROOF. Testimonials written the way the app would
// hold them: as log entries. Week/day stamps are the structure, not
// decoration. Entries reveal with a small stagger — the one place a
// list stagger is honest, because it IS a list.
//
// Reveal pattern: content is visible by default; a `js-anim` class is
// added only when JS + motion are available, and IntersectionObserver
// flips `is-in`. No JS, no motion preference, headless renderer —
// everyone still gets the content.
import { useEffect, useRef } from 'react'
import './proof.css'

const ENTRIES = [
  {
    stamp: 'W14 · D3',
    quote: 'Squat 140×5 moved like W8’s 125. The engine knew before I did.',
    who: 'Mara — 2 yr under the bar',
  },
  {
    stamp: 'W02 · D1',
    quote: 'It gave me 62.5 when I wanted 70. I hate that it was right.',
    who: 'Dev — 6 mo',
  },
  {
    stamp: 'W31 · D4',
    quote: '90 seconds means 90. My last sets stopped dying.',
    who: 'Ona — 3 yr',
  },
  {
    stamp: 'W09 · D2',
    quote: 'Bench stalled twice. It cut my volume, then the bar moved again.',
    who: 'Rafa — 1 yr',
  },
  {
    stamp: 'W22 · D5',
    quote: 'I stopped negotiating with myself. The number is the number.',
    who: 'Kit — 4 yr',
  },
]

export function Proof() {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const list = listRef.current!
    list.classList.add('js-anim')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          list.classList.add('is-in')
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(list)
    return () => io.disconnect()
  }, [])

  return (
    <section className="sect proof" data-heat="0.45" data-phase="COOL-DOWN">
      <div className="sect-inner">
        <h2>
          Written
          <br />
          in chalk.
        </h2>
        <ul className="proof-list" ref={listRef}>
          {ENTRIES.map((e, i) => (
            <li className="proof-entry" style={{ '--i': i } as React.CSSProperties} key={e.stamp}>
              <span className="data-label proof-stamp">{e.stamp}</span>
              <blockquote>
                <p>{e.quote}</p>
                <footer className="proof-who">{e.who}</footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
