import { contact } from '../data/cv.js'

const base = import.meta.env.BASE_URL

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="label-mono mb-4 text-muted">About</p>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <figure>
          <img
            src={`${base}headshot.webp`}
            alt="Charles Abi Chahine"
            className="w-full max-w-sm border border-line"
          />
        </figure>
        <div>
          <h1 className="mb-6 max-w-[20ch] text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Architect first, then the software behind the architecture<span className="text-accent">.</span>
          </h1>
          <div className="max-w-[62ch] space-y-4 leading-relaxed text-soft">
            <p>
              I'm Charles Abi Chahine, an architect from Lebanon. I studied architecture at the
              Lebanese American University (with a study-abroad term at Kent State University),
              then practiced across Beirut, Dubai, and Kuwait — concept design and parametric
              facade studies at SOMA, BIM modeling at BIM International, and project architecture
              with computational and 3D-printed work at Dynamic Solution Co.
            </p>
            <p>
              Practice kept pointing at the same gap: the most interesting design problems were
              really workflow problems — geometry that needed rules, models that needed data,
              teams that needed better pipelines. That took me to IAAC's Master in Advanced
              Computation for Architecture &amp; Design (MaCAD), where my work now sits between
              generative AI, discrete aggregation, and the sensory data of buildings.
            </p>
            <p>
              I'm interested in roles where architecture and computation meet: computational
              design, BIM workflows, and the tools that make design teams faster.
            </p>
          </div>
          <div className="label-mono mt-8 flex flex-wrap gap-5 border-t border-line pt-5">
            <a className="text-ink transition-colors hover:text-accent" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <a className="text-muted transition-colors hover:text-accent" href={contact.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="text-muted transition-colors hover:text-accent" href={contact.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
