/*
 * One drawn mark per project, for the /work index cards.
 *
 * Each mark draws the project's idea, not its object: the rule, the flow, the
 * transformation the project is about. All twenty share one grammar, and the
 * grammar is the point:
 *
 *   A 24-unit square, stroke 1.5, round caps and joins.
 *   Ink (currentColor) draws the thing. The idea is ONE element drawn in
 *   var(--idea): the coupling, the wave, the air, the chosen path. The card
 *   passes the belt colour in, so the idea carries its colour at rest; the
 *   index strip passes nothing, so there the mark stays one colour and the
 *   colour is left to say which tiles are on screen.
 *   Dashed is a rule, a candidate or what is not there yet. Dotted is what is
 *   diffuse: dirty air, soft light, regolith, a trail.
 *   Small filled nodes are allowed; they hold up at 20px where rings do not.
 *
 * The marks are static JSX with no interpolation, which is what lets
 * portfolio-pdf.mjs lift them into plain SVG. Each entry keeps the multi-line
 * `'slug': (` … `),` shape that script's parser expects.
 */

const GLYPHS = {
  // The persona's six senses as arcs on a ring, their couplings as chords
  // through it, the way Sensi's own diagram draws them; the strongest in colour.
  sensi: (
    <>
      <path d="M8.28 4.02A8.8 8.8 0 0 1 15.72 4.02M18 5.56A8.8 8.8 0 0 1 20.57 10.02M20.71 13.22A8.8 8.8 0 0 1 17.42 18.93M14.13 20.54A8.8 8.8 0 0 1 9.87 20.54M6.46 18.84A8.8 8.8 0 0 1 3.31 13.38M3.46 9.87A8.8 8.8 0 0 1 5.89 5.67" />
      <path d="M12 4.9C12 9.87 13.84 13.06 18.15 15.55M5.85 8.45C10.16 10.93 13.84 13.06 18.15 15.55" />
      <path d="M12 4.9C12 9.87 10.16 13.07 5.85 15.55" stroke="var(--idea)" />
    </>
  ),
  // The graph with its most central path lit: the corridor found as the spine.
  narkomfin: (
    <>
      <path d="M4.5 12 8 5.5 12 12l4 6.5 3.5-6.5M4.5 12 8 18.5M19.5 12 16 5.5" />
      <circle cx="8" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="5.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M4.5 12h15" stroke="var(--idea)" />
      <circle cx="4.5" cy="12" r="1.6" fill="var(--idea)" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="var(--idea)" stroke="none" />
      <circle cx="19.5" cy="12" r="1.6" fill="var(--idea)" stroke="none" />
    </>
  ),
  // The city as blocks, and one street segment between them classified: the
  // model reads the spaces, not the buildings. Irregular blocks, so it reads
  // as a map rather than a grid icon.
  'urban-risk': (
    <>
      <path d="M3.5 3.5h6v6.5h-6zM13 3.5h7.5v5L16.5 11H13zM3.5 13.5l6-1v8h-6zM13 14.5h7.5v6H13z" />
      <path d="M11.25 12.5v8" stroke="var(--idea)" />
    </>
  ),
  // The generated form as a free curve, and the bricks that prove it stands:
  // the curve quantised into steps.
  legoarch: (
    <>
      <path d="M3.5 19.5V15.5h3V12h3V9.5h5V12h3v3.5h3v4Z" />
      <path d="M3.5 17C4.5 9.2 8 5.2 12 5.2S19.5 9.2 20.5 17" stroke="var(--idea)" />
    </>
  ),
  // Air taken in dotted, drawn up the core, let out solid: the tower as a lung.
  'breathing-mass': (
    <>
      <path d="M8 3.5v12M16 8.5v12" />
      <path d="M3.5 18h5" stroke="var(--idea)" strokeDasharray="0 3" />
      <path d="M8.5 18c2.5 0 3.5-1.5 3.5-4V9.5C12 7 13 6 15.5 6h5M18.5 4l2 2-2 2" stroke="var(--idea)" />
    </>
  ),
  // One script at the root, deciding the towers, deciding every panel under
  // them. The tree of the name, drawn as the diagram it is.
  'family-tree': (
    <>
      <circle cx="12" cy="4.5" r="1.7" fill="var(--idea)" stroke="none" />
      <path d="M12 6.2V9M5.5 12.5V9h13v3.5M12 9v3.5" stroke="var(--idea)" />
      <path d="M4 12.5h3v3H4zM10.5 12.5h3v3h-3zM17 12.5h3v3h-3z" />
      <path d="M4.3 19.5h.1M7.2 19.5h.1M10.8 19.5h.1M13.4 19.5h.1M17.3 19.5h.1M19.9 19.5h.1" />
    </>
  ),
  // Design and budget on one beam, held level as the facade is drawn.
  facadeiq: (
    <>
      <path d="M3.5 13h17M12 13l-2.6 6h5.2z" />
      <path d="M4.5 13V6.5h6V13M4.5 9.75h6" />
      <circle cx="16.5" cy="10.1" r="2.9" fill="var(--idea)" stroke="none" />
    </>
  ),
  // Every push on the line leaves a row in the sheet.
  'paper-trail': (
    <>
      <path d="M3.5 5.5h17" stroke="var(--idea)" />
      <circle cx="6" cy="5.5" r="1.5" fill="var(--idea)" stroke="none" />
      <circle cx="12" cy="5.5" r="1.5" fill="var(--idea)" stroke="none" />
      <circle cx="18" cy="5.5" r="1.5" fill="var(--idea)" stroke="none" />
      <path d="M6 8.5v2M12 8.5v2M18 8.5v2" strokeDasharray="0 3" />
      <path d="M3.5 12h17v8.5h-17zM3.5 16.25h17" />
    </>
  ),
  // Modules packed close, and the wind parting around them.
  huddle: (
    <>
      <path d="M10.5 9h3.4v3.4h-3.4zM13.9 9h3.4v3.4h-3.4zM12.2 12.4h3.4v3.4h-3.4zM15.6 12.4H19v3.4h-3.4z" />
      <path d="M3.5 9.5C6.5 9.5 7.5 5.5 12 5.5h5.5a1.6 1.6 0 1 0-1.6-1.6" stroke="var(--idea)" />
      <path d="M3.5 14c3 0 4.5 5 9.5 5h4.5a1.6 1.6 0 1 1-1.6 1.6" stroke="var(--idea)" />
    </>
  ),
  // The surface as a curve, and the lattice it becomes, hung beneath it.
  'clebsch-pavilion': (
    <>
      <path d="M3.5 8C8.5 3.5 15.5 12.5 20.5 7" stroke="var(--idea)" />
      <path d="M3.5 14.5C8.5 10 15.5 19 20.5 13.5" />
      <path d="M3.5 8 6.15 13.25 9.02 6.96 12 14.38 14.98 8.7 17.85 15.17 20.5 7" />
    </>
  ),
  // Light let down through sediment: the strata narrowing as they settle.
  'luminous-stratum': (
    <>
      <path d="M3.5 9h17M6 13h12M8.5 17h7" />
      <path d="M12 3.5v17" stroke="var(--idea)" strokeDasharray="0 3" />
    </>
  ),
  // The block as it was (dashed) and as the sun turned it.
  tsukiji: (
    <>
      <path d="M6 10.5h13v7H6z" strokeDasharray="1.4 2.4" />
      <path d="M5.16 13.19 17.22 8.32 19.84 14.81 7.78 19.68Z" />
      <circle cx="5" cy="4.8" r="2" fill="var(--idea)" stroke="none" />
    </>
  ),
  // A sharp figure, and the same figure inflated: the relaxation the project runs.
  'puffer-playscape': (
    <>
      <path d="M12 8.3 15.99 11.2 14.47 15.9H9.53L8.01 11.2Z" strokeDasharray="1.4 2.4" />
      <path d="M12 4.1Q16.99 5.63 19.99 9.9Q20.08 15.13 16.94 19.3Q12 21 7.06 19.3Q3.92 15.13 4.01 9.9Q7.01 5.63 12 4.1Z" stroke="var(--idea)" />
    </>
  ),
  // The chair is the wave: the surface in colour, only the legs in ink.
  'wave-chair': (
    <>
      <path d="M6 13.5V20.5M15.5 13.5V20.5" />
      <path d="M17 3.5c-.8 3.2-1.5 6.5-1.5 10-1.6-1.4-3.2-1.4-4.8 0s-3.2 1.4-4.7 0" stroke="var(--idea)" />
    </>
  ),
  // A surface that passes through the house and through itself.
  'cross-cap-house': (
    <>
      <path d="M5 20.5V11l7-6 7 6v9.5Z" />
      <path d="M2.5 16c3.5 0 5-4 9-4 5 0 5 5 1 5-3.5 0-4-5 0-5 4 0 5.5 4 9 4" stroke="var(--idea)" />
    </>
  ),
  // One closed loop, farming, transport and living on it, set into the crater
  // whose regolith it is printed from.
  'rings-of-mars': (
    <>
      <ellipse cx="12" cy="9.5" rx="8.5" ry="3.8" stroke="var(--idea)" />
      <path d="M17.2 4.8 19.6 6.4 17.4 7.9" stroke="var(--idea)" />
      <circle cx="4.1" cy="11.1" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.3" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19.6" cy="11.4" r="1.3" fill="currentColor" stroke="none" />
      <path d="M3 14.5C5 21 19 21 21 14.5" strokeDasharray="0 3" />
    </>
  ),
  // Fins hung from a wave, lifted clear of the ground they hid.
  'tideline': (
    <>
      <path d="M4.5 8.63V15.5M7.5 10.81V15.5M10.5 10.66V15.5M13.5 8.33V15.5M16.5 6.41V15.5M19.5 7.03V15.5" />
      <path d="M3.5 6.57C4.92 7.72 6.33 9.22 7.75 9.71 9.17 10.2 10.58 9.59 12 8.43 13.42 7.28 14.83 5.78 16.25 5.29 17.67 4.8 19.08 5.41 20.5 6.57" stroke="var(--idea)" />
      <path d="M3.5 20h17" strokeDasharray="0 3" />
    </>
  ),
  // The master panel: a square with a slot cut into each side, the joint that
  // lets two of them lock without glue or screws. The one mark kept as the
  // object, by choice.
  'codependent': (
    <>
      <path d="M4 4H11.2V8.5H12.8V4H20V11.2H15.5V12.8H20V20H12.8V15.5H11.2V20H4V12.8H8.5V11.2H4Z" />
    </>
  ),
  // A tower on the water, and its reflection breaking up below the line.
  saria: (
    <>
      <path d="M9 13V3.5h6V13M9 7h6M9 10h6" />
      <path d="M3.5 13h17" />
      <path d="M9 15.5h6M9.8 18h4.4M10.8 20.5h2.4" stroke="var(--idea)" />
    </>
  ),
  // Point nought on the shore, and the three threads out of it: salt, fish, olive.
  'point-nought': (
    <>
      <path d="M3.5 18.5C8 18.5 9 14 12 14s4 4.5 8.5 4.5" />
      <path d="M12 14 6 6.5M12 14V4.5M12 14l6-7.5" strokeDasharray="0 3" />
      <circle cx="12" cy="14" r="1.8" fill="var(--idea)" stroke="none" />
      <rect x="4.2" y="4.6" width="2.6" height="2.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
      <path d="M18.3 3.8l1.7 3h-3.4z" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function ProjectGlyph({ slug, idea = 'currentColor', className }) {
  const marks = GLYPHS[slug]
  if (!marks) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ '--idea': idea }}
    >
      {marks}
    </svg>
  )
}
