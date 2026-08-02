import { Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProjectLink from '../components/ProjectLink.jsx'
import { asset, getProject, projects } from '../data/projects.js'

function Media({ item }) {
  // A demo someone chooses to watch: give it controls and a poster, and fetch
  // nothing until it is pressed. The poster is the frame beside it, same naming
  // as the loops, so the page shows a still instead of a black rectangle.
  if (item.type === 'video') {
    return (
      <video
        src={asset(item.src)}
        poster={asset(item.src.replace(/\.[a-z0-9]+$/i, '-poster.webp'))}
        controls
        muted
        playsInline
        preload="none"
        aria-label={item.caption}
        className="w-full border border-line"
      />
    )
  }
  // An ambient animation that used to be a GIF — it plays itself and has no
  // sound, so controls would be furniture. Video rather than GIF because the
  // same footage costs a fraction of the bytes (2.6MB of GIF became 443KB).
  if (item.type === 'loop') {
    const stem = item.src.replace(/\.webm$/, '')
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={asset(`${stem}-poster.webp`)}
        aria-label={item.caption}
        className="w-full border border-line"
      >
        <source src={asset(item.src)} type="video/webm" />
        <source src={asset(`${stem}.mp4`)} type="video/mp4" />
      </video>
    )
  }
  return (
    <img src={asset(item.src)} alt={item.caption} loading="lazy" className="w-full border border-line" />
  )
}

/*
 * The full project page, at /work/:slug.
 *
 * It briefly had an `overlay` variant for rendering inside the card over the
 * index. That is gone: the card is ProjectCard now, built from the gallery and
 * the record rather than from this page squeezed into a box. This is what a
 * shared link, a refresh and a crawler get, and it is the only thing that shows
 * the section writing.
 */
export default function Project() {
  const { slug } = useParams()
  const project = getProject(slug)

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="label-mono mb-4 text-muted">404 · Not Found</p>
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
        className="inline-flex items-center rounded-full border border-accent/40 px-2.5 py-0.5 text-accent"
      >
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
        <p className="mb-6 max-w-[62ch] font-serif text-[1.2rem] leading-[1.65] text-soft">
          {project.subtitle}
        </p>

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

        {/* 0.7rem rather than text-xs: IBM Plex Mono sets noticeably wider than
            the Consolas it replaced, and at 0.75rem a four-name team ran to
            three lines in a column sized for two. */}
        <dl className="mb-10 mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-rule pt-5 font-mono text-[0.7rem] sm:grid-cols-4">
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

        {/* The animated covers are video rather than GIF — same footage at about
            a tenth of the bytes, which matters most here, where the cover runs
            full width. The poster holds the frame until it can play. */}
        {project.cover.endsWith('.webm') ? (
          <video
            // Without a key React reuses this element between projects, and
            // swapping <source> children does not reload a video — the previous
            // project's cover keeps playing on the next one's page.
            key={project.slug}
            autoPlay
            muted
            loop
            playsInline
            poster={asset(project.cover.replace(/cover\.webm$/, 'poster.webp'))}
            aria-label={project.title}
            className="w-full border border-line"
          >
            <source src={asset(project.cover)} type="video/webm" />
            <source src={asset(project.cover.replace(/cover\.webm$/, 'cover.mp4'))} type="video/mp4" />
          </video>
        ) : (
          <img src={asset(project.cover)} alt={project.title} className="w-full border border-line" />
        )}
      </header>

      {/*
       * The prose is held to a reading measure and the media is not.
       *
       * Everything used to sit in one max-w-3xl column, which is what made this
       * read as a blog: a text column with pictures dropped into it. Measured,
       * every figure rendered at 768px, exactly the width of a paragraph, on a
       * 1152px page whose cover was 1104px. So the poster was 44% wider than the
       * evidence, and a screenshot of a dense software interface at 768px shows
       * a recruiter nothing they can read.
       *
       * Now the body stays at 68ch and the media takes the full column, half as
       * wide again. The work is the page; the writing annotates it.
       */}
      <div className="mx-auto max-w-[68ch]">
        {project.intro.map((p) => (
          <p key={p.slice(0, 32)} className="pt-10 font-serif text-[1.12rem] leading-[1.75] text-soft">
            {p}
          </p>
        ))}
      </div>

      {project.sections.map((s, i) => (
        <section key={s.heading} className="mt-16 border-t border-line pt-6">
          {/* Number and heading in a rail on the left, so the sections can be
              scanned without reading them. Below lg it stacks, where a 14rem
              column would leave the prose too narrow to be worth it. */}
          <div className="grid gap-x-10 gap-y-3 lg:grid-cols-[14rem_1fr]">
            <h2 className="lg:sticky lg:top-24 lg:self-start">
              <span className="label-mono block text-accent">{String(i + 1).padStart(2, '0')}</span>
              <span className="mt-2 block text-xl font-bold tracking-tight">{s.heading}</span>
            </h2>
            <div className="max-w-[68ch]">
              {s.body.map((p) => (
                <p key={p.slice(0, 32)} className="mb-4 font-serif text-[1.02rem] leading-[1.75] text-soft">
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Outside the grid, so it takes the whole column rather than the
              fraction the prose left over. */}
          <div className="mt-8 flex flex-col gap-8">
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

      <nav className="label-mono mt-16 flex justify-between border-t border-rule pt-5">
        <ProjectLink slug={prev.slug} className="text-muted transition-colors hover:text-accent">
          ← {prev.title}
        </ProjectLink>
        <ProjectLink slug={next.slug} className="text-muted transition-colors hover:text-accent">
          {next.title} →
        </ProjectLink>
      </nav>
    </article>
  )
}
