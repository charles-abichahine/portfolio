import { asset } from '../data/projects.js'

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
 */
export default function MediaFrame({ item, title, className = 'max-h-full max-w-full' }) {
  if (item.kind === 'loop') {
    const stem = item.src.replace(/\.webm$/, '')
    return (
      <video
        // Keyed, or React reuses the element between items and swapping
        // <source> children does not reload a video.
        key={item.src}
        autoPlay
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
      src={asset(item.src)}
      alt={item.caption || title}
      className={`${className} object-contain`}
    />
  )
}
