export type SiteType = 'warehouse' | 'terminal' | 'distribution_center' | 'port' | 'airport' | 'rail_yard'

export interface CandidateSite {
  id: string
  name: string
  type: SiteType
  position: [number, number]
  sqft: number
  nearestHighwayKm: number
  nearestRailKm: number
  assignedHubId: string | null
}
