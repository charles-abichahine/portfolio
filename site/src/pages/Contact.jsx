import { useState } from 'react'
import { contact, role } from '../data/cv.js'

const base = import.meta.env.BASE_URL
const MONO = 'font-mono text-[0.6875rem] uppercase tracking-[0.16em]'

/*
 * The contact page.
 *
 * /about was doing two jobs: an exhibit to explore (the fold, the places, the
 * year rail) and the page that says who he is and how to reach him. Each got in
 * the other's way, so they are split. This is the second job alone: one screen,
 * a few sentences in his voice, and every way to reach him or take the work
 * away, with nothing to discover before it can be used.
 *
 * Links only, no form: the site is static, and a form would mean a third-party
 * service holding visitors' messages and addresses.
 */

// Each way in, with the address written out rather than hidden behind a mark:
// on this page the address is the content, and someone copying it into their
// own mail client should not have to hover to find it.
const ROUTES = [
  { key: 'email', label: 'Email', href: `mailto:${contact.email}`, text: contact.email, away: false },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: contact.linkedin,
    text: contact.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\//, ''),
    away: true,
  },
  {
    key: 'github',
    label: 'GitHub',
    href: contact.github,
    text: contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, ''),
    away: true,
  },
]

// The page's two lines of writing, kept together so they are changed together.
// Plain on purpose, in the register of his LinkedIn About: what he does, and
// what to write to him about. The heading used to be a slogan about building
// tools, which put the tools ahead of the architecture.
const HEADING = 'Get in touch'
const TEXT =
  "I'm an architect working in computational design, BIM and AI. For roles, collaborations or projects, email is the quickest way to reach me."

const PILL =
  'control-label inline-flex rounded-[10px] border border-[color-mix(in_srgb,var(--color-ink)_34%,transparent)] px-4 py-2.5 leading-none text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper'

export default function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // No clipboard (an insecure origin, a denied permission): the address is
      // on screen and the mailto still works, so there is nothing to recover.
    }
  }

  return (
    /* One screen where it fits and a page where it does not: the height floor
       is the viewport less the band, so the block centres on a laptop and
       simply flows on a phone held sideways, with no lock to release.

       Below md every gap is tighter, the photo smaller and the heading a step
       down, for one reason: the downloads have to be on the first screen of a
       phone. At the desktop spacing the page was 917px against a 664px
       viewport and they were the one thing you had to scroll to find. */
    <div className="flex min-h-[calc(var(--app-h)_-_var(--footer-h,52px))] items-center">
      <div className="mx-auto grid w-full max-w-5xl gap-7 px-6 pb-6 pt-[84px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-0 md:py-24">
        {/* ── the words ─────────────────────────────────────────────────── */}
        {/* Who is writing first, then what he has to say. The name and the
            photo lead the column in place of a "Contact" label, which only
            repeated the nav; the heading and the sentence follow. */}
        <div className="min-w-0 md:border-r md:border-line md:pr-14">
          <div className="flex items-center gap-3.5 md:gap-5">
            <img
              src={`${base}headshot.webp`}
              alt=""
              width="332"
              height="534"
              className="h-14 w-14 shrink-0 rounded-full border border-line object-cover object-[50%_18%] md:h-24 md:w-24"
            />
            <div className="min-w-0">
              <p className="text-[1.05rem] font-medium leading-tight text-ink md:text-[1.15rem]">Charles Abi Chahine</p>
              {/* The cover's and the CV's own setting of the role, lowercase and
                  lightly tracked, a step down to the label floor on a phone so
                  it holds one line beside the photo, and tracked tighter still
                  below 375px, where 360px Android phones would wrap it. */}
              <p className="mt-1 font-mono text-[0.6875rem] lowercase tracking-[0.08em] text-soft max-[374px]:tracking-[0.04em] md:text-[0.72rem]">{role}</p>
            </div>
          </div>

          <h1 className="mt-6 max-w-[16ch] text-balance text-[1.75rem] font-light md:mt-10 md:text-[clamp(2rem,3.6vw,2.7rem)] leading-[1.05] tracking-[-0.024em] text-ink">
            {HEADING}
          </h1>
          <p className="mt-3 max-w-[44ch] font-serif text-[1rem] leading-[1.6] text-soft md:mt-6 md:text-[1.05rem] md:leading-[1.7]">{TEXT}</p>
        </div>

        {/* ── the ways in ───────────────────────────────────────────────── */}
        <div className="min-w-0 md:self-center md:pl-14">
          <ul>
            {ROUTES.map((r) => (
              <li
                key={r.key}
                /* Label beside value from sm; above it on a phone, where the
                   address beside a 5.5rem label had 170px and was cut to
                   "charles.abichahi…", and an address is the one thing on this
                   page that must never be truncated. */
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-line py-2.5 first:border-t sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] md:gap-y-1 md:py-4"
              >
                <span className={`${MONO} col-span-2 text-muted sm:col-span-1`}>{r.label}</span>
                <a
                  href={r.href}
                  data-track={`outbound/contact/${r.key}`}
                  {...(r.away ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="break-all text-[1rem] text-ink transition-colors hover:text-accent sm:truncate sm:break-normal"
                >
                  {r.text}
                  {r.away && <span className="text-muted"> ↗</span>}
                </a>
                {r.key === 'email' ? (
                  <button
                    type="button"
                    onClick={copy}
                    aria-live="polite"
                    className="control-label rounded-[8px] border border-line px-2.5 py-1.5 leading-none text-soft transition-colors hover:border-accent hover:text-accent"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>

          <p className={`${MONO} mb-2.5 mt-5 text-muted md:mb-3 md:mt-10`}>Take it with you</p>
          <div className="flex flex-wrap gap-3">
            <a href={`${base}portfolio.pdf`} download="Charles-Abi-Chahine-Portfolio.pdf" data-track="download/portfolio" className={PILL}>
              Portfolio (PDF) ↓
            </a>
            <a href={`${base}cv.pdf`} download="Charles-Abi-Chahine-CV.pdf" data-track="download/cv" className={PILL}>
              CV (PDF) ↓
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
