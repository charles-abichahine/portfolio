import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import DynamicIsland from './components/DynamicIsland.jsx'
import Footer from './components/Footer.jsx'
import { FooterSlotContext } from './components/footerSlotContext.js'

function App() {
  const location = useLocation()
  // The overlay leaves the index mounted underneath, so what is on screen is
  // the background route, not the URL. Everything below keys off that.
  const background = location.state?.background
  const pathname = background?.pathname ?? location.pathname
  // Braces matter: without them the arrow implicitly returns scrollTo()'s value,
  // which React treats as a cleanup function and calls on the next navigation —
  // crashing with "X is not a function" in browsers where scrollTo returns non-undefined.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  /*
   * Routes that fill the viewport rather than flowing down it. They used to be
   * the routes with no shared footer, each carrying its own; now every route
   * gets the same one and this only decides how the page above it is sized.
   *
   * A full-bleed page is h-full, which resolves against main, which is what is
   * left after the footer. That is why there is no footer height anywhere in
   * the CSS: the flex column measures it.
   */
  const fullBleed = pathname === '/' || pathname === '/about' || pathname === '/work'

  // Held in state rather than a ref so that setting it re-renders and the
  // portal in FooterSlot finds its target on the pass after the footer mounts.
  const [slotNode, setSlotNode] = useState(null)

  return (
    /*
     * min-h-[100svh], not min-h-screen. A 100vh wrapper around a 100svh child is
     * taller than the visual viewport on mobile, which hands the page a phantom
     * scrollbar; that is why the full-bleed routes used to sit outside the
     * wrapper entirely. Matching the units lets them come inside it.
     */
    <div className="flex min-h-[100svh] flex-col">
      <DynamicIsland />
      <FooterSlotContext.Provider value={slotNode}>
        <main className={fullBleed ? 'flex min-h-0 flex-1 flex-col' : 'flex-1'}>
          <Outlet />
        </main>
        <Footer slotRef={setSlotNode} />
      </FooterSlotContext.Provider>
    </div>
  )
}

export default App
