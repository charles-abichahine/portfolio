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
const LINE = '#e0e3e7'
const ACCENT = '#c9261b'

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
    /* Bare paper. The card carried a 60px grid, inherited from the dark version
       and meant to stand in for the landing's line drawing. On a near-black
       ground it was texture; on paper the same lines are a spreadsheet behind
       the name, and the block is quiet enough that it does not need a backdrop
       to sit on. */
    background: ${PAPER};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 88px;
    font-kerning: normal;
    -webkit-font-smoothing: antialiased;
  }
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
  svg { width: 224px; height: 204px; display: block; }
</style>
<div>
  <h1>Charles Abi<br>Chahine<span class="dot">.</span></h1>
  <p class="role">architect · computational designer</p>
  <hr>
  <p class="summary">design, computation, and the work of getting it built.</p>
</div>
<!-- public/logo.svg, inlined with the light theme's ink and accent in place of
     the file's own hard-coded pair. -->
<svg viewBox="0 0 110 100" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="${INK}" stroke-linecap="round">
    <circle cx="48" cy="50" r="40" stroke-width="6" pathLength="100"
      stroke-dasharray="86 14" transform="rotate(18 48 50)" />
    <circle cx="48" cy="50" r="31" stroke-width="5.5" pathLength="100"
      stroke-dasharray="38 10 40 12" transform="rotate(-30 48 50)" />
  </g>
  <rect x="93" y="57" width="5" height="25" rx="1" fill="${ACCENT}" />
</svg>
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
