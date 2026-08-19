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
export const HOME_TITLE = 'Charles Abi Chahine | Architect & Computational Designer'

const PAGES = { '/work': 'Work', '/about': 'About', '/cv': 'CV' }

// A trailing slash is the same page; without this /work/ would title as a 404.
const normalize = (pathname) => pathname.replace(/\/+$/, '') || '/'

/*
 * projectTitle is the resolved project's title for /work/:slug, and undefined
 * when the slug is unknown — which is a 404 like any other unmatched path.
 */
export function titleFor(pathname, projectTitle) {
  const path = normalize(pathname)
  if (path === '/') return HOME_TITLE
  const label = path.startsWith('/work/') ? projectTitle : PAGES[path]
  return `${label || 'Not found'} — Charles Abi Chahine`
}

// No query string: a filter or a share tag is the same page to a crawler.
export const canonicalFor = (pathname) => ORIGIN + normalize(pathname)
