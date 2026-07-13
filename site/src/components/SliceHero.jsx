import { useEffect, useRef } from 'react'
import Logo from './Logo.jsx'

/*
 * Slice Hero — the site's generative identity, retuned from 3D printing.
 * A slowly-morphing solid is expressed as its signed-distance field, then
 * drawn the way a slicer draws a layer: perimeter shells + 45° rectilinear
 * infill (marching squares over the SDF). The pointer deposits material like
 * a nozzle; clicking the field re-slices a fresh form. Monochrome white-on-
 * dark — the only red is the name's period. Static settled frame under
 * prefers-reduced-motion (which is honoured live, not only at load).
 *
 * The solids are stored in normalised coordinates so a resize re-fits the
 * SAME composition to the new size instead of re-rolling a new one.
 */

const rnd = (a, b) => a + Math.random() * (b - a)
const ri = (n) => (Math.random() * n) | 0
const easeOut = (p) => 1 - Math.pow(1 - p, 3)
const lerp = (a, b, t) => a + (b - a) * t
const smin = (a, b, k) => {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k))
  return b * (1 - h) + a * h - k * h * (1 - h)
}

function makeSolids() {
  const n = 3 + ri(2)
  const arr = []
  for (let i = 0; i < n; i++) {
    arr.push({
      bxf: rnd(-0.16, 0.16), byf: 0.4 + rnd(-0.22, 0.22), // bxf is offset from the horizontal anchor
      rNf: rnd(0.05, 0.11),
      axNf: rnd(0.009, 0.037), ayNf: rnd(0.009, 0.037),
      fx: rnd(0.05, 0.12), fy: rnd(0.05, 0.12),
      px: rnd(0, 6.28), py: rnd(0, 6.28),
      rr: rnd(0.15, 0.45), rf: rnd(0.05, 0.12), rp: rnd(0, 6.28),
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
  const km = minWH * 0.045
  const spacing = wide ? 13 : 15

  let solids = carry ? carry.solids : makeSolids()
  let infAng = carry ? carry.infAng : [Math.PI / 4, -Math.PI / 4][ri(2)]

  const dep = { x: 0, y: 0, s: 0 }
  const scratch = Array.from({ length: 6 }, () => ({ x: 0, y: 0, r: 0 })) // solids (≤5) + deposit

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
      o.r = s.rNf * minWH * (1 + s.rr * Math.sin(s.rf * mt + s.rp))
    }
    if (dep.s > 0.01) {
      const o = scratch[count]
      o.x = dep.x; o.y = dep.y; o.r = 0.06 * minWH * dep.s
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
          const dd = Math.hypot(x - s.x, y - s.y) - s.r
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
  function frame(fctx, w, h, t, pointer) {
    const mt = t * 0.0013
    const build = easeOut(Math.min(1, t / 1400))
    dep.s = lerp(dep.s, pointer.active ? 1 : 0, 0.06)
    if (pointer.active) { dep.x = lerp(dep.x, pointer.x, 0.12); dep.y = lerp(dep.y, pointer.y, 0.12) }
    const mn = evalField(mt)
    fctx.clearRect(0, 0, w, h)
    fctx.strokeStyle = 'rgba(244,244,238,0.04)'
    fctx.lineWidth = 1
    fctx.stroke(gridPath)
    if (mn < -1) {
      fctx.lineCap = 'round'
      fctx.lineJoin = 'round'
      const inset = spacing * 0.55
      for (let s = 0; s < 3; s++) {
        const L = -s * inset
        fctx.strokeStyle = s === 0 ? `rgba(244,244,238,${0.55 * build})` : `rgba(233,233,228,${0.32 * build})`
        fctx.lineWidth = s === 0 ? 1.3 : 1
        fctx.beginPath()
        isoPath(fctx, field, cols, rows, cell, L)
        fctx.stroke()
      }
      const wallInset = 3 * inset + 2
      const step = 4
      const ca = Math.cos(infAng)
      const sa = Math.sin(infAng)
      const cx = w / 2
      const cy = h / 2
      const Lr = Math.hypot(w, h)
      fctx.strokeStyle = `rgba(233,233,228,${0.17 * build})`
      fctx.lineWidth = 1
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

export default function SliceHero() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const regenRef = useRef(() => {})

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
      scene.frame(ctx, W, H, t, pointer)
      if (visible && !reduce) raf = requestAnimationFrame(loop)
      else raf = 0
    }
    // carry: preserve the current composition (resize); fresh: null (mount / re-slice)
    function run(carry) {
      if (raf) cancelAnimationFrame(raf)
      size()
      scene = makeSlice(ctx, W, H, carry)
      start = carry ? performance.now() - 2000 : performance.now() // skip the build-in fade on resize
      if (reduce) scene.frame(ctx, W, H, 1e6, pointer)
      else loop()
    }
    regenRef.current = () => {
      if (!scene) return
      scene.regen()
      start = performance.now()
      if (reduce) scene.frame(ctx, W, H, 1e6, pointer)
      else if (!raf) loop()
    }

    const onMove = (e) => {
      const r = section.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.active = true
    }
    const onLeave = () => { pointer.active = false }
    section.addEventListener('pointermove', onMove)
    section.addEventListener('pointerleave', onLeave)

    const onMotionPref = () => {
      reduce = mq.matches
      if (reduce) { if (raf) cancelAnimationFrame(raf); raf = 0; if (scene) scene.frame(ctx, W, H, 1e6, pointer) } else if (!raf) { start = performance.now() - 2000; loop() }
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
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      onClick={() => regenRef.current()}
      className="relative h-[100svh] w-full overflow-hidden bg-[#0e0e12]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex h-[100svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28">
        <div className="flex items-center gap-4 sm:gap-5">
          <Logo className="h-14 w-auto shrink-0 text-[#f4f4ee] sm:h-20" />
          <div>
            <h1 className="text-5xl font-bold leading-[0.96] tracking-tight text-[#f4f4ee] sm:text-6xl md:text-7xl">
              Charles Abi Chahine<span className="text-[#e5382b]">.</span>
            </h1>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-[#a9a9a2]">
              Architect · Computational Designer
            </p>
          </div>
        </div>
      </div>
      <span className="pointer-events-none absolute bottom-5 right-5 z-10 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-[#5a5a62]">
        Click to re-slice
      </span>
    </section>
  )
}
