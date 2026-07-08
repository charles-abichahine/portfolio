const base = import.meta.env.BASE_URL
export const asset = (p) => base + p

export const projects = [
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
    cover: 'projects/legoarch/sagrada-render.webp',
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
    slug: 'sensi',
    title: 'Sensi',
    subtitle:
      'A comfort copilot — an app that reads a floor plan and reports on how the spaces inside will feel.',
    year: '2026',
    module: 'MaCAD, IAAC',
    team: ['MaCAD Group 02'],
    tools: ['Rhino', 'Web application'],
    tag: 'APP',
    toolsShort: 'APP · COMFORT',
    cover: 'projects/sensi/report-hero.webp',
    intro: [
      'In building design we already model a plan in layers — structure, cost, energy, code. Sensi adds the sensory layer: it reads a floor plan and tells you how the spaces will feel, producing a room-by-room comfort report before anything is built.',
    ],
    sections: [
      {
        heading: 'The demo',
        body: [
          'Forty-five seconds, end to end: a plan goes in, a comfort report comes out.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/sensi-demo.mp4', caption: 'Sensi, end to end.' },
        ],
      },
      {
        heading: 'Onboarding',
        body: [
          'Sensi meets you where the work starts: drop in a plan and describe the project.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/onboard.mp4', caption: 'Onboarding flow.' },
          { type: 'image', src: 'projects/sensi/onboarding.webp', caption: 'The first screen.' },
        ],
      },
      {
        heading: 'Shaping the plan',
        body: [
          'The plan is interpreted into rooms and uses that you can review and correct — the model’s reading of the drawing stays visible and editable throughout.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/shape.mp4', caption: 'Shaping: from drawing to structured rooms.' },
          { type: 'image', src: 'projects/sensi/shape-01.webp', caption: 'Reading the plan.' },
          { type: 'image', src: 'projects/sensi/shape-02.webp', caption: 'Rooms and uses, reviewable.' },
        ],
      },
      {
        heading: 'The comfort report',
        body: [
          'The output is a sensory report of the plan: how the spaces will feel, room by room, presented so a design team can act on it.',
        ],
        media: [
          { type: 'video', src: 'projects/sensi/report.mp4', caption: 'Generating the report.' },
          { type: 'image', src: 'projects/sensi/report-01.webp', caption: 'The comfort report.' },
          { type: 'image', src: 'projects/sensi/report-02.webp', caption: 'Room-by-room detail.' },
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
    module: 'Studio — MaCAD, IAAC',
    team: ['Charles Abi Chahine', 'Emilie El Chidiac', 'María Sánchez', 'Lakzhmy Zaro'],
    tools: ['Rhino', 'Grasshopper', 'Wasp', 'Kangaroo', 'Speckle'],
    tag: 'GH',
    toolsShort: 'GH · WASP · KANGAROO',
    cover: 'projects/huddle/persp-01.webp',
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
]

export const getProject = (slug) => projects.find((p) => p.slug === slug)
