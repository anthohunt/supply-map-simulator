import { Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { useLayerState } from '@/hooks/useLayerState.ts'
import type { RoadSegment, RailSegment } from '@/services/osmService.ts'

const ROAD_COLORS: Record<RoadSegment['type'], string> = {
  interstate: '#F5A623',
  highway: '#E0E0E0',
  trunk: '#B0BEC5',
}

const ROAD_WEIGHTS: Record<RoadSegment['type'], number> = {
  interstate: 2.5,
  highway: 1.5,
  trunk: 1.5,
}

function RoadLine({ segment, opacity }: { segment: RoadSegment; opacity: number }) {
  const coords = (segment.geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng] as [number, number]
  )
  return (
    <Polyline
      positions={coords}
      pathOptions={{
        color: ROAD_COLORS[segment.type],
        weight: ROAD_WEIGHTS[segment.type],
        opacity: opacity * 0.7,
      }}
    >
      <Tooltip sticky>
        <span>{segment.ref || segment.type} — {segment.lengthKm.toFixed(1)} km</span>
      </Tooltip>
    </Polyline>
  )
}

function RailLine({ segment, opacity }: { segment: RailSegment; opacity: number }) {
  if (segment.geometry.type === 'Point') return null
  const coords = (segment.geometry.coordinates as [number, number][]).map(
    ([lng, lat]) => [lat, lng] as [number, number]
  )
  return (
    <Polyline
      positions={coords}
      pathOptions={{
        color: '#AB47BC',
        weight: 1.5,
        opacity: opacity * 0.6,
        dashArray: '4 4',
      }}
    >
      <Tooltip sticky>
        <span>Railroad{segment.operator ? ` — ${segment.operator}` : ''} — {segment.lengthKm.toFixed(1)} km</span>
      </Tooltip>
    </Polyline>
  )
}

function RailYardMarker({ segment, opacity }: { segment: RailSegment; opacity: number }) {
  if (segment.geometry.type !== 'Point') return null
  const [lng, lat] = segment.geometry.coordinates as [number, number]
  return (
    <CircleMarker
      center={[lat, lng]}
      radius={4}
      pathOptions={{
        color: '#AB47BC',
        fillColor: '#AB47BC',
        fillOpacity: opacity * 0.7,
        weight: 1,
        opacity: opacity * 0.8,
      }}
    >
      <Tooltip>
        <span>Rail Yard{segment.operator ? ` — ${segment.operator}` : ''}</span>
      </Tooltip>
    </CircleMarker>
  )
}

export function InfrastructureLayer() {
  const { osm, infra } = usePipelineStore()
  const { infraLayers, infraOpacity } = useLayerState()

  if (osm.status !== 'complete') return null

  const opacity = infraOpacity / 100

  const showHighways = infraLayers.highways
  const showRailroads = infraLayers.railroads
  const showPorts = infraLayers.ports
  const showAirports = infraLayers.airports

  const hasNoRail = osm.railSegments.length === 0
  const portSites = infra.status === 'complete' ? infra.sites.filter((s) => s.type === 'port') : []
  const airportSites = infra.status === 'complete' ? infra.sites.filter((s) => s.type === 'airport') : []

  return (
    <>
      {showHighways &&
        osm.roadSegments.map((seg) => (
          <RoadLine key={seg.id} segment={seg} opacity={opacity} />
        ))}

      {showRailroads && !hasNoRail &&
        osm.railSegments.map((seg) =>
          seg.geometry.type === 'Point' ? (
            <RailYardMarker key={seg.id} segment={seg} opacity={opacity} />
          ) : (
            <RailLine key={seg.id} segment={seg} opacity={opacity} />
          )
        )}

      {showPorts &&
        portSites.map((site) => {
          const [lng, lat] = site.position
          return (
            <CircleMarker
              key={site.id}
              center={[lat, lng]}
              radius={6}
              pathOptions={{
                color: '#1FBAD6',
                fillColor: '#1FBAD6',
                fillOpacity: opacity * 0.8,
                weight: 2,
                opacity: opacity,
              }}
            >
              <Tooltip>
                <span>{site.name} (Port)</span>
              </Tooltip>
            </CircleMarker>
          )
        })}

      {showAirports &&
        airportSites.map((site) => {
          const [lng, lat] = site.position
          return (
            <CircleMarker
              key={site.id}
              center={[lat, lng]}
              radius={6}
              pathOptions={{
                color: '#66BB6A',
                fillColor: '#66BB6A',
                fillOpacity: opacity * 0.8,
                weight: 2,
                opacity: opacity,
              }}
            >
              <Tooltip>
                <span>{site.name} (Airport)</span>
              </Tooltip>
            </CircleMarker>
          )
        })}
    </>
  )
}
