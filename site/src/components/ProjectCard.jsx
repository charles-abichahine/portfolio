import { useEffect, useMemo, useState } from 'react'
import MediaFrame from './MediaFrame.jsx'
import MediaLightbox from './MediaLightbox.jsx'
import { asset } from '../data/projects.js'
import { beltFor } from '../data/belts.js'

/*
 * The gallery, flattened out of the project record.
 *
 * Every piece of section media, in the order the sections put it. Each item
 * carries the section it came from, which is the only thing left holding the
 * shape of the project: the captions alone would read as a pile of pictures.
 *
 * The cover is deliberately not here. It is the tile you clicked to open the
 * card, so leading with it spends the first frame showing you what you just
 * pressed, and for the Huddle it appeared twice because its cover is also one of
 * its section images.
 *
 * Posters are named two ways in the data: a cover is `cover.webm` beside
 * `poster.webp`, a section loop is `x.webm` beside `x-poster.webp`.
 */
function galleryFor(project) {
  const evidence = project.sections.flatMap((s, i) =>
    s.media.map((m) => ({
      kind: m.type,
      src: m.src,
      // Both kinds carry a poster now, named the same way: the file beside it
      // with -poster.webp for a suffix.
      poster: m.type === 'image' ? null : m.src.replace(/\.[a-z0-9]+$/i, '-poster.webp'),
      section: `${String(i + 1).padStart(2, '0')} · ${s.heading}`,
      caption: m.caption,
    })),
  )

  if (evidence.length > 0) return evidence

  // A project may carry no section media at all, and then its gallery is empty
  // and there is nothing to draw, so it falls back to the cover. Stratus was the
  // one that needed this and it is gone, but the shape of the record still
  // allows a project with nothing but a cover.
  const animated = project.cover.endsWith('.webm')
  return [
    {
      kind: animated ? 'loop' : 'image',
      src: project.cover,
      poster: animated ? project.cover.replace(/cover\.webm$/, 'poster.webp') : null,
      section: 'Cover',
      caption: '',
    },
  ]
}

/*
 * Why the well is 19/11.
 *
 * The media is contained, never cropped, so the frame's own shape decides how
 * much of it is wasted: an item of aspect r inside a well of aspect A covers
 * min(r,A)/max(r,A) of it. Measured across all 76 items the median is 1.87, not
 * the 1.60 this used to be. The work skews wide, seven panoramas against seven
 * portraits. At 19/11 the average item covers 82% of the well rather than 78%,
 * and widening the column from 632 to 760 put about 41% more pixels on screen.
 *
 * It is still not native size. Nothing here is: 54% on average. That is what
 * MediaLightbox is for.
 */

const WELL = 'bg-[color-mix(in_srgb,var(--color-line)_45%,var(--color-paper))]'

export default function ProjectCard({ project, onClose }) {
  const items = useMemo(() => galleryFor(project), [project])
  const [at, setAt] = useState(0)
  const [full, setFull] = useState(false)
  const color = beltFor(project).color
  const many = items.length > 1
  const item = items[at]

  // Moving prev/next between projects is gone, but the card is still reused if
  // the slug ever changes under it.
  useEffect(() => {
    setAt(0)
    setFull(false)
  }, [project.slug])

  useEffect(() => {
    if (!many) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setAt((i) => (i + 1) % items.length)
      if (e.key === 'ArrowLeft') setAt((i) => (i - 1 + items.length) % items.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [many, items.length])

  const step = (d) => setAt((i) => (i + d + items.length) % items.length)

  const record = [
    ['Year', project.year],
    ['Module', project.module],
    ['Team', project.team.join(', '), true],
    ['Tools', project.tools.join(' · '), true],
  ]

  return (
    <div
      /*
       * One size, every project.
       *
       * The height used to come from whichever column was taller, so a project
       * with a long intro got a taller card than one with a short intro, and the
       * card changed shape as you moved between them. A definite height fixes
       * that: 622px is the gallery column at its intended size, and everything
       * that varies (the writing, the number of thumbnails) is absorbed inside
       * rather than pushing the edges out.
       *
       * The cap is in viewport units, not max-h-full. A percentage max-height
       * resolves against the parent's height, and the parent here is centred
       * rather than stretched, so its height is indefinite and the percentage
       * silently does nothing: at 1280x660 the card stayed 622px inside 580px of
       * room. 5rem is the padding the backdrop keeps on each side.
       */
      className="grid h-[calc(100svh-1.5rem)] max-h-full w-full max-w-[1180px] grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-[14px] border border-line bg-paper p-3.5 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)] sm:h-[calc(100svh-3rem)] wide-short:grid-cols-[minmax(0,1.55fr)_24px_minmax(0,1fr)] wide-short:grid-rows-[minmax(0,1fr)] lg:h-[622px] lg:max-h-[calc(100vh-5rem)] lg:grid-cols-[760px_40px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:p-6"
      style={{ '--c': color }}
    >
      {/* ── the gallery ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col lg:min-h-0">
        <div
          // The well takes whatever the card has left rather than setting the
          // height itself. That is what keeps every card the same size: a project
          // with one thumbnail has no strip, so the well simply grows into the
          // space instead of the card shrinking. On a short screen it gives
          // height back the same way, which is what stopped the record being cut
          // off below the card edge.
          //
          // Below lg the card is not a fixed height, so there the aspect still
          // sets it.
          className={`relative flex aspect-[16/9] max-h-[30svh] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line wide-short:aspect-auto wide-short:max-h-none wide-short:min-h-0 wide-short:shrink wide-short:flex-1 lg:aspect-auto lg:max-h-none lg:min-h-0 lg:shrink lg:flex-1 ${WELL}`}
        >
          <MediaFrame item={item} title={project.title} />

          {/* The way to native size. Everything in here is drawn smaller than it
              was made, so this is not a flourish: it is how a plot becomes
              readable. Top right, out of the arrows' way. */}
          <button
            type="button"
            onClick={() => setFull(true)}
            aria-label="View full size"
            title="View full size"
            className="absolute right-2.5 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-paper/80 text-[0.95rem] text-ink transition-colors hover:border-[var(--c)] hover:text-[var(--c)]"
          >
            ⤢
          </button>

          {many && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous image"
                className="absolute left-2.5 top-1/2 flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper/80 text-ink transition-colors hover:border-[var(--c)] hover:text-[var(--c)]"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next image"
                className="absolute right-2.5 top-1/2 flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper/80 text-ink transition-colors hover:border-[var(--c)] hover:text-[var(--c)]"
              >
                →
              </button>
            </>
          )}
        </div>

        {/* Two lines of caption, always reserved and never exceeded, so the card
            is exactly as tall on item 11 as on item 1. A box that grew with the
            caption would resize the whole card under the cursor as you step.

            A floor, not a ceiling. It was a fixed 40 here and 52 at lg, and a
            two-line caption needs 55 — label 12.5, its own top margin 4, two
            lines at 0.86rem over 1.4 leading for 38.5 — so the caption overflowed
            by 15px and the position strip drew straight through its second line.
            Reserving 56 instead fixed three projects and not Breathing Mass,
            whose section heading is long enough to wrap the label to two lines
            as well. No constant covers that: the height depends on text nobody
            is going to keep an eye on. min-h reserves the common case, so the
            box does not jump for a one-line caption, and yields when the words
            need more. It is safe to yield now because the card's own height is
            fixed — a taller caption takes its room from the rail's scroll, not
            from the card's edges. */}
        <div className="mt-2.5 flex min-h-[56px] shrink-0 items-start gap-4 lg:mt-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.13em] text-[var(--c)]">
              {item.section}
            </p>
            {item.caption && (
              <p className="mt-1 line-clamp-2 font-serif text-[0.86rem] leading-[1.4] text-soft">
                {item.caption}
              </p>
            )}
          </div>
          {many && (
            <span className="ml-auto shrink-0 font-mono text-[0.6rem] tabular-nums tracking-[0.11em] text-muted">
              {String(at + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Every item on one line, always: twelve is the most any project has,
            and a strip that scrolled sideways would be an internal scroll by
            another name. On a phone twelve thumbnails come out 22px wide, which
            previews nothing, so there the strip becomes what it actually is at
            that size — a position indicator. */}
        {many && (
          <div className="mt-2.5 flex shrink-0 gap-[7px] lg:mt-3">
            {items.map((it, i) => (
              <button
                key={it.src}
                type="button"
                onClick={() => setAt(i)}
                aria-current={i === at}
                aria-label={`Show image ${i + 1}`}
                style={i === at ? { borderColor: color, boxShadow: `0 0 0 1px ${color}` } : undefined}
                className={`min-w-0 flex-1 overflow-hidden border border-line transition-opacity max-lg:h-1 max-lg:rounded-full max-lg:border-0 lg:aspect-[4/3] lg:max-w-[76px] lg:rounded-[5px] ${WELL} ${
                  i === at ? 'opacity-100 max-lg:bg-[var(--c)]' : 'opacity-50 lg:opacity-50'
                }`}
              >
                {it.kind === 'video' ? (
                  // These used to be an empty well with a glyph on it, because
                  // the four videos had no poster to show. They have one now, so
                  // the thumbnail is the frame with a badge over it: the strip
                  // reads as eleven pictures rather than seven and four holes,
                  // and the badge still says which are demos to press.
                  <span className="relative block h-full w-full max-lg:hidden">
                    <img
                      src={asset(it.poster)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-[15px] w-[15px] items-center justify-center rounded-full bg-ink/65 pl-px text-[7px] leading-none text-paper">
                        ▶
                      </span>
                    </span>
                  </span>
                ) : (
                  <img
                    src={asset(it.poster ?? it.src)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover max-lg:hidden"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div aria-hidden="true" />

      {/* ── the rail ──────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 min-w-0 flex-col max-lg:mt-3.5 wide-short:mt-0 wide-short:overflow-y-auto wide-short:overscroll-contain">
        <div className="label-mono flex shrink-0 items-center gap-2.5 wide-short:sticky wide-short:top-0 wide-short:z-10 wide-short:bg-paper wide-short:pb-1.5">
          <span
            aria-hidden="true"
            className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
            style={{ backgroundColor: color }}
          />
          <span style={{ color }}>{beltFor(project).label}</span>
          <button
            type="button"
            onClick={onClose}
            className="label-mono ml-auto rounded-[8px] border border-line px-2.5 py-1.5 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Close ✕
          </button>
        </div>

        <h2 className="mt-3 shrink-0 text-[1.55rem] font-bold leading-[1.12] tracking-tight lg:mt-3.5 lg:text-[1.9rem]">
          {project.title}
          <span className="text-accent">.</span>
        </h2>

        {/*
         * The only thing on the card that scrolls, and only from lg up.
         *
         * The writing used to be clamped to a line count that depended on how
         * tall the screen was: six lines at 720px, nine above 800, two below.
         * Three tiers, each hand-fitted to the longest project, and every one of
         * them a thing that starts silently truncating the day a subtitle or a
         * team list gets longer. Worse, when the sums were wrong the card did
         * not scroll, it clipped, and the record disappeared off the bottom
         * without a scrollbar to say so.
         *
         * Giving this one box the overflow removes that whole class of problem.
         * The title above it and the record below it stay put, so nothing
         * scannable can be scrolled out of sight; the prose is what moves.
         */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1.5 wide-short:flex-none wide-short:overflow-visible">
          <p className="mt-2.5 font-serif text-[1.02rem] leading-[1.55] lg:mt-3">
            {project.subtitle}
          </p>
          <p className="mt-2.5 font-serif text-[0.9rem] leading-[1.62] text-soft lg:mt-3">
            {project.intro[0]}
          </p>
        </div>

        {/* Smaller than the page sets it, and pinned to the foot of the rail:
            the writing leads, the record is there to be scanned once. */}
        <dl className="mt-auto grid shrink-0 grid-cols-2 wide-short:mt-3 gap-x-[18px] gap-y-[7px] border-t border-rule pt-3 lg:mt-3 lg:gap-y-[9px] lg:pt-3.5">
          {record.map(([k, v, wide]) => (
            <div key={k} className={wide ? 'col-span-2' : undefined}>
              <dt className="mb-0.5 font-mono text-[0.54rem] font-medium uppercase tracking-[0.14em] text-muted">
                {k}
              </dt>
              <dd className="font-mono text-[0.63rem] leading-[1.4]">{v}</dd>
            </div>
          ))}

          {project.award && (
            <div className="col-span-2">
              <dt className="mb-0.5 font-mono text-[0.54rem] font-medium uppercase tracking-[0.14em] text-muted">
                Award
              </dt>
              <dd className="font-mono text-[0.63rem] leading-[1.4] text-accent">{project.award}</dd>
            </div>
          )}

          {(project.links?.github || project.links?.blog) && (
            <div className="col-span-2">
              <dt className="mb-0.5 font-mono text-[0.54rem] font-medium uppercase tracking-[0.14em] text-muted">
                Links
              </dt>
              <dd className="flex gap-3.5 font-mono text-[0.63rem] leading-[1.4]">
                {project.links.github && (
                  <a
                    href={project.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="text-soft transition-colors hover:text-accent"
                  >
                    GitHub <span className="text-muted">↗</span>
                  </a>
                )}
                {project.links.blog && (
                  <a
                    href={project.links.blog}
                    target="_blank"
                    rel="noreferrer"
                    className="text-soft transition-colors hover:text-accent"
                  >
                    Blog <span className="text-muted">↗</span>
                  </a>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Above the card, not instead of it, so closing lands you back on the
          same item with the same gallery still open behind. */}
      {full && (
        <MediaLightbox
          items={items}
          at={at}
          onStep={step}
          onClose={() => setFull(false)}
          title={project.title}
          color={color}
        />
      )}
    </div>
  )
}
