import { contact } from '../data/cv.js'

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="label-mono mb-4 text-accent">Get in touch</p>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Charles Abi Chahine</h2>
            <p className="label-mono mt-2 text-accent">Architect · Computational Designer</p>
          </div>
          <div className="label-mono flex gap-6 text-soft">
            <a className="transition-colors hover:text-accent" href={`mailto:${contact.email}`}>Email</a>
            <a className="transition-colors hover:text-accent" href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            <a className="transition-colors hover:text-accent" href={contact.github} target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
        <div className="mt-6 h-px bg-line" />
        <p className="label-mono mt-4 text-muted">© 2026 Charles Abi Chahine</p>
      </div>
    </footer>
  )
}
