import type { CandidateSite, SiteType } from '@/types/index.ts'

interface InfraLoadResult {
  sites: CandidateSite[]
  warehouseCount: number
  terminalCount: number
  dcCount: number
  portCount: number
  airportCount: number
  railYardCount: number
}

const SIMULATED_SITES: CandidateSite[] = [
  { id: 'site-001', name: 'Atlanta Mega Distribution Center', type: 'distribution_center', position: [-84.39, 33.75], sqft: 450000, nearestHighwayKm: 0.3, nearestRailKm: 2.1, assignedHubId: null },
  { id: 'site-002', name: 'Savannah Port Terminal', type: 'port', position: [-81.10, 32.08], sqft: 820000, nearestHighwayKm: 1.2, nearestRailKm: 0.5, assignedHubId: null },
  { id: 'site-003', name: 'Jacksonville Warehouse Complex', type: 'warehouse', position: [-81.66, 30.33], sqft: 280000, nearestHighwayKm: 0.8, nearestRailKm: 3.4, assignedHubId: null },
  { id: 'site-004', name: 'Miami Cargo Terminal', type: 'terminal', position: [-80.29, 25.80], sqft: 360000, nearestHighwayKm: 0.5, nearestRailKm: 1.8, assignedHubId: null },
  { id: 'site-005', name: 'Charlotte Distribution Hub', type: 'distribution_center', position: [-80.84, 35.23], sqft: 320000, nearestHighwayKm: 0.2, nearestRailKm: 1.5, assignedHubId: null },
  { id: 'site-006', name: 'Nashville Rail Yard', type: 'rail_yard', position: [-86.78, 36.16], sqft: 180000, nearestHighwayKm: 1.1, nearestRailKm: 0.1, assignedHubId: null },
  { id: 'site-007', name: 'Birmingham Intermodal Terminal', type: 'terminal', position: [-86.80, 33.52], sqft: 240000, nearestHighwayKm: 0.6, nearestRailKm: 0.3, assignedHubId: null },
  { id: 'site-008', name: 'Orlando Airport Cargo', type: 'airport', position: [-81.31, 28.43], sqft: 150000, nearestHighwayKm: 0.4, nearestRailKm: 5.2, assignedHubId: null },
  { id: 'site-009', name: 'Memphis Warehouse District', type: 'warehouse', position: [-90.05, 35.15], sqft: 510000, nearestHighwayKm: 0.3, nearestRailKm: 0.8, assignedHubId: null },
  { id: 'site-010', name: 'New Orleans Port Authority', type: 'port', position: [-90.07, 29.95], sqft: 680000, nearestHighwayKm: 0.9, nearestRailKm: 0.4, assignedHubId: null },
  { id: 'site-011', name: 'Tampa Distribution Center', type: 'distribution_center', position: [-82.46, 27.95], sqft: 290000, nearestHighwayKm: 0.5, nearestRailKm: 2.3, assignedHubId: null },
  { id: 'site-012', name: 'Greenville Warehouse', type: 'warehouse', position: [-82.39, 34.85], sqft: 220000, nearestHighwayKm: 0.7, nearestRailKm: 1.9, assignedHubId: null },
  { id: 'site-013', name: 'Raleigh-Durham Airport Cargo', type: 'airport', position: [-78.79, 35.88], sqft: 120000, nearestHighwayKm: 0.3, nearestRailKm: 4.1, assignedHubId: null },
  { id: 'site-014', name: 'Charleston Port Facility', type: 'port', position: [-79.93, 32.78], sqft: 540000, nearestHighwayKm: 1.0, nearestRailKm: 0.6, assignedHubId: null },
  { id: 'site-015', name: 'Hattiesburg Rail Terminal', type: 'rail_yard', position: [-89.29, 31.33], sqft: 95000, nearestHighwayKm: 1.4, nearestRailKm: 0.2, assignedHubId: null },
]

/**
 * Simulated infrastructure sites service.
 */
export async function loadInfrastructureData(
  onProgress: (progress: number) => void
): Promise<InfraLoadResult> {
  const totalSteps = SIMULATED_SITES.length

  for (let i = 0; i < totalSteps; i++) {
    await delay(100)
    onProgress(Math.round(((i + 1) / totalSteps) * 100))
  }

  const countByType = (type: SiteType): number =>
    SIMULATED_SITES.filter((s) => s.type === type).length

  return {
    sites: SIMULATED_SITES,
    warehouseCount: countByType('warehouse'),
    terminalCount: countByType('terminal'),
    dcCount: countByType('distribution_center'),
    portCount: countByType('port'),
    airportCount: countByType('airport'),
    railYardCount: countByType('rail_yard'),
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
