import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { normalize } from '../documentMeta.js'

/*
 * Dynamic Island — the site's whole navigation, persistent on every page.
 * A glass tab floating over the page, drawn at the site's one fillet: 10px on
 * the shell, 7px on the controls inside it, the same family as the /work
 * cards and filter pills. It was a full capsule until the index grew filleted
 * cards and the two shapes argued; the fillet won everywhere. It used to stay dark in both
 * themes on the argument that an object over the page should keep its own
 * material; what that actually produced was a page with a theme and one control
 * without one, and once the footer became a band built from the same tokens the
 * island was the only element left ignoring the switch. It is now frosted paper:
 * --chrome-glass over --chrome-edge with --chrome-lift under it, so it is light
 * on a light page and dark on a dark one, and it shares its type and its
 * hover/current colours with the band at the other end.
 * Holds the logo + name (→ landing), the three destinations with a sliding
 * indicator under the active/hovered one, and the theme toggle. It expands by
 * default, morphs compact once scrolled, and re-expands on hover.
 */

const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/cv', label: 'CV' },
]

// The 'theme' key and the light/dark literals are also hardcoded in the boot
// script in index.html, which cannot import from the bundle. Rename in one place
// and the other silently stops finding the stored choice — change both together.
const THEME_KEY = 'theme'

const readTheme = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'

// Flips the theme with colour transitions suppressed — see the theme-switch
// guard in index.css for why. The forced reflow is load-bearing: it makes the
// new token values take effect while transitions are still off.
const applyTheme = (theme) => {
  const root = document.documentElement
  root.setAttribute('data-theme-switching', '')
  root.setAttribute('data-theme', theme)
  void root.offsetHeight
  // rAF gives the tightest re-enable, but it does not run in a hidden or
  // throttled tab — and leaving the guard on would kill every hover transition
  // on the site for good. The timer is the backstop; removeAttribute is
  // idempotent, so whichever lands first wins and the other is a no-op.
  const release = () => root.removeAttribute('data-theme-switching')
  requestAnimationFrame(() => requestAnimationFrame(release))
  setTimeout(release, 100)
}

export default function DynamicIsland() {
  const { pathname } = useLocation()
  // A refresh lands on /about/ and a Link produces /about, so the raw pathname
  // matched a destination on a click and missed it on a direct load, leaving
  // the indicator off the page you were actually on.
  const route = normalize(pathname)
  const linkRefs = useRef({})
  const [compact, setCompact] = useState(false)
  const [hover, setHover] = useState(false)
  const [pill, setPill] = useState({ left: 0, width: 0 })
  // The inline script in index.html has already resolved and applied the theme,
  // so we read it off the element rather than recomputing it and risking a
  // first-render mismatch with what is already painted.
  const [theme, setTheme] = useState(readTheme)

  const activeTo =
    links.find((l) => route === l.to || (l.to === '/work' && route.startsWith('/work')))?.to || null

  const placePill = (to) => {
    const el = linkRefs.current[to]
    if (!el) { setPill((p) => ({ ...p, width: 0 })); return }
    setPill({ left: el.offsetLeft, width: el.offsetWidth })
  }

  // activeTo is derived purely from pathname, so activeTo alone covers it.
  useLayoutEffect(() => { placePill(activeTo) }, [activeTo])

  useEffect(() => {
    // Collapse-on-scroll only where hover can re-expand it. On touch devices
    // there is no hover, so the island must stay expanded or the links become
    // unreachable after scrolling.
    const canHover = window.matchMedia('(hover: hover)').matches
    const syncCompact = () => setCompact(canHover && window.scrollY > window.innerHeight * 0.5)
    const onResize = () => { syncCompact(); placePill(activeTo) }
    syncCompact()
    window.addEventListener('scroll', syncCompact, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', syncCompact)
      window.removeEventListener('resize', onResize)
    }
  }, [activeTo])

  // Light is the default; dark is only ever reached by an explicit toggle, and
  // that choice is what gets persisted. Nothing is written on mount, so a
  // first-time visitor always opens light.
  const toggleTheme = () => {
    // Deliberately not inside a setTheme updater: updaters must stay pure, and
    // React may invoke one during a render it later discards — which would leave
    // the DOM and localStorage flipped while component state stayed behind.
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // Private mode — the theme still applies, it just will not survive a reload.
    }
  }

  const open = !compact || hover
  const dark = theme === 'dark'

  // Re-measure the indicator once the expand transition has settled. activeTo
  // belongs in the deps: a route change moves the pill to a different link, and
  // if that happens while the island is collapsing or expanding the layout
  // effect measures a width mid-transition. Re-running the timeout on the new
  // target is the correction, so the last measurement is always of the link the
  // pill is actually under.
  useEffect(() => {
    const id = setTimeout(() => placePill(activeTo), open ? 80 : 0)
    return () => clearTimeout(id)
  }, [open, activeTo])

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      {/* Gaps and link padding tighten below sm: the toggle costs ~31px, more
          slack than the pill had at 360px-wide phones. Unchanged at sm and up. */}
      <nav
        aria-label="Site"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        /*
         * Keyboard focus opens it too, because hover is the only thing that
         * ever did and hover is a mouse. Compact collapsed the links to a
         * max-width of 0 at zero opacity without taking them out of the tab
         * order, so on a scrolled page Tab landed on an invisible Work link and
         * nothing on screen moved.
         *
         * React's onFocus/onBlur are focusin/focusout, which bubble, so these
         * are focus-within: the relatedTarget check is what stops a collapse
         * while focus is only moving from the logo to a link or on to the
         * toggle. A null relatedTarget — focus leaving the window entirely —
         * counts as leaving, which is the same thing the pointer does.
         */
        onFocus={() => setHover(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setHover(false)
        }}
        className="flex items-center gap-1 rounded-[10px] border border-[var(--chrome-edge)] bg-[var(--chrome-glass)] px-2 py-1.5 shadow-[var(--chrome-lift)] backdrop-blur-md transition-colors sm:gap-1.5"
      >
        {/* Logo only — the wordmark lives in the hero, and dropping it here keeps
            the pill compact enough for the nav links and the theme toggle at any
            width. aria-label carries the name for screen readers. */}
        <Link to="/" className="flex items-center rounded-[7px] px-2 py-1" aria-label="Home, Charles Abi Chahine">
          <Logo className="h-5 w-auto text-ink" />
        </Link>
        <span className={`h-4 w-px shrink-0 bg-[var(--chrome-edge)] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <div
          className="relative flex items-center gap-0.5 overflow-hidden transition-[max-width,opacity] duration-300 ease-out"
          style={{ maxWidth: open ? 360 : 0, opacity: open ? 1 : 0 }}
        >
          <span
            aria-hidden="true"
            className="absolute top-1/2 -translate-y-1/2 rounded-[7px] bg-[var(--chrome-wash)] transition-[left,width] duration-300 ease-out"
            style={{ left: pill.left, width: pill.width, height: 'calc(100% - 4px)' }}
          />
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              ref={(el) => { linkRefs.current[l.to] = el }}
              onMouseEnter={() => placePill(l.to)}
              onMouseLeave={() => placePill(activeTo)}
              className={({ isActive }) =>
                /* chrome-label fixes the tracking at the band's wider 0.16em.
                   One size at every width now, and that size is the site's
                   floor for anything a visitor has to click: 9.6px on a phone
                   and 10.24px above it were the smallest targets on the page
                   and they were the primary navigation. 11px costs the pill
                   about 12px of width, which the 360px case still has. */
                `relative z-[1] whitespace-nowrap rounded-[7px] px-2 py-1.5 text-[0.6875rem] transition-colors chrome-label sm:px-2.5 ${
                  isActive ? 'text-ink' : 'text-soft hover:text-accent'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/*
          Sits outside the links container on purpose: the sliding indicator is
          positioned from offsetLeft within that container, so keeping the
          toggle out of it leaves the existing measurement untouched. It also
          stays visible when the island goes compact — the links collapse, the
          brand mark and the toggle remain reachable.
        */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[7px] text-soft transition-colors hover:bg-[var(--chrome-wash)] hover:text-ink focus-visible:bg-[var(--chrome-wash)] focus-visible:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <span className="relative block h-[15px] w-[15px]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
              data-theme-icon=""
              className={`absolute inset-0 h-full w-full transition-all duration-300 ease-out motion-reduce:transition-none ${
                dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
              }`}
            >
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
            </svg>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              data-theme-icon=""
              className={`absolute inset-0 h-full w-full transition-all duration-300 ease-out motion-reduce:transition-none ${
                dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
              }`}
            >
              <path d="M20.5 14.6A8.6 8.6 0 1 1 9.4 3.5a6.9 6.9 0 0 0 11.1 11.1Z" />
            </svg>
          </span>
        </button>
      </nav>
    </div>
  )
}
