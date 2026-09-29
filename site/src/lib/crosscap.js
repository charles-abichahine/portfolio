/*
 * The cross-cap surface, and the survey drawn on it.
 *
 * This is the shared mathematics behind two covers: the printed portfolio's
 * cover (scripts/portfolio-pdf.mjs) and the site's own cover (pages/Home.jsx).
 * The surface is The Cross-Cap House's, and these are its own equations, lifted
 * off the submission board that project prints rather than reinvented:
 *
 *   u = (i / (U - 1)) * b * PI          v = (j / (V - 1)) * c * PI
 *   x = d * a * sin(u) * sin(e * v)
 *   y = a * sin(e * u) * sin(v) ** 2
 *   z = a * cos(e * u) * sin(v) ** 2
 *
 * with the board's defaults a=60 b=1 c=1 d=0.5 e=2. Only the mathematics lives
 * here. What is design rather than data — which way the thing is turned, how far
 * in it is zoomed, where the frame sits, which points get their number — belongs
 * to each surface and stays with its caller: A4 landscape for the print, the
 * viewport for the screen. Sharing the maths is what keeps the two surfaces from
 * drifting apart; framing them differently is the point.
 *
 * Every point carries its index in the grid, the way a survey drawing numbers
 * its stations. That id is a real property of the drawing, not a decoration:
 * the numbers are what say this is a computed surface rather than a texture. It
 * also carries its u-row index, because the row is the order the site sweeps the
 * survey in as the visitor scrolls.
 */
export const CC = { U: 112, V: 46, a: 60, b: 1, c: 1, d: 0.5, e: 2 }

// The point cloud, U rows of V. Each point keeps `row` (its u index, 0..U-1, the
// sweep order) and `id` (its station number, the grid index a survey stamps on
// it) alongside the surface coordinates.
export function crossCap() {
  const pts = []
  for (let i = 0; i < CC.U; i++) {
    const u = (i / (CC.U - 1)) * CC.b * Math.PI
    for (let j = 0; j < CC.V; j++) {
      const v = (j / (CC.V - 1)) * CC.c * Math.PI
      const s2 = Math.sin(v) ** 2
      pts.push({
        row: i,
        id: i * CC.V + j,
        x: CC.d * CC.a * Math.sin(u) * Math.sin(CC.e * v),
        y: CC.a * Math.sin(CC.e * u) * s2,
        z: CC.a * Math.cos(CC.e * u) * s2,
      })
    }
  }
  return pts
}

// Orthographic projection: yaw about Z, then pitch about X, both in degrees. It
// returns a per-point mapper so the trig is resolved once and reused across the
// whole cloud. Fitting the result to a page or a viewport (zoom, anchor, trim)
// is design per surface and lives in the caller; this only rotates and flattens.
export function makeProjector(yawDeg, pitchDeg) {
  const yaw = (yawDeg * Math.PI) / 180
  const pitch = (pitchDeg * Math.PI) / 180
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)
  const cosP = Math.cos(pitch)
  const sinP = Math.sin(pitch)
  return (p) => {
    const x1 = p.x * cosY - p.y * sinY
    const y1 = p.x * sinY + p.y * cosY
    return { row: p.row, id: p.id, px: x1, py: y1 * cosP - p.z * sinP, depth: y1 * sinP + p.z * cosP }
  }
}
