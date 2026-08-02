import { useEffect, useMemo, useState } from 'react'
import { asset } from '../data/projects.js'
import { beltFor } from '../data/belts.js'

/*
 * The gallery, flattened out of the project record.
 *
 * The cover leads, then every piece of section media in the order it appears on
 * the page. Each item carries the section it came from, which is the only thing
 * left holding the shape of the project once the card stopped linking to it: the
 * captions alone would read as a pile of pictures.
 *
 * Posters are derived the same two ways Project.jsx derives them, because they
 * are named two different ways in the data: a cover is `cover.webm` beside
 * `poster.webp`, a section loop is `x.webm` beside `x-poster.webp`.
 */
function galleryFor(project) {
  const animated = project.cover.endsWith('.webm')
  const cover = {
    kind: animated ? 'loop' : 'image',
    src: project.cover,
    poster: animated ? project.cover.replace(/cover\.webm$/, 'poster.webp') : null,
    section: 'Cover',
    caption: '',
  }

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

  // The Huddle uses one of its own section images as its cover, so without this
  // it appears twice in the strip. The duplicate's caption is worth keeping —
  // the cover has none — so it moves onto the cover rather than being dropped
  // with it.
  const twice = evidence.find((e) => e.src === cover.src)
  if (twice) cover.caption = twice.caption

  return [cover, ...evidence.filter((e) => e.src !== cover.src)]
}

/*
 * Contained, never cropped.
 *
 * The cover can be cropped, and is, on the index. The evidence cannot: it is
 * SHAP plots, correlation matrices, Kohonen maps and pipeline diagrams, at
 * aspect ratios from 0.55 to 3.17, and a crop of a chart is a lie. So the well
 * is a fixed frame and the media sits inside it at whatever shape it is.
 */
function Frame({ item, title }) {
  if (item.kind === 'loop') {
    const stem = item.src.replace(/\.webm$/, '')
    return (
      <video
        // Keyed, or React reuses the element between items and swapping
        // <source> children does not reload a video.
        key={item.src}
        autoPlay
        muted
        loop
        playsInline
        poster={asset(item.poster)}
        aria-label={item.caption || title}
        className="max-h-full max-w-full"
      >
        <source src={asset(item.src)} type="video/webm" />
        <source src={asset(`${stem}.mp4`)} type="video/mp4" />
      </video>
    )
  }

  if (item.kind === 'video') {
    // A real poster, extracted from the video itself, rather than the #t=0.1
    // media fragment this used to lean on. That trick asked the browser to seek
    // a tenth of a second in so the frame was not black, which meant fetching
    // and decoding video before anything could be seen, and Safari and Firefox
    // honour the fragment inconsistently. A still is 9 to 33KB and always shows.
    return (
      <video
        key={item.src}
        src={asset(item.src)}
        poster={asset(item.poster)}
        controls
        muted
        playsInline
        preload="none"
        aria-label={item.caption || title}
        className="max-h-full max-w-full"
      />
    )
  }

  return (
    <img
      key={item.src}
      src={asset(item.src)}
      alt={item.caption || title}
      className="max-h-full max-w-full object-contain"
    />
  )
}

const WELL = 'bg-[color-mix(in_srgb,var(--color-line)_45%,var(--color-paper))]'

export default function ProjectCard({ project, onClose }) {
  const items = useMemo(() => galleryFor(project), [project])
  const [at, setAt] = useState(0)
  const color = beltFor(project).color
  const many = items.length > 1
  const item = items[at]

  // Moving prev/next between projects is gone, but the card is still reused if
  // the slug ever changes under it.
  useEffect(() => setAt(0), [project.slug])

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
      className="grid h-auto max-h-full w-full max-w-[1180px] grid-cols-1 overflow-hidden rounded-[14px] border border-line bg-paper p-3.5 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)] lg:grid-cols-[632px_40px_minmax(0,1fr)] lg:p-6"
      style={{ '--c': color }}
    >
      {/* ── the gallery ───────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
        <div
          className={`relative flex aspect-[16/9] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line lg:aspect-[16/10] ${WELL}`}
        >
          <Frame item={item} title={project.title} />

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
            caption would resize the whole card under the cursor as you step. */}
        <div className="mt-2.5 flex h-[40px] shrink-0 items-start gap-4 lg:mt-3 lg:h-[52px]">
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
      <div className="flex min-w-0 flex-col max-lg:mt-3.5">
        <div className="label-mono flex items-center gap-2.5">
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

        <h2 className="mt-3 text-[1.55rem] font-bold leading-[1.12] tracking-tight lg:mt-3.5 lg:text-[1.9rem]">
          {project.title}
          <span className="text-accent">.</span>
        </h2>

        {/*
         * The subtitle is never cut: the longest in the data runs to five lines
         * here. The intro is, and how much depends on the height you have. Six
         * lines is what 720px of laptop leaves once the gallery, the subtitle
         * and the record have taken theirs; a 900px screen gets nine. Writing
         * the ceiling as one fixed number would mean either overflowing the
         * tight case or short-changing everyone above it.
         */}
        <p className="mt-2.5 line-clamp-3 font-serif text-[1.02rem] leading-[1.55] lg:mt-3 lg:line-clamp-5">
          {project.subtitle}
        </p>
        <p className="mt-2.5 line-clamp-3 font-serif text-[0.9rem] leading-[1.62] text-soft lg:mt-3 lg:line-clamp-6 [@media(min-width:1024px)_and_(min-height:800px)]:line-clamp-9">
          {project.intro[0]}
        </p>

        {/* Smaller than the page sets it, and pushed to the foot of the rail:
            the writing leads, the record is there to be scanned once. */}
        <dl className="mt-auto grid grid-cols-2 gap-x-[18px] gap-y-[7px] border-t border-rule pt-3 lg:gap-y-[9px] lg:pt-3.5">
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
    </div>
  )
}
