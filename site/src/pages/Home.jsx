import { Link } from 'react-router-dom'
import { projects, getProject, asset } from '../data/projects.js'
import ProjectCard from '../components/ProjectCard.jsx'
import CipherRingsHero from '../components/CipherRingsHero.jsx'

export default function Home() {
  const flagship = getProject('legoarch')
  const rest = projects.filter((p) => p.slug !== flagship.slug)

  return (
    <>
      <CipherRingsHero />

      <section id="work" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:py-20">
        <div className="label-mono flex items-baseline justify-between border-t border-ink py-3">
          <span>Selected Work</span>
          <Link to="/work" className="text-muted transition-colors hover:text-accent">
            2025–2026 / {String(projects.length).padStart(2, '0')} Projects →
          </Link>
        </div>

        {/* Featured flagship — routes recruiters to the strongest case study */}
        <Link
          to={`/work/${flagship.slug}`}
          className="group mt-2 grid overflow-hidden border border-line transition-colors hover:border-ink sm:grid-cols-2"
        >
          <div className="overflow-hidden border-b-[3px] border-accent sm:border-b-0 sm:border-r-[3px]">
            <img
              src={asset(flagship.cover)}
              alt={flagship.title}
              fetchPriority="high"
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div>
              <p className="label-mono mb-3 text-muted">Featured — 01</p>
              <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">{flagship.title}</h2>
              <p className="max-w-[46ch] leading-relaxed text-soft">{flagship.subtitle}</p>
            </div>
            <p className="label-mono text-muted">
              {flagship.toolsShort} —{' '}
              <span className="text-ink transition-colors group-hover:text-accent">Case study →</span>
            </p>
          </div>
        </Link>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rest.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </section>
    </>
  )
}
