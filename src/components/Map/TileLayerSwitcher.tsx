import { useState } from 'react'
import { TileLayer } from 'react-leaflet'
import { useMapStore } from '@/stores/mapStore.ts'
import type { TileStyle } from '@/stores/mapStore.ts'
import styles from './Map.module.css'

const TILE_CONFIGS: Record<TileStyle, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  terrain: {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://stamen.com/">Stamen Design</a>',
  },
}

export function TileLayerSwitcher() {
  const { tileStyle } = useMapStore()
  const config = TILE_CONFIGS[tileStyle]
  const [tilesLoading, setTilesLoading] = useState(false)

  return (
    <>
      <TileLayer
        key={tileStyle}
        url={config.url}
        attribution={config.attribution}
        eventHandlers={{
          loading: () => setTilesLoading(true),
          load: () => setTilesLoading(false),
        }}
      />
      {tilesLoading && (
        <div className={styles.tileLoadingIndicator} role="status" aria-label="Loading map tiles">
          <span className={styles.tileLoadingSpinner} />
          <span className={styles.tileLoadingText}>Loading tiles…</span>
        </div>
      )}
    </>
  )
}
