import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProjectLink from '../components/ProjectLink.jsx'
import FooterSlot from '../components/FooterSlot.jsx'
import { asset, projects } from '../data/projects.js'
import { BELTS, BELT_BY_LABEL, beltFor } from '../data/belts.js'

// An animated cover rests on its static first-frame poster, so the index is a
// wall of stills and nothing heavy loads. The animation is mounted only while
// the cursor is on the tile, which is also what stops it again when it leaves.
// The three animated covers are video, not GIF: same footage at roughly a tenth
// of the bytes (3.9MB of GIF became 399KB of WebM). WebM first, MP4 for Safari.
const isAnimated = (p) => p.cover.endsWith('.webm')
const posterFor = (p) => (isAnimated(p) ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover)
const videoFor = (p, ext) => p.cover.replace(/cover\.webm$/, `cover.${ext}`)

// 0.6875rem is the site's floor for anything informational: this voice carries
// the project count, the years and the awards, and at 0.56rem it was 8.96px —
// a stamp rather than something to read. Only the width of the tile row moves
// with it, and a tile is wider than its longest title.
const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em]'

// The same four belts the landing groups by, in the same order, so pressing a
// count there arrives here on a page that agrees with the one it came from.
// Practice is the fourth: it has no category of its own in projects.js, which is
// why the grouping lives in belts.js rather than in the project records.
// Fixed order, independent of the data, so the filter bar does not reshuffle when
// a project is added.
const CATEGORIES = BELTS.map((b) => b.label)

// Each belt's hue carries on the filter pill and on the dot beside every title,
// so the grouping reads without a legend.
const CATEGORY_COLOR = Object.fromEntries(BELTS.map((b) => [b.label, b.color]))

// One radius for every surface on this page — tile, pill, scrubber. On the 4px
// scrubber bar the browser clamps it to a pill, which is why it can stay a
// single value rather than a set.
const R = 'rounded-[10px]'

// The card's arrow, spelled out once: 34px, on the paper, going accent on hover.
// The caller adds the side. It is the same object as the arrows inside a project
// card, so the control is met on the index and recognised again in the card.
const ARROW =
  'absolute top-1/2 z-[3] hidden h-[34px] w-[34px] -translate-y-1/2 items-center justify-center ' +
  'rounded-full border border-line bg-paper/80 text-ink opacity-0 ' +
  'transition-[opacity,color,border-color] duration-300 hover:border-accent hover:text-accent lg:flex'

// 38vh rather than the 46vh this page used to run at: three tiles plus a slice
// of the fourth fit, and that slice is what tells you the strip scrolls.
const FRAME = `relative aspect-[4/3] w-full overflow-hidden bg-line lg:h-[clamp(250px,38vh,400px)] lg:w-auto ${R}`

function ProjectTile({ p, hot, motionOk, onFocus, onBlur }) {
  const color = beltFor(p).color
  const animate = motionOk && isAnimated(p)
  // mounted: the element exists and is fetching. ready: it can paint a frame.
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)

  // A cursor sweeping the strip crosses every tile on the way, so mounting waits
  // for it to settle — otherwise one pass pulls every cover on the row. Unlike
  // the preloaded GIF this replaced, an unmounted <video> also aborts its own
  // request, so a sweep costs nothing once the cursor has moved on.
  useEffect(() => {
    if (!hot || !animate) {
      setMounted(false)
      setReady(false)
      return
    }
    const timer = setTimeout(() => setMounted(true), 140)
    return () => clearTimeout(timer)
  }, [hot, animate])

  const playing = mounted && ready

  return (
    // onFocus/onBlur, so arriving by keyboard lights the tile the way the
    // cursor does: the cover comes out of greyscale and the title takes its
    // category colour, which is the only thing that says which of eighteen
    // tiles you are on. The pointer keeps its own path — see the strip's
    // pointermove handler, which is what sets this for a cursor.
    <ProjectLink
      slug={p.slug}
      data-slug={p.slug}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`block ${R}`}
    >
      <div className={FRAME}>
        {/* The heading below is inside this link and names it, so an alt here
            would announce the project twice. */}
        <img
          src={asset(posterFor(p))}
          alt=""
          loading="lazy"
          draggable="false"
          className={`h-full w-full object-cover transition duration-500 ease-out ${
            hot ? 'scale-[1.03] grayscale-0' : 'grayscale'
          }`}
        />
        {/* The animated cover fades in over its own poster once it can paint a
            frame, so it never tears. Unmounting it when the cursor leaves is what
            rewinds it, so every visit starts from frame one. */}
        {mounted && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            onCanPlay={() => setReady(true)}
            className={`absolute inset-0 h-full w-full scale-[1.03] object-cover transition-opacity duration-300 ${
              playing ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src={asset(videoFor(p, 'webm'))} type="video/webm" />
            <source src={asset(videoFor(p, 'mp4'))} type="video/mp4" />
          </video>
        )}
      </div>
      {/* Title under the image, so all nineteen can be read without hovering —
          and mobile has no hover at all. The dot carries the category the pills
          above have already introduced. */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          aria-hidden="true"
          className="h-[7px] w-[7px] shrink-0 -translate-y-px rounded-[2px]"
          style={{ backgroundColor: color }}
        />
        <h2
          className="min-w-0 truncate text-[0.82rem] font-medium transition-colors duration-300"
          style={{ color: hot ? color : 'var(--color-ink)' }}
        >
          {p.title}
        </h2>
        {/* The award, named. Always the accent, never the category colour — a
            distinction should read as itself, not as its group. Its own line
            until lg, inline after: a tile narrower than about 340px cannot hold
            the longest title and the longest award on one line, and it is the
            title that gets cut. */}
        {p.award && (
          <span className={`order-last w-full shrink-0 lg:order-none lg:w-auto ${MONO} text-accent`}>
            <span className="sr-only">Awarded: </span>
            {p.award}
          </span>
        )}
        <span className={`ml-auto shrink-0 tabular-nums ${MONO} text-muted`}>{p.year}</span>
      </div>
    </ProjectLink>
  )
}

export default function Work() {
  /*
   * The filter is the URL, not a piece of state that happens to start from it.
   *
   * It was read once on mount and then kept privately, so pressing a pill left
   * the URL saying /work: a refresh lost the filter, and a link shared from a
   * filtered index arrived unfiltered. Deriving it from the query instead means
   * the page you are looking at and the address of it cannot disagree, and the
   * homepage's category strands, which have always arrived as ?category=, now
   * use the same road in as a click does.
   *
   * replace, so eighteen presses do not become eighteen entries to back out
   * through; All drops the parameter rather than writing ?category=All.
   * Anything unrecognised falls back to All.
   */
  const [params, setParams] = useSearchParams()
  const asked = params.get('category')
  const filter = CATEGORIES.includes(asked) ? asked : 'All'
  const setFilter = (cat) =>
    setParams(cat === 'All' ? {} : { category: cat }, { replace: true })
  // Which tile the cursor is over. Held in state rather than left to :hover
  // because a browser only re-evaluates :hover when the pointer moves — see the
  // effect below.
  const [hotSlug, setHotSlug] = useState(null)
  const [motionOk, setMotionOk] = useState(true)
  // Whether the strip is a filmstrip. Below lg it is a plain vertical grid that
  // scrolls with the page, which is why this is not only a styling question —
  // see the region's tabIndex and label further down.
  const [filmstrip, setFilmstrip] = useState(false)

  const pillsRef = useRef(null)
  const stripRef = useRef(null)
  const trackRef = useRef(null)
  const thumbRef = useRef(null)
  const indRef = useRef(null)
  const fadeLRef = useRef(null)
  const fadeRRef = useRef(null)
  const prevRef = useRef(null)
  const nextRef = useRef(null)
  const countRef = useRef(null)
  const syncRef = useRef(() => {})

  // A filtered view uses the belt's own order, which puts awarded projects first.
  // That is what makes the two covers you were looking at on the landing the two
  // that lead the strip here. 'All' stays newest-first: it is the plain index.
  const filtered = useMemo(
    () => (filter === 'All' ? projects : (BELT_BY_LABEL[filter]?.items ?? projects)),
    [filter]
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMotionOk(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Same shape, same breakpoint the layout uses. Read here rather than assumed,
  // because the answer decides what the strip claims to be, not just how it looks.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setFilmstrip(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const el = stripRef.current
    const track = trackRef.current
    const thumb = thumbRef.current
    const ind = indRef.current
    const prev = prevRef.current
    const next = nextRef.current
    if (!el) return
    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches
    const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const maxScroll = () => el.scrollWidth - el.clientWidth

    // ── the indicator, the edge fades, and the hover target all read from the
    //    same scroll position, so they are refreshed together ──────────────────
    let cursor = null

    const syncThumb = () => {
      if (!track || !thumb || !ind) return
      const overflow = maxScroll()
      const can = overflow > 1
      ind.style.opacity = can ? '1' : '0'
      ind.style.pointerEvents = can ? 'auto' : 'none'
      const trackW = track.clientWidth
      const thumbW = Math.max(28, Math.round(trackW * (el.clientWidth / el.scrollWidth)))
      const pos = overflow > 0 ? (el.scrollLeft / overflow) * (trackW - thumbW) : 0
      thumb.style.width = `${thumbW}px`
      thumb.style.transform = `translateX(${pos}px)`
      const atStart = el.scrollLeft <= 8
      const atEnd = el.scrollLeft >= overflow - 8
      if (fadeLRef.current) fadeLRef.current.style.opacity = can && !atStart ? '1' : '0'
      if (fadeRRef.current) fadeRRef.current.style.opacity = can && !atEnd ? '1' : '0'

      // The arrows say the same thing the fades do, but as something to press.
      // Disabled rather than merely faded, so a keyboard tab does not land on an
      // end of the strip that has nowhere to go.
      for (const [btn, spent] of [
        [prev, atStart],
        [next, atEnd],
      ]) {
        if (!btn) continue
        btn.disabled = !can || spent
        btn.style.opacity = btn.disabled ? '0' : '1'
        btn.style.pointerEvents = btn.disabled ? 'none' : 'auto'
      }

      // "03 / 18": which tile the strip starts on. The first one whose left edge
      // has not been scrolled past is the first you can actually see whole, and
      // it is read off the tiles rather than divided out of the scroll position,
      // which would go wrong the moment the tiles are not all one width.
      if (countRef.current) {
        const lis = el.querySelectorAll('li')
        const edge = el.getBoundingClientRect().left - 1
        let first = 0
        for (let i = 0; i < lis.length; i++) {
          if (lis[i].getBoundingClientRect().left >= edge) {
            first = i
            break
          }
        }
        const pad = (n) => String(n).padStart(2, '0')
        countRef.current.textContent = `${pad(first + 1)} / ${pad(lis.length)}`
        countRef.current.style.opacity = can ? '1' : '0'
      }
    }

    // A browser re-evaluates :hover only when the pointer moves. On a strip that
    // scrolls under a still cursor, the tile arriving beneath it would stay dead
    // until the mouse was jiggled — so the cursor is tracked and re-tested here
    // after every scroll, whatever caused it.
    const refreshHot = () => {
      if (!cursor || !isDesktop()) return
      const r = el.getBoundingClientRect()
      if (cursor.x < r.left || cursor.x > r.right || cursor.y < r.top || cursor.y > r.bottom) {
        setHotSlug(null)
        return
      }
      const under = document.elementFromPoint(cursor.x, cursor.y)
      const tile = under?.closest?.('[data-slug]')
      setHotSlug(tile && el.contains(tile) ? tile.dataset.slug : null)
    }

    const onPointerMove = (e) => {
      // touch has no hover, and a tap-scroll would otherwise light tiles up
      if (e.pointerType && e.pointerType !== 'mouse') return
      cursor = { x: e.clientX, y: e.clientY }
      refreshHot()
    }

    const sync = () => {
      syncThumb()
      refreshHot()
    }
    syncRef.current = sync

    // ── eased scrolling ───────────────────────────────────────────────────────
    // Everything that moves the strip goes through one target, so the wheel, the
    // arrow keys and the scrubber all decelerate identically. `pos` is tracked as
    // a float: reading scrollLeft back each frame does not work, because the
    // browser quantises it to physical pixels and the eased step then rounds away
    // to nothing a couple of pixels short, leaving the loop running forever.
    let target = null
    let pos = null
    let raf = 0

    const stopGlide = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      target = null
      pos = null
    }

    const glide = () => {
      target = Math.max(0, Math.min(target, maxScroll()))
      const d = target - pos
      if (Math.abs(d) < 0.5) {
        el.scrollLeft = target
        stopGlide()
        return
      }
      pos += d * 0.22
      el.scrollLeft = pos
      raf = requestAnimationFrame(glide)
    }
    const glideTo = (x) => {
      if (reduce()) {
        stopGlide()
        el.scrollLeft = Math.max(0, Math.min(x, maxScroll()))
        return
      }
      target = x
      // pos survives across retargets so a glide already under way keeps its
      // speed; it is only re-read when starting from rest. Always rescheduling
      // rather than guarding on `raf` means a frame that never runs cannot
      // latch the guard and kill every later glide.
      if (pos === null) pos = el.scrollLeft
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(glide)
    }
    const glideBy = (dx) => glideTo((target === null ? el.scrollLeft : target) + dx)

    // No snapping, by choice: the strip comes to rest exactly where it is left.
    // Nothing repositions it after the fact.

    // One tile plus the gap, measured rather than assumed so it stays right at
    // any density.
    const tileStep = () => {
      const lis = el.querySelectorAll('li')
      if (lis.length > 1) {
        const a = lis[0].getBoundingClientRect()
        const b = lis[1].getBoundingClientRect()
        return b.left - a.left
      }
      return (lis[0]?.getBoundingClientRect().width ?? 400) + 24
    }

    const onPrev = () => glideBy(-tileStep())
    const onNext = () => glideBy(tileStep())

    // Mouse-wheel users cannot scroll a horizontal strip natively. A notched wheel
    // arrives in ~100px jumps and needs easing; a trackpad arrives as a continuous
    // stream that already carries its own inertia, and easing that only adds lag.
    const onWheel = (e) => {
      if (!isDesktop() || maxScroll() <= 0) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.deltaY === 0) return
      e.preventDefault()
      const notched = e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50
      if (notched) {
        glideBy(e.deltaY * 1.15)
      } else {
        stopGlide()
        el.scrollLeft += e.deltaY
      }
    }

    const onKeyDown = (e) => {
      if (!isDesktop()) return
      if (e.key === 'ArrowRight') glideBy(tileStep())
      else if (e.key === 'ArrowLeft') glideBy(-tileStep())
      else if (e.key === 'Home') glideTo(0)
      else if (e.key === 'End') glideTo(maxScroll())
      else if (e.key === 'PageDown') glideBy(el.clientWidth * 0.9)
      else if (e.key === 'PageUp') glideBy(-el.clientWidth * 0.9)
      else return
      e.preventDefault()
    }

    // ── drag the strip itself ─────────────────────────────────────────────────
    let drag = null
    let swallowClick = false
    const onDown = (e) => {
      if (e.button !== 0 || !isDesktop() || maxScroll() <= 0) return
      stopGlide()
      drag = { x: e.clientX, left: el.scrollLeft, moved: false }
      el.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (Math.abs(dx) > 4) drag.moved = true
      if (drag.moved) {
        el.scrollLeft = drag.left - dx
      }
    }
    const onUp = () => {
      if (!drag) return
      el.style.cursor = ''
      swallowClick = drag.moved
      drag = null
      setTimeout(() => {
        swallowClick = false
      }, 300)
    }
    // A drag that happens to end on a tile must not open the project.
    const onClickCapture = (e) => {
      if (!swallowClick) return
      swallowClick = false
      e.preventDefault()
      e.stopPropagation()
    }

    // ── scrubber: the whole row is the target, not the 4px bar ────────────────
    let scrubbing = false
    const scrub = (clientX) => {
      if (!track || !thumb) return
      const rect = track.getBoundingClientRect()
      const thumbW = thumb.offsetWidth
      const span = rect.width - thumbW
      const x = Math.max(0, Math.min(clientX - rect.left - thumbW / 2, span))
      const to = span > 0 ? (x / span) * maxScroll() : 0
      // a click on the track eases across; a drag tracks the pointer exactly
      if (scrubbing) {
        stopGlide()
        el.scrollLeft = to
      } else {
        glideTo(to)
      }
    }
    const onIndDown = (e) => {
      if (maxScroll() <= 0) return
      scrub(e.clientX)
      scrubbing = true
      ind?.setPointerCapture?.(e.pointerId)
    }
    const onIndMove = (e) => {
      if (scrubbing) scrub(e.clientX)
    }
    const endScrub = () => {
      scrubbing = false
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', sync, { passive: true })
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerleave', () => setHotSlug(null))
    el.addEventListener('click', onClickCapture, true)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('resize', sync)
    ind?.addEventListener('pointerdown', onIndDown)
    ind?.addEventListener('pointermove', onIndMove)
    ind?.addEventListener('pointerup', endScrub)
    ind?.addEventListener('pointercancel', endScrub)
    // Through glideBy, so a press decelerates exactly like the wheel and the
    // arrow keys, and repeated presses retarget one glide rather than fighting.
    prev?.addEventListener('click', onPrev)
    next?.addEventListener('click', onNext)
    sync()

    return () => {
      stopGlide()
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', sync)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('resize', sync)
      ind?.removeEventListener('pointerdown', onIndDown)
      ind?.removeEventListener('pointermove', onIndMove)
      ind?.removeEventListener('pointerup', endScrub)
      ind?.removeEventListener('pointercancel', endScrub)
      prev?.removeEventListener('click', onPrev)
      next?.removeEventListener('click', onNext)
    }
  }, [])

  /*
   * Bring the pressed pill into view, sideways, inside its own row.
   *
   * Below lg the four pills do not fit across a phone and the row scrolls; a
   * visitor arriving on ?category=Practice landed with the row at scrollLeft 0
   * and the pressed pill off the right-hand end, so every pill in sight looked
   * unselected and the only clue that a filter was on at all was the project
   * count.
   *
   * scrollLeft rather than scrollIntoView: that walks up the ancestors and would
   * scroll the page vertically as well, which on arrival would move the ground
   * under someone who has not touched anything yet. Instant, for the same
   * reason. At lg the row does not scroll, so this is a no-op there.
   */
  useEffect(() => {
    const row = pillsRef.current
    const pill = row?.querySelector('[data-on="true"]')
    if (!row || !pill) return
    const rowBox = row.getBoundingClientRect()
    const pillBox = pill.getBoundingClientRect()
    const centred = row.scrollLeft + (pillBox.left - rowBox.left) - (row.clientWidth - pillBox.width) / 2
    row.scrollLeft = Math.max(0, Math.min(centred, row.scrollWidth - row.clientWidth))
  }, [filter])

  // A smaller set may not overflow at all, so the scrubber and the fades have to
  // be recomputed — and the tile under the cursor has just been replaced.
  useEffect(() => {
    const el = stripRef.current
    if (el) el.scrollLeft = 0
    setHotSlug(null)
    syncRef.current()
  }, [filter])

  return (
    <div className="flex w-full flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <h1 className="sr-only">Work</h1>

      {/* Header, strip and scrubber travel as one block, centred in what is left
          of the viewport. The top padding clears the Dynamic Island, which is
          fixed at top centre — a right-aligned pill row would otherwise run
          straight into it around 1024px. */}
      <div className="flex min-h-0 flex-1 flex-col pt-[68px] lg:justify-center lg:pt-[76px]">
        <div className="flex shrink-0 flex-col gap-3 px-6 pb-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-10">
          <div className="flex items-baseline gap-3.5">
            <span className={`${MONO} text-ink`}>Work</span>
            {/* Pressing a pill replaces the strip and changes nothing else that
                is announced, so this number is the confirmation that the filter
                did anything. */}
            <span aria-live="polite" className={`${MONO} tabular-nums text-muted`}>
              {filtered.length} {filtered.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>

          {/* Below lg the row scrolls sideways rather than wrapping — four pills
              do not fit across a phone, and a second line would push the first
              tile off screen. */}
          <nav
            ref={pillsRef}
            aria-label="Filter by category"
            className="-mx-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {['All', ...CATEGORIES].map((cat) => {
              const on = filter === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  aria-pressed={on}
                  data-on={on}
                  style={{ '--c': cat === 'All' ? 'var(--color-ink)' : CATEGORY_COLOR[cat] }}
                  className={`shrink-0 whitespace-nowrap border px-3.5 py-2.5 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.14em] transition-colors ${R} data-[on=false]:border-[color-mix(in_srgb,var(--c)_34%,transparent)] data-[on=false]:text-[var(--c)] data-[on=false]:hover:border-[color-mix(in_srgb,var(--c)_62%,transparent)] data-[on=false]:hover:bg-[color-mix(in_srgb,var(--c)_9%,transparent)] data-[on=true]:border-[var(--c)] data-[on=true]:bg-[var(--c)] data-[on=true]:text-paper`}
                >
                  {cat}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Below lg: a vertical grid that scrolls with the page. lg and up: a
            horizontal filmstrip that scrolls sideways, so the page itself never
            scrolls down. The native scrollbar is hidden — the scrubber below
            carries position. */}
        <div className="relative flex min-h-0 flex-col">
          {/* A tab stop that promises arrow keys, only where the arrow keys are
              wired up. Below lg this is a vertical grid that the page scrolls,
              so the stop led nowhere and the label described a control that did
              not exist. */}
          <div
            ref={stripRef}
            tabIndex={filmstrip ? 0 : undefined}
            role="region"
            aria-label={filmstrip ? 'Projects: scroll sideways or use the arrow keys' : undefined}
            className="min-h-0 px-6 pb-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent lg:overflow-x-auto lg:overflow-y-hidden lg:overscroll-x-contain lg:px-0 lg:pb-0 lg:cursor-grab lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden"
          >
            <ul
              key={filter}
              className="fade-in grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:flex lg:h-full lg:items-center lg:gap-6 lg:px-10"
            >
              {filtered.map((p) => (
                <li key={p.slug} className="lg:shrink-0">
                  <ProjectTile
                    p={p}
                    hot={hotSlug === p.slug}
                    motionOk={motionOk}
                    onFocus={() => setHotSlug(p.slug)}
                    onBlur={() => setHotSlug(null)}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* The clipped tile dissolves into the paper, so the edge reads as
              "more this way" rather than as a crop. */}
          <span
            ref={fadeLRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-[2] hidden w-[72px] opacity-0 transition-opacity duration-300 lg:block"
            style={{
              background:
                'linear-gradient(to right, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 55%, transparent) 48%, color-mix(in srgb, var(--color-paper) 0%, transparent) 100%)',
            }}
          />
          <span
            ref={fadeRRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-[2] hidden w-[72px] opacity-0 transition-opacity duration-300 lg:block"
            style={{
              background:
                'linear-gradient(to left, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 55%, transparent) 48%, color-mix(in srgb, var(--color-paper) 0%, transparent) 100%)',
            }}
          />

          {/* Something to press. Three and a bit of eighteen tiles are on screen
              and the only cues were the clipped fourth, the fade over it and a
              4px scrubber — all of them things you notice after you have already
              worked out that it scrolls. Desktop only: below lg this is a
              vertical grid.

              Above the fades, and one tile per press, so a press and an arrow
              key do the same thing. */}
          <button ref={prevRef} type="button" aria-label="Previous projects" className={`left-2.5 ${ARROW}`}>
            ←
          </button>
          <button ref={nextRef} type="button" aria-label="Next projects" className={`right-2.5 ${ARROW}`}>
            →
          </button>
        </div>

        {/* Scroll position (desktop filmstrip only). The whole row is the hit
            target, not the bar — click to ease across, drag to scrub. The count
            sits outside that target, so reading it is not a way to scrub by
            accident. A bar says how far along; a number says how far along out
            of how many, which is the thing you wanted to know. */}
        <div className="mt-2.5 hidden shrink-0 items-center gap-3.5 px-10 lg:flex">
          <div
            ref={indRef}
            className="group flex h-[26px] flex-1 cursor-pointer touch-none items-center transition-opacity duration-300"
          >
            <div
              ref={trackRef}
              className={`relative h-[4px] w-full bg-line transition-[height] duration-150 group-hover:h-[7px] ${R}`}
            >
              <div
                ref={thumbRef}
                className={`absolute left-0 top-0 h-full bg-soft transition-colors duration-150 group-hover:bg-ink ${R}`}
                style={{ width: '80px' }}
              />
            </div>
          </div>
          <span
            ref={countRef}
            aria-hidden="true"
            className={`shrink-0 tabular-nums opacity-0 transition-opacity duration-300 ${MONO} text-muted`}
          />
        </div>
      </div>

      {/* The booklet goes in the shared footer's middle rather than in a footer
          of this page's own. It is generated by scripts/book-pdf.mjs from the
          same data this page renders, so it cannot drift from what is above. */}
      <FooterSlot>
        <a
          className="chrome-label text-[0.6875rem] text-muted transition-colors hover:text-accent"
          href={asset('book.pdf')}
          download
        >
          The book (PDF) ↓
        </a>
      </FooterSlot>
    </div>
  )
}
