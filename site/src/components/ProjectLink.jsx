import { Link, useLocation } from 'react-router-dom'

/*
 * The one way into a project, from anywhere: the index, the landing, the CV, or
 * the prev/next links inside an open card.
 *
 * It records the page you were on, which is what tells the router to keep that
 * page mounted and draw the project over it, and where closing returns you to.
 * Opening a project is therefore a single interaction across the site rather
 * than "a card here, a page there" depending on which link you happened to hit.
 *
 * Every route still works on its own. The state only exists on a click, so a
 * shared link, a refresh or a crawler gets the full page.
 *
 * From inside an open card the existing background is passed through rather than
 * replaced. Without that, moving prev/next would stack a card on a card and
 * closing would drop you on the project you had just left instead of where you
 * started.
 */
export default function ProjectLink({ slug, children, ...rest }) {
  const location = useLocation()
  const background = location.state?.background ?? location

  return (
    <Link to={`/work/${slug}`} state={{ background }} {...rest}>
      {children}
    </Link>
  )
}
