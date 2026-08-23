/*
 * The link preview card, rendered from the site's own name block.
 *
 *   node scripts/og-image.mjs
 *
 * public/og-image.png is what LinkedIn, Slack, iMessage and every other unfurler
 * shows for the whole domain, so it is the first typography anyone sees. It was
 * made by hand once and then drifted: it carried a bold fallback sans rather
 * than Space Grotesk 300, set the role line in caps where the site sets it in
 * lowercase, and sat on a near-black ground the site only uses in dark mode.
 *
 * Generated rather than drawn now, so the card is the same block as Home.jsx
 * instead of a copy of an older one. Same fonts, same weight, same tracking,
 * same tokens out of index.css.
 *
 * Through headless Chrome, like the CV: the block is Space Grotesk at 300 with
 * negative tracking and a hairline rule, and the only renderer that gets that
 * right is the one the site is designed against. sharp's SVG path goes through
 * librsvg, which resolves fonts through fontconfig and would quietly substitute
 * something else for all three families.
 *
 * Not part of the build. The card changes when the identity changes, which is
 * roughly never; running this on every build would rewrite a binary in git for
 * nothing.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { CC, crossCap, makeProjector } from '../src/lib/crosscap.js'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(SITE, 'public')

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].find((p) => existsSync(p))

if (!CHROME) throw new Error('og-image: no Chrome or Edge found to render the card')

/* Base64 rather than a relative URL. Chrome gives every file:// document its own
   opaque origin, so a font fetched from a sibling path is cross-origin and gets
   dropped without a word — and a card that silently falls back to Arial is the
   exact failure this script exists to undo. */
const font = (file) => readFileSync(join(PUBLIC, 'fonts', file)).toString('base64')

/* The light half of index.css, and only the values the card uses. Copied by hand
   because index.css is Tailwind v4 source: reading it would mean parsing @theme,
   and these five have not moved since the palette was set. */
const PAPER = '#f4f5f6'
const INK = '#16181d'
const SOFT = '#4e535c'
const MUTED = '#6a707b'
const LINE = '#e0e3e7'
const ACCENT = '#c9261b'

/*
 * The cross-cap survey, the same drawing the homepage carries, rendered into the
 * card so the preview looks like the site it opens. The mathematics is shared
 * (src/lib/crosscap.js); the framing here is the card's own — turned and zoomed
 * like the desktop hero so a fragment sits high on the right and runs off the top
 * and right edges, clear of the name block on the left. Points are muted, a
 * sparse subset carry their station number, and the whole thing is one SVG laid
 * over the card. w/h are the card's pixels; ax/ay place the cloud's centre.
 */
// ax past 1: the cross-cap's pinch spine — the clean vertical line where every
// arc ends — sits right of the frame, off the card, the way the desktop hero
// hangs it off the screen edge. What the card shows is the arcs sweeping in.
const CARD_VIEW = { yaw: 90, pitch: 30, zoom: 2.1, ax: 1.02, ay: 0.3 }
const CARD_LABEL_EVERY = 67
// A partial survey, like the homepage at rest: only this fraction of the u-rows
// is drawn, so the card carries a drawing still computing rather than the whole
// solid — the whole shape at full ink overpowered the name it shares the card with.
// The cutoff is feathered over the trailing rows rather than ending on a hard
// line: points thin out toward the frontier, the way the homepage's edge does.
const CARD_ROWS = 0.7
const CARD_FEATHER_ROWS = 40
// The homepage's stable sine hash, so the feather is deterministic per point.
const hash01 = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function crossCapField(w, h) {
  const project = makeProjector(CARD_VIEW.yaw, CARD_VIEW.pitch)
  const flat = crossCap().map(project)
  const xs = flat.map((q) => q.px)
  const ys = flat.map((q) => q.py)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const k = (CARD_VIEW.zoom * w) / Math.max(maxX - minX, maxY - minY)
  const ox = CARD_VIEW.ax * w - ((minX + maxX) / 2) * k
  const oy = CARD_VIEW.ay * h + ((minY + maxY) / 2) * k
  const bleed = 16
  let dots = ''
  let nums = ''
  const maxRow = Math.round(CARD_ROWS * CC.U)
  for (const q of flat) {
    // Feather: fully kept below the band, fully dropped past it, thinning in
    // between — each point's own hash decides, so the frontier dissolves.
    const over = q.row - (maxRow - CARD_FEATHER_ROWS)
    if (over > 0 && hash01(q.id) < over / CARD_FEATHER_ROWS) continue
    const X = ox + q.px * k
    const Y = oy - q.py * k
    if (X < -bleed || X > w + bleed || Y < -bleed || Y > h + bleed) continue
    dots += `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="1.6"/>`
    if (q.id % CARD_LABEL_EVERY === 0)
      nums += `<text x="${(X + 5).toFixed(1)}" y="${(Y + 4).toFixed(1)}">${String(q.id).padStart(4, '0')}</text>`
  }
  return `<svg class="field" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <g fill="${MUTED}" opacity="0.45">${dots}</g>
    <g fill="${MUTED}" opacity="0.38" font-family="IBM Plex Mono" font-size="15">${nums}</g>
  </svg>`
}

/*
 * 1200x630 is the size every unfurler crops to. The card is built at 2x and
 * downsampled by Chrome's device pixel ratio rather than drawn at 1x, because
 * Space Grotesk at 300 is a thin face and its stems alias badly at one device
 * pixel — which is half of why the old card reached for a bold weight.
 */
const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: "Space Grotesk";
    font-weight: 300 700;
    src: url(data:font/woff2;base64,${font('space-grotesk-300700.woff2')}) format("woff2");
  }
  @font-face {
    font-family: "IBM Plex Mono";
    font-weight: 400;
    src: url(data:font/woff2;base64,${font('ibm-plex-mono-400.woff2')}) format("woff2");
  }
  @font-face {
    font-family: "Spectral";
    font-weight: 400;
    src: url(data:font/woff2;base64,${font('spectral-400.woff2')}) format("woff2");
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    /* Paper, with the cross-cap survey laid over it — the same drawing the
       homepage carries, so the preview reads as the site rather than a card
       about it. The field sits high on the right (see CARD_VIEW) and the name
       block sits over it on the left, clear of the points. */
    position: relative;
    background: ${PAPER};
    font-kerning: normal;
    -webkit-font-smoothing: antialiased;
  }
  .field { position: absolute; inset: 0; width: 1200px; height: 630px; }
  .block { position: absolute; left: 88px; top: 50%; transform: translateY(-50%); }
  h1 {
    font-family: "Space Grotesk", sans-serif;
    /* 300, and 300 exactly. The variable file starts there, and the old card's
       weight was the browser guessing at a bold it did not have. */
    font-weight: 300;
    font-size: 82px;
    line-height: 1.03;
    letter-spacing: -0.024em;
    color: ${INK};
  }
  .dot { color: ${ACCENT}; }
  .role {
    font-family: "IBM Plex Mono", monospace;
    font-weight: 400;
    font-size: 21px;
    /* lowercase, as the landing sets it. The card said ARCHITECT · COMPUTATIONAL
       DESIGNER, which is a different voice from the site it is advertising. */
    text-transform: lowercase;
    letter-spacing: 0.08em;
    color: ${SOFT};
    margin-top: 24px;
  }
  hr {
    border: 0;
    border-top: 1px solid ${LINE};
    margin: 28px 0 24px;
    /* Ends under the block rather than running to the edge: it is a rule
       between two pieces of the same column, not a divider across the card. */
    width: 512px;
  }
  /* The landing's one serif sentence, in the landing's serif. Every unfurler
     also prints it under the card as the og:description, but the card travels
     places the description does not — Messages, small share sheets — and the
     sentence is the site's whole pitch. */
  .summary {
    font-family: "Spectral", serif;
    font-weight: 400;
    font-size: 27px;
    line-height: 1.6;
    color: ${SOFT};
  }
  /* A paper wash behind the name, so the field's points and numbers recede
     around the block rather than crowding the type — the card's echo of the
     homepage's faded-paper halo. */
  .block::before {
    content: "";
    position: absolute;
    inset: -40px -120px -40px -60px;
    background: radial-gradient(ellipse at center, ${PAPER} 55%, transparent 88%);
    z-index: -1;
  }
</style>
${crossCapField(1200, 630)}
<div class="block">
  <h1>Charles Abi<br>Chahine<span class="dot">.</span></h1>
  <p class="role">architect · computational designer</p>
  <hr>
  <p class="summary">design, computation, and the work of getting it built.</p>
</div>
`

const tmp = join(tmpdir(), 'og-image.html')
writeFileSync(tmp, html)

const out = join(PUBLIC, 'og-image.png')
execFileSync(
  CHROME,
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--window-size=1200,630',
    /* The fonts are inline, so there is nothing to wait on the network for, but
       Chrome still needs a beat to lay out and rasterise before it grabs the
       frame. Virtual time makes that beat deterministic instead of a race. */
    '--virtual-time-budget=3000',
    `--screenshot=${out}`,
    pathToFileURL(tmp).href,
  ],
  { stdio: 'ignore' },
)
unlinkSync(tmp)

const { default: sharp } = await import('sharp')
/* Chrome writes a 2400x1200 RGBA PNG. Down to the 1200x630 every unfurler wants,
   and to 8-bit palette: the card is five flat colours plus antialiasing, so a
   palette holds it exactly and the file lands an order of magnitude smaller. */
const buf = await sharp(out).resize(1200, 630).png({ palette: true, quality: 92 }).toBuffer()
writeFileSync(out, buf)
console.log(`og-image: wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
/* Every unfurler that matters mirrors the card rather than hotlinking it, and
   keys its copy on the URL. Writing new pixels to the same path leaves all of
   them showing the old card forever. index.html carries the reason at length. */
console.log('og-image: now bump ?v= on og:image and twitter:image in index.html')
