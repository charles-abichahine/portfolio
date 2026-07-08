import { projects } from '../data/projects.js'
import ProjectCard from '../components/ProjectCard.jsx'

export default function Work() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="label-mono mb-4 text-muted">Index — {String(projects.length).padStart(2, '0')} Projects</p>
      <h1 className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl">Work</h1>
      <div className="grid gap-4 border-t border-ink pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.slug} project={p} />
        ))}
      </div>
    </div>
  )
}
