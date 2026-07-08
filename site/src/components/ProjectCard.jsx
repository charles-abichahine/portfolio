import { Link } from 'react-router-dom'
import { asset } from '../data/projects.js'

export default function ProjectCard({ project, featured = false }) {
  return (
    <Link
      to={`/work/${project.slug}`}
      className="group block border border-line transition-colors hover:border-ink"
    >
      <div className={`overflow-hidden border-b ${featured ? 'border-b-[3px] border-accent' : 'border-line'}`}>
        <img
          src={asset(project.cover)}
          alt={project.title}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-1.5 text-[0.95rem] font-semibold tracking-tight">{project.title}</h3>
        <p className="label-mono text-muted">
          {project.toolsShort} — <span className="text-accent">{project.tag}</span>
        </p>
      </div>
    </Link>
  )
}
