import type { FAFRecord } from '@/types/index.ts'

interface FAFLoadResult {
  records: FAFRecord[]
  totalTonnage: number
  countyPairCount: number
  commodityTypes: string[]
}

/**
 * Simulated FAF freight data service.
 * Loads sample data from public/data/faf-sample.json with simulated progress.
 */
export async function loadFAFData(
  onProgress: (progress: number) => void
): Promise<FAFLoadResult> {
  const response = await fetch('/data/faf-sample.json')
  if (!response.ok) {
    throw new Error(`Failed to load FAF data: ${response.statusText}`)
  }

  const rawRecords: FAFRecord[] = await response.json()
  const totalSteps = rawRecords.length
  const loadedRecords: FAFRecord[] = []

  for (let i = 0; i < totalSteps; i++) {
    const record = rawRecords[i]
    if (
      record &&
      typeof record.originFips === 'string' &&
      typeof record.destFips === 'string' &&
      typeof record.annualTons === 'number'
    ) {
      loadedRecords.push(record)
    }

    const progress = Math.round(((i + 1) / totalSteps) * 100)
    onProgress(progress)

    // Simulate loading delay
    await delay(80)
  }

  const totalTonnage = loadedRecords.reduce(
    (sum, r) => sum + r.annualTons,
    0
  )
  const commodityTypes = [
    ...new Set(loadedRecords.map((r) => r.commodity)),
  ]

  return {
    records: loadedRecords,
    totalTonnage,
    countyPairCount: loadedRecords.length,
    commodityTypes,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
