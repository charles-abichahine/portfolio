import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'

/*
 * Dynamic Island — the site's whole navigation, persistent on every page.
 * A rounded glass pill that stays dark in both themes: it is an object floating
 * over the page rather than part of the page surface, so it keeps its own
 * material the way the SliceHero keeps its dark ground. Its colours are
 * deliberately hardcoded rather than routed through the theme tokens.
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
  const linkRefs = useRef({})
  const [compact, setCompact] = useState(false)
  const [hover, setHover] = useState(false)
  const [pill, setPill] = useState({ left: 0, width: 0 })
  // The inline script in index.html has already resolved and applied the theme,
  // so we read it off the element rather than recomputing it and risking a
  // first-render mismatch with what is already painted.
  const [theme, setTheme] = useState(readTheme)

  const activeTo =
    links.find((l) => pathname === l.to || (l.to === '/work' && pathname.startsWith('/work')))?.to || null

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

  // Persist only on an explicit toggle. Writing the resolved theme on mount
  // would freeze whatever the OS happened to say on the first visit, and the
  // site would stop following prefers-color-scheme forever after.
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

  // Until a choice is stored, keep tracking the OS so the site flips with it.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (e) => {
      let stored = null
      try {
        stored = localStorage.getItem(THEME_KEY)
      } catch { /* unreadable — treat as unset and follow the OS */ }
      if (stored === 'light' || stored === 'dark') return
      const next = e.matches ? 'dark' : 'light'
      applyTheme(next)
      setTheme(next)
    }
    mq.addEventListener('change', onSystemChange)
    return () => mq.removeEventListener('change', onSystemChange)
  }, [])

  const open = !compact || hover
  const dark = theme === 'dark'

  // re-measure the indicator once the expand transition has settled
  useEffect(() => {
    const id = setTimeout(() => placePill(activeTo), open ? 80 : 0)
    return () => clearTimeout(id)
  }, [open])

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      {/* Gaps and link padding tighten below sm: the toggle costs ~31px, more
          slack than the pill had at 360px-wide phones. Unchanged at sm and up. */}
      <nav
        aria-label="Site"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex items-center gap-1 rounded-full border border-white/10 bg-[rgba(20,20,24,0.75)] px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-1.5"
      >
        {/* Logo only — the wordmark lives in the hero, and dropping it here keeps
            the pill compact enough for the nav links and the theme toggle at any
            width. aria-label carries the name for screen readers. */}
        <Link to="/" className="flex items-center rounded-full px-2 py-1" aria-label="Home — Charles Abi Chahine">
          <Logo className="h-5 w-auto text-[#f0f0ea]" />
        </Link>
        <span className={`h-4 w-px shrink-0 bg-white/20 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
        <div
          className="relative flex items-center gap-0.5 overflow-hidden transition-[max-width,opacity] duration-300 ease-out"
          style={{ maxWidth: open ? 360 : 0, opacity: open ? 1 : 0 }}
        >
          <span
            aria-hidden="true"
            className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 transition-[left,width] duration-300 ease-out"
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
                `relative z-[1] whitespace-nowrap rounded-full px-2 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] transition-colors sm:px-3 sm:text-[0.7rem] sm:tracking-[0.1em] ${
                  isActive ? 'text-white' : 'text-[#c7c7c0] hover:text-[#e5382b]'
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
          className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-[#c7c7c0] transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/45"
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
