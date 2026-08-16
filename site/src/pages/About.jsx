import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { VIEWBOX, byId, latToY, lonToX, places } from '../data/places.js'
import { WORLD_RINGS } from '../data/world.js'
import { INSTRUMENTS, NOW, SITES, START, TIMELINE, TOUCHES, originAt } from '../data/journey.js'

const base = import.meta.env.BASE_URL

// One small uppercase size carries every label on this page.
const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.2em] font-normal'

const CLOSE_DELAY = 160

/*
 * The About page.
 *
 * The world starts unlit and scrolling draws it. Every place he lived, worked or
 * built for reveals the coastline around it, and the reveal stays, so what you
 * end with is not the Earth: it is an archipelago the shape of his reach, and
 * the dark is as truthful as the lit. No Africa. No Australia. Almost no Asia
 * until Tokyo.
 *
 * This replaced a page that was the only one on the site you could not scroll,
 * used none of the belt colours, and drew a relocation circuit whose subject was
 * travel while the rest of the site is about work. Scrolling is now the whole
 * interaction: the wheel zoom and the pinch that briefly joined it are gone,
 * because a gesture cannot both pan a map and advance a clock.
 *
 * The three layers, quietest first:
 *   the coastline   where he has been, accumulated
 *   the strands     each project at its site, tied to the desk it was made at
 *   the instruments the work with no site, ringing that desk
 */

// A region counts as reached within 26 degrees of something he touched. The
// same radius the old page used for its hover spotlight, driven by time instead.
const REVEAL_R = 26

/*
 * Every point of coastline carries the year its region is first reached, worked
 * out once at module load. Drawing a year is then a partition rather than 87,000
 * distance tests, and the results are cached per half year, so scrolling only
 * swaps a string.
 */
const RING_YEARS = WORLD_RINGS.map((ring) =>
  ring.map(([x, y]) => {
    let best = Infinity
    for (const t of TOUCHES) {
      if (Math.hypot(x - lonToX(t.lon), y - latToY(t.lat)) < REVEAL_R && t.yr < best) best = t.yr
    }
    return best
  }),
)

const coastCache = new Map()
const coastFor = (year) => {
  const key = Math.round(year * 2) / 2
  const hit = coastCache.get(key)
  if (hit !== undefined) return hit
  let d = ''
  WORLD_RINGS.forEach((ring, ri) => {
    const yrs = RING_YEARS[ri]
    let run = null
    for (let i = 0; i <= ring.length; i++) {
      const on = i < ring.length && yrs[i] <= key
      if (on && !run) run = [ring[i]]
      else if (on) run.push(ring[i])
      else if (run) {
        if (run.length > 1) d += `M${run.map((p) => `${p[0]} ${p[1]}`).join('L')}`
        run = null
      }
    }
  })
  coastCache.set(key, d)
  return d
}

/*
 * A place appears in the year he reached that place, not the year its region
 * lit. At the reveal radius, Lebanon in 2018 also lights Türkiye, Georgia and
 * Saudi Arabia, so every country he has ever visited was on the map before he
 * had been anywhere. Three degrees matches a touch to its own place and nothing
 * else.
 */
const PLACE_R = 3
const PLACE_YEAR = Object.fromEntries(
  places.map((p) => {
    let best = Infinity
    for (const t of TOUCHES) {
      if (Math.hypot(lonToX(p.lon) - lonToX(t.lon), latToY(p.lat) - latToY(t.lat)) < PLACE_R && t.yr < best) {
        best = t.yr
      }
    }
    return [p.id, best]
  }),
)

/*
 * A flight path, drawn in map units. The control point sits on the perpendicular
 * at the midpoint, displaced by a fraction of the span and always toward the top
 * of the frame, so every strand bows the same way and they read as one family
 * rather than as separate arcs.
 */
const strand = (from, to) => {
  const x1 = lonToX(from[0])
  const y1 = latToY(from[1])
  const x2 = to[0]
  const y2 = to[1]
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const bow = Math.min(len * 0.2, 26)
  const nx = -dy / len
  const ny = dx / len
  const sgn = ny > 0 ? -1 : 1
  return `M${x1} ${y1} Q${(x1 + x2) / 2 + nx * bow * sgn} ${(y1 + y2) / 2 + ny * bow * sgn} ${x2} ${y2}`
}

// Rings of Mars has a site, it is simply not on this planet, so its strand
// leaves the frame at the top right rather than pretending to a coordinate.
const OFF_WORLD = [VIEWBOX.x + VIEWBOX.w - 12, VIEWBOX.y + 8]

const YEAR_TICKS = [2018, 2020, 2022, 2024, 2026]

export default function About() {
  const wrapRef = useRef(null)
  const stageRef = useRef(null)
  const cardRef = useRef(null)
  const pinRefs = useRef({})
  const closeTimer = useRef(null)

  const [year, setYear] = useState(START)
  const pinnedRef = useRef(false)
  const [activeId, setActiveId] = useState(null)
  const active = activeId ? byId[activeId] : null

  /*
   * Scroll is the clock. The page is deliberately taller than the viewport and
   * the drawing is sticky inside it, so the distance scrolled maps onto the
   * years: reading and revealing are the same gesture, and About finally scrolls
   * like every other page on the site.
   */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onScroll = () => {
      const r = el.getBoundingClientRect()
      const travel = r.height - window.innerHeight
      const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 1
      setYear(START + p * (NOW - START))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const coast = useMemo(() => coastFor(year), [year])
  const origin = useMemo(() => originAt(year), [year])
  const shownSites = useMemo(() => SITES.filter((s) => s.yr <= year), [year])
  const shownInstruments = useMemo(() => INSTRUMENTS.filter((i) => i.yr <= year), [year])

  const clearClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const close = useCallback(() => {
    clearClose()
    pinnedRef.current = false
    setActiveId(null)
  }, [])
  const scheduleClose = useCallback(() => {
    clearClose()
    closeTimer.current = setTimeout(() => {
      if (!pinnedRef.current) setActiveId(null)
    }, CLOSE_DELAY)
  }, [])
  useEffect(() => clearClose, [])

  const isNarrow = () => window.matchMedia('(max-width: 767px)').matches

  /* Anchor the card beside its dot, flipping and clamping to stay in frame. */
  const placeCard = useCallback(() => {
    const card = cardRef.current
    const pin = activeId && pinRefs.current[activeId]
    if (!card || !pin || !stageRef.current) return
    if (isNarrow()) {
      card.style.left = ''
      card.style.top = ''
      return
    }
    const r = pin.getBoundingClientRect()
    const s = stageRef.current.getBoundingClientRect()
    const w = card.offsetWidth
    const h = card.offsetHeight
    const gap = 18
    const pad = 14
    const cx = r.left + r.width / 2 - s.left
    const cy = r.top + r.height / 2 - s.top
    let x = cx + gap
    if (x + w > s.width - pad) x = cx - gap - w
    x = Math.max(pad, Math.min(x, s.width - w - pad))
    const y = Math.max(pad, Math.min(cy - h / 2, s.height - h - pad))
    card.style.left = `${x}px`
    card.style.top = `${y}px`
  }, [activeId])

  useLayoutEffect(placeCard, [placeCard])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  const openPlace = (id) => { clearClose(); pinnedRef.current = false; setActiveId(id) }
  const pinPlace = (id) => { clearClose(); pinnedRef.current = true; setActiveId(id) }

  const tx = (y) => ((y - START) / (NOW - START)) * 100

  return (
    /*
     * Tall, so there is something to scroll. The drawing sticks to the top of
     * the viewport while the years pass underneath it, which is what makes the
     * reveal readable rather than a thing you scroll past.
     */
    <div ref={wrapRef} className="relative h-[300svh]">
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden bg-paper">
        <svg
          viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full"
          onClick={(e) => { if (e.currentTarget === e.target) close() }}
        >
          {/* The world he has reached. Everything else is not drawn at all. */}
          <path
            d={coast}
            fill="none"
            stroke="var(--color-land)"
            strokeWidth="0.55"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Each project at its site, tied back to the desk it was made at. */}
          {shownSites.map((s) => (
            <g key={s.slug}>
              <path
                d={strand(s.from, s.at ? [lonToX(s.at[0]), latToY(s.at[1])] : OFF_WORLD)}
                fill="none"
                stroke={`var(--color-${s.belt})`}
                strokeWidth="0.45"
                strokeDasharray={s.at ? undefined : '1.6 1.6'}
                opacity={s.at ? 0.55 : 0.35}
              />
              <circle
                cx={s.at ? lonToX(s.at[0]) : OFF_WORLD[0]}
                cy={s.at ? latToY(s.at[1]) : OFF_WORLD[1]}
                r="1.3"
                fill={`var(--color-${s.belt})`}
                opacity="0.9"
              />
            </g>
          ))}

          {/* The work with no site: it never leaves the desk it was made at. */}
          {shownInstruments.map((t, i) => {
            const a = -Math.PI * 0.86 + i * Math.PI * 0.34
            const cx = lonToX(origin[0]) + Math.cos(a) * 9
            const cy = latToY(origin[1]) + Math.sin(a) * 9
            return (
              <g key={t.slug}>
                <line
                  x1={lonToX(origin[0])}
                  y1={latToY(origin[1])}
                  x2={cx}
                  y2={cy}
                  stroke={`var(--color-${t.belt})`}
                  strokeWidth="0.3"
                  opacity="0.35"
                />
                <circle cx={cx} cy={cy} r="0.9" fill={`var(--color-${t.belt})`} opacity="0.9" />
              </g>
            )
          })}

          {/* Where the work is being made, this year. */}
          <circle cx={lonToX(origin[0])} cy={latToY(origin[1])} r="2.1" fill="var(--color-accent)" />

          {places.map((p) => {
            if (PLACE_YEAR[p.id] > year) return null
            const on = activeId === p.id
            const fill = p.kind === 'now' ? 'fill-accent' : p.kind === 'lived' ? 'fill-ink' : 'fill-soft'
            return (
              <g
                key={p.id}
                ref={(el) => { pinRefs.current[p.id] = el }}
                transform={`translate(${lonToX(p.lon)} ${latToY(p.lat)})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}, ${p.cities}`}
                className="cursor-pointer outline-none"
                onPointerEnter={() => openPlace(p.id)}
                onPointerLeave={scheduleClose}
                onFocus={() => openPlace(p.id)}
                onBlur={scheduleClose}
                onClick={(e) => { e.stopPropagation(); pinPlace(p.id) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinPlace(p.id) }
                }}
              >
                <circle r="3.4" fill="transparent" />
                <circle r={p.kind === 'visited' ? 0.9 : 1.3} className={fill} opacity={on ? 1 : 0.75} />
              </g>
            )
          })}
        </svg>

        {/* The lede, unchanged in job: the one thing on the page that is prose. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] px-5 pt-24 sm:px-8 lg:px-12">
          <div className="max-w-[58ch] md:max-w-[48%]">
            <p className={`${MONO} mb-4 text-muted`}>About</p>
            <h1 className="max-w-[28ch] text-balance text-[clamp(1.2rem,1.85vw,1.6rem)] font-light leading-[1.32] text-ink">
              Trained to draw buildings, went back for the machinery<span className="text-accent">.</span>
            </h1>
            <p className="mt-4 max-w-[56ch] font-serif text-[0.92rem] leading-[1.75] text-soft">
              Practice across Beirut, Dubai and Kuwait, then the MaCAD master at IAAC. Now I build the
              tools I used to ask for.
            </p>
          </div>
        </div>

        {/*
         * The clock, read rather than operated: it reports where the scroll has
         * got to. Each bar is a post or a degree from the CV, in its belt colour,
         * and it grows as the year passes over it.
         */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] px-5 pb-6 sm:px-8 lg:px-12">
          <div className="relative h-[3px] w-full rounded-full bg-line">
            {TIMELINE.map((t) => (
              <span
                key={`${t.name}-${t.from}`}
                className="absolute top-0 h-[3px] rounded-full"
                style={{
                  left: `${tx(t.from)}%`,
                  width: `${Math.max(0, tx(Math.min(t.to, year)) - tx(t.from))}%`,
                  backgroundColor: `var(--color-${t.belt})`,
                  opacity: t.from > year ? 0 : 0.85,
                }}
              />
            ))}
            <span
              className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-paper"
              style={{ left: `${tx(year)}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between">
            {YEAR_TICKS.map((y) => (
              <span key={y} className={`${MONO} tabular-nums text-muted`}>
                {y}
              </span>
            ))}
          </div>
        </div>

        <div
          ref={cardRef}
          data-card
          aria-hidden={!active}
          className={`absolute z-[7] max-h-[min(440px,68vh)] w-[296px] overflow-auto border border-line bg-paper p-[18px] pb-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none max-md:inset-x-3.5 max-md:bottom-16 max-md:top-auto max-md:max-h-[52%] max-md:w-auto ${
            active ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
          }`}
          onPointerEnter={clearClose}
          onPointerLeave={scheduleClose}
        >
          {active && (
            <>
              <p className={`${MONO} mb-2.5 text-accent`}>{active.tag}</p>
              <h2 className="mb-1.5 text-[0.98rem] font-light leading-tight text-ink">{active.name}</h2>
              <p className={`${MONO} mb-3.5 text-muted`}>{active.cities}</p>
              {active.photo && (
                <img
                  src={`${base}${active.photo}`}
                  alt={active.kind === 'now' ? 'Charles Abi Chahine' : active.name}
                  width="296"
                  height="112"
                  decoding="async"
                  className="mb-3.5 block h-28 w-full object-cover"
                />
              )}
              {active.stints?.length > 0 && (
                <dl className="mb-3.5">
                  {active.stints.map(([years, org, capacity]) => (
                    <div key={`${years}-${org}`} className="pb-2.5">
                      <dt className={`${MONO} mb-1 tabular-nums text-muted`}>{years}</dt>
                      <dd className="m-0 text-[0.78rem] font-light leading-snug text-ink">
                        {org}
                        <span className="mt-0.5 block text-muted">{capacity}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {active.note && (
                <p className="m-0 font-serif text-[0.85rem] leading-[1.7] text-soft">{active.note}</p>
              )}
              <Link to="/cv" className={`${MONO} mt-4 inline-block text-muted transition-colors hover:text-accent`}>
                Full record → CV
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
