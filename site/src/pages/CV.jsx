import { Fragment } from 'react'
import FooterSlot from '../components/FooterSlot.jsx'
import { FooterDownload } from '../components/Footer.jsx'
import ProjectLink from '../components/ProjectLink.jsx'
import {
  awards,
  education,
  experience,
  languages,
  role,
  skills,
  splitDates,
  summary,
} from '../data/cv.js'
const base = import.meta.env.BASE_URL
/*
 * One column.
 *
 * It used to run a wide main column with skills and languages in a
 * sidebar, which forced those into clipped fragments and gave the experience
 * bullets less room than they needed. A single measure lets every line be a full
 * sentence, and it is the same structure the page already used on a phone, so
 * there is now one layout instead of two.
 *
 * Education leads. The degrees carry the projects they produced, linked through
 * to the case studies, so the CV is a way into the work rather than a list that
 * ends at itself.
 *
 * The measure is deliberately long, well past what you would set a page of prose
 * at. Almost nothing here is a paragraph: it is a column of one-sentence entries,
 * and the thing that makes those scannable is each one occupying a single line.
 * A comfortable 70ch measure broke most of them across two, which reads as twice
 * as much CV. The cap is still there so a long bullet does not run the width of
 * a wide monitor.
 */
/*
 * The bullet marker, a round point rather than the chevron it replaced.
 *
 * Drawn rather than typed: a "•" glyph would come out of whichever font the row
 * is set in, at a size and baseline offset that is that font's business, and the
 * rows here are serif while the interface around them is not. A div is the same
 * dot everywhere. The top margin centres it on the first line rather than on the
 * whole block, which is what keeps it level on a bullet that wraps.
 */
function Dot() {
  return <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-muted" />
}
function Section({ label, children }) {
  return (
    <section className="mb-12">
      {/* Sized up from the 0.66rem label-mono the rest of the page uses. These
          are the only six words a reader scans to navigate the document, so they
          are the one place the mono voice should carry weight rather than
          recede. text-soft rather than muted for the same reason.
          The rule above runs full width as a hairline, with an accent segment
          over its first stretch exactly as long as the word beneath it. The red
          measures the title, so it changes length section to section instead of
          being a fixed decoration.
          That length cannot come from a gradient stop: it would have to be
          written per section and would drift the moment a label was renamed. It
          comes from the heading being inline-block, which makes it the width of
          its own text by definition. The wrapper carries the full-width
          hairline; the heading's rule is pulled up by the wrapper's padding to
          land on it, so -top-4 has to stay in step with pt-4.
          right-[0.1em] trims the trailing letter-spacing, which is added after
          the last character and would otherwise run the red past the final
          letter.
          The wrapper is flex, not a plain block. As an inline-block the heading
          sat in a line box whose 24px line-height exceeded its own 20.64px box,
          and the leftover leading split above and below it, pushing it 2px down
          and taking its rule off the hairline with it. A flex item is not in a
          line box, so -top-4 lands exactly on pt-4. The print version never had
          this because there the span and its parent share a font size and there
          is no leftover to split. */}
      <div className="relative mb-6 flex pt-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-line">
        <h2 className="relative font-mono text-[0.86rem] font-medium uppercase tracking-[0.1em] text-soft before:absolute before:left-0 before:right-[0.1em] before:-top-4 before:h-px before:bg-accent">
          {label}
        </h2>
      </div>
      {children}
    </section>
  )
}
/*
 * The place sits on the title line rather than on its own line under it. Two
 * lines per entry became one, which is eight lines across the document and the
 * cheapest height on the page: nothing is lost, the pairing is if anything
 * clearer, and the mono keeps the place reading as metadata rather than as part
 * of the title.
 *
 * It wraps rather than truncates. On a phone the degree names are long enough
 * that the place will often drop to a second line anyway, which is the same
 * result as before rather than a regression.
 */
function EntryHead({ title, place }) {
  return (
    <h3 className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span className="font-semibold">{title}</span>
      <span className="label-mono text-muted">{place}</span>
    </h3>
  )
}
/*
 * Dates in a gutter from sm up, stacked above on a phone.
 *
 * 3.5rem, down from 8.5rem. The gutter used to be sized for a whole range on one
 * line; stacking the second year under the first means it only has to fit one,
 * and every rem held back here is a rem of sentence in the column beside it. A
 * sentence that wraps to carry two words on a second line costs the same height
 * as a full one, so this is the cheapest width on the page.
 *
 * Stacking costs nothing: every entry is at least three lines tall, so a
 * two-line date sits inside height the row already had.
 *
 * The dash between the years is gone, replaced by a short accent rule drawn
 * under the first. It carries all three cases: no rule is a single year, a rule
 * landing on a second year is a closed range, and a longer rule with nothing
 * under it is a job still running. It is also the one mark of colour in the left
 * margin of the document.
 *
 * On a phone the gutter becomes a line above the entry, where there is no width
 * pressure and a stacked date would just spend a line. So the phone gets the
 * plain range on one line, dash and all, and the stacked pair only appears from
 * sm up.
 *
 * Skills keeps a wider gutter of its own. Its labels are words rather than four
 * digits, and "BIM & DELIVERY" narrowed to this would wrap to two lines while
 * the value beside it stayed on one, spending more height than the gutter saves.
 */
function Entry({ dates, children }) {
  const [from, to, ongoing] = splitDates(dates)
  return (
    <div className="mb-9 grid gap-1.5 last:mb-0 sm:grid-cols-[3.5rem_1fr] sm:gap-5">
      <p className="font-mono text-xs leading-[1.5] tabular-nums text-accent">
        {/* Phone: the range on one line, keeping its dash. */}
        <span className="sm:hidden">{dates}</span>
        {/* From sm up: stacked, with the accent rule standing in for the dash.
            The column is inline-flex so it shrinks to the width of the digits,
            which leaves the years flush left with everything else in the page
            while the rule still centres under them. */}
        <span className="hidden sm:inline-flex sm:flex-col sm:items-center">
          <span>{from}</span>
          {/* Longer when nothing closes it: the rule running on past where a
              second year would sit is what reads as still running. */}
          {(to || ongoing) && (
            <span aria-hidden="true" className={`mt-1 w-px bg-accent ${to ? 'mb-1 h-2' : 'h-3.5'}`} />
          )}
          {to && <span>{to}</span>}
        </span>
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
export default function CV() {
  // pt-28, not py-16: the fixed nav island ends 59px down the viewport and the
  // name was starting at 64, which read as the two colliding.
  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-28">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        {/* Name, then role, then the sentence. The "Curriculum Vitae" label that
            used to sit on top said nothing a reader on /cv did not already know,
            and it pushed the name down a line to say it. The role now takes that
            slot, which is the same order the PDF has always used. */}
        {/*
         * The same name block as the landing, to the value: the clamp, the light
         * weight, the negative tracking, and the role beneath it in lowercase
         * mono. Arriving on /cv from the landing should feel like the same
         * person's page rather than a document from somewhere else, and the name
         * was set in bold here against light there for no reason but drift.
         *
         * The role string stays title case in the data and is lowercased in CSS,
         * so the PDF can keep its own casing without a second copy of it.
         *
         * The summary is deliberately NOT lowercased. That is the landing's
         * voice; this is a document a recruiter reads.
         */}
        <div className="max-w-[52ch]">
          <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.03] tracking-[-0.024em]">
            Charles Abi Chahine<span className="text-accent">.</span>
          </h1>
          <p className="mt-3.5 font-mono text-[0.72rem] lowercase tracking-[0.08em] text-soft">
            {role}
          </p>
          <p className="mt-5 font-serif text-[1.05rem] leading-[1.5] text-soft">{summary}</p>
        </div>
        {/* The filter pills' grammar, at a primary action's size.
            This was the only square-cornered control on the site — every other
            bordered thing has a radius, from the 10px filter pills to the card's
            14px — so it read as a button borrowed from somewhere else.
            Filled rather than outlined because that is already how this site
            says "this is the one": /work's active filter is its colour filled
            with paper type, and on a page whose whole job is handing over a
            file, the file is the one. 10px is the pills' radius, written out
            because it now appears in three files; worth a token if a fourth
            wants it.
            Set at the site's 0.6875rem floor like every other label: at 0.6rem
            this was 9.6px, which is smaller than the colophon under it and the
            wrong size for the page's primary action. The padding is unchanged —
            it was drawn around a 44px-ish target, and 1.4px of type does not
            change what the block wants to be. */}
        <a
          href={`${base}cv.pdf`}
          download="Charles-Abi-Chahine-CV.pdf"
          className="shrink-0 whitespace-nowrap rounded-[10px] border border-ink bg-ink px-5 py-3 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.14em] text-paper transition-colors hover:border-accent hover:bg-accent"
        >
          Download PDF ↓
        </a>
      </header>
      <Section label="Education">
        {education.map((ed) => (
          <Entry key={ed.school} dates={ed.dates}>
            <EntryHead title={ed.degree} place={ed.school} />
            <p className="font-serif text-[0.95rem] leading-[1.5] text-soft">{ed.notes}</p>
            {ed.work.length > 0 && (
              <ul className="mt-3 space-y-1">
                {ed.work.map((w) => (
                  <li
                    key={w.slug}
                    className="flex gap-2.5 font-serif text-[0.95rem] leading-[1.5] text-soft"
                  >
                    <Dot />
                    {/* The project name is the link; the sentence after it stays
                        plain, so the row reads as prose rather than as a button.
                        Name and sentence are separate fields rather than split on
                        a comma, which would break on a title containing one. */}
                    <span>
                      {/* The one place colour is spent on content. Red marks the
                          work: the four project names are the only accent in the
                          body of the CV, and on the page they are also the only
                          things you can click, so the colour doubles as the link
                          affordance. Deliberately not the section or entry
                          titles, which are structure rather than substance. */}
                      <ProjectLink
                        slug={w.slug}
                        className="text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-accent hover:text-accent"
                      >
                        {w.name}
                      </ProjectLink>
                      , {w.text.trim()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Entry>
        ))}
      </Section>
      <Section label="Experience">
        {experience.map((job) => (
          <Entry key={job.firm + job.dates} dates={job.dates}>
            <EntryHead title={`${job.role}, ${job.firm}`} place={job.where} />
            <ul className="space-y-1">
              {job.points.map((pt) => (
                <li
                  key={pt.slice(0, 32)}
                  className="flex gap-2.5 font-serif text-[0.95rem] leading-[1.5] text-soft"
                >
                  <Dot />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </Entry>
        ))}
      </Section>
      <Section label="Skills">
        {/*
         * One grid for every row, not a grid per row. The label column is
         * max-content, so it sizes to the longest label and all the rows share
         * that width; a grid per row would let each size itself and the values
         * would start at a different x on every line. That is also what lets the
         * labels be nowrap: the column widens to fit "Design & computation"
         * rather than the label wrapping to fit a column decided in advance.
         *
         * Languages is folded into the same list because it renders identically.
         */}
        <div className="sm:grid sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
          {[
            ...skills,
            { group: 'Languages', items: languages.map((l) => `${l.name} (${l.level.toLowerCase()})`) },
          ].map((s) => (
            <Fragment key={s.group}>
              <h3 className="label-mono mt-4 whitespace-nowrap pt-0.5 text-accent first:mt-0 sm:mt-0">
                {s.group}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-soft sm:mt-0">{s.items.join(' · ')}</p>
            </Fragment>
          ))}
        </div>
      </Section>
      <Section label="Awards">
        {awards.map((a) => (
          <div key={a.text} className="mb-3 grid gap-1 last:mb-0 sm:grid-cols-[3.5rem_1fr] sm:gap-5">
            <p className="font-mono text-xs tabular-nums text-accent">{a.year}</p>
            <p className="font-serif text-[0.95rem] leading-[1.5] text-soft">{a.text}</p>
          </div>
        ))}
      </Section>
      {/* No Contact section. The site footer already carries email, LinkedIn and
          GitHub on every page including this one, and the PDF puts the same
          three in its top right corner, so a third copy at the bottom of the
          page was the same information a scroll further away. */}

      {/* The download, again, in the middle of the shared footer. This is the
          one page long enough that the button in its header is two screens
          behind you by the time you have read to the end, which is also the
          moment you are most likely to want the file. */}
      <FooterSlot>
        <FooterDownload href={`${base}cv.pdf`} download="Charles-Abi-Chahine-CV.pdf">
          Download CV (PDF)
        </FooterDownload>
      </FooterSlot>
    </div>
  )
}
