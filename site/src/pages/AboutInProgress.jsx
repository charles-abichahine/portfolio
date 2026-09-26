const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em]'

/*
 * TEMPORARY: what /about shows while the page is rethought.
 *
 * The biography and the contacts moved to /contact, and what is left of /about
 * (the fold, the places, the year rail) is being reworked into an exhibit of its
 * own. Until that lands, the nav item stays and leads here rather than to a page
 * still carrying a bio it no longer owns. About.jsx is kept, unrouted;
 * pointing the route back at it in routes.jsx restores it.
 */
export default function AboutInProgress() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-28">
      <div className="max-w-[44ch] text-center">
        <p className={`${MONO} mb-4 text-muted`}>Traces</p>
        <h1 className="text-[clamp(1.6rem,2.6vw,2.15rem)] font-light leading-[1.2] tracking-[-0.015em] text-ink">
          In progress
        </h1>
        <p className="mt-4 text-balance font-serif text-[1.02rem] leading-[1.7] text-soft">
          This page is being redrawn. The work is all here in the meantime.
        </p>
      </div>
    </div>
  )
}
