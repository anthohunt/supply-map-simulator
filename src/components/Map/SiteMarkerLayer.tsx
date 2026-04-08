import { CircleMarker, Tooltip } from 'react-leaflet'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import type { SiteType } from '@/types/site.ts'

const SITE_COLORS: Record<SiteType, string> = {
  warehouse: '#F5A623',
  terminal: '#EF5350',
  distribution_center: '#1FBAD6',
  port: '#AB47BC',
  airport: '#66BB6A',
  rail_yard: '#FF7043',
}

const SITE_LABELS: Record<SiteType, string> = {
  warehouse: 'Warehouse',
  terminal: 'Terminal',
  distribution_center: 'Dist. Center',
  port: 'Port',
  airport: 'Airport',
  rail_yard: 'Rail Yard',
}

interface SiteMarkerLayerProps {
  hoveredSiteId?: string | null
}

export function SiteMarkerLayer({ hoveredSiteId }: SiteMarkerLayerProps) {
  const { infra } = usePipelineStore()

  if (infra.status !== 'complete' || infra.sites.length === 0) return null

  return (
    <>
      {infra.sites.map((site) => {
        const [lng, lat] = site.position
        const isHovered = hoveredSiteId === site.id
        return (
          <CircleMarker
            key={site.id}
            center={[lat, lng]}
            radius={isHovered ? 8 : 4}
            pathOptions={{
              color: isHovered ? '#ffffff' : SITE_COLORS[site.type] ?? '#1FBAD6',
              fillColor: SITE_COLORS[site.type] ?? '#1FBAD6',
              fillOpacity: isHovered ? 1 : 0.7,
              weight: isHovered ? 3 : 1,
            }}
          >
            <Tooltip>
              <strong>{site.name}</strong>
              <br />
              {SITE_LABELS[site.type]} — {site.sqft.toLocaleString()} sqft
            </Tooltip>
          </CircleMarker>
        )
      })}
    </>
  )
}
