/*
 * The <title> and canonical for a route.
 *
 * The site is one HTML file, so every route served the home page's head: /work,
 * /about, /cv, the 404 and all eighteen project cards shared one title and one
 * canonical pointing at "/", which told a crawler they were all the landing page.
 *
 * Two things read this. The effect in routes.jsx, which is what covers moving
 * around inside the app, and prerender.mjs, which bakes the same pair into the
 * file it writes at each route so a crawler that never runs the JS reads it too.
 * One scheme in one place, so the static and the runtime answer cannot disagree.
 */
export const ORIGIN = 'https://charlesabichahine.com'

// The static default in index.html, and the only route whose title is not a
// label followed by the name.
export const HOME_TITLE = 'Charles Abi Chahine • Architect & Computational Designer'

const PAGES = { '/work': 'Work', '/cv': 'CV', '/contact': 'Contact' }

/*
 * Retired paths, old to the page that now answers for them. /about became
 * /traces, and Traces is off the site for now, so both go to /contact, the page
 * about the person. Six projects were first addressed by the names they were
 * filed under (the thesis by its school and town, the booths as booths, the
 * rest by course or competition) and now go by their titles. The old addresses
 * still answer (routes.jsx redirects them, and prerender.mjs gives each a
 * file), but they name the new page as their title and canonical, so a crawler
 * following an old link learns where it went.
 */
export const MOVED = {
  '/about': '/contact',
  '/traces': '/contact',
  '/work/lau-anfeh': '/work/point-nought',
  '/work/lincoln-booth': '/work/tideline',
  '/work/nexus-booth': '/work/codependent',
  '/work/integrative-modeling': '/work/family-tree',
  '/work/collaborative-workflow': '/work/paper-trail',
  '/work/marception': '/work/rings-of-mars',
}
const current = (path) => MOVED[path] ?? path

// A trailing slash is the same page; without this /work/ would title as a 404.
/*
 * One reading of a path, for everything that has to decide which route it is
 * looking at. Pages serves the prerendered routes at their directory form and
 * 301s /work to /work/, while a Link inside the app produces the slashless one,
 * so the same page arrives spelled two ways depending on how you got there.
 * Anything comparing a pathname has to compare through this or it will be right
 * on a click and wrong on a refresh.
 */
export const normalize = (pathname) => pathname.replace(/\/+$/, '') || '/'

/*
 * projectTitle is the resolved project's title for /work/:slug, and undefined
 * when the slug is unknown — which is a 404 like any other unmatched path.
 */
export function titleFor(pathname, projectTitle) {
  const path = current(normalize(pathname))
  if (path === '/') return HOME_TITLE
  const label = path.startsWith('/work/') ? projectTitle : PAGES[path]
  return `${label || 'Not found'} • Charles Abi Chahine`
}

/*
 * No query string: a filter or a share tag is the same page to a crawler.
 *
 * The trailing slash is the form the server actually answers with 200. Every
 * route is a directory holding an index.html (see prerender.mjs), and GitHub
 * Pages 301s /work to /work/ to reach it — so the slashless form named a URL
 * that redirects, which is the one thing a canonical must never do.
 */
export const canonicalFor = (pathname) => {
  const path = current(normalize(pathname))
  return ORIGIN + (path === '/' ? path : `${path}/`)
}
