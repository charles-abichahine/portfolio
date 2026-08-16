/*
 * Generates public/book.pdf, the downloadable booklet, from src/data/projects.js
 * — the same data /work renders, so the download cannot drift from the site.
 * That is the whole reason this is a script rather than a designed file: the CV
 * PDF exists because a hand-made one went stale and shipped a phone number the
 * site deliberately omits, and a booklet is twenty pages of the same risk.
 *
 * A4 landscape, two pages per project: a title page carrying the writing and the
 * cover, then a plate of up to four images with their captions underneath.
 *
 * Eight projects, not nineteen. A booklet is a selection; /work is the index,
 * and the last page says so. SELECTION below is the only editorial decision in
 * the file and is meant to be edited.
 *
 * Two things are inherited from cv-pdf.mjs because they are not optional:
 *
 *   Fonts are inlined as data URIs. Chrome will not load a file:// font into a
 *   file:// document, since every file:// origin is opaque, so a linked
 *   @font-face silently falls back and the PDF ships in Times. Only static
 *   instances are used; a variable font does not embed at all.
 *
 *   Images are inlined as JPEG data URIs rather than linked, at the size they
 *   are actually placed. Handing Chrome a 2000px webp for a 130mm slot embeds
 *   the whole thing, and forty of those is a download nobody waits for.
 *   Pre-scaling is the only real control over the file size.
 *
 * Run `npm run book` after editing projects.js, and commit the result.
 *
 * Rendering is deliberately NOT part of `npm run build`: it needs a local Chrome
 * and the deploy runs on ubuntu-latest. The build runs `--check` instead, which
 * fails if projects.js has moved on since the PDF was generated.
 */
import sharp from 'sharp'
import { writeFileSync, readFileSync, unlinkSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(here, '../src/data/projects.js')
const PUBLIC = resolve(here, '../public')
const PDF = resolve(PUBLIC, 'book.pdf')
const STAMP = resolve(here, 'book.hash')

/* The booklet's running order. Eight of the nineteen, across all four belts:
 * four from Computation & AI because that is the positioning and the strongest
 * work, one BIM, two Design & Research, one from practice so the book does not
 * read as though the architecture started at the master's. Three of the four
 * awarded projects are here; Rings of Mars is the fourth and has one image. */
const SELECTION = [
  'sensi',
  'legoarch',
  'narkomfin',
  'urban-risk',
  'breathing-mass',
  'huddle',
  'luminous-stratum',
  'lau-anfeh',
]

const PLATE_MAX = 4

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p))

const hashOf = (file) =>
  createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex')

// A PDF records one /Type /Page per page; the lookahead keeps it off /Type /Pages.
const pageCount = (file) =>
  (readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length

if (process.argv.includes('--check')) {
  if (!existsSync(PDF)) throw new Error('book-pdf: public/book.pdf is missing, run `npm run book`')
  const recorded = existsSync(STAMP) ? readFileSync(STAMP, 'utf8').trim() : null
  if (recorded !== hashOf(DATA)) {
    throw new Error(
      'book-pdf: src/data/projects.js has changed since public/book.pdf was generated.\n' +
        '          The site and the download would ship out of sync. Run `npm run book` and commit both.',
    )
  }
  console.log(`book.pdf: up to date with projects.js, ${pageCount(PDF)} pages`)
  process.exit(0)
}

if (!CHROME) throw new Error('book-pdf: no Chrome or Edge found to render the PDF')

/*
 * projects.js reads import.meta.env.BASE_URL, which plain node does not have, so
 * it cannot simply be imported. The substituted copy is written beside the
 * original rather than loaded from a data: URL, because a data: module cannot
 * resolve the relative imports that belts.js makes.
 */
const SHIM = resolve(here, '../src/data/.book-projects.mjs')
writeFileSync(SHIM, readFileSync(DATA, 'utf8').replace(/import\.meta\.env\.BASE_URL/g, "'/'"))
let projects
try {
  ;({ projects } = await import(pathToFileURL(SHIM).href))
} finally {
  unlinkSync(SHIM)
}

const cv = await import(pathToFileURL(resolve(here, '../src/data/cv.js')).href)
const { contact, summary } = cv

const chosen = SELECTION.map((slug) => {
  const p = projects.find((x) => x.slug === slug)
  if (!p) throw new Error(`book-pdf: no project with slug "${slug}"`)
  return p
})

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── assets ────────────────────────────────────────────────────────────────
const font = (file, family, weight) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(
    resolve(here, file),
  ).toString('base64')}) format("woff2")}`

const FONTS = [
  font('./fonts/space-grotesk-400.woff2', 'Space Grotesk', 400),
  font('./fonts/space-grotesk-600.woff2', 'Space Grotesk', 600),
  font('./fonts/space-grotesk-700.woff2', 'Space Grotesk', 700),
  font('../public/fonts/spectral-400.woff2', 'Spectral', 400),
  font('../public/fonts/ibm-plex-mono-400.woff2', 'IBM Plex Mono', 400),
].join('\n')

/* Placed at the size it is used, then embedded. Widths are the print slot in
 * millimetres times roughly 200dpi, which is past what anyone can resolve on
 * paper and far short of shipping the 2000px original forty times. */
const cache = new Map()
let imageBytes = 0
async function img(relPath, width) {
  const key = `${relPath}@${width}`
  if (cache.has(key)) return cache.get(key)
  const file = join(PUBLIC, relPath)
  if (!existsSync(file)) throw new Error(`book-pdf: missing image ${relPath}`)
  const buf = await sharp(file)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
  imageBytes += buf.length
  const uri = `data:image/jpeg;base64,${buf.toString('base64')}`
  cache.set(key, uri)
  return uri
}

// A project's cover is a video on three of them; the poster is the still.
const posterFor = (p) =>
  p.cover.endsWith('.webm') ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover

// ── pages ─────────────────────────────────────────────────────────────────
const cover = `
<section class="page cover">
  <div>
    <p class="eyebrow">Selected work · 2023–2026</p>
    <h1>Charles Abi Chahine<span class="dot">.</span></h1>
    <p class="role">architect · computational designer</p>
    <p class="lede">${esc(summary)}</p>
  </div>
  <div class="cover-foot">
    <div class="belts"><i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i></div>
    <p class="mono">${esc(contact.site ?? 'charlesabichahine.com')}</p>
  </div>
</section>`

const contents = `
<section class="page contents">
  <p class="eyebrow">Contents</p>
  <ol>
    ${chosen
      .map(
        (p, i) => `<li>
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <span class="ct">${esc(p.title)}</span>
      <span class="cm">${esc(p.category)}</span>
      <span class="cy">${esc(p.year)}</span>
    </li>`,
      )
      .join('')}
  </ol>
  <p class="foot mono">Eight of nineteen. The rest at ${esc(contact.site ?? 'charlesabichahine.com')}/work</p>
</section>`

async function projectPages(p, i) {
  const stills = p.sections.flatMap((s) => s.media).filter((m) => m.type === 'image')
  const plate = stills.slice(0, PLATE_MAX)
  const heroSrc = await img(posterFor(p), 1500)

  const title = `
<section class="page pp">
  <div class="pp-left">
    <p class="eyebrow">${String(i + 1).padStart(2, '0')} · ${esc(p.category)}</p>
    <h2>${esc(p.title)}<span class="dot">.</span></h2>
    ${p.award ? `<p class="award">${esc(p.award)}</p>` : ''}
    <p class="sub">${esc(p.subtitle)}</p>
    <p class="body">${esc(p.intro[0])}</p>
    <dl class="meta">
      <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
      <div><dt>Module</dt><dd>${esc(p.module)}</dd></div>
      <div class="wide"><dt>Team</dt><dd>${esc(p.team.join(', '))}</dd></div>
      <div class="wide"><dt>Tools</dt><dd>${esc(p.tools.join(' · '))}</dd></div>
    </dl>
  </div>
  <figure class="pp-hero"><img src="${heroSrc}" alt="" /></figure>
</section>`

  if (!plate.length) return title

  const cells = []
  for (const m of plate) {
    cells.push(`<figure class="cell">
      <img src="${await img(m.src, plate.length > 2 ? 1100 : 1500)}" alt="" />
      ${m.caption ? `<figcaption>${esc(m.caption)}</figcaption>` : ''}
    </figure>`)
  }

  const platePage = `
<section class="page plate ${plate.length <= 2 ? 'plate-2' : ''}">
  <div class="grid">${cells.join('')}</div>
  <p class="runner mono">${String(i + 1).padStart(2, '0')} · ${esc(p.title)}</p>
</section>`

  return title + platePage
}

const closing = `
<section class="page closing">
  <div>
    <p class="eyebrow">The rest of it</p>
    <h2>Nineteen projects, four belts<span class="dot">.</span></h2>
    <p class="lede">This booklet is a selection. Every project, with the full galleries and the write-ups, is on the site.</p>
  </div>
  <div class="cover-foot">
    <p class="mono">${esc(contact.site ?? 'charlesabichahine.com')}/work</p>
    <p class="mono">${esc(contact.email)}</p>
  </div>
</section>`

const body = (await Promise.all(chosen.map(projectPages))).join('')

// ── document ──────────────────────────────────────────────────────────────
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Charles Abi Chahine — Selected work</title>
<style>
${FONTS}
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font-family: "Space Grotesk", sans-serif; color: #16181d; background: #fff; }

.page { width: 297mm; height: 210mm; padding: 15mm 16mm; overflow: hidden;
        page-break-after: always; break-after: page; position: relative;
        display: flex; flex-direction: column; }
.page:last-child { page-break-after: auto; break-after: auto; }

.mono, .eyebrow, .runner, dt { font-family: "IBM Plex Mono", monospace; }
.eyebrow { font-size: 7pt; letter-spacing: 0.18em; text-transform: uppercase;
           color: #767d88; margin: 0 0 6mm; }
.dot { color: #d92b1f; }
.body, .lede, .sub, figcaption { font-family: "Spectral", Georgia, serif; }

/* cover */
.cover { justify-content: space-between; }
.cover h1 { font-size: 40pt; font-weight: 300; letter-spacing: -0.025em; margin: 0; line-height: 1.02; }
.cover .role { font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: #4e535c;
               margin: 5mm 0 0; letter-spacing: 0.06em; }
.cover .lede { font-size: 13pt; line-height: 1.6; color: #4e535c; margin: 9mm 0 0; max-width: 150mm; }
.cover-foot { display: flex; align-items: flex-end; justify-content: space-between; }
.cover-foot .mono { font-size: 7.5pt; color: #767d88; margin: 0; letter-spacing: 0.1em; }
.belts { display: flex; gap: 3mm; }
.belts i { display: block; width: 26mm; height: 2pt; }
.b1 { background: #d92b1f } .b2 { background: #1f6feb } .b3 { background: #1a7f37 } .b4 { background: #a2571a }

/* contents */
.contents ol { list-style: none; margin: 0; padding: 0; flex: 1; }
.contents li { display: grid; grid-template-columns: 14mm 1fr 62mm 20mm;
               align-items: baseline; gap: 4mm; padding: 4.4mm 0;
               border-bottom: 0.4pt solid #e0e3e7; }
.contents .num { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; color: #d92b1f; }
.contents .ct { font-size: 13pt; font-weight: 600; letter-spacing: -0.01em; }
.contents .cm, .contents .cy { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt;
                               color: #767d88; letter-spacing: 0.08em; text-transform: uppercase; }
.contents .cy { text-align: right; }
.contents .foot { font-size: 7.5pt; color: #767d88; margin: 6mm 0 0; letter-spacing: 0.08em; }

/* project title page */
.pp { flex-direction: row; gap: 12mm; }
.pp-left { width: 96mm; flex: none; display: flex; flex-direction: column; }
.pp h2 { font-size: 24pt; font-weight: 700; letter-spacing: -0.02em; margin: 0; line-height: 1.08; }
.award { font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: 0.14em;
         text-transform: uppercase; color: #d92b1f; margin: 3.5mm 0 0; }
.pp .sub { font-size: 11pt; line-height: 1.5; margin: 5mm 0 0; color: #16181d; }
.pp .body { font-size: 9.2pt; line-height: 1.62; color: #4e535c; margin: 4mm 0 0; }
.meta { margin: auto 0 0; padding-top: 4mm; border-top: 0.6pt solid #16181d;
        display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 5mm; }
.meta .wide { grid-column: span 2; }
.meta dt { font-size: 6.4pt; letter-spacing: 0.16em; text-transform: uppercase;
           color: #767d88; margin: 0 0 1mm; }
.meta dd { font-family: "IBM Plex Mono", monospace; font-size: 7.4pt; margin: 0; line-height: 1.35; }
.pp-hero { flex: 1; margin: 0; min-width: 0; display: flex; }
.pp-hero img { width: 100%; height: 100%; object-fit: cover; border: 0.4pt solid #e0e3e7; }

/* plate */
.plate .grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr;
               grid-auto-rows: 1fr; gap: 7mm 8mm; min-height: 0; }
.plate-2 .grid { grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; }
.cell { margin: 0; display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.cell img { width: 100%; flex: 1; min-height: 0; object-fit: contain; object-position: center top; }
.cell figcaption { font-size: 7.6pt; line-height: 1.4; color: #4e535c; margin: 2.5mm 0 0; }
.runner { font-size: 7pt; letter-spacing: 0.14em; text-transform: uppercase;
          color: #767d88; margin: 6mm 0 0; }

/* closing */
.closing { justify-content: space-between; }
.closing h2 { font-size: 26pt; font-weight: 300; letter-spacing: -0.02em; margin: 0; }
.closing .lede { font-size: 12pt; line-height: 1.6; color: #4e535c; margin: 7mm 0 0; max-width: 140mm; }
</style></head>
<body>${cover}${contents}${body}${closing}</body></html>`

const tmpHtml = resolve(here, '.book.tmp.html')
writeFileSync(tmpHtml, html)
execFileSync(
  CHROME,
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${PDF}`,
    pathToFileURL(tmpHtml).href,
  ],
  { stdio: 'ignore' },
)
if (!process.argv.includes('--keep-html')) unlinkSync(tmpHtml)

writeFileSync(STAMP, `${hashOf(DATA)}\n`)

const pages = pageCount(PDF)
const mb = (n) => (n / 1024 / 1024).toFixed(1) + 'MB'
console.log(
  `book.pdf: ${chosen.length} projects, ${pages} pages, ${mb(statSync(PDF).size)} ` +
    `(${cache.size} images, ${mb(imageBytes)} before embedding)`,
)
if (pages !== chosen.length * 2 + 3) {
  console.log(
    `  note: expected ${chosen.length * 2 + 3} pages (cover, contents, two per project, closing).\n` +
      '        A different count means something overflowed its page.',
  )
}
