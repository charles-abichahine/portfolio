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
  // Routes that own the whole viewport and supply their own footer. They must not
  // sit inside min-h-screen: a 100vh wrapper around a 100svh child is taller than
  // the visual viewport on mobile, which hands the page a phantom scrollbar.
  const fullBleed = pathname === '/' || pathname === '/about'

  return (
    <div className={fullBleed ? 'flex flex-col' : 'flex min-h-screen flex-col'}>
      <DynamicIsland />
      <main className={fullBleed ? '' : 'flex-1'}>
        <Outlet />
      </main>
      {!fullBleed && <Footer />}
    </div>
  )
}

export default App
