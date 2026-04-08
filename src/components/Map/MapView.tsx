import { useRef, useState, useEffect } from 'react'
import { MapContainer, useMapEvents } from 'react-leaflet'
import { BoundaryLayer } from './BoundaryLayer.tsx'
import { TerritoryBoundaryLayer } from './TerritoryBoundaryLayer.tsx'
import { SiteMarkerLayer } from './SiteMarkerLayer.tsx'
import { HubMarkerLayer } from './HubMarkerLayer.tsx'
import { EdgeLayer } from './EdgeLayer.tsx'
import { InfrastructureLayer } from './InfrastructureLayer.tsx'
import { TileLayerSwitcher } from './TileLayerSwitcher.tsx'
import { TileStylePicker } from './TileStylePicker.tsx'
import { NetworkGenerationOverlay } from './NetworkGenerationOverlay.tsx'
import { ThreeDProjection } from './ThreeDProjection.tsx'
import { SplitMapView } from './SplitMapView.tsx'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useMapStore } from '@/stores/mapStore.ts'
import type { Map as LeafletMap } from 'leaflet'
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
  const leftMapRef = useRef<LeafletMap | null>(null)
  const { splitViewEnabled, setSplitViewEnabled, threeDEnabled, setThreeDEnabled } = useMapStore()
  const { networkStatus } = useNetworkStore()
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const showMapControls = networkStatus === 'complete'

  const mapContent = (
    <>
      <TileLayerSwitcher />
      <TerritoryBoundaryLayer />
      <BoundaryLayer />
      <SiteMarkerLayer hoveredSiteId={hoveredSiteId} />
      <InfrastructureLayer />
      <EdgeLayer />
      <HubMarkerLayer />
      <MapClickHandler />
      <ThreeDProjection />
    </>
  )

  if (splitViewEnabled) {
    return (
      <div
        className={isNarrow ? styles.splitContainerVertical : styles.splitContainer}
        role="region"
        aria-label="Interactive freight network map — split view"
      >
        <div className={styles.splitMapLeft}>
          <MapContainer
            center={US_CENTER}
            zoom={DEFAULT_ZOOM}
            className={styles.map}
            zoomControl={true}
            ref={leftMapRef}
          >
            {mapContent}
          </MapContainer>
          <TileStylePicker />
          <NetworkGenerationOverlay />
        </div>
        <SplitMapView
          leftMapRef={leftMapRef}
          center={US_CENTER}
          zoom={DEFAULT_ZOOM}
        />
        {showMapControls && (
          <>
            <button
              className={`${styles.splitToggle} ${splitViewEnabled ? styles.splitToggleActive : ''}`}
              onClick={() => setSplitViewEnabled(false)}
              aria-label="Disable split view"
            >
              Exit Split
            </button>
            <button
              className={`${styles.threeDToggle} ${threeDEnabled ? styles.threeDToggleActive : ''}`}
              onClick={() => setThreeDEnabled(!threeDEnabled)}
              aria-label={`${threeDEnabled ? 'Disable' : 'Enable'} 3D projection`}
            >
              {threeDEnabled ? '3D On' : '3D'}
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={styles.mapContainer} role="region" aria-label="Interactive freight network map">
      <MapContainer
        center={US_CENTER}
        zoom={DEFAULT_ZOOM}
        className={styles.map}
        zoomControl={true}
        ref={leftMapRef}
      >
        {mapContent}
      </MapContainer>
      <TileStylePicker />
      <NetworkGenerationOverlay />
      {showMapControls && (
        <>
          <button
            className={`${styles.splitToggle} ${splitViewEnabled ? styles.splitToggleActive : ''}`}
            onClick={() => setSplitViewEnabled(true)}
            aria-label="Enable split view"
          >
            Split View
          </button>
          <button
            className={`${styles.threeDToggle} ${threeDEnabled ? styles.threeDToggleActive : ''}`}
            onClick={() => setThreeDEnabled(!threeDEnabled)}
            aria-label={`${threeDEnabled ? 'Disable' : 'Enable'} 3D projection`}
          >
            {threeDEnabled ? '3D On' : '3D'}
          </button>
        </>
      )}
    </div>
  )
}
