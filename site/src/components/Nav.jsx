import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'

const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/cv', label: 'CV' },
]

export default function Nav() {
  const { pathname } = useLocation()
  const home = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  // On the homepage the nav overlays the dark hero (light, transparent), then
  // turns into the normal solid white bar once the hero has scrolled past.
  useEffect(() => {
    if (!home) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.82)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [home])

  const overlay = home && !scrolled

  const headerCls = home
    ? `fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled ? 'border-b border-line bg-paper/95 backdrop-blur' : 'bg-transparent'
      }`
    : 'border-b border-line bg-paper'

  const brandCls = overlay ? 'text-[#f0f0ea]' : 'text-ink'
  const linkIdle = overlay ? 'text-[#c9c9c2] hover:text-[#e5382b]' : 'text-ink hover:text-accent'

  return (
    <header className={headerCls}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className={`flex items-center gap-3 ${brandCls}`}>
          <Logo className="h-7 w-auto" />
          <span className="text-sm font-bold tracking-tight">Charles Abi Chahine</span>
        </Link>
        <nav className="flex gap-6">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `label-mono transition-colors ${isActive ? 'text-accent' : linkIdle}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
