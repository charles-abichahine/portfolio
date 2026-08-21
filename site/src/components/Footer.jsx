import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { contact, role } from '../data/cv.js'
import { normalize } from '../documentMeta.js'

/*
 * One footer, on every route.
 *
 * There were four. The CV had this one, inset to max-w-6xl with a rule above it;
 * the landing, /work and /about each had their own, full width and rule-less,
 * with five different identity lines between them, and /about's was not a
 * <footer> element at all, so that page had no contentinfo landmark. The
 * booklet link lived inside /work's private footer despite belonging to the
 * whole site.
 *
 * Three zones. The identity is flush left and the contact links flush right,
 * both hard against the page edge rather than inset, because these pages are
 * full bleed and an inset footer under a full-bleed page reads as a different
 * component. The middle belongs to the page: see FooterSlot.
 *
 * A band, not an overlay. The landing and /about are drawings, and a transparent
 * footer over them means text on an unpredictable ground; the band gives the
 * type a floor to stand on and ends the page deliberately.
 */
/* Same voice as the island, and now the same size: the band was one step down
   at 0.56rem, which put the identity line and whatever file a page hangs in the
   slot at 8.96px. The band is quieter than the island by colour instead, which
   is where the difference belonged anyway — muted or soft at rest, ink for the
   one you are on, accent under the cursor. */
const MONO = 'chrome-label text-[0.6875rem]'


/*
 * The three contacts as marks rather than words.
 *
 * "Email LinkedIn GitHub" set in this voice is 170px, and on a phone it shared
 * a 327px row with the identity, which wanted 178px of it. Something had to
 * give and it was the copyright and the role. As marks the same three take 92px
 * and the whole line goes back.
 *
 * Drawn here rather than pulled from an icon package: three glyphs is not worth
 * a dependency, and a package would also be a second place for the site's
 * colours to come from. All three are single filled paths in currentColor, so
 * they inherit the band's muted-to-accent states like the text did.
 *
 * The envelope carries its fold as a hole rather than a second stroke — one
 * path, evenodd, so it stays a solid mark at the weight the two brand glyphs
 * set. Stroking it instead put a lighter drawing next to two heavier ones.
 */
const MARKS = [
  {
    key: 'email',
    label: 'Email',
    // mailto stays in the tab it was clicked from; the two profiles do not.
    href: (c) => `mailto:${c.email}`,
    away: false,
    d: 'M2.4 4h19.2A2.4 2.4 0 0 1 24 6.4v11.2a2.4 2.4 0 0 1-2.4 2.4H2.4A2.4 2.4 0 0 1 0 17.6V6.4A2.4 2.4 0 0 1 2.4 4Zm.7 3.05v1.5L12 14.6l8.9-6.05v-1.5L12 13.1Z',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: (c) => c.linkedin,
    away: true,
    d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    key: 'github',
    label: 'GitHub',
    href: (c) => c.github,
    away: true,
    d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
]

/* A 24px box around a 14px mark: the drawing stays as quiet as the type it sits
   beside, while the target stays big enough to hit with a thumb. The box only
   has to stay square while the mark is alone in it, so the width is a minimum
   rather than a fixed 24px, and the name that appears at lg widens it. */
const LINK =
  `${MONO} flex h-6 min-w-6 items-center justify-center gap-1.5 rounded-[7px] text-muted transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:px-1`

/*
 * The three contacts, as a row of marks. Exported because /about takes them out
 * of the band and sets them under its own text, where a page about the person
 * is the right place to offer a way to reach him: the paths, the states and the
 * target size are defined once here and the two callers share them.
 */
export function ContactMarks({ className = '', named = false }) {
  return (
    <nav aria-label="Contact" className={`flex gap-0.5 ${named ? 'gap-2.5' : ''} ${className}`}>
      {MARKS.map((m) => (
        <a
          key={m.key}
          className={LINK}
          aria-label={m.label}
          href={m.href(contact)}
          {...(m.away ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          <Mark d={m.d} />
          {named && <span className={MONO}>{m.label}</span>}
        </a>
      ))}
    </nav>
  )
}

function Mark({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden="true" className="h-[14px] w-[14px]">
      <path d={d} />
    </svg>
  )
}

export default function Footer({ slotRef }) {
  const bandRef = useRef(null)
  /*
   * /about carries the contacts in its own text, so the band there is the
   * identity and nothing else. Two corners need two things to sit in them; one
   * line alone belongs in the middle.
   */
  const bare = normalize(useLocation().pathname) === '/about'

  /* The landing is built to be exactly two screens with nothing to scroll past,
     which it can only stay if it knows how tall this band is. Published as a
     custom property rather than written down in both places: the band is one
     row from sm up and three stacked rows on a phone, so any constant would be
     wrong on one of them. */
  const publish = useCallback(() => {
    const el = bandRef.current
    if (el) document.documentElement.style.setProperty('--footer-h', `${el.offsetHeight}px`)
  }, [])

  /* Twice over, because the two things that change this height change it by
     different routes. Width is the observer's job. The slot is not: it arrives
     by portal from a page below, so the band grows a row on a phone during a
     commit this component is part of, and measuring after every commit catches
     that in the same frame the row appears rather than a beat later. */
  useLayoutEffect(publish)

  useEffect(() => {
    const el = bandRef.current
    if (!el) return
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [publish])

  return (
    <footer ref={bandRef} className="shrink-0">
      {/* Annotation, not furniture.

          The band became capsules, and the capsules were still objects — six
          pieces of floating furniture on one screen, all competing with the one
          object that should be competing for attention. So the footer stops
          being a thing at all: no ground, no edge, no shadow, no radius. Bare
          type set into the bottom corners, the way a drafted sheet writes its
          notes in the margin.

          Which leaves exactly one object on the page. The island keeps its glass
          because it is the only control up there — everything down here is
          something to read, not something to press, apart from three marks that
          say so by being marks. That contrast is the point: one thing floats,
          because only one thing is a control.

          Two corners, not three. The page's own item joins the contacts on the
          right rather than taking the centre, because a centred item needs a
          band across the full width to be centred *in*, and there is no longer
          a band.

          Three cells, placed by source order on a phone and pinned from sm up.
          The slot leads, spanning both columns, so a route that has one gets it
          on its own line and the name keeps the full width underneath — sharing
          that line squeezed the name into 141px of the 178px it needs and broke
          it across two lines. A route with no slot collapses it, and the name
          and the marks fall back onto a single line together, which is the
          arrangement the reference actually shows. */}
      {bare ? (
        <p className={`${MONO} px-6 pb-4 pt-2 text-center text-muted sm:pb-5 lg:px-10`}>
          © 2026 Charles Abi Chahine
          <span className="hidden lg:inline"> · {role}</span>
        </p>
      ) : (
      <div className="grid grid-cols-[1fr_auto] items-end gap-x-4 gap-y-1 px-6 pb-4 pt-2 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-x-5 sm:gap-y-0 sm:pb-5 lg:px-10">
        {/* flex, so this is the height of what a page puts in it rather than of
            a line box — pages hand it an <a> or a <button> as often as a <p>,
            and an inline child drags in the footer's own 16px strut. */}
        <div
          ref={slotRef}
          className="col-span-2 flex items-center justify-self-end empty:hidden sm:col-span-1 sm:col-start-2 sm:row-start-1"
        />

        {/* Bottom left. The role waits for lg, where the line has room beside
            everything on the right of it. */}
        <p className={`${MONO} text-muted sm:col-start-1 sm:row-start-1`}>
          © 2026 Charles Abi Chahine
          <span className="hidden lg:inline"> · {role}</span>
        </p>

        {/* Bottom right. The negative margins let the 24px targets overflow into
            the padding rather than setting the row's height, so the marks sit on
            the same baseline as the type opposite them. */}
        {/* Named, because a landmark with no name is announced as "navigation"
            and there is a second one on the page. */}
        {/* The names come back at lg, not at sm. The note above records that the
            three words cost 170px and broke the phone row, and that is still
            true anywhere the row is tight: at sm the identity, a page's chip and
            three named marks want more than the 592px the row has. lg is the
            first width where all three fit on one line with room to spare, and
            it is already where the role joins the identity, so the footer fills
            out in one step rather than two. */}
        <nav
          aria-label="Contact"
          className="-my-1 -mr-1.5 flex justify-self-end gap-0.5 sm:col-start-3 sm:row-start-1 lg:gap-2.5"
        >
          {MARKS.map((m) => (
            <a
              key={m.key}
              className={LINK}
              aria-label={m.label}
              href={m.href(contact)}
              {...(m.away ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <Mark d={m.d} />
              {/* Hidden below lg rather than absent, and the aria-label stays on
                  the anchor either way: display:none takes the span out of the
                  accessible name, so without the label the phone version would
                  be three unnamed links again. Where both are present they say
                  the same word, so nothing is announced twice. */}
              <span className="hidden lg:inline">{m.label}</span>
            </a>
          ))}
        </nav>
      </div>
      )}
    </footer>
  )
}
