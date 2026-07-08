import { Link } from 'react-router-dom'
import { projects } from '../data/projects.js'
import ProjectCard from '../components/ProjectCard.jsx'

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="grid gap-10 py-16 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:py-24">
        <div>
          <p className="label-mono mb-5 text-muted">Portfolio — MaCAD, IAAC Barcelona</p>
          <h1 className="mb-5 max-w-[16ch] text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Architect &amp; Computational Designer<span className="text-accent">.</span>
          </h1>
          <p className="max-w-[46ch] leading-relaxed text-soft">
            I design buildings and the computational workflows behind them — from
            generative geometry to BIM data pipelines.
          </p>
        </div>
        <dl className="border-ink font-mono text-xs leading-loose lg:border-l lg:pl-6 max-lg:border-t max-lg:pt-5">
          {[
            ['ROLE', 'Computational Designer', true],
            ['BASE', 'Beirut / Kuwait', false],
            ['STACK', 'Rhino · GH · Python · React', false],
            ['EDU', 'MaCAD — IAAC', false],
          ].map(([k, v, accent]) => (
            <div key={k} className="flex gap-3">
              <dt className="min-w-[5.5ch] text-muted">{k}</dt>
              <dd className={accent ? 'text-accent' : ''}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pb-20">
        <div className="label-mono flex items-baseline justify-between border-t border-ink py-3">
          <span>Selected Work</span>
          <Link to="/work" className="text-muted transition-colors hover:text-accent">
            2025–2026 / {String(projects.length).padStart(2, '0')} Projects →
          </Link>
        </div>
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} project={p} featured={i === 0} />
          ))}
        </div>
      </section>
    </div>
  )
}
