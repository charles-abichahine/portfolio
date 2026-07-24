import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { contact } from '../data/cv.js'
import { DOT_R, LAND_PATH, VIEWBOX, byId, latToY, lonToX, places, threads } from '../data/places.js'

const base = import.meta.env.BASE_URL

// One small uppercase size carries every label on this page.
const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.2em] font-normal'

const ZOOM_MIN = 1
const ZOOM_MAX = 3.2
const CLOSE_DELAY = 160

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
  // The landmass is context, not content — dropping it leaves the eleven and the
  // thread alone on the paper, which is a legitimate way to read the page.
  const [showLand, setShowLand] = useState(true)
  const active = activeId ? byId[activeId] : null

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
    <div ref={stageRef} className="relative h-[100svh] w-full overflow-hidden bg-paper">
      <svg
        ref={svgRef}
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 block h-full w-full origin-top-left transition-transform duration-300 ease-out motion-reduce:transition-none"
        onClick={(e) => { if (e.target === svgRef.current) close() }}
      >
        {/* the world, as a dot field — decorative, so it never takes a pointer */}
        <path
          d={LAND_PATH}
          className={`pointer-events-none fill-line transition-opacity duration-500 ease-out motion-reduce:transition-none ${
            showLand ? 'opacity-100' : 'opacity-0'
          }`}
        />

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
                lit ? 'stroke-accent opacity-80' : 'stroke-rule opacity-30'
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
              aria-label={`${p.name} — ${p.cities}`}
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

      {/* veils keep the overlaid text legible over the dot field */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[52%] bg-gradient-to-b from-paper via-paper/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[26%] bg-gradient-to-t from-paper via-paper/70 to-transparent" />

      <div className="pointer-events-none absolute inset-0 z-[4] flex flex-col justify-between px-5 pb-5 pt-24 sm:px-8 sm:pb-8 lg:px-12">
        <div className="max-w-[58ch] md:max-w-[48%]">
          <p className={`${MONO} mb-4 text-muted`}>About</p>
          <h1 className="max-w-[28ch] text-balance text-[clamp(1.2rem,1.85vw,1.6rem)] font-extralight leading-[1.32] text-ink">
            Architect first, then the software behind the architecture<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-[56ch] text-[0.8rem] font-light leading-[1.8] text-soft">
            Architect from Lebanon, based in Beirut. LAU and Kent State, then practice across Beirut,
            Dubai and Kuwait, then the MaCAD master at IAAC in Barcelona. I&rsquo;m interested in roles
            where architecture and computation meet: computational design, BIM workflows, and the tools
            that make design teams faster.
          </p>
        </div>

        {/* Chips and footer share one bottom group, so the chips can never land
            on top of the footer text the way an absolutely-placed row would. */}
        <div className="flex flex-col gap-3">
          {/* touch has no hover: a guaranteed way into the five that carry a record */}
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

          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-2">
            <p className={`${MONO} text-muted`}>Hover a dot · Click to keep it open</p>
            <p className={`${MONO} text-muted`}>
              Charles Abi Chahine — Architect · Computational Designer · Beirut
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end md:text-right">
            <button
              type="button"
              aria-pressed={showLand}
              onClick={() => setShowLand((v) => !v)}
              className={`${MONO} pointer-events-auto text-muted transition-colors hover:text-accent`}
            >
              Map · {showLand ? 'on' : 'off'}
            </button>
            <p className={`${MONO} text-muted`}>11 of 195 countries · red = now</p>
            {/* Work / About / CV already live in the Dynamic Island a few inches
                above, so this carries contact only. */}
            <nav className="pointer-events-auto flex flex-wrap gap-5">
              <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={`mailto:${contact.email}`}>Email</a>
              <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.github} target="_blank" rel="noreferrer">GitHub</a>
            </nav>
          </div>
          </div>
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
              <p className="m-0 text-[0.78rem] font-light leading-[1.75] text-soft">{active.note}</p>
            )}
            <Link to="/cv" className={`${MONO} mt-4 inline-block text-muted transition-colors hover:text-accent`}>
              Full record → CV
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
