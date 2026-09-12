/*
 * The week's visits to charlesabichahine.com, from GoatCounter, as Markdown.
 *
 * Run by traffic-digest.yml. Four requests, all read-only, against the API
 * (https://www.goatcounter.com/help/api): the total, every path with its
 * count, the top referrers and the top countries. The site's own event keys
 * (see site/src/analytics.js) are what make the sections below possible:
 * download/<file>, filter/<category>, outbound/<kind>/<slug>, and a card open
 * is a page view of /work/<slug>.
 *
 * Every number is visitors as GoatCounter counts them, unique rather than raw
 * hits, so "3 downloads" means three people, not three clicks.
 *
 * Environment: GOATCOUNTER_SITE (https://<code>.goatcounter.com),
 * GOATCOUNTER_TOKEN (an API key with "read statistics"), DAYS (default 7),
 * OUT (file to write; default digest.md). Appends to GITHUB_STEP_SUMMARY too.
 */
import { appendFileSync, writeFileSync } from 'node:fs'

const site = process.env.GOATCOUNTER_SITE
const token = process.env.GOATCOUNTER_TOKEN
const days = Number(process.env.DAYS || 7)
const out = process.env.OUT || 'digest.md'
if (!site || !token) throw new Error('GOATCOUNTER_SITE and GOATCOUNTER_TOKEN are required')

// The API wants hour-rounded bounds; the week is the last DAYS*24 whole hours.
const end = new Date()
end.setUTCMinutes(0, 0, 0)
const start = new Date(end.getTime() - days * 86400e3)
const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')
const day = (d) => d.toISOString().slice(0, 10)

async function api(path, params = {}) {
  const url = new URL(`/api/v0/${path}`, site)
  url.search = new URLSearchParams({ start: iso(start), end: iso(end), ...params })
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!r.ok) {
    // The token is looked up as "this value, on the account that owns this
    // site"; when that finds nothing the hosted service answers 404, not 401.
    const hint =
      r.status === 401 || r.status === 404
        ? ` (GOATCOUNTER_TOKEN is not an API key of the account that owns ${site})`
        : r.status === 403
          ? ' (the API key lacks the "read statistics" permission)'
          : ''
    throw new Error(`GET ${url.pathname}${url.search}: HTTP ${r.status} ${await r.text()}${hint}`)
  }
  return r.json()
}

// Sequential on purpose: the API allows 4 requests a second.
const total = await api('stats/total')
const { hits, more } = await api('stats/hits', { limit: 100 })
const refs = await api('stats/toprefs', { limit: 10 })
const countries = await api('stats/locations', { limit: 8 })

const SUFFIX = / • Charles Abi Chahine$/
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|')
const table = (head, rows) =>
  rows.length === 0
    ? '_None this week._\n'
    : [
        `| ${head.join(' | ')} |`,
        `| ${head.map((_, i) => (i === head.length - 1 ? '---:' : '---')).join(' | ')} |`,
        ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
      ].join('\n') + '\n'

const pages = hits.filter((h) => !h.event)
const events = hits.filter((h) => h.event)
const family = (prefix) =>
  events.filter((e) => e.path.startsWith(prefix)).map((e) => [e.path.slice(prefix.length), e.count])

const isCard = (p) => /^\/work\/[^/]+\/?$/.test(p.path)
const cards = pages.filter(isCard).map((p) => [p.title?.replace(SUFFIX, '') || p.path, p.count])
const index = pages
  .filter((p) => !isCard(p))
  .map((p) => [p.path, p.title?.replace(SUFFIX, '') || '', p.count])
const outbound = family('outbound/').map(([rest, n]) => {
  const [kind, ...slug] = rest.split('/')
  return [kind, slug.join('/'), n]
})

const visitors = total.total - total.total_events
const lines = [
  `## ${day(start)} to ${day(end)}`,
  '',
  visitors === 0 && total.total_events === 0
    ? '_No visits recorded._'
    : `**${visitors}** visitors on pages, **${total.total_events}** on events. Counts are visitors, not raw hits.`,
  '',
  '### Pages',
  table(['Path', 'Title', 'Visitors'], index),
  '### Cards opened',
  table(['Project', 'Visitors'], cards),
  '### Downloads',
  table(['File', 'Visitors'], family('download/')),
  '### Filter presses',
  table(['Category', 'Visitors'], family('filter/')),
  '### Outbound links',
  table(['Link', 'Project', 'Visitors'], outbound),
  '### Referrers',
  table(['Source', 'Visitors'], refs.stats.map((s) => [s.name || '(direct)', s.count])),
  '### Countries',
  table(['Country', 'Visitors'], countries.stats.map((s) => [s.name, s.count])),
]
if (more) lines.push('_More than 100 paths this week; the list above is the top 100._', '')
lines.push(`<sub>From ${site.replace(/^https?:\/\//, '')}, ${days} days ending ${iso(end)}.</sub>`, '')

const md = lines.join('\n')
writeFileSync(out, md)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
console.log(md)
