import { Link } from 'react-router-dom'

/*
 * Anything that is not a route, including /work/:slug for a slug that is not a
 * project. That case used to be handled inside the project page; the page is
 * gone, and a card cannot be opened for a project that does not exist, so it
 * lands here.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <p className="label-mono mb-4 text-muted">404 · Not Found</p>
      <h1 className="mb-6 text-3xl font-bold">Nothing here.</h1>
      <Link to="/work" className="label-mono text-accent">
        ← Back to the index
      </Link>
    </div>
  )
}
