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
      {/*
       * First thing in the tree, so it is the first thing Tab reaches. The
       * island's logo, three links and theme toggle are five tab stops before
       * the page's own content, on every route, and the page is where a
       * keyboard visitor is trying to get.
       *
       * Focus is moved by hand rather than left to the href: the fragment is
       * kept so the link still means something with JS off, but following it
       * would push a history entry, and this app already uses history state to
       * decide what is on screen. preventDefault keeps the URL as it was.
       */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        /* Everything that draws the box is a focus: variant, so unfocused the
           anchor is the bare 1x1 sr-only element rather than a 34x22 one that
           happens to be clipped. */
        className="chrome-label sr-only text-[0.6875rem] leading-none text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[10px] focus:border focus:border-line focus:bg-paper focus:px-4 focus:py-2.5 focus:outline-none focus:ring-1 focus:ring-accent"
      >
        Skip to content
      </a>
      <DynamicIsland />
      <FooterSlotContext.Provider value={slotNode}>
        {/* tabIndex -1 so the skip link has somewhere to land. The ring is
            suppressed because a focus outline around the whole page reads as a
            rendering fault rather than as feedback; the proof that the skip
            worked is the next Tab landing in the content. */}
        <main
          id="main"
          tabIndex={-1}
          className={`outline-none ${fullBleed ? 'flex min-h-0 flex-1 flex-col' : 'flex-1'}`}
        >
          <Outlet />
        </main>
        <Footer slotRef={setSlotNode} />
      </FooterSlotContext.Provider>
    </div>
  )
}

export default App
