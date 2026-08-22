/*
 * The seam between the cover and /work.
 *
 * The homepage's scroll gesture navigates to /work, and /work turns a vertical
 * wheel into horizontal strip movement. A trackpad keeps emitting wheel events
 * for a few hundred milliseconds after the finger lifts, so without a guard the
 * visitor lands on /work and the filmstrip immediately lurches sideways off the
 * tail of the same gesture. Home stamps the moment it handed off; Work ignores
 * wheel input until that momentum has decayed, and plays its arrival animation
 * once off the same stamp.
 *
 * A module-scoped timestamp rather than sessionStorage or a window global: the
 * two pages already share this module the way they share any import, it dies
 * with the tab, and it needs no cleanup. The coupling stays one-way and tiny —
 * Home only writes, Work only reads, and neither page imports the other.
 */

// Long enough to outlast trackpad inertia past the moment /work has mounted,
// short enough that a deliberate second scroll a moment later still reaches the
// strip. The window is measured from the mark, and the mark is set as the leave
// begins, so the ~500ms leave animation eats into it: 700 leaves roughly the
// same ~200ms of guard on the far side that 600 did behind the old ~400ms leave.
export const HANDOFF_MOMENTUM_MS = 700

// How long after the mark a mount of /work still counts as "arrived from the
// cover" and gets the rise-in choreography. Comfortably longer than the leave,
// so the animation is armed by the time /work renders, but short enough that a
// later visit does not inherit it.
export const HANDOFF_ARRIVAL_MS = 1500

let handoffAt = 0
// Start consumed: a cold load of /work (refresh, shared link, island nav) has no
// handoff behind it and must not rise. markHandoff re-arms it.
let arrivalConsumed = true

export function markHandoff() {
  handoffAt = Date.now()
  arrivalConsumed = false
}

// Non-consuming, for Work's wheel handler: it must keep swallowing inertia for
// the whole momentum window, so this never clears the mark.
export function handoffMomentumActive() {
  return Date.now() - handoffAt < HANDOFF_MOMENTUM_MS
}

// True once per handoff, while /work is mounting fresh off the cover; false on a
// cold load, and false on any later mount within the window once it has fired.
//
// The clear is deferred to a microtask rather than run inline because Work reads
// this in a useState initializer, which React's StrictMode double-invokes in
// development: both synchronous calls must agree (both true), or the rise would
// arm and then immediately disarm itself. The microtask runs after the render
// pair, so the second reader — a genuinely later remount — sees it consumed.
//
// Deliberately independent of handoffAt: consuming the arrival must not disturb
// handoffMomentumActive above, which is still guarding the wheel at this point.
export function consumeHandoff() {
  const arriving = !arrivalConsumed && Date.now() - handoffAt < HANDOFF_ARRIVAL_MS
  if (arriving) queueMicrotask(() => { arrivalConsumed = true })
  return arriving
}
