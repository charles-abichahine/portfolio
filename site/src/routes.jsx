import { matchPath, Route, Routes, useLocation } from 'react-router-dom'
import App from './App.jsx'
import ProjectOverlay from './components/ProjectOverlay.jsx'
import { getProject } from './data/projects.js'
import Home from './pages/Home.jsx'
import Work from './pages/Work.jsx'
import About from './pages/About.jsx'
import CV from './pages/CV.jsx'
import NotFound from './pages/NotFound.jsx'

/*
 * Two route trees, so a project is always a card over the index.
 *
 * A project has one representation, the card, and one URL. The first tree
 * renders what sits underneath, the second draws the card on top of it.
 *
 * What goes underneath is the background location. Tiles on /work put one in the
 * location state, which keeps that page mounted with its filter and scroll
 * intact. A direct visit, a refresh, a shared link or a link from the README has
 * no state, so the index is synthesised as the background instead: the card
 * still opens, and closing it leaves you on /work rather than nowhere.
 *
 * There was a full page at this URL before. It is gone. It meant every project
 * existed twice, as a page and as a card, and the two had to be kept in step by
 * hand.
 */
export default function AppRoutes() {
  const location = useLocation()

  // Only for a slug that resolves. An unknown one has no card to open, so it
  // must fall through to the tree below and get a 404 rather than a blurred
  // index with an empty dialog on it.
  const match = matchPath('/work/:slug', location.pathname)
  const known = match && getProject(match.params.slug)
  const background =
    location.state?.background ??
    (known ? { ...location, pathname: '/work', search: '', hash: '', state: null } : null)

  return (
    <>
      <Routes location={background || location}>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="about" element={<About />} />
          <Route path="cv" element={<CV />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      {background && (
        <Routes>
          <Route path="work/:slug" element={<ProjectOverlay />} />
        </Routes>
      )}
    </>
  )
}
