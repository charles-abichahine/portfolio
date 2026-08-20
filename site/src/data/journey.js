import { education, experience } from './cv.js'
import { places } from './places.js'

/*
 * The About page's clock.
 *
 * Everything here is derived from cv.js rather than retyped beside it, because
 * the CV is the record that gets maintained and the last time these two drifted
 * the map was still calling a 2024 post a 2023 one. The only thing this file
 * adds is geography: cv.js knows Kuwait, it does not know where Kuwait is.
 */

// The frame's own present. The CV has open-ended posts, and an open end has to
// stop somewhere to be drawn.
export const NOW = 2026.6
export const START = 2018

/*
 * cv.js writes spans two ways: '2018–2023' for study and 'Aug 23–Jul 24' for
 * work, with a trailing dash for anything still running. Both become decimal
 * years so a bar can be drawn at the right length.
 */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

const point = (token) => {
  const t = token.trim()
  if (/^\d{4}$/.test(t)) return Number(t)
  const m = t.match(/^([A-Za-z]{3})\s*(\d{2})$/)
  if (!m) return null
  return 2000 + Number(m[2]) + MONTHS[m[1].toLowerCase()] / 12
}

export const parseSpan = (dates) => {
  const [a, b] = dates.split('–')
  const from = point(a)
  if (from === null) return null
  // Three cases, and only one of them runs to the present. '2022' is a single
  // year and ends at the end of it; 'Aug 24–' has an empty second half and is
  // still running; anything else has a real end. Reading the first as the third
  // put Kent State's one term on the map for four years.
  if (b === undefined) return { from, to: from + 1, open: false }
  if (b === '') return { from, to: NOW, open: true }
  const to = point(b)
  return { from, to: to === null ? NOW : to, open: false }
}

/*
 * Where each post and each degree sat. cv.js carries `where` and `school` as
 * prose, so this is the one lookup the page needs; the coordinates are the
 * cities themselves, not anything about him.
 */
const AT = {
  'IAAC, Barcelona': ['Barcelona', 2.17, 41.39],
  'Lebanese American University, Byblos': ['Byblos', 35.65, 34.12],
  'Kent State University, Ohio': ['Kent, Ohio', -81.36, 41.15],
  'Dynamic Solution Co.': ['Kuwait City', 47.98, 29.38],
  SOMA: ['Dubai', 55.3, 25.2],
  'BIM International': ['Beirut', 35.5, 33.9],
  'Jemma Chidiac Architects': ['Beirut', 35.5, 33.9],
  // Self-employed is hybrid in the CV and has no one place, so it is on the
  // timeline but never lights the map.
  'Self-employed': null,
}

const belt = (row) => (row.kind === 'study' ? 'green' : row.firm === 'BIM International' ? 'blue' : 'amber')

export const TIMELINE = [
  ...education.map((e) => ({ kind: 'study', dates: e.dates, name: e.school, role: e.degree, firm: e.school })),
  ...experience.map((x) => ({ kind: 'work', dates: x.dates, name: x.firm, role: x.role, firm: x.firm })),
]
  .map((row) => {
    const span = parseSpan(row.dates)
    const at = AT[row.firm] ?? null
    return span && { ...row, ...span, place: at && at[0], lon: at && at[1], lat: at && at[2], belt: belt(row) }
  })
  .filter(Boolean)
  .sort((a, b) => a.from - b.from)

/*
 * Project sites: where the work is, as opposed to where he was.
 *
 * Only the projects that name a place in their own text are here. The rest are
 * either unsited instruments — a copilot, a facade tool, a chair — or simply
 * have not been told to me yet, and neither gets a guess.
 *
 * `at: null` means it has a site that is not on this planet.
 */
const BYBLOS = [35.65, 34.12]
const DUBAI = [55.3, 25.2]
const BARCELONA = [2.17, 41.39]

export const SITES = [
  { slug: 'lau-anfeh', name: 'Anfeh', yr: 2023, from: BYBLOS, at: [35.73, 34.35], belt: 'amber' },
  { slug: 'saria', name: 'Saria', yr: 2024, from: DUBAI, at: [55.3, 25.2], belt: 'amber' },
  { slug: 'marception', name: 'Rings of Mars', yr: 2024, from: DUBAI, at: null, belt: 'green' },
  { slug: 'tsukiji', name: 'Tsukiji', yr: 2025, from: BARCELONA, at: [139.7, 35.7], belt: 'green' },
  { slug: 'huddle', name: 'The Huddle', yr: 2025, from: BARCELONA, at: [-70.9, -53.16], belt: 'green' },
  { slug: 'urban-risk', name: 'Encoding Urban Risk', yr: 2026, from: BARCELONA, at: [-0.13, 51.5], belt: 'accent' },
  { slug: 'breathing-mass', name: 'Breathing Mass', yr: 2026, from: BARCELONA, at: [-70.67, -33.45], belt: 'blue' },
  { slug: 'narkomfin', name: 'Narkomfin', yr: 2026, from: BARCELONA, at: [37.6, 55.75], belt: 'accent' },
]

/*
 * Everything that lights the world, with the year it first does. Three sources:
 * the posts and degrees above, the project sites, and the countries in places.js
 * he has travelled to. A visited country has no date in the data, so it lights
 * at the year the master began, which is when that travel happened.
 */
export const TOUCHES = [
  ...TIMELINE.filter((t) => t.lon !== null && t.lon !== undefined).map((t) => ({ yr: t.from, lon: t.lon, lat: t.lat })),
  ...SITES.filter((s) => s.at).map((s) => ({ yr: s.yr, lon: s.at[0], lat: s.at[1] })),
  ...places.filter((p) => p.kind === 'visited').map((p) => ({ yr: 2025, lon: p.lon, lat: p.lat })),
]
