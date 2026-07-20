import { Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { asset, getProject, projects } from '../data/projects.js'

function Media({ item }) {
  if (item.type === 'video') {
    return (
      <video
        src={asset(item.src)}
        controls
        muted
        playsInline
        preload="metadata"
        className="w-full border border-line"
      />
    )
  }
  return (
    <img src={asset(item.src)} alt={item.caption} loading="lazy" className="w-full border border-line" />
  )
}

export default function Project() {
  const { slug } = useParams()
  const project = getProject(slug)

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="label-mono mb-4 text-muted">404 — Not Found</p>
        <h1 className="mb-6 text-3xl font-bold">No project here.</h1>
        <Link to="/work" className="label-mono text-accent">← Back to the index</Link>
      </div>
    )
  }

  const idx = projects.findIndex((p) => p.slug === slug)
  const prev = projects[(idx - 1 + projects.length) % projects.length]
  const next = projects[(idx + 1) % projects.length]

  const metaBits = []
  if (project.category) {
    metaBits.push(<span key="cat" className="text-ink">{project.category}</span>)
  }
  if (project.award) {
    metaBits.push(
      <span
        key="award"
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-2.5 py-0.5 text-accent"
      >
        <span className="text-[0.72em]" aria-hidden="true">★</span>
        {project.award}
      </span>,
    )
  }

  const links = []
  if (project.links?.github) links.push({ label: 'GitHub', href: project.links.github })
  if (project.links?.blog) links.push({ label: 'Read the blog', href: project.links.blog })

  return (
    <article className="mx-auto max-w-6xl px-6 py-14">
      <Link to="/work" className="label-mono text-muted transition-colors hover:text-accent">
        ← Index
      </Link>

      <header className="pt-8">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {project.title}
          <span className="text-accent">.</span>
        </h1>
        <p className="mb-6 max-w-[62ch] text-lg leading-relaxed text-soft">{project.subtitle}</p>

        {metaBits.length > 0 && (
          <div className="label-mono flex flex-wrap items-center gap-x-4 gap-y-3">
            {metaBits.map((bit, i) => (
              <Fragment key={bit.key}>
                {i > 0 && <span className="h-1 w-1 shrink-0 rounded-full bg-line" aria-hidden="true" />}
                {bit}
              </Fragment>
            ))}
          </div>
        )}

        {links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="label-mono group inline-flex items-center gap-1.5 text-soft transition-colors hover:text-accent"
              >
                {l.label}
                <span className="text-muted transition-colors group-hover:text-accent" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        )}

        <dl className="mb-10 mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-rule pt-5 font-mono text-xs sm:grid-cols-4">
          {[
            ['YEAR', project.year],
            ['MODULE', project.module],
            ['TEAM', project.team.join(', ')],
            ['TOOLS', project.tools.join(' · ')],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label-mono mb-1.5 text-muted">{k}</dt>
              <dd className="leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>

        <img src={asset(project.cover)} alt={project.title} className="w-full border border-line" />
      </header>

      <div className="mx-auto max-w-3xl">
        {project.intro.map((p) => (
          <p key={p.slice(0, 32)} className="pt-10 text-lg leading-relaxed text-soft">{p}</p>
        ))}

        {project.sections.map((s, i) => (
          <section key={s.heading} className="pt-14">
            <div className="label-mono mb-3 flex items-baseline gap-4 border-t border-line pt-5 text-muted">
              <span className="text-accent">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 32)} className="mb-4 leading-relaxed text-soft">{p}</p>
            ))}
            <div className="flex flex-col gap-6 pt-4">
              {s.media.map((m) => (
                <figure key={m.src}>
                  <Media item={m} />
                  <figcaption className="label-mono pt-2 leading-relaxed text-muted normal-case tracking-normal">
                    {m.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>

      <nav className="label-mono mt-16 flex justify-between border-t border-rule pt-5">
        <Link to={`/work/${prev.slug}`} className="text-muted transition-colors hover:text-accent">
          ← {prev.title}
        </Link>
        <Link to={`/work/${next.slug}`} className="text-muted transition-colors hover:text-accent">
          {next.title} →
        </Link>
      </nav>
    </article>
  )
}
