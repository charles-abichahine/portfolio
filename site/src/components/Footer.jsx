import { contact } from '../data/cv.js'

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="label-mono mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-muted">
        <span>© 2026 Charles Abi Chahine</span>
        <div className="flex gap-5">
          <a className="transition-colors hover:text-accent" href={`mailto:${contact.email}`}>Email</a>
          <a className="transition-colors hover:text-accent" href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="transition-colors hover:text-accent" href={contact.github} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  )
}
