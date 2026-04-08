import { MapContainer, useMapEvents } from 'react-leaflet'
import { BoundaryLayer } from './BoundaryLayer.tsx'
import { TerritoryBoundaryLayer } from './TerritoryBoundaryLayer.tsx'
import { SiteMarkerLayer } from './SiteMarkerLayer.tsx'
import { HubMarkerLayer } from './HubMarkerLayer.tsx'
import { EdgeLayer } from './EdgeLayer.tsx'
import { TileLayerSwitcher } from './TileLayerSwitcher.tsx'
import { TileStylePicker } from './TileStylePicker.tsx'
import { NetworkGenerationOverlay } from './NetworkGenerationOverlay.tsx'
import { useNetworkStore } from '@/stores/networkStore.ts'
import 'leaflet/dist/leaflet.css'
import '@/styles/map.css'
import styles from './Map.module.css'

const US_CENTER: [number, number] = [33.7, -84.4]
const DEFAULT_ZOOM = 5

function MapClickHandler() {
  const { setSelectedHubId } = useNetworkStore()
  useMapEvents({
    click: () => setSelectedHubId(null),
  })
  return null
}

interface MapViewProps {
  hoveredSiteId?: string | null
}

export function MapView({ hoveredSiteId }: MapViewProps) {
  return (
    <div className={styles.mapContainer} role="region" aria-label="Interactive freight network map">
      <MapContainer
        center={US_CENTER}
        zoom={DEFAULT_ZOOM}
        className={styles.map}
        zoomControl={true}
      >
        <TileLayerSwitcher />
        <TerritoryBoundaryLayer />
        <BoundaryLayer />
        <SiteMarkerLayer hoveredSiteId={hoveredSiteId} />
        <EdgeLayer />
        <HubMarkerLayer />
        <MapClickHandler />
      </MapContainer>
      <TileStylePicker />
      <NetworkGenerationOverlay />
    </div>
  )
}
