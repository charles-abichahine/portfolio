import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { projects } from '../data/projects.js'
import { summary } from '../data/cv.js'
import { markHandoff } from '../handoff.js'
import { CC, crossCap, makeProjector } from '../lib/crosscap.js'

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
 * is answered while it accumulates. One progress value p, the wheel's fraction of
 * the threshold, drives two things: the whole block gives a little in the
 * direction it is about to leave, and the cross-cap survey in the corner sweeps
 * itself in u-row by u-row, the same drawing the printed portfolio's cover
 * carries, off the same equations (src/lib/crosscap.js). Both are wheel only; the
 * keyboard and the cue have no gesture to meter, so they go straight to the leave.
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
 * document — and the departure gesture is simply switched off, because a scroll
 * cannot be both the way down a page and the way off it. The cue and the
 * keyboard still go to /work; they never needed the gesture. With nothing left
 * to meter, the survey is drawn whole and the caption stands at full opacity,
 * which is the state the reduced-motion path already asks for.
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
// here as well because three things that are not layout follow from it: the
// wheel and the swipe are unbound, the survey is drawn whole, and the caption
// stops reading a progress it can no longer be given.
const SHORT_LAND = '(max-width: 1023.98px) and (orientation: landscape)'
// What is drawn at rest, and what the gesture opens toward whole. On the laptop
// it is a fraction of the u-rows, drawn in order — the fan grows out of the
// corner as the wheel turns. On a phone it is a fraction of the field's RADIUS:
// at rest a bloom sits behind the name, and the gesture pushes the frontier
// outward to the edges, so the field visibly grows the way the laptop's does,
// only from the centre rather than a corner — and symmetric, so it never sits
// lopsided. Area goes as the square of the radius, so 0.55 → 1 more than triples
// what is drawn: the reason the phone transition now reads as strongly as it does.
const REST_ROWS = 0.12
const REST_RADIUS_MOBILE = 0.55
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
  // because what it changes is behaviour and not only paint: the listeners the
  // gesture registers, and what the survey and the caption are shown at.
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

  // Turning the phone on its side mid-gesture would otherwise leave the block
  // lifted and the survey half-open on a page that no longer has a gesture to
  // walk either of them back, so the held position is dropped on the way in.
  useEffect(() => {
    const mq = window.matchMedia(SHORT_LAND)
    const apply = () => {
      setFlowing(mq.matches)
      if (mq.matches) {
        progRef.current = 0
        setP(0)
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Reset on every mount, and on a bfcache restore, so returning here with the
  // back button never shows the faded-out hero the handoff left behind.
  useEffect(() => {
    firedRef.current = false
    setLeaving(false)
    progRef.current = 0
    setP(0)
    setPMs(P_LIVE_MS)
    const onShow = (e) => {
      if (!e.persisted) return
      firedRef.current = false
      setLeaving(false)
      progRef.current = 0
      setP(0)
      setPMs(P_LIVE_MS)
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

  // Wheel, touch and keyboard on the window. The wheel and the touch drag both
  // meter the progress the give and the survey read, so the phone gets the same
  // building transition the laptop does, and both run in both directions: /work
  // is still the only place this page goes, but how far along the way you are is
  // yours to set, and to undo. The keyboard and cue paths go straight to the
  // leave, with no sweep, because there is no gesture to meter.
  //
  // Except while the page is flowing, where the two metered paths are not
  // registered at all: there a wheel and an upward drag are how the visitor
  // reads the rest of the page, and a scroll that both moved the document and
  // built toward leaving it would be neither gesture done properly. The
  // keyboard keys stay, because they are a jump and not a scroll.
  useEffect(() => {
    // Move the held position by some fraction of the whole gesture and render
    // it. Commit is the top of the range rather than a separate test, so every
    // path into a departure — wheel, drag — goes through the same door.
    const settle = (next) => {
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
    }

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
  }, [fire, flowing])

  /*
   * The survey on the cover.
   *
   * The projection is computed once, on mount and on resize, into a flat list of
   * canvas-space points — this is a static drawing redrawn on demand, not a
   * per-frame loop. The gesture sweeps it: `sweep` runs 0..1, drawing u-rows from
   * the rest fraction to whole, and a short tween carries it between targets so a
   * reversed scroll draws back down and completion snaps shut. The palette and
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
        mono: s.getPropertyValue('--font-mono').trim() || 'monospace',
      }
    }

    // The phone and the laptop frame the same maths differently, and read the
    // gesture differently: the laptop sweeps rows in order, the phone grows the
    // field out by radius. Each is chosen here off the viewport's size and shape.
    let restFrac = REST_ROWS
    let fullField = false
    const compute = () => {
      const { w, h } = size
      if (!w || !h) return
      // The centred full-bleed field is for the portrait column only. A phone on
      // its side is short and wide like the laptop, so it takes the laptop's
      // corner fragment; only an upright phone or tablet gets the centred field.
      fullField = w < DESKTOP_MIN && h >= w
      const view = fullField ? CC_HOME_VIEW_MOBILE : CC_HOME_VIEW
      restFrac = fullField ? REST_RADIUS_MOBILE : REST_ROWS
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
    }

    const draw = () => {
      if (!field || !pal) return
      const { w, h } = size
      ctx.clearRect(0, 0, w, h)
      // How far the reveal has opened now: the rest fraction, carried toward
      // whole by the sweep. The laptop reads it as a row count, the full-bleed
      // field as a radius (see the per-point test below).
      const frac = motionOkRef.current ? restFrac + (1 - restFrac) * sweep : 1
      const revealed = Math.round(frac * CC.U)

      // The name's box, in the canvas's own pixels, so the probe (and the eye)
      // can confirm the survey stays off the type. Both rects carry the same
      // give/leave transform, so subtracting the origins cancels it out.
      let box = null
      let hits = 0
      const nb = nameRef.current?.getBoundingClientRect()
      const cb = cv.getBoundingClientRect()
      const pad = 16
      if (nb && cb)
        box = { l: nb.left - cb.left - pad, t: nb.top - cb.top - pad, r: nb.right - cb.left + pad, b: nb.bottom - cb.top + pad }

      ctx.fillStyle = pal.point
      ctx.globalAlpha = 0.9
      let drawn = 0
      const labels = []
      for (const q of field) {
        // The full-bleed field grows by radius from the centre; the laptop's
        // fragment fills row by row from its corner.
        const shown = fullField ? q.rev <= frac : q.row < revealed
        if (!shown) continue
        // The name is the one thing the survey may not cross. The framing keeps
        // the field in the corner; this is the guarantee the sparse tail never
        // lands on the type, at any size.
        if (box && q.X > box.l && q.X < box.r && q.Y > box.t && q.Y < box.b) {
          hits++
          continue
        }
        drawn++
        ctx.beginPath()
        ctx.arc(q.X, q.Y, POINT_R, 0, TAU)
        ctx.fill()
        if (q.label) labels.push(q)
      }
      if (labels.length) {
        ctx.font = `${LABEL_PX}px ${pal.mono}`
        ctx.globalAlpha = 0.65
        ctx.textBaseline = 'alphabetic'
        for (const q of labels) ctx.fillText(String(q.id).padStart(4, '0'), q.X + 2.5, q.Y + 2)
      }
      ctx.globalAlpha = 1

      if (import.meta.env.DEV) {
        cv.dataset.ccRows = String(revealed)
        cv.dataset.ccTotal = String(CC.U)
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
  // Flowing, there is no p worth reading: the survey is opened whole and held
  // there, the same still state reduced motion is given, so the drawing is
  // finished rather than waiting on a gesture the page no longer offers.
  useEffect(() => {
    sweepToRef.current?.(flowing ? 1 : p, flowing ? 0 : pMs)
  }, [p, pMs, motionOk, flowing])

  // Enter on the focused cue dispatches a click too, so this one handler
  // animates both the pointer and the keyboard; the Link keeps its href, so the
  // cue still navigates with JS off.
  const onCue = (e) => {
    e.preventDefault()
    fire()
  }

  // The give lifts the block toward the leave as p grows; reduced motion takes
  // none of it, and neither does the flowing page, which has no p. At the leave
  // the full lift-and-fade takes the transform over.
  const give = motionOk && !flowing ? GIVE_TRAVEL * p : 0

  return (
    /*
     * Lying down, three of these are the lock and all three come off. The
     * overflow clipped a page that is now taller than its box; the touch-action
     * gave the browser nothing to pan, which is what made a finger on this page
     * do nothing at all; and min-h-0, released in the shell, is what lets the
     * column grow instead of shrinking under its own content. What is left —
     * the centring, the padding, the island's clearance — is the same
     * composition, only with somewhere to go. The bottom padding is the
     * caption's room now that it stands in the flow rather than on the floor.
     */
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 text-center [touch-action:pinch-zoom] max-lg:landscape:overflow-visible max-lg:landscape:pb-10 max-lg:landscape:pt-[76px] max-lg:landscape:[touch-action:auto]"
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

          Inset to the box everywhere but on the flowing page, where the box is
          the whole document and a field stretched down it would be a texture
          rather than a drawing. There it is cut to one viewport height and
          stays behind the first screen, which is the screen it was framed for:
          the corner fragment belongs to the name, and the name is up there. */}
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
          Charles Abi Chahine<span className="text-accent">.</span>
        </h1>
        <p className="mt-3.5 font-mono text-[0.72rem] lowercase tracking-[0.08em] text-soft">
          architect · computational designer
        </p>
        {/* The one sentence on the cover, so it is set as one: the serif here is
            what tells you the rest of the site has writing in it. */}
        <p className="mt-5 font-serif text-[clamp(0.95rem,1.2vw,1.05rem)] leading-[1.6] text-soft">
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

          On the flowing page it is neither held to the floor nor metered: it
          drops into the flow under the name, where a caption on a page that
          scrolls belongs, and it is simply present, because the drawing it
          annotates is already whole.

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
          opacity: motionOk && !flowing ? Math.min(1, p / 0.7) : 1,
          transition: motionOk && !flowing ? `opacity ${pMs}ms ease` : 'none',
        }}
      >
        <span className="whitespace-nowrap">0 ≤ u, v ≤ π ·</span>{' '}
        <span className="whitespace-nowrap">x = ½a·sin u·sin 2v ·</span>{' '}
        <span className="whitespace-nowrap">y = a·sin 2u·sin²v ·</span>{' '}
        <span className="whitespace-nowrap">z = a·cos 2u·sin²v ·</span>{' '}
        <span className="whitespace-nowrap">a = 60</span>
      </p>
    </div>
  )
}
