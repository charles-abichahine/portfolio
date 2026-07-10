import { useEffect, useRef } from 'react'

/*
 * Cipher Rings — the site's generative identity, ported from the logo's ring DNA.
 * Concentric broken rings whose gaps and offsets step by the golden angle; arcs
 * draw themselves on load, then counter-rotate slowly. One arc is red. A fresh
 * composition is generated on every mount (and on click). Static settled frame
 * under prefers-reduced-motion.
 */

const GOLDEN = (137.508 * Math.PI) / 180
const INK = '#e9e9e4'
const RED = '#e5382b'
const GRID = 'rgba(233,233,228,0.05)'
const rnd = (a, b) => a + Math.random() * (b - a)
const easeOut = (p) => 1 - Math.pow(1 - p, 3)

function drawGrid(ctx, W, H) {
  const s = 34
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (let x = s; x < W; x += s) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = s; y < H; y += s) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
}

function makeRings(W, H) {
  // Wide screens: bias the rings right so the name reads clearly on the left.
  // Narrow screens: center them and lift up, clear of the stacked name below.
  const wide = W > 820
  const cx = wide ? W * 0.63 : W * 0.5
  const cy = wide ? H * 0.5 : H * 0.4
  const base = Math.min(W, H) * (wide ? 0.38 : 0.34)
  const count = 3 + (Math.random() < 0.5 ? 0 : 1)
  const sw = Math.max(4, Math.min(W, H) * 0.02)
  const rr = []
  for (let i = 0; i < count; i++) {
    const radius = base * (1 - i * (0.62 / count))
    const k = 1 + (Math.random() < 0.6 ? 1 : Math.random() < 0.5 ? 0 : 2)
    const gap = rnd(0.35, 0.9)
    const segLen = (2 * Math.PI - k * gap) / k
    rr.push({
      radius,
      k,
      gap,
      segLen,
      off: i * GOLDEN + rnd(0, 1),
      spin: (i % 2 ? 1 : -1) * rnd(0.05, 0.13),
    })
  }
  const redRing = (Math.random() * count) | 0
  const redSeg = (Math.random() * rr[redRing].k) | 0
  const DUR = 1300
  return function frame(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h)
    drawGrid(ctx, w, h)
    const rev = easeOut(Math.min(1, t / DUR))
    ctx.lineCap = 'round'
    rr.forEach((r, ri) => {
      const rot = r.off + (t / 1000) * r.spin
      for (let s = 0; s < r.k; s++) {
        const a0 = rot + s * (r.segLen + r.gap)
        const a1 = a0 + r.segLen * rev
        ctx.beginPath()
        ctx.arc(cx, cy, r.radius, a0, a1)
        const isRed = ri === redRing && s === redSeg
        ctx.strokeStyle = isRed ? RED : INK
        ctx.lineWidth = isRed ? sw * 1.05 : sw
        ctx.stroke()
      }
    })
  }
}

export default function CipherRingsHero() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const regenRef = useRef(() => {})

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0
    let H = 0
    let frame = null
    let start = 0
    let raf = 0
    let visible = true

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
      raf = 0
      const t = performance.now() - start
      frame(ctx, W, H, t)
      if (visible) raf = requestAnimationFrame(loop)
    }
    function run() {
      if (raf) cancelAnimationFrame(raf)
      size()
      frame = makeRings(W, H)
      start = performance.now()
      if (reduce) frame(ctx, W, H, 1e6)
      else loop()
    }
    regenRef.current = run

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting
        if (visible && !raf && !reduce) loop()
      },
      { threshold: 0.02 },
    )
    io.observe(section)

    let rt
    const onResize = () => {
      clearTimeout(rt)
      rt = setTimeout(run, 200)
    }
    window.addEventListener('resize', onResize)
    run()

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      clearTimeout(rt)
    }
  }, [])

  const scrollToWork = () => {
    document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[92svh] w-full overflow-hidden bg-[#0e0e12]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-2/5 bg-gradient-to-t from-[#0e0e12] to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28">
        <p className="mb-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[#86868c]">
          Portfolio — MaCAD, IAAC Barcelona
        </p>
        <h1 className="mb-4 max-w-[14ch] text-5xl font-bold leading-[0.98] tracking-tight text-[#f4f4ee] sm:text-6xl md:text-7xl">
          Charles Abi Chahine<span className="text-[#e5382b]">.</span>
        </h1>
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.16em] text-[#a9a9a2]">
          <span className="text-[#d7d7d0]">Architect</span> · Computational Designer —
          Rhino · Grasshopper · Python · React
        </p>
        <button
          type="button"
          onClick={scrollToWork}
          className="group flex w-fit items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#86868c] transition-colors hover:text-[#f4f4ee]"
        >
          Selected work
          <span className="transition-transform group-hover:translate-y-0.5">↓</span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => regenRef.current()}
        className="absolute bottom-5 right-5 z-10 rounded border border-[#33333c] bg-[#141418]/70 px-2.5 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[#c9c9c2] transition-colors hover:border-[#e5382b] hover:text-[#e5382b]"
        title="Every load draws a new composition"
      >
        ↻ Regenerate
      </button>
    </section>
  )
}
