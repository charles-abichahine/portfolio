/*
 * Generates public/sitemap.xml from the project data.
 *
 * Written by hand, this file went stale the moment projects were added — it
 * listed 6 of 19, so Google could not discover the other 13. Deriving it from
 * projects.js means adding a project is enough; the sitemap follows.
 *
 * The URL list comes from routes.mjs, which is also what prerender.mjs writes
 * files for: a URL that is listed here but has no file would be advertised to
 * crawlers and then answered with a 404.
 *
 * Runs before `vite build`, so the generated file is picked up from public/ in
 * the same build.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { routes } from './routes.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://charlesabichahine.com'

const today = new Date().toISOString().slice(0, 10)

// Anything not named here is a project, which is the bulk of the list.
const RANK = {
  '/': { priority: '1.0', changefreq: 'monthly' },
  '/work': { priority: '0.9', changefreq: 'monthly' },
  '/about': { priority: '0.7', changefreq: 'yearly' },
  '/cv': { priority: '0.7', changefreq: 'monthly' },
}

const urls = routes.map((loc) => ({
  loc,
  ...(RANK[loc] ?? { priority: '0.8', changefreq: 'yearly' }),
}))

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${ORIGIN}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(resolve(here, '../public/sitemap.xml'), xml)
console.log(`sitemap: ${urls.length} urls (${routes.length - 4} projects)`)
