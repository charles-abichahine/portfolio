import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import DynamicIsland from './components/DynamicIsland.jsx'
import Footer from './components/Footer.jsx'
import { FooterSlotContext } from './components/footerSlotContext.js'
import { normalize } from './documentMeta.js'

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

  // iOS Safari does not refresh the svh unit when the phone is rotated, so the
  // full-bleed one-screen pages kept their portrait height in landscape and sat
  // shifted under the island until a reload — or until a scroll, which is what
  // finally settled iOS's viewport. So the height is measured off visualViewport,
  // whose resize event is what actually fires when iOS changes the viewport, both
  // on rotation and when the toolbar shows or hides; a timer guessing when that
  // happened read a value iOS had not updated yet. The measured height is
  // published as --app-h, which the wrapper resolves its height against, so the
  // layout tracks the visible viewport with no reload and no scroll to nudge it.
  useEffect(() => {
    const vv = window.visualViewport
    const apply = () => {
      const h = Math.round(vv?.height ?? window.innerHeight)
      document.documentElement.style.setProperty('--app-h', `${h}px`)
    }
    apply()
    vv?.addEventListener('resize', apply)
    // Fallback for the rare engine with no visualViewport, and desktop resizes.
    window.addEventListener('resize', apply)
    // A rotation into a shorter frame can leave the page nudged down; on the
    // orientation change specifically — never on a toolbar scroll — snap it back.
    const onOrient = () => window.scrollTo(0, 0)
    window.addEventListener('orientationchange', onOrient)
    return () => {
      vv?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', onOrient)
    }
  }, [])

  /*
   * Routes that fill the viewport rather than flowing down it. They used to be
   * the routes with no shared footer, each carrying its own; now every route
   * gets the same one and this only decides how the page above it is sized.
   *
   * A full-bleed page is h-full, which resolves against main, which is what is
   * left after the footer. That is why there is no footer height anywhere in
   * the CSS: the flex column measures it.
   */
  // Through normalize, because a refresh lands on /work/ and a Link produces
  // /work: comparing the raw pathname dropped the flex column on every direct
  // load, and the page inside it lost the height its centring resolves against.
  const route = normalize(pathname)
  const fullBleed = route === '/' || route === '/about' || route === '/work'

  // Held in state rather than a ref so that setting it re-renders and the
  // portal in FooterSlot finds its target on the pass after the footer mounts.
  const [slotNode, setSlotNode] = useState(null)

  return (
    /*
     * --app-h, which is 100svh by default (see index.css), not min-h-screen. A
     * 100vh wrapper around a 100svh child is taller than the visual viewport on
     * mobile, which hands the page a phantom scrollbar; that is why the full-bleed
     * routes used to sit outside the wrapper entirely. Matching the units lets
     * them come inside it. The token, rather than the bare svh, is so a rotation
     * can override it with a measured height iOS otherwise leaves stale (above).
     */
    <div className="flex min-h-[var(--app-h)] flex-col">
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
