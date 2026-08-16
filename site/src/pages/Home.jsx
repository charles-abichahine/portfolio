import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ProjectLink from '../components/ProjectLink.jsx'
import DataField from '../components/DataField.jsx'
import { BELTS } from '../data/belts.js'
import { asset } from '../data/projects.js'
import { summary } from '../data/cv.js'

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
    /*
     * Two screens everywhere, phones included. This used to collapse to one
     * screen below sm, which meant a phone got the name and all four belts at
     * once: no scroll, no fan to speak of, and none of the thing this page is
     * for. What made that necessary was two projects per belt; at one each the
     * belts fit the second screen with room over.
     *
     * On a phone the height is one screen plus a fixed run rather than two
     * screens, because two screens of a phone are two very different distances
     * depending on which way it is held. Portrait gave the fan 760px to cross
     * and landscape 241px, so the same drawing read as stretched one way and
     * squashed the other. A fixed run makes it about 470px in both, which is
     * also why the page gets shorter in portrait and longer in landscape.
     *
     * A laptop keeps 200svh: there the two are close enough already.
     */
    <div
      ref={stageRef}
      className="relative h-[calc(100svh+560px-var(--footer-h))] sm:h-[calc(200svh-var(--footer-h))] [@media(min-width:640px)_and_(max-height:520px)]:h-[calc(100svh+560px-var(--footer-h))]"
    >
      <DataField originY={metrics?.originY ?? null} heads={heads} focus={focus} />

      {/* Centred on the first screen. The wash is a soft ellipse of the page
          ground with no edge: the type has to stay legible as it crosses the top
          of the fan on its way out, and a plate with a border would cut the
          drawing in half instead. Its horizontal bleed is capped against the
          viewport, because a flat 70px each side is wider than the page on a
          phone and pushed the whole document sideways. */}
      <div className="absolute left-1/2 top-[50svh] z-[2] w-[min(560px,88vw)] -translate-x-1/2 -translate-y-1/2 px-4 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-[min(70px,5vw)] -inset-y-[46px] -z-10"
          style={{
            background:
              'radial-gradient(ellipse at center, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 82%, transparent) 52%, color-mix(in srgb, var(--color-paper) 0%, transparent) 100%)',
          }}
        />
        {/* font-light, not lighter: Space Grotesk stops at 300, and asking for a
            weight it does not have just gets 300 with the browser guessing. */}
        <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.03] tracking-[-0.024em]">
          Charles Abi Chahine<span className="text-accent">.</span>
        </h1>
        <p className="mt-3.5 font-mono text-[0.72rem] lowercase tracking-[0.08em] text-soft">
          architect · computational designer
        </p>
        {/* The one sentence on the landing, so it is set as one: the serif here
            is what tells you the rest of the site has writing in it. */}
        <p className="mt-5 font-serif text-[clamp(0.95rem,1.2vw,1.05rem)] leading-[1.6] text-soft">
          {summary}
        </p>
        {/* The cue reads the same everywhere now that a phone has a second
            screen to scroll to. The rule under it is also the fan's origin. */}
        <p ref={cueRef} className={`mx-auto mt-6 w-fit border-t border-line pt-3 text-muted sm:mt-9 ${MONO}`}>
          Scroll · 19 projects ↓
        </p>
      </div>

      {/* The belts, anchored above the footer so the second screen ends the page.
          Two by two on a phone, four across from sm up. */}
      <div
        ref={beltsRef}
        className="absolute inset-x-0 bottom-6 z-[2] grid grid-cols-1 gap-y-3.5 px-6 sm:bottom-7 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8 lg:px-10"
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
                // Only the lead project on a phone, in either orientation.
                // Stacked, the second one is what pushed the belts past the
                // second screen; in landscape it is worse, because a phone on
                // its side has about 390px of height and two covers per column
                // put the belt headers above the fold, so the frame leaked onto
                // the first screen. The height query catches a phone lying down
                // without touching a tablet, which has the room for both.
                <li
                  key={p.slug}
                  className={
                    i === 0
                      ? ''
                      : 'hidden sm:block [@media(min-width:640px)_and_(max-height:520px)]:hidden'
                  }
                >
                  <ProjectLink slug={p.slug} className="group flex items-center gap-3 sm:block">
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
                  </ProjectLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Nothing in the footer's middle. The count used to sit there, but the
          capsule it now takes is an object on the page rather than a line in a
          band, and an object has to earn its place: /work and /cv put a file in
          theirs, and this one was restating a number the cue at the top of the
          page and the four belt headers below it both already give. */}
    </div>
  )
}
