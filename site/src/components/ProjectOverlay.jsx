import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ProjectCard from './ProjectCard.jsx'
import { getProject } from '../data/projects.js'

/*
 * A project opened over the index, rather than replacing it.
 *
 * The route is real: the URL is /work/:slug, so a link can be shared and the
 * sitemap is unaffected. It is also the only way a project is shown. There is no
 * page behind this any more.
 *
 * Closing navigates to the background location rather than history.back(),
 * because the background carries the category filter and the index should reopen
 * as you left it. A direct visit has no state to carry, so it falls back to the
 * plain index: back() there would leave the site.
 *
 * The card is the cover and every piece of section media as one gallery, the
 * description, and the record.
 */
export default function ProjectOverlay() {
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams()
  const project = getProject(slug)
  const background = location.state?.background
  const cardRef = useRef(null)
  const returnTo = useRef(null)

  const close = () => navigate(`${background?.pathname ?? '/work'}${background?.search ?? ''}`)

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

    /*
     * And take it out of the tab order and out of the accessibility tree.
     *
     * Locking the scroll only stopped the page moving. Tab still walked out of
     * the card into the eighteen tiles, the island and the footer behind the
     * blur, and every one of those tiles was still announced, so a dialog that
     * says aria-modal was neither modal for the keyboard nor for a reader.
     *
     * Imperative rather than an `inert` prop, which React 19 would happily take:
     * these three elements are rendered by App, and the overlay is a sibling of
     * App in a second route tree (see routes.jsx), so there is no prop to pass.
     * The three are the whole of what is behind — the nav, the page, the band —
     * and the nested MediaLightbox needs none of this because it opens inside
     * the dialog rather than beside it.
     */
    const behind = ['main', 'nav[aria-label="Site"]', 'footer']
      .map((sel) => document.querySelector(sel))
      .filter(Boolean)
    behind.forEach((el) => { el.inert = true })

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      behind.forEach((el) => { el.inert = false })
      // After the background is interactive again, or the tile cannot take it.
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
