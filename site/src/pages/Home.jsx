import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DataField from '../components/DataField.jsx'
import { BELTS } from '../data/belts.js'
import { asset } from '../data/projects.js'
import { contact } from '../data/cv.js'

/*
 * The landing.
 *
 * Exactly two screens and then it stops. The first is the name, centred, with a
 * cue. The second is the four belts. Everything is absolutely positioned inside
 * one 200svh box, including the footer, so the document is exactly that tall and
 * there is nothing to scroll past: the belts frame is the end of the page.
 *
 * Between them runs one uninterrupted fan, no gates and nothing to read. Belt
 * length no longer shows volume, because each belt is capped at two projects to
 * keep the frame; the count in the header carries that instead and links to the
 * rest on /work. That cap is also what stops this page being a second copy of
 * /work: eight projects here, all nineteen there.
 *
 * The name is not pinned. It is centred on the first screen and scrolls away
 * like any other block: the field is what stays, the type is what leaves.
 */

const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.16em]'

// Two per belt, newest first. The header keeps the true count and links onward,
// so nothing is hidden, it is just not all on the landing.
const PER_BELT = 2

// The three animated covers are video. This page shows their stills only.
const posterFor = (p) =>
  p.cover.endsWith('.webm') ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover

// /work groups by the same four belts, so every one of them can open filtered,
// Practice included. That is what makes pressing a count read as travelling
// further along the same thing rather than as landing on a different page.
const beltHref = (belt) => `/work?category=${encodeURIComponent(belt.label)}`

export default function Home() {
  const stageRef = useRef(null)
  const cueRef = useRef(null)
  const beltsRef = useRef(null)
  const [metrics, setMetrics] = useState(null)
  const [focus, setFocus] = useState(null)

  // The fan runs from the bottom of the cue to the top of the belts, and both of
  // those depend on content and viewport, so both are measured. Guessing either
  // put the strands through the cue at short viewports.
  useEffect(() => {
    const measure = () => {
      const stage = stageRef.current
      const cue = cueRef.current
      const belts = beltsRef.current
      if (!stage || !cue || !belts) return
      const box = stage.getBoundingClientRect()
      setMetrics((m) => {
        const next = {
          w: box.width,
          originY: cue.getBoundingClientRect().bottom - box.top + 38,
          beltsTop: belts.getBoundingClientRect().top - box.top,
        }
        return m && m.w === next.w && m.originY === next.originY && m.beltsTop === next.beltsTop
          ? m
          : next
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (stageRef.current) ro.observe(stageRef.current)
    if (beltsRef.current) ro.observe(beltsRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const heads = useMemo(() => {
    if (!metrics || !metrics.w) return null
    const { w, beltsTop } = metrics
    // One column on a phone: the belts become four stacked terminals, so the fan
    // still lands at four points across the width and colour ties each landing
    // to the terminal below it.
    const cols = w < 640 ? 1 : BELTS.length
    // Matches the px-6 / lg:px-10 and gap-x-6 / lg:gap-x-8 on the belts below,
    // or the caps sit off the columns they are supposed to be feeding.
    const padX = w >= 1024 ? 40 : 24
    const gap = w >= 1024 ? 32 : 24
    const inner = w - padX * 2
    const colW = (inner - gap * (cols - 1)) / cols

    // On a phone the belts are a two by two grid, so only two of the four sit at
    // the top. The caps land side by side just above the whole block instead, in
    // the order the belts appear, and colour ties each landing to its belt.
    const stacked = cols !== BELTS.length

    return BELTS.map((b, i) => ({
      id: b.id,
      x: stacked
        ? padX + (inner * (i + 0.5)) / BELTS.length
        : padX + i * (colW + gap) + colW / 2,
      y: stacked ? beltsTop - 30 : beltsTop,
      spread: stacked ? (inner / BELTS.length) * 0.6 : colW * 0.94,
    }))
  }, [metrics])

  return (
    // One screen on a phone, two from sm up. At 375 a second screen put the
    // lower belts below the fold, which broke the whole point of the frame
    // ending the page.
    <div ref={stageRef} className="relative h-[100svh] sm:h-[200svh]">
      <DataField originY={metrics?.originY ?? null} heads={heads} focus={focus} />

      {/* Centred on the first screen. The wash is a soft ellipse of the page
          ground with no edge: the type has to stay legible as it crosses the top
          of the fan on its way out, and a plate with a border would cut the
          drawing in half instead. Its horizontal bleed is capped against the
          viewport, because a flat 70px each side is wider than the page on a
          phone and pushed the whole document sideways. */}
      <div className="absolute left-1/2 top-[21svh] z-[2] w-[min(560px,88vw)] -translate-x-1/2 -translate-y-1/2 px-4 text-center sm:top-[50svh]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-[min(70px,5vw)] -inset-y-[46px] -z-10"
          style={{
            background:
              'radial-gradient(ellipse at center, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 82%, transparent) 52%, color-mix(in srgb, var(--color-paper) 0%, transparent) 100%)',
          }}
        />
        <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] font-extralight leading-[1.03] tracking-[-0.022em]">
          Charles Abi Chahine<span className="text-accent">.</span>
        </h1>
        <p className="mt-3.5 font-mono text-[0.72rem] lowercase tracking-[0.08em] text-soft">
          architect · computational designer
        </p>
        <p className="mt-5 text-[clamp(0.88rem,1.1vw,0.95rem)] font-light lowercase text-soft">
          design, computation, and the work of getting it built.
        </p>
        {/* No scroll cue on a phone: the page is one screen there, so there is
            nothing below to scroll to. The rule stays as the fan's origin. */}
        <p ref={cueRef} className={`mx-auto mt-6 w-fit border-t border-line pt-3 text-muted sm:mt-9 ${MONO}`}>
          <span className="hidden sm:inline">Scroll · </span>19 projects
          <span className="hidden sm:inline"> ↓</span>
        </p>
      </div>

      {/* The belts, anchored above the footer so the second screen ends the page.
          Two by two on a phone, four across from sm up. */}
      <div
        ref={beltsRef}
        className="absolute inset-x-0 bottom-[64px] z-[2] grid grid-cols-1 gap-y-3.5 px-6 sm:bottom-[68px] sm:grid-cols-4 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8 lg:px-10"
      >
        {BELTS.map((belt) => (
          <section
            key={belt.id}
            onMouseEnter={() => setFocus(belt.id)}
            onMouseLeave={() => setFocus(null)}
            onFocus={() => setFocus(belt.id)}
            onBlur={() => setFocus(null)}
            className="transition-opacity duration-300"
            style={{ opacity: !focus || focus === belt.id ? 1 : 0.34 }}
          >
            {/* The count is the true total, not the two shown, and it is the way
                to the rest of them. */}
            <h2 className="border-t pt-2 sm:pt-3" style={{ borderColor: belt.color }}>
              <Link
                to={beltHref(belt)}
                className="flex items-baseline gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <span className={MONO} style={{ color: belt.color }}>
                  {belt.label}
                </span>
                <span className={`ml-auto tabular-nums ${MONO} text-muted`}>
                  {String(belt.items.length).padStart(2, '0')} →
                </span>
              </Link>
            </h2>

            <ul className="mt-2 grid grid-cols-1 gap-y-5 sm:mt-4">
              {belt.items.slice(0, PER_BELT).map((p, i) => (
                // Only the lead project on a phone. Dropping the second is what
                // buys the height for one screen, and it also stops the landing
                // being a partial copy of /work there.
                <li key={p.slug} className={i === 0 ? '' : 'hidden sm:block'}>
                  <Link to={`/work/${p.slug}`} className="group flex items-center gap-3 sm:block">
                    {/* A row on a phone, a stacked card from sm up. Capped in svh
                        as well as by the column, so two covers plus a header
                        always fit the frame even on a wide, short window where
                        the column alone would be too tall. */}
                    <div className="aspect-[4/3] w-[62px] shrink-0 overflow-hidden rounded-[6px] bg-line sm:w-full sm:max-h-[26svh] sm:rounded-[8px]">
                      <img
                        src={asset(posterFor(p))}
                        alt={p.title}
                        loading="lazy"
                        draggable="false"
                        className="h-full w-full object-cover grayscale transition duration-500 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
                      />
                    </div>
                    <span className="block min-w-0 flex-1 sm:mt-2">
                      <span className="flex items-baseline gap-2">
                        <span
                          className="min-w-0 truncate text-[0.82rem] font-medium leading-snug transition-colors duration-300 group-hover:text-[var(--c)]"
                          style={{ '--c': belt.color }}
                        >
                          {p.title}
                        </span>
                        <span className={`ml-auto shrink-0 tabular-nums ${MONO} text-muted`}>
                          {p.year}
                        </span>
                      </span>
                      {/* The award, named. Always the accent, never the belt
                          colour: a distinction should read as itself, not as its
                          group, which is the same rule /work follows. The line is
                          reserved whether or not there is an award, so all four
                          belts stay aligned side by side. */}
                      {/* The reserved line keeps the four sm+ columns aligned;
                          stacked on a phone there is nothing to align to, so it
                          only takes space when there is an award to show. */}
                      <span
                        className={`mt-1 block leading-[1.35] sm:mt-1.5 sm:min-h-[1.35em] ${MONO} text-accent`}
                      >
                        {p.award && (
                          <>
                            <span className="sr-only">Awarded: </span>
                            {p.award}
                          </>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-[2] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-5 lg:px-10">
        <p className={`${MONO} text-muted`}>19 projects · 4 belts · 2023–2026</p>
        <nav className="flex gap-5">
          <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={`mailto:${contact.email}`}>Email</a>
          <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.github} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  )
}
