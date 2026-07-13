import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import DynamicIsland from './components/DynamicIsland.jsx'
import Footer from './components/Footer.jsx'

function App() {
  const { pathname } = useLocation()
  // Braces matter: without them the arrow implicitly returns scrollTo()'s value,
  // which React treats as a cleanup function and calls on the next navigation —
  // crashing with "X is not a function" in browsers where scrollTo returns non-undefined.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const home = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col">
      <DynamicIsland />
      <main className="flex-1">
        <Outlet />
      </main>
      {!home && <Footer />}
    </div>
  )
}

export default App
