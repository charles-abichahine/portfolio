import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContactMarks } from '../components/Footer.jsx'
import { LAND_ROWS, VIEWBOX, byId, latToY, lonToX, places } from '../data/places.js'
import { NOW, SITES, START, TIMELINE, TOUCHES, deskName } from '../data/journey.js'

const base = import.meta.env.BASE_URL

// One small uppercase size carries every label on this page. 0.6875rem, the
// site's floor for anything informational: at 0.56rem this was 8.96px, and it
// sets the map's site names, the rail's years and everything in the place card,
// which is most of the reading on the page. Nothing collides at the new size —
// the site names are revealed one at a time on hover rather than all at once,
// and the five year ticks sit a quarter of the rail apart, which is twice the
// width of the widest of them.
const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em] font-normal'

const CLOSE_DELAY = 160

/*
 * The About page.
 *
 * The world is paper, not a drawing. The dot matrix sits well under everything
 * as the texture the strands lie on, and nothing is revealed or drawn as you
 * arrive: the page is whole the moment it loads.
 *
 * The strands are the landing's, and drawn its way rather than merely looking
 * like it. Every carrier is stroked twice — once as a continuous ink line at
 * about 8% alpha, then the same path again with a dash of 90 on and 260 off
 * whose offset advances with time, which is the pulse travelling. Colour is the
 * exception: roughly one carrier in nine takes its belt hue at rest, and the
 * others only take colour when you point at the thing they end at. An earlier
 * version of this page had them flat, static and coloured all the time, which
 * is the opposite of the drawing it was supposed to match.
 *
 * Each project's strands run from the desk it was made at to the place it is
 * about, so the shape on screen is the reach: short hops in Beirut and Dubai,
 * and from Barcelona a fan to Tokyo, Moscow, London, Santiago and Punta Arenas.
 */

// How many carriers each project gets. Mass is meaning here, as on the landing:
// a project with more strands is not more important, it is simply drawn thicker
// so the fan reads as a current rather than as seven lines.
const PER_SITE = 3

// Rings of Mars has a site, it is simply not on this planet. Its strand leaves
// the frame rather than pretending to a coordinate.
const OFF_WORLD = { lon: 168, lat: 78 }

/*
 * One line. The posts used to be dealt into four lanes so that overlapping ones
 * could not paint over each other, which was true to the record and made four
 * stacked rails out of what a reader takes in as a single span of time. They
 * share the line now, and the overlaps read as the denser colour they are.
 *
 * Longest first, so the short posts land on top of the long ones rather than
 * under them: a term inside a degree is the thing you would want to point at,
 * and painting it last is what keeps it reachable.
 */
const LANES = [...TIMELINE].sort((a, b) => b.to - b.from - (a.to - a.from))
const LANE_H = 3
const YEAR_TICKS = [2018, 2020, 2022, 2024, 2026]

/*
 * The year a place is first reached. Three degrees, not the wide radius a
 * region reveal would use: at anything larger a single 2018 touch in Lebanon
 * also matches Türkiye, Georgia and Saudi Arabia, and every country he has
 * visited appears before he has been anywhere.
 */
const PLACE_R = 3
const PLACE_YEAR = Object.fromEntries(
  places.map((p) => {
    // A place that states its year is taken at its word. The search below is
    // the fallback, and it is why two dots used to be missing: see places.js.
    if (p.year) return [p.id, p.year]
    let best = Infinity
    for (const t of TOUCHES) {
      if (Math.hypot(lonToX(p.lon) - lonToX(t.lon), latToY(p.lat) - latToY(t.lat)) < PLACE_R && t.yr < best) {
        best = t.yr
      }
    }
    return [p.id, best]
  }),
)

// A strand fades in over its first third of a year rather than snapping on.
const ARRIVE = 0.34
// Placed at their own years. A flex row with justify-between spaces labels
// evenly, which has nothing to do with time: 2026 landed at 99% of the rail
// while the year itself is at 93%.
const tx = (y) => ((y - START) / (NOW - START)) * 100

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The land, as points, once. Rasterised into its own layer at paint time.
const LAND_PTS = (() => {
  const out = []
  for (let j = 0; j < LAND_ROWS.length; j++) {
    const cy = VIEWBOX.y + j * 2.5
    for (let i = 0; i < LAND_ROWS[j].length; i++) {
      if (LAND_ROWS[j][i] === '1') out.push([i * 2.5, cy])
    }
  }
  return out
})()

export default function About() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const cardRef = useRef(null)
  const pinRefs = useRef({})
  const closeTimer = useRef(null)

  const [box, setBox] = useState({ w: 0, h: 0 })
  const [activeId, setActiveId] = useState(null)
  const pinnedRef = useRef(false)
  const active = activeId ? byId[activeId] : null

  // Read live by the canvas loop, so pointing at a project never re-renders.
  /*
   * The timeline is the clock, and it is the only thing on this page that
   * scrolls. The page itself does not: it was 300svh with the drawing sticky
   * inside it, which pushed the footer three screens down and made reading the
   * page and winding the clock the same gesture whether you wanted it or not.
   *
   * It opens at the present, complete, and you wind back. Opening at 2018 meant
   * arriving at an almost empty screen, which is a poor first impression of a
   * drawing whose whole point is how much there is by the end.
   *
   * The canvas reads the year from a ref so a scrub never re-renders it; the
   * rail is React and takes a rounded copy.
   */
  const yearRef = useRef(NOW)
  const [year, setYear] = useState(NOW)
  const railRef = useRef(null)

  // Read live by the canvas loop, so pointing at a project never re-renders the
  // drawing; the label beside the rail is React and needs the state copy.
  const focusRef = useRef(null)
  const [focusLabel, setFocusLabel] = useState(null)

  const setClock = useCallback((y) => {
    const clamped = Math.min(NOW, Math.max(START, y))
    yearRef.current = clamped
    setYear(Math.round(clamped * 50) / 50)
  }, [])

  /*
   * Wheel and drag, both on the rail alone. The wheel listener is registered
   * natively because preventDefault has to hold, and React's onWheel is passive:
   * without it the page behind would scroll on a trackpad even though there is
   * nowhere for it to go.
   */
  useEffect(() => {
    const el = railRef.current
    const stage = stageRef.current
    if (!el || !stage) return
    const span = NOW - START

    /*
     * The wheel is taken on the whole page, not just on the rail. The document
     * has nothing to scroll — the drawing is one screen and the footer sits
     * under it — so a scroll gesture would otherwise do nothing at all. Here it
     * winds the clock, which is the one thing on the page that has a length.
     * preventDefault has to hold for that, which is why this is a native
     * listener: React's onWheel is passive.
     */
    const onWheel = (e) => {
      e.preventDefault()
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      setClock(yearRef.current + (d / 400) * span)
    }
    const fromX = (clientX) => {
      const r = el.getBoundingClientRect()
      setClock(START + ((clientX - r.left) / r.width) * span)
    }
    let dragging = false
    const onDown = (e) => { dragging = true; el.setPointerCapture?.(e.pointerId); fromX(e.clientX) }
    const onMove = (e) => { if (dragging) fromX(e.clientX) }
    const onUp = () => { dragging = false }

    stage.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      stage.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [setClock])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox((b) => (b.w === r.width && b.h === r.height ? b : { w: r.width, h: r.height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /*
   * The projection, in the stage's own pixels rather than in a viewBox, because
   * the canvas and the dots have to agree and only one of them can have a
   * viewBox. Everything positioned on this page goes through X and Y.
   */
  const fit = (() => {
    const { w, h } = box
    if (!w || !h) return null
    // The island is all that sits at the top now, so the drawing starts under
    // it. The foot has to clear the rail and leave the writing in the corner
    // room to sit against, though it is allowed to overlap the drawing the way
    // it always did at the top: the map is a ground, not a panel.
    const top = w < 768 ? 110 : 96
    const bottom = 70 + LANE_H + 26 + (w < 768 ? 168 : 62)
    const s = Math.min((w - 48) / VIEWBOX.w, (h - top - bottom) / VIEWBOX.h)
    const ox = (w - VIEWBOX.w * s) / 2
    const oy = top + (h - top - bottom - VIEWBOX.h * s) / 2
    return {
      s,
      X: (lon) => ox + (lonToX(lon) - VIEWBOX.x) * s,
      Y: (lat) => oy + (latToY(lat) - VIEWBOX.y) * s,
    }
  })()

  /* ---- the drawing ---- */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !fit || !box.w) return

    const { w, h } = box
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = w * dpr
    cv.height = h * dpr
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)

    const rnd = mulberry32(7)
    const carriers = []
    for (const site of SITES) {
      const to = site.at ? { lon: site.at[0], lat: site.at[1] } : OFF_WORLD
      const tx = fit.X(to.lon)
      const ty = fit.Y(to.lat)
      for (let k = 0; k < PER_SITE; k++) {
        const jx = fit.X(site.from[0]) + (rnd() - 0.5) * 7
        const jy = fit.Y(site.from[1]) + (rnd() - 0.5) * 7
        const dx = tx - jx
        const dy = ty - jy
        const len = Math.hypot(dx, dy) || 1
        const bow = Math.min(len * 0.22, 140) * (0.85 + rnd() * 0.3)
        const nx = -dy / len
        const ny = dx / len
        const sgn = ny > 0 ? -1 : 1
        const p = new Path2D()
        p.moveTo(jx, jy)
        p.quadraticCurveTo((jx + tx) / 2 + nx * bow * sgn, (jy + ty) / 2 + ny * bow * sgn, tx, ty)
        carriers.push({
          path: p,
          yr: site.yr,
          slug: site.slug,
          belt: site.belt,
          tinted: rnd() < 0.11,
          weight: 0.6 + rnd() * 0.45,
          phase: rnd() * 400,
          speed: 14 + rnd() * 22,
        })
      }
    }

    /*
     * The palette is read when the theme changes, not every frame:
     * getComputedStyle forces style resolution, and sixty of those a second is
     * most of what a canvas this size can afford. The land is rasterised into
     * its own layer for the same reason — 2,400 arcs a frame is not a texture,
     * it is a bill.
     */
    const readPal = () => {
      const s = getComputedStyle(document.documentElement)
      const g = (n) => s.getPropertyValue(n).trim()
      return {
        ink: g('--color-ink'),
        land: g('--color-land'),
        dark: document.documentElement.getAttribute('data-theme') === 'dark',
        belt: {
          accent: g('--color-accent'),
          blue: g('--color-blue'),
          green: g('--color-green'),
          amber: g('--color-amber'),
        },
      }
    }

    let pal = readPal()
    let landLayer = null
    const repaint = () => {
      pal = readPal()
      landLayer = null
    }
    const mo = new MutationObserver(repaint)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    let visible = true
    const io = new IntersectionObserver((rows) => rows.forEach((r) => { visible = r.isIntersecting }), {
      rootMargin: '160px',
    })
    io.observe(cv)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let raf = 0

    /*
     * The frame, drawn on demand. Split out of the loop so it can also run once,
     * synchronously, the moment the canvas exists: requestAnimationFrame does
     * not fire in a hidden or throttled tab, and without a first paint the page
     * is a blank rectangle until the tab is looked at.
     */
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)

      if (!landLayer) {
        landLayer = document.createElement('canvas')
        landLayer.width = w * dpr
        landLayer.height = h * dpr
        const m = landLayer.getContext('2d')
        m.scale(dpr, dpr)
        m.fillStyle = pal.land
        m.globalAlpha = pal.dark ? 0.1 : 0.13
        for (const [px, py] of LAND_PTS) {
          m.beginPath()
          m.arc(fit.X(px - 180), fit.Y(90 - py), 0.7 * Math.max(1, fit.s), 0, Math.PI * 2)
          m.fill()
        }
      }
      ctx.drawImage(landLayer, 0, 0, w, h)

      const yr = yearRef.current
      const f = focusRef.current
      if (pal.dark) ctx.globalCompositeOperation = 'lighter'
      for (const c of carriers) {
        // Nothing before its time, and an arrival is a fade rather than a snap.
        if (c.yr > yr) continue
        const arrived = Math.min(1, (yr - c.yr) / ARRIVE)
        const chosen = f && f.includes(c.slug)
        ctx.strokeStyle = chosen || c.tinted ? pal.belt[c.belt] : pal.ink
        ctx.lineWidth = chosen ? c.weight * 1.5 : c.weight
        const baseA = chosen
          ? pal.dark
            ? 0.5
            : 0.42
          : f
            ? 0.028
            : (pal.dark ? 0.1 : 0.085) * (c.tinted ? 1.6 : 1)
        ctx.globalAlpha = baseA * arrived
        ctx.setLineDash([])
        ctx.stroke(c.path)
        if (!reduce) {
          ctx.globalAlpha = (chosen ? baseA * 1.5 : f ? 0.04 : baseA * 1.7) * arrived
          ctx.setLineDash([90, 260])
          ctx.lineDashOffset = -(c.phase + t * c.speed)
          ctx.stroke(c.path)
        }
      }
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }
    // One frame now, then the loop.
    draw(0)
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      draw((now - t0) / 1000)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      io.disconnect()
    }
  }, [box, fit])

  /* ---- the place cards, unchanged in job ---- */
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

  /*
   * A press on a dot pins its card open; a press anywhere else puts it away.
   * Without this the pin had no release except Escape or another dot, so a
   * pinned card followed you around the page. The dots are excluded because
   * pressing one is how you open the next card, and the card is excluded so
   * that reading it, or following its link, is not a way to dismiss it.
   */
  useEffect(() => {
    if (!activeId) return
    const onDown = (e) => {
      if (e.target.closest?.('[data-card]') || e.target.closest?.('[data-place]')) return
      close()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [activeId, close])

  const openPlace = (id) => { clearClose(); pinnedRef.current = false; setActiveId(id) }
  const pinPlace = (id) => { clearClose(); pinnedRef.current = true; setActiveId(id) }

  const lookAt = (slugs, label) => {
    focusRef.current = slugs
    setFocusLabel(label)
  }

  // Everything made at the desk a post sat at, so pointing at IAAC lights the
  // five projects that came out of it. This is what ties the rail to the map:
  // otherwise they are two drawings that happen to share a page.
  const madeDuring = (t) =>
    SITES.filter((x) => x.from[0] === t.lon && x.from[1] === t.lat).map((x) => x.slug)
  const lookAway = () => {
    focusRef.current = null
    setFocusLabel(null)
  }

  return (
    <div ref={stageRef} className="relative min-h-0 w-full flex-1 overflow-hidden bg-paper">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* The dots sit above the canvas as real elements rather than as painted
          pixels, so a place is still a button a keyboard can reach and a screen
          reader can name. */}
      {fit && (
        <div className="absolute inset-0">
          {places.map((p) => {
            if (PLACE_YEAR[p.id] > year) return null
            const on = activeId === p.id
            const tone = p.kind === 'now' ? 'bg-accent' : p.kind === 'lived' ? 'bg-ink' : 'bg-soft'
            const size = p.kind === 'now' ? 9 : p.kind === 'lived' ? 7 : 5
            return (
              <button
                key={p.id}
                type="button"
                data-place
                ref={(el) => { pinRefs.current[p.id] = el }}
                aria-label={`${p.name}, ${p.cities}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-[7px] outline-none"
                style={{
                  left: fit.X(p.lon) + (p.nudge?.[0] ?? 0),
                  top: fit.Y(p.lat) + (p.nudge?.[1] ?? 0),
                }}
                onPointerEnter={() => openPlace(p.id)}
                onPointerLeave={scheduleClose}
                onFocus={() => openPlace(p.id)}
                onBlur={scheduleClose}
                onClick={() => pinPlace(p.id)}
              >
                <span
                  className={`block rounded-full ${tone} transition-opacity`}
                  style={{ width: size, height: size, opacity: on ? 1 : 0.7 }}
                />
              </button>
            )
          })}

          {/* Where the work is. Pointing at one lights its strands back to the
              desk it was made at, which is the whole drawing in one gesture. */}
          {SITES.map((s) => {
            if (s.yr > year) return null
            const to = s.at ? { lon: s.at[0], lat: s.at[1] } : OFF_WORLD
            const lit = focusLabel === s.name
            return (
              <button
                key={s.slug}
                type="button"
                aria-label={`${s.name}, made in ${deskName(s.from)}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-[7px] outline-none"
                style={{ left: fit.X(to.lon), top: fit.Y(to.lat) }}
                onPointerEnter={() => lookAt([s.slug], s.name)}
                onPointerLeave={lookAway}
                onFocus={() => lookAt([s.slug], s.name)}
                onBlur={lookAway}
              >
                <span
                  className="block h-[7px] w-[7px] rounded-full transition-opacity"
                  style={{ backgroundColor: `var(--color-${s.belt})`, opacity: lit ? 1 : 0.8 }}
                />
                <span
                  className={`${MONO} pointer-events-none absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap pt-1 transition-opacity`}
                  style={{ color: `var(--color-${s.belt})`, opacity: lit ? 1 : 0 }}
                >
                  {s.name}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Bottom left, over the drawing and above the rail. The padding clears
          the rail's own block: its 32px of lead, the 3px line, the tick row and
          its 24px foot. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[104px] z-[3] px-5 sm:px-8 lg:px-12">
        <div className="max-w-[58ch] md:max-w-[48%]">
          <p className={`${MONO} mb-4 text-muted`}>About</p>
          <h1 className="max-w-[28ch] text-balance text-[clamp(1.2rem,1.85vw,1.6rem)] font-light leading-[1.32] text-ink">
            Trained to draw buildings, went back for the machinery<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-[56ch] font-serif text-[0.92rem] leading-[1.75] text-soft">
            Practice across Beirut, Dubai and Kuwait, then the MaCAD master at IAAC. Now I build the
            tools I used to ask for.
          </p>
          {/* The contacts, out of the band and under the writing. This is the
              page about the person, so it is where a way to reach him belongs;
              the band below keeps the identity alone and centred. The block
              above is pointer-events-none so the drawing stays reachable
              through it, which the marks have to opt back out of. */}
          <ContactMarks named className="pointer-events-auto mt-7 -ml-1.5 text-muted" />
        </div>
      </div>

      {/*
        * The career, whole. In the version this replaced the bars grew as you
        * scrolled, because a clock drove the page; there is no clock now, so the
        * rail simply reports the record. It stays because it is the one thing
        * here that shows sequence and overlap, which a map structurally cannot:
        * Kuwait running alongside Barcelona, Ohio interrupting Byblos.
        */}
      {/* Floored rather than rounded on the announced value: NOW is 2026.6, the
          middle of the present year, and rounding announced the slider as 2027. */}
      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="Year"
        aria-valuemin={START}
        aria-valuemax={Math.floor(NOW)}
        aria-valuenow={Math.floor(year)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setClock(yearRef.current - 0.5) }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setClock(yearRef.current + 0.5) }
          if (e.key === 'Home') { e.preventDefault(); setClock(START) }
          if (e.key === 'End') { e.preventDefault(); setClock(NOW) }
        }}
        className="absolute inset-x-0 bottom-0 z-[3] cursor-ew-resize touch-none px-5 pb-6 pt-8 outline-none focus-visible:ring-1 focus-visible:ring-accent sm:px-8 lg:px-12"
      >
        {/* The page does not scroll, so a wheel gesture winds the clock instead
            and nothing on screen says so: the map changes and the reason is
            invisible. This says it once, in the tick row's own voice, and gets
            out of the way as soon as it has been understood — which is exactly
            the moment the year leaves the present. It sits in the rail's top
            padding rather than in the flow, so it costs the lanes no height. */}
        <span
          className={`${MONO} pointer-events-none absolute right-5 top-1.5 whitespace-nowrap text-muted transition-opacity duration-300 motion-reduce:transition-none sm:right-8 lg:right-12`}
          style={{ opacity: year < NOW ? 0 : 1 }}
        >
          Scroll to wind back · {START}–{Math.floor(NOW)}
        </span>
        <div className="relative w-full" style={{ height: LANE_H }}>
          <span
            className="absolute inset-x-0 rounded-full bg-line"
            style={{ top: 0, height: LANE_H }}
          />
          {LANES.map((t) => {
            const lit = focusLabel === t.name
            return (
              <button
                key={`${t.name}-${t.from}`}
                type="button"
                aria-label={`${t.name}, ${t.role}, ${t.dates}`}
                className="absolute rounded-full outline-none transition-opacity"
                style={{
                  left: `${tx(t.from)}%`,
                  width: `${Math.max(0, tx(Math.min(t.to, year)) - tx(t.from))}%`,
                  top: 0,
                  height: LANE_H,
                  backgroundColor: `var(--color-${t.belt})`,
                  opacity: t.from > year ? 0 : focusLabel ? (lit ? 1 : 0.25) : 0.85,
                }}
                onPointerEnter={() => lookAt(madeDuring(t), t.name)}
                onPointerLeave={lookAway}
                onFocus={() => lookAt(madeDuring(t), t.name)}
                onBlur={lookAway}
              />
            )
          })}
          {/* The marker crosses every lane, because the year is one year for
              all of them. */}
          <span
            className="absolute -top-1 w-px bg-accent"
            style={{ left: `${tx(year)}%`, height: LANE_H + 2 }}
          />
        </div>

        {/* Four coloured bars mean nothing on their own, so the one you are
            pointing at says what it is. */}
        {/* The reserved height follows the type: 9px was drawn around the old
            8.96px label. */}
        <div className="relative mt-3 h-[11px]">
          {YEAR_TICKS.map((y) => (
            <span
              key={y}
              className={`${MONO} absolute -translate-x-1/2 tabular-nums text-muted transition-opacity`}
              style={{ left: `${tx(y)}%`, opacity: focusLabel ? 0.25 : 1 }}
            >
              {y}
            </span>
          ))}
          <span
            className={`${MONO} absolute left-0 whitespace-nowrap text-ink transition-opacity`}
            style={{ opacity: focusLabel ? 1 : 0 }}
          >
            {focusLabel}
          </span>
        </div>
      </div>

      <div
        ref={cardRef}
        data-card
        aria-hidden={!active}
        className={`absolute z-[7] max-h-[min(440px,68vh)] w-[296px] overflow-auto rounded-[10px] border border-line bg-paper shadow-[var(--chrome-lift)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none max-md:inset-x-3.5 max-md:bottom-3.5 max-md:top-auto max-md:max-h-[52%] max-md:w-auto ${
          active ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
        }`}
        onPointerEnter={clearClose}
        onPointerLeave={scheduleClose}
      >
        {active && (
          <>
            {/* The cover position: clipped into the top of the card by the
                fillet, the way every project card on the site leads with its
                image rather than framing one inside its padding. */}
            {active.photo && (
              /*
               * object-top, and tall enough to hold a head. The photo is a 332x534
               * portrait; a 296x112 slot centre-cropped it to a collar and a pair of
               * folded arms. Pinning it to the top is only half the fix — at 112px
               * the window on the source is 126px tall and a face is not, so the box
               * has to be deep enough for one before the crop point matters.
               */
              <img
                src={`${base}${active.photo}`}
                alt={active.kind === 'now' ? 'Charles Abi Chahine' : active.name}
                width="296"
                height="176"
                decoding="async"
                className="block h-44 w-full object-cover object-top"
              />
            )}
            {/* Centred, because these cards are three or four short lines about
                one place rather than a column of records: the page's left-aligned
                setting is for things that run on. */}
            <div className="p-[18px] pb-5 text-center">
              <p className={`${MONO} mb-2.5 text-accent`}>{active.tag}</p>
              <h2 className="mb-1.5 text-[0.98rem] font-medium leading-tight text-ink">
                {active.name}
              </h2>
              <p className={`${MONO} mb-3.5 text-muted`}>{active.cities}</p>
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
                <p className="m-0 font-serif text-[0.85rem] leading-[1.7] text-soft">
                  {active.note}
                </p>
              )}
              {/* Somewhere to go, but only where there is somewhere to go: a
                  place he worked or studied in is on the CV, and a place he
                  travelled to is not written up anywhere yet. Sending the second
                  kind to the CV promised a record that does not mention it. */}
              {active.kind === 'visited' ? (
                <p className={`${MONO} mt-4 text-muted`}>Architecture blog in the works</p>
              ) : (
                <Link
                  to="/cv"
                  className={`${MONO} mt-4 inline-block text-muted transition-colors hover:text-accent`}
                >
                  Full record → CV
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
