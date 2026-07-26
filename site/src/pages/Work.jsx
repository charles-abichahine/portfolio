import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { asset, projects } from '../data/projects.js'
import { contact } from '../data/cv.js'

// A GIF cover falls back to its static first-frame poster here — the index is a
// wall of stills, so nothing multi-MB loads; motion lives on the project page.
const isGif = (p) => p.cover.endsWith('.gif')
const coverFor = (p) => (isGif(p) ? p.cover.replace(/cover\.gif$/, 'poster.webp') : p.cover)

const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.16em]'
const LABEL = 'font-mono text-[0.6rem] uppercase tracking-[0.18em]'

// The three categories, each with its own hue. The name is shown in its colour
// under every tile and the hover wash takes the same colour, so the grouping
// reads without a separate legend.
const CATEGORY_COLOR = {
  'Computation & AI': 'var(--color-accent)',
  'BIM & Workflows': 'var(--color-blue)',
  'Design & Research': 'var(--color-green)',
}

// Fixed tile geometry so the strip is even.
const FRAME = 'aspect-[4/3] w-full overflow-hidden lg:h-[clamp(300px,46vh,480px)] lg:w-auto'

function ProjectTile({ p }) {
  const color = CATEGORY_COLOR[p.category]
  return (
    <Link to={`/work/${p.slug}`} className="group block">
      <div className={`relative bg-line ${FRAME}`}>
        <img
          src={asset(coverFor(p))}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover grayscale transition duration-500 ease-out group-hover:scale-[1.03]"
        />
        {/* Hover wash in the category colour. Multiply tints the grayscale still
            while keeping its structure legible through it. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-0 mix-blend-multiply transition-opacity duration-300 ease-out group-hover:opacity-90"
          style={{ backgroundColor: color }}
        />
        <div className="absolute inset-0 flex items-center justify-center px-5 text-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100">
          <h2 className="text-xl font-bold uppercase tracking-wider text-white sm:text-2xl">{p.title}</h2>
        </div>
      </div>
      {/* Category, always visible under the image, in the category colour. */}
      <p className={`mt-3 ${LABEL}`} style={{ color }}>{p.category}</p>
    </Link>
  )
}

export default function Work() {
  const stripRef = useRef(null)
  const trackRef = useRef(null)
  const thumbRef = useRef(null)

  useEffect(() => {
    const el = stripRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!el) return
    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

    // Reflect scroll position in the custom indicator: thumb width is the share
    // of the strip on screen, its offset is how far through the scroll we are.
    const syncThumb = () => {
      if (!track || !thumb) return
      const trackW = track.clientWidth
      const thumbW = Math.max(28, Math.round(trackW * (el.clientWidth / el.scrollWidth)))
      const maxScroll = el.scrollWidth - el.clientWidth
      const pos = maxScroll > 0 ? (el.scrollLeft / maxScroll) * (trackW - thumbW) : 0
      thumb.style.width = `${thumbW}px`
      thumb.style.transform = `translateX(${pos}px)`
    }

    // Mouse-wheel users can't scroll a horizontal strip natively; translate the
    // vertical wheel to horizontal — desktop only, and only when it overflows.
    const onWheel = (e) => {
      if (!isDesktop() || el.scrollWidth <= el.clientWidth || e.deltaY === 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    // Click or drag anywhere on the track to jump/scrub through the strip.
    let dragging = false
    const scrollToClientX = (clientX) => {
      if (!track || !thumb) return
      const rect = track.getBoundingClientRect()
      const thumbW = thumb.offsetWidth
      const span = rect.width - thumbW
      const x = Math.max(0, Math.min(clientX - rect.left - thumbW / 2, span))
      el.scrollLeft = span > 0 ? (x / span) * (el.scrollWidth - el.clientWidth) : 0
    }
    const onDown = (e) => { dragging = true; scrollToClientX(e.clientX); track?.setPointerCapture?.(e.pointerId) }
    const onMove = (e) => { if (dragging) scrollToClientX(e.clientX) }
    const onUp = () => { dragging = false }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', syncThumb, { passive: true })
    window.addEventListener('resize', syncThumb)
    track?.addEventListener('pointerdown', onDown)
    track?.addEventListener('pointermove', onMove)
    track?.addEventListener('pointerup', onUp)
    track?.addEventListener('pointercancel', onUp)
    syncThumb()

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', syncThumb)
      window.removeEventListener('resize', syncThumb)
      track?.removeEventListener('pointerdown', onDown)
      track?.removeEventListener('pointermove', onMove)
      track?.removeEventListener('pointerup', onUp)
      track?.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return (
    <div className="flex w-full flex-col lg:h-[100svh] lg:overflow-hidden">
      <h1 className="sr-only">Work</h1>

      {/* Below lg: a vertical grid that scrolls with the page. lg and up: a
          horizontal filmstrip that fills the viewport height and scrolls
          sideways, so the page itself never scrolls down. Native scrollbar is
          hidden — the custom indicator below carries position. */}
      <div
        ref={stripRef}
        className="flex-1 px-6 py-24 lg:overflow-x-auto lg:overflow-y-hidden lg:px-0 lg:py-0 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
      >
        <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:flex lg:h-full lg:items-center lg:gap-8 lg:px-10">
          {projects.map((p) => (
            <li key={p.slug} className="lg:shrink-0">
              <ProjectTile p={p} />
            </li>
          ))}
        </ul>
      </div>

      {/* Scroll-position indicator (desktop filmstrip only). Click or drag to scrub. */}
      <div className="hidden shrink-0 px-10 pb-3 lg:block">
        <div ref={trackRef} className="relative h-[3px] w-full cursor-pointer rounded-full bg-line">
          <div ref={thumbRef} className="absolute left-0 top-0 h-full rounded-full bg-soft" style={{ width: '80px' }} />
        </div>
      </div>

      {/* Footer — the About page's contact bar. This full-bleed route has no
          global Footer, so contact lives here. */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-6 lg:px-10">
        <p className={`${MONO} text-muted`}>Selected Work — Charles Abi Chahine</p>
        <nav className="flex gap-5">
          <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={`mailto:${contact.email}`}>Email</a>
          <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a className={`${MONO} text-muted transition-colors hover:text-accent`} href={contact.github} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  )
}
