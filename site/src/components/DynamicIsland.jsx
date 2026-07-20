import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'

/*
 * Dynamic Island — the site's whole navigation, persistent on every page.
 * A rounded glass pill (dark, so it reads over both the dark landing and the
 * white interior pages). Holds the logo + name (→ landing) and the three
 * destinations, with a sliding indicator under the active/hovered one. It
 * expands by default, morphs compact once scrolled, and re-expands on hover.
 */

const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/cv', label: 'CV' },
]

export default function DynamicIsland() {
  const { pathname } = useLocation()
  const linkRefs = useRef({})
  const [compact, setCompact] = useState(false)
  const [hover, setHover] = useState(false)
  const [pill, setPill] = useState({ left: 0, width: 0 })

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

  const open = !compact || hover

  // re-measure the indicator once the expand transition has settled
  useEffect(() => {
    const id = setTimeout(() => placePill(activeTo), open ? 80 : 0)
    return () => clearTimeout(id)
  }, [open])

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <nav
        aria-label="Site"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(20,20,24,0.75)] px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <Link to="/" className="flex items-center gap-2 rounded-full px-2 py-1" aria-label="Home — Charles Abi Chahine">
          <Logo className="h-5 w-auto text-[#f0f0ea]" />
          <span className="whitespace-nowrap text-[0.78rem] font-bold tracking-tight text-[#f2f2ec] sm:text-sm">Charles Abi Chahine</span>
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
                `relative z-[1] whitespace-nowrap rounded-full px-2.5 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.08em] transition-colors sm:px-3 sm:text-[0.7rem] sm:tracking-[0.1em] ${
                  isActive ? 'text-white' : 'text-[#c7c7c0] hover:text-[#e5382b]'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
