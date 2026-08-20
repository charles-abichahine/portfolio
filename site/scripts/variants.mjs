/*
 * Width variants for every image the site renders, plus the manifest that lets
 * the markup name them.
 *
 * The published files are sized for the full-size viewer: 97 of the 101 webps in
 * public/projects are over 800px wide, and 2000px is the target images.mjs
 * re-exports at. That is the right size for the one place a picture is looked
 * at properly, and the wrong size everywhere else. A phone loading the landing
 * fetched 1400 to 2000px covers to draw them at 62x47, and opening a card
 * fetched the full gallery at full size to fill a strip of 76px thumbnails.
 *
 * Four steps: 480, 640, 960, 1440, and srcSet lets the browser pick.
 *
 * 640 exists because the /work tiles are sized off the window HEIGHT (38vh,
 * capped), so on a 1x desktop they render 456 to 533px wide. With 480 as the
 * only sub-960 step, a 1x screen was handed a 480 stretched past its size and
 * every cover on the index went soft; 640 covers that whole range sharp.
 * 1440 exists for 3x phones and 2x tiles: a tile or card well at those
 * densities asks for 900 to 1100px, and without 1440 the next candidate was
 * the 2000px original, which cost the full file for a fraction of the use.
 *
 * A manifest rather than a naming convention. The markup has to know whether a
 * variant exists before it names one: an SVG, a file already under 480px, and
 * anything this script skipped must render from the original exactly as they did
 * before, and a helper that guesses would 404 on all three. The manifest is
 * written to src/data/imageVariants.js and read by imgSrcSet, so the files on
 * disk and the candidates in the markup cannot disagree.
 *
 *   npm run variants
 *
 * Deliberately not part of the build. The variants are static assets like the
 * originals beside them and are committed the same way; a build that regenerated
 * them would spend a minute of CI re-encoding files that have not changed. Run
 * it when an image is added or images.mjs re-exports one.
 */
import sharp from 'sharp'
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(SITE, 'public')
const MANIFEST = join(SITE, 'src/data/imageVariants.js')

// The two steps, and the house encoder settings images.mjs already uses, so a
// variant is the same file its original would have been at that width.
const WIDTHS = [480, 640, 960, 1440]
const QUALITY = 86
const EFFORT = 6

const kb = (n) => Math.round(n / 1024)

// projects.js is a browser module, so two things are substituted out before it
// is imported from memory: BASE_URL, which only exists inside Vite, and the
// import of the manifest, which a data: module cannot resolve relatively and
// which this script is the thing that writes. Neither affects the paths read
// below.
const raw = readFileSync(join(SITE, 'src/data/projects.js'), 'utf8')
  .replace('import.meta.env.BASE_URL', "'/'")
  .replace(/^import \{ VARIANTS \}.*$/m, 'const VARIANTS = {}')
const { projects } = await import(
  'data:text/javascript;base64,' + Buffer.from(raw).toString('base64')
)

/*
 * Every image the site actually renders, which is not the same list as every
 * image in projects.js: an animated cover and a gallery video are never drawn as
 * themselves at a small size, their posters are. Those poster paths are derived
 * rather than recorded — see the same two rules in Work.jsx and ProjectCard.jsx —
 * so they are derived the same way here.
 */
const sources = new Set()
const add = (p) => {
  if (p && /\.webp$/i.test(p) && existsSync(join(PUBLIC, p))) sources.add(p)
}

for (const p of projects) {
  add(p.cover.endsWith('.webm') ? p.cover.replace(/cover\.webm$/, 'poster.webp') : p.cover)
  for (const s of p.sections) {
    for (const m of s.media) {
      add(m.type === 'image' ? m.src : m.src.replace(/\.[a-z0-9]+$/i, '-poster.webp'))
    }
  }
}

const manifest = {}
let made = 0
let added = 0
const skipped = []

for (const rel of [...sources].sort()) {
  const abs = join(PUBLIC, rel)
  const stem = rel.replace(/\.webp$/i, '')
  const meta = await sharp(abs).metadata()

  // Never upscale: a 400px file has no 480 to give, and asking for one would
  // hand the browser a bigger download of a blurrier picture.
  const widths = WIDTHS.filter((w) => w < meta.width)
  if (!widths.length) {
    skipped.push(`${rel}  ${meta.width}px, already at or under the smallest step`)
    continue
  }

  for (const w of widths) {
    const out = join(PUBLIC, `${stem}-${w}.webp`)
    const buf = await sharp(abs)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: EFFORT })
      .toBuffer()
    writeFileSync(out, buf)
    made++
    added += buf.length
  }

  // The original's own width leads the record: it is the largest candidate in
  // every srcSet, and without it the browser has no descriptor for the file the
  // viewer wants.
  manifest[rel] = [meta.width, ...widths]
  console.log(
    `  ${rel.padEnd(48)}${String(meta.width + 'px').padStart(7)}` +
      `${String(kb(statSync(abs).size) + 'KB').padStart(8)}  ->  ${widths.join(', ')}`,
  )
}

const body = Object.entries(manifest)
  .map(([k, v]) => `  '${k}': [${v.join(', ')}],`)
  .join('\n')

writeFileSync(
  MANIFEST,
  `/*
 * Generated by scripts/variants.mjs. Do not edit by hand.
 *
 * Every image that has width variants beside it, mapped to its own width
 * followed by the widths that exist as \`<stem>-<w>.webp\`. A path that is not
 * here has no variants and must be rendered from the original: see imgSrcSet in
 * projects.js, which falls back to a plain src for exactly that case.
 */
export const VARIANTS = {
${body}
}
`,
)

console.log(
  `\n${made} variants written for ${Object.keys(manifest).length} images, ` +
    `${kb(added)}KB added.\n${MANIFEST.replace(SITE, 'site')} rewritten.`,
)
if (skipped.length) {
  console.log(`\n${skipped.length} left alone:`)
  for (const s of skipped) console.log('  ' + s)
}
