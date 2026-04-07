export type EdgeTier = 'global-regional' | 'regional' | 'gateway-local' | 'access'

export interface Edge {
  id: string
  sourceHubId: string
  targetHubId: string
  tier: EdgeTier
  distanceKm: number
  travelTimeHours: number
  capacityTons: number
  color: string
}
