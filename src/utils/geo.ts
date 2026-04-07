const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the Haversine distance between two [lng, lat] points in km.
 */
export function haversine(
  point1: [number, number],
  point2: [number, number]
): number {
  const [lng1, lat1] = point1
  const [lng2, lat2] = point2

  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Compute the bounding box [west, south, east, north] from an array of [lng, lat] coordinates.
 */
export function bboxFromCoordinates(
  coordinates: [number, number][]
): [number, number, number, number] {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const [lng, lat] of coordinates) {
    if (lng < west) west = lng
    if (lat < south) south = lat
    if (lng > east) east = lng
    if (lat > north) north = lat
  }

  return [west, south, east, north]
}

/**
 * Compute the centroid (average) of an array of [lng, lat] coordinates.
 */
export function centroid(
  coordinates: [number, number][]
): [number, number] {
  if (coordinates.length === 0) {
    return [0, 0]
  }

  let sumLng = 0
  let sumLat = 0

  for (const [lng, lat] of coordinates) {
    sumLng += lng
    sumLat += lat
  }

  return [sumLng / coordinates.length, sumLat / coordinates.length]
}
