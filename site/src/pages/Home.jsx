import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { projects } from '../data/projects.js'
import { summary } from '../data/cv.js'
import { markHandoff } from '../handoff.js'
import { crossCap, makeProjector } from '../lib/crosscap.js'

/*
 * The cover.
 *
 * One screen, the name and nothing else to read. The page is exactly the
 * viewport, so there is no document to scroll: scrolling down is not movement on
 * this page but the gesture that opens the next one. A wheel down, an upward
 * swipe, ArrowDown / PageDown / Space / End, or the cue itself all run the same
 * handoff, the name eases up and out, and the site lands on /work at its real
 * URL, where the filmstrip's own fade-in serves as the arrival.
 *
 * A scroll builds toward that departure rather than tripping it, so the gesture
 * is answered while it accumulates. One progress value p, the gesture's fraction
 * of its threshold, drives two things: the whole block gives a little in the
 * direction it is about to leave, and the cross-cap survey in the corner, whole
 * from the start, is inked and numbered by a front that crosses it, the same
 * drawing the printed portfolio's cover carries, off the same equations
 * (src/lib/crosscap.js). A wheel meters p, and so does a finger; the keyboard
 * and the cue have no gesture to meter, so they go straight to the leave.
 *
 * p is held rather than timed: it sits where the last scroll left it, and only
 * another scroll moves it, up or down. So the half-open state is somewhere you
 * can stop and stay — which is what the survey's caption needs, since reading a
 * line of equations takes longer than any timeout worth setting.
 *
 * One exception, and it is the whole of the exception: a phone held sideways.
 * There the viewport is about 330px tall once the island and the band have
 * taken theirs, which is not a screen this cover can be set on at any spacing
 * worth having. So below lg and lying down the page stops being a screen and
 * becomes a page — it flows, it scrolls, the footer sits at the end of the
 * document. The transition comes with it rather than being switched off. The
 * cover is made sticky at the viewport's height and a runway of empty page is
 * laid under it, so a scroll moves the document without moving the cover, and
 * how far down that runway you are is p. The scroll is the gesture: same give,
 * same sweep, same caption, the same fire() at the end, only read off a real
 * scroll position instead of a virtual accumulator. Held position comes free
 * here, because it is the scroll position. The wheel and swipe handlers are
 * the one thing that stays unbound, since the browser is already delivering
 * the same value more faithfully than they could. The cue and the keyboard go
 * straight to /work as they do everywhere else.
 *
 * This replaced a two-screen landing whose second screen was a canvas strand
 * field fanning down into four columns of project cards. Those cards live in
 * full on /work; the drawing (DataField) is gone, recoverable from git.
 */

// The site's floor for anything set in this voice: the role line and the cue.
const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em]'

// The wheel distance a full commit takes: roughly three notches, or a sustained
// trackpad push, so a single flick still does not depart.
//
// There is deliberately no window on it any more. Position is held, not timed:
// the gesture accumulates where you leave it and stays there until you scroll
// again, in either direction. A timed window meant a scroll stopped halfway
// unwound itself a beat later, which made the half-open state impossible to sit
// in and read — you were racing a clock you could not see. Holding the position
// makes the landing behave like a scroll: partway is a place, not a lapse. What
// used to guard against stray ticks adding up is now the reverse direction —
// scrolling up walks the same value back down, so an accidental nudge is undone
// by the gesture that caused it rather than by waiting.
const WHEEL_THRESHOLD = 320

// The upward drag that a full commit takes. The finger meters the same
// progress the wheel does over this distance, so the give and the survey build
// under the thumb and then depart, rather than the swipe jumping straight to
// the leave with none of the transition the laptop shows.
const SWIPE_THRESHOLD = 140

// The scroll counterpart of the two above, for the flowing page: how much empty
// document is laid under the sticky cover, as a fraction of the viewport's own
// height, and therefore how far you scroll to commit. A fraction rather than a
// pixel count because the runway is cut from the same cloth as the screen it
// runs beneath — a roomier landscape phone should ask for proportionally more
// scroll, not the same absolute distance. At the ~375px this mode exists for it
// comes out near 225px: past SWIPE_THRESHOLD, which a real scroll would trip on
// momentum alone, and short of WHEEL_THRESHOLD, which on a screen this short
// would be the better part of a page. Three deliberate notches, or one unhurried
// push of the thumb. The same number sizes the empty box that *is* the runway,
// so the distance you can scroll and the distance p is measured over are one
// thing rather than two that have to be kept in agreement.
const SCROLL_RUNWAY = 0.6

// The leave: the name lifts and fades, same ease and travel as before but given
// a touch more room — 0.5s, so the departure is a shade more deliberate than the
// snappier arrival that answers it, where /work's cards rise into place.
const LEAVE_MS = 500

// The give: as the gesture accumulates, the whole block lifts a little in the
// direction it is about to go, so a scroll that has not yet committed is still
// answered. Kept small so it does not compete with the survey for the same job;
// drop toward 6 if the two together read busy. It shares progress p with the
// survey sweep, and at the threshold it hands off to the full lift-and-fade.
const GIVE_TRAVEL = 12

// The timing p moves on: quick while the gesture is live, a short snap to shut
// the survey as the leave begins. The give reads these through a CSS transition,
// the survey through a matched tween. Reversing is live too — walking the
// gesture back is still a gesture, so it moves at the same rate as building it.
const P_LIVE_MS = 90
const P_COMPLETE_MS = 120

/*
 * The homepage's own view of the shared surface. The mathematics is shared with
 * the printed cover; the framing is not, and must not be — the PDF frames for A4
 * landscape, the screen for a portrait-ish viewport, so each surface names its
 * own yaw, pitch, zoom and anchor. Turned like the print so the pinch sits high
 * and to the right, off the centred name, and zoomed past the frame so only a
 * fragment shows and it runs off the top and right edges. ax/ay place the cloud's
 * centre as a fraction of the canvas.
 */
const CC_HOME_VIEW = { yaw: 90, pitch: 30, zoom: 1.5, ax: 0.9, ay: 0.14 }
// The full-bleed view, for a portrait phone or tablet: the field runs through
// the whole page rather than a fragment in a corner, framed so the cross-cap's
// nested contour arcs — its signature "eye" — sit centred behind the name, and
// the radial reveal below grows out from there in every direction. The name
// keeps its faded-paper halo (the scrim) so it reads over the field. Portrait
// only: a phone on its side is short and wide, the same shape the laptop is, and
// a field centred on the name has nowhere to grow without landing on the type —
// there the corner fragment (CC_HOME_VIEW), off to one side, is the right frame.
const CC_HOME_VIEW_MOBILE = { yaw: 90, pitch: 30, zoom: 3.0, ax: 0.5, ay: 0.42 }
// The laptop starts here; below it in landscape still reads as the wide frame.
const DESKTOP_MIN = 1024
// A phone on its side, and the one shape this page does not try to be a screen
// in. The same query the landscape classes below are written against, asked
// here as well because what the gesture is read off follows from it: flowing,
// the wheel and the swipe are unbound and a passive scroll listener meters p in
// their place. Everything downstream of p — the give, the sweep, the caption —
// is the same on both sides of this line.
const SHORT_LAND = '(max-width: 1023.98px) and (orientation: landscape)'
// What the gesture does to the drawing. The points are all there at rest, the
// whole surface, bare and in muted grey; the scroll is what surveys it. A band
// travels through the field in the order it used to be swept in — u-row by
// u-row out of the corner on the laptop, outward from behind the name on a
// phone — and every point it passes is inked, from muted to the page's ink, and
// the station numbers are written in with it. The numbers alone were too quiet
// an answer to a gesture: eight-pixel grey type does not read as "keep going",
// a visibly moving front does. Ranked rather than read off the raw row or
// radius, so the front moves at an even rate: the laptop's fragment only has
// some of the rows on screen, and a sweep through the ones it cannot see would
// read as a scroll that did nothing. It is all the way through by
// SURVEY_FULL_AT, short of the commit, so the finished survey is a place you can
// stop in rather than something glimpsed on the way out. The front is
// SURVEY_FADE of the field deep: across it a point swells by up to INK_SWELL of
// its radius and settles back as it inks, which is what makes it a band rather
// than a line, and a number fades up over the same stretch.
const SURVEY_FULL_AT = 0.8
const SURVEY_FADE = 0.08
const INK_ALPHA = 0.9
const INK_SWELL = 0.9
const LABEL_ALPHA = 0.65
// The radial reveal, taken bare, grows as a perfect circle — a compass arc that
// reads as mechanical against a hand-plotted survey. So the frontier each point
// is measured against is bent: a smooth low-frequency wobble in the angle turns
// the circle into an organic blob, and a little per-point jitter feathers the
// edge so it dissolves into the field rather than ending on a clean line. Both
// are fixed per point, so the shape is stable and still grows outward as one.
const CC_EDGE_WOBBLE = 0.22
const CC_EDGE_JITTER = 0.06
const POINT_R = 0.7 // muted-ink station points, in CSS px
const LABEL_PX = 8 // the station numbers, in the mono voice
const LABEL_EVERY = 17 // only a sparse subset carry their number, survey-style
const LABEL_EVERY_FULL = 43 // sparser again on the dense full-bleed phone field
// The clear space a station number keeps around itself. Near the pinch the
// surface folds points onto each other, and every labelled one there printed its
// number over its neighbours' into a grey smudge that read as debug output.
// A number that would land inside another's box is not drawn; the dot still is.
const LABEL_GAP = 4
const TAU = Math.PI * 2
// A stable pseudo-random in [0,1) from an integer — the classic sine hash, used
// to feather the reveal edge without a per-render Math.random that would flicker.
const hash01 = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

export default function Home() {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  // How far the current gesture has accumulated toward the threshold, 0..1. One
  // value drives both the give and the survey sweep, so they read as one response.
  const [p, setP] = useState(0)
  // The transition time for the current change in p (see P_* above).
  const [pMs, setPMs] = useState(P_LIVE_MS)
  const [motionOk, setMotionOk] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  // Whether the page is flowing rather than filling the screen. Held in state
  // because what it changes is behaviour and not only paint: which listener
  // meters p, and the runway margin that gives that listener something to read.
  const [flowing, setFlowing] = useState(() => window.matchMedia(SHORT_LAND).matches)
  // Fire-once, so rapid wheel or a double tap cannot queue two navigations.
  const firedRef = useRef(false)
  const canvasRef = useRef(null)
  const nameRef = useRef(null)
  // Set by the survey effect; the progress effect calls it to retarget the sweep.
  const sweepToRef = useRef(null)
  // The authority on where the gesture currently sits, 0..1. p is the rendered
  // copy of it; this is the one the handlers add to and subtract from, because a
  // wheel event needs the value as of the last event, not as of the last render.
  // It has to live out here rather than inside the gesture effect: the mount and
  // bfcache resets below zero p, and a held position that did not zero with it
  // would leave the page looking untouched while one more notch departed.
  const progRef = useRef(0)
  const motionOkRef = useRef(motionOk)
  motionOkRef.current = motionOk

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMotionOk(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // A rotation crosses this line in either direction, and the two sides keep the
  // held position in different places — an accumulator one way, the scrollbar
  // the other. Neither can read the other's, so a turn mid-gesture would leave
  // the block lifted and the survey half-open with nothing able to walk them
  // back. Both are dropped on the way through, the scroll along with p, since a
  // page that arrives already scrolled would arrive already committed.
  useEffect(() => {
    const mq = window.matchMedia(SHORT_LAND)
    const apply = () => setFlowing(mq.matches)
    apply()
    const onChange = () => {
      apply()
      progRef.current = 0
      setP(0)
      window.scrollTo(0, 0)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Reset on every mount, and on a bfcache restore, so returning here with the
  // back button never shows the faded-out hero the handoff left behind. The
  // scroll goes back to the top with it: flowing, the scroll position *is* the
  // held position, and a browser that helpfully restores it would hand the page
  // back mid-departure, one notch from firing again. On every other shape the
  // page is exactly the viewport and this costs nothing.
  useEffect(() => {
    firedRef.current = false
    setLeaving(false)
    progRef.current = 0
    setP(0)
    setPMs(P_LIVE_MS)
    window.scrollTo(0, 0)
    const onShow = (e) => {
      if (!e.persisted) return
      firedRef.current = false
      setLeaving(false)
      progRef.current = 0
      setP(0)
      setPMs(P_LIVE_MS)
      window.scrollTo(0, 0)
    }
    window.addEventListener('pageshow', onShow)
    return () => window.removeEventListener('pageshow', onShow)
  }, [])

  // One handoff, however it was triggered. The momentum mark is set on both
  // paths — trackpad inertia outlives the gesture whether or not we animate — so
  // /work can swallow the tail of the wheel; see handoff.js. Under reduced
  // motion the animation is skipped and the navigation is immediate.
  const fire = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    markHandoff()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/work')
      return
    }
    setLeaving(true)
    window.setTimeout(() => navigate('/work'), LEAVE_MS)
  }, [navigate])

  // Move the held position to some fraction of the whole gesture and render it.
  // Commit is the top of the range rather than a separate test, so every path
  // into a departure — wheel, drag, scroll — goes through the same door. It sits
  // out here, above the effects, because there are now two effects that need it:
  // the accumulator's and the flowing page's scroll listener.
  const settle = useCallback(
    (next) => {
      const to = next < 0 ? 0 : next > 1 ? 1 : next
      if (to === progRef.current) return
      progRef.current = to
      if (to >= 1) {
        setPMs(P_COMPLETE_MS)
        setP(1)
        fire()
        return
      }
      setPMs(P_LIVE_MS)
      setP(to)
    },
    [fire]
  )

  /*
   * The flowing page's gesture: the scroll itself.
   *
   * The cover is sticky at the viewport's height with SCROLL_RUNWAY of empty
   * document under it (see the markup below), so scrolling moves the page
   * without moving the cover, and the scroll position is a metered gesture
   * already — 0 at the top, committed at the far end of the runway. It goes
   * through the same settle() the wheel does, so the give, the sweep and the
   * caption cannot tell which mode fed them, and at the end of the runway the
   * same fire() runs, once, on the same firedRef.
   *
   * Passive, and reading nothing but a cached number: the runway is measured on
   * resize rather than per event, so the frame that follows a scroll has one
   * division and a setState in it and nothing to allocate.
   */
  useEffect(() => {
    if (!flowing) return
    // The browser keeps a scroll position per history entry and replays it on a
    // traversal back into this page — and does it after React has mounted and
    // run its reset, which is why the reset alone cannot cover it. Everywhere
    // else that replay is a courtesy; here the scroll position is not state but
    // a gesture, and the one it saved is the finished one, so Back handed the
    // page back already committed and it departed again before it had finished
    // arriving. Switched off, then: set rather than put back on cleanup, since
    // the traversal it has to survive happens long after this effect is gone,
    // and there is nothing to give back, because the shell already sends every
    // route change to the top by hand.
    history.scrollRestoration = 'manual'
    // Off --app-h rather than innerHeight, because that is the height the
    // runway below is cut from; on iOS the two disagree by a toolbar, and p
    // would run past 1 or stop short of it.
    let runway = 1
    const remeasure = () => {
      const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-h'))
      runway = Math.max(1, (px || window.innerHeight) * SCROLL_RUNWAY)
    }
    const onScroll = () => settle(window.scrollY / runway)
    remeasure()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', remeasure)
    window.visualViewport?.addEventListener('resize', remeasure)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', remeasure)
      window.visualViewport?.removeEventListener('resize', remeasure)
    }
  }, [flowing, settle])

  // Wheel, touch and keyboard on the window. The wheel and the touch drag both
  // meter the progress the give and the survey read, so the phone gets the same
  // building transition the laptop does, and both run in both directions: /work
  // is still the only place this page goes, but how far along the way you are is
  // yours to set, and to undo. The keyboard and cue paths go straight to the
  // leave, with no sweep, because there is no gesture to meter.
  //
  // Except while the page is flowing, where these two are not registered at
  // all: there the same wheel and the same upward drag are already moving a
  // real document, and the effect above reads the resulting scroll position
  // instead. Counting the deltas as well would meter the gesture twice. The
  // keyboard keys stay, because they are a jump and not a scroll.
  useEffect(() => {
    // Both directions count. Down builds toward the handoff, up walks it back,
    // and nothing moves on its own in between: that is the whole of the control
    // the gesture offers. Stopping halfway holds the survey half-open and the
    // caption up for as long as it takes to read.
    const onWheel = (e) => {
      if (e.deltaY === 0) return
      settle(progRef.current + e.deltaY / WHEEL_THRESHOLD)
    }

    // The finger meters the same held position the wheel does, so a drag starts
    // from wherever the last one stopped rather than from rest. Without that
    // base a touch would snap the page back to zero the moment it landed, which
    // is the same lost-your-place problem the wheel had.
    let startY = null
    let startProg = 0
    const onTouchStart = (e) => {
      startY = e.touches[0]?.clientY ?? null
      startProg = progRef.current
    }
    const onTouchMove = (e) => {
      if (startY == null) return
      const up = startY - (e.touches[0]?.clientY ?? startY)
      settle(startProg + up / SWIPE_THRESHOLD)
      // A committed drag is done; anything further belongs to the leave.
      if (progRef.current >= 1) startY = null
    }
    const onTouchEnd = () => {
      // A lifted finger leaves the position exactly where the drag put it, the
      // same way a stopped wheel does. There is nothing to ease back to.
      startY = null
    }

    const onKeyDown = (e) => {
      if (!['ArrowDown', 'PageDown', 'End', ' '].includes(e.key)) return
      // Leave a focused control its own keys: Space presses the island's theme
      // button, Enter follows the cue link. The gesture is for when the page
      // itself has focus, not a control on it.
      const el = document.activeElement
      const tag = el?.tagName
      if (
        tag === 'BUTTON' ||
        tag === 'A' ||
        tag === 'INPUT' ||
        tag === 'SELECT' ||
        tag === 'TEXTAREA' ||
        el?.isContentEditable
      )
        return
      e.preventDefault()
      fire()
    }

    if (!flowing) {
      window.addEventListener('wheel', onWheel, { passive: true })
      window.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd, { passive: true })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fire, flowing, settle])

  /*
   * The survey on the cover.
   *
   * The projection is computed once, on mount and on resize, into a flat list of
   * canvas-space points — this is a static drawing redrawn on demand, not a
   * per-frame loop. The points are drawn whole throughout; the gesture moves the
   * front that inks and numbers them: `sweep` runs 0..1, carrying it from none of
   * the field to all of it, and a short tween carries it between targets so a
   * reversed scroll draws it back and completion snaps shut. The palette and
   * the mono face are read from the tokens, so the drawing flips with the theme.
   */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const size = { w: 0, h: 0 }
    let field = null
    let pal = null
    let sweep = motionOkRef.current ? 0 : 1
    let from = sweep
    let to = sweep
    let dur = 0
    let t0 = 0
    let raf = 0

    const readPalette = () => {
      const s = getComputedStyle(document.documentElement)
      return {
        point: s.getPropertyValue('--color-muted').trim() || '#6a707b',
        ink: s.getPropertyValue('--color-ink').trim() || '#16181d',
        mono: s.getPropertyValue('--font-mono').trim() || 'monospace',
      }
    }

    // The phone and the laptop frame the same maths differently, and survey it
    // in a different order: the laptop takes rows in order, the phone works
    // outward by radius. Each is chosen here off the viewport's size and shape.
    let fullField = false
    // Every point, sorted into the order the front reaches it, each with its
    // rank in that order as `key`, 0..1; and the labelled ones among them, in
    // the same order, so a number arrives with the ink on its own point.
    let order = []
    let labelled = []

    // The name's box, in the canvas's own pixels, so the survey can keep off the
    // type (and the probe can confirm it does). Both rects carry the same
    // give/leave transform, so subtracting the origins cancels it out.
    const nameBox = () => {
      const nb = nameRef.current?.getBoundingClientRect()
      const cb = cv.getBoundingClientRect()
      if (!nb || !cb) return null
      const pad = 16
      return { l: nb.left - cb.left - pad, t: nb.top - cb.top - pad, r: nb.right - cb.left + pad, b: nb.bottom - cb.top + pad }
    }
    const inBox = (q, box) => box && q.X > box.l && q.X < box.r && q.Y > box.t && q.Y < box.b

    const compute = () => {
      const { w, h } = size
      if (!w || !h) return
      // The centred full-bleed field is for the portrait column only. A phone on
      // its side is short and wide like the laptop, so it takes the laptop's
      // corner fragment; only an upright phone or tablet gets the centred field.
      fullField = w < DESKTOP_MIN && h >= w
      const view = fullField ? CC_HOME_VIEW_MOBILE : CC_HOME_VIEW
      const project = makeProjector(view.yaw, view.pitch)
      const flat = crossCap().map(project)
      const xs = flat.map((q) => q.px)
      const ys = flat.map((q) => q.py)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const k = (view.zoom * w) / Math.max(maxX - minX, maxY - minY)
      const ox = view.ax * w - ((minX + maxX) / 2) * k
      const oy = view.ay * h + ((minY + maxY) / 2) * k
      const bleed = 24
      // The station numbers, everywhere now — they are what says this is a
      // computed survey rather than a texture, and the phone wants that as much
      // as the laptop. A sparser subset carries one on the dense full-bleed field
      // (LABEL_EVERY_FULL) than on the laptop's small fragment, so it reads as
      // annotated rather than crowded.
      const showLabels = true
      const every = fullField ? LABEL_EVERY_FULL : LABEL_EVERY
      const placed = flat
        .map((q) => ({ row: q.row, id: q.id, X: ox + q.px * k, Y: oy - q.py * k }))
        .filter((q) => q.X > -bleed && q.X < w + bleed && q.Y > -bleed && q.Y < h + bleed)
        .map((q) => ({ ...q, label: showLabels && q.id % every === 0 }))
      // Each point's distance from the eye's centre, normalised, so the radial
      // reveal can grow the field outward from behind the name. The centre is
      // the anchor the cloud was placed on; the far corner sets the unit.
      const cx = view.ax * w
      const cy = view.ay * h
      let maxR = 1
      for (const q of placed) {
        q.rad = Math.hypot(q.X - cx, q.Y - cy)
        if (q.rad > maxR) maxR = q.rad
      }
      // q.rev is the fraction the sweep must reach to draw this point. It is the
      // normalised radius bent off a circle: divided by an angular wobble so the
      // frontier bulges and pinches like a natural outline, then nudged per point
      // so the edge feathers instead of ending on a line. Both are deterministic.
      for (const q of placed) {
        q.rad /= maxR
        const theta = Math.atan2(q.Y - cy, q.X - cx)
        const wobble =
          (CC_EDGE_WOBBLE *
            (Math.sin(3 * theta + 0.7) +
              0.6 * Math.sin(5 * theta + 2.1) +
              0.4 * Math.sin(7 * theta - 1.3))) /
          2
        q.rev = q.rad / (1 + wobble) + (hash01(q.id) - 0.5) * CC_EDGE_JITTER
      }
      field = placed
      // Ranked over what can be seen. The points behind the name are never
      // drawn, and on a phone that is nearly half the field and all of it at the
      // centre the front starts from, so ranking them too spent the first third
      // of the scroll inking nothing. They go to the head of the order at key 0
      // instead: if the give lifts the name off one, it shows already inked.
      const box = nameBox()
      order = [...placed].sort((a, b) => (fullField ? a.rev - b.rev : a.row - b.row || a.id - b.id))
      const seen = order.filter((q) => !inBox(q, box))
      for (const q of order) q.key = 0
      seen.forEach((q, i) => {
        q.key = i / Math.max(1, seen.length)
      })
      order = [...order.filter((q) => inBox(q, box)), ...seen]
      labelled = order.filter((q) => q.label)
    }

    const draw = () => {
      if (!field || !pal) return
      const { w, h } = size
      ctx.clearRect(0, 0, w, h)
      // How far the front has got: nowhere at rest, all the way by
      // SURVEY_FULL_AT. Reduced motion has no gesture to wait on, so the survey
      // is simply whole. `along` is how far past the front a point of a given
      // key sits, in front-depths: 0 or less is untouched, 1 or more is done.
      // Stretched so the last point is fully done at 1, not still settling.
      const lfrac = motionOkRef.current ? Math.min(1, sweep / SURVEY_FULL_AT) : 1
      const along = (key) => (lfrac * (1 + SURVEY_FADE) - key) / SURVEY_FADE

      const box = nameBox()
      let hits = 0

      ctx.fillStyle = pal.point
      ctx.globalAlpha = 0.9
      let drawn = 0
      const hidden = new Set()
      for (const q of field) {
        // The name is the one thing the survey may not cross. The framing keeps
        // the field in the corner; this is the guarantee the sparse tail never
        // lands on the type, at any size.
        if (inBox(q, box)) {
          hits++
          hidden.add(q)
          continue
        }
        drawn++
        ctx.beginPath()
        ctx.arc(q.X, q.Y, POINT_R, 0, TAU)
        ctx.fill()
      }
      // The ink, over the muted points the front has reached. Walked in front
      // order, so the first untouched point ends the walk.
      let inked = 0
      if (lfrac > 0) {
        ctx.fillStyle = pal.ink
        for (const q of order) {
          const a = along(q.key)
          if (a <= 0) break
          if (hidden.has(q)) continue
          const t = Math.min(1, a)
          inked++
          ctx.globalAlpha = INK_ALPHA * t
          ctx.beginPath()
          ctx.arc(q.X, q.Y, POINT_R * (1 + INK_SWELL * Math.sin(Math.PI * t)), 0, TAU)
          ctx.fill()
        }
        ctx.fillStyle = pal.point
      }
      let numbered = 0
      if (lfrac > 0) {
        ctx.font = `${LABEL_PX}px ${pal.mono}`
        ctx.textBaseline = 'alphabetic'
        // Every number is four digits in a monospace, so one width serves all.
        const lw = ctx.measureText('0000').width
        const taken = []
        // Walked in the order they are written in, so the clear-space test is
        // decided first-come: a number already on the page is never displaced by
        // one that arrives after it, and scrolling on only ever adds.
        for (const q of labelled) {
          const a = along(q.key)
          if (a <= 0) break
          if (hidden.has(q)) continue
          const l = q.X + 2.5 - LABEL_GAP
          const t = q.Y + 2 - LABEL_PX - LABEL_GAP
          const r = q.X + 2.5 + lw + LABEL_GAP
          const b = q.Y + 2 + LABEL_GAP
          if (taken.some((o) => l < o.r && r > o.l && t < o.b && b > o.t)) continue
          taken.push({ l, t, r, b })
          numbered++
          ctx.globalAlpha = LABEL_ALPHA * Math.min(1, a)
          ctx.fillText(String(q.id).padStart(4, '0'), q.X + 2.5, q.Y + 2)
        }
      }
      ctx.globalAlpha = 1

      if (import.meta.env.DEV) {
        cv.dataset.ccInked = String(inked)
        cv.dataset.ccNumbered = String(numbered)
        cv.dataset.ccDrawn = String(drawn)
        cv.dataset.ccNamehits = String(hits)
      }
    }

    const step = (now) => {
      const k = dur > 0 ? Math.min(1, (now - t0) / dur) : 1
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2 // easeInOutQuad
      sweep = from + (to - from) * e
      draw()
      raf = k < 1 ? requestAnimationFrame(step) : 0
    }
    // Retarget the sweep. Under reduced motion the survey is simply whole and
    // still; there is nothing to tween.
    const sweepTo = (target, ms) => {
      if (!motionOkRef.current) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
        sweep = 1
        draw()
        return
      }
      from = sweep
      to = target
      dur = ms
      t0 = performance.now()
      if (!raf) raf = requestAnimationFrame(step)
    }
    sweepToRef.current = sweepTo

    const measure = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (!w || !h) return
      size.w = w
      size.h = h
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      compute()
      draw()
    }

    pal = readPalette()
    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(cv)
    // Repaint on a theme flip: the tokens changed, the geometry did not.
    const repaint = () => {
      pal = readPalette()
      draw()
    }
    const themeObs = new MutationObserver(repaint)
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', repaint)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      sweepToRef.current = null
      ro.disconnect()
      themeObs.disconnect()
      scheme.removeEventListener('change', repaint)
    }
  }, [])

  // Feed p into the survey sweep, matched to the same timing the give moves on.
  // One line for both modes: by the time p arrives here it has forgotten whether
  // an accumulator or a scrollbar set it, which is the point of settle().
  useEffect(() => {
    sweepToRef.current?.(p, pMs)
  }, [p, pMs, motionOk])

  // Enter on the focused cue dispatches a click too, so this one handler
  // animates both the pointer and the keyboard; the Link keeps its href, so the
  // cue still navigates with JS off.
  const onCue = (e) => {
    e.preventDefault()
    fire()
  }

  // The give lifts the block toward the leave as p grows; reduced motion takes
  // none of it. At the leave the full lift-and-fade takes the transform over.
  // On the flowing page this rides on top of the sticky offset, which is what
  // makes the cover lift off its own pin rather than off the document.
  const give = motionOk ? GIVE_TRAVEL * p : 0

  /*
   * Lying down, three of these are the lock and all three come off. The
   * overflow clipped a page that is now taller than its box; the touch-action
   * gave the browser nothing to pan, which is what made a finger on this page
   * do nothing at all; and min-h-0, released in the shell, is what lets the
   * column grow instead of shrinking under its own content. What is left —
   * the centring, the padding, the island's clearance — is the same
   * composition, only with somewhere to go. The bottom padding is the
   * caption's room now that it stands in the flow rather than on the floor.
   *
   * And four more go on, which together pin the cover. flex-none gives the box
   * its height back: as a flex-1 item its main size came from the flex
   * algorithm, which sizes it to its content, and the cover wants to be exactly
   * the screen. h-[--app-h] is that screen, measured. sticky and top-0 pin it
   * there while the document goes past underneath. The runway it goes past is
   * the empty sibling after it, and it has to be a sibling: a sticky element is
   * held inside its containing block by its *margin* box, so a margin under this
   * one would add exactly as much document as it took away from the slack, and
   * the box would sit there refusing to stick with no error to explain itself.
   */
  return (
    <>
      <div
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 text-center [touch-action:pinch-zoom] max-lg:landscape:sticky max-lg:landscape:top-0 max-lg:landscape:h-[var(--app-h)] max-lg:landscape:flex-none max-lg:landscape:overflow-visible max-lg:landscape:pb-10 max-lg:landscape:pt-[76px] max-lg:landscape:[touch-action:auto]"
        style={{
          transition: leaving
            ? `opacity ${LEAVE_MS}ms ease, transform ${LEAVE_MS}ms ease`
            : `transform ${motionOk ? `${pMs}ms ease` : '0ms'}`,
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(-24px)' : `translateY(${-give}px)`,
        }}
      >
        {/* The survey, computed on the cross-cap and swept in by the gesture. A
            background field behind the type, running off the top and right edges;
            see the survey effect above and CC_HOME_VIEW for the framing.

            Inset to the box, which on the flowing page is now the pinned cover
            rather than the document: the explicit --app-h is what it used to take
            to keep the field off a page taller than its frame, and it stays
            because it says the thing the h-full beside it only implies — this
            drawing is framed for one screen, and it is the screen the name is
            on. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full max-lg:landscape:bottom-auto max-lg:landscape:h-[var(--app-h)]"
        />

        <div ref={nameRef} className="relative z-10 w-[min(560px,88vw)]">
          {/* The faded-paper halo. In the portrait full-bleed field the drawing
              runs through the whole page, so the name is given its own clearing: an
              ellipse of the page's own paper colour, opaque across the type and
              fading out past it, so the survey softly recedes around the name
              rather than leaving a hard rectangular hole. Paper, not white, so it
              flips with the theme. Portrait below the laptop only — landscape and
              the desktop both use the corner fragment, which never reaches the
              name, so it needs no clearing. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-10 -inset-y-14 -z-10 lg:hidden landscape:hidden"
            style={{
              background:
                'radial-gradient(ellipse at center, var(--color-paper) 55%, transparent 82%)',
            }}
          />
          {/* font-light, not lighter: Space Grotesk stops at 300, and asking for a
              weight it does not have just gets 300 with the browser guessing. */}
          <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.03] tracking-[-0.024em]">
            Charles Abi Chahine
          </h1>
          <p className="mt-3.5 font-mono text-[0.72rem] lowercase tracking-[0.08em] text-soft">
            architect · computational designer
          </p>
          {/* The one sentence on the cover, so it is set as one: the serif here is
              what tells you the rest of the site has writing in it. Balanced,
              because on a phone it broke with "built." alone on the last line. */}
          <p className="mt-5 text-balance font-serif text-[clamp(0.95rem,1.2vw,1.05rem)] leading-[1.6] text-soft">
            {summary}
          </p>
          {/* The cue is the handoff made visible and the handoff made a link: a
              real anchor to /work, so it reads as a link and works with JS off,
              with the animated leave grafted onto its activation. The count is
              read from the data, never typed. The rule under it is the same mark
              the belts used to hang from. */}
          <Link
            to="/work"
            onClick={onCue}
            className={`mx-auto mt-9 block w-fit border-t border-line pt-3 text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${MONO}`}
          >
            Scroll · {projects.length} projects ↓
          </Link>
        </div>

        {/* The survey's caption: the surface's own equations, the ones
            crosscap.js plots and the printed cover carries, with the board's
            defaults substituted (d = 1/2, e = 2). It rides the same p the give
            and the sweep read, so starting to scroll surfaces it above the
            footer and scrolling back up takes it down again, as one response.
            Since p is held rather than timed, a scroll stopped partway leaves it
            standing: this is the one thing on the page that wants to be read
            rather than glanced at, and it now gets as long as that takes.
            Reduced motion shows the survey whole and still, so the caption is
            simply there. Hidden from readers: the canvas it annotates is too,
            and spoken symbol soup serves nobody.

            On the flowing page it is metered the same way, off the same p, and
            only its position changes: it drops out of the floor and into the flow
            under the name, where a caption on a page that scrolls belongs. It
            rides down with the pinned cover, so the scroll that raises it is also
            the scroll that keeps it in front of you while it is raised.

            Set in the mono's italic rather than its upright, and in accent rather
            than muted: the same voice the site labels things in, leaning, which is
            the difference between a caption printed on the drawing and a note
            worked out beside it.

            The domain is written 0 ≤ u, v ≤ π rather than u, v ∈ [0, π], and that
            is a typesetting constraint rather than a preference. Text faces carry
            about a dozen math operators and no set theory: there is no ∈ in Plex,
            in Spectral, in Space Grotesk, or in STIX Two Text. The upright mono
            was therefore quietly borrowing the system's ∈ and π every time this
            line drew, one or two glyphs in a face nobody chose, sitting in the
            middle of a formula. The two forms say the same thing, and this one
            the site can actually set: ≤ and π both come from the italic's subset,
            which is built for exactly this line (see index.css).

            Tracking is gone — it belongs on the labels this borrows its face
            from, not on a formula, where it pushes the operators away from their
            operands — and the size is back near the mono's floor now that a
            handwriting face is not setting it.

            Each clause is its own nowrap span, because on a phone this wrapped
            wherever the width ran out and put the back half of y = a·sin 2u·sin²v
            on the next line, which is not a formula any more. The only breaks left
            are at the separators, and a separator stays with the clause it follows
            rather than leading the next line. */}
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-0 right-0 px-4 font-mono text-[0.6875rem] italic text-accent max-lg:landscape:static max-lg:landscape:mt-11"
          style={{
            opacity: motionOk ? Math.min(1, p / 0.7) : 1,
            transition: motionOk ? `opacity ${pMs}ms ease` : 'none',
          }}
        >
          <span className="whitespace-nowrap">0 ≤ u, v ≤ π ·</span>{' '}
          <span className="whitespace-nowrap">x = ½a·sin u·sin 2v ·</span>{' '}
          <span className="whitespace-nowrap">y = a·sin 2u·sin²v ·</span>{' '}
          <span className="whitespace-nowrap">z = a·cos 2u·sin²v ·</span>{' '}
          <span className="whitespace-nowrap">a = 60</span>
        </p>
      </div>

      {/* The runway. Empty page under the pinned cover, and the only thing on
          this route that exists to be scrolled rather than read: its height is
          the distance to a departure, so p is nothing more than how much of it
          has gone by. Rendered only in the one mode that has it, which is also
          why the wheel and the desktop see no change here at all — there is no
          node, not a hidden one. The footer follows it, at the end of the
          document, where the departure usually fires before anyone arrives. */}
      {flowing && (
        <div
          aria-hidden="true"
          className="shrink-0"
          style={{ height: `calc(var(--app-h) * ${SCROLL_RUNWAY})` }}
        />
      )}
    </>
  )
}
