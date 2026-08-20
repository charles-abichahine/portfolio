import { useEffect, useRef } from 'react'
import MediaFrame from './MediaFrame.jsx'

/*
 * The current gallery item at the size the screen can actually give it.
 *
 * Every one of the 76 media items is drawn below its native size in the card:
 * 54% on average, and 31% for the 990x1400 drawing spreads, which is not a size
 * anyone can read a plot at. The card is for browsing the work; this is for
 * looking at it.
 *
 * It sits above the card rather than replacing it, so closing returns you to the
 * same item in the same gallery. Stepping works here too, which is the point of
 * putting the arrows in: once someone is reading at full size they should not
 * have to drop back to the card to see the next one.
 */
export default function MediaLightbox({ items, at, onStep, onClose, title, color }) {
  const item = items[at]
  const many = items.length > 1
  const boxRef = useRef(null)
  const returnTo = useRef(null)

  useEffect(() => {
    returnTo.current = document.activeElement
    boxRef.current?.focus()

    // Capture phase, and it stops there. ProjectOverlay listens for Escape on
    // document as well, so without stopping the event one keypress would close
    // this and the card underneath it in the same breath. A capture listener on
    // document runs before that bubble listener, which is what makes this work.
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      returnTo.current?.focus?.()
    }
  }, [onClose])

  const arrow =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[10px] border border-line bg-paper/85 text-ink transition-colors hover:border-[var(--c)] hover:text-[var(--c)]'

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title}, full size`}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6 outline-none lg:p-10"
      style={{ '--c': color }}
    >
      {/* Nearly opaque, unlike the card's backdrop: the card is meant to sit over
          a recognisable index, and this is meant to leave nothing to look at but
          the one image. */}
      <button
        type="button"
        aria-label="Close full size"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-zoom-out bg-paper/95 backdrop-blur-xl"
      />

      <div className="relative flex min-h-0 w-full items-center justify-center">
        <MediaFrame
          item={item}
          title={title}
          className="max-h-[calc(100vh-10rem)] max-w-full"
        />
      </div>

      <div className="relative mt-4 flex w-full max-w-[1000px] shrink-0 items-start gap-6">
        <div className="min-w-0">
          <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.13em] text-[var(--c)]">
            {item.section}
          </p>
          {item.caption && (
            <p className="mt-1 font-serif text-[0.92rem] leading-[1.5] text-soft">{item.caption}</p>
          )}
        </div>
        {many && (
          <span className="ml-auto shrink-0 font-mono text-[0.62rem] tabular-nums tracking-[0.11em] text-muted">
            {String(at + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="label-mono absolute right-6 top-6 z-10 rounded-[8px] border border-line bg-paper/85 px-2.5 py-1.5 text-muted transition-colors hover:border-accent hover:text-accent lg:right-10 lg:top-10"
      >
        Close ✕
      </button>

      {many && (
        <>
          <button
            type="button"
            onClick={() => onStep(-1)}
            aria-label="Previous image"
            className={`${arrow} left-4 lg:left-8`}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onStep(1)}
            aria-label="Next image"
            className={`${arrow} right-4 lg:right-8`}
          >
            →
          </button>
        </>
      )}
    </div>
  )
}
