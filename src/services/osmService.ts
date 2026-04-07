interface OSMLoadResult {
  interstateCount: number
  highwayCount: number
  railroadCount: number
  yardCount: number
  totalRoadKm: number
  totalRailKm: number
}

/**
 * Simulated OSM road/rail data service.
 * Generates realistic counts for SE USA territory.
 */
export async function loadOSMData(
  onRoadProgress: (progress: number) => void,
  onRailProgress: (progress: number) => void
): Promise<OSMLoadResult> {
  // Simulate road loading
  const roadSteps = 15
  for (let i = 0; i < roadSteps; i++) {
    await delay(120)
    onRoadProgress(Math.round(((i + 1) / roadSteps) * 100))
  }

  // Simulate rail loading
  const railSteps = 10
  for (let i = 0; i < railSteps; i++) {
    await delay(100)
    onRailProgress(Math.round(((i + 1) / railSteps) * 100))
  }

  return {
    interstateCount: 12,
    highwayCount: 47,
    railroadCount: 23,
    yardCount: 8,
    totalRoadKm: 14832,
    totalRailKm: 6241,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
