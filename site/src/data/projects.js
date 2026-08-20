import { VARIANTS } from './imageVariants.js'

const base = import.meta.env.BASE_URL
export const asset = (p) => base + p

/*
 * The same picture, at the width the page is actually going to draw it.
 *
 * Every published image is sized for the full-size viewer, which is right for
 * the viewer and wrong for the four places that are not it: a 62px belt
 * thumbnail on the landing, a 405px tile on /work, a 76px strip thumbnail in a
 * card, and the card's own well. srcSet hands the browser the candidates and
 * sizes tells it how wide the box will be, and it picks; there is nothing to
 * decide at runtime and nothing to keep in step with a media query.
 *
 * Spread onto the <img> rather than returning a string, so the two attributes
 * are simply absent for a file with no variants: an SVG, a picture already
 * narrower than the smallest step, anything scripts/variants.mjs left alone.
 * An absent srcSet is exactly the markup these images had before, which is the
 * point — nothing regresses to a 404 or to a plain src that no longer matches.
 *
 * `sizes` is the caller's, because only the caller knows its own box, and it is
 * the one part of this that is wrong by default: without it the browser assumes
 * 100vw and fetches the largest file for a thumbnail, which is the bug this is
 * here to fix.
 */
export function imgSrcSet(src, sizes) {
  const rec = VARIANTS[src]
  if (!rec) return { src: asset(src) }
  const [full, ...widths] = rec
  const stem = src.replace(/\.webp$/, '')
  return {
    src: asset(src),
    srcSet: [...widths.map((w) => `${asset(`${stem}-${w}.webp`)} ${w}w`), `${asset(src)} ${full}w`].join(', '),
    sizes,
  }
}

const _projects = [
  {
    slug: 'sensi',
    date: '2026-06-28',
    title: 'Sensi',
    subtitle:
      'A sensory copilot for floor plans: it reads a plan and scores how each room will feel across six coupled senses, personalized to the person who will live in it.',
    year: '2026',
    module: 'AIA Studio · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'Lakzhmy Mari Zaro', 'María Sánchez Domínguez'],
    tools: ['Python', 'LLM agents', 'Vision models', 'Web app'],
    tag: 'AI',
    toolsShort: 'PYTHON · SENSORY AI',
    cover: 'projects/sensi/cover.webm',
    category: 'Computation & AI',
    award: 'MaCAD 2026 Award',
    links: {
      github: 'https://github.com/sclebow/AIA26_Studio/tree/main/team_02',
      blog: 'https://blog.iaac.net/sensi-making-comfort-a-design-layer/',
    },
    intro: [
      'In architecture we model everything: structure, cost, energy, code compliance. Layer after layer that makes a building accountable before it is built. Sensi adds the one layer we never formalized: how a space will actually feel. Not emotion, but the full sensory experience of standing in a room, scored across six senses: thermal, visual, acoustic, spatial, olfactory, tactile. Not in the abstract, but for a specific person.',
    ],
    sections: [
      {
        heading: 'The sensory layer',
        body: [
          'Comfort research studies one sense at a time: thermal has its own models, acoustic its own standards. But we take a room in through all of them at once, and the senses are coupled: one moderates another. We call it the ripple. Add a bigger window and the daylight improves, but the same glass is a thinner sound barrier and leaks heat, and the noise that gets in can even diminish the daylight you gained. One design move, a chain of consequences.',
          'The room score is not an average. It is half mean, half worst: the worst sense carries the room, because that is the one you would actually feel. A kitchen that scores fine on everything except smell does not get to hide behind its other senses. The scoring is deterministic: fixed rules over a coupling matrix. The LLM routes intent and explains results; it never decides the score. No black box.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/sensi-demo.mp4', caption: 'Sensi, end to end: a plan goes in, a room-by-room comfort report comes out.' },
        ],
      },
      {
        heading: 'Act 1 · Onboard: who is this for',
        body: [
          'Comfort is not universal. The same plan read through two lenses tells two stories: a child who minds noise sees the loud living room light up; a grandmother who minds the cold sees the cold bedroom. So Sensi opens by learning who you are: a few questions, then a moodboard where each image you keep quietly tags the senses you lean toward. Your words become sense weights, the images nudge them, and it all compiles into a persona drawn as a petal rose.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/onboard.mp4', caption: 'Onboarding: from a few questions and a moodboard to a personal weighting of the six senses.' },
          { type: 'image', src: 'projects/sensi/onboarding.webp', caption: 'The persona, visualized as a petal rose: your comfort priorities, made explicit.' },
        ],
      },
      {
        heading: 'Act 2 · Shape: comfort you can edit',
        body: [
          'This is the heart of the system. You talk to it in plain language; a fast routing model classifies your intent in about 0.6 seconds: score a room, edit it, or explore the relationships. Ask a question and a heavier model reads the whole room and answers in words. Make an edit (change a material, add a window, place curtains, adjust ventilation) and the agent plans it, validates it against the plan, applies it, and re-scores, live. Every edit is kept as a checkpoint, so the plan improves honestly over time.',
          'Rooms are nodes, doors are edges: the kitchen’s noise and smell reaching the bedroom through the hallway makes comfort a zoning problem you can see. The galaxy view holds the whole project as one living map of rooms, senses, and the design levers behind them, so you can find the connection you did not know was there.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/shape.mp4', caption: 'Shaping: conversational edits that re-score the plan in real time.' },
          { type: 'image', src: 'projects/sensi/shape-01.webp', caption: 'Reading the plan into rooms, uses, and adjacencies.' },
          { type: 'image', src: 'projects/sensi/shape-02.webp', caption: 'Scores respond to every edit, the ripple propagating by fixed rules.' },
          { type: 'image', src: 'projects/sensi/shape-03.webp', caption: 'The galaxy view: rooms, senses, and levers as one connected system.' },
        ],
      },
      {
        heading: 'Act 3 · Report: closing the loop',
        body: [
          'The last act closes the loop. Your final scores write a prompt and a vision model renders each room, under an honest rule: only the extreme senses speak. A clearly good or bad sense writes a phrase, the comfortable middle stays quiet, so the render stays grounded in what actually changed. You compare it back to the moodboard from Act 1; input and output meet. We benchmarked the renders across providers: about $0.039 per room and 2.75× faster than the alternative we tested.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/report.mp4', caption: 'Generating the report: final scores become a grounded render of each room.' },
          { type: 'image', src: 'projects/sensi/report-01.webp', caption: 'The comfort report: the sensory layer, made legible.' },
          { type: 'image', src: 'projects/sensi/report-02.webp', caption: 'Room-by-room detail, ready for a design team to act on.' },
        ],
      },
    ],
  },
  {
    slug: 'urban-risk',
    date: '2026-06-19',
    title: 'Encoding Urban Risk',
    subtitle:
      'A machine-learning pipeline that classifies London street segments into low, medium, and high morphological-risk typologies from public spatial data alone, then tests whether the reading survives a move to another city.',
    year: '2026',
    module: 'Data Encoding · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'Lakzhmy Mari Zaro', 'María Sánchez Domínguez'],
    tools: ['Python', 'scikit-learn', 'OpenStreetMap', 'Mapillary', 'SHAP'],
    tag: 'ML',
    toolsShort: 'PYTHON · ML · GIS',
    cover: 'projects/urban-risk/cover.webp',
    category: 'Computation & AI',
    award: null,
    links: {
      github: 'https://github.com/modnas-m/MaCAD26-G01-DataEncoding',
      blog: 'https://blog.iaac.net/encoding-urban-risk-spatial-feature-analysis-and-assessment/',
    },
    intro: [
      'Can the physical layout of a street, measurable from public map data, predict how risky it feels? We framed it as a three-class problem: low, medium, or high risk, using seven spatial features drawn from OpenStreetMap and Mapillary per street segment. This is the full arc of the project, not just the results, but the wrong turn that made them honest.',
    ],
    sections: [
      {
        heading: 'Grounded in sixty years of theory',
        body: [
          'Every feature we chose traces back to established urban-safety theory. Jane Jacobs argued that active entrances create natural surveillance: “eyes on the street.” Oscar Newman showed that territorial clarity reduces the conditions for risk. Hillier and Hanson demonstrated through Space Syntax that network configuration shapes movement in predictable ways. Our unit of analysis is the segment, the stretch of street between two intersections, because risk clusters at that scale and a classified segment points a designer to a specific, addressable piece of street.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/theory.webp', caption: 'Seven features, each anchored in a lineage of urban-safety theory.' },
        ],
      },
      {
        heading: 'Hitting the wall',
        body: [
          'We first tried to predict crime directly: sourcing roughly 920,000 London incidents and regressing them against our spatial features across five boroughs. Three models, Linear Regression, Decision Tree, Random Forest, all returned R² under 0.064. The models failed to learn. Crime is driven by social and economic forces that street geometry alone cannot capture. We treated this as a finding, not a failure. Spatial form is too weak for direct regression against crime, so we pivoted to a more honest goal: a spatial typology that serves as a proxy for perceived risk.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/the-wall.webp', caption: 'The wall: every model flat against the diagonal. Crime does not reduce to spatial features.' },
        ],
      },
      {
        heading: 'The pivot: a spatial typology',
        body: [
          'We rebuilt the pipeline into eight steps: fetch from OSM and Mapillary, place seven normalised features onto each segment, collapse them into a weighted risk score, use PCA and a Kohonen map as diagnostics, cut into three classes with K-Means, train a classifier, and deploy to other cities. Across 36,000 segments the score is roughly normal, centred near 0.35, so rather than impose fixed cuts through the densest part, we let K-Means find the natural breakpoints. The split: 31% low, 47% medium, 22% high.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/pipeline.webp', caption: 'The eight-step pipeline: from OSM features to a deployable classifier.' },
          { type: 'image', src: 'projects/urban-risk/correlation.webp', caption: 'Redundancy check: the one strong correlation is visibility vs. enclosure at −0.75.' },
        ],
      },
      {
        heading: 'Coherent types, ambiguous risk',
        body: [
          'The Kohonen map sorts all seven features onto a 2D grid by similarity, and the network organises into legible street types. But coloured by risk, near-identical cells show quite different values. Typologies describe street character; they do not cleanly determine risk. That gap is the honest heart of the project.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/kohonen.webp', caption: 'Kohonen SOM: coherent typologies emerge, but risk sits ambiguously across them.' },
        ],
      },
      {
        heading: 'What actually matters',
        body: [
          'Logistic Regression hits 99% accuracy and Random Forest 95%: expected by construction, since the label was built from the same features the classifiers train on. Accuracy tells us the rule is clean and learnable, not that it is correct. The ablation study is more informative: transport proximity is the single most important feature, followed by connectivity and land use. Lighting contributes almost nothing, because Mapillary lighting is inconsistently mapped, and a feature that does not vary cannot discriminate.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/ablation.webp', caption: 'Ablation study: accuracy drop per feature removed. Transport leads; lighting barely registers.' },
        ],
      },
      {
        heading: 'London trained, world tested',
        body: [
          'With London as the training set, we applied the model to Barcelona’s Eixample and Trastevere in Rome. The Eixample comes out almost entirely high-risk, not because it is dangerous, but because its orthogonal grid, high enclosure, and high connectivity map onto London’s high-risk feature region. SHAP pinpoints the divergence: land use and visibility hit values the model has never seen, so it extrapolates into high-risk by default. Not an architecture flaw: a per-city normalisation and distribution-shift problem. English cities like Leeds and Birmingham, which share London’s morphological history, transfer far better; re-fitting the pipeline on Barcelona produces a contextually plausible spread of its own.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/cross-city.webp', caption: 'The same model on London, Barcelona, and Rome: the reading breaks where the morphology diverges.' },
          { type: 'image', src: 'projects/urban-risk/shap.webp', caption: 'SHAP: London’s high-risk drivers stay in-distribution; the Eixample’s do not.' },
        ],
      },
    ],
  },
  {
    slug: 'legoarch',
    date: '2026-06-18',
    title: 'lEgoarCh',
    subtitle:
      'From a one-sentence prompt to a priced, buildable LEGO set: generative AI proposes the form, deterministic computation proves it stands.',
    year: '2026',
    module: 'Generative AI Seminar · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac'],
    tools: ['FLUX.2 + LoRA', 'TRELLIS-2', 'ComfyUI', 'Python'],
    tag: 'AI',
    toolsShort: 'FLUX · TRELLIS · PYTHON',
    cover: 'projects/legoarch/cover.webp',
    category: 'Computation & AI',
    award: 'IAAC Exhibition',
    links: {
      github: 'https://github.com/hi-em/genai-legoarch',
      blog: 'https://blog.iaac.net/legoarch-behind-the-sets/',
    },
    intro: [
      'You type a building, and a minute later a real LEGO set is sitting on a shelf: rendered, modelled, brick-built, priced, and catalog-legal. Most "AI makes LEGO" demos stop at a gorgeous render, but a render is a promise, not a product. lEgoarCh builds the downstream half: the machinery that forces the dream to obey real bricks, real colours, and real gravity.',
    ],
    sections: [
      {
        heading: 'One sentence, five moves',
        body: [
          'The pipeline runs text prompt → FLUX render → TRELLIS 3D mesh → voxelize → legolize → a priced, buildable set. The front half is generative and probabilistic: it invents the form. The back half is deterministic: it proves the form stands. The handoff in the middle is the entire idea.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/pipeline.svg', caption: 'The whole pipeline on one line: three probabilistic boxes, then three deterministic ones.' },
          { type: 'image', src: 'projects/legoarch/slide-experience.webp', caption: 'The five-move experience: visualize, materialize, legolize, pack, keep.' },
        ],
      },
      {
        heading: 'A LoRA that speaks LEGO',
        body: [
          'Base FLUX.2 does not speak fluent LEGO Architecture: ask for a LEGO building and you get something vaguely blocky. So we trained a LoRA on the visual grammar of real LEGO Architecture sets and swept its strength from 0 to 1.5: at 0 the render is a plain building, at 1.0 the studs and brick seams snap in. The LEGO-ness genuinely lives in the fine-tune, not in the words.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/slide-lora.webp', caption: 'Same prompt, same seed, only the LoRA strength changes. 1.0 wins.' },
          { type: 'image', src: 'projects/legoarch/generative-sagrada.webp', caption: 'FLUX.2 + the legoarch LoRA rendering the Sagrada Família as an official-set photo.' },
        ],
      },
      {
        heading: 'From one photo to a whole object',
        body: [
          'TRELLIS-2 takes the single render and completes the full 3D form: openly guessing the unseen back from everything it knows about how buildings behave. Then the deterministic half begins: the mesh is voxelized onto plate-height layers (bricks are not cubes, so the mesh is pre-stretched 2.5× vertically), and colours are sampled and exposure-matched back to the original render.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/mesh-sagrada.webp', caption: 'The TRELLIS mesh: a couple hundred thousand triangles with a wrapped texture.' },
          { type: 'image', src: 'projects/legoarch/mesh-vs-lego.webp', caption: 'Smooth mesh versus legolized model.' },
        ],
      },
      {
        heading: 'The legolizer: where buildable gets earned',
        body: [
          'The computational centrepiece contains no AI at all. A split-and-merge solver covers each layer with the largest legal bricks that fit, full-height bricks first, then plates, then smooth tiles, with a slope pass that bevels staircases (to our knowledge the first open implementation of a method published in 2019) and a running-bond penalty that offsets seams the way a real bricklayer would.',
          'Colours snap to the nearest real LEGO colour measured in CIEDE2000, the perceptual standard, not naive RGB distance. Every footprint is a real BrickLink part: 44 parts and 48 colours cross-validated between Rebrickable and LDraw into 1,598 legal combinations. Buildable means every piece goes in a cart.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/split-and-merge.svg', caption: 'Split and merge, one layer: the biggest real bricks that share a colour, not a sea of 1×1s.' },
          { type: 'image', src: 'projects/legoarch/slide-catalog.webp', caption: 'The solver’s whole vocabulary: 44 parts × 48 colours = 1,598 validated combinations.' },
        ],
      },
      {
        heading: 'A set you can keep',
        body: [
          'The output is a complete product: box art, a build booklet, a priced parts list, and a shelf that keeps every set you have generated. Re-roll the render, re-tune the bricks, reopen any set.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/sagrada-box.webp', caption: 'Box art, generated per set.' },
          { type: 'image', src: 'projects/legoarch/sagrada-booklet.webp', caption: 'The build booklet.' },
          { type: 'image', src: 'projects/legoarch/shelf-3d.webp', caption: 'The shelf: every generated set, kept.' },
        ],
      },
    ],
  },
  {
    slug: 'breathing-mass',
    date: '2026-03-25',
    title: 'Breathing Mass',
    subtitle:
      'A hyperbuilding for Santiago conceived as a vertical lung: a tower that captures, cleans, and redistributes the city’s polluted air through a breathing core, resolved as a topology-optimized structure and a performance-driven facade.',
    year: '2026',
    module: 'BIMSC Studio · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Ramy Ayoub', 'Hani Karime'],
    tools: ['Rhino', 'Grasshopper', 'Alpaca', 'Speckle'],
    tag: 'GH',
    toolsShort: 'GH · ALPACA · SPECKLE',
    cover: 'projects/breathing-mass/cover.webm',
    category: 'BIM & Workflows',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/breathing-mass-hb01-structural-facade/',
    },
    intro: [
      'Breathing Mass is a vertical ecosystem in Santiago where architecture, wind, and energy converge. The Hyper Lung captures, cleans, and redistributes polluted air through a breathing core, turning the tower into living infrastructure that breathes with the city. Within a larger hyperbuilding studio, our team owned its structure and facade: translating the lung analogy into a self-braced skeleton and an adaptive skin, every form justified by data and published to the program and data teams through Speckle.',
    ],
    sections: [
      {
        heading: 'The alveolar spine: a lung analogy',
        body: [
          'The core of the building is defined by the Alveolar Spine. Taking inspiration from the human lung, we developed a porous structural core that mirrors the function of the bronchi: a spine that carries load and moves air at the same time. The concept is not decorative; it is the organising logic for both the structure and the way the tower breathes.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/lung-analogy.webp', caption: 'From bronchi to a porous structural core: the lung analogy driving the spine.' },
        ],
      },
      {
        heading: 'A self-braced skeleton',
        body: [
          'The structure rests on the core: each volume is plugged onto it, so load transfers from volume to core to foundation. Three cores form a triangle that turns vertical mass into a self-braced system. Using Alpaca we measured the stress at the points connecting the core to the volumes, ran a structural optimization to remove unnecessary material, and transformed the resulting voxels into a lattice: dense at high-load junctions, tapered where the loads fall away. The optimization cuts the primary structure from roughly 1,650 to 235 tonnes.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/structure.webp', caption: 'Self-braced structural system: load transfer from plugged volumes through the triangulated cores.' },
          { type: 'loop', src: 'projects/breathing-mass/topology.webm', caption: 'Topology optimization: the stressed column resolving into a load-following lattice.' },
        ],
      },
      {
        heading: 'Growing the volumes',
        body: [
          'The plugin masses are computationally grown along the lattice, their placement and density optimized by incident radiation for thermal regulation, wind pressure for airflow, and volumetric density. A data-driven deterministic engine measures each candidate volume across 232 branches and normalises it, so every form is justified by data before it is committed.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/volume-scatter.webp', caption: 'Volume scattering: candidate masses evaluated by radiation, wind, and density.' },
        ],
      },
      {
        heading: 'The breathing core: an environmental machine',
        body: [
          'The core is where the tower earns its name. A water-cascade system, electrostatic precipitation for air purification, and Climeworks-style capture pull CO₂ and particulates from ambient air, cleaning it before it is redistributed through the spine and stored back into the ground. The structure and the environmental system are one and the same object.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/breathing-core.webp', caption: 'The environmental machine: water cascade, electrostatic precipitation, and CO₂ capture.' },
        ],
      },
      {
        heading: 'Fixed vs. adaptive facade',
        body: [
          'The skin operates in two modes depending on the program behind it. A pattern derived from mashrabiya logic becomes a performative facade geometry: an adaptive, dynamic system where it needs to breathe and respond, and a fixed, collated system where it does not. Wind direction and radiation set the pattern; the same grammar reads as both a static and a moving skin.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/facade-pattern.webp', caption: 'From mashrabiya inspiration to a performative facade geometry.' },
          { type: 'image', src: 'projects/breathing-mass/adaptive-facade.webp', caption: 'One grammar, two modes: an adaptive dynamic skin and a fixed collated one.' },
        ],
      },
      {
        heading: 'The tower',
        body: [
          'Assembled, the system reads as a stack of plugged volumes around a breathing spine: a tower that behaves less like an object and more like a piece of the city’s respiratory infrastructure.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/cover.webp', caption: 'The Hyper Lung against the Andes.' },
          { type: 'image', src: 'projects/breathing-mass/renders.webp', caption: 'Plugged volumes around the breathing spine.' },
          { type: 'image', src: 'projects/breathing-mass/context.webp', caption: 'The tower against the Santiago skyline.' },
        ],
      },
    ],
  },
  {
    slug: 'huddle',
    date: '2025-12-22',
    title: 'The Huddle',
    subtitle:
      'A wind-adaptive research & education hub with expedition basecamp in Punta Arenas, Chile: discrete modules aggregated against a perpetually windy subpolar climate.',
    year: '2025/26',
    module: 'ACESD Studio · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'María Sánchez Domínguez', 'Lakzhmy Mari Zaro'],
    tools: ['Rhino', 'Grasshopper', 'Wasp', 'Kangaroo', 'Speckle'],
    tag: 'GH',
    toolsShort: 'GH · WASP · KANGAROO',
    cover: 'projects/huddle/persp-01.webp',
    category: 'Design & Research',
    award: 'IAAC Exhibition',
    links: {
      blog: 'https://blog.iaac.net/the-huddle-wind-adaptive-research-hub-in-punta-arenas-chile/',
    },
    intro: [
      'Punta Arenas sits at the southern tip of Chile in a cold, perpetually windy subpolar climate. The Huddle is a research and education hub with an expedition basecamp for 1,000 users, designed the way penguins survive the same latitudes: compact forms, packed close, shielding one another from the wind.',
    ],
    sections: [
      {
        heading: 'Endurance, not shelter',
        body: [
          'Punta Arenas sits on the Magellan Strait, and its position is its programme: a departure point for expeditions toward the nearby islands and the Antarctic south. The hub is a research laboratory tied to the local university.',
          'We compared two plots and took the harder one: open, windy, worked on by salt and moisture, but with a direct relationship to the sea. Climate analysis confirmed the severity, so the project begins by accepting wind as an omnipresent force rather than resisting it.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/axonometric.webp', caption: 'The hub on its seafront plot, the edge of Punta Arenas behind it.' },
          { type: 'image', src: 'projects/huddle/plots.webp', caption: 'The two plots we compared: an urban plot of 17,000 m² inside the city and a seafront plot of 20,000 m² on the strait.' },
          { type: 'image', src: 'projects/huddle/climate.webp', caption: 'Westerly wind speeds across the southern hemisphere, the monthly wind rose, and a year of dry-bulb temperature and relative humidity.' },
        ],
      },
      {
        heading: 'Learning from the kawi',
        body: [
          'The core typology comes from the kawis, the huts of the region’s native tribes, whose aerodynamic form is already adapted to extreme wind. We reinterpreted it as a modular system of 4×4×4 m units under a 16 m height limit, and the gaps the aggregation leaves become wind-protected courtyards and tunnels that accelerate the airflow.',
          'A topological map sorts a 50,000 m² programme into public, researcher-only and sensitive laboratory groups, with adjacency rules that keep the public accessible and the labs protected. The vertical cores are fixed; the dormitories, libraries and shared spaces scale with demand.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/kit-of-parts.webp', caption: 'The kit of parts across three levels: cross modules for general functions, reinforced cores for circulation, triangular connectors, and the 12 m theatre volume, coloured private, semi-private and public.' },
          { type: 'image', src: 'projects/huddle/module-rules.webp', caption: 'The rules the aggregation obeys: the semisphere reduced to a 4 m cube, the 16 m height limit, the wind-proof courtyards, and the wind tunnels the massing creates.' },
        ],
      },
      {
        heading: 'A workflow, not a shape',
        body: [
          'The definition runs as one chain. An adaptable program definition feeds two sequential Kangaroo solvers, the first placing the programme roughly through physics-based logic, the second refining it into precise subprogram locations. Wasp then aggregates the kit of parts under a rule layout grouped by part and access type.',
          'Because it is a system rather than an object, the part count is known at every moment: one iteration carries 23 private laboratory modules against 28 public ones. Whether the building holds 50 users or 1,000, the rules hold.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/workflow.webp', caption: 'The whole definition: program definition, two Kangaroo passes, the Wasp aggregation rule layout, skin generation, information extraction.' },
          { type: 'image', src: 'projects/huddle/aggregation.webp', caption: 'A Wasp run, from the precise subprogram gradient through the iterations to the part counts it reports back.' },
        ],
      },
      {
        heading: 'Program becomes massing',
        body: [
          'The layout is legible: public programme wraps around and shields the research and residential areas, and a single circulation spine connects everything. In section the building stays compact under the height limit, the skin acting as a buffer against the cold wind, and the courtyards it encloses are rare protected outdoor space here.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/section.webp', caption: 'The aggregation cut open, with two sections through it: public in yellow, semi-private in blue, private in red, connections in black.' },
          { type: 'image', src: 'projects/huddle/persp-02.webp', caption: 'Between the modules at ground level.' },
        ],
      },
      {
        heading: 'Timber, seismic forces, and a skin of three panels',
        body: [
          'The structure is grounded in local timber, which cuts the logistical and environmental footprint and ties the building back to the region’s vernacular. Shear walls and diagonal bracing take the lateral wind loads, and seismic isolators take the horizontal movement. Alpaca4D displacement maps confirmed stable behaviour at a mass of roughly 709 tons.',
          'The envelope is a kit of three ETFE panels. The Shield sits on windward faces and uses hoop-stress logic at 800 Pa to stop the membrane flapping; the Lens traps solar gain in argon-filled cushions; the Gill lets the mechanical zones breathe. A Global Index weights wind incidence, solar orientation and daylight need equally and picks the panel for each face, so the facade reads as a map of the climate on it.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/structure.webp', caption: 'Structure by part: the engineered-wood crosses, square modules and y-node, with the shear walls, the seismic isolators, and the three layers of the skin.' },
          { type: 'image', src: 'projects/huddle/panels.webp', caption: 'Three precedents synthesised into three panels: the Shield for windward pressure, the Lens for solar gain, the Gill for ventilation.' },
        ],
      },
      {
        heading: 'Wind becomes a resource',
        body: [
          'The aggregation opens wind tunnels between the modules, and those tunnels accelerate the flow. Vertical turbines stand in exactly those zones and harvest the site’s most abundant force. The thing the building was shaped to survive ends up powering it.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/persp-01.webp', caption: 'Turbines standing in the wind tunnels the aggregation opens between the modules.' },
        ],
      },
    ],
  },
  {
    slug: 'luminous-stratum',
    date: '2025-12-13',
    title: 'The Luminous Stratum',
    subtitle:
      'A “volume of sedimented light” inserted into Cairo’s historic fabric: an independent lattice that hovers within a market void, filtering the harsh sun without ever touching the historic walls.',
    year: '2025',
    module: 'Complex Forming · MaCAD, IAAC',
    team: ['Charles Abi Chahine'],
    tools: ['Rhino', 'Grasshopper', 'Kangaroo'],
    tag: 'GH',
    toolsShort: 'GH · KANGAROO',
    cover: 'projects/luminous-stratum/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/the-luminous-stratum/',
    },
    intro: [
      'In the dense historic fabric of Cairo, light is both a blessing and a burden. The Luminous Stratum proposes a new architectural language that negotiates this relationship: a “volume of sedimented light” that mimics the city’s stratification while filtering the harsh sun. Designed for the Complex Forming seminar, it is an independent system of stacked lamellas that hovers within the void of the Bab Al-Luk historic market, leaving the original structure untouched.',
    ],
    sections: [
      {
        heading: 'More than a roof',
        body: [
          'The system is deliberately independent: it revitalizes the market below without touching the historic walls. Voids are cut into the geometry precisely so the new form pulls away from its context, respecting the constraint of independence. It reads as a continuous volume that nests within the void: a porous buffer that protects the atrium without sealing it off.',
        ],
        media: [
          { type: 'image', src: 'projects/luminous-stratum/concept.webp', caption: 'A volume of sedimented light: an independent system layered above the untouched historic market.' },
          { type: 'image', src: 'projects/luminous-stratum/axo.webp', caption: 'The lattice hovering within the historic market hall.' },
        ],
      },
      {
        heading: 'Computational form-finding',
        body: [
          'The geometry is generated through Kangaroo physics. The process begins with a flat mesh; strategic voids are cut in to ensure the form pulls away from the historic context. Edge anchor points and specific ‘OnCurve’ goals define the footprint, then vertical load forces pull the mesh upward into a relaxed catenary vault. The most defining move comes next: mesh faces are sorted by their normal vectors, and that orientation dictates function.',
        ],
        media: [
          { type: 'loop', src: 'projects/luminous-stratum/form-finding.webm', caption: 'Step by step: flat mesh, strategic voids, form-finding goals, solver relaxation, face sorting.' },
          { type: 'image', src: 'projects/luminous-stratum/form-logic.webp', caption: 'The computational logic: anchor points, form-finding forces, and the sorting of mesh faces.' },
        ],
      },
      {
        heading: 'Geometry becomes function',
        body: [
          'Vertical faces become gradient frosted louvers that control sun glare; horizontal faces become structural lamellas that serve as shelving and walkable surfaces. The architectural elements all materialize simultaneously from the relaxed mesh: the form-finding is the generator, resolving the complex geometry into louvers, lamellas, and paths in one unified move. The system is modular, repeated along the market hall; for the last vault, different anchor points turn the workflow into a continuous staircase connecting the two levels.',
        ],
        media: [
          { type: 'image', src: 'projects/luminous-stratum/iterations.webp', caption: 'Iterating vertical loads and louver/lamella domains to balance shading against structure.' },
        ],
      },
      {
        heading: 'An occupiable lattice',
        body: [
          'Form-finding is rarely linear. I tested vertical loads from a shallow 15% to a steep 75%, and calibrated the domains for the frosted louvers and structural lamellas to tune porosity: the balance between sun shading and structural integrity. The selected iteration uses a 35% vertical load, giving the optimal vault height and spatial clearance for the functional layers below. The result is an occupiable lattice of filtered light that respects the past while embracing a computational future.',
        ],
        media: [
          { type: 'image', src: 'projects/luminous-stratum/section.webp', caption: 'Section: an independent system hovering within the void, holding its distance from the historic walls.' },
          { type: 'image', src: 'projects/luminous-stratum/interior.webp', caption: 'Sedimented light in the market below.' },
        ],
      },
    ],
  },
  {
    slug: 'facadeiq',
    date: '2026-03-22',
    title: 'FacadeIQ',
    subtitle:
      'An interactive tool that syncs facade design with live financial feasibility: linking geometry to real-time cost and efficiency so typologies can be prototyped against budget as they are drawn.',
    year: '2026',
    module: 'Cloud Data Management · MaCAD, IAAC',
    team: ['Charles Abi Chahine'],
    tools: ['Web app', 'Rhino Compute', 'Computational design', 'Data'],
    tag: 'WEB',
    toolsShort: 'WEB APP · DATA',
    cover: 'projects/facadeiq/cover.webp',
    category: 'Computation & AI',
    award: null,
    links: {
      github: 'https://github.com/iaac-macad/bimsc26-datamgmt-final-project/tree/FinalAssignment/CharlesAbiChahine',
      blog: 'https://blog.iaac.net/facadeiq-facade-feasibility-estimator/',
    },
    intro: [
      'FacadeIQ is an interactive computational tool that synchronizes facade design with real-time financial feasibility. By linking geometric parameters, building footprint, floor count, balcony depth, to live cost metrics, it gives immediate feedback on project value and efficiency ratios, letting designers prototype typologies while checking aesthetic ambition against budgetary thresholds.',
    ],
    sections: [
      {
        heading: 'Feasibility as a design layer',
        body: [
          'A facade is normally costed after it is designed, so the number arrives too late to change anything. FacadeIQ puts the two on one screen: geometry sliders on the left, the model in the middle, the feasibility dashboard on the right, everything recalculating on every move.',
          'The parameters are the ones a designer actually holds: building length and width, number of typical floors, balcony typology, glass opening, balcony depth. What comes back is unit count, total balcony area, a facade cost split into double-glazed units, galvanized steel panels and balcony concrete floors, and an efficiency ratio saying which market the design has landed in.',
        ],
        media: [
          { type: 'image', src: 'projects/facadeiq/webapp.webp', caption: 'The three panels: geometry on the left, the model in the middle, the feasibility dashboard on the right.' },
        ],
      },
      {
        heading: 'Step 01 · Clearing the canvas',
        body: [
          'The tool opens on a description and a step-by-step panel that walks you through the process. Once you are ready it collapses out of the way, which hands the whole canvas back to the geometry and leaves the projection and the display style free to change.',
        ],
        media: [
          { type: 'video', src: 'projects/facadeiq/interface.mp4', caption: 'Collapsing the guide panel, then switching the projection and the display style.' },
        ],
      },
      {
        heading: 'Step 02 · Geometry moves the numbers',
        body: [
          'Widening the footprint and adding floors shows the link working. Building width goes from 1 to 2 and the typical floor count from 16 to 21; the unit count goes from 48 to 126, the total balcony area from 984 to 2,624 m², and the building facade cost from $1.73M to $3.22M. The cost per apartment falls from $36,065 to $25,553 as the same envelope logic spreads over more units.',
        ],
        media: [
          { type: 'video', src: 'projects/facadeiq/parameters.mp4', caption: 'Widening the footprint and adding floors: 48 units become 126 and the facade cost rises to $3.22M.' },
        ],
      },
      {
        heading: 'Step 03 · Swapping the design language',
        body: [
          'The same building can be drawn in a different language. Switching from the double-panel to the single-panel balcony typology redraws the tower and redistributes the cost breakdown pie: the concrete floor share collapses as the balcony area drops from 2,624 to 1,312 m², the glazing and steel shares grow, and the efficiency ratio settles at 0.567.',
        ],
        media: [
          { type: 'video', src: 'projects/facadeiq/typology-swap.mp4', caption: 'Switching to the single-panel balcony: the cost breakdown redistributes and the ratio falls to 0.567.' },
        ],
      },
      {
        heading: 'Step 04 · The efficiency ratio, both ways',
        body: [
          'The efficiency ratio is the connection the tool is really built around, and it works in both directions. Pushing the balcony depth up carries the design across the 0.70 threshold to 0.743, into iconic and luxury territory. Pulling the glass opening back down does the reverse: the glazed area shrinks, the ratio drops to 0.577, and the design lands back under the 0.60 mark in standard residential.',
          'That is the point of putting the dashboard next to the sliders. The threshold stops being a verdict delivered at the end of the project and becomes something you can walk across and back in a few seconds, while the geometry is still an argument.',
        ],
        media: [
          { type: 'video', src: 'projects/facadeiq/balcony-depth.mp4', caption: 'Deepening the balconies pushes the efficiency ratio to 0.743, past the 0.70 luxury threshold.' },
          { type: 'video', src: 'projects/facadeiq/glass-opening.mp4', caption: 'Shrinking the glass opening pulls it back to 0.577, below the 0.60 standard-residential mark.' },
        ],
      },
    ],
  },
  {
    slug: 'narkomfin',
    date: '2026-06-25',
    title: 'Analyzing Narkomfin Through Its Graph',
    subtitle:
      'The Narkomfin Building rebuilt as a spatial graph: centrality and community detection recover Ginzburg’s vertical living cells from topology alone, and a GraphSAGE classifier reads room types the plan cannot show.',
    year: '2026',
    module: 'Graph Machine Learning · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'Lakzhmy Mari Zaro', 'María Sánchez Domínguez'],
    tools: ['Python', 'GraphSAGE', 'Graph ML'],
    tag: 'ML',
    toolsShort: 'PYTHON · GRAPH ML',
    cover: 'projects/narkomfin/cover.webp',
    category: 'Computation & AI',
    award: null,
    links: {
      github: 'https://github.com/charles-abichahine/G02-narkomfin-graph',
      blog: 'https://blog.iaac.net/analyzing-narkomfin-through-its-graph/',
    },
    intro: [
      'The Narkomfin Building (Moscow, 1930) is reconstructed as a spatial graph to analyse what floor plans cannot show. Grid sampling and stair stitching connect both apartment types into weighted networks; closeness and betweenness centrality expose the corridor as the building’s sole topological spine. Community detection recovers Ginzburg’s intended vertical living cells from topology alone, and a GraphSAGE room-type classifier scores 68% on the communal Type K layout: confirming the building deliberately breaks domestic spatial conventions.',
    ],
    sections: [
      {
        heading: 'From floor plan to graph',
        body: [
          'Fifty-four units over six floors, in two types: Type K, a two-storey duplex with a corridor on the bottom floor and eleven fragmented rooms above; Type F, a three-storey unit with the corridor in the middle and rooms below and above.',
          'We rebuilt both in Rhino and turned them into graphs by grid sampling: a regular grid on each floor, ray-cast against the boundary, edges between neighbours, a vertical edge at every stair landing. Of the spacings we tried the finest was too slow, so 0.5 became the working resolution.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/exploded.webp', caption: 'Both apartment types exploded by level. Type K is a two-storey duplex, Type F a three-storey unit for singles, and the corridor sits at a different height in each.' },
          { type: 'image', src: 'projects/narkomfin/graphs.webp', caption: 'Both types sampled on a 0.5-unit grid and stitched across floors at the stairs. Type K is asymmetric, one dense floor and one fragmented; Type F is symmetric, sparse-dense-sparse.' },
        ],
      },
      {
        heading: 'Closeness: the most accessible point',
        body: [
          'In Type K the hot band runs the L1 corridor, and the rooms above are uniformly cold, reachable only by walking to a stair and climbing, so the gradient runs one way. In Type F the peak sits on the middle floor and falls in both directions: a symmetric privacy gradient rather than a one-sided one.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/closeness-k.webp', caption: 'Type K. The hot band runs the length of the L1 corridor and accessibility falls off in one direction only, upward into the rooms.' },
          { type: 'image', src: 'projects/narkomfin/closeness-f.webp', caption: 'Type F. Closeness peaks on the middle floor and drops both downward and upward, a balanced privacy gradient rather than a one-way one.' },
        ],
      },
      {
        heading: 'Betweenness: where the traffic goes',
        body: [
          'Both types answer the same way: a sharp line along the corridor, the stair landings lit as the only way between floors, the room floors dark because they are endpoints rather than throughways. You can see a corridor on a plan; betweenness shows that every single path runs through it. The Type F corridor serves two floors of rooms instead of one, so blocking it cuts off twice as much.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/betweenness-k.webp', caption: 'Type K. A razor-sharp line along the corridor centreline: every cross-building path passes through one narrow band, and the stair landings are the chokepoints.' },
          { type: 'image', src: 'projects/narkomfin/betweenness-f.webp', caption: 'Type F. The same spine, carrying double the load. It serves rooms on two floors, so any L1 to L3 journey must cross it.' },
        ],
      },
      {
        heading: 'Crossing the building',
        body: [
          'Traced corner to corner, Type K makes an L: along the corridor, then one stair up. Type F makes a Z. In both, the straightened geometric path barely improves on the topological one, because the corridor is too narrow to optimise around.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/shortest-path.webp', caption: 'A corner-to-corner traversal: an L-shape in Type K, a Z-shape in Type F. The straightened path barely improves on the topological one, because the corridor is too narrow to optimise around.' },
        ],
      },
      {
        heading: 'A plan that is flat up close',
        body: [
          'Not every metric finds hierarchy. Degree centrality is almost uniform, and only the stair landings stand out. Clustering coefficient is zero everywhere, because a grid cannot form triangles: no ring corridors, no courtyards, no shortcuts. The flat results are still a finding, and what they say is that the building is legible only at the global scale.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/degree.webp', caption: 'Degree centrality is almost uniform, and only the stair cells stand out as outliers. The hierarchy of the building is invisible locally and only emerges at the scale of the whole graph.' },
        ],
      },
      {
        heading: 'Communities: Ginzburg’s living cells',
        body: [
          'Louvain groups cells more densely connected to each other than to the rest of the network, and it knows nothing about rooms or floors. In both types it slices the building into longitudinal bands perpendicular to the corridor, each a segment of corridor plus the rooms above it and, in Type F, below. So the real spatial units are not rooms and not floors but vertical slices: what Ginzburg called integrated living cells, recovered from topology alone.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/communities-k.webp', caption: 'Type K. Communities cut perpendicular to the corridor into longitudinal bands, each a corridor segment with the rooms above it. The building self-organises into vertical slices, not floors.' },
          { type: 'image', src: 'projects/narkomfin/communities-f.webp', caption: 'Type F. The same pattern across three floors: each community spans a corridor segment plus the rooms below and above, which is what Ginzburg designed the units to be.' },
        ],
      },
      {
        heading: 'Classifying room types from topology',
        body: [
          'We fed both types into a GraphSAGE-Pool model pretrained on Modified Swiss Dwellings, 5,372 Swiss floor plans; it sees only zone type and connectivity. Type F scored 91.3%, 210 of 230, sixteen of its twenty errors open kitchens read as corridors. Type K scored 67.9%, 55 of 81.',
          'The gap is the finding. Narkomfin was built as a dom-kommuna: kitchens minimal because residents were to eat in a shared canteen, living rooms doubling as social space. Familiar positions, unfamiliar functions, which a model trained on ordinary apartments cannot separate. The 68% is the building refusing the rules.',
        ],
        media: [
          { type: 'image', src: 'projects/narkomfin/classifier-k.webp', caption: 'GraphSAGE reaches 67.9% on Type K, 55 of 81 rooms. The errors cluster where connectivity is near-identical: living rooms read as kitchens, stairs as storerooms.' },
          { type: 'image', src: 'projects/narkomfin/classifier-f.webp', caption: '91.3% on Type F, 210 of 230. Sixteen of the twenty errors are kitchens predicted as corridor, a single dominant blind spot.' },
        ],
      },
    ],
  },
  {
    slug: 'integrative-modeling',
    date: '2026-03-17',
    title: 'Hyperbuilding 01 · Integrative Modeling',
    subtitle:
      'A data-driven parametric skyscraper complex inspired by the lung: three towers shaped by a deterministic Grasshopper script, with a lattice core, plug-in volumes, and an adaptive facade of 67,218 panels, documented through Speckle and Revit.',
    year: '2026',
    module: 'Integrative Modeling · MaCAD, IAAC',
    team: ['Ramy Ayoub', 'Charles Abi Chahine', 'Hani Karime'],
    tools: ['Grasshopper', 'Rhino.Inside', 'Speckle', 'Revit'],
    tag: 'BIM',
    toolsShort: 'GH · SPECKLE · REVIT',
    cover: 'projects/integrative-modeling/cover.webp',
    category: 'BIM & Workflows',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/integrative-modeling-hb01-structure-facade/',
    },
    intro: [
      'Hyperbuilding 01 is a data-driven parametric skyscraper complex inspired by the lung’s bronchiole system. Three towers, 600m, 500m, and 400m, are shaped by a deterministic Grasshopper script that balances program requirements against environmental pressures. The complex features a performance-optimized lattice core, modular plug-in volumes, and an adaptive facade of 67,218 panels, fixed or climate-responsive, all documented and published through Speckle and Revit.',
    ],
    sections: [
      {
        heading: 'The alveolar spine',
        body: [
          'The core of Hyperbuilding 01 is the Alveolar Spine, a porous structural core that borrows its function from the bronchi: bronchioles, then a porous core, then program plugged into it, then air moving through all of it.',
          'Behind it is a deterministic engine rather than a shape: program requirements set the spaces and base masses, environmental pressures decide where the facade opens, closes or thickens, and the script negotiates between them. What comes out is published to Speckle with its data embedded, for the program and data teams.',
        ],
        media: [
          { type: 'image', src: 'projects/integrative-modeling/lung-analogy.webp', caption: 'Four steps from the bronchioles to the building: biological inspiration, porous structural core, program massing, airflow system.' },
          { type: 'image', src: 'projects/integrative-modeling/deterministic-engine.webp', caption: 'The script as negotiator between program requirements and environmental pressures, publishing to Speckle for the program and data teams.' },
        ],
      },
      {
        heading: 'Defining the volume',
        body: [
          'Constraints and variables are kept apart, the building and its electrostatic precipitator on one side and the environment on the other. It builds in three steps: the skeleton of three towers at 600, 500 and 400 m with a podium and a bridge, then framing and plug-in volumes, then the facade.',
          'The core is not drawn either. Alpaca reads the stress where the core meets the volumes, the script strips material that is doing nothing, and the surviving voxels become the lattice.',
        ],
        media: [
          { type: 'image', src: 'projects/integrative-modeling/parametric-engine.webp', caption: 'Constraints on the left: core dimensions, vertical stages, plate voltages and spacing, against inlet PM2.5 and PM10, air flow, temperature, humidity and wind; on the right, the skeleton at 600, 500 and 400 m.' },
          { type: 'image', src: 'projects/integrative-modeling/performance-approach.webp', caption: 'The Alpaca loop: stress read at the points connecting core to volumes, then the surviving voxels turned into a lattice.' },
        ],
      },
      {
        heading: 'Bridging Grasshopper and Revit',
        body: [
          'The HB01 script carries the geometry into Revit as real families, not dumb solids: plug-in volumes as masses with levels and a tower parameter, the core as structural framing, the facade as adaptive components carrying panel type and panel ID. Filters and view filters turn that into documentation, out to an RVT model and PDF sheets synchronised with the script.',
        ],
        media: [
          { type: 'image', src: 'projects/integrative-modeling/revit-workflow.webp', caption: 'The HB01 script writing into Revit: levels, direct shapes, floors, structural beams, adaptive components, then filters and sheets.' },
          { type: 'image', src: 'projects/integrative-modeling/axonometric.webp', caption: 'The axonometric in site, and the same tower pulled apart into mass, facade panels, floors and structural framing.' },
        ],
      },
      {
        heading: 'One geometry, two facade logics',
        body: [
          'The facade is one panel geometry running two logics. The fixed version is static but calibrated, for residential floors, offices, hotels and mixed use. The adaptive version moves, where the interior function is climate-responsive: urban farming and the productive programs. Both share four parameters: fillet radius, frame thickness, panel opening, panel thickness.',
          'The schedule proves the two stayed one system: 57,408 fixed panels and 9,810 adaptive, 67,218 in total.',
        ],
        media: [
          { type: 'image', src: 'projects/integrative-modeling/facade-logics.webp', caption: 'One geometry, two logics: the fixed facade, the adaptive facade, and the four parameters both share.' },
          { type: 'image', src: 'projects/integrative-modeling/panel-schedule.webp', caption: 'The Revit panel schedule: 57,408 fixed panels and 9,810 adaptive, 67,218 in total.' },
          { type: 'image', src: 'projects/integrative-modeling/detail.webp', caption: 'The plug-in volumes at the facade, the lattice core visible behind the diamond panels.' },
          { type: 'image', src: 'projects/integrative-modeling/aerial-night.webp', caption: 'The three towers, the bridge and the podium at night, seen from above in the site model.' },
        ],
      },
    ],
  },
  {
    slug: 'collaborative-workflow',
    date: '2026-03-14',
    title: 'Hyperbuilding 01 · Collaborative Workflow',
    subtitle:
      'An automated Speckle pipeline that fires on every model push: traversing Grasshopper and Rhino geometry, extracting structured properties, and exporting to Excel and Google Sheets, so architectural analytics become repeatable instead of manual.',
    year: '2026',
    module: 'Collaborative Workflows · MaCAD, IAAC',
    team: ['Ramy Ayoub', 'Hani Karime', 'Charles Abi Chahine'],
    tools: ['Speckle Automate', 'Grasshopper', 'Python'],
    tag: 'BIM',
    toolsShort: 'SPECKLE · GH · PYTHON',
    cover: 'projects/collaborative-workflow/who-when.webp',
    category: 'BIM & Workflows',
    award: null,
    links: {
      github: 'https://github.com/ramyayoub-design/Data-S-F-HB1',
      blog: 'https://blog.iaac.net/collaborative-workflow-structure-facade-hb01/',
    },
    intro: [
      'The structure-and-facade team built an automated pipeline on Speckle Automate that triggers whenever a new model version is pushed. It traverses nested geometry collections from Grasshopper and Rhino, extracts structured properties, and exports formatted data to Excel and Google Sheets simultaneously: eliminating manual extraction from 3D models and making architectural analytics automatic, repeatable, and structured.',
    ],
    sections: [
      {
        heading: 'The cost of a manual export',
        body: [
          'Every model update meant manual extraction, reformatting and sharing across a multi-disciplinary team, which turned version control into a guessing game. Fifteen minutes per export times several pushes a day is hours of overhead a week; nobody could tell whether the numbers in the sheet were from today or two days ago; updates travelled by chat, easy to miss.',
          'The two parties are the structure/facade team and the data team, on the Hyperbuilding model in the mid-to-late design phase, when the model is live and decisions across disciplines depend on current data.',
        ],
        media: [
          { type: 'image', src: 'projects/collaborative-workflow/problem.webp', caption: 'The problem stated: manual extraction on every push, and one outdated file able to corrupt decisions across the team.' },
          { type: 'image', src: 'projects/collaborative-workflow/who-when.webp', caption: 'Who and when: the structure/facade and data teams, in the mid-to-late design phase, with the web app at the end of the chain.' },
        ],
      },
      {
        heading: 'One push',
        body: [
          'The pipeline runs on Speckle Automate and fires on the commit, the moment a new model version is pushed from Grasshopper and Rhino. It walks the nested geometry collections, extracts the structural, environmental and facade properties, and writes them out twice: openpyxl builds and formats the Excel file, gspread writes the same data into Google Sheets through the API, google-auth carries the service account. It needs an output format, a target sheet ID and a service-account JSON file, and emails the team links to the sheet and the model when the run finishes.',
        ],
        media: [
          { type: 'video', src: 'projects/collaborative-workflow/demo.mp4', caption: 'The automation end to end: the run triggered in Speckle Automate, the completion email, and the data landing in Google Sheets.' },
          { type: 'image', src: 'projects/collaborative-workflow/pipeline.webp', caption: 'The pipeline: a commit from Grasshopper and Rhino into the automation, then live sync out to Google Sheets and Excel.' },
        ],
      },
      {
        heading: 'What changed',
        body: [
          'Before, sharing updated data took 15 to 30 minutes and 7 to 15 manual steps per model, the team heard hours later if anyone remembered, and the risk of circulating the wrong version was high. After: a 1 minute 16 second run, no manual steps, instant notification, that risk eliminated. The data stopped living in local files, and the person modelling spends the time on design.',
        ],
        media: [
          { type: 'image', src: 'projects/collaborative-workflow/before-after.webp', caption: 'Before and after: 15–30 minutes down to a 1 min 16 s run, and 7–15 manual steps down to none.' },
        ],
      },
    ],
  },
  {
    slug: 'tsukiji',
    date: '2025-12-12',
    title: 'Revitalizing the Tsukiji Fish Market',
    subtitle:
      'An environmental analysis of a 19-hectare redevelopment on Tokyo’s former Tsukiji market: reading the city’s climate and the building’s behaviour with Ladybug, Infrared, and Galapagos to drive formal change.',
    year: '2025',
    module: 'Environmental Analysis · MaCAD, IAAC',
    team: ['María Sánchez Domínguez', 'Charles Abi Chahine', 'Emilie El Chidiac', 'Lakzhmy Mari Zaro'],
    tools: ['Ladybug', 'Galapagos', 'Grasshopper'],
    tag: 'ENV',
    toolsShort: 'LADYBUG · GALAPAGOS',
    cover: 'projects/tsukiji/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/revitalizing-the-tsukiji-fish-market-an-environmental-analysis-of-tokyo/',
    },
    intro: [
      'Environmental analysis was conducted on a 19-hectare redevelopment proposal for Tokyo’s former Tsukiji fish market, a site facing a dual climatic challenge of cold winters and hot, humid summers. Using Ladybug, Infrared, and Galapagos, both the city’s climate and the building’s environmental behaviour were evaluated; formal modifications addressed the initial issues, and the project closes by assessing the strengths and shortcomings of the design.',
    ],
    sections: [
      {
        heading: 'A 19-hectare plot in Chuo City',
        body: [
          'The site is the former Tsukiji fish market, 5 Chome Tsukiji, in a metropolitan area of fourteen million people. What is proposed on it is a multifunctional venue built around wellness, innovation, food, experience, activity and hospitality: 250 m across, 74 m tall, among towers that reach 180 m. The weather file comes from the nearest EPW hub, five kilometres away.',
        ],
        media: [
          { type: 'image', src: 'projects/tsukiji/site-location.webp', caption: 'The plot at 5 Chome Tsukiji, Chuo City, with the 1979 land-use map of southern Tokyo and the EPW station 5 km out.' },
          { type: 'image', src: 'projects/tsukiji/site-model.webp', caption: 'The brief and the Rhino site model: a 250 m venue at 74 m, ringed by towers reaching 180 m.' },
        ],
      },
      {
        heading: 'Tokyo’s climate is a dual battle',
        body: [
          'Tokyo is humid subtropical and the extremes sit at both ends of the year. The coldest stretch runs December to March and drops to 8°C; the hottest runs June to September and reaches 32°C with humidity above 85%.',
          'Wind maps a dominant north–south axis across the site, moderate, peaking in spring and autumn. The psychrometric chart points at one strategy above all others: passive solar heating, worth more annual comfort hours than any other measure. The site fights cold stress most of the year and heat and humidity stress in summer, and total comfort is rarely met.',
        ],
        media: [
          { type: 'image', src: 'projects/tsukiji/climate-analysis.webp', caption: 'Ladybug climate charts: down to 8°C from December to March, up to 32°C and past 85% humidity from June to September.' },
          { type: 'image', src: 'projects/tsukiji/wind-analysis.webp', caption: 'The wind rose: a dominant north–south axis, with moderate speeds peaking in spring and autumn.' },
          { type: 'image', src: 'projects/tsukiji/dual-battle.webp', caption: 'Hourly UTCI stress from Infrared.City, and the June and December comfort maps that make the dual battle visible.' },
        ],
      },
      {
        heading: 'Putting the proposal under the sun',
        body: [
          'The building itself goes under the same lenses. Incident radiation and direct sun hours, season by season: the roof takes 450 kWh/m² at its highest in spring and 310 at its lowest in winter, the façade 150 in winter down to 30 in summer. Sun hours split the same way, 1,172 on the roof in summer against 862 in winter. That sent us back to the roof, for energy and for cooling airflow.',
          'Daylight is evaluated separately for the two programs. The stadium is a single space under a curtain wall and an open roof: average daylight factor 11.24, top lighting on the 115 by 80 m field, and it works as it is. The offices are the problem. Four-metre floors with curtain-wall openings average 5.46, and the inner corners of every floor stay dark because each volume has one light source.',
        ],
        media: [
          { type: 'image', src: 'projects/tsukiji/radiation-sun-hours.webp', caption: 'Incident radiation and direct sun hours by season, with the roof peaking at 450 kWh/m² and 1,172 hours.' },
          { type: 'image', src: 'projects/tsukiji/daylight-stadium.webp', caption: 'The stadium as a single space: average daylight factor 11.24, with top lighting over the 115 by 80 m field.' },
          { type: 'image', src: 'projects/tsukiji/daylight-offices.webp', caption: 'The office volumes: average daylight factor 5.46, the inner corners of every floor left dark by a single light source.' },
        ],
      },
      {
        heading: 'Rotating the whole building',
        body: [
          'The last step is a validation loop: Infrared.City and Galapagos turning the massing through a full 360 degrees, shortlisting orientations by minimising high-velocity zones at 10 m/s while keeping airflow between 1.5 and 5 m/s. The site is well shielded, annual winds averaging 1.5 m/s, and the winning orientation is the one the proposal already had. Thermal comfort is good across 88% of the area, and bad in exactly the places the courtyards make.',
        ],
        media: [
          { type: 'image', src: 'projects/tsukiji/rotation-study.webp', caption: 'The full 360° rotation, wind speed above and thermal comfort below. Top 1 is the orientation the proposal already had.' },
          { type: 'image', src: 'projects/tsukiji/galapagos.webp', caption: 'Two Galapagos loops: culling the infrared mesh to plant trees where heat lingers, and rotating and scaling the original geometry.' },
        ],
      },
      {
        heading: 'Shape changes, not adjustments',
        body: [
          'We started from the hypothesis that minor modifications would be enough. They were not: the small changes barely moved the numbers. The exterior comfort results forced real shape revisions, so the towers around the stadium were rescaled and the zones where heat lingers were planted with trees.',
          'The news is not all bad: orientation, interior daylight and wind resistance all perform well without major intervention. The project closes on a render of the optimized design set beside the existing proposal.',
        ],
        media: [
          { type: 'image', src: 'projects/tsukiji/iterations.webp', caption: 'Five massing states: the initial shape, the radiation revision, the UTCI revision, and two daylight-comfort revisions.' },
          { type: 'image', src: 'projects/tsukiji/renders.webp', caption: 'Left, the existing Tsukiji development proposal. Right, an AI-generated render of the optimized design from the same viewpoint.' },
        ],
      },
    ],
  },
  {
    slug: 'clebsch-pavilion',
    date: '2025-12-18',
    title: 'The Clebsch Pavilion',
    subtitle:
      'A pavilion built on the Clebsch Diagonal Cubic: Crystallon lattices and Alpaca analysis, with evolutionary solvers minimizing mass and deflection across nine iterations, in glass-reinforced recycled PET.',
    year: '2025',
    module: 'Structural Optimization · MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Mahmoud Fathi'],
    tools: ['Crystallon', 'Alpaca', 'Grasshopper'],
    tag: 'GH',
    toolsShort: 'CRYSTALLON · ALPACA',
    cover: 'projects/clebsch-pavilion/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/the-clebsch-pavilion/',
    },
    intro: [
      'The Clebsch Pavilion explores the intersection of algebraic geometry and structural optimization. Centred on the Clebsch Diagonal Cubic, a surface known for its geometric stability, it uses Crystallon for lattice generation and Alpaca for structural analysis. Working in Glass Reinforced Recycled PET, the team ran evolutionary solvers to minimize mass and deflection across nine design iterations.',
    ],
    sections: [
      {
        heading: 'A surface chosen for its stability',
        body: [
          'The pavilion’s form is not drawn, it is solved. The Clebsch diagonal cubic is a cubic algebraic surface defined by x₀³ + x₁³ + x₂³ + x₃³ + x₄³ = 0 under the constraint x₀ + x₁ + x₂ + x₃ + x₄ = 0, and we picked it for the geometric stability that comes with it. To make it a building we deflated the geometry where the parts connect, then rotated and scaled it into a base domain of 8 by 8 m and 6 m high.',
        ],
        media: [
          { type: 'image', src: 'projects/clebsch-pavilion/concept.webp', caption: 'The Clebsch diagonal cubic and its equations, deflated at the part connections and scaled into an 8 by 8 m base domain.' },
          { type: 'image', src: 'projects/clebsch-pavilion/workflow.webp', caption: 'The definition in four stages: geometry, Crystallon lattice, Alpaca brick study, and the optimization loop.' },
        ],
      },
      {
        heading: 'From surface to lattice',
        body: [
          'The continuous surface is discretised into a high-resolution mesh, which becomes the boundary every structural layer is built inside. Crystallon fills that volume: the mesh is divided into twisted boxes that follow the curvature, an edge-octahedron cell is applied inside each box, and the cells are filled to make the webbing. Nothing about the lattice is drawn either; it inherits its direction from the surface it sits in.',
        ],
        media: [
          { type: 'image', src: 'projects/clebsch-pavilion/lattice.webp', caption: 'Surface to lattice in four steps: geometry definition, an offset mesh at 0.25, twisted boxes, and the filled lattice.' },
        ],
      },
      {
        heading: 'The structural model',
        body: [
          'The model goes into Alpaca on fixed supports, carrying its own gravity load and a lateral wind load of 0.08 kN/m². The material is glass-reinforced recycled PET: Young’s modulus 9,470,000 kN/m², density 1710 kg/m³, drawn as a circular beam 0.05 in diameter with a wall of 0.025.',
          'Millipede runs first, on a 0.005 m beam radius, and returns a stiffness distribution map: which parts of the lattice need to be thicker to carry the stress. That map is a guide for the Alpaca analysis rather than a result in itself.',
        ],
        media: [
          { type: 'image', src: 'projects/clebsch-pavilion/structural-model.webp', caption: 'The Alpaca model: glass-reinforced recycled PET, fixed supports, gravity, and a lateral wind load of 0.08 kN/m².' },
          { type: 'image', src: 'projects/clebsch-pavilion/stiffness-displacement.webp', caption: 'Millipede stiffness above and Alpaca displacement below, each beside its optimized result at a mass of 303 kg.' },
        ],
      },
      {
        heading: 'Nine iterations',
        body: [
          'Two things were tested. First the lattice module itself, holding beam radius and thickness constant and changing only the cell: 488 kg at a displacement of 0.611 m, then 334 kg at 0.627 m, then 303 kg at 0.599 m. The third module is lighter and stiffer at once, so it carries.',
          'Then the beams. An evolutionary run in Wallacei, fed by the stiffness map, searched beam radius and thickness against two fitness objectives at once: lowest mass and lowest displacement. The optimum comes out of the nine individuals of generation 9: 303 kg, 0.599 m of displacement, thickness graded from 0.0025 to 0.0035 m and diameter from 0.005 to 0.007 m, thicker exactly where the stiffness map said.',
        ],
        media: [
          { type: 'image', src: 'projects/clebsch-pavilion/lattice-modules.webp', caption: 'Three lattice modules at the same beam radius and thickness: 488 kg, 334 kg and 303 kg.' },
          { type: 'image', src: 'projects/clebsch-pavilion/optimum-solution.webp', caption: 'The optimum solution and the nine individuals of generation 9, scored on mass and displacement in Wallacei.' },
        ],
      },
      {
        heading: 'A vision of sustainable complexity',
        body: [
          'What comes out feels futuristic and is grounded in historical mathematics. Built in recycled PET reinforced with glass, the pavilion is an argument that complex optimized geometry and a sustainable material choice are not a trade-off.',
        ],
        media: [
          { type: 'image', src: 'projects/clebsch-pavilion/render2.webp', caption: 'The pavilion at eye level, the lattice reading as one continuous surface.' },
          { type: 'image', src: 'projects/clebsch-pavilion/renders.webp', caption: 'Aerial and close-up: the edge-octahedron webbing at the scale of a person.' },
        ],
      },
    ],
  },
  {
    slug: 'puffer-playscape',
    date: '2025-11-20',
    title: 'The Puffer Playscape',
    subtitle:
      'A Complex Forming study that develops a playscape from puffer-inspired geometry, iterated step by step into an inhabitable landscape.',
    year: '2025',
    module: 'Complex Forming · MaCAD, IAAC',
    team: ['Charles Abi Chahine'],
    tools: ['Rhino', 'Grasshopper'],
    tag: 'GH',
    toolsShort: 'RHINO · GH',
    cover: 'projects/puffer-playscape/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {},
    intro: [
      'The Puffer Playscape is a form-finding exercise from the Complex Forming seminar at IAAC. Taking its cue from the geometry of a pufferfish, it iterates a spiky, porous surface step by step into an inhabitable playscape.',
    ],
    sections: [
      {
        heading: 'Three stages of relaxation',
        body: [
          'Nothing here is modelled, it is relaxed. The definition is four groups, input geometry, forces, solvers and visualization, and the forces are all Kangaroo goals: pressure to inflate the meshes, edge lengths to hold them together, soft-body collision to keep them off each other, and a floor to stand them on. Two solvers, BouncySolver and StepSolver, run it at a damping of 0.975.',
          'The form arrives in three passes: the bodies inflate against the ground and each other; a mesh canopy is hung between the inner posts and pulled taut; then a second, wider canopy spreads to the outer posts.',
        ],
        media: [
          { type: 'image', src: 'projects/puffer-playscape/relax-01-inflate.webp', caption: 'Step 01, three frames: the bodies inflating against the floor plane and each other.' },
          { type: 'image', src: 'projects/puffer-playscape/relax-02-canopy.webp', caption: 'Step 02, three frames: the mesh canopy hung between the inner posts and relaxing taut.' },
          { type: 'image', src: 'projects/puffer-playscape/relax-03-outer-canopy.webp', caption: 'Step 03, three frames: a second canopy spreading out to the outer posts.' },
        ],
      },
      {
        heading: 'Two iterations',
        body: [
          'Two versions were kept. In the first the canopy sits low and the bodies push up through it, so mesh and inflated form read as one surface. In the second the posts are taller and the canopy is lifted clear, touching only the tallest body.',
        ],
        media: [
          { type: 'image', src: 'projects/puffer-playscape/iteration-01-axo.webp', caption: 'Iteration 01, axonometric: the canopy low, the bodies pushing up through it.' },
          { type: 'image', src: 'projects/puffer-playscape/iteration-02-axo.webp', caption: 'Iteration 02, axonometric: taller posts, the canopy lifted clear of the cluster.' },
        ],
      },
      {
        heading: 'In section',
        body: [
          'The sections show what the inflation leaves behind. The bodies are hollow and open at the sides and the top, and the drawings put people at every level: inside the shells, in the arches between them, on top, and lying on the mesh.',
        ],
        media: [
          { type: 'image', src: 'projects/puffer-playscape/section-01.webp', caption: 'Section 01: the two mesh layers over the cluster, with the hollow bodies cut open.' },
          { type: 'image', src: 'projects/puffer-playscape/section-02.webp', caption: 'Section 02: three bodies cut, the canopy carried on a central mast.' },
        ],
      },
    ],
  },
  {
    slug: 'wave-chair',
    date: '2025-11-15',
    title: 'The Wave Chair',
    subtitle:
      'A Complex Forming study that resolves an undulating surface into a fabricable, 3D-printed chair, developed through geometry iterations and print trials.',
    year: '2025',
    module: 'Complex Forming · MaCAD, IAAC',
    team: ['Charles Abi Chahine'],
    tools: ['Rhino', 'Grasshopper', 'Dendro'],
    tag: 'GH',
    toolsShort: 'RHINO · GH · DENDRO',
    cover: 'projects/wave-chair/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {},
    intro: [
      'The Wave Chair is a form-finding exercise from the Complex Forming seminar at IAAC, resolving an undulating surface into a fabricable object. The geometry was iterated and tested toward a 3D-printed chair.',
    ],
    sections: [
      {
        heading: 'The definition, step by step',
        body: [
          'The chair is one chain of operations and every step is a number. Arcs are drawn in the XY plane at distance 0.1, count 20, angles 20 to 180, radius 0.6, then rotated in the XZ plane by a sine graph at 0.5. Lofting them gives the surface; voxelating at 0.07 turns it into printable blocks.',
          'Voxel size decides everything downstream, and it was swept from 0.01 to 0.20: fine enough to read as a smooth shell at one end, coarse enough to sit on at the other. Dendro takes the voxels back to a mesh, slider 0.001 to 0.010.',
        ],
        media: [
          { type: 'image', src: 'projects/wave-chair/definition-steps.webp', caption: 'The four process steps, read across then down: arcs in the XY plane, rotation by the sine graph, the loft, and the voxelated result.' },
          { type: 'image', src: 'projects/wave-chair/voxel-size-sweep.webp', caption: 'Four frames from the voxel-size sweep, slider 0.01 to 0.20, finest first.' },
        ],
      },
      {
        heading: 'Four iterations',
        body: [
          'Four sets were run against a seated figure. Iteration 01 is the base case and comes out as an arch. Iteration 02 doubles the count to 40 and opens the angles to 270, spreading into a broad low platform. Iteration 03 pulls the angles to 120 and coarsens the voxel to 0.1, the most chair-like of the four, a stepped seat with a back. Iteration 04 changes distance, count and sine at once and the surface breaks into a long flat wave.',
        ],
        media: [
          { type: 'image', src: 'projects/wave-chair/iteration-01.webp', caption: 'Iteration 01: count 20, angles 20 to 180, sine 0.5, voxel 0.07.' },
          { type: 'image', src: 'projects/wave-chair/iteration-02.webp', caption: 'Iteration 02: count 40, angles 20 to 270, sine 2, voxel 0.07.' },
          { type: 'image', src: 'projects/wave-chair/iteration-03.webp', caption: 'Iteration 03: count 20, angles 20 to 120, sine 0.5, voxel 0.1.' },
          { type: 'image', src: 'projects/wave-chair/iteration-04.webp', caption: 'Iteration 04: distance 0.2, count 30, angles 20 to 180, sine 3, voxel 0.05.' },
        ],
      },
      {
        heading: 'Printing it',
        body: [
          'Then the fabrication test: a robot arm printing the voxelated chair, one cell given as a polyline through its numbered vertices, 2,1,6,5,3,7,6,2,3,1. Close up the result is a lattice of struts.',
        ],
        media: [
          { type: 'image', src: 'projects/wave-chair/print-trial.webp', caption: 'The print trial: a robot arm over the voxelated chair.' },
          { type: 'image', src: 'projects/wave-chair/print-lattice.webp', caption: 'Detail of the print trial: the cells resolved as a lattice of struts.' },
        ],
      },
    ],
  },
  {
    slug: 'cross-cap-house',
    date: '2025-11-10',
    title: 'The Cross-Cap House',
    subtitle:
      'A Complex Forming study developing an architecture on the cross-cap, a non-orientable, self-intersecting surface, through iterative geometry.',
    year: '2025',
    module: 'Complex Forming · MaCAD, IAAC',
    team: ['Charles Abi Chahine'],
    tools: ['Rhino', 'Grasshopper'],
    tag: 'GH',
    toolsShort: 'RHINO · GH',
    cover: 'projects/cross-cap-house/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {},
    intro: [
      'The Cross-Cap House is a form-finding exercise from the Complex Forming seminar at IAAC. It develops an architecture on the cross-cap, a non-orientable, self-intersecting surface, through iterative geometry and low-poly studies.',
    ],
    sections: [
      {
        heading: 'A surface from five parameters',
        body: [
          'The cross-cap is generated rather than drawn. A 50 by 50 grid of u and v values is pushed through three parametric equations and a surface is stretched through the point grid that comes back. Five inputs steer it: a scales it at 60, b and c set the repetitions in u and v, d stretches the x axis at 0.50, and e sets the twist frequency at 2.00.',
        ],
        media: [
          { type: 'image', src: 'projects/cross-cap-house/surface-points.webp', caption: 'The default surface at u_count and v_count 50, with the point grid it is stretched through.' },
          { type: 'image', src: 'projects/cross-cap-house/submission-board.webp', caption: 'The submission board: the equations, the default inputs, the three iterations, the reduced mesh and the layout.' },
        ],
      },
      {
        heading: 'Three iterations',
        body: [
          'Three sets were run against the defaults, one move at a time. Dropping b and c together to 0.75 opens the shell into a scroll. Taking d to 1.00 and easing the twist to 1.50 flattens it into a fin. Pulling c alone to 0.80 closes it into a near-sphere with a deep spiral mouth.',
        ],
        media: [
          { type: 'image', src: 'projects/cross-cap-house/iteration-01.webp', caption: 'Iteration 01: b 0.75, c 0.75, d 0.50, e 2.00.' },
          { type: 'image', src: 'projects/cross-cap-house/iteration-02.webp', caption: 'Iteration 02: b 1.00, c 1.00, d 1.00, e 1.50.' },
          { type: 'image', src: 'projects/cross-cap-house/iteration-03.webp', caption: 'Iteration 03: b 1.00, c 0.80, d 0.50, e 2.00.' },
        ],
      },
      {
        heading: 'Reducing it to a house',
        body: [
          'The surface the house is fitted into is reduced from b 0.75, c 1.00, d 0.50, e 2.00, the scroll, kept full. Reducing the mesh turns it into a handful of flat planes, and eight programs are stacked on floor plates inside them: entrance, living area, kitchen and stairway, then two bedrooms and two bathrooms.',
        ],
        media: [
          { type: 'image', src: 'projects/cross-cap-house/chosen-iteration.webp', caption: 'The chosen iteration, before the mesh is reduced.' },
          { type: 'image', src: 'projects/cross-cap-house/low-poly.webp', caption: 'The same surface reduced to flat planes.' },
          { type: 'image', src: 'projects/cross-cap-house/cover.webp', caption: 'The layout: the reduced shell above, the stacked floor plates inside its frame below.' },
        ],
      },
    ],
  },
  {
    slug: 'marception',
    date: '2024-05-12',
    title: 'Rings of Mars: Ring 4000',
    subtitle:
      'A habitat ring set into a crater rim in Valles Marineris, 3D-printed from the regolith it stands on: farming, transport and living in one closed loop. A two-person entry to Marsception, placed in the Top 50.',
    year: '2024',
    module: 'International Competition',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac'],
    tools: ['Rhino', 'SubD', 'AI workflows', 'V-Ray'],
    tag: 'COMP',
    toolsShort: 'COMPETITION',
    cover: 'projects/marception/cover.webp',
    category: 'Design & Research',
    award: 'Top 50 · Volume Zero',
    links: {},
    intro: [
      'How do you design a habitat for Mars? Marsception, run by Volume Zero, asked that in 2024, and our answer was a ring. Ring 4000 sits on the rugged rim of a crater inside Valles Marineris, a 3D-printed regolith shell holding farming, research, living and a transportation ring in one closed loop, with the long game that every crater gets its own ring until the rings make a community. It was an early bet that generative tools belonged on an architect’s desk, made when that still raised eyebrows.',
    ],
    sections: [
      {
        heading: 'A ring in a crater',
        body: [
          'Three concentric circles. The inner one is a controlled farm under a glass facade, visible from every room so the researchers far from home keep a piece of Earth’s green in view. The middle circle is transportation. The outer circle is living and working space, and on the lowest level five sleeping pods give the crew comfort and protection against the Martian environment. The shell is 3D-printed regolith on the outside, high-density polyethylene on the inside for an air-tight seal, and BIPV solar panels over the facade; the canyon walls of Valles Marineris do the rest of the radiation shielding.',
        ],
        media: [
          { type: 'image', src: 'projects/marception/render.webp', caption: 'Ring 4000 on its crater rim inside Valles Marineris.' },
        ],
      },
      {
        heading: 'Why a ring',
        body: [
          'The craters are the site Mars already gives you, so the ring takes their shape instead of fighting it. And a ring suits everything a habitat needs: the ecosystem closes on itself, water split by electrolysis into oxygen and hydrogen, plants turning the crew’s CO₂ into food, the carbon and water reacting back into HDPE for printing and fuel for back-up power and vehicles; the transport runs in a loop; and expansion is simply the next crater over, 4,000 km of canyon to grow along.',
        ],
        media: [],
      },
      {
        heading: 'How it was made',
        body: [
          'First the research: regolith melted into a paste and printed by drone robotics, and every surface shaped to stand at an angle that needs no support, because support structures are the thing nobody wants to print on Mars. Then the model, in Rhino with SubD, from the massing of the ring down to the sleeping pods. Then the part that was new at the time: feeding the geometry to generative image tools, when image generation was only just becoming a thing, to render concepts straight from the model, and finishing them in V-Ray.',
        ],
        media: [
          { type: 'image', src: 'projects/marception/board.webp', caption: 'The competition board: the ring exploded by level, the plan, the closed loops of water, oxygen, food, HDPE and fuel, the pods and the transportation ring, and the long section through the crater pit.' },
        ],
      },
      {
        heading: 'What came of it',
        body: [
          'Top 50 at Marsception, with both our names on the public results page. And our first proof that generative tools and architecture could share a desk: an early bet, and it aged well.',
        ],
        media: [],
      },
    ],
  },
  {
    slug: 'saria',
    // The SD1 set in the source folder is dated 2024-03-15; the CV puts the
    // SOMA role at Aug 23 to Jul 24.
    date: '2024-03-15',
    title: 'Saria, Dubai Maritime City',
    subtitle:
      'A residential tower on the water at Dubai Maritime City, 38 levels over a podium, taken from pre-concept to design development at SOMA: parametric facade iterations, then the BIM model for delivery.',
    year: '2024',
    module: 'SOMA · Design Architect',
    team: ['SOMA: office project'],
    tools: ['Rhino', 'Grasshopper', 'Revit'],
    tag: 'ARCH',
    toolsShort: 'PRACTICE',
    cover: 'projects/saria/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {},
    intro: [
      'Saria is a residential tower on the water at Dubai Maritime City, with the Dubai skyline behind it. I took it from pre-concept through to design development as a Design Architect at SOMA: parametric facade iterations in Rhino and Grasshopper, then the BIM model for delivery. The drawings here are from the concept design submission of March 2024, with SOMA as design architect.',
    ],
    sections: [
      {
        heading: 'A tower on the water',
        body: [
          'The plot sits at the edge of the Maritime City peninsula, so the tower is read from the water first: a slender square plan rising off a podium, with the skyline of Business Bay and the Burj behind it. Four levels of podium carry the parking under a landscaped deck; above it sit 38 levels, the roof at 167 m. The amenities are on the first level over the podium, a gym, a lounge and juice bar, an outdoor deck and a pool opening onto the planted terrace; the tower’s rhythm breaks once at level 20 and again at the top two floors, which have plans of their own.',
        ],
        media: [
          { type: 'image', src: 'projects/saria/waterfront.webp', caption: 'Saria from the water, the podium and tower in their context of neighbouring towers.' },
          { type: 'image', src: 'projects/saria/dusk-facade.webp', caption: 'The facade at dusk: stacked balconies with planters, the podium lit below.' },
          { type: 'image', src: 'projects/saria/massing-context.webp', caption: 'The massing in its context on the peninsula, seen from the water.' },
        ],
      },
      {
        heading: 'The facade',
        body: [
          'The facade is where the parametric work went. The balconies shift and step across the elevation rather than stacking in a straight line, and the pattern was iterated in Rhino and Grasshopper: how far each band projects, where the planters sit, how the rhythm breaks at level 20 and again at the crown. What survived the iterations went into the BIM model in Revit, which is what the set below is cut from.',
        ],
        media: [
          { type: 'image', src: 'projects/saria/elevation-north-west.webp', caption: 'North-west elevation: the podium, the stepping balcony bands, the break at level 20 and the crown, with the level datums from ground to the roof at 167.30 m.' },
          { type: 'image', src: 'projects/saria/section.webp', caption: 'Section through the tower and podium.' },
        ],
      },
      {
        heading: 'The podium and the ground',
        body: [
          'At street level the podium is wrapped in planting and opens under a deep canopy at the entrance; the landscape runs over the podium roof and down to the promenade, so the tower lands in a garden rather than on a car park. The ground floor takes the lobby and the drop-off, the podium levels the parking, and the deck above carries the pool and the outdoor amenity.',
        ],
        media: [
          { type: 'image', src: 'projects/saria/podium-street.webp', caption: 'The podium from the street: the entrance canopy, the planted setbacks and the tower rising behind.' },
          { type: 'image', src: 'projects/saria/podium-garden.webp', caption: 'The garden side of the podium, with the planted terraces stepping up to the amenity deck.' },
          { type: 'image', src: 'projects/saria/path.webp', caption: 'The shaded walk along the podium edge.' },
        ],
      },
      {
        heading: 'The drawings',
        body: [
          'The concept set: the master plan on its plot, the ground floor with the lobby and drop-off, the amenity level over the podium, and a typical residential floor, which runs from the 12th to the 34th with the core in the middle and the apartments around it.',
        ],
        media: [
          { type: 'image', src: 'projects/saria/master-plan.webp', caption: 'Master plan: the tower and podium on the plot, setbacks and the waterfront edge.' },
          { type: 'image', src: 'projects/saria/plan-ground.webp', caption: 'Ground floor: lobby, drop-off and back of house.' },
          { type: 'image', src: 'projects/saria/plan-level-01.webp', caption: 'Level 01, the amenity floor over the podium: gym, outdoor deck and pool.' },
          { type: 'image', src: 'projects/saria/plan-typical.webp', caption: 'Typical residential floor, levels 12 to 19 and 21 to 34: the core at the centre, apartments around it, balconies on all four sides.' },
        ],
      },
    ],
  },
  {
    slug: 'lau-anfeh',
    date: '2023-05-22',
    title: 'Point Nought',
    subtitle:
      'My bachelor final-year thesis at LAU: reimagining the coastal town of Anfeh in North Lebanon through its landscape of salt ponds, fishing, and olives.',
    year: '2023',
    module: 'B.Arch Final Year Project · LAU',
    team: ['Charles Abi Chahine'],
    tools: ['Architecture', 'Urban design'],
    tag: 'ARCH',
    toolsShort: 'ARCHITECTURE',
    cover: 'projects/lau-anfeh/cover.webp',
    category: 'Design & Research',
    award: null,
    links: {},
    intro: [
      'Point Nought is my final-year thesis at the Lebanese American University (Spring 2023), advised by Issam Barhouch and Omar Harb, and shown at the LAU final-projects exhibition. Anfeh has a lot to offer, salt ponds along the coast, agricultural land, a living fishing culture, and the thesis commemorates that long-living heritage: restoring the salinas not just to rebuild, but to build a narrative around a degrading tradition, and to give the town a base for the visitors who come to learn it.',
    ],
    sections: [
      {
        heading: 'The golden age, and after',
        body: [
          'Anfeh lives off three traditions: salt from the coastal salinas, fishing, and olive groves inland. Between 1950 and 2020 all three declined, salt from 25% of the town’s land use to 5%, fishing from 25% to 10%, olives from 50% to 35%, and the municipality’s Vision 2030 asks for the golden age back. The thesis is an answer to that call.',
        ],
        media: [
          { type: 'image', src: 'projects/lau-anfeh/vision.webp', caption: 'Anfeh’s land use in 1950 and 2020, salt 25% to 5%, fish 25% to 10%, olive 50% to 35%, and the Vision 2030 the thesis answers.' },
        ],
      },
      {
        heading: 'Point nought',
        body: [
          'The site is Plot C, 7,500 m² beside the salinas: close to the seaside road, on quiet streets, and carrying the salt-farm history the project is about. The name is the strategy: taking a step back to aleph null, point zero, to reacquaint Anfeh’s residents with their own history. On that ground sits an urban village of shopping, food, craft, culture and learning, with a public plaza extending the historic footpath through the site, bringing people in from all over the town and making breakout space for the young and the old.',
        ],
        media: [
          { type: 'image', src: 'projects/lau-anfeh/hero.webp', caption: 'Point Nought at dusk: the wind wheel over the restored ponds, bathers on the salt terraces.' },
          { type: 'image', src: 'projects/lau-anfeh/masterplan.webp', caption: 'The masterplan and its aerial: the village grid stepping down to the ponds along the extended footpath.' },
        ],
      },
      {
        heading: 'Salt, fish and olive',
        body: [
          'Three pavilions carry the three traditions. The Salt Pavilion sits directly on the working ponds, part exhibit and part salt store, with the ponds around it open to bathers. The Fish Pavilion is organised the way the catch moves, auction, washing, salting, packing, then the market and a restaurant, all under planted roofs. The Olive Pavilion steps its terraces through the grove.',
        ],
        media: [
          { type: 'image', src: 'projects/lau-anfeh/salt-fish-olive.webp', caption: 'Salt, fish and olive: the objectives for each tradition, and the tile grammar drawn from the salt-pond grid.' },
          { type: 'image', src: 'projects/lau-anfeh/salt-pavilion.webp', caption: 'The Salt Pavilion on the ponds; at left, the plan layered into groves, salinas, footpath and market.' },
          { type: 'image', src: 'projects/lau-anfeh/fish-pavilion.webp', caption: 'The Fish Pavilion, exploded: auction, washing, salting and packing below, market and restaurant above, planted roofs over all of it.' },
          { type: 'image', src: 'projects/lau-anfeh/olive-pavilion.webp', caption: 'The Olive Pavilion: the programme diagrammed and the terraces stepping through the grove.' },
        ],
      },
      {
        heading: 'Drawn and built',
        body: [
          'The set closes with the technical record and the models: the plan with its long sections through the windmill and the ponds, the wall section detailing the pavilion structure, and the physical models: the salt ponds cast in resin over cork, the town in white against the brown of its context, test casts in terracotta and in salt itself, and the salts of Anfeh bottled in a row.',
        ],
        media: [
          { type: 'image', src: 'projects/lau-anfeh/plans-sections.webp', caption: 'Plan and long sections: the windmill, the ponds and the bathing steps.' },
          { type: 'image', src: 'projects/lau-anfeh/sections-details.webp', caption: 'Long sections and the wall section, detailed through the pavilion structure.' },
          { type: 'image', src: 'projects/lau-anfeh/model.webp', caption: 'The models: resin and cork salt ponds, the white town on its brown coast, casts in terracotta and salt, and the salts bottled.' },
        ],
      },
    ],
  },
]

// Newest first, by exact submission date.
export const projects = _projects.slice().sort((a, b) => b.date.localeCompare(a.date))

export const getProject = (slug) => projects.find((p) => p.slug === slug)
