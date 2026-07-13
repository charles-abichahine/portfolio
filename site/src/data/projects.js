const base = import.meta.env.BASE_URL
export const asset = (p) => base + p

export const projects = [
  {
    slug: 'sensi',
    title: 'Sensi',
    subtitle:
      'A sensory copilot for floor plans — it reads a plan and scores how each room will feel across six coupled senses, personalized to the person who will live in it.',
    year: '2026',
    module: 'AIA Studio — MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'Lakzhmy Mari Zaro', 'María Sánchez Domínguez'],
    tools: ['Python', 'LLM agents', 'Vision models', 'Web app'],
    tag: 'AI',
    toolsShort: 'PYTHON · SENSORY AI',
    cover: 'projects/sensi/cover.gif',
    category: 'Computation & AI',
    award: 'MaCAD Award 2026',
    links: {
      github: 'https://github.com/sclebow/AIA26_Studio/tree/main/team_02',
      blog: 'https://blog.iaac.net/sensi-making-comfort-a-design-layer/',
    },
    intro: [
      'In architecture we model everything — structure, cost, energy, code compliance. Layer after layer that makes a building accountable before it is built. Sensi adds the one layer we never formalized: how a space will actually feel. Not emotion — the full sensory experience of standing in a room, scored across six senses: thermal, visual, acoustic, spatial, olfactory, tactile. Not in the abstract, but for a specific person.',
    ],
    sections: [
      {
        heading: 'The sensory layer',
        body: [
          'Comfort research studies one sense at a time — thermal has its own models, acoustic its own standards. But we take a room in through all of them at once, and the senses are coupled: one moderates another. We call it the ripple. Add a bigger window and the daylight improves — but the same glass is a thinner sound barrier and leaks heat, and the noise that gets in can even diminish the daylight you gained. One design move, a chain of consequences.',
          'The room score is not an average. It is half mean, half worst — the worst sense carries the room, because that is the one you would actually feel. A kitchen that scores fine on everything except smell does not get to hide behind its other senses. The scoring is deterministic: fixed rules over a coupling matrix. The LLM routes intent and explains results; it never decides the score. No black box.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/sensi-demo.mp4', caption: 'Sensi, end to end: a plan goes in, a room-by-room comfort report comes out.' },
        ],
      },
      {
        heading: 'Act 1 · Onboard — who is this for',
        body: [
          'Comfort is not universal. The same plan read through two lenses tells two stories: a child who minds noise sees the loud living room light up; a grandmother who minds the cold sees the cold bedroom. So Sensi opens by learning who you are — a few questions, then a moodboard where each image you keep quietly tags the senses you lean toward. Your words become sense weights, the images nudge them, and it all compiles into a persona drawn as a petal rose.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/onboard.mp4', caption: 'Onboarding: from a few questions and a moodboard to a personal weighting of the six senses.' },
          { type: 'image', src: 'projects/sensi/onboarding.webp', caption: 'The persona, visualized as a petal rose — your comfort priorities, made explicit.' },
        ],
      },
      {
        heading: 'Act 2 · Shape — comfort you can edit',
        body: [
          'This is the heart of the system. You talk to it in plain language; a fast routing model classifies your intent in about 0.6 seconds — score a room, edit it, or explore the relationships. Ask a question and a heavier model reads the whole room and answers in words. Make an edit — change a material, add a window, place curtains, adjust ventilation — and the agent plans it, validates it against the plan, applies it, and re-scores, live. Every edit is kept as a checkpoint, so the plan improves honestly over time.',
          'Rooms are nodes, doors are edges: the kitchen’s noise and smell reaching the bedroom through the hallway makes comfort a zoning problem you can see. The galaxy view holds the whole project as one living map — rooms, senses, and the design levers behind them — so you can find the connection you did not know was there.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/shape.mp4', caption: 'Shaping: conversational edits that re-score the plan in real time.' },
          { type: 'image', src: 'projects/sensi/shape-01.webp', caption: 'Reading the plan into rooms, uses, and adjacencies.' },
          { type: 'image', src: 'projects/sensi/shape-02.webp', caption: 'Scores respond to every edit, the ripple propagating by fixed rules.' },
          { type: 'image', src: 'projects/sensi/shape-03.webp', caption: 'The galaxy view: rooms, senses, and levers as one connected system.' },
        ],
      },
      {
        heading: 'Act 3 · Report — closing the loop',
        body: [
          'The last act closes the loop. Your final scores write a prompt and a vision model renders each room, under an honest rule: only the extreme senses speak — a clearly good or bad sense writes a phrase, the comfortable middle stays quiet — so the render stays grounded in what actually changed. You compare it back to the moodboard from Act 1; input and output meet. We benchmarked the renders across providers: about $0.039 per room and 2.75× faster than the alternative we tested.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/report.mp4', caption: 'Generating the report: final scores become a grounded render of each room.' },
          { type: 'image', src: 'projects/sensi/report-01.webp', caption: 'The comfort report — the sensory layer, made legible.' },
          { type: 'image', src: 'projects/sensi/report-02.webp', caption: 'Room-by-room detail, ready for a design team to act on.' },
        ],
      },
    ],
  },
  {
    slug: 'urban-risk',
    title: 'Encoding Urban Risk',
    subtitle:
      'A machine-learning pipeline that classifies London street segments into low, medium, and high morphological-risk typologies from public spatial data alone — then tests whether the reading survives a move to another city.',
    year: '2026',
    module: 'Data Encoding — MaCAD, IAAC',
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
      'Can the physical layout of a street — measurable from public map data — predict how risky it feels? We framed it as a three-class problem: low, medium, or high risk, using seven spatial features drawn from OpenStreetMap and Mapillary per street segment. This is the full arc of the project — not just the results, but the wrong turn that made them honest.',
    ],
    sections: [
      {
        heading: 'Grounded in sixty years of theory',
        body: [
          'Every feature we chose traces back to established urban-safety theory. Jane Jacobs argued that active entrances create natural surveillance — “eyes on the street.” Oscar Newman showed that territorial clarity reduces the conditions for risk. Hillier and Hanson demonstrated through Space Syntax that network configuration shapes movement in predictable ways. Our unit of analysis is the segment — the stretch of street between two intersections — because risk clusters at that scale and a classified segment points a designer to a specific, addressable piece of street.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/theory.webp', caption: 'Seven features, each anchored in a lineage of urban-safety theory.' },
        ],
      },
      {
        heading: 'Hitting the wall',
        body: [
          'We first tried to predict crime directly — sourcing roughly 920,000 London incidents and regressing them against our spatial features across five boroughs. Three models — Linear Regression, Decision Tree, Random Forest — all returned R² under 0.064. The models failed to learn. Crime is driven by social and economic forces that street geometry alone cannot capture. We treated this as a finding, not a failure: spatial form is too weak for direct regression against crime, so we pivoted to a more honest goal — a spatial typology that serves as a proxy for perceived risk.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/the-wall.webp', caption: 'The wall: every model flat against the diagonal. Crime does not reduce to spatial features.' },
        ],
      },
      {
        heading: 'The pivot — a spatial typology',
        body: [
          'We rebuilt the pipeline into eight steps: fetch from OSM and Mapillary, place seven normalised features onto each segment, collapse them into a weighted risk score, use PCA and a Kohonen map as diagnostics, cut into three classes with K-Means, train a classifier, and deploy to other cities. Across 36,000 segments the score is roughly normal, centred near 0.35 — so rather than impose fixed cuts through the densest part, we let K-Means find the natural breakpoints. The split: 31% low, 47% medium, 22% high.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/pipeline.webp', caption: 'The eight-step pipeline: from OSM features to a deployable classifier.' },
          { type: 'image', src: 'projects/urban-risk/correlation.webp', caption: 'Redundancy check — the one strong correlation is visibility vs. enclosure at −0.75.' },
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
          'Logistic Regression hits 99% accuracy and Random Forest 95% — expected by construction, since the label was built from the same features the classifiers train on. Accuracy tells us the rule is clean and learnable, not that it is correct. The ablation study is more informative: transport proximity is the single most important feature, followed by connectivity and land use. Lighting contributes almost nothing — because Mapillary lighting is inconsistently mapped, and a feature that does not vary cannot discriminate.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/ablation.webp', caption: 'Ablation study: accuracy drop per feature removed. Transport leads; lighting barely registers.' },
        ],
      },
      {
        heading: 'London trained, world tested',
        body: [
          'With London as the training set, we applied the model to Barcelona’s Eixample and Trastevere in Rome. The Eixample comes out almost entirely high-risk — not because it is dangerous, but because its orthogonal grid, high enclosure, and high connectivity map onto London’s high-risk feature region. SHAP pinpoints the divergence: land use and visibility hit values the model has never seen, so it extrapolates into high-risk by default. Not an architecture flaw — a per-city normalisation and distribution-shift problem. English cities like Leeds and Birmingham, which share London’s morphological history, transfer far better; re-fitting the pipeline on Barcelona produces a contextually plausible spread of its own.',
        ],
        media: [
          { type: 'image', src: 'projects/urban-risk/cross-city.webp', caption: 'The same model on London, Barcelona, and Rome — the reading breaks where the morphology diverges.' },
          { type: 'image', src: 'projects/urban-risk/shap.webp', caption: 'SHAP: London’s high-risk drivers stay in-distribution; the Eixample’s do not.' },
        ],
      },
    ],
  },
  {
    slug: 'legoarch',
    title: 'lEgoarCh',
    subtitle:
      'From a one-sentence prompt to a priced, buildable LEGO set — generative AI proposes the form, deterministic computation proves it stands.',
    year: '2026',
    module: 'Generative AI Seminar — MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac'],
    tools: ['FLUX.2 + LoRA', 'TRELLIS-2', 'ComfyUI', 'Python'],
    tag: 'AI',
    toolsShort: 'FLUX · TRELLIS · PYTHON',
    cover: 'projects/legoarch/cover.gif',
    category: 'Computation & AI',
    award: null,
    links: {
      github: 'https://github.com/hi-em/genai-legoarch',
      blog: 'https://blog.iaac.net/legoarch-behind-the-sets/',
    },
    intro: [
      'You type a building, and a minute later a real LEGO set is sitting on a shelf: rendered, modelled, brick-built, priced, and catalog-legal. Most "AI makes LEGO" demos stop at a gorgeous render — but a render is a promise, not a product. lEgoarCh builds the downstream half: the machinery that forces the dream to obey real bricks, real colours, and real gravity.',
    ],
    sections: [
      {
        heading: 'One sentence, five moves',
        body: [
          'The pipeline runs text prompt → FLUX render → TRELLIS 3D mesh → voxelize → legolize → a priced, buildable set. The front half is generative and probabilistic — it invents the form. The back half is deterministic — it proves the form stands. The handoff in the middle is the entire idea.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/pipeline.svg', caption: 'The whole pipeline on one line: three probabilistic boxes, then three deterministic ones.' },
          { type: 'image', src: 'projects/legoarch/slide-experience.webp', caption: 'The five-move experience: visualize, materialize, legolize, pack, keep.' },
        ],
      },
      {
        heading: 'A LoRA that speaks LEGO',
        body: [
          'Base FLUX.2 does not speak fluent LEGO Architecture — ask for a LEGO building and you get something vaguely blocky. So we trained a LoRA on the visual grammar of real LEGO Architecture sets and swept its strength from 0 to 1.5: at 0 the render is a plain building, at 1.0 the studs and brick seams snap in. The LEGO-ness genuinely lives in the fine-tune, not in the words.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/slide-lora.webp', caption: 'Same prompt, same seed, only the LoRA strength changes. 1.0 wins.' },
          { type: 'image', src: 'projects/legoarch/generative-sagrada.webp', caption: 'FLUX.2 + the legoarch LoRA rendering the Sagrada Família as an official-set photo.' },
        ],
      },
      {
        heading: 'From one photo to a whole object',
        body: [
          'TRELLIS-2 takes the single render and completes the full 3D form — openly guessing the unseen back from everything it knows about how buildings behave. Then the deterministic half begins: the mesh is voxelized onto plate-height layers (bricks are not cubes, so the mesh is pre-stretched 2.5× vertically), and colours are sampled and exposure-matched back to the original render.',
        ],
        media: [
          { type: 'image', src: 'projects/legoarch/mesh-sagrada.webp', caption: 'The TRELLIS mesh: a couple hundred thousand triangles with a wrapped texture.' },
          { type: 'image', src: 'projects/legoarch/mesh-vs-lego.webp', caption: 'Smooth mesh versus legolized model.' },
        ],
      },
      {
        heading: 'The legolizer: where buildable gets earned',
        body: [
          'The computational centrepiece contains no AI at all. A split-and-merge solver covers each layer with the largest legal bricks that fit — full-height bricks first, then plates, then smooth tiles — with a slope pass that bevels staircases (to our knowledge the first open implementation of a method published in 2019) and a running-bond penalty that offsets seams the way a real bricklayer would.',
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
          'The output is a complete product: box art, a build booklet, a priced parts list, and a shelf that keeps every set you have generated — re-roll the render, re-tune the bricks, reopen any set.',
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
    title: 'Breathing Mass',
    subtitle:
      'A hyperbuilding for Santiago conceived as a vertical lung — a tower that captures, cleans, and redistributes the city’s polluted air through a breathing core, resolved as a topology-optimized structure and a performance-driven facade.',
    year: '2026',
    module: 'BIMSC Studio — MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Ramy Ayoub', 'Hani Karime'],
    tools: ['Rhino', 'Grasshopper', 'Alpaca', 'Speckle'],
    tag: 'GH',
    toolsShort: 'GH · ALPACA · SPECKLE',
    cover: 'projects/breathing-mass/cover.gif',
    category: 'BIM & Workflows',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/breathing-mass-hb01-structural-facade/',
    },
    intro: [
      'Breathing Mass is a vertical ecosystem in Santiago where architecture, wind, and energy converge. The Hyper Lung captures, cleans, and redistributes polluted air through a breathing core, turning the tower into living infrastructure that breathes with the city. Within a larger hyperbuilding studio, our team owned its structure and facade — translating the lung analogy into a self-braced skeleton and an adaptive skin, every form justified by data and published to the program and data teams through Speckle.',
    ],
    sections: [
      {
        heading: 'The alveolar spine — a lung analogy',
        body: [
          'The core of the building is defined by the Alveolar Spine. Taking inspiration from the human lung, we developed a porous structural core that mirrors the function of the bronchi — a spine that carries load and moves air at the same time. The concept is not decorative; it is the organising logic for both the structure and the way the tower breathes.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/lung-analogy.webp', caption: 'From bronchi to a porous structural core: the lung analogy driving the spine.' },
        ],
      },
      {
        heading: 'A self-braced skeleton',
        body: [
          'The structure rests on the core: each volume is plugged onto it, so load transfers from volume to core to foundation. Three cores form a triangle that turns vertical mass into a self-braced system. Using Alpaca we measured the stress at the points connecting the core to the volumes, ran a structural optimization to remove unnecessary material, and transformed the resulting voxels into a lattice — dense at high-load junctions, tapered where the loads fall away. The optimization cuts the primary structure from roughly 1,650 to 235 tonnes.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/structure.webp', caption: 'Self-braced structural system: load transfer from plugged volumes through the triangulated cores.' },
          { type: 'image', src: 'projects/breathing-mass/topology.gif', caption: 'Topology optimization: the stressed column resolving into a load-following lattice.' },
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
        heading: 'The breathing core — an environmental machine',
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
          'The skin operates in two modes depending on the program behind it. A pattern derived from mashrabiya logic becomes a performative facade geometry — an adaptive, dynamic system where it needs to breathe and respond, and a fixed, collated system where it does not. Wind direction and radiation set the pattern; the same grammar reads as both a static and a moving skin.',
        ],
        media: [
          { type: 'image', src: 'projects/breathing-mass/facade-pattern.webp', caption: 'From mashrabiya inspiration to a performative facade geometry.' },
          { type: 'image', src: 'projects/breathing-mass/adaptive-facade.webp', caption: 'One grammar, two modes: an adaptive dynamic skin and a fixed collated one.' },
        ],
      },
      {
        heading: 'The tower',
        body: [
          'Assembled, the system reads as a stack of plugged volumes around a breathing spine — a tower that behaves less like an object and more like a piece of the city’s respiratory infrastructure.',
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
    title: 'The Huddle',
    subtitle:
      'A wind-adaptive research & education hub with expedition basecamp in Punta Arenas, Chile — discrete modules aggregated against a perpetually windy subpolar climate.',
    year: '2025/26',
    module: 'ACESD Studio — MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'María Sánchez Domínguez', 'Lakzhmy Mari Zaro'],
    tools: ['Rhino', 'Grasshopper', 'Wasp', 'Kangaroo', 'Speckle'],
    tag: 'GH',
    toolsShort: 'GH · WASP · KANGAROO',
    cover: 'projects/huddle/persp-01.webp',
    category: 'Design & Research',
    award: null,
    links: {
      blog: 'https://blog.iaac.net/the-huddle-wind-adaptive-research-hub-in-punta-arenas-chile/',
    },
    intro: [
      'Punta Arenas sits at the southern tip of Chile in a cold, perpetually windy subpolar climate. The Huddle is a research and education hub with an expedition basecamp for 1,000 users, designed the way penguins survive the same latitudes: compact forms, packed close, shielding one another from the wind.',
    ],
    sections: [
      {
        heading: 'Wind as the design field',
        body: [
          'Wind analysis is the main field driving the aggregation: module placement, heights, and openings respond to the dominant winds rather than resisting them. Height is restricted and the scheme stays low-rise for structural behaviour, letting the massing deflect rather than fight the flow.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/wind01.webp', caption: 'Wind analysis over the aggregation.' },
          { type: 'image', src: 'projects/huddle/wind02.webp', caption: 'Flow around the massing.' },
          { type: 'image', src: 'projects/huddle/wind03.webp', caption: 'Iterating the aggregation against the wind field.' },
        ],
      },
      {
        heading: 'A kit of parts',
        body: [
          'The module’s form merges the logic of the semispheric kawis of the region’s native tribes — a compact, continuous shape that echoes both traditions while naturally optimizing wind flow and minimizing resistance. A topological map organizes the program for 1,000 users at 100 m² per user into private, semi-private, and public groups, and two Kangaroo workflows translate that conceptual map into real constraints and measures.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/axonometric-zoom.webp', caption: 'The kit of parts, aggregated.' },
        ],
      },
      {
        heading: 'The aggregation',
        body: [
          'Wasp aggregates the kit of parts under a rule layout grouped by part and space type, converging on a massing that huddles the program together — public space at the sheltered heart, expedition functions at the edge.',
        ],
        media: [
          { type: 'image', src: 'projects/huddle/axonometric.webp', caption: 'Aggregation axonometric.' },
          { type: 'image', src: 'projects/huddle/persp-01.webp', caption: 'The Huddle against the Patagonian horizon.' },
          { type: 'image', src: 'projects/huddle/persp-02.webp', caption: 'Between the modules.' },
        ],
      },
    ],
  },
  {
    slug: 'luminous-stratum',
    title: 'The Luminous Stratum',
    subtitle:
      'A “volume of sedimented light” inserted into Cairo’s historic fabric — an independent lattice that hovers within a market void, filtering the harsh sun without ever touching the historic walls.',
    year: '2025',
    module: 'Complex Forming — MaCAD, IAAC',
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
      'In the dense historic fabric of Cairo, light is both a blessing and a burden. The Luminous Stratum proposes a new architectural language that negotiates this relationship — a “volume of sedimented light” that mimics the city’s stratification while filtering the harsh sun. Designed for the Complex Forming seminar, it is an independent system of stacked lamellas that hovers within the void of the Bab Al-Luk historic market, leaving the original structure untouched.',
    ],
    sections: [
      {
        heading: 'More than a roof',
        body: [
          'The system is deliberately independent: it revitalizes the market below without touching the historic walls. Voids are cut into the geometry precisely so the new form pulls away from its context, respecting the constraint of independence. It reads as a continuous volume that nests within the void — a porous buffer that protects the atrium without sealing it off.',
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
          { type: 'image', src: 'projects/luminous-stratum/form-finding.gif', caption: 'Step by step: flat mesh, strategic voids, form-finding goals, solver relaxation, face sorting.' },
          { type: 'image', src: 'projects/luminous-stratum/form-logic.webp', caption: 'The computational logic: anchor points, form-finding forces, and the sorting of mesh faces.' },
        ],
      },
      {
        heading: 'Geometry becomes function',
        body: [
          'Vertical faces become gradient frosted louvers that control sun glare; horizontal faces become structural lamellas that serve as shelving and walkable surfaces. The architectural elements all materialize simultaneously from the relaxed mesh — the form-finding is the generator, resolving the complex geometry into louvers, lamellas, and paths in one unified move. The system is modular, repeated along the market hall; for the last vault, different anchor points turn the workflow into a continuous staircase connecting the two levels.',
        ],
        media: [
          { type: 'image', src: 'projects/luminous-stratum/iterations.webp', caption: 'Iterating vertical loads and louver/lamella domains to balance shading against structure.' },
        ],
      },
      {
        heading: 'An occupiable lattice',
        body: [
          'Form-finding is rarely linear. I tested vertical loads from a shallow 15% to a steep 75%, and calibrated the domains for the frosted louvers and structural lamellas to tune porosity — the balance between sun shading and structural integrity. The selected iteration uses a 35% vertical load, giving the optimal vault height and spatial clearance for the functional layers below. The result is an occupiable lattice of filtered light that respects the past while embracing a computational future.',
        ],
        media: [
          { type: 'image', src: 'projects/luminous-stratum/section.webp', caption: 'Section: an independent system hovering within the void, holding its distance from the historic walls.' },
          { type: 'image', src: 'projects/luminous-stratum/interior.webp', caption: 'Sedimented light in the market below.' },
        ],
      },
    ],
  },
]

export const getProject = (slug) => projects.find((p) => p.slug === slug)
