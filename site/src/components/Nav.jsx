import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/cv', label: 'CV' },
]

export default function Nav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-7 w-auto text-ink" />
          <span className="text-sm font-bold tracking-tight">Charles Abi Chahine</span>
        </Link>
        <nav className="flex gap-6">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `label-mono transition-colors ${isActive ? 'text-accent' : 'text-ink hover:text-accent'}`
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
