import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SliceHero from '../components/SliceHero.jsx'
import { asset, projects } from '../data/projects.js'
import { contact } from '../data/cv.js'

/*
 * The landing, as a print.
 *
 * The page itself is an ordinary document: the slice field for a screen, then a
 * red seam, then the eight most recent projects laid out on the print bed. The
 * field un-builds as it scrolls past the seam — infill first, then the inner
 * shells — so the artwork is taken apart at the print head and the work is what
 * the head leaves behind.
 *
 * The bed is drawn in /work's own language: same corner radius, same 4/3 frame,
 * same caption under the image, same greyscale that lifts on hover. Which is
 * what makes the transition cheap — the tiles never change their appearance,
 * only where they are.
 *
 * That transition is spent on intent rather than on scroll distance. Ask for the
 * work — the nav pill, the link under the bed, the one in the name block, any
 * link to /work at all — and the bed lifts and lays itself on its side: the
 * front row travels into the horizontal strip /work is already built as, the
 * back row falls away, /work's header and scrubber arrive underneath, and only
 * then does the address change. The last frame of this page is the first frame
 * of that one.
 *
 * Below lg, and under prefers-reduced-motion, the link is just a link: a phone
 * has no filmstrip to land on, and an animation nobody asked for is exactly what
 * the reduced-motion preference is asking not to see.
 */

// Eight: one full 4×2 bed, and as it happens everything from the current year.
// Deliberately a slice of the sorted list rather than a filter on the year — the
// bed has to stay eight whatever gets added next.
const BED = projects.slice(0, 8)

const isAnimated = (p) => p.cover.endsWith('.webm')
const posterFor = (p) => (isAnimated(p) ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover)

const CATEGORY_COLOR = {
  'Computation & AI': 'var(--color-accent)',
  'BIM & Workflows': 'var(--color-blue)',
  'Design & Research': 'var(--color-green)',
}

const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.16em]'

// /work's measurements, so the tiles land on them exactly. The strip height is
// the same clamp its tiles are built with; the gutter and the page inset are the
// same 24 and 40. Change them there and they have to change here.
const STRIP_GAP = 24
const STRIP_INSET = 40
const stripHeight = (H) => Math.max(250, Math.min(H * 0.38, 400))

const LIFT_MS = 620

const canMorph = () =>
  window.matchMedia('(min-width: 1024px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Caption({ p }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="h-[7px] w-[7px] shrink-0 -translate-y-px rounded-[2px]"
        style={{ backgroundColor: CATEGORY_COLOR[p.category] }}
      />
      <h2 className="min-w-0 truncate text-[0.82rem] font-medium text-ink transition-colors duration-300 group-hover:text-[var(--c)]">
        {p.title}
      </h2>
      {/* The award, named. A star said only that something had happened; the
          words are the part worth skimming. Always the accent, never the
          category colour: a distinction should read as itself, not as its
          group.

          Its own line until lg, inline after. A tile narrower than about 340px
          cannot hold the longest title and the longest award on one line, and
          it is the title that gets cut: "Rings of Mars: Ring 4000" loses the
          number, which is the half that identifies it. Wrapping costs a line
          only on the tiles that earned one. */}
      {p.award && (
        <span className={`order-last w-full shrink-0 lg:order-none lg:w-auto ${MONO} text-accent`}>
          <span className="sr-only">Awarded: </span>
          {p.award}
        </span>
      )}
      <span className={`ml-auto shrink-0 tabular-nums ${MONO} text-muted`}>{p.year}</span>
    </>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const bedRef = useRef(null)
  const wearRef = useRef(0)
  const leaving = useRef(false)

  // The field un-builds as the landing scrolls past the seam. Read live by the
  // canvas loop off the ref, so this never re-renders anything.
  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current?.offsetHeight || window.innerHeight
      wearRef.current = Math.max(0, Math.min(1, window.scrollY / h))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // Capture phase, on the document: this has to catch the nav pill in the
    // Dynamic Island as much as the links on this page, and that pill belongs to
    // a component the landing has no other hold on.
    const onClick = (e) => {
      if (leaving.current) return
      // Modified clicks are a request for a new tab, not for a transition.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest?.('a')
      if (!a || a.target === '_blank') return
      if (new URL(a.href, location.href).pathname.replace(/\/$/, '') !== '/work') return
      if (!canMorph() || !bedRef.current) return

      const tiles = [...bedRef.current.querySelectorAll('[data-tile]')]
      const rects = tiles.map((el) => el.getBoundingClientRect())
      // Nothing to lift if the bed has not been reached: a tile flying in from
      // two screens away is not a transition, it is a distraction.
      if (rects[0].top > window.innerHeight) return

      e.preventDefault()
      leaving.current = true
      lift(tiles, rects, () => navigate('/work'))
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate])

  return (
    <>
      <div ref={heroRef}>
        <SliceHero progressRef={wearRef} />
      </div>

      {/* The print head: where the drawing stops and the work starts. */}
      <div className="relative h-0 border-t border-accent">
        <span className={`absolute left-6 top-2.5 lg:left-10 ${MONO} text-accent`}>Print head</span>
        <span className={`absolute right-6 top-2.5 lg:right-10 ${MONO} text-accent`}>
          Recent work · {String(BED.length).padStart(2, '0')} of {projects.length}
        </span>
      </div>

      {/*
        Exactly one screen, footer included. With the footer outside it the page
        ran on for its height past the point where everything was already in
        view: the last stretch of scroll showed nothing new and ended with the
        Dynamic Island sitting on top of the first row of covers. Pulling the
        footer inside makes the bottom of the scroll the bottom of the bed, and
        the top padding is what keeps the island clear of the covers when you
        get there.
      */}
      <section
        ref={bedRef}
        className="flex flex-col px-6 pb-10 pt-16 lg:min-h-[100svh] lg:px-10 lg:pb-0 lg:pt-[76px]"
      >
        <h1 className="sr-only">Selected work</h1>
        <div className="flex flex-1 flex-col justify-center">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-9">
          {BED.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/work/${p.slug}`}
                data-tile
                className="group block"
                style={{ '--c': CATEGORY_COLOR[p.category] }}
              >
                <span className="block aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-line">
                  <img
                    src={asset(posterFor(p))}
                    alt={p.title}
                    loading="lazy"
                    draggable="false"
                    className="h-full w-full object-cover grayscale transition duration-500 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                  />
                </span>
                <span className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <Caption p={p} />
                </span>
              </Link>
            </li>
          ))}
        </ul>

          <div className="mt-12 lg:mt-10">
            <Link
              to="/work"
              className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] lowercase tracking-[0.18em] text-accent transition-opacity hover:opacity-70"
            >
              all {projects.length} projects <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <footer className="mt-12 flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 lg:mt-0">
          <p className={`${MONO} text-muted`}>Selected Work · Charles Abi Chahine</p>
          <nav className="flex gap-5">
            <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={`mailto:${contact.email}`}>Email</a>
            <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.github} target="_blank" rel="noreferrer">GitHub</a>
          </nav>
        </footer>
      </section>
    </>
  )
}

/*
 * The lift. Clones ride over the page rather than the tiles themselves moving:
 * taking the real ones out of flow would collapse the grid behind them, and the
 * reflow would be the most visible thing on screen. The clones carry their own
 * markup, so radius, caption and type all travel unchanged — the transition is
 * position and nothing else.
 *
 * Driven by the Web Animations API rather than CSS transitions. A transition
 * only fires if the browser has computed the starting style before the ending
 * one, which for a node created and mutated in the same task is a race — and one
 * the wash lost, so the old page stayed visible underneath the whole flight.
 * An animation with explicit keyframes cannot lose that race, and its `finished`
 * promise is a better cue for the route change than a timer guessing at it.
 */
function lift(tiles, rects, done) {
  const H = window.innerHeight
  const sh = stripHeight(H)
  const sw = (sh * 4) / 3
  // Where /work's own flex column settles the strip: centred in the viewport,
  // less the three pixels its scrubber and footer pull it up by. Measured rather
  // than derived, and constant at every viewport height tested.
  const top = (H - sh) / 2 - 3

  const stage = document.createElement('div')
  stage.dataset.lift = ''
  stage.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none'

  // The page dissolves to paper under the clones, so everything that is not
  // making the journey leaves quietly instead of scrolling or blinking out.
  const wash = document.createElement('div')
  wash.style.cssText = 'position:absolute;inset:0;background:var(--color-paper);opacity:0'
  stage.appendChild(wash)

  const flyers = tiles.map((el, i) => {
    const r = rects[i]
    const node = el.cloneNode(true)
    node.removeAttribute('href')
    const box = document.createElement('div')
    box.dataset.flyer = i
    box.style.cssText = `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px`
    box.appendChild(node)
    stage.appendChild(box)
    return box
  })

  // /work's header and scrubber, arriving under the strip the tiles are forming.
  const arriving = document.createElement('div')
  arriving.style.cssText = 'position:absolute;inset:0;opacity:0'
  arriving.innerHTML = `
    <div style="position:absolute;left:${STRIP_INSET}px;top:78px;display:flex;gap:14px;align-items:baseline;
      font-family:var(--font-mono);font-size:.56rem;text-transform:uppercase;letter-spacing:.16em">
      <span style="color:var(--color-ink)">Work</span>
      <span style="color:var(--color-muted);font-variant-numeric:tabular-nums">${projects.length} Projects</span>
    </div>
    <div style="position:absolute;left:${STRIP_INSET}px;right:${STRIP_INSET}px;top:${top + sh + 64}px;
      height:4px;border-radius:999px;background:var(--color-line)">
      <span style="position:absolute;left:0;top:0;height:100%;width:210px;border-radius:999px;background:var(--color-soft)"></span>
    </div>`
  stage.appendChild(arriving)

  document.body.appendChild(stage)

  const hold = { fill: 'forwards', easing: 'ease-out' }
  wash.animate([{ opacity: 0 }, { opacity: 1 }], { ...hold, duration: 200 })
  arriving.animate([{ opacity: 0 }, { opacity: 1 }], { ...hold, duration: 240, delay: LIFT_MS - 260 })

  const travelling = flyers.map((box, i) => {
    if (i >= 4) {
      // The back row's places on the strip are all off the right edge. Rather
      // than send it through the front row to get there, it falls away.
      return box.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(26px)' },
        ],
        { ...hold, duration: 300 }
      )
    }
    const r = rects[i]
    return box.animate(
      [
        { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` },
        { left: `${STRIP_INSET + i * (sw + STRIP_GAP)}px`, top: `${top}px`, width: `${sw}px` },
      ],
      { ...hold, duration: LIFT_MS, easing: 'cubic-bezier(.4,0,.2,1)' }
    )
  })

  // Whichever arrives first, and only once. `finished` is the accurate cue, but
  // an animation in a tab the browser has stopped compositing never finishes at
  // all — and the fallback is the difference between a transition and a visitor
  // stranded behind a white overlay with no way back.
  let spent = false
  const land = () => {
    if (spent) return
    spent = true
    done()
    // Left standing until the next route has painted, so the strip it hands
    // over to is already underneath and the swap has nothing to show.
    setTimeout(() => stage.remove(), 120)
  }
  Promise.all(travelling.map((a) => a.finished)).then(land, land)
  setTimeout(land, LIFT_MS + 220)
}
