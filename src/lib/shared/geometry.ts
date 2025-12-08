/**
 * Given a bounding box and a point within it, finds a new bounding box
 * centered on the point that fits within the larger bounding box.
 *
 * @param outerBbox - The outer bounding box [minLon, minLat, maxLon, maxLat]
 * @param centerPoint - The center point [lon, lat]
 * @param width - The desired width of the new bbox (in same units as bbox)
 * @param height - The desired height of the new bbox (in same units as bbox)
 * @returns A new bbox [minLon, minLat, maxLon, maxLat] centered on the point
 */
export function findCenteredBbox(
  outerBbox: [number, number, number, number],
  centerPoint: [number, number],
  width: number,
  height: number
): [number, number, number, number] {
  const [outerMinLon, outerMinLat, outerMaxLon, outerMaxLat] = outerBbox
  const [centerLon, centerLat] = centerPoint

  // Calculate the half-width and half-height
  const halfWidth = width / 2
  const halfHeight = height / 2

  // Calculate initial bbox centered on the point
  let minLon = centerLon - halfWidth
  let maxLon = centerLon + halfWidth
  let minLat = centerLat - halfHeight
  let maxLat = centerLat + halfHeight

  // Adjust if the bbox extends beyond the outer bbox boundaries
  // For longitude
  if (minLon < outerMinLon) {
    const shift = outerMinLon - minLon
    minLon = outerMinLon
    maxLon = Math.min(maxLon + shift, outerMaxLon)
  } else if (maxLon > outerMaxLon) {
    const shift = maxLon - outerMaxLon
    maxLon = outerMaxLon
    minLon = Math.max(minLon - shift, outerMinLon)
  }

  // For latitude
  if (minLat < outerMinLat) {
    const shift = outerMinLat - minLat
    minLat = outerMinLat
    maxLat = Math.min(maxLat + shift, outerMaxLat)
  } else if (maxLat > outerMaxLat) {
    const shift = maxLat - outerMaxLat
    maxLat = outerMaxLat
    minLat = Math.max(minLat - shift, outerMinLat)
  }

  return [minLon, minLat, maxLon, maxLat]
}
