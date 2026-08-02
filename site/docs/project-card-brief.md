# Brief: the project card

Design the card that opens when someone clicks a project anywhere on
charlesabichahine.com. This is a design brief, not an implementation task. Read
it all before proposing anything.

---

## Who this is for

Charles Abi Chahine, architect and computational designer, MaCAD at IAAC.
The site's audience is **recruiters and studio leads at architecture practices**,
hiring for computational design, BIM and architect roles. They are not reading
for pleasure. Assume 20 to 40 seconds on a project before they decide whether to
open it properly or move on.

## What exists now, and what is wrong with it

Clicking a project opens a card over the blurred page you were on. The URL
changes to `/work/:slug`, so links, refreshes and crawlers still get a full
standalone page; the card is an enhancement over the top.

The card currently renders **the entire project page inside it**, which means it
scrolls internally for five to eight screens. That is a page in a box, not a
card. It defeats the point of opening in place.

## The brief

**A card that can be understood at a glance, without scrolling.**

Hard constraints, all of them non-negotiable:

1. **No internal scroll.** The whole card fits the viewport at every size.
2. **Little text.** A reader should not be reading paragraphs here.
3. **One template for all 19 projects.** Not a bespoke layout per project.
4. **The full page still exists** at the same URL, reachable from the card. The
   card does not have to carry everything — it has somewhere to send people.

The card answers, fast: *what is this, what did he do, what does it look like,
what was it built with, is it any good.* Anything that does not serve one of
those five is a candidate for cutting.

## The space you have

The card is centred with padding around it. Usable area:

| viewport | card |
|---|---|
| 1440 x 900 | 1180 x 820 |
| 1280 x 720 (the tight one) | 1180 x 640 |
| 390 x 780 (phone) | 366 x 756 |

**1280 x 720 is the case that decides the design.** A laptop at that size gives
you 640px of height. Most portfolio card designs assume more.

## The data you are designing against

Every project record has these fields. This is all of it — nothing else exists,
and inventing a field means someone has to write it 19 times.

```js
{
  slug, date, title,
  subtitle,        // one sentence, 83 to 244 chars, median 163
  year,            // '2026', or '2025/26'
  module,          // 'AIA Studio · MaCAD, IAAC'  |  'SOMA · Design Architect'
  team,            // 1 to 4 names, or ['SOMA: office project']
  tools,           // 2 to 5 strings: 'Python', 'Grasshopper', 'LLM agents'
  tag,             // 'AI' | 'GH' | 'ARCH' | ...
  toolsShort,      // 'PYTHON · SENSORY AI'  — a short badge string
  cover,           // .webp still, or .webm video (3 of 19 are video)
  category,        // one of 4: Computation & AI | BIM & Workflows |
                   //           Design & Research | Practice   (each has a colour)
  award,           // 4 of 19 have one: 'MaCAD 2026 Award', 'IAAC Exhibition'
  links,           // { github?, blog? } — 12 of 19 have at least one
  intro: [...],    // exactly 1 paragraph, every project
  sections: [      // 0 to 6
    { heading, body: [...paragraphs], media: [ { type, src, caption } ] }
  ]
}
```

**The variance is the hard part.** One template has to hold both of these:

```
soma-stratus    0 media   0 sections   subtitle 83c   tools 3   team 1   no award   no links
legoarch       11 media   5 sections   subtitle 136c  tools 4   team 2   no award   1 link
sensi          10 media   4 sections   subtitle 160c  tools 4   team 4   award      2 links
```

Across all 19: media 0–11 (median 3), sections 0–6 (median 1), tools 2–5,
team 1–4, 4 have awards, 12 have links, 3 have video covers.

A design that only works for Sensi is not a design. **Show your layout holding
`soma-stratus`, which has a cover and one sentence and nothing else.**

## The design system already in place

Do not invent a new one. This is built and shipping.

- **Type.** Space Grotesk (headings, UI), Spectral (prose), IBM Plex Mono
  (labels, metadata, counts). Self-hosted.
- **Colour.** Tinted paper `#f4f5f6` / ink `#16181d`, cool grey ramp, one accent
  red `#d92b1f`. Four category colours: red, blue `#1f6feb`, green `#1a7f37`,
  amber `#a2571a`. Full light and dark themes, tokenised.
- **Rules.** Hairlines at 0.8px. Red is used sparingly and always means
  something: the full stop after his name, date rules, section rule heads.
- **Radius.** 10px on tiles, 14px on the card.
- **Voice.** No em dashes anywhere. Sentence case, not title case.

## What to deliver

**Three distinct directions**, not three variations of one. For each:

1. A name and a one-line thesis.
2. A layout at 1280 x 720, described precisely enough to build: what occupies
   what area, at what size, in what order.
3. What it does with `soma-stratus` (nothing but a cover and a sentence) and
   with `legoarch` (11 media).
4. What it deliberately leaves out, and why that is safe given the full page
   exists.
5. Its weakness. Every direction has one; name it.

Then **one recommendation** with the reasoning, including what you would give up.

Useful tensions to design into, rather than around:

- The cover is the strongest asset and it wants to be large. Everything else
  competes with it for 640px of height.
- Three covers are video. A card built around a still may feel dead for those,
  or a card built around motion may feel broken for the other 16.
- `sections[].media` holds the real evidence, the screenshots and drawings.
  Showing three of them as thumbnails may be worth more than any sentence, or
  may be clutter at that size. Argue it.
- Metadata (year, team, tools, module) is what a recruiter actually scans, and
  it is also the least interesting thing to look at.
- The card must not read as a dead end. Whatever leads to the full page has to
  be findable without hunting.

## How this will be judged

- Can a stranger say what the project is, in five seconds, from the card alone?
- Does it hold up for the thinnest project as well as the richest?
- Does it fit 1280 x 720 without scrolling, with the phone layout following from
  the same idea rather than being a separate design?
- Does it look like the rest of this site, or like a card from somewhere else?
