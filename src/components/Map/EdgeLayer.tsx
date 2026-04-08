import { Polyline, Tooltip } from 'react-leaflet'
import { useNetworkStore } from '@/stores/networkStore.ts'
import type { Edge, HubTier } from '@/types/index.ts'
import { formatDistance } from '@/utils/format.ts'

const EDGE_TIER_TO_HUB_TIERS: Record<string, HubTier[]> = {
  'global-regional': ['global', 'regional'],
  'regional': ['regional'],
  'gateway-local': ['gateway', 'regional'],
  'access': ['access', 'local'],
}

function NetworkEdge({ edge, positions }: {
  edge: Edge
  positions: [[number, number], [number, number]]
}) {
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: edge.color,
        weight: 2,
        opacity: 0.6,
        dashArray: edge.tier === 'gateway-local' ? '6 4' : undefined,
      }}
    >
      <Tooltip sticky>
        <span>
          {edge.tier} — {formatDistance(edge.distanceKm)} ({edge.travelTimeHours.toFixed(1)}h)
        </span>
      </Tooltip>
    </Polyline>
  )
}

export function EdgeLayer() {
  const { hubs, edges, networkStatus, visibleTiers } = useNetworkStore()

  if (networkStatus !== 'complete') return null

  const hubMap = new Map(hubs.map((h) => [h.id, h]))

  // Filter edges: show edge only if at least one of its tier's hub types is visible
  const visibleEdges = edges.filter((edge) => {
    const hubTiers = EDGE_TIER_TO_HUB_TIERS[edge.tier]
    if (!hubTiers) return false
    return hubTiers.some((t) => visibleTiers.has(t))
  })

  return (
    <>
      {visibleEdges.map((edge) => {
        const source = hubMap.get(edge.sourceHubId)
        const target = hubMap.get(edge.targetHubId)
        if (!source || !target) return null

        const positions: [[number, number], [number, number]] = [
          [source.position[1], source.position[0]],
          [target.position[1], target.position[0]],
        ]

        return <NetworkEdge key={edge.id} edge={edge} positions={positions} />
      })}
    </>
  )
}
