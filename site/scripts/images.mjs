/*
 * Re-export the published project images from their originals.
 *
 * The webp files in public/projects were made outside this repo and were
 * compressed hard: 78 of 86 sat under 0.9 bits per pixel, and 21 were under
 * 1200px wide, which is soft the moment the full-size viewer opens them. The
 * originals in portfolio-projects/ are far better, up to 18168px, so nothing has
 * to be upscaled or invented; this only stops throwing detail away.
 *
 * Nothing recorded which original each published file came from: the published
 * names are hand-chosen (cover.webp) and the originals are blog exports
 * (Blog_..._page-0021.jpg). So the pairing is recovered from the pixels. Every
 * candidate is decoded to a 24x24 grey thumbnail and compared by mean absolute
 * difference. A match is only used when it is both close and clearly better than
 * the runner-up; anything else is reported and skipped rather than guessed at.
 *
 *   node scripts/images.mjs           report what would change, write nothing
 *   node scripts/images.mjs --write   re-export
 *   node scripts/images.mjs --write --only narkomfin
 *
 * portfolio-projects/ is gitignored and local-only, so this is a maintenance
 * script rather than part of the build. The build never depends on it.
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(SITE, '..', 'portfolio-projects')

// Where each project's originals live. Only the MaCAD work has a source folder;
// the earlier projects were supplied as finished images and are left alone.
const FOLDER = {
  sensi: 'iaac-macad/sensi',
  narkomfin: 'iaac-macad/narkomfin',
  'urban-risk': 'iaac-macad/urban-risk',
  legoarch: 'iaac-macad/legoarch',
  'breathing-mass': 'iaac-macad/hb01-3-breathing-mass',
  facadeiq: 'iaac-macad/facadeiq',
  'integrative-modeling': 'iaac-macad/hb01-2-integrative-modeling',
  'collaborative-workflow': 'iaac-macad/hb01-1-collaborative-workflow',
  huddle: 'iaac-macad/huddle',
  'clebsch-pavilion': 'iaac-macad/clebsch-pavilion',
  'luminous-stratum': 'iaac-macad/luminous-stratum',
  tsukiji: 'iaac-macad/tsukiji',
}

// 2000px covers the full-size viewer, which tops out around 1840px on a 1080p
// screen, with a little spare for a denser display. Nothing is ever enlarged.
const TARGET_W = 2000
const QUALITY = 86

const write = process.argv.includes('--write')
// indexOf returns -1 when the flag is absent, and argv[0] is the node binary, so
// reading argv[i + 1] blindly filters every project against a path to node.exe.
const onlyAt = process.argv.indexOf('--only')
const only = onlyAt === -1 ? null : process.argv[onlyAt + 1]
const kb = (n) => Math.round(n / 1024)

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = join(d, e.name)
    if (e.isDirectory()) return walk(p)
    return /\.(png|jpe?g|tiff?)$/i.test(e.name) ? [p] : []
  })

const N = 24
const print = async (file) => {
  try {
    const { data } = await sharp(file, { limitInputPixels: false })
      .greyscale()
      .resize(N, N, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    return data
  } catch {
    return null
  }
}
const dist = (a, b) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length
}

const raw = readFileSync(join(SITE, 'src/data/projects.js'), 'utf8').replace(
  'import.meta.env.BASE_URL',
  "'/'",
)
const { projects } = await import(
  'data:text/javascript;base64,' + Buffer.from(raw).toString('base64')
)

let before = 0
let after = 0
let done = 0
const skipped = []

for (const p of projects) {
  if (only && p.slug !== only) continue
  const rel = FOLDER[p.slug]
  if (!rel || !existsSync(join(SRC, rel))) continue

  const sources = []
  for (const f of walk(join(SRC, rel)).filter((f) => !/-scaled\./i.test(f))) {
    const fp = await print(f)
    if (fp) sources.push({ file: f, fp })
  }
  if (!sources.length) continue

  // The cover appears in the gallery too when a project uses one of its section
  // images for it, so de-duplicate before re-encoding anything twice.
  const targets = [...new Set([p.cover, ...p.sections.flatMap((s) => s.media.map((m) => m.src))])]

  for (const relPath of targets) {
    if (!/\.webp$/i.test(relPath)) continue
    const out = join(SITE, 'public', relPath)
    if (!existsSync(out)) continue

    // Read the current file into memory rather than letting sharp hold it open.
    // On Windows the later writeFileSync to the same path fails with UNKNOWN
    // while any handle is still live.
    const cur = readFileSync(out)
    const fp = await print(cur)
    if (!fp) continue
    const ranked = sources.map((s) => ({ ...s, d: dist(fp, s.fp) })).sort((a, b) => a.d - b.d)
    const best = ranked[0]
    const gap = ranked[1] ? ranked[1].d - best.d : 999

    const name = relPath.split('/').slice(-1)[0]
    if (best.d > 12) {
      skipped.push(`${p.slug}/${name}  no confident original (distance ${best.d.toFixed(1)})`)
      continue
    }
    if (gap < 1.5) {
      skipped.push(`${p.slug}/${name}  two originals equally close, not guessing`)
      continue
    }

    const oldSize = cur.length
    const oldMeta = await sharp(cur).metadata()
    const buf = await sharp(best.file, { limitInputPixels: false })
      .resize({ width: TARGET_W, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer()
    const newMeta = await sharp(buf).metadata()

    before += oldSize
    after += buf.length
    done++
    console.log(
      `  ${(p.slug + '/' + name).padEnd(40)}` +
        `${(oldMeta.width + 'x' + oldMeta.height).padEnd(11)}${String(kb(oldSize) + 'KB').padStart(7)}` +
        `  ->  ${(newMeta.width + 'x' + newMeta.height).padEnd(11)}${String(kb(buf.length) + 'KB').padStart(7)}`,
    )
    if (write) writeFileSync(out, buf)
  }
}

console.log(
  `\n${done} images ${write ? 'rewritten' : 'would change'}: ` +
    `${kb(before)}KB -> ${kb(after)}KB (${after > before ? '+' : ''}${kb(after - before)}KB)`,
)
if (skipped.length) {
  console.log(`\n${skipped.length} skipped rather than guessed:`)
  for (const s of skipped) console.log('  ' + s)
}
if (!write) console.log('\nDry run. Pass --write to apply.')
