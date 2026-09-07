/*
 * Analytics: GoatCounter, wired in one place.
 *
 * The site is one page that the router moves around in, so the vendor's
 * count-on-load is wrong twice over: it would see one view per visit, and it
 * would never see a download or an outbound click. So count.js is loaded with
 * its automatic counting switched off and driven from here:
 *
 *   - a page view on every path change, from useAnalytics in routes.jsx;
 *   - a filter event when ?category on /work changes after arrival, so a link
 *     shared with a filter in it does not count as a press;
 *   - a click event for any element carrying data-track="<event path>", via
 *     one listener on the document. The two downloads and a card's Links row
 *     carry the attribute; nothing else in the components knows this exists.
 *
 * Where it sends is VITE_GOATCOUNTER, the site's /count endpoint, set in
 * .env.production for the deployed build. Unset (npm run dev), every call is
 * printed as "[analytics] pageview /work" and nothing leaves the machine. To
 * watch real requests from a dev server, put the endpoint and
 * VITE_GOATCOUNTER_ALLOW_LOCAL=true in .env.development.local (gitignored):
 * without allow_local count.js refuses to count on localhost, which is also
 * why a production build served by `vite preview` stays silent.
 *
 * Event paths are slash-separated keys so the dashboard's path filter can show
 * a family at once ("download/", "outbound/"):
 *   download/portfolio, download/cv
 *   filter/<category>
 *   outbound/<live|github|blog>/<project slug>
 * Which card was opened needs no event: a card is /work/<slug>, a page view.
 *
 * count.js is the vendor's ~4 KB script, fetched from gc.zgo.at (ISC). If a
 * blocker stops it, load() resolves false and every call becomes a no-op.
 * Sends go through navigator.sendBeacon, so a download or an outbound click
 * is counted even as the page is left.
 */
import { useEffect, useRef } from 'react'
import { BELT_BY_LABEL } from './data/belts.js'
import { normalize } from './documentMeta.js'

const ENDPOINT = import.meta.env.VITE_GOATCOUNTER
const ALLOW_LOCAL = import.meta.env.VITE_GOATCOUNTER_ALLOW_LOCAL === 'true'
const SCRIPT = 'https://gc.zgo.at/count.js'

// One load, started by the first send, so the script is never on the page in
// development and never requested before there is something to count.
let loading = null
function load() {
  if (!loading) {
    loading = new Promise((resolve) => {
      // Read by count.js as it runs, so it must be in place before the tag is.
      window.goatcounter = {
        no_onload: true,
        no_events: true,
        allow_local: ALLOW_LOCAL,
        endpoint: ENDPOINT,
      }
      const s = document.createElement('script')
      s.async = true
      s.src = SCRIPT
      s.dataset.goatcounter = ENDPOINT
      s.onload = () => resolve(true)
      s.onerror = () => resolve(false)
      document.head.appendChild(s)
    })
  }
  return loading
}

function send(vars) {
  if (!ENDPOINT) {
    console.info(`[analytics] ${vars.event ? 'event' : 'pageview'} ${vars.path}`, vars.title)
    return
  }
  load().then((ok) => ok && window.goatcounter.count(vars))
}

// The referrer belongs to the first view only. document.referrer keeps the
// external page for the life of the tab, so sending it with every route change
// would credit that page with one hit per view.
let first = true
export function pageview(path, title) {
  send({ path, title, event: false, referrer: first ? document.referrer : '' })
  first = false
}

// A title for the dashboard's list, read off the key: "Download: portfolio",
// "Outbound: github, sensi".
const humanize = (path) => {
  const [kind, ...rest] = path.split('/')
  return `${kind[0].toUpperCase()}${kind.slice(1)}: ${rest.join(', ')}`
}

export function event(path, title = humanize(path)) {
  send({ path, title, event: true })
}

// "Computation & AI" -> computation-and-ai
const slugify = (label) =>
  label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/*
 * Called once, from AppRoutes, with the location the URL bar shows and the
 * title that goes with it. Not from App: when a card is open App renders the
 * background /work, and the view to count is the card's own URL.
 */
export function useAnalytics(pathname, search, title) {
  const path = normalize(pathname)

  // Consecutive duplicates are skipped, which is what StrictMode's double
  // effect in development would otherwise produce; a real navigation never
  // lands on the path it left.
  const last = useRef(null)
  useEffect(() => {
    if (last.current === path) return
    last.current = path
    pageview(path, title)
  }, [path, title])

  // The filter, as Work.jsx reads it: the category in the query, or All. Null
  // anywhere but the index, so leaving and coming back (including through a
  // card, whose URL has no query) re-arms without firing.
  let category = null
  if (path === '/work') {
    const asked = new URLSearchParams(search).get('category')
    category = BELT_BY_LABEL[asked] ? asked : 'All'
  }
  const seen = useRef(null)
  useEffect(() => {
    if (category !== null && seen.current !== null && category !== seen.current) {
      event(`filter/${slugify(category)}`, `Filter: ${category}`)
    }
    seen.current = category
  }, [category])

  // Clicks, delegated: anything with data-track. auxclick covers a middle
  // click opening a Live or GitHub link in a new tab.
  useEffect(() => {
    const onClick = (e) => {
      if (e.type === 'auxclick' && e.button !== 1) return
      const el = e.target.closest?.('[data-track]')
      if (el) event(el.dataset.track)
    }
    document.addEventListener('click', onClick)
    document.addEventListener('auxclick', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('auxclick', onClick)
    }
  }, [])
}
