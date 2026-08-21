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

/* The verso's frame: the runner and the gap under it, and the gutter between
 * cells, used both across and down so the field reads as one grid. */
const VERSO_HEAD = 14
const VERSO_GAP = 8

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

// A project's cover is a video on three of them; the poster is the still.
const posterFor = (p) =>
  p.cover.endsWith('.webm') ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover

// Every video and loop ships a poster beside it, named the same way.
const stillOf = (m) => (m.type === 'image' ? m.src : m.src.replace(/\.[a-z0-9]+$/i, '-poster.webp'))

/* The candidate figures, in the order the sections tell the story, demos
 * included: their captions already say what they are and the DEMO tag on the
 * label says how to see them move. The cover's own image is kept out, the way
 * the card's gallery keeps it out: it is the plate you are already looking at. */
async function figPool(p) {
  const cover = posterFor(p)
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
const CHAR_MM = 1.66
const SAFETY = 1.07
const HEAD_MM = 4.6
const CAP_MM = 8.2

function sectionTextMm(section, widthMm) {
  const chars = section.body.join(' ').length
  const lines = chars / (widthMm / CHAR_MM) + section.body.length * 0.9
  return HEAD_MM + Math.ceil(lines) * LINE_MM * SAFETY
}

/*
 * One figure for the sheet, under the cover plate: the single unused image
 * that fills the space best, drawn at its own aspect. Two options per image,
 * caption below or caption in the leftover to the right, and the larger
 * printed area wins. Nothing under MIN_LONG_EDGE prints at all: a sheet with
 * a big cover plate and white space beats one with a thumbnail strip.
 */
function pickSheetFig(pool, used, availH) {
  if (availH < 46) return null
  let best = null
  for (const f of pool) {
    if (used.has(f.src)) continue
    const options = []
    const hBelow = Math.min(availH - 12, PLATE_W / f.a)
    if (hBelow * Math.max(1, f.a) >= MIN_LONG_EDGE) {
      options.push({ h: hBelow, beside: false })
    }
    const hBeside = Math.min(availH, PLATE_W / f.a)
    if (hBeside * f.a <= PLATE_W - 46 && hBeside * Math.max(1, f.a) >= MIN_LONG_EDGE) {
      options.push({ h: hBeside, beside: true })
    }
    for (const o of options) {
      const area = o.h * o.h * f.a
      if (!best || area > best.area) best = { fig: f, h: o.h, w: o.h * f.a, beside: o.beside, area }
    }
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
const VERSO_COLS = [2, 3]
const MAX_CELL_PLATE = 72
/* How much a plate gives back per round when the page asks it to, and the
 * floor it is dropped at rather than shrunk past.
 *
 * A cell plate is drawn at the full width of its column, so it is only ever
 * this small when it is tall and narrow. It sits directly under the paragraph
 * that explains it, which is why the floor is lower than the sheet's: it is
 * read WITH the words rather than instead of them. Below it the picture stops
 * being worth the room and the cell prints as writing. */
const PLATE_STEP = 6
const GOOD_CELL_PLATE = 42

/*
 * How tall a cell stands: its writing, and its plate with the caption under
 * it. The 3mm is the air below every cell whether or not it carries one.
 */
const cellTall = (c) => c.text + (c.plate ? c.h + CAP_MM + 3 : 3)

/*
 * Which cells go in which column, decided here rather than by the browser.
 *
 * CSS column balancing cannot help: a cell must not split, or its plate ends
 * up in a different column from the paragraph it belongs to, and a column of
 * unsplittable blocks balances by moving whole sections, which left the middle
 * column ending half a page short of the other two.
 *
 * The sections have to stay in reading order, so the only freedom is where the
 * two breaks fall. With at most seven of them every pair of break points can
 * simply be tried, and the one whose tallest column is shortest wins. That is
 * the flattest bottom edge the reading order allows.
 */
function balance(cells, cols) {
  const n = cells.length
  let best = null
  /* Every ordered cut into `cols` contiguous groups. Two columns have one
   * break to place and three have two, which is few enough to simply try. */
  const cuts = []
  if (cols === 2) {
    for (let a = 0; a <= n; a++) cuts.push([cells.slice(0, a), cells.slice(a)])
  } else {
    for (let a = 0; a <= n; a++) {
      for (let b = a; b <= n; b++) cuts.push([cells.slice(0, a), cells.slice(a, b), cells.slice(b)])
    }
  }
  for (const cut of cuts) {
    const worst = Math.max(...cut.map((g) => g.reduce((t, c) => t + cellTall(c), 0)))
    if (!best || worst < best.worst) best = { cut, worst }
  }
  return best
}

/*
 * The verso's field: three columns of section cells, and the page decides how
 * big the plates are.
 *
 * The first attempt at this budgeted the plates against the total column
 * length, three columns' worth, and then partitioned. That is the wrong order
 * and it clipped: the sections cannot be reordered, so an ordered cut of four
 * tall cells into three columns has no even split available, and a total that
 * fits in aggregate still overflows one column.
 *
 * So the partition is the authority. Every section starts with its plate at
 * full size, the columns are balanced, and while the tallest column is over
 * the page the biggest plate on the page gives back six millimetres and the
 * columns are balanced again. A plate that shrinks past the point of being
 * worth printing is dropped instead, and the run reports it. What settles is
 * the largest set of plates this page can actually hold, rather than a guess
 * that has to be trimmed later.
 */
function versoAt(p, plates, cols) {
  const cellW = (PAGE_W - VERSO_GAP * (cols - 1)) / cols
  const colH = PAGE_H - VERSO_HEAD

  const cells = p.sections.map((sec, si) => {
    const plate = plates[si]
    return {
      sec,
      plate,
      dropped: null,
      text: sectionTextMm(sec, cellW),
      h: plate ? Math.min(MAX_CELL_PLATE, cellW / plate.a) : 0,
    }
  })

  /*
   * Who pays, and how. The plate that pays is always one in the column that
   * is actually over, because shrinking a plate in a short column buys the
   * page nothing. It gives back a step at a time down to GOOD_CELL_PLATE and
   * is then dropped rather than shrunk further: three plates worth looking at
   * beats six the reader has to squint at, which is the whole reason the old
   * thumbnail strip went.
   */
  let best = balance(cells, cols)
  // Bounded by construction: every round either shrinks a plate by a fixed
  // step or removes one, so it cannot run longer than the plates allow.
  let guard = cells.length * Math.ceil(MAX_CELL_PLATE / PLATE_STEP) + 4
  while (best.worst > colH && guard-- > 0) {
    const over =
      best.cut.find((g) => g.reduce((t, c) => t + cellTall(c), 0) === best.worst) ?? []
    let victim = null
    for (const group of [over, cells]) {
      for (const c of group) if (c.plate && (!victim || c.h > victim.h)) victim = c
      if (victim) break
    }
    if (!victim) break
    if (victim.h - PLATE_STEP >= GOOD_CELL_PLATE) {
      victim.h -= PLATE_STEP
    } else {
      victim.dropped = victim.plate
      victim.plate = null
      victim.h = 0
    }
    best = balance(cells, cols)
  }

  for (const c of cells) if (c.plate) c.w = c.h * c.plate.a
  const area = cells.reduce((t, c) => t + (c.plate ? c.w * c.h : 0), 0)
  return { cols, cellW, cells, columns: best.cut, over: best.worst - colH, area }
}

/*
 * Two columns or three, chosen by what actually gets printed.
 *
 * The measure is total plate area, because that is the thing being traded: a
 * wider column carries a bigger picture but fewer of them, a narrower one the
 * reverse, and which wins depends entirely on how much this project wrote and
 * what shape its images are. Guessing it from the section count was wrong
 * often enough to be worth simply laying out both and comparing.
 *
 * A layout that does not fit never wins, however handsome, and if neither
 * fits the closest one is drawn and the run says so.
 */
function versoLayout(p, plates) {
  const tries = VERSO_COLS.map((n) => versoAt(p, plates, n))
  const fits = tries.filter((t) => t.over <= 0)
  if (!fits.length) {
    const best = tries.reduce((a, b) => (a.over <= b.over ? a : b))
    console.log(
      `  note: ${p.slug} overruns its verso by ${Math.round(best.over)}mm at every column count.
` +
        '        Its writing alone does not fit the page; look at it.',
    )
    return best
  }
  return fits.reduce((a, b) => (b.area > a.area ? b : a))
}

/*
 * The whole spread, decided before any HTML exists. The sheet takes the cover
 * at its own aspect and at most one large figure; the verso tries a full
 * width band first, falls back to a figure column beside two wider text
 * columns, and a write-up too long for either simply keeps the whole page,
 * with a note so the run says which project is text bound.
 */
async function layout(p) {
  const pool = await figPool(p)
  const used = new Set()

  /* The verso is decided first, because its plates are bound to the sections
   * that argue for them and the sheet's is not bound to anything. Claiming in
   * the other order let the sheet take an image out from under the paragraph
   * that was about it. Whatever the verso could not fit is released, so the
   * sheet can still use a picture the writing had no room for. */
  const plates = await sectionPlates(p, used)
  const verso = versoLayout(p, plates)
  for (const c of verso.cells) if (c.dropped) used.delete(c.dropped.src)

  const coverA = await aspectOf(posterFor(p))
  /* A pipeline strip is the sheet's second element when the project carries
   * one, and it takes its room before the cover rather than after: the cover
   * is the thing that can afford to be smaller. The strip is then drawn at the
   * cover's own width, so the two read as one block instead of one overhanging
   * the other. */
  const strip = p.pipeline ? DIAGRAM_H + 7 : 0
  const coverH = Math.min(PAGE_H - strip, PLATE_W / coverA)
  const coverW = Math.min(PLATE_W, coverH * coverA)
  const sheetFig = p.pipeline ? null : pickSheetFig(pool, used, PAGE_H - coverH - 7)

  return { pool, coverA, coverH, coverW, sheetFig, ...verso }
}

// ── pages ─────────────────────────────────────────────────────────────────
const site = (contact.site ?? 'https://charlesabichahine.com').replace(/^https?:\/\//, '')
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
const FIELD = [
  [26, 26], [95, 16], [172, 22], [238, 32], [56, 50],
  [14, 82], [252, 62], [214, 44], [32, 118], [134, 20],
  [256, 96], [230, 124], [56, 136], [10, 52], [108, 136],
  [202, 138], [248, 16], [158, 130],
]

const cover = `
<section class="page cover">
  <p class="eyebrow" style="position:absolute;left:12mm;top:12mm">Selected work · ${span}</p>
  ${grouped
    .map((p, i) => {
      const [x, y] = FIELD[i % FIELD.length]
      const on = inBook(p)
      return `<span class="fmark${on ? ' on' : ''}" style="left:${x + 12}mm;top:${y + 12}mm;--b:${beltFor(p).color}">${glyph(p.slug, 10.5)}</span>`
    })
    .join('')}
  <div class="name">
    <h1>Charles Abi Chahine<span class="dot">.</span></h1>
    <p class="role">${esc(role)}</p>
    <p class="lede">${esc(summary)}</p>
  </div>
  <div class="belts">
    ${BELTS.map(
      (b) => `<div class="belt" style="--b:${b.color}">
      <span class="bl">${esc(b.label)}</span>
      <span class="bc">${pad(b.items.length)}</span>
    </div>`,
    ).join('')}
  </div>
  <div class="cover-foot"><p>${esc(site)}</p><p>${Word(chosen.length)} of ${word(projects.length)} projects</p></div>
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

// A plate with its annotation: the image plain, the caption under a hairline.
async function figure(f, n, wMm, hMm, capW = null) {
  const label = `FIG ${pad(n)}${f.m.type !== 'image' ? ' · DEMO' : ''}`
  return `<figure style="width:${mm(capW === null ? wMm : wMm + 5 + capW)}">
    <div class="fx${capW === null ? '' : ' fx-beside'}">
      <img src="${await img(f.src, Math.min(2000, Math.round(wMm * 8)))}" alt="" style="width:${mm(wMm)};height:${mm(hMm)}">
      <div class="cap" style="${capW === null ? `width:${mm(wMm)}` : `width:${mm(capW)}`}">
        <p class="fl">${label}</p>
        <p class="ct">${esc(f.m.caption ?? '')}</p>
      </div>
    </div>
  </figure>`
}

async function sheet(p, i, lay) {
  const b = beltFor(p)
  const coverW = lay.coverW
  let fig = ''
  if (p.pipeline) {
    fig = `<div class="rband">${pipelineHtml(p, coverW)}</div>`
  } else if (lay.sheetFig) {
    const f = lay.sheetFig
    fig = `<div class="rband">${await figure(f.fig, 1, f.w, f.h, f.beside ? PLATE_W - f.w - 5 : null)}</div>`
  }
  return `
<section class="page sheet">
  <div class="plates">
    <figure class="cov"><img src="${await img(posterFor(p), Math.min(2000, Math.round(coverW * 8)))}" alt="" style="width:${mm(coverW)};height:${mm(lay.coverH)}"></figure>
    ${fig}
  </div>
  <div class="tb">
    <p class="sno">SHEET ${pad(i + 1)} / ${pad(chosen.length)}</p>
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
    </dl>
  </div>
</section>`
}

/*
 * The verso: one cell per section, and the section is the unit.
 *
 * The write-up used to print as a single block of columns with every plate
 * swept into a band at the foot, so a paragraph and the picture it was about
 * ended up on opposite halves of the page. The data never said that: a
 * section carries its own heading, its own words and its own media, and the
 * grid just draws what the record already groups.
 *
 * Plates hang from the bottom of their cell rather than following the text,
 * so along a row they share a baseline however long the paragraphs above them
 * run. That register is what stops a grid of unequal writing reading as a
 * ragged one.
 */
async function verso(p, i, lay) {
  const b = beltFor(p)
  const index = new Map(lay.cells.map((c, si) => [c, si]))
  const cols = []
  for (const group of lay.columns) {
    const cells = []
    for (const cell of group) {
      const si = index.get(cell)
    let plate = ''
    if (cell.plate) {
      plate = `<figure class="vfig">
        <img src="${await img(cell.plate.src, Math.min(2000, Math.round(cell.w * 8)))}" alt="" style="width:${mm(cell.w)};height:${mm(cell.h)}">
        <p class="ct">${cell.plate.m.type !== 'image' ? '<span class="fl">DEMO · </span>' : ''}${esc(cell.plate.m.caption ?? '')}</p>
      </figure>`
    }
      cells.push(`<div class="vcell">
      <h4 style="color:${b.color}">${pad(si + 1)} · ${esc(cell.sec.heading)}</h4>
      ${cell.sec.body.map((t) => `<p>${esc(t)}</p>`).join('')}
      ${plate}
    </div>`)
    }
    cols.push(`<div class="vcol">${cells.join('')}</div>`)
  }
  return `
<section class="page verso">
  <div class="run"><span>${pad(i + 1)} / ${pad(chosen.length)} · ${esc(p.title)}</span><span style="color:${b.color}">${esc(b.label)}</span></div>
  <div class="vgrid">${cols.join('')}</div>
</section>`
}

const closing = `
<section class="page closing">
  <div>
    <p class="eyebrow">The rest of it</p>
    <h2>${Word(projects.length)} projects, ${word(BELTS.length)} belts<span class="dot">.</span></h2>
    <p class="lede">This portfolio is a selection of ${word(chosen.length)}. Every project, with its full gallery, demos, and write-up, is on the site.</p>
  </div>
  <div>
    ${strip(() => true, 6)}
    <div class="cover-foot"><p>${esc(site)}/work</p><p>${esc(contact.email)}</p></div>
  </div>
</section>`

const spreads = []
for (const [i, p] of chosen.entries()) {
  const lay = await layout(p)
  spreads.push(await sheet(p, i, lay))
  spreads.push(await verso(p, i, lay))
  /* What the run prints is what a look at the page would tell you: how many
   * of the sections got their plate, how big those plates are, and which ones
   * were too crowded to carry one. A silent drop is the failure mode here. */
  const drawn = lay.cells.filter((c) => c.plate)
  const dropped = lay.cells.filter((c) => c.dropped).length
  const edges = drawn.map((c) => Math.round(Math.max(c.w, c.h)))
  console.log(
    `  ${p.slug}: cover ${Math.round(lay.coverW)}x${Math.round(lay.coverH)}` +
      (p.pipeline ? ` + pipeline (${p.pipeline.halves.reduce((a, h) => a + h.stages.length, 0)} stages)` : '') +
      (lay.sheetFig ? `, sheet fig ${Math.round(lay.sheetFig.w)}x${Math.round(lay.sheetFig.h)}` : '') +
      `, verso ${lay.cols} cols of ${lay.cells.length} sections` +
      `, ${drawn.length} plated` +
      (edges.length ? ` (${edges.join('/')}mm)` : '') +
      (dropped ? `, ${dropped} too crowded to plate` : ''),
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
        --line: #e0e3e7;
        --color-accent: #c9261b; --color-blue: #1a5fd0;
        --color-green: #1a7f37; --color-amber: #a2571a; }
body { font-family: "Space Grotesk", sans-serif; color: var(--ink); background: #fff; }
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

/* a plate's annotation: FIG number and caption under a hairline */
figure { margin: 0; }
.fx-beside { display: flex; gap: 5mm; align-items: flex-end; }
.cap { margin-top: 2.6mm; }
.fx-beside .cap { margin-top: 0; }
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
.cover .fmark { position: absolute; color: var(--line); }
.cover .fmark.on { color: var(--b); }
.cover .name { position: absolute; left: 50%; top: 76mm; transform: translate(-50%, -50%);
               width: 165mm; text-align: center; }
.cover h1 { font-size: 37pt; font-weight: 400; letter-spacing: -0.024em; line-height: 1.03; }
.cover .role { font-family: "IBM Plex Mono", monospace; font-size: 9pt; color: var(--soft);
               letter-spacing: 0.08em; margin-top: 4.5mm; text-transform: lowercase; }
.cover .lede { font-family: "Spectral", Georgia, serif; font-size: 12pt; line-height: 1.6;
               color: var(--soft); margin-top: 5.5mm; }
.cover .belts { margin-top: auto; display: grid; grid-template-columns: repeat(4, 1fr);
                gap: 8mm; margin-bottom: 6mm; }
.cover .belt { border-top: 0.75pt solid var(--b); padding-top: 2.4mm; display: flex;
               align-items: baseline; }
.cover .belt .bl { font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: 0.14em;
                   text-transform: uppercase; color: var(--b); }
.cover .belt .bc { font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: var(--muted);
                   margin-left: auto; }

/* index page */
.sidx .strip { margin-top: 9mm; }
.sidx ol { list-style: none; margin-top: 10mm; }
.sidx li { display: grid; grid-template-columns: 9mm 7mm 88mm 1fr 16mm; align-items: center;
           gap: 4mm; padding: 4.2mm 0; }
.sidx li .no { font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: var(--accent); }
.sidx li .t { font-size: 11pt; font-weight: 600; letter-spacing: -0.01em; }
.sidx li .tag { font-family: "Spectral", Georgia, serif; font-size: 8.5pt; color: var(--muted); }
.sidx li .y { font-family: "IBM Plex Mono", monospace; font-size: 7pt; color: var(--muted); text-align: right; }
.sidx .foot { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; color: var(--muted);
              letter-spacing: 0.08em; margin-top: auto; }

/* the sheet */
.sheet { flex-direction: row; }
.sheet .plates { flex: 1; display: flex; flex-direction: column; padding-right: 8mm; min-width: 0; }
.sheet .rband { margin-top: 7mm; }
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
.tb .sno { font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: 0.14em; color: var(--muted); }
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

/* the verso: a field of section cells, each holding its own writing and its
   own plate. The plate is pushed to the foot of its cell with margin-top auto,
   which is what puts every plate in a row on one baseline. */
.verso .run { display: flex; justify-content: space-between; font-family: "IBM Plex Mono", monospace;
              font-size: 7pt; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
              border-bottom: 0.5pt solid var(--line); padding-bottom: 2.4mm; }
.vgrid { display: flex; gap: 8mm; flex: 1; min-height: 0; overflow: hidden; margin-top: 6mm; }
.vcol { flex: 1; min-width: 0; }
.vcell { margin-bottom: 7mm; }
.verso h4 { font-family: "IBM Plex Mono", monospace; font-size: 6.8pt; letter-spacing: 0.14em;
            text-transform: uppercase; margin: 0 0 2mm; }
.vcell p { font-family: "Spectral", Georgia, serif; font-size: 7.9pt; line-height: 1.52;
           color: var(--soft); margin-bottom: 2.2mm; }
.vfig { margin: 3mm 0 0; }
.vfig .ct { font-family: "Spectral", Georgia, serif; font-size: 6.8pt; line-height: 1.35;
            color: var(--soft); margin: 1.8mm 0 0; display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden; }
.vfig .fl { font-family: "IBM Plex Mono", monospace; font-size: 5.8pt; letter-spacing: 0.14em;
            color: var(--muted); }

/* closing */
.closing { justify-content: space-between; }
.closing h2 { font-size: 26pt; font-weight: 400; letter-spacing: -0.02em; margin-top: 6mm; }
.closing .lede { font-family: "Spectral", Georgia, serif; font-size: 12pt; line-height: 1.6;
                 color: var(--soft); margin-top: 7mm; max-width: 140mm; }
.closing .strip { margin-bottom: 8mm; }
</style></head>
<body>${cover}${index}${spreads.join('')}${closing}</body></html>`

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
if (pages !== chosen.length * 2 + 3) {
  console.log(
    `  note: expected ${chosen.length * 2 + 3} pages (cover, index, a spread per project, closing).\n` +
      '        A different count means something overflowed its page.',
  )
}
