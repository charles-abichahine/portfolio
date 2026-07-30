import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { projects } from '../data/projects.js'
import { BELTS, BELT_TOKEN } from '../data/belts.js'

/*
 * The data field: the drawing the landing is built on.
 *
 * It replaced a horizontal, four-gate version of the same idea, and it is worth
 * knowing why. That one ran MATERIAL to METHOD to TOOLS to WORK and let each
 * strand choose independently at every gate, which meant almost no two strands
 * shared a route, nothing ever bundled, and ninety-odd unique paths crossed each
 * other into a mess.
 *
 * There are no gates any more. The field is one uninterrupted fan: every strand
 * leaves the name block and runs straight to the belt it belongs to, so a strand
 * makes exactly one decision instead of four. That is the whole fix: with one
 * choice they lie on top of each other and read as four currents.
 *
 * Nothing here is a signal strand. Every strand is a carrier, and about one in
 * nine takes the hue of the belt it ends at. What makes a path followable is
 * hover: pointing at a belt lights everything that ends there and drops the rest
 * away. The strand count per belt is the real project count, so the mass
 * arriving at each one is the shape of the work.
 *
 * The component does not know where the belts are. The page measures them and
 * hands down `heads`, which is what lets the same drawing serve the four-column
 * desktop layout and the stacked mobile one without a branch in here.
 */

// The band across the name block that every strand leaves from.
const BLOCK = { x0: 0.34, x1: 0.66 }

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function DataField({ originY, heads, focus }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  // Read live by the canvas loop so a hover never re-renders the drawing.
  const focusRef = useRef(null)
  useEffect(() => {
    focusRef.current = focus
  }, [focus])

  // Measured directly on mount as well as observed. A ResizeObserver callback is
  // delivered as part of the rendering steps, so in a tab that is not currently
  // compositing it never arrives at all and the field would sit at 0 by 0
  // forever. The observer is what keeps it right afterwards.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox((b) => (b.w === r.width && b.h === r.height ? b : { w: r.width, h: r.height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const { w, h } = box
  const ready = w > 0 && h > 0 && originY != null && heads && heads.length === BELTS.length

  const carriers = useMemo(() => {
    if (!ready) return []
    const rnd = mulberry32(0x5eed)
    // Fewer than the gated version needed. A clean fan gets its structure from
    // the bundles rather than from sheer quantity, and past roughly this many the
    // four currents start to merge back into one wash.
    const n = w < 640 ? 40 : 72
    const total = projects.length
    const out = []

    for (let i = 0; i < n; i++) {
      // Weighted by the real counts, so the mass arriving at each belt is the
      // shape of the work rather than an even split.
      const r = rnd() * total
      let acc = 0
      const found = BELTS.findIndex((b) => (acc += b.items.length) > r)
      const bi = found === -1 ? BELTS.length - 1 : found
      const belt = BELTS[bi]
      const head = heads[bi]

      // The origin band is subdivided in belt order, so a strand bound for the
      // leftmost belt leaves from the left of the name and one bound for the
      // rightmost leaves from the right. That is what stops the four ribbons
      // crossing each other at all: order is preserved from source to
      // destination, the way an alluvial diagram is supposed to work.
      const slot = (BLOCK.x1 - BLOCK.x0) / BELTS.length
      const lo = BLOCK.x0 + bi * slot
      const x0 = (lo + rnd() * slot) * w
      const y0 = originY - 6
      const x1 = head.x + (rnd() - 0.5) * head.spread
      const y1 = head.y

      // One curve shape for every strand. Varying the bend per strand was what
      // made the fan a tangle: strands sharing a belt took different paths and
      // crossed. With a single easing they lie near-parallel and read as one
      // current, and the only variation is where each one starts and lands.
      const mid = y0 + (y1 - y0) * 0.5
      const d = `M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${x0.toFixed(1)} ${mid.toFixed(1)} ${x1.toFixed(1)} ${mid.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`

      out.push({
        path: new Path2D(d),
        belt: belt.id,
        tinted: rnd() < 0.11,
        weight: 0.5 + rnd() * 0.7,
        phase: rnd() * 400,
        speed: 0.1 + rnd() * 0.16,
      })
    }
    return out
  }, [ready, w, originY, heads])

  const [themeTick, setThemeTick] = useState(0)
  useEffect(() => {
    const ob = new MutationObserver(() => setThemeTick((t) => t + 1))
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => ob.disconnect()
  }, [])

  const readPalette = useCallback(() => {
    const cs = getComputedStyle(document.documentElement)
    const get = (v) => cs.getPropertyValue(v).trim()
    return {
      dark: document.documentElement.dataset.theme === 'dark',
      ink: get('--color-ink'),
      belt: Object.fromEntries(Object.entries(BELT_TOKEN).map(([id, tok]) => [id, get(tok)])),
    }
  }, [])

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !ready || !carriers.length) return
    const pal = readPalette()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
    const ctx = cv.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // The fan fades in as it leaves the type and out as it reaches the belts, so
    // neither end of the drawing has a hard edge.
    const lastY = Math.max(...heads.map((hd) => hd.y))
    const grad = ctx.createLinearGradient(0, originY - 30, 0, lastY + 10)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.08, 'rgba(0,0,0,1)')
    grad.addColorStop(0.95, 'rgba(0,0,0,1)')
    grad.addColorStop(1, 'rgba(0,0,0,0.15)')

    const draw = (t) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (pal.dark) ctx.globalCompositeOperation = 'lighter'
      const f = focusRef.current

      for (const c of carriers) {
        // Hover is the only thing that makes an individual path followable now,
        // so the gap between the two states is deliberately large.
        const chosen = f && c.belt === f
        ctx.strokeStyle = chosen || c.tinted ? pal.belt[c.belt] : pal.ink
        ctx.lineWidth = chosen ? c.weight * 1.5 : c.weight

        /*
         * The resting field is deliberately at the edge of visible: a trace of
         * something passing rather than a diagram to read. Measured, light sits
         * around 1.17:1 against the paper, which is very quiet, and heavier
         * values were tried and rejected as too strong. Hover is what makes it
         * legible, and that state is emphatic.
         */
        const base = chosen
          ? pal.dark
            ? 0.5
            : 0.42
          : f
            ? 0.028
            : (pal.dark ? 0.1 : 0.085) * (c.tinted ? 1.6 : 1)

        ctx.globalAlpha = base
        ctx.setLineDash([])
        ctx.stroke(c.path)

        if (!reduce) {
          ctx.globalAlpha = chosen ? base * 1.5 : f ? 0.04 : base * 1.7
          ctx.setLineDash([90, 260])
          ctx.lineDashOffset = -(c.phase + t * c.speed)
          ctx.stroke(c.path)
        }
      }

      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'destination-in'
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
    }

    if (reduce) {
      draw(0)
      return
    }
    let raf = 0
    let running = true
    const loop = (t) => {
      if (!running) return
      draw(t)
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      if (raf) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    draw(0)
    start()
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 })
    io.observe(cv)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ready, carriers, w, h, originY, heads, themeTick, readPalette])

  return (
    <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: w, height: h }} />

      {/* The cap each bundle lands on. Nothing bold arrives at it, so it is the
          only mark tying a current to the belt underneath it. */}
      {ready && (
        <svg className="absolute inset-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {heads.map((hd, i) => {
            const belt = BELTS[i]
            const on = !focus || focus === belt.id
            const half = Math.min(hd.spread, 96) / 2
            return (
              <line
                key={belt.id}
                x1={hd.x - half}
                y1={hd.y}
                x2={hd.x + half}
                y2={hd.y}
                stroke={belt.color}
                strokeWidth="2"
                opacity={on ? 1 : 0.16}
                style={{ transition: 'opacity 300ms' }}
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}
