/*
 * One drawn mark per project, for the /work index cards.
 *
 * All eighteen share a single grammar, and the grammar is the point: a 24-unit
 * square, line only, stroke 1.4 with round caps and joins, no fills. Each glyph
 * abstracts what the project IS — the persona rose, the spatial graph, the
 * braced column — rather than what category it sits in; the filter pills
 * already carry the categories. Colour is inherited (currentColor), so the mark
 * tints with the title on hover, with one exception: a glyph may spend the
 * accent on a single element when the accent carries the project's meaning —
 * the circled intersection is the risk, the ray is the light, the sun is the
 * analysis.
 *
 * The marks are static JSX with no interpolation, which is what lets the
 * contact-sheet script lift them into plain HTML for review.
 */

const GLYPHS = {
  // The persona rose: six petals around the person at the centre.
  sensi: (
    <>
      <circle cx="12" cy="12" r="2.1" />
      <ellipse cx="12" cy="5.9" rx="2" ry="3.3" />
      <ellipse cx="12" cy="5.9" rx="2" ry="3.3" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="5.9" rx="2" ry="3.3" transform="rotate(120 12 12)" />
      <ellipse cx="12" cy="5.9" rx="2" ry="3.3" transform="rotate(180 12 12)" />
      <ellipse cx="12" cy="5.9" rx="2" ry="3.3" transform="rotate(240 12 12)" />
      <ellipse cx="12" cy="5.9" rx="2" ry="3.3" transform="rotate(300 12 12)" />
    </>
  ),
  // The building as a spatial graph: four rooms, the doors between them. One
  // perimeter edge is left out so the network stays a network and never closes
  // into a rectangle.
  narkomfin: (
    <>
      <circle cx="5.5" cy="5.5" r="1.7" />
      <circle cx="18.5" cy="6.5" r="1.7" />
      <circle cx="6.5" cy="18" r="1.7" />
      <circle cx="16.5" cy="16.5" r="1.7" />
      <path d="M7.7 5.7 16.3 6.3" />
      <path d="M5.7 7.7 6.3 15.8" />
      <path d="M18.1 8.7 16.9 14.3" />
      <path d="M7.1 7.1 14.9 14.9" />
    </>
  ),
  // The street grid, one intersection circled: the segment the model flags.
  'urban-risk': (
    <>
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />
      <circle cx="15" cy="9" r="3.1" stroke="var(--color-accent)" />
    </>
  ),
  // A brick, two studs: the elevation every set is solved into.
  legoarch: (
    <path d="M4 19h16v-9h-2.5V6.5h-4V10h-3V6.5h-4V10H4z" />
  ),
  // The braced column: the topology-optimized structure, reduced to its logic.
  'breathing-mass': (
    <>
      <path d="M8.5 3.5v17M15.5 3.5v17" />
      <path d="M8.5 6.5 15.5 17.5M15.5 6.5 8.5 17.5" />
    </>
  ),
  // Three bodies packed close, the way penguins survive the same latitudes.
  huddle: (
    <>
      <circle cx="8.7" cy="9.7" r="4.2" />
      <circle cx="15.3" cy="9.7" r="4.2" />
      <circle cx="12" cy="15.6" r="4.2" />
    </>
  ),
  // A facade grid over a slider: geometry priced as it moves.
  facadeiq: (
    <>
      <rect x="5" y="4" width="14" height="11" />
      <path d="M12 4v11M5 9.5h14" />
      <path d="M5 19h14" />
      <circle cx="13.5" cy="19" r="1.7" stroke="var(--color-accent)" />
    </>
  ),
  // Three towers off one podium, the bridge threading them — the podium and
  // the bridge are what keep three uprights from reading as a bar chart.
  'integrative-modeling': (
    <>
      <path d="M4 20.5V18h16v2.5" />
      <path d="M5.5 18V9.5h3V18" />
      <path d="M10.5 18V4H14v14" />
      <path d="M16 18v-6h3v6" />
      <path d="M8.5 14h7.5" />
    </>
  ),
  // The pipeline: a model, a push, a sheet.
  'collaborative-workflow': (
    <>
      <circle cx="5.5" cy="12" r="2.3" />
      <path d="M8.6 12h4.8M11.6 10.2l1.8 1.8-1.8 1.8" />
      <path d="M15 7.5h3.7l2 2v7H15zM18.7 7.5v2h2" />
    </>
  ),
  // A doubly-curved lattice fragment: two waves, three ribs crossing them.
  'clebsch-pavilion': (
    <>
      <path d="M3.5 9C9 4.5 15 13.5 20.5 8" />
      <path d="M3.5 15.5C9 11 15 20 20.5 14.5" />
      <path d="M5.3 6.8C4.9 10 4.9 13.5 5.3 16.9" />
      <path d="M12.2 6.6C11.8 10 11.8 13.6 12.2 17.2" />
      <path d="M19 6.2C18.6 9.5 18.6 13 19 16.6" />
    </>
  ),
  // Strata with a ray of light finding the gap between them.
  'luminous-stratum': (
    <>
      <path d="M4 6h8M15 6h5M4 10h7M14 10h6M4 14h6M13 14h7M4 18h5M12 18h8" />
      <path d="M14 3.5 10.2 20.5" stroke="var(--color-accent)" />
    </>
  ),
  // The sun over the site: the shallow arc is the path it was analysed along.
  // Off-axis on purpose — centred over the dome it read as a head on shoulders.
  tsukiji: (
    <>
      <path d="M3.5 18.5h17" />
      <path d="M4.5 18.5a8 8 0 0 1 15 0" />
      <circle cx="7.5" cy="8.8" r="1.9" stroke="var(--color-accent)" />
    </>
  ),
  // The inflated body, spikes out — with the eye and the tail that keep it a
  // puffer rather than a sun.
  'puffer-playscape': (
    <>
      <circle cx="10.8" cy="13" r="4.9" />
      <path d="M15.5 11.7 19.7 9.9 19 14.4Z" />
      <path d="M10.8 7.3V5.1M10.8 18.7v2.2M5.1 13H2.9M14.8 9l1.6-1.6M6.8 9 5.2 7.4M6.8 17l-1.6 1.6M14.8 17l1.6 1.6" />
      <circle cx="9.2" cy="11.6" r="0.8" />
    </>
  ),
  // The wave running out of the surface and up into a seat.
  'wave-chair': (
    <>
      <path d="M3 16.5C4.8 11.5 6.8 11.5 8.6 16.5 10 20.2 11.8 20 13 16.5 14 13.5 14.4 10.5 14.4 6.5" />
      <path d="M14.4 12.8h5.9v5.5" />
    </>
  ),
  // One closed loop crossing itself: the cross-cap's whole argument. The lobes
  // are deliberately unequal — a symmetric pair reads as an infinity sign.
  'cross-cap-house': (
    <g transform="rotate(-22 12 12)">
      <path d="M11.5 12.5C8.5 7.5 3 8 3.2 12.3 3.4 16.6 8.7 17.2 11.5 12.5 13.5 9.3 17.5 9 19 11 20.5 13 18.5 16.2 16 15.8 14 15.5 12.8 14.3 11.5 12.5Z" />
    </g>
  ),
  // The ring over its crater: an annulus in perspective, because a single
  // circle over an arc read as an eye.
  marception: (
    <>
      <ellipse cx="12" cy="10" rx="6.8" ry="2.8" />
      <ellipse cx="12" cy="10" rx="3.8" ry="1.5" />
      <path d="M3.5 13.5C6.5 19 17.5 19 20.5 13.5" />
    </>
  ),
  // A slender tower on a podium, floors ticked.
  saria: (
    <>
      <path d="M4 20.5V16h16v4.5z" />
      <path d="M10 16V3.5h4V16" />
      <path d="M10 7h4M10 10.5h4" />
    </>
  ),
  // The salt-pond grid, on the shore it works. Unequal cells, because a window
  // is even and a salt pan is not.
  'lau-anfeh': (
    <>
      <path d="M6.5 3.5C4.2 7.5 6.2 11 5.2 14.5 4.5 17 3.6 18.7 3.6 20.5" />
      <rect x="9.5" y="4.5" width="11" height="13.5" />
      <path d="M14.5 4.5V18M9.5 8.5h11M9.5 14h11" />
    </>
  ),
}

export default function ProjectGlyph({ slug, className }) {
  const marks = GLYPHS[slug]
  if (!marks) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {marks}
    </svg>
  )
}
