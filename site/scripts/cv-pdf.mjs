/*
 * Generates public/cv.pdf from src/data/cv.js — the same data the /cv page
 * renders, so the download can never drift from the site again. The PDF it
 * replaced was a hand-made file that had gone stale and carried a phone number
 * the web CV deliberately omits; nothing here is typed by hand.
 *
 * Layout mirrors the site: Space Grotesk headings, Spectral prose, IBM Plex Mono
 * metadata labels, hairline rules, one red accent. Rendered through headless
 * Chrome so the print layout is real CSS rather than a drawing API.
 *
 * The three faces are inlined as data URIs rather than linked. Chrome will not
 * load a file:// font into a file:// document — it is a cross-origin fetch and
 * every file:// origin is opaque — so a linked @font-face would silently fall
 * back and the PDF would ship in Times. Inlining also makes the render
 * self-contained: whoever opens the download sees the same typefaces, whether or
 * not they have any of them installed.
 *
 * Run `npm run cv` after editing src/data/cv.js, and commit the result.
 *
 * Rendering is deliberately NOT part of `npm run build`: it needs a local
 * Chrome, and the deploy runs on ubuntu-latest where that would fail the build.
 * The generated PDF is committed instead, so the site always ships one.
 *
 * What the build DOES run is `--check`, which compares timestamps and fails if
 * cv.js has been edited without regenerating the PDF. Forgetting is the whole
 * risk of a committed artefact, so the build refuses rather than shipping a
 * download that disagrees with the page.
 */
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const CV_DATA = resolve(here, '../src/data/cv.js')
const PDF = resolve(here, '../public/cv.pdf')

const data = await import(pathToFileURL(CV_DATA).href)
const { contact, role, summary, education, experience, skills, languages, awards, splitDates } =
  data

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].find((p) => existsSync(p))

/*
 * The staleness guard compares a hash of cv.js against the hash recorded when
 * the PDF was last generated.
 *
 * It used to compare file mtimes, which broke every deploy: git does not
 * preserve modification times, so on a fresh CI checkout every file carries the
 * checkout timestamp in arbitrary order and "cv.js is newer than cv.pdf" is a
 * coin flip. A hash is the same on every machine.
 *
 * Line endings are normalised before hashing. Git checks this repo out with
 * CRLF on Windows and LF on the Linux runner, so hashing the raw bytes would
 * fail on CI for exactly the same reason mtimes did.
 */
const STAMP = resolve(here, 'cv.hash')
const hashOf = (file) =>
  createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex')

// A PDF records one /Type /Page per page. The negative lookahead keeps it from
// also matching /Type /Pages, the node that lists them.
const pageCount = (file) =>
  (readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length

const checkOnly = process.argv.includes('--check')

if (checkOnly) {
  if (!existsSync(PDF)) throw new Error('cv-pdf: public/cv.pdf is missing, run `npm run cv`')
  const current = hashOf(CV_DATA)
  const recorded = existsSync(STAMP) ? readFileSync(STAMP, 'utf8').trim() : null
  if (recorded !== current) {
    throw new Error(
      'cv-pdf: src/data/cv.js has changed since public/cv.pdf was generated.\n' +
        '        The page and the download would ship out of sync. Run `npm run cv` and commit both.',
    )
  }
  /*
   * The CV must be one A4 page, and the build is where that is enforced rather
   * than the generator: generating is a dev loop where you want to look at the
   * overflow, shipping is not.
   *
   * At the time of writing there are 4mm of headroom, which is one line.
   *
   * Skills and awards used to run side by side in a flex band, which made the
   * failure cliff-edged: a flex container cannot be split across a page break,
   * so one line too many threw the whole 55mm band onto page two and left a hole
   * on page one. Stacking them full width removed that, and cost 2mm rather than
   * the 30mm it looked like it would, because at half width every skills row
   * wrapped to two lines and full width none of them do. The wrapping penalty
   * had been paying for the columns.
   */
  const pages = pageCount(PDF)
  if (pages > 1) {
    throw new Error(
      `cv-pdf: public/cv.pdf is ${pages} pages and the CV must be one.\n` +
        '        Run `npm run cv` to see how far over it is, trim src/data/cv.js, and commit both.',
    )
  }
  console.log('cv.pdf: up to date with cv.js, 1 page')
  process.exit(0)
}

if (!CHROME) throw new Error('cv-pdf: no Chrome or Edge found to render the PDF')

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// linkedin.com/in/x — the bare handle reads better in print than a full URL
const short = (url) => url.replace(/^https?:\/\/(www\.)?/, '')

/*
 * '2025–2026' set as '2025' over '2026', so the gutter only has to fit one year.
 * The dash between them becomes a short accent rule, which reads as a range
 * without spending width, and is the one mark of colour down the left margin.
 * The inner column shrinks to the width of the digits, which keeps the years
 * flush left with the rest of the page while the rule centres under them.
 */
const stack = (dates) => {
  const [from, to, ongoing] = splitDates(dates)
  if (!to && !ongoing) return esc(from)
  const rule = `<span class="tick${to ? '' : ' open'}"></span>`
  return `<span class="range">${esc(from)}${rule}${to ? esc(to) : ''}</span>`
}

/*
 * Chrome's print-to-PDF cannot embed a variable font. Not a range problem and
 * not a data-URI problem — the same file declared at a single weight, and the
 * same file linked rather than inlined, both produce a PDF with no font
 * embedded at all, while a static face inlined the identical way embeds fine.
 * Verified by printing the same page three ways and reading /BaseFont out of
 * each result.
 *
 * The failure is silent, which is what makes it worth this note: the render
 * succeeds, the layout is right, and the text is simply set in whatever the
 * viewer happens to substitute. A recruiter opening the download would have
 * seen the CV in Times.
 *
 * So the sans is read from scripts/fonts as three static instances — the only
 * weights this layout uses — while the site keeps the one variable file, which
 * covers 300 to 700 in a quarter of the bytes. The serif and the mono are
 * static already and are read from public/fonts, shared with the site.
 */
const fontFace = (dir, family, file, weight = 400) =>
  `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight};
     src: url(data:font/woff2;base64,${readFileSync(resolve(here, dir, file)).toString('base64')}) format("woff2"); }`

const webFont = (family, file, weight) => fontFace('../public/fonts', family, file, weight)
const pdfFont = (family, file, weight) => fontFace('./fonts', family, file, weight)

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Charles Abi Chahine, CV</title>
<style>
  ${pdfFont('Space Grotesk', 'space-grotesk-400.woff2', 400)}
  ${pdfFont('Space Grotesk', 'space-grotesk-600.woff2', 600)}
  ${pdfFont('Space Grotesk', 'space-grotesk-700.woff2', 700)}
  ${webFont('Spectral', 'spectral-400.woff2', 400)}
  ${webFont('IBM Plex Mono', 'ibm-plex-mono-400.woff2', 400)}
  @page { size: A4; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  /* The ground stays white here even though the site's paper is a tinted grey:
     a CV is printed as often as it is read on screen, and a full-bleed tint is
     both wrong on paper and expensive in toner. The ink ramp is the site's. */
  body { margin: 0; font-family: "Space Grotesk", sans-serif;
         color: #16181d; font-size: 9.1pt; line-height: 1.32; -webkit-print-color-adjust: exact; }
  /* Prose, matching the page: every full sentence is set in the serif and
     everything that is a name or a label is not. */
  .lede, .notes, ul, .grp p { font-family: "Spectral", Georgia, serif; }
  .mono { font-family: "IBM Plex Mono", monospace; font-size: 6.4pt;
          font-weight: 400; letter-spacing: 0.11em; text-transform: uppercase; }
  /* No bottom rule. Education draws its own a few points below, and the two
     together read as one doubled line. */
  header { display: flex; justify-content: space-between; align-items: flex-end;
           padding-bottom: 2pt; margin-bottom: 11pt; }
  h1 { font-size: 20pt; font-weight: 700; letter-spacing: -0.01em; margin: 0; line-height: 1; }
  h1 span { color: #d92b1f; }
  .role { color: #4e535c; margin-top: 4pt; }
  /* Not uppercased like the other mono labels: an address a recruiter copies
     out should read exactly as it is typed. */
  .contact { text-align: right; color: #4e535c; line-height: 1.75; text-transform: none;
             letter-spacing: 0.06em; }
  /* One column, matching the page. The sidebar it replaced forced the skills
     list into clipped fragments and starved the bullets of width. */
  .lede { color: #4e535c; margin: 5pt 0 0; max-width: 96mm; }
  /* Bigger than the other mono labels and darker, matching the page: these are
     the only words a reader scans to navigate the document. */
  /*
   * The section rule runs the full width as a hairline, with an accent segment
   * over its first stretch that is exactly as long as the word beneath it. The
   * red is measuring the title, so it changes length section to section rather
   * than being a decoration of fixed size.
   *
   * That length cannot come from a gradient stop, which would have to be written
   * per section and would drift the moment a label was renamed. It comes from an
   * inline-block around the text, which is the width of the text by definition.
   * Its rule is pulled up by the heading's own padding to sit on the hairline.
   *
   * right: 0.1em trims the trailing letter-spacing, which is added after the
   * last character and would otherwise run the red past the final letter.
   */
  h2 { color: #4e535c; border-top: none; position: relative; padding-top: 4pt;
       margin: 0 0 4.5pt; font-size: 8pt; font-weight: 400; letter-spacing: 0.1em; }
  h2::before { content: ''; position: absolute; left: 0; right: 0; top: 0;
       height: 0.8px; background: #c9ccd1; }
  h2 span { position: relative; display: inline-block; }
  h2 span::before { content: ''; position: absolute; left: 0; right: 0.1em; top: -4pt;
       height: 0.8px; background: #d92b1f; }
  /* Sections may flow across the page break; only an individual entry is kept
     whole. Keeping whole sections together left half of page one empty. */
  section { margin-bottom: 8.5pt; }
  h2 { break-after: avoid; }
  .entry { display: flex; gap: 4mm; margin-bottom: 6.5pt; break-inside: avoid; }
  /*
   * The date gutter was 20mm plus a 6mm gap for strings measuring 14.4mm at
   * their widest, so 26mm of a 180mm page was being held for eight short
   * numbers. That width is worth more in the text column: every millimetre there
   * is a millimetre of sentence that does not wrap onto a second line carrying
   * two words, and an orphan line costs the same page height as a full one.
   *
   * Two changes got it to 8mm. The tracking came off, because 0.11em is right
   * for a word set in caps and on a run of digits is just padding. Then the
   * second year moved under the first, so the gutter has to fit "2025–" rather
   * than "2025–2026". Stacking is free here: every entry runs at least three
   * lines, so the second date sits inside height the row already had.
   */
  .when { flex: 0 0 8mm; color: #d92b1f; font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em; padding-top: 1pt; }
  .range { display: inline-flex; flex-direction: column; align-items: center; }
  .tick { width: 0.35mm; height: 1.8mm; background: #d92b1f; margin: 0.6mm 0; }
  /* Nothing closes an ongoing role, so the rule runs on past where the second
     year would have sat. That overrun is what reads as still running. */
  .tick.open { height: 3mm; }
  .what { flex: 1; min-width: 0; }
  /* The bottom margin used to come from the .where line under it; now that the
     place sits inline, the heading carries its own. */
  .what h3 { font-size: 9.6pt; font-weight: 600; margin: 0 0 3pt; }
  /* The place rides on the title line rather than taking one of its own, the
     same as the page. Eight entries, eight lines back. */
  .where { color: #767d88; margin-left: 3mm; }
  ul { margin: 0; padding-left: 3.4mm; color: #4e535c; }
  li { margin-bottom: 1.6pt; }
  .notes { color: #4e535c; margin: 0; }
  /* Skills and awards share the entry gutter so every row lines up on one axis. */
  /*
   * Awards: a fixed narrow gutter is right here, because every label is a year.
   * The colour is the muted grey the rest of the metadata uses, matching the
   * page. These were the accent red, which made them and the skills labels the
   * only red on the document apart from the name and the date rules, for no
   * reason anyone could read.
   */
  .grp { display: flex; gap: 6mm; margin-bottom: 2.2pt; break-inside: avoid; }
  .grp b { flex: 0 0 12mm; color: #d92b1f; font-weight: 400; }
  .grp p { margin: 0; flex: 1; color: #4e535c; }
  /*
   * Skills: one grid for the whole block rather than a flex row each. The label
   * column is max-content, so it sizes to the longest label and every row shares
   * that width. Per-row flex could not do this: each row would size its own
   * label and the values would start at a different x on every line, which is
   * why the labels were previously boxed into a fixed width and left to wrap.
   */
  .pairs { display: grid; grid-template-columns: max-content 1fr; column-gap: 6mm; row-gap: 2.2pt; }
  .pairs b { color: #d92b1f; font-weight: 400; white-space: nowrap; }
  .pairs p { margin: 0; color: #4e535c; font-family: "Space Grotesk", sans-serif; }
  /* The project names, matching the page: the only accent in the body, marking
     the work rather than the structure around it. On the page these are also
     links, which is why the colour is worth spending here. */
  .work { margin-top: 2.5pt; }
  .work b { font-weight: 600; }
</style></head><body>
<header>
  <div>
    <h1>Charles Abi Chahine<span>.</span></h1>
    <div class="role mono">${esc(role)}</div>
    <p class="lede">${esc(summary)}</p>
  </div>
  <div class="contact mono">
    <div>${esc(contact.email)}</div>
    <div>${esc(short(contact.linkedin))}</div>
    <div>${esc(short(contact.github))}</div>
  </div>
</header>

<section>
  <h2 class="mono"><span>Education</span></h2>
  ${education
    .map(
      (e) => `<div class="entry">
    <div class="when mono">${stack(e.dates)}</div>
    <div class="what">
      <h3>${esc(e.degree)}<span class="where mono">${esc(e.school)}</span></h3>
      <p class="notes">${esc(e.notes)}</p>
      ${e.work.length ? `<ul class="work">${e.work.map((w) => `<li><b>${esc(w.name)}</b>, ${esc(w.text.trim())}</li>`).join('')}</ul>` : ''}
    </div></div>`,
    )
    .join('')}
</section>

<section>
  <h2 class="mono"><span>Experience</span></h2>
  ${experience
    .map(
      (j) => `<div class="entry">
    <div class="when mono">${stack(j.dates)}</div>
    <div class="what">
      <h3>${esc(j.role)}, ${esc(j.firm)}<span class="where mono">${esc(j.where)}</span></h3>
      <ul>${j.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>
    </div></div>`,
    )
    .join('')}
</section>

<section>
  <h2 class="mono"><span>Skills</span></h2>
  <div class="pairs">
    ${[
      ...skills,
      { group: 'Languages', items: languages.map((l) => `${l.name} (${l.level.toLowerCase()})`) },
    ]
      .map((s) => `<b class="mono">${esc(s.group)}</b><p>${s.items.map(esc).join(' · ')}</p>`)
      .join('')}
  </div>
</section>

<section>
  <h2 class="mono"><span>Awards</span></h2>
  ${awards.map((a) => `<div class="grp"><b class="mono">${esc(a.year)}</b><p>${esc(a.text)}</p></div>`).join('')}
</section>
</body></html>`

const tmpHtml = resolve(tmpdir(), 'cac-cv.html')
const out = resolve(here, '../public/cv.pdf')
writeFileSync(tmpHtml, html, 'utf8')

// `--keep-html` leaves the intermediate behind and stops. Checking the print
// layout otherwise means opening a PDF viewer by hand; this way the exact same
// document can be loaded in a browser and inspected like any other page.
if (process.argv.includes('--keep-html')) {
  console.log(`cv-pdf: wrote ${tmpHtml} (not rendered)`)
  process.exit(0)
}

execFileSync(
  CHROME,
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    `--print-to-pdf=${out}`,
    pathToFileURL(tmpHtml).href,
  ],
  { stdio: 'ignore' },
)
unlinkSync(tmpHtml)
// Record what the PDF was built from, so the build can tell whether cv.js has
// moved on since. Commit this alongside the PDF.
writeFileSync(STAMP, `${hashOf(CV_DATA)}\n`)
console.log(`cv.pdf: generated from cv.js (${experience.length} roles, ${education.length} degrees)`)

/*
 * How far the CV is from fitting one A4 page.
 *
 * The page count alone answers "does it fit" but not "how much more has to go",
 * which is the question while you are actually cutting. So the document is laid
 * out a second time at the print measure and its flow height is read back.
 *
 * A4 is 297 by 210mm and the @page margin is 14 by 15mm, giving a content box of
 * 269 by 180mm. Forcing that width on screen reproduces the print line breaks;
 * the @page margins do not apply outside print, which is why the width is set
 * explicitly rather than inherited.
 *
 * The measurement runs through --dump-dom rather than a headless driver: the
 * document sets its own height into an attribute, and the dumped DOM carries it
 * back. That keeps this to the Chrome the script already needs instead of
 * putting a browser automation library into the site's dependencies.
 */
const PAGE_MM = 269
const PX_PER_MM = 96 / 25.4

const probe = resolve(tmpdir(), 'cac-cv-probe.html')
writeFileSync(
  probe,
  html.replace(
    '</body>',
    `<style>html,body{width:180mm;margin:0}</style>
<script>document.documentElement.setAttribute('data-fit',document.body.scrollHeight)</script></body>`,
  ),
  'utf8',
)

const dom = execFileSync(
  CHROME,
  ['--headless', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=4000', '--dump-dom', pathToFileURL(probe).href],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
)
unlinkSync(probe)

const pages = pageCount(out)
const px = Number(/data-fit="(\d+)"/.exec(dom)?.[1])

if (!Number.isFinite(px)) {
  console.log(`        ${pages} page(s). Could not measure flow height.`)
} else {
  const mm = px / PX_PER_MM
  const delta = mm - PAGE_MM
  // 9.1pt at line-height 1.32, in mm — roughly what one cut bullet buys back.
  const lineMm = (9.1 * 1.32 * 25.4) / 72
  const n = `${pages} page${pages === 1 ? '' : 's'}`
  console.log(
    delta > 0
      ? `        ${n}. ${mm.toFixed(0)}mm of content, ${PAGE_MM}mm fits: OVER BY ${delta.toFixed(0)}mm (~${Math.ceil(delta / lineMm)} lines).`
      : `        ${n}. ${mm.toFixed(0)}mm of content, ${PAGE_MM}mm fits: ${(-delta).toFixed(0)}mm to spare.`,
  )
}
