/*
 * Generates public/sitemap.xml from the project data.
 *
 * Written by hand, this file went stale the moment projects were added — it
 * listed 6 of 19, so Google could not discover the other 13. Deriving it from
 * projects.js means adding a project is enough; the sitemap follows.
 *
 * The slugs are read out of the source text rather than by importing it:
 * projects.js touches import.meta.env at module scope, which only exists inside
 * Vite, so plain node cannot evaluate it. Slugs are a fixed one-per-line shape,
 * which makes reading them this way safe.
 *
 * Runs before `vite build`, so the generated file is picked up from public/ in
 * the same build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const ORIGIN = 'https://charlesabichahine.com'

const src = readFileSync(resolve(here, '../src/data/projects.js'), 'utf8')
const slugs = [...src.matchAll(/^\s{4}slug:\s*'([^']+)'/gm)].map((m) => m[1])

if (slugs.length === 0) {
  throw new Error('sitemap: no slugs found in projects.js — check the data shape')
}

const today = new Date().toISOString().slice(0, 10)

const urls = [
  { loc: '/', priority: '1.0', changefreq: 'monthly' },
  { loc: '/work', priority: '0.9', changefreq: 'monthly' },
  { loc: '/about', priority: '0.7', changefreq: 'yearly' },
  { loc: '/cv', priority: '0.7', changefreq: 'monthly' },
  ...slugs.map((slug) => ({ loc: `/work/${slug}`, priority: '0.8', changefreq: 'yearly' })),
]

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
console.log(`sitemap: ${urls.length} urls (${slugs.length} projects)`)
