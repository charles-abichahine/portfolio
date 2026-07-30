/*
 * Splits a date so it can be set on two lines, returning [from, to, ongoing].
 *
 *   '2025–2026'  ->  ['2025', '2026', false]   a closed range
 *   '2023–'      ->  ['2023', '',     true ]   still running
 *   '2022'       ->  ['2022', '',     false]   a single year
 *
 * The dash comes off in every case, because once the years are stacked a red
 * rule drawn under the first says the same thing more quietly and without
 * spending width. That gives three readings from one mark: no rule is a single
 * year, a rule that lands on a second year is a closed range, and a rule that
 * runs on with nothing under it is ongoing.
 *
 * It lives here rather than in the page because both the page and the PDF
 * generator read this file, and a date that stacked one way on screen and
 * another in print would be exactly the kind of drift this file exists to stop.
 */
export const splitDates = (dates) => {
  const i = dates.indexOf('–')
  if (i === -1) return [dates, '', false]
  return [dates.slice(0, i), dates.slice(i + 1), i === dates.length - 1]
}

export const contact = {
  email: 'charles.abichahine@gmail.com',
  linkedin: 'https://www.linkedin.com/in/CharlesAbiChahine',
  github: 'https://github.com/charles-abichahine',
  /*
   * The site, last in the PDF's contact block and nowhere on the web, where the
   * reader is already here.
   *
   * It matters because of what the download is: one page that has been cut down
   * to four project names, sent on and printed. Without this a reader can reach
   * the inbox, the LinkedIn and the repositories but not the work itself, and
   * cutting detail from a CV is only a fair trade when the full version is one
   * line away. Stored as a full URL like the others; the generator strips the
   * protocol for print.
   */
  site: 'https://charlesabichahine.com',
}

// Sits under the name on both the page and the PDF. Shared rather than typed
// into each, which is how the PDF used to carry its own copy of it.
export const role = 'Architect · Computational Designer'

/*
 * The one line under the role. The landing, the CV page and the generated PDF
 * all read it from here, so there is a single sentence rather than one per
 * surface: the landing used to carry its own copy and the CV a different
 * sentence entirely, which meant the site said two things about him.
 *
 * Stored lowercase rather than lowercased in CSS, so every surface gets it the
 * same way without each one having to remember a text-transform.
 */
export const summary = 'design, computation, and the work of getting it built.'

/*
 * `work` turns a degree into evidence: the projects it actually produced, each
 * with the team size it was built at. Slugs link through to the case studies, so
 * the CV is a way into the work rather than a list that ends at itself. Team
 * sizes come from the team arrays in projects.js; no role is claimed beyond
 * them, because the data does not record one.
 */
export const education = [
  {
    dates: '2025–2026',
    school: 'IAAC, Barcelona',
    degree: 'Master in Advanced Computation for Architecture & Design (MaCAD)',
    /*
     * Two independent statements, which is what the full stop is doing: the
     * award belongs to Sensi, the methods belong to the degree as a whole. The
     * second half opens with a verb so its subject is plainly him over the year
     * rather than that one project.
     *
     * Every item is drawn from the tools recorded on the MaCAD projects:
     * generative geometry from lEgoarCh, machine learning from Encoding Urban
     * Risk, BIM automation from Hyperbuilding 01.
     */
    notes:
      'MaCAD 2026 Award for Sensi. Worked in generative geometry, machine learning, and BIM automation.',
    work: [
      {
        slug: 'sensi',
        name: 'Sensi',
        text: ' a copilot that reads a floor plan and scores how each room will feel across six coupled senses. Team of four.',
      },
      {
        slug: 'legoarch',
        name: 'lEgoarCh',
        text: ' a pipeline turning a generated image into a LEGO set proven buildable against the real parts catalogue.',
      },
      {
        slug: 'huddle',
        name: 'The Huddle',
        text: ' a wind-adaptive research hub and expedition basecamp in Punta Arenas, Chile. Team of four.',
      },
    ],
  },
  {
    dates: '2018–2023',
    school: 'Lebanese American University, Byblos',
    degree: 'Bachelor of Architecture (NASAD & NAAB accredited)',
    notes: 'Dean’s Distinction List, 3.7/4.0. Honor scholarship every consecutive term.',
    work: [
      {
        slug: 'lau-anfeh',
        name: 'Anfeh',
        text: ' final-year thesis: an urban re-imagination of a coastal town in North Lebanon, from its salt ponds, fishing and olive terraces.',
      },
    ],
  },
  {
    dates: '2022',
    school: 'Kent State University, Ohio',
    degree: 'Bachelor of Architecture, study abroad',
    notes: 'Dean’s Distinction List, 3.8/4.0.',
    work: [],
  },
]

export const experience = [
  {
    dates: 'Aug 24–',
    role: 'Design Technology Architect',
    firm: 'Dynamic Solution Co.',
    where: 'Kuwait',
    /*
     * Same four claims, written from scratch. The tool names and the brand
     * sectors are facts and stay; everything around them is different wording,
     * and "stage sets" comes back from the earlier draft of this entry rather
     * than from anywhere else. Each line is now under the ~112 characters that
     * fit the print measure, so none of them wrap.
     */
    points: [
      'Parametric geometry for exhibition stands and stage sets, driven in Rhino and Grasshopper.',
      'Own the generative AI workflow, from first prompt to the call on what actually ships.',
      'Build web and VR prototypes for clients, shaped around the visitor and detailed to come apart.',
      'Pitch concepts to sports, F&B and automotive brands. Team working across disciplines.',
    ],
  },
  {
    dates: 'Aug 23–Jul 24',
    role: 'Design Architect',
    firm: 'SOMA',
    where: 'Beirut / Dubai',
    /*
     * Both of these already ran to two lines with a single word on the second,
     * so the words added here cost no height: they fill a line that was being
     * paid for either way. The tools are named once, in the first bullet, rather
     * than repeated in both.
     */
    points: [
      'Took Saria at Dubai Maritime City from pre-concept to design development: parametric facade iterations in Rhino and Grasshopper, then the BIM model for delivery.',
      'Produced design studies and BIM models for Verve at City Walk, and massing through to masterplan documentation for District O and Enara at Business Bay.',
    ],
  },
  {
    dates: 'Jun 23–Aug 23',
    role: 'BIM Modeler',
    firm: 'BIM International',
    where: 'Beirut',
    points: [
      'Delivered a LOD 300 BIM model for the Norman’s Cay villas in the Bahamas, coordinating with structural engineers and interior designers. Modelled parametric families, furniture and shop drawings to specification.',
    ],
  },
  {
    dates: 'Jan 22–',
    role: 'Design Architect',
    firm: 'Self-employed',
    where: 'Hybrid',
    points: [
      'Rings of Mars: Ring 4000 for Marsception, Top 50 of the Volume Zero competition, with Emilie El Chidiac. AI-driven workflows, Rhino and V-Ray.',
    ],
  },
  {
    dates: 'Jun 22–Aug 22',
    role: 'Architectural Intern',
    firm: 'Jemma Chidiac Architects',
    where: 'Beirut',
    points: [
      'Took the Moujassam Watan competition entry in Khobar from concept to a fully visualised proposal.',
      'Wrote the shortlisted technical report for the Abdullatif Al Fozan Award for Mosque Architecture.',
    ],
  },
]

/*
 * Grouped by what someone can hand you, not by software category. BIM and
 * delivery is its own group on purpose: it is the thing that separates this CV
 * from the rest of the cohort's.
 */
export const skills = [
  /*
   * Every row here has to fit one line: the value column holds about 85
   * characters, and a row that wraps costs a full line of a page with 2mm of
   * headroom. Rhino Compute sits in this group rather than with the AI work
   * because it is Rhino geometry served headless, which is a computation tool
   * that happens to be reached over HTTP.
   */
  {
    group: 'Design & computation',
    items: ['Rhinoceros 3D', 'Grasshopper', 'Kangaroo', 'Wasp', 'Python', 'Rhino Compute'],
  },
  {
    group: 'BIM & delivery',
    items: ['Revit', 'Rhino.Inside', 'Speckle', 'Parametric families', 'Adaptive components'],
  },
  /*
   * Every item here was read out of the project repositories rather than
   * asserted: LangGraph from Sensi's requirements.txt, the ComfyUI FLUX
   * workflows from lEgoarCh, scikit-learn and XGBoost from Encoding Urban Risk.
   */
  {
    group: 'AI & data',
    items: ['LLM agents (LangGraph)', 'Generative pipelines (ComfyUI, FLUX)', 'scikit-learn, XGBoost'],
  },
  /*
   * The web stack, also from the repositories: React and Three.js in both the
   * Sensi and lEgoarCh frontends, FastAPI serving both backends, Docker on
   * Sensi. Vue and TypeScript are deliberately absent. They show up in the
   * studio repository's language stats, but that repository holds every team's
   * work and neither of his frontends has a tsconfig; both are plain JavaScript.
   */
  {
    group: 'Web & apps',
    items: ['React', 'Three.js', 'FastAPI', 'Docker'],
  },
  {
    group: 'Visualisation',
    items: ['V-Ray', 'D5 Render', 'Enscape', 'Adobe Suite'],
  },
]

export const languages = [
  { name: 'Arabic', level: 'Native' },
  { name: 'English', level: 'Advanced' },
  { name: 'French', level: 'Advanced' },
]

// Dated, so the record reads as a track rather than a pile.
export const awards = [
  /*
   * The award and the exhibition on separate rows. They were merged onto one
   * line when the page was 2mm from overflowing and that line was the price of
   * the web skills row; the header changes since have returned the space.
   *
   * Separate is the better reading anyway. The MaCAD Award is a prize and the
   * only one here; the exhibition is a selection. Sharing a row implied they
   * were the same kind of thing.
   *
   * lEgoarCh and The Huddle were not awarded anything. This used to claim a jury
   * award and a studio award for them, and the award fields on both projects
   * said the same until they were corrected.
   */
  { year: '2026', text: 'MaCAD 2026 Award for Sensi.' },
  { year: '2026', text: 'lEgoarCh and The Huddle selected for the IAAC exhibition.' },
  {
    year: '2025',
    text: 'IAAC Global Summer School, Circular Construction: Shifting Value, Barcelona.',
  },
  {
    year: '2024',
    text: 'Volume Zero Marsception, Top 50: Rings of Mars, Ring 4000, with Emilie El Chidiac.',
  },
]

/*
 * There is no certificates list. It held four short Parametric Architecture
 * courses, which next to a master's and the award it won read as filler rather
 * than as credentials: a reader who has just seen the degree learns nothing from
 * a weekend workshop on Revit. Recoverable from git history if it is ever wanted
 * back.
 */
