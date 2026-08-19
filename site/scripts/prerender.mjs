/*
 * Writes a real index.html into dist/ at every route the router answers.
 *
 * GitHub Pages serves dist/404.html for any path it has no file for. That
 * renders the app, which is why deep links appeared to work, but the response
 * status is 404: /work, /about, /cv and every project answered 404 to curl and
 * to every crawler, while sitemap.xml advertised all of them. A file at the path
 * is served as itself, at 200. 404.html stays as the catch-all for URLs that
 * really are unknown.
 *
 * Each copy is the built index.html with its title and canonical rewritten to
 * the route's own, which costs nothing here and is what a crawler reads before
 * it runs any JS. The app sets the same pair at runtime (see routes.jsx).
 *
 * Runs after `vite build`, on the output rather than on public/.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { projects, routes } from './routes.mjs'
import { titleFor, canonicalFor } from '../src/documentMeta.js'

const here = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(here, '../dist')

const TITLE = /<title>[^<]*<\/title>/
const CANONICAL = /<link rel="canonical"[^>]*>/

const index = readFileSync(resolve(DIST, 'index.html'), 'utf8')
for (const [what, re] of [['title', TITLE], ['canonical link', CANONICAL]]) {
  if (!re.test(index)) throw new Error(`prerender: no ${what} in dist/index.html to rewrite`)
}

const titleOf = new Map(projects.map((p) => [`/work/${p.slug}`, p.title]))
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let written = 0
for (const route of routes) {
  // "/" is dist/index.html itself, which already carries both.
  if (route === '/') continue
  const html = index
    .replace(TITLE, `<title>${esc(titleFor(route, titleOf.get(route)))}</title>`)
    .replace(CANONICAL, `<link rel="canonical" href="${canonicalFor(route)}" />`)
  mkdirSync(join(DIST, route), { recursive: true })
  writeFileSync(join(DIST, route, 'index.html'), html)
  written++
}

console.log(`prerender: ${written} routes written into dist/`)
