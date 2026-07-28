import { useEffect, useRef, useState } from 'react'
import Logo from './Logo.jsx'

/*
 * Slice Hero — the site's generative identity, retuned from 3D printing.
 * A slowly-morphing solid is expressed as its signed-distance field, then
 * drawn the way a slicer draws a layer: perimeter shells + 45° rectilinear
 * infill (marching squares over the SDF). The pointer deposits material like
 * a nozzle; clicking the field re-slices a fresh form. The only red is the
 * name's period. Static settled frame under prefers-reduced-motion (which is
 * honoured live, not only at load).
 *
 * The solids are stored in normalised coordinates so a resize re-fits the
 * SAME composition to the new size instead of re-rolling a new one.
 *
 * Themed: light-on-dark and dark-on-light. The dark values are deliberately
 * deeper/brighter than the interior tokens (bg below paper, name above ink),
 * so the palette is kept here as literals rather than routed through the CSS
 * tokens, which would flatten that tuning. `line`/`lineSoft` are "r,g,b"
 * fragments — the canvas composes the alpha per stroke.
 */
const PALETTES = {
  /*
   * shell/inner/infill are the stroke weights, per theme rather than shared.
   * Light needs more: a faint mark on a dark ground still glows, the same mark
   * on white simply vanishes. At the dark values the light hero measured 1.4%
   * ink at 1.36:1 against the paper — close to a blank page.
   */
  dark: {
    bg: '#0e0e12', grid: 'rgba(244,244,238,0.04)', line: '244,244,238', lineSoft: '233,233,228',
    name: '#f4f4ee', red: '#e5382b', sub: '#a9a9a2', hint: '#5a5a62',
    shell: 0.55, inner: 0.32, infill: 0.17, weight: 1,
  },
  light: {
    bg: '#ffffff', grid: 'rgba(17,17,16,0.09)', line: '20,20,19', lineSoft: '42,42,40',
    name: '#111110', red: '#d92b1f', sub: '#55554f', hint: '#8a8a82',
    shell: 0.72, inner: 0.5, infill: 0.34, weight: 1.15,
  },
}
const readTheme = () =>
  (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light')
    ? 'light'
    : 'dark'

const rnd = (a, b) => a + Math.random() * (b - a)
const ri = (n) => (Math.random() * n) | 0
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const lerp = (a, b, t) => a + (b - a) * t
const smin = (a, b, k) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k))
  return b * (1 - h) + a * h - k * h * (1 - h)
}

/*
 * Signed distance to a rotated rounded box.
 *
 * The field used circles, smooth-minned together with a wide radius — which is
 * the metaball recipe, and metaballs always read biological. A slice through a
 * building has edges, so the primitive is a box: rounded just enough to stay
 * drawable, rotated to one of two axes so masses read aligned rather than grown.
 */
const sdBox = (px, py, hx, hy, rot, cr) => {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const qx = Math.abs(px * c + py * s) - hx
  const qy = Math.abs(py * c - px * s) - hy
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - cr
}

function makeSolids() {
  const n = 3 + ri(2)
  const arr = []
  for (let i = 0; i < n; i++) {
    /*
     * The first solid is the dominant mass and the rest plug into it. Fixing
     * that hierarchy is what makes every re-slice compose: rolling four equal
     * lumps gave a different — and often worse — page on every visit.
     */
    const lead = i === 0
    const scale = lead ? rnd(0.86, 1) : rnd(0.34, 0.6)
    arr.push({
      /* bxf is offset from the horizontal anchor; the lead mass stays near it.
         Satellites are kept close: spread wide they read as debris around the
         mass rather than volumes plugged into it, and the tight blend no longer
         melts a stray one back into the whole. */
      bxf: lead ? rnd(-0.04, 0.04) : rnd(-0.15, 0.15),
      byf: 0.4 + (lead ? rnd(-0.06, 0.06) : rnd(-0.16, 0.16)),
      wNf: rnd(0.075, 0.125) * scale,
      hNf: rnd(0.055, 0.1) * scale,
      crNf: rnd(0.004, 0.015), // corner radius: drawable, not soft
      // Snapped to one of two axes with a small jitter — built, not grown.
      rot: (ri(2) ? 0 : Math.PI / 2) + rnd(-0.09, 0.09),
      axNf: rnd(0.006, 0.026), ayNf: rnd(0.006, 0.026),
      fx: rnd(0.05, 0.12), fy: rnd(0.05, 0.12),
      px: rnd(0, 6.28), py: rnd(0, 6.28),
      rr: rnd(0.06, 0.2), rf: rnd(0.05, 0.12), rp: rnd(0, 6.28),
    })
  }
  return arr
}

// Trace one iso-level of `field` into the current canvas path (marching squares).
function isoPath(ctx, field, cols, rows, cell, level) {
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i = r * cols + c
      const v0 = field[i]
      const v1 = field[i + 1]
      const v2 = field[i + cols + 1]
      const v3 = field[i + cols]
      const x0 = c * cell
      const y0 = r * cell
      let n = 0
      let ax = 0
      let ay = 0
      let bx = 0
      let by = 0
      const push = (px, py) => {
        if (n === 0) { ax = px; ay = py; n = 1 } else if (n === 1) { bx = px; by = py; n = 2 } else { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ax = px; ay = py; n = 1 }
      }
      if ((v0 > level) !== (v1 > level)) push(x0 + (cell * (level - v0)) / (v1 - v0), y0)
      if ((v1 > level) !== (v2 > level)) push(x0 + cell, y0 + (cell * (level - v1)) / (v2 - v1))
      if ((v3 > level) !== (v2 > level)) push(x0 + (cell * (level - v3)) / (v2 - v3), y0 + cell)
      if ((v0 > level) !== (v3 > level)) push(x0, y0 + (cell * (level - v0)) / (v3 - v0))
      if (n === 2) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by) }
    }
  }
}

// carry: optional { solids, infAng } to preserve the composition across a resize.
function makeSlice(ctx, W, H, carry) {
  const wide = W > 820
  const cell = wide ? 12 : 16
  const cols = Math.ceil(W / cell) + 2
  const rows = Math.ceil(H / cell) + 2
  const minWH = Math.min(W, H)
  const anchorX = (wide ? 0.66 : 0.5) * W
  const field = new Float32Array(cols * rows)
  // Blend radius. Tight on purpose: a wide one melts the masses into a single
  // organic lump, a narrow one lets them read as separate volumes meeting.
  const km = minWH * 0.018
  const spacing = wide ? 13 : 15

  let solids = carry ? carry.solids : makeSolids()
  let infAng = carry ? carry.infAng : [Math.PI / 4, -Math.PI / 4][ri(2)]

  const dep = { x: 0, y: 0, s: 0 }
  // solids (≤5) + the pointer deposit, which is a rounded square like the rest:
  // a round one was left over from the circle field and read as a foreign object
  // against masses that now have edges.
  const scratch = Array.from({ length: 6 }, () => ({ x: 0, y: 0, hx: 0, hy: 0, rot: 0, cr: 0 }))

  // Static, size-dependent draws precomputed once per scene (rebuilt on resize).
  const gridPath = new Path2D()
  for (let x = 34; x < W; x += 34) { gridPath.moveTo(x, 0); gridPath.lineTo(x, H) }
  for (let y = 34; y < H; y += 34) { gridPath.moveTo(0, y); gridPath.lineTo(W, y) }
  const maskName = ctx.createRadialGradient(W * 0.28, H * 0.86, 10, W * 0.28, H * 0.86, Math.max(W, H) * 0.42)
  maskName.addColorStop(0, 'rgba(0,0,0,0.96)')
  maskName.addColorStop(1, 'rgba(0,0,0,0)')
  const maskIsland = ctx.createRadialGradient(W * 0.5, 0, 10, W * 0.5, 0, minWH * 0.4)
  maskIsland.addColorStop(0, 'rgba(0,0,0,0.9)')
  maskIsland.addColorStop(1, 'rgba(0,0,0,0)')

  function evalField(mt) {
    let count = solids.length
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i]
      const o = scratch[i]
      o.x = anchorX + s.bxf * W + s.axNf * minWH * Math.sin(s.fx * mt + s.px)
      o.y = s.byf * H + s.ayNf * minWH * Math.sin(s.fy * mt + s.py)
      const pulse = 1 + s.rr * Math.sin(s.rf * mt + s.rp)
      o.hx = s.wNf * minWH * pulse
      o.hy = s.hNf * minWH * pulse
      o.rot = s.rot
      o.cr = s.crNf * minWH
    }
    if (dep.s > 0.01) {
      const o = scratch[count]
      // Axis-aligned: a square needs no rotation to sit with the field, and it
      // keeps the deposit reading as material rather than another volume.
      const d = minWH * dep.s
      o.x = dep.x; o.y = dep.y; o.hx = 0.04 * d; o.hy = 0.04 * d; o.rot = 0; o.cr = 0.014 * d
      count++
    }
    let mn = Infinity
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cell
        const y = r * cell
        let d = Infinity
        for (let k = 0; k < count; k++) {
          const s = scratch[k]
          const dd = sdBox(x - s.x, y - s.y, s.hx, s.hy, s.rot, s.cr)
          d = d === Infinity ? dd : smin(d, dd, km)
        }
        field[r * cols + c] = d
        if (d < mn) mn = d
      }
    }
    return mn
  }
  function sdfAt(x, y) {
    const gx = Math.max(0, Math.min(cols - 1.001, x / cell))
    const gy = Math.max(0, Math.min(rows - 1.001, y / cell))
    const c = gx | 0
    const r = gy | 0
    const fx = gx - c
    const fy = gy - r
    const i = r * cols + c
    return field[i] * (1 - fx) * (1 - fy) + field[i + 1] * fx * (1 - fy) + field[i + cols] * (1 - fx) * fy + field[i + cols + 1] * fx * fy
  }
  /*
   * wear (0..1) is how far the landing has been lifted off the print bed. The
   * drawing un-builds as it goes: infill first, then the inner shells, leaving
   * a bare outer perimeter by the time it clears the seam. It is the inverse of
   * the build-in fade, so the piece is laid down on arrival and taken apart on
   * the way out rather than merely scrolling away.
   */
  function frame(fctx, w, h, t, pointer, pal, wear = 0) {
    const mt = t * 0.0013
    const build = easeOut(Math.min(1, t / 1400))
    const keepShell = 1 - 0.75 * wear
    const keepInner = Math.max(0, 1 - wear * 1.25)
    const keepInfill = Math.max(0, 1 - wear * 1.6)
    dep.s = lerp(dep.s, pointer.active ? 1 : 0, 0.06)
    if (pointer.active) { dep.x = lerp(dep.x, pointer.x, 0.12); dep.y = lerp(dep.y, pointer.y, 0.12) }
    const mn = evalField(mt)
    fctx.clearRect(0, 0, w, h)
    fctx.strokeStyle = pal.grid
    fctx.lineWidth = 1
    fctx.stroke(gridPath)
    if (mn < -1) {
      fctx.lineCap = 'round'
      fctx.lineJoin = 'round'
      const inset = spacing * 0.55
      for (let s = 0; s < 3; s++) {
        const L = -s * inset
        fctx.strokeStyle =
          s === 0
            ? `rgba(${pal.line},${pal.shell * build * keepShell})`
            : `rgba(${pal.lineSoft},${pal.inner * build * keepInner})`
        fctx.lineWidth = (s === 0 ? 1.3 : 1) * pal.weight
        fctx.beginPath()
        isoPath(fctx, field, cols, rows, cell, L)
        fctx.stroke()
      }
      // The infill is by far the heaviest pass. Once it has faded out there is
      // nothing to see, so skip the walk rather than stroke it at zero alpha —
      // that is the whole cost of a frame back, exactly while the page is
      // scrolling and wants it most.
      if (keepInfill > 0.01) {
        const wallInset = 3 * inset + 2
        const step = 4
        const ca = Math.cos(infAng)
        const sa = Math.sin(infAng)
        const cx = w / 2
        const cy = h / 2
        const Lr = Math.hypot(w, h)
        fctx.strokeStyle = `rgba(${pal.lineSoft},${pal.infill * build * keepInfill})`
        fctx.lineWidth = pal.weight
        fctx.beginPath()
        for (let off = -Lr; off <= Lr; off += spacing) {
          let prev = false
          for (let d = -Lr; d <= Lr; d += step) {
            const x = cx + ca * d - sa * off
            const y = cy + sa * d + ca * off
            if (x < -2 || y < -2 || x > w + 2 || y > h + 2) { prev = false; continue }
            if (sdfAt(x, y) < -wallInset) { if (!prev) fctx.moveTo(x, y); else fctx.lineTo(x, y); prev = true } else prev = false
          }
        }
        fctx.stroke()
      }
    }
    // erase where the name & island must stay legible
    fctx.globalCompositeOperation = 'destination-out'
    fctx.fillStyle = maskName
    fctx.fillRect(0, h * 0.42, w, h * 0.58)
    fctx.fillStyle = maskIsland
    fctx.fillRect(0, 0, w, h * 0.34)
    fctx.globalCompositeOperation = 'source-over'
  }
  return {
    frame,
    regen() { solids = makeSolids(); infAng = [Math.PI / 4, -Math.PI / 4][ri(2)] },
    state() { return { solids, infAng } },
  }
}

/*
 * progressRef: optional ref holding 0..1, how far the landing has been lifted
 * off the bed. Read live inside the loop rather than taken as a prop, so the
 * page can drive it from a scroll handler without re-rendering the canvas.
 */
export default function SliceHero({ progressRef }) {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const regenRef = useRef(() => {})
  const redrawRef = useRef(() => {})

  const [theme, setTheme] = useState(readTheme)
  const pal = PALETTES[theme]
  // The canvas loop reads the palette off a ref so a theme flip never has to
  // rebuild the scene (which would re-roll the composition).
  const palRef = useRef(pal)

  // Follow the toggle: DynamicIsland flips data-theme on <html>.
  useEffect(() => {
    const el = document.documentElement
    const sync = () => setTheme(readTheme())
    const mo = new MutationObserver(sync)
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    sync()
    return () => mo.disconnect()
  }, [])

  // Push the new palette to the loop and force one frame, so a paused hero
  // (reduced motion, or scrolled out of view) recolours immediately.
  useEffect(() => {
    palRef.current = PALETTES[theme]
    redrawRef.current()
  }, [theme])

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    let reduce = mq.matches
    let W = 0
    let H = 0
    let raf = 0
    let visible = true
    let start = 0
    let scene = null
    const pointer = { x: -1, y: -1, active: false }
    // Read live off the ref: the landing drives this from a scroll handler, and
    // routing it through props would re-render the canvas sixty times a second.
    const wear = () => progressRef?.current ?? 0
    redrawRef.current = () => {
      if (scene) scene.frame(ctx, W, H, reduce ? 1e6 : performance.now() - start, pointer, palRef.current, wear())
    }

    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const r = section.getBoundingClientRect()
      W = Math.max(1, r.width)
      H = Math.max(1, r.height)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    function loop() {
      const t = performance.now() - start
      scene.frame(ctx, W, H, t, pointer, palRef.current, wear())
      if (visible && !reduce) raf = requestAnimationFrame(loop)
      else raf = 0
    }
    // carry: preserve the current composition (resize); fresh: null (mount / re-slice)
    function run(carry) {
      if (raf) cancelAnimationFrame(raf)
      size()
      scene = makeSlice(ctx, W, H, carry)
      start = carry ? performance.now() - 2000 : performance.now() // skip the build-in fade on resize
      if (reduce) scene.frame(ctx, W, H, 1e6, pointer, palRef.current, wear())
      else loop()
    }
    regenRef.current = () => {
      if (!scene) return
      scene.regen()
      start = performance.now()
      if (reduce) scene.frame(ctx, W, H, 1e6, pointer, palRef.current, wear())
      else if (!raf) loop()
    }

    const onMove = (e) => {
      const r = section.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.active = true
    }
    // pointerleave never fires on touch, so end the deposit on up/cancel too.
    const onLeave = () => { pointer.active = false }
    section.addEventListener('pointermove', onMove)
    section.addEventListener('pointerleave', onLeave)
    section.addEventListener('pointerup', onLeave)
    section.addEventListener('pointercancel', onLeave)

    const onMotionPref = () => {
      reduce = mq.matches
      if (reduce) { if (raf) cancelAnimationFrame(raf); raf = 0; if (scene) scene.frame(ctx, W, H, 1e6, pointer, palRef.current, wear()) } else if (!raf) { start = performance.now() - 2000; loop() }
    }
    mq.addEventListener('change', onMotionPref)

    const io = new IntersectionObserver(
      (es) => {
        visible = es[0].isIntersecting
        if (visible && !raf && !reduce) { start = performance.now() - 4000; loop() }
      },
      { threshold: 0.02 },
    )
    io.observe(section)

    let rt
    const onResize = () => {
      clearTimeout(rt)
      rt = setTimeout(() => {
        const r = section.getBoundingClientRect()
        if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 1) return // ignore no-op resizes (e.g. mobile URL bar over svh)
        run(scene ? scene.state() : null)
      }, 200)
    }
    window.addEventListener('resize', onResize)
    run(null)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      mq.removeEventListener('change', onMotionPref)
      window.removeEventListener('resize', onResize)
      clearTimeout(rt)
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      section.removeEventListener('pointerup', onLeave)
      section.removeEventListener('pointercancel', onLeave)
    }
  }, [progressRef])

  // The landing scrolls now, so a finger drag has to stay a scroll: touch-none
  // would eat the very gesture the page is built around. Material is deposited
  // by the mouse; on touch, a tap still re-slices.
  return (
    <section
      ref={sectionRef}
      onClick={() => regenRef.current()}
      className="relative h-[100svh] w-full overflow-hidden"
      style={{ backgroundColor: pal.bg }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" aria-hidden="true" />

      {/* Name block, lifted off the bottom edge. The logo sits outside the text
          column rather than above it, so every line below the name starts on the
          name's own left edge instead of the logo's. */}
      <div className="absolute bottom-16 left-6 right-6 z-10 sm:left-10">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex shrink-0 pt-1 sm:pt-1.5" style={{ color: pal.name }}>
            <Logo className="h-11 w-auto sm:h-14" />
          </span>
          <div className="min-w-0">
            <h1 className="text-5xl font-bold leading-[0.98] tracking-tight sm:text-6xl" style={{ color: pal.name }}>
              Charles Abi Chahine<span style={{ color: pal.red }}>.</span>
            </h1>
            {/* Lowercase, deliberately: the drafting labels elsewhere on the
                site shout in caps, and the one place that speaks in Charles's
                own voice should not. */}
            <p className="mt-4 font-mono text-xs lowercase tracking-[0.16em]" style={{ color: pal.sub }}>
              architect · computational designer
            </p>
            {/* The statement carries the voice, so it is set apart from the mono
                label above it: the page's own Helvetica, larger, in the name's
                ink rather than the muted grey, and held to one line. */}
            <p
              className="mt-3 text-[1.05rem] font-light lowercase leading-snug sm:whitespace-nowrap sm:text-[1.3rem]"
              style={{ color: pal.name }}
            >
              design, computation, and the work of getting it built.
            </p>
            {/* An instruction, not a link. The work is one screen down rather
                than one click away, so this points at the gesture that gets
                there; a second route to /work sitting here would only compete
                with the scroll it is asking for. */}
            <p
              className="mt-6 inline-flex items-center gap-1.5 font-mono text-[0.62rem] lowercase tracking-[0.18em]"
              style={{ color: pal.red }}
            >
              scroll to view selected work <span aria-hidden="true">↓</span>
            </p>
          </div>
        </div>
      </div>

      {/* Legend — names the slicer layers the canvas actually draws (outer
          perimeter, inner shells, 45° infill), so the piece reads as the
          slice it is. Swatches are tinted from the same palette as the
          strokes, so they track the theme. Rests on the baseline with the name.
          pointer-events-none keeps a click here re-slicing like the rest. */}
      <div
        className="pointer-events-none absolute bottom-16 right-10 z-10 hidden flex-col items-end gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.1em] lg:flex"
        style={{ color: pal.hint }}
      >
        {[
          {
            label: 'Outer shell',
            swatch: <span className="block h-0 w-4" style={{ borderTop: `1.5px solid rgba(${pal.line},0.85)` }} />,
          },
          {
            label: 'Inner shells',
            swatch: (
              <span className="flex w-4 flex-col gap-[3px]">
                <span className="block h-0 w-full" style={{ borderTop: `1px solid rgba(${pal.lineSoft},0.5)` }} />
                <span className="block h-0 w-full" style={{ borderTop: `1px solid rgba(${pal.lineSoft},0.5)` }} />
              </span>
            ),
          },
          {
            label: 'Infill · 45°',
            swatch: (
              <span
                className="block h-2 w-4"
                style={{ backgroundImage: `repeating-linear-gradient(45deg, rgba(${pal.lineSoft},0.55) 0 1px, transparent 1px 4px)` }}
              />
            ),
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span>{row.label}</span>
            {row.swatch}
          </div>
        ))}
        <span className="mt-1.5" style={{ color: pal.hint, opacity: 0.7 }}>
          Click to re-slice
        </span>
      </div>
    </section>
  )
}
