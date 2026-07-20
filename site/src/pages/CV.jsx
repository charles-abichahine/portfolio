import { certificates, contact, education, experience, languages, skills } from '../data/cv.js'

const base = import.meta.env.BASE_URL

function SectionLabel({ children }) {
  return <h2 className="label-mono mb-6 border-t border-rule pt-4 text-muted">{children}</h2>
}

export default function CV() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label-mono mb-4 text-muted">Curriculum Vitae</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Charles Abi Chahine<span className="text-accent">.</span>
          </h1>
        </div>
        <a
          href={`${base}cv.pdf`}
          download="Charles-Abi-Chahine-CV.pdf"
          className="label-mono border border-ink px-5 py-3 transition-colors hover:border-accent hover:text-accent"
        >
          Download PDF ↓
        </a>
      </div>

      <div className="grid gap-14 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <section className="mb-14">
            <SectionLabel>Experience</SectionLabel>
            <div className="space-y-10">
              {experience.map((job) => (
                <div key={job.firm + job.dates} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <p className="font-mono text-xs text-muted tabular-nums">{job.dates}</p>
                  <div>
                    <h3 className="font-semibold">
                      {job.role} — {job.firm}
                    </h3>
                    <p className="label-mono mb-2 mt-1 text-muted">{job.where}</p>
                    <ul className="max-w-[62ch] space-y-1.5 text-sm leading-relaxed text-soft">
                      {job.points.map((pt) => (
                        <li key={pt.slice(0, 32)}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Education</SectionLabel>
            <div className="space-y-8">
              {education.map((ed) => (
                <div key={ed.school} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <p className="font-mono text-xs text-muted tabular-nums">{ed.dates}</p>
                  <div>
                    <h3 className="font-semibold">{ed.degree}</h3>
                    <p className="label-mono mb-2 mt-1 text-muted">{ed.school}</p>
                    <p className="max-w-[62ch] text-sm leading-relaxed text-soft">{ed.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div>
          <section className="mb-12">
            <SectionLabel>Skills</SectionLabel>
            <div className="space-y-5">
              {skills.map((s) => (
                <div key={s.group}>
                  <h3 className="label-mono mb-2 text-accent">{s.group}</h3>
                  <p className="text-sm leading-relaxed text-soft">{s.items.join(' · ')}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <SectionLabel>Languages</SectionLabel>
            <dl className="space-y-2">
              {languages.map((l) => (
                <div key={l.name} className="flex justify-between border-b border-line pb-2 text-sm">
                  <dt>{l.name}</dt>
                  <dd className="label-mono text-muted">{l.level}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mb-12">
            <SectionLabel>Certificates</SectionLabel>
            <ul className="space-y-2 text-sm leading-relaxed text-soft">
              {certificates.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section>
            <SectionLabel>Contact</SectionLabel>
            <div className="label-mono flex flex-col gap-3">
              <a className="transition-colors hover:text-accent" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
              <a className="text-muted transition-colors hover:text-accent" href={contact.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
              <a className="text-muted transition-colors hover:text-accent" href={contact.github} target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
