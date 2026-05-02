/**
 * GeoGuessr-style scoring: max 5000 at distance 0, approaches 0 at ~5000 blocks.
 * Formula: score = 5000 * e^(-distance / 1500)
 */
export function calculateScore(distanceInBlocks: number): number {
  const raw = 5000 * Math.exp(-distanceInBlocks / 1500)
  return Math.round(Math.max(0, Math.min(5000, raw)))
}
