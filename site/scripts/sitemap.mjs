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
 * The URL form comes from canonicalFor, the same function the canonical links
 * use, because a sitemap and a canonical that disagree about the slash advertise
 * two URLs for one page. /work is served as a 301 to /work/; the slash form is
 * what answers 200.
 *
 * Runs before `vite build`, so the generated file is picked up from public/ in
 * the same build.
 *
 * lastmod comes from git, not from the clock. Stamping every URL with today's
 * date said all 22 pages changed on every deploy, which is exactly the signal a
 * crawler is meant to use to decide what to re-fetch, spent on nothing. It also
 * meant the file this script writes into public/ differed from the committed one
 * after every build, so a build dirtied the tree. Two consecutive builds now
 * produce byte-identical output.
 *
 * A project's date is the last commit touching projects.js, which is where every
 * word and every image path on a project page comes from. The four static routes
 * take their own source file. Both are coarse on purpose: a per-project date
 * would mean parsing which hunk of one file belongs to which project, and a
 * lastmod is a hint rather than a claim.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { routes } from './routes.mjs'
import { canonicalFor } from '../src/documentMeta.js'

const here = dirname(fileURLToPath(import.meta.url))

const today = new Date().toISOString().slice(0, 10)

/*
 * The last commit date for one file, as YYYY-MM-DD.
 *
 * Falls back to today when git cannot answer: a shallow clone with no history
 * for the path, or a tree that is not a checkout at all. CI is fine — GitHub's
 * actions/checkout fetches the full history by default — so the fallback is for
 * a tarball build, where today is the only honest answer available.
 */
const lastCommit = (file) => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: here,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : today
  } catch {
    return today
  }
}

// Resolved once each rather than per URL: the project date is the same for all
// eighteen of them, and git is a process spawn.
const PROJECTS_MOD = lastCommit(resolve(here, '../src/data/projects.js'))
const PAGE_SOURCE = {
  '/': '../src/pages/Home.jsx',
  '/work': '../src/pages/Work.jsx',
  '/about': '../src/pages/About.jsx',
  '/cv': '../src/pages/CV.jsx',
}
const STATIC_MOD = Object.fromEntries(
  Object.entries(PAGE_SOURCE).map(([loc, f]) => [loc, lastCommit(resolve(here, f))]),
)

// Anything not named here is a project, which is the bulk of the list.
const RANK = {
  '/': { priority: '1.0', changefreq: 'monthly' },
  '/work': { priority: '0.9', changefreq: 'monthly' },
  '/about': { priority: '0.7', changefreq: 'yearly' },
  '/cv': { priority: '0.7', changefreq: 'monthly' },
}

const urls = routes.map((loc) => ({
  loc,
  lastmod: STATIC_MOD[loc] ?? PROJECTS_MOD,
  ...(RANK[loc] ?? { priority: '0.8', changefreq: 'yearly' }),
}))

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${canonicalFor(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(resolve(here, '../public/sitemap.xml'), xml)
console.log(`sitemap: ${urls.length} urls (${routes.length - 4} projects)`)
