import { useState } from 'react'
import { Link } from 'react-router-dom'
import { asset, projects } from '../data/projects.js'

// Grouped, ordered display. The projects array is already newest-first, so
// filtering by category preserves the within-group order the design calls for.
const CATEGORY_ORDER = ['Computation & AI', 'BIM & Workflows', 'Design & Research']
const groups = CATEGORY_ORDER.map((category) => ({
  category,
  items: projects.filter((p) => p.category === category),
}))
const displayOrder = groups.flatMap((g) => g.items)
const numberOf = new Map(displayOrder.map((p, i) => [p.slug, i + 1]))
const num = (slug) => String(numberOf.get(slug)).padStart(2, '0')

// Each row shows a static cover; GIF projects fall back to their first-frame
// poster (public/projects/<slug>/poster.webp) and only load the multi-MB GIF
// when the row is hovered.
const isGif = (p) => p.cover.endsWith('.gif')
const posterFor = (p) => (isGif(p) ? p.cover.replace(/cover\.gif$/, 'poster.webp') : p.cover)

function AwardPill({ label }) {
  return (
    <span className="label-mono inline-flex shrink-0 items-center gap-1.5 self-center rounded-full border border-accent/40 px-2.5 py-0.5 text-accent">
      <span className="text-[0.72em]" aria-hidden="true">★</span>
      {label}
    </span>
  )
}

export default function Work() {
  // Only used to swap in a GIF project's animated cover while its row is hovered.
  const [hovered, setHovered] = useState(null)

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-10 flex items-baseline justify-between border-b border-ink pb-5">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Work</h1>
        <p className="label-mono text-muted">
          Index — {String(displayOrder.length).padStart(2, '0')} Projects · 2025–2026
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.category} className="mb-12 last:mb-0">
          <div className="mb-2 flex items-baseline justify-between border-t border-ink pt-3">
            <h2 className="label-mono text-ink">{group.category}</h2>
            <span className="label-mono text-muted">{String(group.items.length).padStart(2, '0')}</span>
          </div>

          <ul>
            {group.items.map((p) => {
              const showGif = isGif(p) && hovered === p.slug
              return (
                <li key={p.slug}>
                  <Link
                    to={`/work/${p.slug}`}
                    onMouseEnter={() => setHovered(p.slug)}
                    onMouseLeave={() => setHovered((h) => (h === p.slug ? null : h))}
                    className="group relative flex flex-col gap-5 border-b border-line py-7 pl-5 sm:flex-row sm:items-center sm:gap-8"
                  >
                    {/* red left-bar on hover */}
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-y-100"
                    />

                    {/* cover — static poster, animated GIF fades in on hover for GIF projects */}
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border border-line bg-line sm:w-64 lg:w-80">
                      <img
                        src={asset(posterFor(p))}
                        alt={p.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                      {showGif && (
                        <img
                          src={asset(p.cover)}
                          alt=""
                          aria-hidden="true"
                          className="fade-in absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* text */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                        <span className="label-mono shrink-0 text-muted">{num(p.slug)}</span>
                        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{p.title}</h3>
                        {p.award && <AwardPill label={p.award} />}
                      </div>
                      <p className="line-clamp-2 max-w-[56ch] text-[0.95rem] leading-relaxed text-soft">{p.subtitle}</p>
                      <div className="flex items-center gap-3">
                        <span className="label-mono text-muted">{p.toolsShort}</span>
                        <span className="h-1 w-1 shrink-0 rounded-full bg-line" aria-hidden="true" />
                        <span className="label-mono text-muted transition-colors group-hover:text-accent">Open project →</span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
