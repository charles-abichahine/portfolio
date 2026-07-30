import { projects } from './projects.js'

/*
 * The four belts on the landing.
 *
 * Three real categories plus a fourth belt for the pre-MaCAD professional work.
 * This is a landing-page grouping only. Design & Research was 11 of 19 and
 * swallowed the whole field; pulling these three out gives 5 / 3 / 8 / 3.
 *
 * `projects.js` is deliberately untouched, because /work filters on the three
 * real categories and has to keep working. That does mean the landing and /work
 * group the same nineteen projects differently, which is a known loose end: the
 * landing shows a Practice belt that /work has no filter for.
 *
 * Rings of Mars (`marception`) is an international competition, not professional
 * practice, so it stays in Design & Research.
 */
const PRACTICE = ['soma-verve', 'soma-stratus', 'lau-anfeh']

export const BELTS = [
  {
    id: 'ai',
    label: 'Computation & AI',
    color: 'var(--color-accent)',
    holds: (p) => p.category === 'Computation & AI',
  },
  {
    id: 'bim',
    label: 'BIM & Workflows',
    color: 'var(--color-blue)',
    holds: (p) => p.category === 'BIM & Workflows',
  },
  {
    id: 'dr',
    label: 'Design & Research',
    color: 'var(--color-green)',
    holds: (p) => p.category === 'Design & Research' && !PRACTICE.includes(p.slug),
  },
  {
    id: 'pr',
    label: 'Practice',
    color: 'var(--color-amber)',
    holds: (p) => PRACTICE.includes(p.slug),
  },
].map((b) => ({ ...b, items: projects.filter(b.holds).sort(awardFirst) }))

/*
 * Awarded projects lead their belt. The landing only shows the first two of each,
 * so without this the four award winners were down to two: Sensi and The Huddle
 * showed, lEgoarCh and Rings of Mars did not. Sort is stable, so inside each
 * group the newest-first order of projects.js survives.
 */
function awardFirst(a, b) {
  return (b.award ? 1 : 0) - (a.award ? 1 : 0)
}

// Every project matches exactly one belt: the Design & Research predicate
// excludes the practice slugs and the Practice belt catches them.
export const beltFor = (p) => BELTS.find((b) => b.holds(p)) ?? BELTS[BELTS.length - 1]
export const BELT_BY_LABEL = Object.fromEntries(BELTS.map((b) => [b.label, b]))

// Canvas cannot read a CSS custom property, so the field resolves these token
// names itself. Kept beside the belts so the two cannot drift apart.
export const BELT_TOKEN = {
  ai: '--color-accent',
  bim: '--color-blue',
  dr: '--color-green',
  pr: '--color-amber',
}
