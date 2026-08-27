import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContactMarks } from '../components/Footer.jsx'
import { CC, crossCap, makeProjector } from '../lib/crosscap.js'
import { byId, LAND_ROWS, latToY, lonToX, places, VIEWBOX } from '../data/places.js'
import { NOW, START, TIMELINE, TOUCHES } from '../data/journey.js'

const base = import.meta.env.BASE_URL

// One small uppercase size carries every label on this page. 0.6875rem, the
// site's floor for anything informational: at 0.56rem this was 8.96px, and it
// sets the survey's place names, the rail's years and everything in the place
// card, which is most of the reading on the page. Nothing collides at the new
// size — the place names are hidden on the far side of the surface rather than
// all painted at once, and the five year ticks sit a quarter of the rail apart,
// which is twice the width of the widest of them.
const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em] font-normal'

const CLOSE_DELAY = 160

/*
 * The About page.
 *
 * The world was a map here, and now it is the object the rest of the site is
 * made of. The same cross-cap that carries the cover and the printed portfolio
 * (src/lib/crosscap.js — its equations, unchanged) is the biography: the fifteen
 * places are survey stations on it, and the years are the sweep of its u rows.
 * A map could show where; only this can show where and when in one gesture, and
 * it costs the page nothing it did not already own.
 *
 * The page arrives in three beats.
 *
 * One, the map. The world this page used to be comes first and comes whole: the
 * land raster from places.js drawn as dots in its own colour, the fifteen places
 * marked at their real longitudes and latitudes, Lebanon in red. It is held
 * still for half a second, which is the whole argument — the cap has to be
 * earned off something the visitor already accepts as the world, not asserted as
 * one in the first frame.
 *
 * Two, the fold. The map is a plane in the same three dimensions the surface
 * lives in, so it does not dissolve into the cap, it closes into it: every land
 * dot is married to a station and travels there, every place mark leaves its
 * coordinate for the station that is its year, and the eye tips from nearly
 * overhead round to the room's own three-quarter view while it happens. There
 * are 2,415 land dots against 5,152 stations, so the land is spread across the
 * cloud by index and the stations nothing claimed fade in over the last third:
 * what settles is the whole survey and not a thinned copy of the coastline.
 *
 * Three, the room. Once settled the surface is an object you turn: drag rotates
 * it, it resumes its own slow turn when left alone, and the far side is dim
 * until you bring it round. The rail is the clock, and it is the clock for the
 * surface too — the survey only exists up to the year you have wound to, so
 * winding back is watching the thing be un-built.
 *
 * And for anyone who has asked not to be moved, none of the first two: no map,
 * no fold, the cap already drawn, already at the present, and not turning on its
 * own.
 */

// Where the chronology lives on the surface. A year picks a u row and a fixed
// per-place index picks the point along it, so places from the same year sit
// apart on the same ring rather than on top of each other. Rows 0 and U-1
// degenerate to the axis — every point on them collapses to the same spot — so
// the clock runs over rows 2..U-3 and nothing is ever pinned to the pole.
const Y0 = 2017
const Y1 = NOW
const rowFor = (y) => 2 + Math.min(1, Math.max(0, (y - Y0) / (Y1 - Y0))) * (CC.U - 5)

/*
 * The v index each place takes on its row. Hand-picked rather than derived: the
 * surface is not evenly spaced in screen terms, and a formula put three of the
 * 2025 places into the same pinch. These are the values the concept study
 * settled on, and they are as much a part of the drawing as the coordinates in
 * places.js were.
 */
const V_INDEX = {
  turkiye: 12, jordan: 30, lebanon: 18, valencia: 24, italy: 34,
  uae: 15, usa: 27, 'new-york': 21, pennsylvania: 32, kuwait: 13,
  spain: 25, france: 19, saudi: 29, georgia: 16, netherlands: 22,
}

/*
 * One line. The posts used to be dealt into four lanes so that overlapping ones
 * could not paint over each other, which was true to the record and made four
 * stacked rails out of what a reader takes in as a single span of time. They
 * share the line now, and the overlaps read as the denser colour they are.
 *
 * Longest first, so the short posts land on top of the long ones rather than
 * under them: a term inside a degree is the thing you would want to point at,
 * and painting it last is what keeps it reachable.
 */
const LANES = [...TIMELINE].sort((a, b) => b.to - b.from - (a.to - a.from))
const LANE_H = 3
const YEAR_TICKS = [2018, 2020, 2022, 2024, 2026]

/*
 * The year a place is first reached. Three degrees, not the wide radius a
 * region reveal would use: at anything larger a single 2018 touch in Lebanon
 * also matches Türkiye, Georgia and Saudi Arabia, and every country he has
 * visited appears before he has been anywhere.
 */
const PLACE_R = 3
const PLACE_YEAR = Object.fromEntries(
  places.map((p) => {
    // A place that states its year is taken at its word. The search below is
    // the fallback, and it is why two dots used to be missing: see places.js.
    if (p.year) return [p.id, p.year]
    let best = Infinity
    for (const t of TOUCHES) {
      if (Math.hypot(lonToX(p.lon) - lonToX(t.lon), latToY(p.lat) - latToY(t.lat)) < PLACE_R && t.yr < best) {
        best = t.yr
      }
    }
    return [p.id, best]
  }),
)

// Placed at their own years. A flex row with justify-between spaces labels
// evenly, which has nothing to do with time: 2026 landed at 99% of the rail
// while the year itself is at 93%.
const tx = (y) => ((y - START) / (NOW - START)) * 100

/*
 * The cloud, once, at module scope: the equations are pure and the result never
 * changes, so there is no reason for a mount to pay for 5,152 points again.
 * Points are pushed row-major (see crosscap.js), which is what lets a station be
 * addressed by its (row, v) pair below without recomputing the surface.
 */
const CLOUD = crossCap()
const stationAt = (i, j) => CLOUD[i * CC.V + j]

// Each place, resolved to the station it is pinned to.
const STATIONS = Object.fromEntries(
  places.map((p) => {
    const i = Math.round(rowFor(PLACE_YEAR[p.id]))
    const j = V_INDEX[p.id] ?? 24
    return [p.id, { i, j, pt: stationAt(i, j) }]
  }),
)

/*
 * The same surface, re-solved.
 *
 * The caption under the drawing is not a legend any more: two of its numbers
 * are the instrument, and turning one has to move the cloud. crosscap.js is
 * hashed by the print guard and cannot grow a parameter, so its equations are
 * written out once more here, on purpose, and this copy has to stay in step
 * with that one. CC is still the authority for a, b and c, and for the board
 * values the coefficients come home to.
 *
 *   x = d·a·sin u·sin(e·v)   y = a·sin(e·u)·sin²v   z = a·cos(e·u)·sin²v
 *
 * Everything that does not depend on d or e is worked out once, here. LIVE is
 * the only buffer a scrub ever writes into: a tick re-solves 5,152 points in
 * place rather than building a second cloud sixty times a second.
 */
const U_ANG = new Float64Array(CC.U)
const U_SIN = new Float64Array(CC.U)
const V_ANG = new Float64Array(CC.V)
const V_SIN2 = new Float64Array(CC.V)
for (let i = 0; i < CC.U; i++) {
  U_ANG[i] = (i / (CC.U - 1)) * CC.b * Math.PI
  U_SIN[i] = Math.sin(U_ANG[i])
}
for (let j = 0; j < CC.V; j++) {
  V_ANG[j] = (j / (CC.V - 1)) * CC.c * Math.PI
  V_SIN2[j] = Math.sin(V_ANG[j]) ** 2
}
const LIVE = CLOUD.map((p) => ({ row: p.row, id: p.id, x: p.x, y: p.y, z: p.z }))
const SIN_EV = new Float64Array(CC.V)
function resolve(d, e) {
  for (let j = 0; j < CC.V; j++) SIN_EV[j] = Math.sin(e * V_ANG[j])
  for (let i = 0; i < CC.U; i++) {
    const dxa = d * CC.a * U_SIN[i]
    const sue = CC.a * Math.sin(e * U_ANG[i])
    const cue = CC.a * Math.cos(e * U_ANG[i])
    const base = i * CC.V
    for (let j = 0; j < CC.V; j++) {
      const p = LIVE[base + j]
      const s2 = V_SIN2[j]
      p.x = dxa * SIN_EV[j]
      p.y = sue * s2
      p.z = cue * s2
    }
  }
}

/*
 * The two handles, and what they are allowed to be. d opens and closes the
 * cap's width; e is the one that changes the family outright — at 1 the thing
 * is barely folded, at 4 it is wound through itself twice. The step is what an
 * arrow key moves, and 150 pixels of drag is the whole range, which is a
 * thumb's travel on a phone and a small wrist movement on a trackpad.
 */
const COEFS = {
  d: { min: 0.1, max: 1, step: 0.05, home: CC.d, glyph: '½', label: "coefficient d, the cap's width" },
  e: { min: 1, max: 4, step: 0.1, home: CC.e, glyph: '2', label: 'coefficient e, the surface family' },
}
const COEF_SPAN = 150
// The way home, and how fast the biography follows it. The return is long
// enough to read as the surface being let go of rather than snapping.
const COEF_HOME = 400
const BIO_TAU = 90

/* ---- the tour ---- */
// Nine seconds for eight and a half years. Places that share a year would
// otherwise want the same instant, so each is guaranteed this much of the tour
// to itself before the next one is due: the clock still runs straight, only the
// turning is dealt out.
const TOUR_MS = 9000
const TOUR_GAP = 0.05
// And the opening is given more than a gap of its own, because the first turn
// is the only one that starts from wherever the visitor happened to leave the
// object and can be half a revolution long.
const TOUR_LEAD = 0.09

// The yaw that brings a station round to face the eye. depth is
// (x·sinY + y·cosY)·sinP + z·cosP, so the pitch's sign decides which of the two
// solutions is the near one; the same angle also puts px at exactly zero, which
// is why a place arrives on the centre line rather than merely on this side.
const facingYaw = (pt, pitchDeg) => {
  const s = Math.sin((pitchDeg * Math.PI) / 180) >= 0 ? 1 : -1
  return (Math.atan2(s * pt.x, s * pt.y) * 180) / Math.PI
}
// The same angle, expressed as the shortest way there from where the eye is.
// Without this a station at 179° and the next at -179° would spin the whole
// object the long way round for two degrees of difference.
const nearAngle = (from, to) => from + ((((to - from) % 360) + 540) % 360) - 180

/* ---- the labels ---- */
// Who keeps their name when two collide. Lebanon is the present and never
// yields; after that the earlier year has precedence, because the survey is
// read outward from where it started.
const LABEL_ORDER = places
  .map((_, n) => n)
  .sort((a, b) => {
    if (places[a].kind === 'now') return -1
    if (places[b].kind === 'now') return 1
    return PLACE_YEAR[places[a].id] - PLACE_YEAR[places[b].id]
  })
// A little air around each rect, and a few frames of agreement before a label
// is allowed to change its mind. Together they are what stops a name blinking
// while the surface turns through the exact angle where two of them touch.
const LABEL_MX = 6
const LABEL_MY = 3
const LABEL_HOLD = 5

const pinSize = (p) => (p.kind === 'now' ? 9 : p.kind === 'lived' ? 7 : 5)

/* ---- the arrival ---- */
// The map is held before it moves, or it is a texture the fold happens to start
// from rather than the world it has to be recognised as. Half a second is about
// what a glance costs, and the crossing takes the rest of the envelope.
const HOLD = 500
const FOLD = 1700
const ARRIVAL = HOLD + FOLD
// The grain's own pitch, in CSS pixels. It is the page's paper and nothing more
// now: the map is the figure drawn on it, not a replacement for it.
const GRAIN = 15

/*
 * The map's plane, in the surface's own units: x runs east, z runs north, y is
 * nothing at all. Half a unit to the degree, so the world is 180 across against
 * the cap's 135 and the fold is a large thing closing into a smaller one. The
 * frame is the crop places.js already draws in, so the plane is centred on the
 * middle of that crop rather than on the equator.
 */
const MAP_SCALE = 0.5
const MAP_W = VIEWBOX.w * MAP_SCALE
const MAP_H = VIEWBOX.h * MAP_SCALE
const MAP_MID = VIEWBOX.y + VIEWBOX.h / 2
const flat3 = (mx, my) => ({ x: (mx - 180) * MAP_SCALE, y: 0, z: (MAP_MID - my) * MAP_SCALE })

// The eye the map is read from, and the one the room rests at. Nearly flat
// rather than exactly flat: a plane seen from straight overhead has no depth to
// lose, so the first degrees of the fold would read as a slide and not a turn.
const MAP_YAW = -6
const MAP_PITCH = -78
// The flat map's one ink. A plane has no front and no back, so nothing on it is
// shaded and every land dot is drawn at the same weight.
const MAP_ALPHA = 0.8

/*
 * How far up the sweep the fold is allowed to deliver. The last rows are the
 * present's own frontier, feathered, and past them the two that degenerate to
 * the axis; a dot sent to any of those would arrive dim or arrive nowhere. So
 * the land stops at the last fully drawn row and the tail is left to the fill.
 */
const FOLD_LAST = (Math.floor(rowFor(NOW)) - 2) * CC.V - 1

/*
 * The map, married to the surface, once. Neither end of a dot's journey depends
 * on the size of the canvas — both are in the surface's own units — so the
 * pairing is module work and a mount, or a phone turning on its side, costs
 * nothing but the projection.
 *
 * The raster is walked north to south and west to east; the cloud is walked
 * row-major up its u sweep. Spreading 2,415 land dots across the stations by
 * index therefore keeps neighbours as neighbours, which is why the map closes
 * rather than shatters. FOLD_FROM is indexed by station so the drawing loop can
 * ask a point where it came from without a second pass; a station no dot
 * claimed simply holds null and waits for the fill.
 */
const FOLD_FROM = new Array(CLOUD.length).fill(null)
{
  const land = []
  for (let r = 0; r < LAND_ROWS.length; r++) {
    const row = LAND_ROWS[r]
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '1') land.push(flat3(c * 2.5, VIEWBOX.y + r * 2.5))
    }
  }
  const last = land.length - 1
  for (let k = 0; k <= last; k++) FOLD_FROM[Math.round((k / last) * FOLD_LAST)] = land[k]
}

// The fifteen, at their real coordinates on that same plane. Same order as
// `places`, so a mark's start and its station share one index the whole way.
const PLACE_FROM = places.map((p) => flat3(lonToX(p.lon), latToY(p.lat)))

/*
 * The frame a phone on its side is read in, and the one case that needs its own.
 *
 * Below lg and wider than it is tall there is no room under the writing for
 * anything, so the writing moves beside the cap instead of above it: it takes
 * the left half from under the island down, and the cap takes the right. Fitted
 * to what was left over after the writing's band the cap came out a 140px
 * thumbnail squeezed high against the middle of the stage; framed like this it
 * stands the whole way from under the island down to the rail's own lanes.
 *
 * top is the island's clearance. foot is the whole reserve at the bottom rather
 * than an addition to the rail's block, because here the caption is beside the
 * cap and not under it: what the cap has to clear is the rail's own lanes and
 * ticks, and it may stand the full height above them. ax places the cap's
 * centre across the stage, in the half the writing does not use.
 */
const CC_LAND_VIEW = { top: 62, foot: 56, ax: 0.76 }
// The same query the landscape classes below are written against, asked once
// per size rather than inferred from the box: the stage is the viewport less
// the footer, so its own shape can disagree with the page's by a few pixels
// and the framing and the layout have to change on exactly the same beat.
const LAND_Q = '(max-width: 1023.98px) and (orientation: landscape)'

// The eye. Roughly the cover's three-quarter view, far enough round that the
// cap's self-intersection reads as a fold rather than as a silhouette.
const YAW0 = -34
const PITCH0 = -58
// Where the tilt stops being free. Past either of these the surface goes heavy
// rather than hitting a wall: the drag meets a resistance that eases it to
// nothing over PITCH_GIVE further degrees, so the end of the travel is felt
// instead of collided with. A pitch much beyond the give is looking at the
// surface edge-on from inside it, which is why the give is short.
const PITCH_SOFT_MIN = -100
const PITCH_SOFT_MAX = 15
const PITCH_GIVE = 10
// Sensitivity, stated as what a drag across the whole stage does rather than as
// degrees per pixel: one turn of the cap for the width, and about 200 degrees of
// tilt for the height, which is more than the tilt has room for and so puts the
// whole range inside a single stroke on any screen.
const TURN_PER_STAGE = 360
const TILT_PER_STAGE = 200
// The throw. Whatever velocity the pointer had when it lifted carries on and
// decays exponentially with this time constant, which leaves under a fiftieth of
// it after a second. Capped, because a flick across a phone is fast enough to
// spend three revolutions otherwise. A pointer that came to rest before it
// lifted throws nothing at all, so a careful adjustment stays where it was put;
// STILL is how long a pause counts as coming to rest.
const SPIN_TAU = 260
const SPIN_MAX = 1.2
const STILL = 80
// Left alone this long, and no longer coasting, the object takes up its own turn
// again.
const IDLE = 3000

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => t * t * (3 - 2 * t)

// Tilt, with the soft ends. Resistance starts at the limit and eases the
// movement to nothing PITCH_GIVE degrees past it. Nothing is clamped, so the
// surface is never stopped dead under a finger that is still moving — it just
// stops answering, which is what a heavy thing at the end of its travel does.
const tilt = (p, dp) => {
  const over = dp > 0 ? p - PITCH_SOFT_MAX : PITCH_SOFT_MIN - p
  return p + dp * (over <= 0 ? 1 : Math.max(0, 1 - over / PITCH_GIVE))
}

// The tokens are six-digit hex in both themes, which is what lets an alpha be
// mixed in here rather than being carried as a second token per level.
function hexA(hex, a) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Two tokens, blended. The land's colour has to give way to the surface's over
// the fold, and doing that once a frame here rather than once a dot is what
// keeps the crossing to the same seven fill styles as the room it lands in.
function mixHex(a, b, t) {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return b
  const na = parseInt(a.slice(1), 16)
  const nb = parseInt(b.slice(1), 16)
  const r = Math.round(lerp((na >> 16) & 255, (nb >> 16) & 255, t))
  const g = Math.round(lerp((na >> 8) & 255, (nb >> 8) & 255, t))
  const bl = Math.round(lerp(na & 255, nb & 255, t))
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

export default function About() {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const cardRef = useRef(null)
  const pinRefs = useRef({})
  const closeTimer = useRef(null)

  const [box, setBox] = useState({ w: 0, h: 0 })
  const [activeId, setActiveId] = useState(null)
  const pinnedRef = useRef(false)
  const active = activeId ? byId[activeId] : null

  /*
   * The timeline is the clock, and it is the only thing on this page that
   * scrolls. The page itself does not: it was 300svh with the drawing sticky
   * inside it, which pushed the footer three screens down and made reading the
   * page and winding the clock the same gesture whether you wanted it or not.
   *
   * It opens at the present, complete, and you wind back. Opening at 2018 meant
   * arriving at an almost empty screen, which is a poor first impression of a
   * drawing whose whole point is how much there is by the end.
   *
   * The canvas reads the year from a ref so a scrub never re-renders it; the
   * rail is React and takes a rounded copy.
   */
  const yearRef = useRef(NOW)
  const [year, setYear] = useState(NOW)
  const railRef = useRef(null)

  const [focusLabel, setFocusLabel] = useState(null)

  /*
   * Whether the arrival is over, which is the one thing outside the canvas that
   * needs to know. The caption under the stage is the page saying the drawing is
   * computed rather than drawn, and it cannot say that over a world map — so it
   * waits out the fold and then comes up on the fold's own ease. Reduced motion
   * has no fold to wait for, and the caption is simply there from the first
   * frame.
   */
  const [reduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [settled, setSettled] = useState(reduceMotion)
  useEffect(() => {
    if (settled) return
    const t = setTimeout(() => setSettled(true), ARRIVAL)
    return () => clearTimeout(t)
  }, [settled])

  // When the visitor got here, kept out of the drawing effect on purpose. That
  // effect re-runs on every resize — a phone rotating, the island settling — and
  // if the clock lived inside it the map would unfold itself again each time.
  const arrivedAt = useRef(0)

  // The eye, the pointing and the open card, all read by the loop sixty times a
  // second and none of them worth a render.
  const view = useRef({ yaw: YAW0, pitch: PITCH0 })
  const hoverRef = useRef(null)
  const activeRef = useRef(null)
  activeRef.current = activeId

  const setClock = useCallback((y) => {
    const clamped = Math.min(NOW, Math.max(START, y))
    yearRef.current = clamped
    setYear(Math.round(clamped * 50) / 50)
  }, [])

  /*
   * The instrument. The two coefficients live in a ref because the loop reads
   * them every frame and the caption writes itself by hand: putting a scrubbed
   * number through state would re-render fifteen marks, four bars and five year
   * ticks sixty times a second to change two glyphs.
   *
   * `bio` is how much of the biography is on view. It is one for the board's
   * own surface and eases to nothing the moment a coefficient leaves it, which
   * is the page saying that the places are true of this shape and no other.
   */
  const coefRef = useRef({ d: CC.d, e: CC.e, drag: null, ret: null, ad: 0, ae: 0 })
  const coefEls = useRef({ d: null, e: null })
  const mirrorEls = useRef([])
  const bioRef = useRef(1)

  // The caption, written rather than rendered. A coefficient shows its printed
  // form while it is at the board value and its decimal reading while it is
  // not, and the two `2`s in the y and z clauses follow the one that is being
  // held: they are the same e, and a formula that disagreed with itself in the
  // middle of a drag would be a worse lie than a static caption ever was.
  const paintCoef = useCallback((key) => {
    const c = COEFS[key]
    const v = coefRef.current[key]
    const home = Math.abs(v - c.home) < 1e-4
    const text = home ? c.glyph : v.toFixed(2)
    const el = coefEls.current[key]
    if (el) {
      el.textContent = text
      el.setAttribute('aria-valuenow', home ? String(c.home) : v.toFixed(2))
      el.setAttribute('aria-valuetext', `${key} = ${v.toFixed(2)}`)
    }
    if (key === 'e') for (const m of mirrorEls.current) if (m) m.textContent = text
  }, [])

  useLayoutEffect(() => {
    paintCoef('d')
    paintCoef('e')
  }, [paintCoef])

  /*
   * The tour. `lit` is the keyframe the wind has reached, kept in the ref so
   * the loop only tells React about it when it actually changes; `touring` and
   * `tourAt` are the two things outside the canvas that need to know — the
   * button's own state, and the name a phone has to be told because there are
   * no names painted beside its marks.
   */
  const tourRef = useRef({ on: false, t0: 0, yaw0: 0, keys: null, lit: -2 })
  const [touring, setTouring] = useState(false)
  const [tourAt, setTourAt] = useState(null)

  const stopTour = useCallback(() => {
    if (!tourRef.current.on) return
    tourRef.current.on = false
    setTouring(false)
    setTourAt(null)
  }, [])

  /*
   * Pressing play builds the whole itinerary first, from where the eye happens
   * to be standing: each place resolved to the yaw that brings it round, and
   * each of those expressed as the shortest way there from the one before, so
   * the turn between two stations is a turn rather than a jump. Places sharing
   * a year are dealt TOUR_GAP of the tour each — the clock still runs straight
   * from 2018, but four places lighting in 2025 get four separate moments.
   */
  const playTour = useCallback(() => {
    const t = tourRef.current
    if (t.on) { stopTour(); return }
    const pitch = view.current.pitch
    const keys = []
    let prevT = TOUR_LEAD - TOUR_GAP
    let prevYaw = view.current.yaw
    for (const p of [...places].sort((a, b) => PLACE_YEAR[a.id] - PLACE_YEAR[b.id])) {
      const at = Math.max(prevT + TOUR_GAP, clamp01((PLACE_YEAR[p.id] - START) / (NOW - START)))
      if (at > 1) break
      const yaw = nearAngle(prevYaw, facingYaw(STATIONS[p.id].pt, pitch))
      keys.push({ t: at, yaw, name: p.name })
      prevT = at
      prevYaw = yaw
    }
    t.keys = keys
    t.yaw0 = view.current.yaw
    t.t0 = performance.now()
    t.lit = -2
    t.on = true
    setTouring(true)
    setTourAt(null)
    setClock(START)
  }, [setClock, stopTour])

  /*
   * Holding a coefficient. The drag is measured from where it was picked up
   * rather than accumulated per move, so a slow crawl and a quick sweep across
   * the same distance land on the same number. Letting go hands the value to
   * the loop, which eases it home; a reader who has asked not to be moved gets
   * it back at once instead.
   */
  const homeCoef = useCallback((key) => {
    const c = coefRef.current
    // Already there. Blur fires on every way out of the caption, and a return
    // from nowhere would run the loop's easing for 400ms to change nothing.
    if (Math.abs(c[key] - COEFS[key].home) < 1e-4) {
      if (c.ret?.key === key) c.ret = null
      return
    }
    if (reduceMotion) {
      c[key] = COEFS[key].home
      c.ret = null
      paintCoef(key)
      return
    }
    c.ret = { key, from: c[key], t0: performance.now() }
  }, [paintCoef, reduceMotion])

  // Taking one handle while the other is still on its way home. Only one
  // return is ever in flight, so the one being left behind is put back at once
  // rather than stranded off the board with nothing left to ease it.
  const takeOver = (key) => {
    const c = coefRef.current
    if (c.ret && c.ret.key !== key) {
      c[c.ret.key] = COEFS[c.ret.key].home
      paintCoef(c.ret.key)
    }
    c.ret = null
    return c
  }

  const coefDown = (key) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    stopTour()
    const c = takeOver(key)
    c.drag = { key, x: e.clientX, v: c[key] }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const coefMove = (e) => {
    const c = coefRef.current
    if (!c.drag) return
    const k = COEFS[c.drag.key]
    const span = k.max - k.min
    const at = (c.drag.v - k.min) / span + (e.clientX - c.drag.x) / COEF_SPAN
    c[c.drag.key] = k.min + clamp01(at) * span
    paintCoef(c.drag.key)
  }
  const coefUp = () => {
    const c = coefRef.current
    if (!c.drag) return
    const { key } = c.drag
    c.drag = null
    homeCoef(key)
  }
  const coefKey = (key) => (e) => {
    const k = COEFS[key]
    if (e.key === 'Home') { e.preventDefault(); homeCoef(key); return }
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? k.step
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -k.step
        : 0
    if (!step) return
    e.preventDefault()
    stopTour()
    const c = takeOver(key)
    c[key] = Math.min(k.max, Math.max(k.min, c[key] + step))
    paintCoef(key)
  }

  /*
   * Wheel on the page, drag on the rail. The wheel listener is registered
   * natively because preventDefault has to hold, and React's onWheel is passive:
   * without it the page behind would scroll on a trackpad even though there is
   * nowhere for it to go.
   */
  useEffect(() => {
    const el = railRef.current
    const stage = stageRef.current
    if (!el || !stage) return
    const span = NOW - START

    /*
     * The wheel is taken on the whole page, not just on the rail. The document
     * has nothing to scroll — the drawing is one screen and the footer sits
     * under it — so a scroll gesture would otherwise do nothing at all. Here it
     * winds the clock, which is the one thing on the page that has a length.
     * The other gesture, drag, belongs to the surface and turns it; the two
     * never meet because the rail sits above the canvas and takes its own.
     */
    const onWheel = (e) => {
      e.preventDefault()
      stopTour()
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      setClock(yearRef.current + (d / 400) * span)
    }
    const fromX = (clientX) => {
      const r = el.getBoundingClientRect()
      setClock(START + ((clientX - r.left) / r.width) * span)
    }
    let dragging = false
    // The play control lives in the rail's own hint line, so a press on it
    // would otherwise be read as a press on the rail and wind the year to
    // wherever the button happens to sit. React's stopPropagation cannot help
    // here: this listener is native and fires long before the root sees it.
    const onDown = (e) => {
      if (e.target.closest?.('[data-rail-skip]')) return
      stopTour()
      dragging = true
      el.setPointerCapture?.(e.pointerId)
      fromX(e.clientX)
    }
    const onMove = (e) => { if (dragging) fromX(e.clientX) }
    const onUp = () => { dragging = false }

    stage.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      stage.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [setClock, stopTour])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox((b) => (b.w === r.width && b.h === r.height ? b : { w: r.width, h: r.height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ---- turning the surface ---- */
  /*
   * On the canvas alone. The place marks and the rail sit above it and take
   * their own presses, which is what keeps clicking a station from also
   * spinning the thing you were trying to click.
   *
   * A turntable, which is the right model for a thing standing on a table:
   * across spins it about its own vertical axis, up and down moves the eye. What
   * is new is that letting go is not the end of the gesture. The velocity the
   * pointer had when it lifted carries on and spends itself, because a mass this
   * size stopping the instant a finger leaves it is the single clearest tell
   * that it is a picture rather than an object.
   */
  const dragRef = useRef({ on: false, x: 0, y: 0, t: 0, kx: 0, ky: 0, vy: 0, vp: 0, frame: 0, last: -Infinity })
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const d = dragRef.current
    const onDown = (e) => {
      // A hand on the object outranks the tour: whatever it was winding to,
      // the year stays where the press found it.
      stopTour()
      d.on = true
      d.x = e.clientX
      d.y = e.clientY
      d.t = performance.now()
      d.last = d.t
      // Measured per press rather than per frame: the sensitivity is a property
      // of the stage the gesture has to cross, and the stage cannot resize in
      // the middle of one.
      d.kx = TURN_PER_STAGE / Math.max(1, cv.clientWidth)
      d.ky = TILT_PER_STAGE / Math.max(1, cv.clientHeight)
      // A new grab takes the object off whatever the last one left it doing.
      d.vy = 0
      d.vp = 0
      // The card, put away. A press on the drawing already reaches the listener
      // that dismisses cards, but a drag is the one press that must not leave
      // one standing, and saying so here is what makes it certain. Closing is
      // the calmer of the two fixes: the alternative is a panel of text flying
      // across the stage for the length of the gesture, and the card is a thing
      // to read rather than a thing to watch move.
      if (activeRef.current) {
        pinnedRef.current = false
        setActiveId(null)
      }
      cv.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      if (!d.on) return
      const now = performance.now()
      const dt = Math.max(1, now - d.t)
      const dyaw = (e.clientX - d.x) * d.kx
      const dpitch = (e.clientY - d.y) * d.ky
      view.current.yaw += dyaw
      view.current.pitch = tilt(view.current.pitch, dpitch)
      // Smoothed rather than taken raw: one frame's delta on a trackpad is
      // mostly noise, and the throw should carry the gesture rather than the
      // twitch it happened to end on.
      d.vy = d.vy * 0.65 + (dyaw / dt) * 0.35
      d.vp = d.vp * 0.65 + (dpitch / dt) * 0.35
      d.x = e.clientX
      d.y = e.clientY
      d.t = now
      d.last = now
    }
    const onUp = () => {
      const now = performance.now()
      if (!d.on || now - d.t > STILL) {
        d.vy = 0
        d.vp = 0
      } else {
        d.vy = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, d.vy))
        d.vp = Math.max(-SPIN_MAX, Math.min(SPIN_MAX, d.vp))
      }
      d.on = false
      d.last = now
    }
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerup', onUp)
    cv.addEventListener('pointercancel', onUp)
    return () => {
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointercancel', onUp)
    }
  }, [stopTour])

  /* ---- the drawing ---- */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !box.w || !box.h) return

    const { w, h } = box
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = w * dpr
    cv.height = h * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    /*
     * The frame the surface is drawn into. The island is all that sits at the
     * top, so the drawing starts under it; the foot has to clear the rail and
     * leave the writing in the corner room to sit against. On a wide screen the
     * writing takes the left half, so the cap moves off centre to the right
     * rather than being painted over three paragraphs.
     *
     * A phone on its side is the third case and it is CC_LAND_VIEW's: there the
     * writing and the caption are beside the cap rather than under it, so the
     * foot is the rail's lanes alone and the cap is anchored in the half the
     * writing leaves it.
     */
    const land = window.matchMedia(LAND_Q).matches
    const top = land ? CC_LAND_VIEW.top : w < 768 ? 104 : 92
    // The foot: the rail's own block, then the room the writing needs. The phone
    // number carries the caption as well, since there the writing runs the full
    // width and the caption has to sit under it rather than beside it; on a wide
    // screen the writing keeps to the left half and the caption tucks into the
    // space it already leaves above the rail.
    const bottom = land ? CC_LAND_VIEW.foot : 70 + LANE_H + 26 + (w < 768 ? 208 : 74)
    const availH = Math.max(120, h - top - bottom)
    const availW = Math.max(120, w - 48)
    // 135 is the surface's own extent in its units, so this reads as "fill the
    // short side of the box".
    const s = (0.94 * Math.min(availW, availH)) / 135
    const cx = land ? w * CC_LAND_VIEW.ax : w < 1024 ? w / 2 : w * 0.62
    const cy = top + availH * 0.5

    /*
     * Where the map is read from. It is fitted to the width of the drawing area
     * and hung on the same vertical centre the cap rests at, so the fold is a
     * closing and never also a pan: between the two states only the width, the
     * scale and the eye change. On a phone that is a world about 300px across,
     * which is small but is unmistakably the world; the alternative is a large
     * field of dots that is nothing in particular.
     */
    const sMap = Math.min((0.94 * availW) / MAP_W, (0.94 * availH) / MAP_H)
    const cxMap = w / 2

    /*
     * The paper. A plain grid at the page's own pitch, laid down once per size
     * and painted under everything: it is the material the drawing sits on and
     * it takes no part in the fold. Held as a flat pair list rather than as
     * objects, because this is the one loop that runs its whole length in every
     * single frame.
     */
    const gpts = []
    for (let gy = GRAIN * 0.6; gy < h; gy += GRAIN) {
      for (let gx = GRAIN * 0.6; gx < w; gx += GRAIN) gpts.push(gx, gy)
    }
    const grain = Float32Array.from(gpts)

    // The fold's own fill styles, rewritten in place on the frames it runs and
    // never rebuilt, and the one scratch point every travelling dot borrows to
    // be projected from. Between them they are why the crossing allocates
    // nothing per frame that the room does not allocate anyway.
    const foldLevels = new Array(7)
    const MP = { x: 0, y: 0, z: 0 }

    /*
     * The palette is read when the theme changes, not every frame:
     * getComputedStyle forces style resolution, and sixty of those a second is
     * most of what a canvas this size can afford.
     */
    const readPal = () => {
      const st = getComputedStyle(document.documentElement)
      const g = (n) => st.getPropertyValue(n).trim()
      const ink = g('--color-ink') || '#16181d'
      const soft = g('--color-soft') || '#4e535c'
      const accent = g('--color-accent') || '#c9261b'
      return {
        ink,
        muted: g('--color-muted') || '#6a707b',
        // The map's own colour, and it is the map's alone: the moment the plane
        // starts to close, the land is on its way to being ink.
        land: g('--color-land') || '#a1a7b0',
        // Seven buckets of ink, so five thousand points cost seven fillStyle
        // strings a frame rather than five thousand. Depth picks the bucket.
        levels: Array.from({ length: 7 }, (_, k) => hexA(ink, 0.1 + 0.1 * k)),
        // What the fifteen are painted in while they are still travelling, and
        // it is exactly what the buttons below are painted in once they arrive.
        marks: places.map((p) => (p.kind === 'now' ? accent : p.kind === 'lived' ? ink : soft)),
      }
    }

    let pal = readPal()
    const mo = new MutationObserver(() => { pal = readPal() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => { pal = readPal() }
    scheme.addEventListener('change', onScheme)

    let visible = true
    const io = new IntersectionObserver((rows) => rows.forEach((r) => { visible = r.isIntersecting }), {
      rootMargin: '160px',
    })
    io.observe(cv)

    /*
     * The decluttering's working room, taken once per size rather than once per
     * frame. A name's box is measured from the element — the loop must never
     * ask the browser for a rect it has just moved, which is fifteen forced
     * reflows a frame — and then rebuilt arithmetically from the mark's own
     * screen position, since the label hangs off the mark at a fixed offset and
     * nothing about it changes but where it is.
     */
    const N = places.length
    const labelW = new Float32Array(N)
    const labelH = new Float32Array(N)
    const lx = new Float32Array(N)
    const ly = new Float32Array(N)
    // 0 hidden, 1 a candidate for its name, 2 pointed at and beyond argument.
    const lstate = new Uint8Array(N)
    const lwant = new Uint8Array(N)
    const lshown = new Uint8Array(N)
    const lrun = new Uint8Array(N)
    const kept = new Int32Array(N)
    const tagOf = (n) => pinRefs.current[places[n].id]?.firstElementChild?.nextElementSibling
    const measureLabels = () => {
      for (let n = 0; n < N; n++) {
        const tag = tagOf(n)
        labelW[n] = tag ? tag.offsetWidth : 0
        labelH[n] = tag ? tag.offsetHeight : 13
      }
    }
    measureLabels()
    // Again once the mono has actually arrived: measured against a fallback
    // face the names come out a few pixels wrong, which is exactly the size of
    // the margin the overlap test runs on.
    document.fonts?.ready?.then(measureLabels).catch(() => {})

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!arrivedAt.current) arrivedAt.current = performance.now()
    const t0 = arrivedAt.current
    let raf = 0
    // What the rail was last told. Writing an unchanged opacity every frame is
    // a style invalidation the page has no use for.
    let railA = -1

    /*
     * The frame, drawn on demand. Split out of the loop so it can also run once,
     * synchronously, the moment the canvas exists: requestAnimationFrame does
     * not fire in a hidden or throttled tab, and without a first paint the page
     * is a blank rectangle until the tab is looked at.
     */
    const draw = (now) => {
      /*
       * How far the fold has come, on the ease every dot crosses on. The beat
       * before it is the map being read, which is why the clock starts negative
       * and is clamped. Reduced motion never starts it at all: the cap is
       * simply already here, and there was never a map.
       */
      const ea = reduce ? 1 : smooth(clamp01((now - t0 - HOLD) / FOLD))
      const arriving = ea < 1
      // A plane has no depth to shade and no far side to dim, so both arrive
      // over the first half of the crossing rather than at the end of it.
      const shade = clamp01(ea / 0.55)

      /*
       * What the surface does when nothing is holding it. The throw first — the
       * release velocity spending itself, integrated properly so the travel does
       * not depend on how many frames the machine managed — and only once that
       * is gone, and the stage has been quiet for IDLE besides, does the object
       * take its own slow turn up again. A card being read still counts as
       * something going on: the marks are anchors for it, and a card that slid
       * away from its own dot would be worse than a still drawing.
       *
       * None of it under reduced motion, where the only thing that moves the
       * surface is a hand on it.
       */
      const d = dragRef.current
      const gap = now - (d.frame || now)
      d.frame = now

      /*
       * The instrument, before anything is projected. A coefficient on its way
       * home moves here rather than on a transition, because what has to ease
       * is the surface and not a number in a caption — the caption is only the
       * readout. The cloud is re-solved when, and only when, the pair has
       * actually changed since the last frame: a held coefficient costs one
       * pass over 5,152 points, and a still one costs nothing at all.
       */
      const cf = coefRef.current
      if (cf.ret) {
        const { key, from } = cf.ret
        const r = clamp01((now - cf.ret.t0) / COEF_HOME)
        cf[key] = r >= 1 ? COEFS[key].home : lerp(from, COEFS[key].home, smooth(r))
        if (r >= 1) cf.ret = null
        paintCoef(key)
      }
      const off = Math.abs(cf.d - CC.d) > 1e-4 || Math.abs(cf.e - CC.e) > 1e-4
      if (off && (cf.ad !== cf.d || cf.ae !== cf.e)) {
        resolve(cf.d, cf.e)
        cf.ad = cf.d
        cf.ae = cf.e
      }
      const cloud = off ? LIVE : CLOUD

      /*
       * How much of the biography is on view. The places are true of the
       * board's surface and of no other, so the moment a coefficient leaves its
       * value the marks, their names and the rail go, and the shape is left to
       * be a shape. It eases rather than switches, and under reduced motion it
       * does neither: it is simply one or the other.
       */
      const want = off ? 0 : 1
      bioRef.current = reduce
        ? want
        : bioRef.current + (want - bioRef.current) * (1 - Math.exp(-Math.min(64, gap) / BIO_TAU))
      const bio = bioRef.current < 0.004 ? 0 : bioRef.current
      const ra = Math.round(bio * 100) / 100
      if (ra !== railA) {
        railA = ra
        const rail = railRef.current
        if (rail) {
          rail.style.opacity = String(ra)
          rail.style.pointerEvents = ra > 0.6 ? '' : 'none'
        }
      }

      /*
       * The tour. The year is wound straight from 2018 to the present while the
       * eye is walked through the itinerary built at the press: between two
       * stations the yaw is smoothstepped from one facing angle to the next, so
       * the object turns to meet each place as it lights and never cuts. Before
       * the first station it eases out of wherever the eye was standing, and
       * after the last it simply holds. Nothing opens a card; the tour is a
       * thing to watch, not a thing that reads itself to you.
       */
      const tr = tourRef.current
      if (tr.on && tr.keys?.length) {
        const t = clamp01((now - tr.t0) / TOUR_MS)
        setClock(START + t * (NOW - START))
        const keys = tr.keys
        let k = -1
        while (k + 1 < keys.length && t >= keys[k + 1].t) k++
        if (k < 0) {
          view.current.yaw = lerp(tr.yaw0, keys[0].yaw, smooth(clamp01(t / keys[0].t)))
        } else if (k >= keys.length - 1) {
          view.current.yaw = keys[k].yaw
        } else {
          const a = keys[k]
          const b = keys[k + 1]
          view.current.yaw = lerp(a.yaw, b.yaw, smooth(clamp01((t - a.t) / (b.t - a.t))))
        }
        if (k !== tr.lit) {
          tr.lit = k
          setTourAt(k < 0 ? null : keys[k].name)
        }
        // Done, and the object is handed back its own slow turn rather than
        // standing still for three seconds first.
        if (t >= 1) {
          d.last = now - IDLE
          stopTour()
        }
      }

      if (!reduce && !arriving && !d.on && !tr.on) {
        if (d.vy || d.vp) {
          /*
           * Two different elapsed times, on purpose. The decay takes the real
           * gap since the last frame, so a throw left running while the tab was
           * in the background is spent by the time the tab comes back rather
           * than picking up where it left off. The distance takes a capped gap,
           * so it cannot pay out a second of coasting in a single frame: what a
           * starved frame owes is dropped, not saved up.
           */
          const decay = Math.exp(-gap / SPIN_TAU)
          const travel = SPIN_TAU * (1 - Math.exp(-Math.min(64, gap) / SPIN_TAU))
          view.current.yaw += d.vy * travel
          view.current.pitch = tilt(view.current.pitch, d.vp * travel)
          d.vy *= decay
          d.vp *= decay
          // A third of a degree a second is not motion any more.
          if (Math.abs(d.vy) < 3e-4 && Math.abs(d.vp) < 3e-4) {
            d.vy = 0
            d.vp = 0
          }
        } else if (!activeRef.current && now - d.last > IDLE) {
          view.current.yaw += 0.055
        }
      }

      /*
       * The eye and the frame, ramped from the map's to the room's on the fold's
       * own ease. At ea = 1 the lerps return the room's numbers exactly, so the
       * handover happens inside the arithmetic and costs no frame; the rest of
       * the loop simply uses these and never has to know which state it is in.
       */
      const proj = makeProjector(
        lerp(MAP_YAW, view.current.yaw, ea),
        lerp(MAP_PITCH, view.current.pitch, ea),
      )
      const sa = lerp(sMap, s, ea)
      const cxa = lerp(cxMap, cx, ea)
      const fr = rowFor(yearRef.current)
      ctx.clearRect(0, 0, w, h)

      // The paper. One fillStyle, one pass, and it is the reason everything
      // above it still sits on something.
      ctx.fillStyle = hexA(pal.muted, 0.22)
      for (let n = 0; n < grain.length; n += 2) {
        ctx.fillRect(grain[n] - 0.6, grain[n + 1] - 0.6, 1.2, 1.2)
      }

      /*
       * The stations no land dot claimed. They come in over the last third of
       * the fold, so the surface reaches full survey density by the time it
       * settles without 5,152 points setting off from a 2,415-dot coastline.
       */
      const fill = arriving ? clamp01((ea - 0.67) / 0.33) : 1
      // The land's colour giving way to the surface's, and the map's one flat
      // weight giving way to depth. Seven strings a frame, not five thousand.
      if (arriving) {
        const col = mixHex(pal.land, pal.ink, shade)
        for (let k = 0; k < 7; k++) {
          foldLevels[k] = hexA(col, lerp(MAP_ALPHA, 0.1 + 0.1 * k, shade))
        }
      }
      const levels = arriving ? foldLevels : pal.levels
      for (let n = 0; n < cloud.length; n++) {
        const p = cloud[n]
        /*
         * Where this station's dot is coming from, if anything is. The lerp is
         * in the surface's own three dimensions and not on the screen: that is
         * the whole difference between a map that closes into the cap and a
         * field of dots that slides across it. One scratch point, reused.
         */
        const from = arriving ? FOLD_FROM[n] : null
        // A station with nothing on its way to it is not worth projecting until
        // it is due to appear.
        if (arriving && !from && fill <= 0) continue
        let q
        if (from) {
          MP.x = lerp(from.x, p.x, ea)
          MP.y = lerp(from.y, p.y, ea)
          MP.z = lerp(from.z, p.z, ea)
          q = proj(MP)
        } else {
          q = proj(p)
        }
        const X = cxa + q.px * sa
        const Y = cy - q.py * sa
        // Depth, normalised over the surface's own front-to-back extent, is the
        // only shading here: near is ink, far is nearly paper.
        const d01 = clamp01((q.depth + 66) / 132)
        let a = d01
        /*
         * The year's frontier feathers in over three rows rather than ending on
         * a hard ring, which is what makes a scrub read as growth. It is the
         * biography's own edge, though, so it goes when the biography goes: off
         * the board value the clock has nothing to say about this shape and the
         * surface draws whole. Crossfaded rather than switched, so returning
         * home is the frontier closing back in rather than a row of dots
         * blinking out.
         */
        if (p.row > fr) a *= 1 - bio
        else if (fr - p.row < 3) a *= lerp(1, (fr - p.row) / 3, bio)
        // A dot that travelled is already at full weight; only the ones nothing
        // carried have to arrive, and they do it over the last third.
        if (!from) a *= fill
        if (a <= 0.02) continue
        ctx.fillStyle = levels[Math.round(clamp01(a) * 6)]
        ctx.fillRect(X - 0.7, Y - 0.7, 1.4, 1.4)
      }

      /*
       * The fifteen, while the fold is still running. They cannot be the buttons
       * yet — a button is pinned to a station and the stations are still on
       * their way — so they are painted here at the sizes and in the colours the
       * marks below use, and hand over to them without a step at ea = 1. The
       * colour itself is never lerped: a place rides as itself the whole way, or
       * the arrival would be fifteen grey dots turning red at the end of it.
       */
      if (arriving) {
        for (let n = 0; n < N; n++) {
          const p = places[n]
          const from = PLACE_FROM[n]
          const to = STATIONS[p.id].pt
          MP.x = lerp(from.x, to.x, ea)
          MP.y = lerp(from.y, to.y, ea)
          MP.z = lerp(from.z, to.z, ea)
          const q = proj(MP)
          // The far side dims in as the plane acquires one, on the same ramp
          // the surface's own shading arrives on.
          const a = lerp(0.95, q.depth > -6 ? 0.95 : 0.28, shade)
          ctx.beginPath()
          ctx.arc(cxa + q.px * sa, cy - q.py * sa, pinSize(p) / 2, 0, Math.PI * 2)
          ctx.fillStyle = hexA(pal.marks[n], a)
          ctx.fill()
        }
      }

      /*
       * The places are real buttons over the canvas rather than painted pixels,
       * so a station is still something a keyboard can reach and a screen reader
       * can name. They are moved from here, by hand, rather than through state:
       * fifteen transforms a frame is nothing, and fifteen renders a frame would
       * be the whole budget.
       */
      const hov = hoverRef.current
      const act = activeRef.current
      // Room for names, which is not the same question as width. A phone on its
      // side is 812 across and still has a cap the size of a portrait phone's in
      // it, so it is read under the phone's rule and not the desk's.
      const wide = w >= 768 && !land
      for (let n = 0; n < N; n++) {
        const p = places[n]
        const el = pinRefs.current[p.id]
        lstate[n] = 0
        if (!el) continue
        if (arriving || PLACE_YEAR[p.id] > yearRef.current || !bio) {
          if (el.style.opacity !== '0') {
            el.style.opacity = '0'
            el.style.pointerEvents = 'none'
          }
          continue
        }
        const q = proj(STATIONS[p.id].pt)
        // Just past the horizon rather than exactly on it, so a mark does not
        // flicker in and out while the surface turns through it.
        const front = q.depth > -6
        const on = act === p.id || hov === p.id
        const X = cxa + q.px * sa
        const Y = cy - q.py * sa
        el.style.transform = `translate(${X}px, ${Y}px) translate(-50%, -50%)`
        el.style.opacity = String((on ? 1 : front ? 0.95 : 0.28) * bio)
        // A faded mark is a mark that is not there: while the shape is being
        // played with, nothing on it answers a press.
        el.style.pointerEvents = front && bio > 0.6 ? 'auto' : 'none'
        // Where the name would hang if it were shown. The button is its dot
        // plus 7px of padding all round, and the label is absolutely placed
        // against that box: left-full puts it on the right edge, top-0 on the
        // top, and -mt-1 lifts it 4px. Its own 4px of lead is inside the width
        // that was measured, so it is not added again here.
        const half = (pinSize(p) + 14) / 2
        lx[n] = X + half
        ly[n] = Y - half - 4
        // The name only where there is room for it: on a phone, upright or on
        // its side, fifteen tracked uppercase names over a cap this size is a
        // wall of type, so there it is the one you are pointing at and nothing
        // else.
        lstate[n] = on ? 2 : front && wide ? 1 : 0
      }

      /*
       * The names, thinned. Around the pinch the surface brings four or five
       * stations into the same handful of pixels — Saudi Arabia, Spain, France
       * and Georgia are all 2025 and all land there — and fifteen names laid
       * over each other is worse than fourteen and a gap. So each frame the
       * boxes are walked in order of precedence and a name is kept only if it
       * has not already been claimed: the present first, then the earlier year,
       * which is the order the survey was built in. Fifteen of them, so the
       * plain pairwise test is the right one and there is nothing to index.
       *
       * The pointed-at mark is exempt. It is the one name that was asked for,
       * and it is taken before anything else so it also keeps its ground.
       */
      let keep = 0
      for (const n of LABEL_ORDER) {
        if (!lstate[n]) { lwant[n] = 0; continue }
        if (lstate[n] === 2) { lwant[n] = 1; kept[keep++] = n; continue }
        let clear = true
        for (let k = 0; k < keep; k++) {
          const m = kept[k]
          if (lx[n] < lx[m] + labelW[m] + LABEL_MX && lx[m] < lx[n] + labelW[n] + LABEL_MX
            && ly[n] < ly[m] + labelH[m] + LABEL_MY && ly[m] < ly[n] + labelH[n] + LABEL_MY) {
            clear = false
            break
          }
        }
        lwant[n] = clear ? 1 : 0
        if (clear) kept[keep++] = n
      }
      for (let n = 0; n < N; n++) {
        const tag = tagOf(n)
        if (!tag) continue
        if (lstate[n] === 1) {
          // Held for a few frames before it is acted on. At the exact angle two
          // boxes touch, the answer changes every frame, and a name that
          // stutters is more distracting than either answer.
          if (lwant[n] !== lshown[n]) {
            if (++lrun[n] >= LABEL_HOLD) { lshown[n] = lwant[n]; lrun[n] = 0 }
          } else lrun[n] = 0
        } else {
          lshown[n] = lwant[n]
          lrun[n] = 0
        }
        tag.style.opacity = String(lstate[n] === 2 ? bio : lshown[n] ? 0.85 * bio : 0)
      }
    }

    // One frame now, then the loop.
    draw(t0)
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (!visible) return
      draw(now)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      mo.disconnect()
      io.disconnect()
      scheme.removeEventListener('change', onScheme)
    }
  }, [box, paintCoef, setClock, stopTour])

  /* ---- the place cards, unchanged in job ---- */
  const clearClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  const close = useCallback(() => {
    clearClose()
    pinnedRef.current = false
    setActiveId(null)
  }, [])
  const scheduleClose = useCallback(() => {
    clearClose()
    closeTimer.current = setTimeout(() => {
      if (!pinnedRef.current) setActiveId(null)
    }, CLOSE_DELAY)
  }, [])
  useEffect(() => clearClose, [])

  const isNarrow = () => window.matchMedia('(max-width: 767px)').matches

  const placeCard = useCallback(() => {
    const card = cardRef.current
    const pin = activeId && pinRefs.current[activeId]
    if (!card || !pin || !stageRef.current) return
    if (isNarrow()) {
      card.style.left = ''
      card.style.top = ''
      return
    }
    const r = pin.getBoundingClientRect()
    const s = stageRef.current.getBoundingClientRect()
    const w = card.offsetWidth
    const h = card.offsetHeight
    const gap = 18
    const pad = 14
    const cx = r.left + r.width / 2 - s.left
    const cy = r.top + r.height / 2 - s.top
    let x = cx + gap
    if (x + w > s.width - pad) x = cx - gap - w
    x = Math.max(pad, Math.min(x, s.width - w - pad))
    const y = Math.max(pad, Math.min(cy - h / 2, s.height - h - pad))
    card.style.left = `${x}px`
    card.style.top = `${y}px`
  }, [activeId])

  useLayoutEffect(placeCard, [placeCard])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  /*
   * A press on a station pins its card open; a press anywhere else puts it away.
   * Without this the pin had no release except Escape or another station, so a
   * pinned card followed you around the page. The marks are excluded because
   * pressing one is how you open the next card, and the card is excluded so
   * that reading it, or following its link, is not a way to dismiss it.
   */
  useEffect(() => {
    if (!activeId) return
    const onDown = (e) => {
      if (e.target.closest?.('[data-card]') || e.target.closest?.('[data-place]')) return
      close()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [activeId, close])

  const openPlace = (id) => { clearClose(); pinnedRef.current = false; setActiveId(id) }
  const pinPlace = (id) => { clearClose(); pinnedRef.current = true; setActiveId(id) }

  const lookAt = (label) => setFocusLabel(label)
  const lookAway = () => setFocusLabel(null)

  /*
   * A handle in the caption. It is a glyph in a line of eleven-pixel italic
   * type, which is nothing to aim at, so it carries a 44px box of its own that
   * paints nothing and takes every press — the size a thumb needs, and the two
   * handles sit far enough apart in the clause that the boxes never meet. The
   * dotted rule under it is the only thing that says it is a handle at all,
   * which is the right amount of saying for a caption.
   *
   * `aria-valuenow` is deliberately not rendered: like the text, it is written
   * by hand, so React has nothing here it could put back.
   */
  const coefHandle = (key) => {
    const c = COEFS[key]
    return (
      <span
        ref={(el) => { coefEls.current[key] = el }}
        role="slider"
        tabIndex={0}
        aria-label={c.label}
        aria-valuemin={c.min}
        aria-valuemax={c.max}
        className="pointer-events-auto relative inline-block cursor-ew-resize touch-none rounded-[2px] border-b border-dotted border-current tabular-nums outline-none before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:border-solid focus-visible:ring-1 focus-visible:ring-accent"
        onPointerDown={coefDown(key)}
        onPointerMove={coefMove}
        onPointerUp={coefUp}
        onPointerCancel={coefUp}
        onKeyDown={coefKey(key)}
        onBlur={() => homeCoef(key)}
      />
    )
  }

  return (
    <div ref={stageRef} className="relative min-h-0 w-full flex-1 overflow-hidden bg-paper">
      {/* touch-none because the gesture on this canvas is a turn, and a phone
          would otherwise spend it trying to scroll a page that has nowhere to
          go. The survey itself is decoration: the marks over it are the content
          and carry the names. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />

      {/* The marks start hidden by class rather than by inline style, because
          the loop writes inline and an inline rule beats a class: a render
          caused by the rail scrubbing can never put a mark back at the origin.

          The wrapper is pointer-events-none and the marks opt back in one at a
          time. Without that this box is a full-stage sheet of glass over the
          canvas: it is inset-0 like the canvas is, it hit-tests whether or not
          it paints anything, and it was swallowing every press meant for the
          drawing — which is why the surface would not turn at all. */}
      {/* Lifted over the rail on a phone lying down, and only there. The cap
          fills the height between the island and the lanes in that frame, so
          its tail reaches into the rail's own lead — and the rail, being later
          in the source and z-[3], would otherwise take every press meant for a
          station down there and wind the year with it. The wrapper is still
          pointer-events-none, so what is lifted is fifteen thumb-sized marks
          and not a sheet of glass over the rail. */}
      <div
        className="pointer-events-none absolute inset-0 max-lg:landscape:z-[4]"
        aria-label="Places, pinned to survey stations"
      >
        {places.map((p) => {
          const tone = p.kind === 'now' ? 'bg-accent' : p.kind === 'lived' ? 'bg-ink' : 'bg-soft'
          // The same number the loop uses to work out where a name would hang.
          const size = pinSize(p)
          return (
            <button
              key={p.id}
              type="button"
              data-place
              ref={(el) => { pinRefs.current[p.id] = el }}
              aria-label={`${p.name}, ${p.cities}`}
              className="pointer-events-none absolute left-0 top-0 cursor-pointer rounded-full p-[7px] opacity-0 outline-none"
              onPointerEnter={() => { hoverRef.current = p.id }}
              onPointerLeave={() => { if (hoverRef.current === p.id) hoverRef.current = null }}
              onFocus={() => openPlace(p.id)}
              onBlur={scheduleClose}
              onClick={() => pinPlace(p.id)}
            >
              <span className={`block rounded-full ${tone}`} style={{ width: size, height: size }} />
              <span
                className={`${MONO} pointer-events-none absolute left-full top-0 -mt-1 whitespace-nowrap pl-1 text-ink opacity-0 transition-opacity duration-150 motion-reduce:transition-none`}
                style={{ color: p.kind === 'now' ? 'var(--color-accent)' : undefined }}
              >
                {p.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bottom left, over the drawing and above the rail. The offset clears the
          rail's own block — its 32px of lead, the 3px line, the tick row and its
          24px foot — and now the caption's band under that as well, which is why
          it stands off further than the rail alone would ask for.

          Except on a phone lying down, where a block that grows upward off the
          rail grows straight through the island and loses its first line off the
          top of the stage. There it is hung from the top instead, on the same
          76px of clearance the landing gives itself in landscape, and it keeps
          to the left half at every width rather than only from md, because the
          cap now stands in the other one. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[136px] z-[3] px-5 sm:px-8 max-lg:landscape:bottom-auto max-lg:landscape:top-[76px] lg:px-12">
        <div className="max-w-[58ch] max-lg:landscape:max-w-[48%] md:max-w-[48%]">
          {/* The label goes when the page lies down. Between the island and the
              caption there is room for the headline and the summary and nothing
              else, and of the two lines that could go this is the one the island
              is already saying: its About is lit. */}
          <p className={`${MONO} mb-4 text-muted max-lg:landscape:hidden`}>About</p>
          <h1 className="max-w-[28ch] text-balance text-[clamp(1.2rem,1.85vw,1.6rem)] font-light leading-[1.32] text-ink">
            Trained to draw buildings, went back for the machinery<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 max-w-[56ch] font-serif text-[0.92rem] leading-[1.75] text-soft max-lg:landscape:mt-3">
            Practice across Beirut, Dubai and Kuwait, then the MaCAD master at IAAC. Now I build the
            tools I used to ask for.
          </p>
          {/* The contacts, out of the band and under the writing. This is the
              page about the person, so it is where a way to reach him belongs;
              the band below keeps the identity alone and centred. The block
              above is pointer-events-none so the drawing stays reachable
              through it, which the marks have to opt back out of.

              Lying down there is no room for them under the writing, and this
              page's footer is bare precisely because it carries them, so they
              are not something that can simply be dropped. They go to the one
              piece of the stage a landscape phone leaves empty instead: the
              island's own line, in the corner beside it, as three marks without
              their names — the same trim the footer makes when its row is
              narrow. -50px off the block's top lands them on the island's
              centre line, and 26px in is where the -ml-1.5 has them sitting in
              the flow, so the corner is the same margin as the writing. */}
          <ContactMarks
            named
            className="pointer-events-auto mt-7 -ml-1.5 text-muted max-lg:landscape:absolute max-lg:landscape:-top-[50px] max-lg:landscape:left-[26px] max-lg:landscape:ml-0 max-lg:landscape:mt-0 max-lg:landscape:[&_span]:hidden"
          />
        </div>
      </div>

      {/* The survey's caption, the same line the landing carries under the same
          surface: the cross-cap's own equations with the board's defaults
          substituted, in the mono's true italic and in accent, which is the
          site's labelling voice leaning — the difference between a caption
          printed on a drawing and a note worked out beside it. It says what the
          station numbers used to say, that this is a computed survey rather than
          a texture, and says it once instead of ninety times over the drawing.

          It sits in its own band between the writing and the rail, at the same
          margins as both, so it reads as the drawing's footing rather than as
          another thing on top of it.

          Each clause is its own nowrap span. A formula that breaks in the middle
          of an equation is not a formula any more, so the only places a line may
          fold are the separators, which carry with the clause they follow rather
          than leading the next line.

          It is no longer only a caption. Two of its numbers are the surface's
          own coefficients and can be taken hold of, so the line cannot be
          hidden from readers any more: the handles are real sliders with real
          names, and only the symbol soup around them stays out of the way.

          Neither handle is given children here. The loop writes their text by
          hand sixty times a second, and a render caused by anything else on the
          page would otherwise put the printed glyph back in the middle of a
          drag. The two `2`s in the y and z clauses are written the same way,
          from the same value: there is one e, and a formula that disagreed with
          itself while being held would be a worse lie than a static one. */}
      {/* Lying down it keeps the same job and folds. The full-width line ran
          straight through the half the cap now stands in, so there it is held
          to the writing's own side of the stage and breaks at its separators
          into two, and it comes down to sit on the rail's lead — as low as it
          can go before it would share a line with the rail's hint, which is
          right-aligned and reaches a long way in at these widths. */}
      <p
        className="pointer-events-none absolute inset-x-0 bottom-[92px] z-[4] px-5 font-mono text-[0.6875rem] italic leading-[1.5] text-accent max-lg:landscape:bottom-[76px] max-lg:landscape:max-w-[62%] sm:px-8 lg:px-12"
        style={{
          opacity: settled ? 1 : 0,
          // And out of reach until it is here. The handles keep their 44px of
          // hit area whatever the line's opacity, so without this there are two
          // invisible sliders over the map for the length of the fold, and a
          // keyboard would find them there.
          visibility: settled ? 'visible' : 'hidden',
          // The fold's own ease: smoothstep is what every dot crossed the page
          // on, and this is its bezier. Half the fold's length, because it is
          // coming up after the surface has settled and not alongside it.
          transition: `opacity ${FOLD / 2}ms cubic-bezier(0.45, 0, 0.55, 1)`,
        }}
      >
        <span aria-hidden="true" className="whitespace-nowrap">0 ≤ u, v ≤ π ·</span>{' '}
        <span className="whitespace-nowrap">
          <span aria-hidden="true">x = </span>
          {coefHandle('d')}
          <span aria-hidden="true">a·sin u·sin </span>
          {coefHandle('e')}
          <span aria-hidden="true">v ·</span>
        </span>{' '}
        <span aria-hidden="true" className="whitespace-nowrap">
          y = a·sin <span ref={(el) => { mirrorEls.current[0] = el }} />u·sin²v ·
        </span>{' '}
        <span aria-hidden="true" className="whitespace-nowrap">
          z = a·cos <span ref={(el) => { mirrorEls.current[1] = el }} />u·sin²v ·
        </span>{' '}
        <span aria-hidden="true" className="whitespace-nowrap">a = 60</span>
      </p>

      {/*
        * The career, whole. In the version this replaced the bars grew as you
        * scrolled, because a clock drove the page; the clock is here now, and it
        * drives the surface as well as these bars. The rail stays because it is
        * the one thing that shows sequence and overlap in a readable way:
        * Kuwait running alongside Barcelona, Ohio interrupting Byblos.
        */}
      {/* Floored rather than rounded on the announced value: NOW is 2026.6, the
          middle of the present year, and rounding announced the slider as 2027. */}
      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label="Year"
        aria-valuemin={START}
        aria-valuemax={Math.floor(NOW)}
        aria-valuenow={Math.floor(year)}
        onKeyDown={(e) => {
          // Winding by hand, like every other way of winding, ends the tour
          // wherever it had got to.
          if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(e.key)) stopTour()
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setClock(yearRef.current - 0.5) }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setClock(yearRef.current + 0.5) }
          if (e.key === 'Home') { e.preventDefault(); setClock(START) }
          if (e.key === 'End') { e.preventDefault(); setClock(NOW) }
        }}
        className="absolute inset-x-0 bottom-0 z-[3] cursor-ew-resize touch-none px-5 pb-6 pt-8 outline-none focus-visible:ring-1 focus-visible:ring-accent sm:px-8 lg:px-12"
      >
        {/* Two gestures and no chrome to announce either: the surface turns and
            the years wind, and both are invisible until tried. This says it
            once, in the tick row's own voice, and gets out of the way as soon as
            it has been understood — which is exactly the moment the year leaves
            the present. It sits in the rail's top padding rather than in the
            flow, so it costs the lanes no height. */}
        <div className="pointer-events-none absolute inset-x-5 top-1.5 flex items-center justify-end gap-3 sm:inset-x-8 lg:inset-x-12">
          <span className="relative flex min-w-0 items-center">
            {/* The wheel is a desk gesture: a finger on a phone reaches the
                clock by dragging the rail, and the second clause has no
                meaning there. Dropping it is also what leaves room for the
                play control on the same line at 375px. */}
            <span
              className={`${MONO} whitespace-nowrap text-muted transition-opacity duration-300 motion-reduce:transition-none`}
              style={{ opacity: year < NOW ? 0 : 1 }}
            >
              Drag to turn<span className="max-sm:hidden"> · scroll to wind back</span>
            </span>
            {/* On a phone the names are not painted beside the marks, so the
                tour would light fifteen dots and say nothing. This is that
                missing caption, and it sits over the hint because the hint has
                already faded by the time the clock has left the present. */}
            {tourAt && (
              <span
                className={`${MONO} absolute inset-y-0 right-0 flex items-center whitespace-nowrap text-accent md:hidden`}
              >
                {tourAt}
              </span>
            )}
          </span>
          {/*
            * The one gesture the page cannot hint at, because it is not a
            * gesture: nine seconds of the thing winding itself. Under reduced
            * motion there is nothing here to offer — the tour is pure movement
            * and has no still form to fall back to — so the control is not
            * drawn at all rather than drawn and broken.
            */}
          {!reduceMotion && (
            <button
              type="button"
              data-rail-skip
              aria-label="Play the years"
              aria-pressed={touring}
              onClick={playTour}
              className={`${MONO} pointer-events-auto -mr-1 shrink-0 cursor-pointer whitespace-nowrap rounded-[3px] px-1 text-muted outline-none transition-colors hover:text-accent focus-visible:ring-1 focus-visible:ring-accent ${touring ? 'text-accent' : ''}`}
            >
              <span aria-hidden="true" className="pr-1 not-italic">{touring ? '■' : '▶'}</span>
              Play the years
            </button>
          )}
        </div>
        <div className="relative w-full" style={{ height: LANE_H }}>
          <span
            className="absolute inset-x-0 rounded-full bg-line"
            style={{ top: 0, height: LANE_H }}
          />
          {LANES.map((t) => {
            const lit = focusLabel === t.name
            return (
              <button
                key={`${t.name}-${t.from}`}
                type="button"
                aria-label={`${t.name}, ${t.role}, ${t.dates}`}
                className="absolute rounded-full outline-none transition-opacity"
                style={{
                  left: `${tx(t.from)}%`,
                  width: `${Math.max(0, tx(Math.min(t.to, year)) - tx(t.from))}%`,
                  top: 0,
                  height: LANE_H,
                  backgroundColor: `var(--color-${t.belt})`,
                  opacity: t.from > year ? 0 : focusLabel ? (lit ? 1 : 0.25) : 0.85,
                }}
                onPointerEnter={() => lookAt(t.name)}
                onPointerLeave={lookAway}
                onFocus={() => lookAt(t.name)}
                onBlur={lookAway}
              />
            )
          })}
          {/* The marker crosses every lane, because the year is one year for
              all of them. */}
          <span
            className="absolute -top-1 w-px bg-accent"
            style={{ left: `${tx(year)}%`, height: LANE_H + 2 }}
          />
        </div>

        {/* Four coloured bars mean nothing on their own, so the one you are
            pointing at says what it is. */}
        {/* The reserved height follows the type: 9px was drawn around the old
            8.96px label. */}
        <div className="relative mt-3 h-[11px]">
          {YEAR_TICKS.map((y) => (
            <span
              key={y}
              className={`${MONO} absolute -translate-x-1/2 tabular-nums text-muted transition-opacity`}
              style={{ left: `${tx(y)}%`, opacity: focusLabel ? 0.25 : 1 }}
            >
              {y}
            </span>
          ))}
          <span
            className={`${MONO} absolute left-0 whitespace-nowrap text-ink transition-opacity`}
            style={{ opacity: focusLabel ? 1 : 0 }}
          >
            {focusLabel}
          </span>
        </div>
      </div>

      <div
        ref={cardRef}
        data-card
        aria-hidden={!active}
        className={`absolute z-[7] max-h-[min(440px,68vh)] w-[296px] overflow-auto rounded-[10px] border border-line bg-paper shadow-[var(--chrome-lift)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none max-md:inset-x-3.5 max-md:bottom-3.5 max-md:top-auto max-md:max-h-[52%] max-md:w-auto ${
          active ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
        }`}
        onPointerEnter={clearClose}
        onPointerLeave={scheduleClose}
      >
        {active && (
          <>
            {/* The cover position: clipped into the top of the card by the
                fillet, the way every project card on the site leads with its
                image rather than framing one inside its padding. */}
            {active.photo && (
              /*
               * object-top, and tall enough to hold a head. The photo is a 332x534
               * portrait; a 296x112 slot centre-cropped it to a collar and a pair of
               * folded arms. Pinning it to the top is only half the fix — at 112px
               * the window on the source is 126px tall and a face is not, so the box
               * has to be deep enough for one before the crop point matters.
               */
              <img
                src={`${base}${active.photo}`}
                alt={active.kind === 'now' ? 'Charles Abi Chahine' : active.name}
                width="296"
                height="176"
                decoding="async"
                className="block h-44 w-full object-cover object-top"
              />
            )}
            {/* Centred, because these cards are three or four short lines about
                one place rather than a column of records: the page's left-aligned
                setting is for things that run on. */}
            <div className="p-[18px] pb-5 text-center">
              <p className={`${MONO} mb-2.5 text-accent`}>{active.tag}</p>
              <h2 className="mb-1.5 text-[0.98rem] font-medium leading-tight text-ink">
                {active.name}
              </h2>
              <p className={`${MONO} mb-3.5 text-muted`}>{active.cities}</p>
              {active.stints?.length > 0 && (
                <dl className="mb-3.5">
                  {active.stints.map(([years, org, capacity]) => (
                    <div key={`${years}-${org}`} className="pb-2.5">
                      <dt className={`${MONO} mb-1 tabular-nums text-muted`}>{years}</dt>
                      <dd className="m-0 text-[0.78rem] font-light leading-snug text-ink">
                        {org}
                        <span className="mt-0.5 block text-muted">{capacity}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {active.note && (
                <p className="m-0 font-serif text-[0.85rem] leading-[1.7] text-soft">
                  {active.note}
                </p>
              )}
              {/* Somewhere to go, but only where there is somewhere to go: a
                  place he worked or studied in is on the CV, and a place he
                  travelled to is not written up anywhere yet. Sending the second
                  kind to the CV promised a record that does not mention it. */}
              {active.kind === 'visited' ? (
                <p className={`${MONO} mt-4 text-muted`}>Architecture blog in the works</p>
              ) : (
                <Link
                  to="/cv"
                  className={`${MONO} mt-4 inline-block text-muted transition-colors hover:text-accent`}
                >
                  Full record → CV
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
