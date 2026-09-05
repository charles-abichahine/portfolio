/*
 * Generates public/portfolio.pdf, the downloadable portfolio, from the same
 * data files the site renders, so the download cannot drift from the site.
 * That is the whole reason this is a script rather than a designed file: the
 * CV PDF exists because a hand-made one went stale and shipped a phone number
 * the site deliberately omits, and a portfolio is twenty pages of the same
 * risk.
 *
 * A4 landscape, in the language of a drawing set. Each project gets a spread:
 * a sheet with the cover plate and at most one large figure beside a title
 * block on a hairline rule, then a verso where the full section write-up runs
 * in columns with one or two more plates. Figures are printed as plates, at
 * their own aspect ratio and with nothing around them: the rounded well the
 * site draws behind its media is a screen idiom and it read as a screenshot
 * of a card here rather than as a print.
 *
 * How many figures a project gets, and where they sit, is decided from the
 * shapes of its own images and the length of its own write-up: a wide board
 * takes a full-width band, a tall image takes a column, a long text keeps the
 * room it needs. The layout() block below is that decision, measured with
 * sharp, so a new image or a longer paragraph changes the layout instead of
 * silently overflowing it. Every plate keeps at least 90mm on its long edge;
 * below that a drawing is a grey smudge.
 *
 * A selection, not the index. /work is the index and the closing page says
 * so, in counts read off the data rather than typed: typed once, they said
 * nineteen long after the nineteenth project went away. SELECTION below is
 * the only editorial decision in the file and is meant to be edited; the
 * running order is not part of it, it follows the belt grouping in belts.js.
 *
 * The glyphs are lifted from projectGlyphs.jsx at build time. Its marks are
 * static JSX with no interpolation precisely so a script can regex them out
 * into plain SVG; redrawing them here would be a second copy to keep in step.
 *
 * Two things are inherited from cv-pdf.mjs because they are not optional:
 *
 *   Fonts are inlined as data URIs. Chrome will not load a file:// font into a
 *   file:// document, since every file:// origin is opaque, so a linked
 *   @font-face silently falls back and the PDF ships in Times. Only static
 *   instances are used; a variable font does not embed at all.
 *
 *   Images are inlined as JPEG data URIs rather than linked, at the size they
 *   are actually placed. Handing Chrome a 2000px webp for a 200mm slot embeds
 *   the whole thing, and forty of those is a download nobody waits for.
 *   Pre-scaling is the only real control over the file size.
 *
 * Run `npm run portfolio` after editing any of the source files, and commit
 * the result.
 *
 * Rendering is deliberately NOT part of `npm run build`: it needs a local
 * Chrome and the deploy runs on ubuntu-latest. The build runs `--check`
 * instead, which fails if any file the portfolio reads has moved on since the
 * PDF was generated.
 */
import sharp from 'sharp'
import { writeFileSync, readFileSync, unlinkSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { crossCap, makeProjector } from '../src/lib/crosscap.js'

const here = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(here, '../public')
const PDF = resolve(PUBLIC, 'portfolio.pdf')
const STAMP = resolve(here, 'portfolio.hash')

/* Everything the portfolio reads. It prints the projects, the belts, the CV
 * summary and the glyphs, so a change to any of them is the same drift. */
const SOURCES = [
  resolve(here, '../src/data/projects.js'),
  resolve(here, '../src/data/belts.js'),
  resolve(here, '../src/data/cv.js'),
  resolve(here, '../src/components/projectGlyphs.jsx'),
  // The cover's surface is computed from this now-shared module, so a change to
  // the mathematics is the same drift as a change to the writing.
  resolve(here, '../src/lib/crosscap.js'),
]

/* The eight sheets, in the order they print.
 *
 * All four awarded projects travel now: Sensi and lEgoarCh out of Computation
 * & AI, The Huddle and Rings of Mars out of Design & Research. Three from
 * Computation & AI because that is the positioning and the strongest work,
 * one BIM, three Design & Research, and Saria from practice so the book does
 * not read as though the architecture started at the master's.
 *
 * An order, not a set. It is deliberately NOT the belt grouping /work shows:
 * a booklet is read front to back and this is the sequence to read it in, so
 * the sheet numbers are counted off this list. Editing it is the one
 * editorial decision in the file. */
const SELECTION = [
  'sensi',
  'urban-risk',
  'legoarch',
  'breathing-mass',
  'huddle',
  'luminous-stratum',
  'marception',
  'saria',
]

/* The sheet's fixed geometry, in content millimetres: an A4 landscape page
 * inside 12mm margins, and the title block column the sheet keeps on the
 * right. Everything layout() decides is decided against these. */
const PAGE_W = 273
const PAGE_H = 186
const TB_W = 64
const PLATE_W = PAGE_W - TB_W - 8

/* The runner at the head of a verso, and the gap under it. What is left is
 * the column both the writing and the plates are measured against. */
const VERSO_HEAD = 14

/* The strip a pipeline drawing takes at the foot of a sheet. Fixed, because
 * the cover above it is what should give way: a diagram that grew with its
 * stage count would push the plate off the page. */
const DIAGRAM_H = 26

// No plate prints with less than this on its long edge; smaller than a hand,
// a board is decoration rather than a figure.
const MIN_LONG_EDGE = 90


/* The counts on the writing pages are spelled out, so the portfolio reads as
 * writing rather than a spec sheet. Neither will plausibly leave this range. */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two',
  'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven',
  'twenty-eight', 'twenty-nine', 'thirty']
const word = (n) => WORDS[n] ?? String(n)
const Word = (n) => word(n).replace(/^./, (c) => c.toUpperCase())

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p))

const hashOf = () => {
  const h = createHash('sha256')
  for (const f of SOURCES) h.update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'))
  return h.digest('hex')
}

// A PDF records one /Type /Page per page; the lookahead keeps it off /Type /Pages.
const pageCount = (file) =>
  (readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length

if (process.argv.includes('--check')) {
  if (!existsSync(PDF)) throw new Error('portfolio-pdf: public/portfolio.pdf is missing, run `npm run portfolio`')
  const recorded = existsSync(STAMP) ? readFileSync(STAMP, 'utf8').trim() : null
  if (recorded !== hashOf()) {
    throw new Error(
      'portfolio-pdf: a source the portfolio reads (projects, belts, cv, or the glyphs) has\n' +
        '          changed since public/portfolio.pdf was generated. The site and the download\n' +
        '          would ship out of sync. Run `npm run portfolio` and commit both.',
    )
  }
  console.log(`portfolio.pdf: up to date with its sources, ${pageCount(PDF)} pages`)
  process.exit(0)
}

if (!CHROME) throw new Error('portfolio-pdf: no Chrome or Edge found to render the PDF')

/*
 * projects.js reads import.meta.env.BASE_URL, which plain node does not have,
 * so it cannot simply be imported. The substituted copy is written beside the
 * original rather than loaded from a data: URL, because a data: module cannot
 * resolve relative imports. belts.js gets the same treatment with its import
 * repointed at the shim, so the portfolio groups by the very predicates the
 * site groups by instead of carrying a copy of them.
 */
const SHIM_P = resolve(here, '../src/data/.book-projects.mjs')
const SHIM_B = resolve(here, '../src/data/.book-belts.mjs')
writeFileSync(SHIM_P, readFileSync(SOURCES[0], 'utf8').replace(/import\.meta\.env\.BASE_URL/g, "'/'"))
writeFileSync(SHIM_B, readFileSync(SOURCES[1], 'utf8').replace("'./projects.js'", "'./.book-projects.mjs'"))
let projects, BELTS, beltFor
try {
  ;({ projects } = await import(pathToFileURL(SHIM_P).href))
  ;({ BELTS, beltFor } = await import(pathToFileURL(SHIM_B).href))
} finally {
  unlinkSync(SHIM_P)
  unlinkSync(SHIM_B)
}

const cv = await import(pathToFileURL(SOURCES[2]).href)
const { contact, summary, role } = cv

/* Two orders, and they are different on purpose. `grouped` is the belts' own
 * order, award first then newest first inside each belt, which is what /work
 * shows and therefore what the index strip has to draw. `chosen` is the
 * booklet's running order, straight off SELECTION. */
const grouped = BELTS.flatMap((b) => b.items)
const chosen = SELECTION.map((slug) => {
  const p = projects.find((x) => x.slug === slug)
  if (!p) throw new Error(`portfolio-pdf: no project with slug "${slug}"`)
  return p
})

/*
 * The glyphs, out of the JSX. Each entry in GLYPHS is `slug: (` then markup
 * then `),` at the file's own indentation, and the markup is already valid
 * SVG: every attribute in the marks is lowercase, only the fragment wrappers
 * have to go. The wrapper attributes (stroke, width, caps) live on the
 * component, so they are re-stated in glyph() below and must match it.
 */
const glyphSrc = readFileSync(SOURCES[3], 'utf8')
const GLYPHS = {}
{
  const body = glyphSrc.slice(glyphSrc.indexOf('const GLYPHS = {'), glyphSrc.indexOf('export default'))
  const re = /^  (?:'([\w-]+)'|(\w+)): \(\n([\s\S]*?)\n  \),$/gm
  let m
  while ((m = re.exec(body))) GLYPHS[m[1] ?? m[2]] = m[3].replace(/<\/?>/g, '').trim()
}
for (const p of projects) {
  if (!GLYPHS[p.slug]) throw new Error(`portfolio-pdf: no glyph found for "${p.slug}" in projectGlyphs.jsx`)
}
const glyph = (slug, mm) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:${mm}mm;height:${mm}mm">${GLYPHS[slug]}</svg>`

/*
 * The marks a pipeline stage can name, in the grammar the project glyphs use:
 * a 24-unit square, line only, stroke 1.4, colour inherited. A stage names one
 * by key the way a project names its glyph by slug, so the data stays a list of
 * stages and the drawing stays here.
 *
 * Legolize borrows the project's own glyph rather than a second brick, which is
 * also the guarantee the two cannot drift. The check spends the green on one
 * element, the licence projectGlyphs.jsx already takes for a mark whose meaning
 * is carried by a colour: this is the stage where the set becomes legal.
 */
const MARKS = {
  prompt: '<path d="M3.6 5.4h16.8v11.2h-9.6l-4.6 3.9v-3.9H3.6z" />',
  render:
    '<rect x="3.6" y="5" width="16.8" height="14" /><circle cx="8.6" cy="9.6" r="1.5" /><path d="M3.6 16.2 8.7 11.6l3.5 3.4 3.4-3 4.8 4.2" />',
  mesh: '<path d="M12 3.2 20.3 7.6v8.8L12 20.8 3.7 16.4V7.6z" /><path d="M12 12.1v8.7M12 12.1 3.7 7.6M12 12.1l8.3-4.5" />',
  voxel:
    '<rect x="3.8" y="3.8" width="7.2" height="7.2" /><rect x="13" y="3.8" width="7.2" height="7.2" /><rect x="3.8" y="13" width="7.2" height="7.2" /><rect x="13" y="13" width="7.2" height="7.2" />',
  brick: GLYPHS.legoarch,
  check: '<circle cx="12" cy="12" r="8.6" /><path d="M8.1 12.3 10.9 15.1 16 9.5" stroke="var(--color-green)" />',
}
const mark = (key, mm) => {
  if (!MARKS[key]) throw new Error(`portfolio-pdf: no pipeline mark named "${key}"`)
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:${mm}mm;height:${mm}mm">${MARKS[key]}</svg>`
}

/* The pipeline strip: the halves side by side, split by a dashed rule, each
 * over a coloured rule carrying its name, exactly the way the cover draws a
 * belt. Stage numbers run straight through both halves, because it is one
 * pipeline and the split is an argument about it, not a break in it. */
function pipelineHtml(p, widthMm) {
  let n = 0
  const halves = p.pipeline.halves.map((half) => {
    const boxes = half.stages
      .map((st) => {
        n += 1
        return `<div class="pstage">
        <span class="pno" style="color:${half.color}">${pad(n)}</span>
        <span class="pmark">${mark(st.mark, 6)}</span>
        <span class="ptitle">${esc(st.title)}</span>
        <span class="pnote">${esc(st.note)}</span>
      </div>`
      })
      .join('')
    return `<div class="phalf">
      <p class="phead" style="border-color:${half.color};color:${half.color}">${esc(half.label)} <span class="pdim">${esc(half.note)}</span></p>
      <div class="prow">${boxes}</div>
    </div>`
  })
  return `<div class="pipe" style="width:${mm(widthMm)}">${halves.join('<span class="psplit"></span>')}</div>`
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const pad = (n) => String(n).padStart(2, '0')
// An address for print: no protocol, no www, no trailing slash.
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '')
const mm = (n) => `${n.toFixed(1)}mm`

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
 * paper and far short of shipping the 2000px original forty times. Flattened
 * onto white because two of the figures are SVGs with transparency, and JPEG
 * fills an alpha channel with black. */
const cache = new Map()
let imageBytes = 0
async function img(relPath, width) {
  const key = `${relPath}@${width}`
  if (cache.has(key)) return cache.get(key)
  const file = join(PUBLIC, relPath)
  if (!existsSync(file)) throw new Error(`portfolio-pdf: missing image ${relPath}`)
  /* A vector stays a vector. Rasterizing a drawing to place it is how a
   * hairline becomes a smudge, and the file is smaller than any raster of
   * itself would be. */
  if (relPath.endsWith('.svg')) {
    const buf = readFileSync(file)
    imageBytes += buf.length
    const uri = `data:image/svg+xml;base64,${buf.toString('base64')}`
    cache.set(key, uri)
    return uri
  }
  const buf = await sharp(file, { density: 150 })
    .resize({ width, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
  imageBytes += buf.length
  const uri = `data:image/jpeg;base64,${buf.toString('base64')}`
  cache.set(key, uri)
  return uri
}

// The aspect ratio of a placed file, cached: the layout is decided from it.
const aspectCache = new Map()
async function aspectOf(relPath) {
  if (aspectCache.has(relPath)) return aspectCache.get(relPath)
  const file = join(PUBLIC, relPath)
  if (!existsSync(file)) throw new Error(`portfolio-pdf: missing image ${relPath}`)
  const meta = await sharp(file).metadata()
  const a = meta.width / meta.height
  aspectCache.set(relPath, a)
  return a
}

// A project's cover is a video on one of them; the poster is the still.
const posterFor = (p) =>
  p.cover.endsWith('.webm') ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover

// Every video and loop ships a poster beside it, named the same way.
const stillOf = (m) => (m.type === 'image' ? m.src : m.src.replace(/\.[a-z0-9]+$/i, '-poster.webp'))

/* The candidate figures, in the order the sections tell the story, demos
 * included: their captions already say what they are and the DEMO tag on the
 * label says how to see them move. The cover's own image is kept out, the way
 * the card's gallery keeps it out: it is the plate you are already looking at. */
async function figPool(p, cover = posterFor(p)) {
  // A drawn pipeline supersedes the flat image of the same diagram; the record
  // names it so neither the sheet nor the verso prints the picture twice.
  const drawn = p.pipeline?.replaces
  const pool = []
  for (const m of p.sections.flatMap((s) => s.media)) {
    const src = stillOf(m)
    if (src === cover || src === drawn) continue
    pool.push({ m, src, a: await aspectOf(src) })
  }
  return pool
}

// ── the layout engine ─────────────────────────────────────────────────────
/*
 * The verso's type, measured rather than styled: a cell's write-up is set at
 * 7.9pt over 1.52, which is LINE_MM of column per line and about CHAR_MM of
 * column width per character. Those two turn a section's character count into
 * millimetres, and SAFETY is the slack that keeps an estimate from being a
 * lie: if the sums say it only just fits, it does not fit.
 *
 * This is what decides how much of a cell is left for its plate, so it is
 * measured per section rather than per page.
 */
const LINE_MM = 4.24
/* Re-measured 2026-09-04 against the rendered book: forty briefs wrapped at
 * 54 to 70 characters per 85mm line, so 64 is the working line and 1.33mm the
 * character. The old 1.66 over-counted short paragraphs by a third and fired
 * the overflow note on a page with twenty millimetres to spare. */
const CHAR_MM = 1.33
const SAFETY = 1.07
const HEAD_MM = 4.6
const CAP_MM = 8.2
/* A figure on the page's bottom edge hangs its label and a fixed two-line
 * caption below its plate: 12.8mm from plate to caption foot, measured on
 * the rendered page. CAP_MM was used for it and is 4.6mm short, which let
 * every planned row overrun the column into the margin by that much and
 * put its plate line below the aside's. */
const BOT_MM = 12.8
/* A plate at the head of the column hangs a caption that is as long as it
 * is: one line takes 9.5mm, two the full zone. Measured at 6.8pt Spectral,
 * a caption fits one line at about 0.53 characters per millimetre of plate. */
const TOP_MM = 9.5
const topZone = (c) => ((c.plate.m.caption ?? '').length <= c.w * 0.53 ? TOP_MM : BOT_MM)

function sectionTextMm(text, widthMm) {
  const lines = text.length / (widthMm / CHAR_MM)
  return HEAD_MM + Math.ceil(lines) * LINE_MM * SAFETY
}

/*
 * One figure for the sheet, under the cover plate: the single unused image
 * that fills the space best, drawn at its own aspect and printed bare. The
 * rule of annotation (see the pages section) keeps every label off the sheet,
 * so the plate takes the caption's old room too. Nothing under MIN_LONG_EDGE
 * prints at all: a sheet with a big cover plate and white space beats one
 * with a thumbnail strip.
 */
function pickSheetFig(pool, used, availH) {
  if (availH < 46) return null
  let best = null
  for (const f of pool) {
    if (used.has(f.src)) continue
    const h = Math.min(availH, PLATE_W / f.a)
    if (h * Math.max(1, f.a) < MIN_LONG_EDGE) continue
    const area = h * h * f.a
    if (!best || area > best.area) best = { fig: f, h, w: h * f.a, area }
  }
  if (best) used.add(best.fig.src)
  return best
}

/*
 * Each section claims its own plate: the first still it carries that is not
 * the cover, since the cover is already the biggest thing on the recto. The
 * claim happens before the sheet picks anything, so a section is never robbed
 * of the one image that belongs beside its paragraph, and the sheet draws
 * from whatever is left over.
 *
 * A section with no media of its own simply prints as writing, which is the
 * honest result: some sections are argument rather than evidence.
 */
async function sectionPlates(p, used) {
  const cover = posterFor(p)
  const drawn = p.pipeline?.replaces
  const out = []
  for (const s of p.sections) {
    const m = s.media.find(
      (x) => stillOf(x) !== cover && stillOf(x) !== drawn && !used.has(stillOf(x)),
    )
    if (!m) {
      out.push(null)
      continue
    }
    const src = stillOf(m)
    used.add(src)
    out.push({ m, src, a: await aspectOf(src) })
  }
  return out
}

/*
 * The verso's field: three columns of section cells, flowed rather than
 * gridded.
 *
 * Equal cells in a rigid grid were the wrong instrument. A cell is as tall as
 * the section that fills it, and sections are not equal: forcing them onto one
 * row height meant the long ones had no room left for their plate and the
 * short ones printed air. Flowing them down three columns lets each cell be
 * its own height and lets the column balance absorb the difference.
 *
 * The plates are then a budget problem, and an honest one. Three columns hold
 * about 516mm of column between them, the writing takes what it takes, and
 * what is left is what there is for pictures. A dense project cannot have six
 * readable plates and five hundred words on one page, so it gets three plates
 * at full size rather than six at thumbnail size, taken in the order the
 * sections argue. Every drop is reported by the run.
 */
/* The verso, in two parts: the writing down the left third, the plates in the
 * right two.
 *
 * The full write-up cannot go in a third of a page. Measured against the type
 * this document sets, the eight projects wanted between 159 and 310mm of an
 * 85mm column against the 172mm there is, so seven of the eight overran, one
 * of them by nearly double. That is why every section carries a `brief` in
 * projects.js: the long form is what the site shows, the short form is what a
 * page this shape can hold. Nothing here truncates, so if a brief ever
 * outgrows the column the run says so rather than the page eating a paragraph.
 *
 * The plates take one of two arrangements, two large or four small, and which
 * one is alternated by sheet rather than chosen: both are on the table until
 * the set has been looked at. Alternating rather than randomising is the point
 * of it, since the same sources have to keep producing the same PDF.
 */
const TEXT_COL = 85
const VERSO_GUTTER = 11
const ASIDE_GAP = 5

function versoLayout(p, plates, sheetIndex) {
  const colH = PAGE_H - VERSO_HEAD
  const text = p.sections.reduce((a, sec) => a + sectionTextMm(sec.brief ?? '', TEXT_COL), 0)
  const artW = PAGE_W - TEXT_COL - VERSO_GUTTER

  const have = plates.filter(Boolean)
  /* Four small only when the project brought four: below that a 2x2 grid is
   * mostly holes, and two large is the honest arrangement. */
  const four = have.length >= 4 && sheetIndex % 2 === 0
  const cols = four ? 2 : 1
  const cellW = (artW - (cols - 1) * VERSO_GUTTER) / cols
  const cellH = (colH - VERSO_GUTTER) / 2

  const cells = have.slice(0, four ? 4 : 2).map((plate) => {
    // Contained in its cell at its own aspect, never cropped, never filled.
    const h = Math.min(cellH - CAP_MM, cellW / plate.a)
    return { plate, w: h * plate.a, h }
  })

  return { cols, cellW, cells, text, over: text - colH, spare: have.length - cells.length }
}

/*
 * One verso is art-directed rather than budgeted. The plan names which of the
 * project's own images take which slot: `band` runs the full art column,
 * `row` sits two-up beneath it, `aside` closes the text column at its foot at
 * `asideW` millimetres wide (`band` may also be a list: a rank of plates at one
 * shared height across the column), `foot` runs the full page width under both
 * columns and takes its height off them; `cover` swaps the sheet's cover plate and
 * `sheet` pins the figure under it. Every src must already be in the project's
 * sections in projects.js, so a plan can place a picture but never smuggle
 * one in: the guard still owns the content, this only owns the arrangement,
 * the way SELECTION owns the running order. A slug without a plan keeps the
 * measured budget below.
 */
const VERSO_PLAN = {
  sensi: {
    band: 'projects/sensi/shape-analysis.webp',
    row: ['projects/sensi/checkpoints.webp', 'projects/sensi/report-vision.webp'],
    /* The aside prints at the row's own cell width, so the three bottom
     * plates read as one rank; the briefs above were shortened to leave it
     * the room. */
    aside: 'projects/sensi/persona.webp',
    asideW: 83,
    /* The sheet's figure is part of the same decision: without it the pick
     * falls to whatever fills best of what the plan released, which is not
     * the same thing as what belongs under the cover. */
    sheet: 'projects/sensi/galaxy.webp',
  },
  /* The sheet is pinned so the seven-feature lineage prints under the cover;
   * the verso holds the arc in two stacked plates, the failure above and the
   * world test below. The pipeline diagram cedes its place: brief 03 already
   * walks the eight steps in words. */
  'urban-risk': {
    sheet: 'projects/urban-risk/theory.webp',
    /* The second stacked plate is a composed strip: three city maps side by
     * side, each named in the booklet's own type, the risk legend set as
     * text with sampled swatches. The baked-in titles the deck carried were
     * furniture; these are the same words in this document's voice. */
    stack: [
      'projects/urban-risk/the-wall.webp',
      {
        strip: [
          { src: 'projects/urban-risk/cross-city-islington.webp', label: 'Islington · London' },
          { src: 'projects/urban-risk/cross-city-eixample.webp', label: 'The Eixample · Barcelona' },
          { src: 'projects/urban-risk/cross-city-trastevere.webp', label: 'Trastevere · Rome' },
        ],
        legend: [
          ['#64b787', 'low'],
          ['#c1a671', 'medium'],
          ['#9e5b51', 'high risk'],
        ],
        caption: 'One model, three fabrics: the reading breaks where the morphology diverges.',
      },
    ],
  },
  /* The sweep runs the full art column as the band, and what remains fits a
   * single rank beneath it at one shared height: the solver's mechanism and
   * the box it earns. The mesh steps off; it was the transitional state, and
   * a band this tall leaves room only for the argument's two ends. Not the
   * finished render either: the cover on the sheet is already that picture. */
  legoarch: {
    band: 'projects/legoarch/lora-sweep.webp',
    row: ['projects/legoarch/split-and-merge.svg', 'projects/legoarch/box-and-booklet.webp'],
    rowFit: 'height',
    /* The briefs end near the band's foot, and the aside closes the text
     * column the way sensi's persona does. It is the builder itself, caught
     * mid-handoff: the one place the reader sees the interface, and the mesh
     * lives on inside it, on the left of the slider. */
    aside: 'projects/legoarch/mesh-vs-lego.webp',
    /* Narrower than sensi's persona by a hand: at 83mm the builder's caption
     * ran three millimetres into the foot margin under these briefs. */
    asideW: 76,
    /* The row keeps the height it had; the sweep yields the few millimetres
     * the honest caption zone costs, rather than the solver and the box. */
    rowH: 32,
  },
  /* The site's cover is the topology loop, and its poster is a card diagram:
   * web furniture at sheet size. The sheet prints the Andes render instead,
   * the picture the last section keeps for itself, with the environmental
   * machine beneath it: the tagline says the tower breathes, and this is the
   * drawing of how. The verso argues the structure in order: the lung
   * analogy across the band, and under it the skeleton it becomes, the three
   * load stages beside the column resolving into its lattice. The facade
   * stays in the site's gallery; six sections do not fit on one page. */
  'breathing-mass': {
    /* The sheet is the seminar's core: the deterministic engine as the cover,
     * the lung analogy it grew from beneath it. The verso then owes the
     * tower itself, the render against the Andes, as the band; the facade's
     * two modes close the text column as the aside; and the rank beneath the
     * tower holds the skeleton's three load stages and the environmental
     * machine. Every section but the volume scatter has its plate. The
     * topology loop stays on the site. */
    cover: 'projects/breathing-mass/data-engine.webp',
    sheet: 'projects/breathing-mass/lung-analogy.webp',
    band: 'projects/breathing-mass/cover.webp',
    aside: 'projects/breathing-mass/adaptive-facade.webp',
    asideW: 83,
    row: ['projects/breathing-mass/structure.webp', 'projects/breathing-mass/breathing-core.webp'],
    rowFit: 'height',
    /* The row keeps its 45mm and the tower yields a little width for it:
     * the three load stages and the machine are too small to read below that. */
    rowH: 45,
  },
  /* The sheet came back as vector (the Feb 2025 .ai), so the board's
   * drawings print without the photograph behind them: the ring by level
   * with the pods and the plan as the band, the long section through the
   * crater pit beneath it at the full width. Both are rendered from the .ai
   * at 300dpi with the neighbouring drawings painted out of each crop. The
   * systems diagram and the generated views stay on the site; at 177mm the
   * diagram's type would be under three points. */
  marception: {
    /* The crater render fills the plate box: the ring keeps its place and
     * the canyon flanks give up a fifth of their width, which beats paper
     * above and below. No taller source exists; the board's copy has the
     * title over its sky. */
    /* The sheet prints the whole upscaled render rather than the site's 4:3
     * cover: a 16:9 frame gives the box's crop room to sit where the ring is
     * whole with ground on either side. The award mark is drawn on the page
     * at the plate's bottom-left, so no crop can take it. */
    cover: 'projects/marception/render.webp',
    coverFit: 'cover',
    coverPos: 'right center',
    badge: { src: 'projects/marception/top-50.png', w: 26 },
    band: 'projects/marception/levels-and-plan.webp',
    /* The section runs the whole page as the foot, the one plate in the
     * book that does: a long section wants length. It costs the columns
     * above it 57mm, which is why the briefs here are the shortest set. */
    foot: 'projects/marception/section.webp',
  },
  /* The step-by-step opens the page, the exploded system answers it beneath,
   * and the three tonal references close the text column as a quiet strip.
   * The old concept card held collage and axo as one picture; divided, each
   * half sits where its argument is. */
  /* The sheet reads image over instrument, the way legoarch's does: the
   * render above, the whole definition beneath it. The verso then argues in
   * order: the rule the aggregation obeys as the band, and everything the
   * model reports back beneath it at the full width of the wall. */
  huddle: {
    sheet: 'projects/huddle/workflow.webp',
    band: 'projects/huddle/module-derivation.webp',
    /* Two portrait columns under the rule: the solver caught mid-iteration,
     * and the skin's panels placed from the indices. The full data board was
     * too much for one page; it stays in the site's gallery. */
    row: ['projects/huddle/wasp-iteration.webp', 'projects/huddle/panel-placement.webp'],
    rowFit: 'height',
    /* Pinned to what a one-line caption on the derivation leaves: the
     * diagram keeps its full width and the solver and the skin gain 3mm. */
    rowH: 89,
  },
  /* The sheet is the dusk render and there is no room under it, so the
   * verso is the drawing set. A practice project's evidence is its
   * drawings; the renders are what the site's gallery is for. */
  saria: {
    /* The dusk render is a tall portrait and the 4:3 cover cut from it left
     * paper above and below on the sheet. The render itself fills the box,
     * anchored at the water so the podium and the promenade stay; what goes
     * is sky and the tower's crown, which the elevation overleaf carries. */
    cover: 'projects/saria/dusk-facade.webp',
    coverFit: 'cover',
    coverPos: 'center 80%',
    /* The drawing set, cut from the vector SD1 sheets: two elevations and
     * the section as one rank at a shared height; the two plans to the right
     * beneath, pinned tall enough to read, so the elevations yield; the
     * crown against the skyline closes the text column at its own 16:9. */
    band: [
      'projects/saria/elevation-north-west.webp',
      'projects/saria/elevation-north-east.webp',
      'projects/saria/section.webp',
    ],
    row: ['projects/saria/plan-level-01.webp', 'projects/saria/plan-typical.webp'],
    rowFit: 'height',
    rowH: 62,
    rowAlign: 'right',
    /* A wider gap than the gutter, so the amenity floor sits off the typical
     * floor rather than against it. */
    rowGap: 24,
    /* Wider than the text column: the render runs into the gutter, which the
     * plans, held to the right, leave clear. 105mm is what the briefs leave
     * below them at 16:9. */
    aside: 'projects/saria/skyline.webp',
    asideW: 105,
  },
  /* The rank opens on the built thing: the section through the hall with
   * the exploded system beside it on the right; the form-finding steps run
   * beneath at the column's width; the references close the text column. */
  'luminous-stratum': {
    /* The cover and the interior pair under it summed to 175 of the box's
     * 186mm, five and a half of paper at head and foot. The cover fills the
     * difference, cropped a little at the flanks; the pair keeps its width. */
    sheet: 'projects/luminous-stratum/interior.webp',
    coverFit: 'cover',
    coverH: 124,
    band: ['projects/luminous-stratum/section.webp', 'projects/luminous-stratum/exploded-system.webp'],
    row: ['projects/luminous-stratum/form-finding-poster.webp'],
    rowFit: 'height',
    aside: 'projects/luminous-stratum/concept-strip.webp',
    asideW: 83,
  },
}

function plannedVerso(p, pool, used) {
  const plan = VERSO_PLAN[p.slug]
  if (!plan) return null
  const bySrc = new Map(pool.map((f) => [f.src, f]))
  const claim = (s) => {
    const f = bySrc.get(s)
    if (!f) throw new Error(`verso plan for ${p.slug}: ${s} is not in its sections`)
    used.add(s)
    return f
  }
  /* A grid plan names four plates in reading order and hands them to the
   * measured four-up arrangement; the sizing stays the engine's. */
  if (plan.grid) return versoLayout(p, plan.grid.map(claim), 0)
  /* A columns plan divides the art column into columns of its own, each a
   * stack of entries top to bottom: a src prints at the column's width, a
   * list prints as a rank at one shared height across it. A stack taller
   * than the page is scaled down as one, so its plates keep their relation;
   * a shorter one spreads to the head and the foot. Column widths are given
   * in millimetres and must sum to the art column with a gutter between. */
  if (plan.cols) {
    const colH = PAGE_H - VERSO_HEAD
    const cols = plan.cols.map((col) => {
      const entries = col.stack.map((e) => {
        if (Array.isArray(e)) {
          const figs = e.map(claim)
          const sumA = figs.reduce((a, f) => a + f.a, 0)
          const h = (col.w - VERSO_GUTTER * (figs.length - 1)) / sumA
          return { rank: figs.map((f) => ({ plate: f, w: h * f.a, h })), h }
        }
        const f = claim(e)
        return { plate: f, w: col.w, h: col.w / f.a }
      })
      const zones = BOT_MM * entries.length + VERSO_GUTTER * (entries.length - 1)
      const plates = entries.reduce((a, e) => a + e.h, 0)
      const k = Math.min(1, (colH - zones) / plates)
      const scale = (c) => ({ plate: c.plate, w: c.w * k, h: c.h * k })
      return {
        w: col.w,
        entries: entries.map((e) => (e.rank ? { rank: e.rank.map(scale), h: e.h * k } : scale(e))),
      }
    })
    let asideRank = null
    let aside = null
    if (Array.isArray(plan.aside)) {
      const figs = plan.aside.map(claim)
      const sumA = figs.reduce((a, f) => a + f.a, 0)
      const h = (plan.asideW - ASIDE_GAP * (figs.length - 1)) / sumA
      asideRank = figs.map((f) => ({ plate: f, w: h * f.a, h }))
      aside = asideRank[0]
    } else if (plan.aside) {
      const f = claim(plan.aside)
      aside = { plate: f, w: plan.asideW, h: plan.asideW / f.a }
    }
    return {
      plan: { cols, aside, asideRank, band: null, bandRank: null, row: [], foot: null },
      cols: 1,
      cells: [],
      text: p.sections.reduce((a, sec) => a + sectionTextMm(sec.brief ?? '', TEXT_COL), 0),
      over: 0,
      spare: 0,
    }
  }
  /* A stacked plan names its two plates in the order they print. An entry is
   * a src, sized the way the measured stacked arrangement sizes a plate, or
   * a composed strip: a row of images at one shared height, each with its
   * typeset sublabel, a swatch legend and a caption of its own. */
  if (plan.stack) {
    const colH = PAGE_H - VERSO_HEAD
    const artW = PAGE_W - TEXT_COL - VERSO_GUTTER
    const cellH = (colH - VERSO_GUTTER) / 2
    const GAP = 4
    const cells = plan.stack.map((entry) => {
      if (typeof entry === 'string') {
        const f = claim(entry)
        const h = Math.min(cellH - CAP_MM, artW / f.a)
        return { plate: f, w: h * f.a, h }
      }
      const figs = entry.strip.map((s) => ({ ...claim(s.src), label: s.label }))
      const sumA = figs.reduce((a, f) => a + f.a, 0)
      const h = Math.min(cellH - CAP_MM - 6, (artW - GAP * (figs.length - 1)) / sumA)
      return { strip: { figs, h, gap: GAP, legend: entry.legend, caption: entry.caption }, w: artW, h }
    })
    return {
      cols: 1,
      cells,
      text: p.sections.reduce((a, sec) => a + sectionTextMm(sec.brief ?? '', TEXT_COL), 0),
      over: 0,
      spare: 0,
    }
  }
  if (!plan.band) return null
  const artW = PAGE_W - TEXT_COL - VERSO_GUTTER
  const fit = (f, w) => ({ plate: f, w, h: w / f.a })
  /* A foot plate is drawn first because it decides the column: it takes the
   * page's whole width and both columns above it shorten by its height. The
   * text is measured against what is left, so a foot that leaves the briefs
   * no room says so in the run rather than pushing a paragraph off the page. */
  const foot = plan.foot ? fit(claim(plan.foot), PAGE_W) : null
  const colH = PAGE_H - VERSO_HEAD - (foot ? foot.h + CAP_MM + VERSO_GUTTER : 0)
  /* A rank shares one height and the column's width, gutter included, the
   * way a composed strip does; a single plate takes the column's width. */
  let bandRank = null
  let band
  if (Array.isArray(plan.band)) {
    const figs = plan.band.map(claim)
    const sumA = figs.reduce((a, f) => a + f.a, 0)
    let h = (artW - VERSO_GUTTER * (figs.length - 1)) / sumA
    h = Math.min(h, colH - CAP_MM)
    bandRank = figs.map((f) => ({ plate: f, w: h * f.a, h }))
    band = bandRank[0]
  } else {
    band = fit(claim(plan.band), artW)
    if (band.h > colH - CAP_MM) band = { plate: band.plate, h: colH - CAP_MM, w: (colH - CAP_MM) * band.plate.a }
  }
  /* The row fits by width when the band leaves it room to stand tall, or by
   * height when the band has taken most of the column: whatever the band and
   * gutter leave, the rank shares as one plate line. A plan may pin the row's
   * height instead (`rowH`), and then the band is what yields: it is scaled
   * down to the room the pinned row leaves. */
  let row = []
  if (plan.rowFit === 'height') {
    const bandZone = Math.max(...(bandRank ?? [band]).map(topZone))
    let rankH = colH - (band.h + bandZone) - VERSO_GUTTER - BOT_MM
    if (plan.rowH) {
      rankH = plan.rowH
      const maxBand = colH - bandZone - VERSO_GUTTER - rankH - BOT_MM
      if (band.h > maxBand) {
        const scale = (f) => ({ plate: f.plate, h: maxBand, w: maxBand * f.plate.a })
        if (bandRank) { bandRank = bandRank.map(scale); band = bandRank[0] } else band = scale(band)
      }
    }
    row = (plan.row ?? []).map((s) => {
      const f = claim(s)
      const w = Math.min(artW, rankH * f.a)
      return { plate: f, w, h: w / f.a }
    })
  } else if (plan.row) {
    const rowW = (artW - VERSO_GUTTER) / 2
    row = plan.row.map((s) => fit(claim(s), rowW))
  }
  /* An aside may also be a rank: two plates at one shared height sharing
   * the aside's width, with a tighter gap than the art column's gutter. */
  let asideRank = null
  if (Array.isArray(plan.aside)) {
    const figs = plan.aside.map(claim)
    const sumA = figs.reduce((a, f) => a + f.a, 0)
    const h = (plan.asideW - ASIDE_GAP * (figs.length - 1)) / sumA
    asideRank = figs.map((f) => ({ plate: f, w: h * f.a, h }))
  }
  return {
    plan: {
      band,
      bandRank,
      row,
      aside: asideRank ? asideRank[0] : plan.aside ? fit(claim(plan.aside), plan.asideW) : null,
      asideRank,
      foot,
    },
    cols: 1,
    cells: [],
    colH,
    text: p.sections.reduce((a, sec) => a + sectionTextMm(sec.brief ?? '', TEXT_COL), 0),
    over: foot ? p.sections.reduce((a, sec) => a + sectionTextMm(sec.brief ?? '', TEXT_COL), 0) - colH : 0,
    spare: 0,
  }
}

/*
 * The whole spread, decided before any HTML exists. The sheet takes the cover
 * at its own aspect and at most one large figure; the verso tries a full
 * width band first, falls back to a figure column beside two wider text
 * columns, and a write-up too long for either simply keeps the whole page,
 * with a note so the run says which project is text bound.
 */
async function layout(p, sheetIndex) {
  const plan = VERSO_PLAN[p.slug]
  /* A plan may name the cover plate itself. A project whose site cover is a
   * video prints its poster by default, and the poster is not always the
   * picture that belongs on the sheet. The override has to be one of the
   * project's own section images, and it leaves the pool the way the cover
   * does: it is the plate you are already looking at. */
  const coverSrc = plan?.cover ?? posterFor(p)
  if (plan?.cover && !p.sections.some((s) => s.media.some((m) => stillOf(m) === plan.cover)))
    throw new Error(`verso plan for ${p.slug}: cover ${plan.cover} is not in its sections`)
  const pool = await figPool(p, coverSrc)
  const used = new Set()

  const coverA = await aspectOf(coverSrc)
  /* A pipeline strip is the sheet's second element when the project carries
   * one, and it takes its room before the cover rather than after: the cover
   * is the thing that can afford to be smaller. The strip is then drawn at the
   * cover's own width, so the two read as one block instead of one overhanging
   * the other. */
  const strip = p.pipeline ? DIAGRAM_H + 7 : 0
  /* A plan may fill the plate box with the cover instead of fitting it: the
   * source is taller than the box, the box takes its width and height and
   * the picture is cropped to it, anchored where the plan says. Bare on the
   * sheet like any cover; only the fit changes. */
  const fill = plan?.coverFit === 'cover'
  /* A filled cover may stop short of the box (coverH), leaving the rest to
   * the figure under it: the two then close the box between them. */
  const coverH = fill ? (plan.coverH ?? PAGE_H - strip) : Math.min(PAGE_H - strip, PLATE_W / coverA)
  const coverW = fill ? PLATE_W : Math.min(PLATE_W, coverH * coverA)
  const coverPos = plan?.coverPos ?? 'center'

  /* A pinned sheet figure claims before the verso, deliberately reversing the
   * usual order: the pin is the design saying this picture belongs under the
   * cover, and the section that carried it takes its next image instead. */
  /* A plan may also say the sheet is the cover alone: `sheet: false` leaves
   * the room under it empty rather than letting the pick fill it. */
  let sheetFig = null
  if (!p.pipeline && plan?.sheet) {
    const f = pool.find((x) => x.src === plan.sheet)
    if (!f) throw new Error(`verso plan for ${p.slug}: ${plan.sheet} is not in its sections`)
    used.add(f.src)
    const h = Math.min(PAGE_H - coverH - 7, PLATE_W / f.a)
    sheetFig = { fig: f, h, w: h * f.a }
  }

  /* Otherwise the verso is decided first, because its plates are bound to the
   * sections that argue for them and the sheet's is not bound to anything.
   * Claiming in the other order let the sheet take an image out from under
   * the paragraph that was about it. Whatever the verso could not fit is
   * released, so the sheet can still use a picture the writing had no room
   * for. */
  const verso = plannedVerso(p, pool, used) ?? versoLayout(p, await sectionPlates(p, used), sheetIndex)

  if (!p.pipeline && !sheetFig && plan?.sheet !== false) sheetFig = pickSheetFig(pool, used, PAGE_H - coverH - 7)

  return { pool, coverSrc, coverA, coverH, coverW, coverFit: fill ? 'cover' : 'fill', coverPos, sheetFig, ...verso }
}

// ── pages ─────────────────────────────────────────────────────────────────
const siteUrl = (contact.site ?? 'https://charlesabichahine.com').replace(/\/+$/, '')
const site = siteUrl.replace(/^https?:\/\//, '')

/* A sheet is a page of a project that has a page of its own, and this is it:
 * the card /work opens, prerendered at its own URL. Printed it reads as the
 * address, and on screen it is the way to the demos, the full gallery and the
 * write-up that would not fit here. */
const cardUrl = (p) => `${siteUrl}/work/${p.slug}`
const cardLabel = (p) => `${site}/work/${p.slug}`
const years = projects.map((p) => p.date.slice(0, 4))
const span = `${years.reduce((a, b) => (b < a ? b : a))}–${years.reduce((a, b) => (b > a ? b : a))}`
const inBook = (p) => chosen.includes(p)

/* The index strip, translated: every project's glyph on a hairline rule, the
 * ones in this portfolio lit in their belt colour with their sheet number, the
 * rest waiting at 35% the way the site's strip dims tiles that are off screen. */
const strip = (litOf, size, sub = null) =>
  `<div class="strip">${grouped
    .map((p) => {
      const lit = litOf(p)
      return `<span class="cell${lit ? ' lit' : ''}" style="--b:${beltFor(p).color}">${glyph(p.slug, size)}${
        sub ? `<span class="sub">${lit ? sub(p) : '·'}</span>` : ''
      }</span>`
    })
    .join('')}</div>`

/*
 * The cover reads like the landing: the name is the subject, centred with the
 * accent full stop, the role and one serif sentence under it, the field of
 * marks scattered around the type as a drawing rather than parked beside it,
 * and the four belts closing the sheet with their colour rules and true
 * counts. The positions are a composed constellation, one per project in belt
 * order, kept clear of the type in the middle and the belts at the foot; they
 * are design, not data, which is why they are literals.
 */
/*
 * The cover's field: a fragment of the cross-cap, surveyed.
 *
 * The surface, its equations and the projection now live in a module the site's
 * own cover shares, so the printed surface and the on-screen one can never drift
 * apart: see src/lib/crosscap.js. What stays here is design rather than data —
 * which way the thing is turned, how far the page is zoomed, and where the frame
 * sits on it. The page shows a fragment and runs off every edge, because a cover
 * that contained the whole object would be a diagram of it; this is a detail of
 * something larger, which is the relationship the booklet has to the work.
 */
/* Turned so the pinch, where the surface crosses itself and every point piles
 * up, sits high and right. Centred it ran a dense smear straight down through
 * the name; off to a corner it becomes the thing the eye lands on and the rest
 * of the page stays open. Framed for A4 landscape; the site picks its own view
 * for the viewport off the same maths. */
const CC_VIEW = { yaw: 90, pitch: 34, zoom: 2.4, cx: 0.86, cy: 0.3 }

/* Only every seventeenth station carries its number, the cadence the landing
 * uses (LABEL_EVERY in Home.jsx): one numbered circle says survey, four
 * thousand say noise. Kept in step with the site by hand, like the colours. */
const LABEL_EVERY = 17

/* Fitted to the page at CC_VIEW.zoom times its natural size. Points outside the
 * trim plus a small bleed are dropped rather than drawn and clipped, because a
 * page carrying a thousand invisible circles is a page nobody's reader can open. */
function coverField() {
  const flat = crossCap().map(makeProjector(CC_VIEW.yaw, CC_VIEW.pitch))
  const xs = flat.map((p) => p.px)
  const ys = flat.map((p) => p.py)
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const k = (PAGE_MM.w * CC_VIEW.zoom) / Math.max(spanX, spanY)
  const ox = PAGE_MM.w * CC_VIEW.cx - ((Math.min(...xs) + Math.max(...xs)) / 2) * k
  const oy = PAGE_MM.h * CC_VIEW.cy + ((Math.min(...ys) + Math.max(...ys)) / 2) * k
  const bleed = 6
  return flat
    .map((p) => ({ id: p.id, X: ox + p.px * k, Y: oy - p.py * k, depth: p.depth }))
    .filter((p) => p.X > -bleed && p.X < PAGE_MM.w + bleed && p.Y > -bleed && p.Y < PAGE_MM.h + bleed)
    .sort((m, n) => m.depth - n.depth)
}

const PAGE_MM = { w: 297, h: 210 }

const cover = `
<section class="page cover">
  <p class="eyebrow" style="position:absolute;left:12mm;top:12mm">Selected work · ${span}</p>
  <svg class="ccfield" viewBox="0 0 ${PAGE_MM.w} ${PAGE_MM.h}" width="${PAGE_MM.w}mm" height="${PAGE_MM.h}mm">
    ${coverField()
      .map(
        (p) =>
          `<circle cx="${p.X.toFixed(2)}" cy="${p.Y.toFixed(2)}" r="0.24"/>${
            p.id % LABEL_EVERY === 0
              ? `<text x="${(p.X + 1.7).toFixed(2)}" y="${(p.Y + 0.85).toFixed(2)}">${String(p.id).padStart(4, '0')}</text>`
              : ''
          }`,
      )
      .join('')}
  </svg>
  <div class="name">
    <span class="wash" aria-hidden="true"></span>
    <h1>Charles Abi Chahine<span class="dot">.</span></h1>
    <p class="role">${esc(role)}</p>
    <p class="lede">${esc(summary)}</p>
  </div>
  <div class="cover-foot"><p>${esc(site)}</p></div>
</section>`

/* The index names the eight that are printed; the other ten are marks on the
 * strip and a count in the foot, not a list, because /work is their index. */
const index = `
<section class="page sidx">
  <p class="eyebrow">The index · ${word(chosen.length)} sheets from ${word(projects.length)} projects</p>
  ${strip(inBook, 8, (p) => pad(chosen.indexOf(p) + 1))}
  <ol>
    ${chosen
      .map(
        (p, i) => `<li>
      <span class="no">${pad(i + 1)}</span>
      <span style="color:${beltFor(p).color}">${glyph(p.slug, 5)}</span>
      <span class="t">${esc(p.title)}</span>
      <span class="tag">${esc(p.tagline)}</span>
      <span class="y">${esc(p.year)}</span>
    </li>`,
      )
      .join('')}
  </ol>
  <p class="foot">${Word(projects.length - chosen.length)} more, with every gallery and demo, at ${esc(site)}/work</p>
</section>`

/*
 * The rule of annotation, held everywhere: a sheet shows its plates bare,
 * the title block being the only voice the recto has; a verso numbers every
 * plate it prints as FIG <sheet>.<count>, the sheet's own number then the
 * figure's, counted from one in reading order, each with its title. A
 * label on the sheet would compete with the title block, and a plate on the
 * verso without one would be evidence with no exhibit number.
 */
async function sheet(p, i, lay) {
  const b = beltFor(p)
  const plan = VERSO_PLAN[p.slug]
  const coverW = lay.coverW
  let fig = ''
  if (p.pipeline) {
    fig = `<div class="rband">${pipelineHtml(p, coverW)}</div>`
  } else if (lay.sheetFig) {
    const f = lay.sheetFig
    fig = `<div class="rband"><figure><img src="${await img(f.fig.src, Math.min(2000, Math.round(f.w * 8)))}" alt="" style="width:${mm(f.w)};height:${mm(f.h)}"></figure></div>`
  }
  /* A badge is the one thing allowed over a cover: an award mark at the
   * plate's bottom-left, embedded as PNG so its transparency survives (img()
   * flattens onto white). It is decoration, not content, so it is the one
   * src a plan may name that is not in the sections. */
  const badge = plan?.badge
    ? `<img class="badge" src="data:image/png;base64,${readFileSync(resolve(PUBLIC, plan.badge.src)).toString('base64')}" alt="" style="width:${mm(plan.badge.w)}">`
    : ''
  return `
<section class="page sheet">
  <div class="plates">
    <figure class="cov">${badge}<img src="${await img(lay.coverSrc, Math.min(2000, Math.round(coverW * 8)))}" alt="" style="width:${mm(coverW)};height:${mm(lay.coverH)};object-fit:${lay.coverFit};object-position:${lay.coverPos}"></figure>
    ${fig}
  </div>
  <div class="tb">
    <p class="sno"><a href="${cardUrl(p)}">${esc(cardLabel(p))}</a></p>
    <span class="g" style="color:${b.color}">${glyph(p.slug, 12)}</span>
    <h2>${esc(p.title)}<span class="dot">.</span></h2>
    <p class="yr">${esc(p.year)}</p>
    <p class="bl" style="color:${b.color}">${esc(b.label)}</p>
    <p class="award">${p.award ? esc(p.award) : ''}</p>
    <p class="tagline">${esc(p.tagline)}</p>
    ${p.intro.map((t) => `<p class="body">${esc(t)}</p>`).join('')}
    <dl class="meta">
      <dt>Module</dt><dd>${esc(p.module)}</dd>
      <dt>Team</dt><dd>${esc(p.team.join(', '))}</dd>
      <dt>Tools</dt><dd>${esc(p.tools.join(' · '))}</dd>
      ${p.links?.live ? `<dt>Live</dt><dd><a href="${esc(p.links.live)}">${esc(bare(p.links.live))}</a></dd>` : ''}
    </dl>
  </div>
</section>`
}

async function verso(p, i, lay) {
  const b = beltFor(p)
  const write = p.sections
    .map(
      (sec, si) => `<div class="ws">
      <h4 style="color:${b.color}">${pad(si + 1)} · ${esc(sec.heading)}</h4>
      <p>${esc(sec.brief ?? '')}</p>
    </div>`,
    )
    .join('')

  /* A planned figure carries its width on the figure itself, not only the
   * image: left free, a flex row lets a long caption widen its figure and
   * shove the neighbour off the band's edge. `cls` marks the ones that sit on
   * the page's bottom content edge. Every verso plate is numbered, per the
   * rule of annotation above: FIG on its own label line, DEMO beside it when
   * the plate stands for something that moves. */
  const vfig = async (c, n, cls = '') => `<figure class="vfig${cls ? ` ${cls}` : ''}"${cls ? ` style="width:${mm(c.w)}"` : ''}>
      <img src="${await img(c.plate.src, Math.min(2000, Math.round(c.w * 8)))}" alt="" style="width:${mm(c.w)};height:${mm(c.h)}">
      <p class="fl">FIG ${pad(i + 1)}.${n}${c.plate.m.type !== 'image' ? ' · DEMO' : ''}</p>
      <p class="ct">${esc(c.plate.m.caption ?? '')}</p>
    </figure>`

  const run = `<div class="run"><span><a class="rl" href="${cardUrl(p)}">${esc(cardLabel(p))}</a> · ${esc(p.title)}</span><span style="color:${b.color}">${esc(b.label)}</span></div>`

  if (lay.plan?.cols) {
    const first = lay.plan.cols[0].entries[0]
    const firstFigs = first.rank ?? [first]
    const asideFigs = lay.plan.asideRank ?? (lay.plan.aside ? [lay.plan.aside] : [])
    let n = firstFigs.length + asideFigs.length
    const asideHtml = asideFigs.length
      ? `<div class="vaside">${lay.plan.asideRank ? `<div class="vrow" style="gap:${mm(ASIDE_GAP)};justify-content:flex-start">` : ''}${(await Promise.all(asideFigs.map((c, ai) => vfig(c, firstFigs.length + ai + 1, 'vbot')))).join('')}${lay.plan.asideRank ? '</div>' : ''}</div>`
      : ''
    const colsHtml = []
    for (const [ci, col] of lay.plan.cols.entries()) {
      const parts = []
      for (const [ei, e] of col.entries.entries()) {
        const bottom = ei === col.entries.length - 1 ? 'vbot' : ''
        const figs = e.rank ?? [e]
        const html = []
        for (const c of figs) {
          const num = ci === 0 && ei === 0 ? figs.indexOf(c) + 1 : ++n
          html.push(await vfig(c, num, bottom))
        }
        parts.push(e.rank ? `<div class="vrow" style="justify-content:flex-start">${html.join('')}</div>` : html.join(''))
      }
      colsHtml.push(`<div class="vcol" style="width:${mm(col.w)}">${parts.join('')}</div>`)
    }
    return `
<section class="page verso">
  ${run}
  <div class="vbody">
    <div class="vtext">${write}${asideHtml}</div>
    <div class="vplan" style="flex-direction:row;justify-content:flex-start">${colsHtml.join('')}</div>
  </div>
</section>`
  }

  if (lay.plan) {
    /* Reading order numbers the band first, the aside second when the text
     * column carries one, then the rank left to right. */
    const bandFigs = lay.plan.bandRank ?? [lay.plan.band]
    const asideFigs = lay.plan.asideRank ?? (lay.plan.aside ? [lay.plan.aside] : [])
    const rowStart = bandFigs.length + asideFigs.length + 1
    const asideHtml = asideFigs.length
      ? `<div class="vaside">${lay.plan.asideRank ? `<div class="vrow" style="gap:${mm(ASIDE_GAP)};justify-content:flex-start">` : ''}${(await Promise.all(asideFigs.map((c, ai) => vfig(c, bandFigs.length + ai + 1, 'vbot')))).join('')}${lay.plan.asideRank ? '</div>' : ''}</div>`
      : ''
    const bandHtml = lay.plan.bandRank
      ? `<div class="vrow"${VERSO_PLAN[p.slug]?.bandAlign === 'left' ? ' style="justify-content:flex-start"' : ''}>${(await Promise.all(bandFigs.map((c, bi) => vfig(c, bi + 1, 'vbot')))).join('')}</div>`
      : await vfig(lay.plan.band, 1, 'vband')
    const rowFigs = []
    for (const [ri, c] of lay.plan.row.entries()) rowFigs.push(await vfig(c, rowStart + ri, 'vbot'))
    /* The foot is read last: it is the page's bottom edge, under both columns. */
    const foot = lay.plan.foot ? `<div class="vfoot">${await vfig(lay.plan.foot, rowStart + lay.plan.row.length)}</div>` : ''
    return `
<section class="page verso">
  ${run}
  <div class="vbody">
    <div class="vtext">${write}${asideHtml}</div>
    <div class="vplan">
      ${bandHtml}
      ${rowFigs.length ? `<div class="vrow" style="${VERSO_PLAN[p.slug]?.rowAlign === 'right' ? 'justify-content:flex-end;' : ''}${VERSO_PLAN[p.slug]?.rowGap ? `gap:${mm(VERSO_PLAN[p.slug].rowGap)};` : ''}">${rowFigs.join('')}</div>` : ''}
    </div>
  </div>
  ${foot}
</section>`
  }

  /* A composed strip: the row of maps at one height, the sublabels in the
   * runner's voice, the legend drawn as swatches on the caption line. */
  const vstrip = async (c, n) => {
    const s = c.strip
    const cols = []
    for (const f of s.figs) {
      const w = f.a * s.h
      cols.push(`<div class="scol" style="width:${mm(w)}">
        <img src="${await img(f.src, Math.min(2000, Math.round(w * 8)))}" alt="" style="width:${mm(w)};height:${mm(s.h)}">
        <p class="sl">${esc(f.label)}</p>
      </div>`)
    }
    const legend = s.legend
      .map(([col, t]) => `<span class="lg" style="background:${col}"></span>${esc(t)}`)
      .join('<span class="lgap"></span>')
    return `<figure class="vfig">
      <div class="srow" style="gap:${mm(s.gap)}">${cols.join('')}</div>
      <p class="fl">FIG ${pad(i + 1)}.${n}</p>
      <p class="ct">${legend}<span class="lgap"></span>${esc(s.caption)}</p>
    </figure>`
  }

  const plates = []
  for (const [ci, c] of lay.cells.entries())
    plates.push(c.strip ? await vstrip(c, ci + 1) : await vfig(c, ci + 1))

  return `
<section class="page verso">
  ${run}
  <div class="vbody">
    <div class="vtext">${write}</div>
    <div class="vart" style="grid-template-columns:repeat(${lay.cols},minmax(0,1fr))">${plates.join('')}</div>
  </div>
</section>`
}

/* The closing is the index's complement: the ten the book left out, listed
 * the way the index lists the eight, each row a link to its page on the site,
 * and the foot strip lighting those ten where the index lit the eight. The
 * belts the landing once hung from are gone from the site; what remains of
 * them here is the colour a project's group lends its mark. */
const rest = grouped.filter((p) => !inBook(p))
const closing = `
<section class="page closing">
  <div>
    <p class="eyebrow">The rest of it</p>
    <h2>The other ${word(rest.length)}<span class="dot">.</span></h2>
    <p class="lede">This portfolio is a selection of ${word(chosen.length)} from ${word(projects.length)}. The other ${word(rest.length)}, with every gallery, demo and write-up, are on the site.</p>
    <ol class="rest">
      ${rest
        .map(
          (p) => `<li>
        <span style="color:${beltFor(p).color}">${glyph(p.slug, 5)}</span>
        <a class="t" href="${cardUrl(p)}">${esc(p.title)}</a>
        <span class="tag">${esc(p.tagline)}</span>
        <span class="y">${esc(p.year)}</span>
      </li>`,
        )
        .join('')}
    </ol>
  </div>
  <div>
    ${strip((p) => !inBook(p), 6)}
    <div class="cover-foot"><p>${esc(site)}/work</p><p>${esc(contact.email)}</p></div>
  </div>
</section>`

/* The back is the cover turned over, without the field: the mark takes the
 * name's place at the centre of the plain page, with the three addresses on
 * one line beneath it; the foot carries the copyright where the cover
 * carries the site, and the site opposite. The mark is the site's logo.svg
 * drawn inline so its red stroke is the print accent, the same red as the
 * period after the name. The year is the latest project's, so the same
 * sources keep printing the same page. */
const thisYear = years.reduce((a, b) => (b > a ? b : a))
const back = `
<section class="page back">
  <div class="mark">
    <svg viewBox="0 0 110 100" aria-hidden="true">
      <g fill="none" stroke="var(--ink)" stroke-linecap="round">
        <circle cx="48" cy="50" r="40" stroke-width="6" pathLength="100" stroke-dasharray="86 14" transform="rotate(18 48 50)" />
        <circle cx="48" cy="50" r="31" stroke-width="5.5" pathLength="100" stroke-dasharray="38 10 40 12" transform="rotate(-30 48 50)" />
      </g>
      <rect x="93" y="57" width="5" height="25" rx="1" fill="var(--accent)" />
    </svg>
    <p class="contacts"><a href="${esc(contact.linkedin)}">${esc(bare(contact.linkedin))}</a><span class="sep">·</span><a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a><span class="sep">·</span><a href="${esc(contact.github)}">${esc(bare(contact.github))}</a></p>
  </div>
  <div class="cover-foot"><p>© ${thisYear} Charles Abi Chahine</p><p>${esc(site)}</p></div>
</section>`

const spreads = []
for (const [i, p] of chosen.entries()) {
  const lay = await layout(p, i)
  spreads.push(await sheet(p, i, lay))
  spreads.push(await verso(p, i, lay))
  /* What the run prints is what a look at the page would tell you: how the
   * plates were arranged, how big they are, how close the writing came to the
   * foot of its column, and how many plates the project had left over. */
  const edges = lay.cells.map((c) => Math.round(Math.max(c.w, c.h)))
  if (lay.over > 0) {
    console.log(
      `  note: ${p.slug} needs ${Math.round(lay.over)}mm more text column than the page has.\n` +
        '        Shorten a brief in projects.js; nothing here truncates.',
    )
  }
  const versoNote = lay.plan?.cols
    ? `verso planned: cols ${lay.plan.cols.map((c) => c.entries.map((e) => (e.rank ?? [e]).map((x) => `${Math.round(x.w)}x${Math.round(x.h)}`).join('/')).join('+')).join(' | ')}` +
      (lay.plan.aside ? `, aside ${(lay.plan.asideRank ?? [lay.plan.aside]).map((c) => `${Math.round(c.w)}x${Math.round(c.h)}`).join('/')}` : '')
    : lay.plan
    ? `verso planned: band ${(lay.plan.bandRank ?? [lay.plan.band]).map((c) => `${Math.round(c.w)}x${Math.round(c.h)}`).join('/')}` +
      (lay.plan.row.length ? `, row ${lay.plan.row.map((c) => `${Math.round(c.w)}x${Math.round(c.h)}`).join('/')}` : '') +
      (lay.plan.aside ? `, aside ${(lay.plan.asideRank ?? [lay.plan.aside]).map((c) => `${Math.round(c.w)}x${Math.round(c.h)}`).join('/')}` : '') +
      (lay.plan.foot ? `, foot ${Math.round(lay.plan.foot.w)}x${Math.round(lay.plan.foot.h)}` : '')
    : `verso ${lay.cells.length} plates ${lay.cols === 2 ? '2x2' : 'stacked'} (${edges.join('/')}mm)`
  console.log(
    `  ${p.slug}: cover ${Math.round(lay.coverW)}x${Math.round(lay.coverH)}` +
      (p.pipeline ? ` + pipeline (${p.pipeline.halves.reduce((a, h) => a + h.stages.length, 0)} stages)` : '') +
      (lay.sheetFig ? `, sheet fig ${Math.round(lay.sheetFig.w)}x${Math.round(lay.sheetFig.h)}` : '') +
      `, ${versoNote}` +
      `, text ${Math.round(lay.text)}mm of ${Math.round(lay.colH ?? PAGE_H - VERSO_HEAD)}mm` +
      (lay.spare ? `, ${lay.spare} spare` : ''),
  )
}

// ── document ──────────────────────────────────────────────────────────────
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Charles Abi Chahine · Selected work</title>
<style>
${FONTS}
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
/* The site's light ramp as literals: nothing here goes through Tailwind, so
   these are kept in step with index.css by hand. White ground rather than the
   site's tinted paper, for the same reason the CV uses one: this is a document
   that gets printed. The rounded media well stays on the screen where it came
   from; here an image is a plate and prints bare.

   No rule on any page divides one thing from another. A line here either
   draws something (the index strip the glyphs stand on, the coloured belt
   rules, the two halves of a pipeline) or it is not there: the title block is
   separated by fifteen millimetres of paper, a caption by the gap above it,
   an index row by its own alignment. The single exception is the runner at
   the head of a write-up page, which is a masthead and reads as one.
   Everything that remains is --line, the grey the site means to nearly
   disappear, or a belt colour. Nothing is drawn in ink: a near-black rule
   reads as heavy whatever its width.
   The --color-* names are the ones belts.js hands back (its color fields are
   'var(--color-accent)' and friends) and the ones four glyphs use for their
   one accent stroke, so they must exist here under exactly those names. */
:root { --accent: #c9261b; --ink: #16181d; --soft: #4e535c; --muted: #6a707b;
        --line: #e0e3e7; --faint: #b9bec5;
        --color-accent: #c9261b; --color-blue: #1a5fd0;
        --color-green: #1a7f37; --color-amber: #a2571a; }
body { font-family: "Space Grotesk", sans-serif; color: var(--ink); background: #fff; }
/* Chrome turns an anchor into a real PDF link annotation, which is the point.
   It should not also turn it blue and underlined: on paper this is an address. */
a { color: inherit; text-decoration: none; }
img, svg { display: block; }

.page { width: 297mm; height: 210mm; padding: 12mm; overflow: hidden;
        page-break-after: always; break-after: page; position: relative;
        display: flex; flex-direction: column; }
.page:last-child { page-break-after: auto; break-after: auto; }

.eyebrow { font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: 0.18em;
           text-transform: uppercase; color: var(--muted); }
.dot { color: var(--accent); }
.cover-foot { display: flex; justify-content: space-between; align-items: baseline; }
.cover-foot p { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; color: var(--muted);
                letter-spacing: 0.1em; }

/* a plate's annotation: FIG number over its title. Verso only; the sheet
   prints its plates bare, per the rule of annotation in the pages section. */
figure { margin: 0; }
.fl { font-family: "IBM Plex Mono", monospace; font-size: 6.4pt; letter-spacing: 0.14em;
      color: var(--muted); margin-bottom: 1mm; }
.ct { font-family: "Spectral", Georgia, serif; font-size: 7.6pt; line-height: 1.45;
      color: var(--soft); }

/* the index strip */
.strip { display: flex; border-top: 0.5pt solid var(--line); }
.strip .cell { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2.4mm;
               padding-top: 3.6mm; color: var(--muted); opacity: 0.32; position: relative; }
.strip .cell.lit { opacity: 1; color: var(--b); }
.strip .cell.lit::before { content: ""; position: absolute; top: -0.7mm; left: 14%; right: 14%;
                           height: 1.1pt; background: var(--b); }
.strip .sub { font-family: "IBM Plex Mono", monospace; font-size: 6.6pt; color: var(--muted); }

/* cover: the landing, translated. The marks are the drawing; the type is the
   subject; the belts close the sheet. */
/* The surveyed cross-cap, behind everything. Hairline dots with a sparse run
   of station numbers, in the muted grey the site keeps for marks that are
   ground rather than figure. */
.ccfield { position: absolute; left: 0; top: 0; }
/* The landing's ink, carried to the page: dots in --muted at the canvas's own
   0.9, not full ink — printed dark they pulled the field forward of the name.
   The numbers sit at the viewport's own proportion (8px on a laptop's ~1100 is
   2.1 on 297mm), big enough to be read as numerals rather than paper grain. */
.ccfield circle { fill: var(--muted); fill-opacity: 0.9; }
.ccfield text { font-family: "IBM Plex Mono", monospace; font-size: 2.1px; fill: var(--faint); }
.cover .name { position: absolute; left: 50%; top: 76mm; transform: translate(-50%, -50%);
               width: 165mm; text-align: center; }
/* The landing solves this exact problem the same way: the type has to stay
   legible where it crosses the field, and a panel with an edge would cut the
   drawing in half, so the ground is brought back up under it with no edge at
   all. */
.cover .wash { position: absolute; inset: -14mm -18mm; z-index: -1; display: block;
               background: radial-gradient(ellipse at center, #ffffff 0%, #ffffff 46%,
                           rgba(255, 255, 255, 0) 100%); }
.cover h1 { font-size: 37pt; font-weight: 400; letter-spacing: -0.024em; line-height: 1.03; }
.cover .role { font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: var(--soft);
               letter-spacing: 0.08em; margin-top: 4.5mm; text-transform: lowercase; }
.cover .lede { font-family: "Spectral", Georgia, serif; font-size: 12pt; line-height: 1.6;
               color: var(--soft); margin-top: 5.5mm; }
/* The field runs to the trim on every edge and is left to. It used to be
   washed out along the foot to keep four belt bars and a count line clear;
   with those gone there is one address down there, and hiding the bottom of
   the drawing to protect it costs more than it saves.
   Positioned, so it paints over the field: the field is absolutely positioned
   and would otherwise stack above anything static, address included. */
.cover .cover-foot { position: relative; margin-top: auto; }

/* index page */
.sidx .strip { margin-top: 9mm; }
/* Two columns of four, read down then across, the closing's row a size up:
   number, mark, the title with its tagline beneath, the year at the right. */
.sidx ol { list-style: none; margin-top: 12mm; display: grid; grid-template-columns: 1fr 1fr;
           grid-template-rows: repeat(4, auto); grid-auto-flow: column; column-gap: 14mm; }
.sidx li { display: grid; grid-template-columns: 9mm 7mm 1fr 16mm; grid-template-rows: auto auto;
           column-gap: 3.5mm; align-items: baseline; padding: 4.2mm 0; }
.sidx li .no { font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: var(--accent);
               grid-column: 1; grid-row: 1; }
.sidx li > span:nth-child(2) { grid-column: 2; grid-row: 1 / span 2; align-self: start; }
.sidx li .t { font-size: 11pt; font-weight: 600; letter-spacing: -0.01em; grid-column: 3; grid-row: 1; }
.sidx li .tag { font-family: "Spectral", Georgia, serif; font-size: 8.5pt; color: var(--muted);
                grid-column: 3 / span 2; grid-row: 2; margin-top: 0.8mm; }
.sidx li .y { font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: var(--muted); text-align: right;
              grid-column: 4; grid-row: 1; }
.sidx .foot { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; color: var(--muted);
              letter-spacing: 0.08em; margin-top: auto; }

/* the sheet */
.sheet { flex-direction: row; }
/* Centred on the page's height: a cover that ends short of the foot leaves
   equal paper above and below rather than a corner void under it. The title
   block is already held at both ends, by the address and the meta, so the
   plates sit between those anchors. A column that fills the height does not
   move, so the five full sheets keep their hang and the three short ones are
   the only ones this touches. */
.sheet .plates { flex: 1; display: flex; flex-direction: column; justify-content: center;
                 padding-right: 8mm; min-width: 0; }
/* A figure narrower than the cover centres under it; the two read as one
   column either way. */
.sheet .rband { margin-top: 7mm; display: flex; justify-content: center; }
.sheet .cov { position: relative; align-self: flex-start; }
.sheet .cov .badge { position: absolute; left: 7mm; bottom: 7mm; z-index: 1; }
/* the pipeline strip. The half headers are the cover's belt rule reused: a
   coloured hairline with a mono name under it. The stage boxes are hairline
   boxes with square corners, because the fillet is a screen idiom and this is
   a drawing; the tint bands and rounded cards of the on-screen version would
   put the web back on the sheet. */
.pipe { display: flex; gap: 5mm; height: 26mm; }
.phalf { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.phead { border-top: 0.75pt solid; padding-top: 1.5mm; font-family: "IBM Plex Mono", monospace;
         font-size: 5.8pt; letter-spacing: 0.14em; text-transform: uppercase; }
.pdim { color: var(--muted); }
.psplit { border-left: 0.5pt dashed var(--line); align-self: stretch; }
.prow { display: flex; gap: 3mm; flex: 1; min-height: 0; margin-top: 2.2mm; }
.pstage { flex: 1; min-width: 0; border: 0.5pt solid var(--line); position: relative;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1mm; padding: 1.5mm 1.2mm; text-align: center; }
.pno { position: absolute; top: 1.2mm; left: 1.6mm; font-family: "IBM Plex Mono", monospace;
       font-size: 5.4pt; }
.pmark { color: var(--ink); }
.ptitle { font-size: 6.8pt; font-weight: 600; letter-spacing: -0.01em; line-height: 1.15; }
.pnote { font-family: "IBM Plex Mono", monospace; font-size: 5.2pt; color: var(--muted);
         line-height: 1.25; }

.tb { width: 64mm; flex: none; padding-left: 7mm;
      display: flex; flex-direction: column; }
/* The tracking that suited SHEET NN / 08 does not suit a forty-odd character
   URL in a 57mm column. Untracked at 6pt the longest slug clears the trim
   margin by 14mm, and overflow-wrap means a longer one ever arriving wraps
   rather than running into the edge. */
.tb .sno { font-family: "IBM Plex Mono", monospace; font-size: 6pt; letter-spacing: 0;
           color: var(--muted); overflow-wrap: anywhere; }
.tb .g { margin: 5mm 0 4mm; }
.tb h2 { font-size: 16.5pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.12; }
.tb .yr { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; color: var(--muted); margin-top: 2mm; }
.tb .bl { font-family: "IBM Plex Mono", monospace; font-size: 6.6pt; letter-spacing: 0.14em;
          text-transform: uppercase; margin-top: 3.4mm; }
/* Reserved whether or not there is an award, the way the index cards reserve
   the line: a drafted sheet keeps its empty fields, and that is what makes
   eight of them read as one set. */
.tb .award { font-family: "IBM Plex Mono", monospace; font-size: 6.6pt; letter-spacing: 0.12em;
             text-transform: uppercase; color: var(--accent); margin-top: 2.4mm; min-height: 3mm; }
.tb .tagline { font-family: "Spectral", Georgia, serif; font-size: 10pt; line-height: 1.5; margin-top: 4mm; }
.tb .body { font-family: "Spectral", Georgia, serif; font-size: 8.2pt; line-height: 1.6;
            color: var(--soft); margin-top: 3mm; }
.tb .meta { margin-top: auto; padding-top: 7mm; }
.tb .meta dt { font-family: "IBM Plex Mono", monospace; font-size: 6pt; letter-spacing: 0.16em;
               text-transform: uppercase; color: var(--muted); margin: 2.2mm 0 0.7mm; }
.tb .meta dd { font-family: "IBM Plex Mono", monospace; font-size: 6.8pt; line-height: 1.4; }

/* the verso: the writing in a single measured column on the left, the plates
   in a grid on the right. The text column is a fixed third, so all eight
   spreads open the same way and the eye always knows where the reading is. */
.verso .run { display: flex; justify-content: space-between; font-family: "IBM Plex Mono", monospace;
              font-size: 7pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
              border-bottom: 0.5pt solid var(--line); padding-bottom: 2.4mm; }
/* The runner is set in tracked capitals and an address is neither: a path can
   be case sensitive, so the link opts out of both and reads as what it is. */
.verso .run .rl { text-transform: none; letter-spacing: 0; }
.vbody { display: flex; gap: 11mm; flex: 1; min-height: 0; margin-top: 6mm; }
.vtext { width: 85mm; flex: none; display: flex; flex-direction: column; }
.ws + .ws { margin-top: 5mm; }
.verso h4 { font-family: "IBM Plex Mono", monospace; font-size: 6.8pt; letter-spacing: 0.14em;
            text-transform: uppercase; margin: 0 0 2mm; }
.vtext p { font-family: "Spectral", Georgia, serif; font-size: 7.9pt; line-height: 1.52;
           color: var(--soft); }
/* Rows sized to their plates, then pushed to the head and the foot of the
   column. Equal rows left every plate hanging from the top of its own band and
   pooled the slack under the last one, so the art stopped short of the page
   while the writing beside it ran the full height. */
.vart { flex: 1; min-width: 0; display: grid; grid-auto-rows: min-content;
        align-content: space-between; column-gap: 11mm; row-gap: 11mm; }
.vfig { display: flex; flex-direction: column; justify-content: flex-start; min-width: 0; }
.vfig .ct { font-family: "Spectral", Georgia, serif; font-size: 6.8pt; line-height: 1.35;
            color: var(--soft); margin: 1.8mm 0 0; display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden; }
.vfig .fl { font-family: "IBM Plex Mono", monospace; font-size: 5.8pt; letter-spacing: 0.14em;
            color: var(--muted); margin-top: 1.8mm; }
.vfig .fl + .ct { margin-top: 0.8mm; }
/* The art-directed verso, drawn against the page's own invisible edges: the
   band opens the art column at its head, the row closes it at its foot, and
   the aside closes the text column the same way. Every bottom figure hangs
   its caption in the same fixed zone below one shared plate line, so three
   plates with three different captions still end on one edge; the plate is
   the drawing and the drawings align, captions are annotation and annotations
   hang. */
/* the composed strip: a row of images at one shared height, each named
   beneath in the runner's voice; the legend chips sit on the caption line. */
.srow { display: flex; }
.scol .sl { font-family: "IBM Plex Mono", monospace; font-size: 5.8pt; letter-spacing: 0.14em;
            text-transform: uppercase; color: var(--muted); text-align: center; margin-top: 1.6mm; }
.lg { display: inline-block; width: 4mm; height: 1.1mm; margin: 0 1.2mm 0.4mm 0;
      vertical-align: middle; border-radius: 0.55mm; }
.lgap { display: inline-block; width: 2.5mm; }
.vplan { flex: 1; min-width: 0; display: flex; flex-direction: column;
         justify-content: space-between; gap: 11mm; }
.vrow { display: flex; gap: 11mm; justify-content: space-between; }
/* a column of the columns layout: its stack spreads head to foot */
.vcol { flex: none; display: flex; flex-direction: column; justify-content: space-between; gap: 11mm; }
.vaside { margin-top: auto; padding-top: 3.5mm; }
/* the foot: one plate across the page, under both columns, on the same
   gutter the art column keeps between its own plates. */
.vfoot { flex: none; margin-top: 11mm; }
.vfig.vbot .ct { height: 6.6mm; }

/* closing */
.closing { justify-content: space-between; }
.closing h2 { font-size: 26pt; font-weight: 400; letter-spacing: -0.02em; margin-top: 6mm; }
.closing .lede { font-family: "Spectral", Georgia, serif; font-size: 12pt; line-height: 1.6;
                 color: var(--soft); margin-top: 7mm; max-width: 140mm; }
.closing .strip { margin-bottom: 8mm; }
/* the other ten, in two columns of the index's row, a size down */
.closing .rest { list-style: none; margin-top: 11mm; display: grid; grid-template-columns: 1fr 1fr;
                 column-gap: 14mm; row-gap: 0; }
.closing .rest li { display: grid; grid-template-columns: 7mm 1fr 13mm; grid-template-rows: auto auto;
                    column-gap: 3.5mm; align-items: baseline; padding: 3.2mm 0; }
.closing .rest li > span:first-child { grid-row: 1 / span 2; align-self: start; }
.closing .rest .t { font-size: 10pt; font-weight: 600; letter-spacing: -0.01em; grid-column: 2; grid-row: 1; }
.closing .rest .tag { font-family: "Spectral", Georgia, serif; font-size: 8pt; color: var(--muted);
                      grid-column: 2 / span 2; grid-row: 2; margin-top: 0.6mm; }
.closing .rest .y { font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: var(--muted);
                    text-align: right; grid-column: 3; grid-row: 1; }

/* back: the mark where the name was, the addresses on one line, the foot on
   the cover's foot line. */
.back .mark { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -54%);
              width: 190mm; display: flex; flex-direction: column; align-items: center; }
.back .mark svg { width: 38mm; height: auto; display: block; }
.back .contacts { margin-top: 13mm; font-family: "IBM Plex Mono", monospace; font-size: 7.5pt;
                  letter-spacing: 0.08em; color: var(--soft); white-space: nowrap; }
.back .contacts .sep { color: var(--faint); margin: 0 3.2mm; }
.back .cover-foot { position: relative; margin-top: auto; }

</style></head>
<body>${cover}${index}${spreads.join('')}${closing}${back}</body></html>`

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

writeFileSync(STAMP, `${hashOf()}\n`)

const pages = pageCount(PDF)
const mbOf = (n) => (n / 1024 / 1024).toFixed(1) + 'MB'
console.log(
  `portfolio.pdf: ${chosen.length} projects, ${pages} pages, ${mbOf(statSync(PDF).size)} ` +
    `(${cache.size} images, ${mbOf(imageBytes)} before embedding)`,
)
if (pages !== chosen.length * 2 + 4) {
  console.log(
    `  note: expected ${chosen.length * 2 + 4} pages (cover, index, a spread per project, closing, back).\n` +
      '        A different count means something overflowed its page.',
  )
}
