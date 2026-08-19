/*
 * The site's routable URLs, derived from src/data/projects.js.
 *
 * Two build steps need the same list: the sitemap, and the pre-render that gives
 * every deep link a file so GitHub Pages answers 200 instead of falling through
 * to 404.html. A list written twice is a list that drifts, and the sitemap had
 * already gone stale once that way, so both read it from here.
 *
 * The slugs are read out of the source text rather than by importing it:
 * projects.js touches import.meta.env at module scope, which only exists inside
 * Vite, so plain node cannot evaluate it. Each entry opens with slug and titles
 * itself two lines later, a fixed shape that makes reading them this way safe.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

const src = readFileSync(resolve(here, '../src/data/projects.js'), 'utf8')

// Split on the slug line rather than matching across entries, so a chunk can
// never borrow the next project's title.
export const projects = src
  .split(/^\s{4}slug:\s*'/m)
  .slice(1)
  .map((chunk) => {
    const slug = chunk.slice(0, chunk.indexOf("'"))
    const title = chunk.match(/^\s{4}title:\s*'([^']*)'/m)?.[1]
    if (!title) throw new Error(`routes: no title found for slug "${slug}" — check the data shape`)
    return { slug, title }
  })

if (projects.length === 0) {
  throw new Error('routes: no slugs found in projects.js — check the data shape')
}

// Every path the router answers, in the order routes.jsx declares them. The
// catch-all is deliberately absent: it has no URL of its own.
export const routes = [
  '/',
  '/work',
  '/about',
  '/cv',
  ...projects.map((p) => `/work/${p.slug}`),
]
