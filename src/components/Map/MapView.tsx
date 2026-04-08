import { MapContainer, TileLayer } from 'react-leaflet'
import { BoundaryLayer } from './BoundaryLayer.tsx'
import { TerritoryBoundaryLayer } from './TerritoryBoundaryLayer.tsx'
import { SiteMarkerLayer } from './SiteMarkerLayer.tsx'
import 'leaflet/dist/leaflet.css'
import '@/styles/map.css'
import styles from './Map.module.css'

const DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

const US_CENTER: [number, number] = [33.7, -84.4]
const DEFAULT_ZOOM = 5

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
        <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTRIBUTION} />
        <TerritoryBoundaryLayer />
        <BoundaryLayer />
        <SiteMarkerLayer hoveredSiteId={hoveredSiteId} />
      </MapContainer>
    </div>
  )
}
