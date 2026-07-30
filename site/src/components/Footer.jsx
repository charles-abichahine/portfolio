import { contact, role } from '../data/cv.js'

/*
 * The landing's footer, used on every route that has one.
 *
 * It replaced a contact block with its own "Get in touch" heading, a second
 * setting of the name at h2 size, and a rule above the copyright: three
 * elements restating what the page had already established, at the point where
 * a reader is leaving. The landing ended on one quiet line and three links, and
 * that is the right amount of ending for any of these pages.
 *
 * Rendered by App for non-full-bleed routes, so this is the CV and the project
 * pages. Work and About are full bleed and carry their own contact bar.
 */
const MONO = 'font-mono text-[0.56rem] uppercase tracking-[0.16em]'
const LINK = `${MONO} text-muted transition-colors hover:text-accent`

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-6">
        <p className={`${MONO} text-muted`}>© 2026 Charles Abi Chahine · {role}</p>
        <nav className="flex gap-5">
          <a className={LINK} href={`mailto:${contact.email}`}>
            Email
          </a>
          <a className={LINK} href={contact.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <a className={LINK} href={contact.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
