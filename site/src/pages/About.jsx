import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import FooterSlot from '../components/FooterSlot.jsx'
import { DOT_R, LAND_PATH, VIEWBOX, byId, latToY, lonToX, places, threads } from '../data/places.js'

const base = import.meta.env.BASE_URL

// One small uppercase size carries every label on this page.
const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.2em] font-normal'

const ZOOM_MIN = 1
const ZOOM_MAX = 3.2
const CLOSE_DELAY = 160
// Spotlight radius, in viewBox units (the frame is 360 wide). ~28 reveals the
// region a place sits in — its neighbours and coastline — not the continent.
const SPOT_R = 28

export default function About() {
  const stageRef = useRef(null)
  const svgRef = useRef(null)
  const cardRef = useRef(null)
  const pinRefs = useRef({})
  const closeTimer = useRef(null)
  // Kept in a ref as well as state: the wheel handler needs the current value
  // without re-subscribing a non-passive listener on every zoom step.
  const view = useRef({ k: 1, tx: 0, ty: 0 })

  // Pinned lives in a ref, not state: nothing renders from it, it only decides
  // whether pointer-leave is allowed to close the card.
  const pinnedRef = useRef(false)
  const [activeId, setActiveId] = useState(null)
  // Off by default: the page opens as the eleven and the thread alone on the
  // paper, which is the stronger image and the one worth landing on. The
  // landmass is context you ask for, not context you arrive in.
  const [showLand, setShowLand] = useState(false)
  const active = activeId ? byId[activeId] : null

  /* The spotlight tracks the active place but keeps the last one after it
     clears, so the reveal fades out where it appeared instead of snapping to
     the top-left corner on the way out. byId returns a stable reference, so
     this settles in one pass. */
  const [spot, setSpot] = useState(null)
  useEffect(() => {
    if (active) setSpot(active)
  }, [active])

  const isNarrow = () => window.matchMedia('(max-width: 767px)').matches

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

  /* ---- geometry ----
   * The svg fills the stage under preserveAspectRatio="meet", so its unzoomed
   * ("base") screen position is derivable from the viewBox. Deriving it beats
   * reading getBoundingClientRect, which already carries the transform and would
   * compound its own error on every zoom step.
   */
  const baseGeom = () => {
    const s = stageRef.current.getBoundingClientRect()
    const s0 = Math.min(s.width / VIEWBOX.w, s.height / VIEWBOX.h)
    return { w: s.width, h: s.height, s0, ox: (s.width - VIEWBOX.w * s0) / 2, oy: (s.height - VIEWBOX.h * s0) / 2 }
  }
  const basePos = (p, g) => [g.ox + (lonToX(p.lon) - VIEWBOX.x) * g.s0, g.oy + (latToY(p.lat) - VIEWBOX.y) * g.s0]

  const applyTransform = () => {
    const { k, tx, ty } = view.current
    if (svgRef.current) svgRef.current.style.transform = `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${k.toFixed(3)})`
  }
  // Keep the map covering the frame. At k = 1 this recentres exactly, so
  // zooming back out never leaves the world drifted off-axis.
  const clampPan = (g) => {
    const v = view.current
    const cw = VIEWBOX.w * g.s0 * v.k
    const ch = VIEWBOX.h * g.s0 * v.k
    v.tx = cw <= g.w ? (g.w - cw) / 2 - g.ox * v.k : Math.min(-g.ox * v.k, Math.max(v.tx, g.w - cw - g.ox * v.k))
    v.ty = ch <= g.h ? (g.h - ch) / 2 - g.oy * v.k : Math.min(-g.oy * v.k, Math.max(v.ty, g.h - ch - g.oy * v.k))
  }

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

  /* ---- wheel zoom, anchored on the dot nearest the cursor ----
   * Registered natively so preventDefault actually holds (React's onWheel is
   * passive). Focal zoom: tx' = tx + bx*(k - k') keeps the focus dot fixed.
   */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const onWheel = (e) => {
      if (e.target.closest('[data-card]')) return
      e.preventDefault()
      const g = baseGeom()
      const r = stage.getBoundingClientRect()
      const cx = e.clientX - r.left
      const cy = e.clientY - r.top
      const v = view.current
      let focus = places[0]
      let best = Infinity
      for (const p of places) {
        const [bx, by] = basePos(p, g)
        const dx = bx * v.k + v.tx - cx
        const dy = by * v.k + v.ty - cy
        const d = dx * dx + dy * dy
        if (d < best) { best = d; focus = p }
      }
      const [fx, fy] = basePos(focus, g)
      const k0 = v.k
      v.k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * (e.deltaY > 0 ? 0.9 : 1.1)))
      v.tx += fx * (k0 - v.k)
      v.ty += fy * (k0 - v.k)
      clampPan(g)
      applyTransform()
      placeCard()
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [placeCard])

  useEffect(() => {
    const onResize = () => {
      if (!stageRef.current) return
      clampPan(baseGeom())
      applyTransform()
      placeCard()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [placeCard])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  // Hovering elsewhere releases a pin, so a pinned card can't strand the map.
  const openPlace = (id) => { clearClose(); pinnedRef.current = false; setActiveId(id) }
  const pinPlace = (id) => { clearClose(); pinnedRef.current = true; setActiveId(id) }

  return (
    <div ref={stageRef} className="relative min-h-0 w-full flex-1 overflow-hidden bg-paper">
      <svg
        ref={svgRef}
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 block h-full w-full origin-top-left transition-transform duration-300 ease-out motion-reduce:transition-none"
        onClick={(e) => { if (e.target === svgRef.current) close() }}
      >
        {/* With the map off, hovering a place reveals only its own neighbourhood:
            a radial ramp centred on that dot, solid at the centre and gone by
            SPOT_R. Masking the single land path rather than drawing a second
            copy keeps the 2,400-dot geometry rasterised once. */}
        <defs>
          <radialGradient
            id="land-spot"
            gradientUnits="userSpaceOnUse"
            cx={spot ? lonToX(spot.lon) : 0}
            cy={spot ? latToY(spot.lat) : 0}
            r={SPOT_R}
          >
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="45%" stopColor="#fff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="land-spot-mask">
            <rect x={VIEWBOX.x} y={VIEWBOX.y} width={VIEWBOX.w} height={VIEWBOX.h} fill="url(#land-spot)" />
          </mask>
        </defs>

        {/* The world as a dot field — decorative, so it never takes a pointer.
            Two layers when the map is off: a ghost of the whole world, faint
            enough to stay out of the way but present enough that eleven dots
            read as places rather than floating marks, and the spotlight on top
            of it. With the map on, the ghost simply comes up to full strength
            and the spotlight is unnecessary. */}
        <path
          d={LAND_PATH}
          className={`pointer-events-none fill-land transition-opacity duration-500 ease-out motion-reduce:transition-none ${
            showLand ? 'opacity-100' : 'opacity-25'
          }`}
        />
        {!showLand && (
          <path
            d={LAND_PATH}
            mask="url(#land-spot-mask)"
            className={`pointer-events-none fill-land transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              active ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {threads.map((t) => {
          const lit = activeId === t.a || activeId === t.b
          return (
            <path
              key={`${t.a}-${t.b}`}
              d={t.d}
              fill="none"
              strokeLinecap="round"
              strokeWidth="0.34"
              className={`pointer-events-none transition-[stroke,opacity] duration-300 motion-reduce:transition-none ${
                lit ? 'stroke-accent opacity-80' : 'stroke-soft opacity-45'
              }`}
            />
          )
        })}

        {places.map((p) => {
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
              {/* explicit hit target — the dots themselves are far too small to aim at */}
              <circle r="3.4" fill="transparent" />
              <circle
                r="3.2"
                fill="none"
                strokeWidth="0.3"
                className={`stroke-accent transition-opacity duration-200 motion-reduce:transition-none ${on ? 'opacity-90' : 'opacity-0'}`}
              />
              <circle r={DOT_R[p.kind]} className={`${fill} transition-[fill] duration-200 motion-reduce:transition-none`} />
            </g>
          )
        })}
      </svg>

      {/* Veils keep the overlaid text legible over the dot field. The top one is
          masked to the left on desktop: the copy sits in the left column, and a
          full-width veil tall enough to cover the paragraph also covers the top
          half of the map — which is most of it, since the band is vertically
          centred. Masking buys legible text over the copy and an unveiled map
          everywhere else. Below md the copy spans the width, so the mask goes. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[56%] bg-gradient-to-b from-paper via-paper/75 to-transparent md:[mask-image:linear-gradient(to_right,#000_0%,#000_44%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[24%] bg-gradient-to-t from-paper via-paper/55 to-transparent" />

      <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col justify-between px-5 pb-5 pt-24 sm:px-8 sm:pb-8 lg:px-12">
        <div className="max-w-[58ch] md:max-w-[48%]">
          <p className={`${MONO} mb-4 text-muted`}>About</p>
          <h1 className="max-w-[28ch] text-balance text-[clamp(1.2rem,1.85vw,1.6rem)] font-light leading-[1.32] text-ink">
            Architect first, then the software behind the architecture<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-[56ch] font-serif text-[0.92rem] leading-[1.75] text-soft">
            I trained and practiced as an architect, before going back to learn how to build the
            tools. Three years across Beirut, Dubai and Kuwait, then the MaCAD master at IAAC. Now I
            work on both sides: the design, and the machinery that gets it delivered.
          </p>
        </div>

        {/* The chips are the whole bottom group now. Two lines used to sit under
            them reading the map — how to work it, and how many countries the
            eleven are out of. Once the footer became bare type in these same two
            corners, they were four annotations in one block at the same size in
            the same voice, with nothing to say which belonged to the page and
            which to the site.

            touch has no hover, so this stays: a guaranteed way into the five
            places that carry a record. */}
        <div className="pointer-events-auto -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
          {places.filter((p) => p.kind !== 'visited').map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pinPlace(p.id)}
              className={`${MONO} shrink-0 rounded-full border bg-paper px-3 py-2 ${
                p.kind === 'now' ? 'border-accent text-accent' : 'border-line text-muted'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={cardRef}
        data-card
        aria-hidden={!active}
        className={`absolute z-[7] max-h-[min(440px,68vh)] w-[296px] overflow-auto border border-line bg-paper p-[18px] pb-5 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none max-md:inset-x-3.5 max-md:bottom-3.5 max-md:top-auto max-md:max-h-[58%] max-md:w-auto ${
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
      {/* This page's contribution to the shared footer: the one control that is
          about the drawing rather than about the site. */}
      <FooterSlot>
        <button
          type="button"
          aria-pressed={showLand}
          onClick={() => setShowLand((v) => !v)}
          className="chrome-label text-[0.56rem] text-muted transition-colors hover:text-accent"
        >
          Map · {showLand ? 'on' : 'off'}
        </button>
      </FooterSlot>
    </div>
  )
}
