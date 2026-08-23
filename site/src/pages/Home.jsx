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
 * This replaced a two-screen landing whose second screen was a canvas strand
 * field fanning down into four columns of project cards. Those cards live in
 * full on /work; the drawing (DataField) is gone, recoverable from git.
 */

// The site's floor for anything set in this voice: the role line and the cue.
const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em]'

// The wheel intent the handoff needs, and the window it must arrive in. Tuned
// for a deliberate scroll rather than a graze: roughly three notches of a wheel,
// or a sustained trackpad push, has to land inside one window — a single flick
// no longer departs. The window is a shade wider so a slower, considered scroll
// still accumulates before it resets; stray single ticks decay between windows
// rather than adding up into an accidental departure.
const WHEEL_THRESHOLD = 320
const WHEEL_WINDOW_MS = 500

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

// The timing p moves on: quick while the gesture is live, the give's own ease
// back when it lapses, a short snap to shut the survey as the leave begins. The
// give reads these through a CSS transition, the survey through a matched tween.
const P_LIVE_MS = 90
const P_LAPSE_MS = 250
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
// At rest this fraction of the u-rows is drawn: a partial survey, visibly still
// computing. The sweep fills it from here to whole as p reaches 1.
const REST_ROWS = 0.12
const POINT_R = 0.7 // muted-ink station points, in CSS px
const LABEL_PX = 8 // the station numbers, in the mono voice
const LABEL_EVERY = 17 // only a sparse subset carry their number, survey-style
const TAU = Math.PI * 2

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
  // Fire-once, so rapid wheel or a double tap cannot queue two navigations.
  const firedRef = useRef(false)
  const canvasRef = useRef(null)
  const nameRef = useRef(null)
  // Set by the survey effect; the progress effect calls it to retarget the sweep.
  const sweepToRef = useRef(null)
  const motionOkRef = useRef(motionOk)
  motionOkRef.current = motionOk

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setMotionOk(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Reset on every mount, and on a bfcache restore, so returning here with the
  // back button never shows the faded-out hero the handoff left behind.
  useEffect(() => {
    firedRef.current = false
    setLeaving(false)
    setP(0)
    setPMs(P_LIVE_MS)
    const onShow = (e) => {
      if (!e.persisted) return
      firedRef.current = false
      setLeaving(false)
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

  // Wheel, touch and keyboard on the window. Only downward wheel and upward
  // swipes count: up is not a direction this page can go. The wheel and the
  // touch drag both meter the progress the give and the survey read, so the
  // phone gets the same building transition the laptop does; the keyboard and
  // cue paths go straight to the leave, with no sweep, because there is no
  // gesture to meter.
  useEffect(() => {
    let acc = 0
    let lapse = 0
    const clearLapse = () => {
      if (lapse) {
        window.clearTimeout(lapse)
        lapse = 0
      }
    }
    // A whole window with no wheel means the gesture was abandoned: ease the
    // survey back to its rest fraction and start the accumulation fresh.
    const armLapse = () => {
      clearLapse()
      lapse = window.setTimeout(() => {
        acc = 0
        setPMs(P_LAPSE_MS)
        setP(0)
      }, WHEEL_WINDOW_MS)
    }

    const onWheel = (e) => {
      if (e.deltaY <= 0) return
      acc += e.deltaY
      if (acc >= WHEEL_THRESHOLD) {
        clearLapse()
        setPMs(P_COMPLETE_MS)
        setP(1)
        fire()
        return
      }
      setPMs(P_LIVE_MS)
      setP(acc / WHEEL_THRESHOLD)
      armLapse()
    }

    let startY = null
    const onTouchStart = (e) => {
      startY = e.touches[0]?.clientY ?? null
    }
    const onTouchMove = (e) => {
      if (startY == null) return
      const up = startY - (e.touches[0]?.clientY ?? startY)
      // Only an upward drag builds; a downward one holds the block at rest.
      if (up <= 0) {
        setPMs(P_LIVE_MS)
        setP(0)
        return
      }
      if (up >= SWIPE_THRESHOLD) {
        setPMs(P_COMPLETE_MS)
        setP(1)
        fire()
        startY = null
        return
      }
      setPMs(P_LIVE_MS)
      setP(up / SWIPE_THRESHOLD)
    }
    const onTouchEnd = () => {
      // A lifted finger short of the threshold is an abandoned gesture: ease the
      // give and the survey back the way an abandoned wheel does. startY is
      // already null once a drag has fired, so a committed one is left alone.
      if (startY == null) return
      startY = null
      setPMs(P_LAPSE_MS)
      setP(0)
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

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearLapse()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fire])

  /*
   * The survey on the cover.
   *
   * The projection is computed once, on mount and on resize, into a flat list of
   * canvas-space points — this is a static drawing redrawn on demand, not a
   * per-frame loop. The gesture sweeps it: `sweep` runs 0..1, drawing u-rows from
   * the rest fraction to whole, and a short tween carries it between targets so a
   * lapse eases back and completion snaps shut. The palette and the mono face are
   * read from the tokens, so the drawing flips with the theme.
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

    const compute = () => {
      const { w, h } = size
      if (!w || !h) return
      const project = makeProjector(CC_HOME_VIEW.yaw, CC_HOME_VIEW.pitch)
      const flat = crossCap().map(project)
      const xs = flat.map((q) => q.px)
      const ys = flat.map((q) => q.py)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const k = (CC_HOME_VIEW.zoom * w) / Math.max(maxX - minX, maxY - minY)
      const ox = CC_HOME_VIEW.ax * w - ((minX + maxX) / 2) * k
      const oy = CC_HOME_VIEW.ay * h + ((minY + maxY) / 2) * k
      const bleed = 24
      // Numbers become noise at phone size; below sm the survey is points alone.
      const showLabels = w >= 640
      field = flat
        .map((q) => ({ row: q.row, id: q.id, X: ox + q.px * k, Y: oy - q.py * k }))
        .filter((q) => q.X > -bleed && q.X < w + bleed && q.Y > -bleed && q.Y < h + bleed)
        .map((q) => ({ ...q, label: showLabels && q.id % LABEL_EVERY === 0 }))
    }

    const draw = () => {
      if (!field || !pal) return
      const { w, h } = size
      ctx.clearRect(0, 0, w, h)
      const rows = motionOkRef.current
        ? Math.round((REST_ROWS + (1 - REST_ROWS) * sweep) * CC.U)
        : CC.U

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
        if (q.row >= rows) continue
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
        cv.dataset.ccRows = String(rows)
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
  const give = motionOk ? GIVE_TRAVEL * p : 0

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 text-center [touch-action:pinch-zoom]"
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
          see the survey effect above and CC_HOME_VIEW for the framing. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      <div ref={nameRef} className="relative z-10 w-[min(560px,88vw)]">
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
    </div>
  )
}
