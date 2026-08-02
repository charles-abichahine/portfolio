import { Route, Routes, useLocation } from 'react-router-dom'
import App from './App.jsx'
import ProjectOverlay from './components/ProjectOverlay.jsx'
import Home from './pages/Home.jsx'
import Work from './pages/Work.jsx'
import Project from './pages/Project.jsx'
import About from './pages/About.jsx'
import CV from './pages/CV.jsx'

/*
 * Two route trees, so a project can be either a page or a card over the index.
 *
 * The first tree matches against `background` when the tiles on /work put one in
 * the location state, which keeps /work rendered underneath while the URL is
 * already /work/:slug. The second tree then draws the overlay on top.
 *
 * Without background state — a direct visit, a refresh, a shared link, a link
 * from the landing or the CV, a crawler — the first tree matches the real
 * location and Project renders as a full page. Every URL therefore works on its
 * own, and the overlay is an enhancement rather than the only way in.
 */
export default function AppRoutes() {
  const location = useLocation()
  const background = location.state?.background

  return (
    <>
      <Routes location={background || location}>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="work/:slug" element={<Project />} />
          <Route path="about" element={<About />} />
          <Route path="cv" element={<CV />} />
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
