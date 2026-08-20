import { useEffect, useState } from 'react'
import { asset, imgSrcSet } from '../data/projects.js'

// Live, not read once: the setting can be changed with the card open, and the
// same query is what /work's index already listens to.
function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduce(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduce
}

/*
 * One piece of gallery media, contained and never cropped.
 *
 * The cover can be cropped, and is, on the index. The evidence cannot: it is
 * SHAP plots, correlation matrices, Kohonen maps and pipeline diagrams, at
 * aspect ratios from 0.55 to 3.65, and a crop of a chart is a lie. So the frame
 * around it is fixed and the media sits inside at whatever shape it is.
 *
 * The bounds come in from outside because the same item is drawn twice: inside
 * the card, where it is capped by a 760x440 well, and full size, where it is
 * capped by the viewport.
 *
 * `sizes` comes in with them and for the same reason. A still in the card well
 * is never wider than 760px, which is what the 960 variant is for; the viewer
 * behind it wants the original, and gets it by leaving sizes at its 100vw
 * default so the widest candidate is the one that wins. One prop, two answers,
 * rather than two components that would then have to be kept in step.
 */
export default function MediaFrame({
  item,
  title,
  className = 'max-h-full max-w-full',
  sizes = '100vw',
}) {
  // A loop is decoration that moves on its own, so it is the one thing here a
  // reduced-motion setting is actually about. /work's hover covers already gate
  // on this and simply never mount; a gallery item cannot do that, because it is
  // the piece of evidence you stepped to. So it keeps its poster and gains the
  // controls it never needed while it was autoplaying: still there, still
  // playable, just not moving until it is asked to. The 'video' kind below is
  // already user-started and is left alone.
  const still = useReducedMotion()

  if (item.kind === 'loop') {
    const stem = item.src.replace(/\.webm$/, '')
    return (
      <video
        // Keyed, or React reuses the element between items and swapping
        // <source> children does not reload a video.
        key={item.src}
        autoPlay={!still}
        controls={still}
        muted
        loop
        playsInline
        poster={asset(item.poster)}
        aria-label={item.caption || title}
        className={className}
      >
        <source src={asset(item.src)} type="video/webm" />
        <source src={asset(`${stem}.mp4`)} type="video/mp4" />
      </video>
    )
  }

  if (item.kind === 'video') {
    // A real poster, extracted from the video itself, rather than the #t=0.1
    // media fragment this used to lean on. That trick asked the browser to seek
    // a tenth of a second in so the frame was not black, which meant fetching
    // and decoding video before anything could be seen, and Safari and Firefox
    // honour the fragment inconsistently. A still is 9 to 33KB and always shows.
    return (
      <video
        key={item.src}
        src={asset(item.src)}
        poster={asset(item.poster)}
        controls
        muted
        playsInline
        preload="none"
        aria-label={item.caption || title}
        className={className}
      />
    )
  }

  return (
    <img
      key={item.src}
      {...imgSrcSet(item.src, sizes)}
      alt={item.caption || title}
      className={`${className} object-contain`}
    />
  )
}
