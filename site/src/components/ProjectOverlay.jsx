import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ProjectCard from './ProjectCard.jsx'
import { getProject } from '../data/projects.js'

/*
 * A project opened over the index, rather than replacing it.
 *
 * The route is real: the URL is /work/:slug either way, so a link can be shared,
 * the sitemap is unaffected, and a crawler or a direct visit gets the full page.
 * What decides which you see is `background` in the location state, set only by
 * the tiles on /work. With it, the router keeps /work mounted and renders this
 * on top; without it, Project renders as a page as it always did.
 *
 * Closing navigates back to the background location rather than history.back(),
 * because the background carries the category filter and the index should
 * reopen as you left it.
 *
 * What the card shows is not the page in a box. It is the cover and every piece
 * of section media as one gallery, the two paragraphs of description, and the
 * record: enough that the card is the project rather than a trailer for it. The
 * page still exists at the same URL for a shared link, a refresh or a crawler.
 */
export default function ProjectOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams()
  const project = getProject(slug)
  const background = location.state?.background
  const cardRef = useRef(null)
  const returnTo = useRef(null)

  const close = () => navigate(`${background.pathname}${background.search ?? ''}`)

  useEffect(() => {
    // Remember what had focus so it can be handed back on close, and move focus
    // into the card so a keyboard user is not left behind on the index.
    returnTo.current = document.activeElement
    cardRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)

    // Lock the page behind. Without this the index scrolls under the card
    // whenever the pointer is over the backdrop rather than the content.
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      returnTo.current?.focus?.()
    }
    // close is stable for the life of the overlay: background cannot change
    // without the route changing, which unmounts this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[60]">
      {/* The index, blurred back. A button rather than a div so a click and a
          screen reader both get a way out that is not the Escape key. */}
      <button
        type="button"
        aria-label="Close project"
        onClick={close}
        className="absolute inset-0 w-full cursor-default bg-paper/55 backdrop-blur-lg"
      />

      {/* No scroll container. The card is sized to fit the viewport at every
          size, which is the whole point of opening in place, so anything that
          did not fit would be a bug rather than something to scroll to. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3 sm:p-6 lg:p-10">
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={project ? project.title : 'Project'}
          tabIndex={-1}
          className="pointer-events-auto relative flex max-h-full w-full max-w-[1180px] justify-center outline-none"
        >
          {project && <ProjectCard project={project} onClose={close} />}
        </div>
      </div>
    </div>
  )
}
