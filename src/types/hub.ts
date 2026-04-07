export type HubTier = 'global' | 'regional' | 'gateway' | 'local' | 'access'

export interface Hub {
  id: string
  name: string
  tier: HubTier
  position: [number, number] // [lng, lat]
  regionId: string
  areaId: string
  throughputTons: number
  capacityTons: number
  candidateSiteIds: string[]
  connectedHubIds: string[]
  isFixed: boolean
}
