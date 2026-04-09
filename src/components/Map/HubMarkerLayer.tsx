import { useCallback } from 'react'
import { CircleMarker, Tooltip, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useLayerState } from '@/hooks/useLayerState.ts'
import type { Hub, HubTier } from '@/types/index.ts'
import 'leaflet.markercluster/dist/MarkerCluster.css'

const TIER_COLORS: Record<HubTier, string> = {
  global: '#F5A623',
  regional: '#EF5350',
  gateway: '#1FBAD6',
  local: '#AB47BC',
  access: '#66BB6A',
}

const TIER_RADIUS: Record<HubTier, number> = {
  global: 10,
  regional: 8,
  gateway: 6,
  local: 5,
  access: 4,
}

function createClusterIcon(cluster: { getChildCount(): number }) {
  const count = cluster.getChildCount()
  const size = count < 10 ? 36 : count < 50 ? 44 : 52
  return L.divIcon({
    html: `<div style="
      background: rgba(27, 186, 214, 0.7);
      color: #fff;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${size < 40 ? 12 : 14}px;
      border: 2px solid rgba(27, 186, 214, 0.9);
      box-shadow: 0 0 8px rgba(27, 186, 214, 0.5);
    ">${count}</div>`,
    className: '',
    iconSize: L.point(size, size),
  })
}

function HubMarker({ hub, onSelect, opacity }: { hub: Hub; onSelect: (id: string) => void; opacity: number }) {
  const color = TIER_COLORS[hub.tier]
  const radius = TIER_RADIUS[hub.tier]

  const handleClick = useCallback(() => {
    onSelect(hub.id)
  }, [hub.id, onSelect])

  return (
    <CircleMarker
      center={[hub.position[1], hub.position[0]]}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.8 * opacity,
        weight: 2,
        opacity: opacity,
      }}
      bubblingMouseEvents={false}
      eventHandlers={{
        click: handleClick,
        mouseover: (e) => {
          const marker = e.target
          marker.setStyle({
            fillOpacity: 1,
            weight: 3,
          })
          marker.setRadius(radius + 3)
        },
        mouseout: (e) => {
          const marker = e.target
          marker.setStyle({
            fillOpacity: 0.8,
            weight: 2,
          })
          marker.setRadius(radius)
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        <span>{hub.name} ({hub.tier})</span>
      </Tooltip>
    </CircleMarker>
  )
}

export function HubMarkerLayer() {
  const { hubs, networkStatus, setSelectedHubId } = useNetworkStore()
  const { visibleTiers, hubOpacity } = useLayerState()
  const map = useMap()

  const opacity = hubOpacity / 100

  const handleSelect = useCallback((id: string) => {
    setSelectedHubId(id)
    const hub = hubs.find((h) => h.id === id)
    if (hub) {
      map.panTo([hub.position[1], hub.position[0]])
    }
  }, [hubs, setSelectedHubId, map])

  if (networkStatus !== 'complete') return null

  const visibleHubs = hubs.filter((h) => visibleTiers.has(h.tier) && h.position && h.position.length >= 2)

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      iconCreateFunction={createClusterIcon}
    >
      {visibleHubs.map((hub) => (
        <HubMarker key={hub.id} hub={hub} onSelect={handleSelect} opacity={opacity} />
      ))}
    </MarkerClusterGroup>
  )
}
