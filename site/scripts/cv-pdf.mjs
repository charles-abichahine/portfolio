/*
 * Generates public/cv.pdf from src/data/cv.js — the same data the /cv page
 * renders, so the download can never drift from the site again. The PDF it
 * replaced was a hand-made file that had gone stale and carried a phone number
 * the web CV deliberately omits; nothing here is typed by hand.
 *
 * Layout mirrors the site: Helvetica headings, monospace metadata labels,
 * hairline rules, one red accent. Rendered through headless Chrome so the print
 * layout is real CSS rather than a drawing API.
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
import { writeFileSync, unlinkSync, existsSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const CV_DATA = resolve(here, '../src/data/cv.js')
const PDF = resolve(here, '../public/cv.pdf')

const data = await import(pathToFileURL(CV_DATA).href)
const { contact, education, experience, skills, languages, certificates } = data

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].find((p) => existsSync(p))

// `--check` is the build's guard: it renders nothing, it only refuses to let a
// stale PDF ship. The build runs this on every machine; the render below only
// happens where a browser exists, which on CI it does not.
const checkOnly = process.argv.includes('--check')
const stale = existsSync(PDF) && statSync(CV_DATA).mtimeMs > statSync(PDF).mtimeMs

if (checkOnly) {
  if (!existsSync(PDF)) throw new Error('cv-pdf: public/cv.pdf is missing — run `npm run cv`')
  if (stale) {
    throw new Error(
      'cv-pdf: src/data/cv.js is newer than public/cv.pdf.\n' +
        '        The page and the download would ship out of sync — run `npm run cv` and commit the PDF.',
    )
  }
  console.log('cv.pdf: up to date with cv.js')
  process.exit(0)
}

if (!CHROME) throw new Error('cv-pdf: no Chrome or Edge found to render the PDF')

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// linkedin.com/in/x — the bare handle reads better in print than a full URL
const short = (url) => url.replace(/^https?:\/\/(www\.)?/, '')

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Charles Abi Chahine — CV</title>
<style>
  @page { size: A4; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
         color: #111110; font-size: 9.1pt; line-height: 1.45; -webkit-print-color-adjust: exact; }
  .mono { font-family: Consolas, "SF Mono", ui-monospace, monospace; font-size: 6.6pt;
          letter-spacing: 0.14em; text-transform: uppercase; }
  header { display: flex; justify-content: space-between; align-items: flex-end;
           border-bottom: 1.4px solid #111110; padding-bottom: 7pt; margin-bottom: 12pt; }
  h1 { font-size: 20pt; font-weight: 700; letter-spacing: -0.01em; margin: 0; line-height: 1; }
  h1 span { color: #d92b1f; }
  .role { color: #55554f; margin-top: 4pt; }
  /* Not uppercased like the other mono labels: an address a recruiter copies
     out should read exactly as it is typed. */
  .contact { text-align: right; color: #55554f; line-height: 1.75; text-transform: none;
             letter-spacing: 0.06em; }
  .cols { display: flex; gap: 13mm; align-items: flex-start; }
  .main { flex: 1.75; min-width: 0; } .side { flex: 1; min-width: 0; }
  h2 { color: #8a8a82; border-top: 0.8px solid #111110; padding-top: 4pt;
       margin: 0 0 7pt; font-weight: 400; }
  section { margin-bottom: 11pt; break-inside: avoid; }
  .entry { display: flex; gap: 6mm; margin-bottom: 8pt; break-inside: avoid; }
  .when { flex: 0 0 20mm; color: #8a8a82; font-variant-numeric: tabular-nums; padding-top: 1pt; }
  .what { flex: 1; min-width: 0; }
  .what h3 { font-size: 9.6pt; font-weight: 600; margin: 0; }
  .where { color: #8a8a82; margin: 1.5pt 0 3pt; }
  ul { margin: 0; padding-left: 3.4mm; color: #55554f; }
  li { margin-bottom: 1.6pt; }
  .notes { color: #55554f; margin: 0; }
  /* Education sits in the narrow column, so its date stacks above the degree
     rather than taking a gutter — that is what keeps the CV on one page. */
  .ed { margin-bottom: 7pt; break-inside: avoid; }
  .ed .when { color: #8a8a82; font-variant-numeric: tabular-nums; margin-bottom: 1.5pt; }
  .ed h3 { font-size: 9.2pt; font-weight: 600; margin: 0; }
  .grp { margin-bottom: 6pt; }
  .grp b { color: #d92b1f; font-weight: 400; display: block; margin-bottom: 2pt; }
  .grp p { margin: 0; color: #55554f; }
  .lang { display: flex; justify-content: space-between; border-bottom: 0.6px solid #e6e6e2;
          padding-bottom: 2pt; margin-bottom: 2.5pt; }
  .lang span:last-child { color: #8a8a82; }
  .certs { list-style: none; padding: 0; }
</style></head><body>
<header>
  <div>
    <h1>Charles Abi Chahine<span>.</span></h1>
    <div class="role mono">Architect · Computational Designer</div>
  </div>
  <div class="contact mono">
    <div>${esc(contact.email)}</div>
    <div>${esc(short(contact.linkedin))}</div>
    <div>${esc(short(contact.github))}</div>
  </div>
</header>

<div class="cols">
  <div class="main">
    <section>
      <h2 class="mono">Experience</h2>
      ${experience
        .map(
          (j) => `<div class="entry">
        <div class="when mono">${esc(j.dates)}</div>
        <div class="what">
          <h3>${esc(j.role)} — ${esc(j.firm)}</h3>
          <div class="where mono">${esc(j.where)}</div>
          <ul>${j.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>
        </div></div>`,
        )
        .join('')}
    </section>

  </div>

  <div class="side">
    <section>
      <h2 class="mono">Education</h2>
      ${education
        .map(
          (e) => `<div class="ed">
        <div class="when mono">${esc(e.dates)}</div>
        <h3>${esc(e.degree)}</h3>
        <div class="where mono">${esc(e.school)}</div>
        <p class="notes">${esc(e.notes)}</p>
      </div>`,
        )
        .join('')}
    </section>

    <section>
      <h2 class="mono">Skills</h2>
      ${skills
        .map(
          (s) => `<div class="grp"><b class="mono">${esc(s.group)}</b>
          <p>${s.items.map(esc).join(' · ')}</p></div>`,
        )
        .join('')}
    </section>

    <section>
      <h2 class="mono">Languages</h2>
      ${languages
        .map(
          (l) => `<div class="lang"><span>${esc(l.name)}</span><span class="mono">${esc(l.level)}</span></div>`,
        )
        .join('')}
    </section>

    <section>
      <h2 class="mono">Certificates</h2>
      <ul class="certs">${certificates.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </section>
  </div>
</div>
</body></html>`

const tmpHtml = resolve(tmpdir(), 'cac-cv.html')
const out = resolve(here, '../public/cv.pdf')
writeFileSync(tmpHtml, html, 'utf8')

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
console.log(`cv.pdf: generated from cv.js (${experience.length} roles, ${education.length} degrees)`)
