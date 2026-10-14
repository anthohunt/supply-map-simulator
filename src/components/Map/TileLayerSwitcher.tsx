import { useState } from 'react'
import { TileLayer } from 'react-leaflet'
import { useMapStore } from '@/stores/mapStore.ts'
import type { TileStyle } from '@/stores/mapStore.ts'
import styles from './Map.module.css'

const TILE_CONFIGS: Record<TileStyle, { url: string; attribution: string }> = {
  dark: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
  },
  light: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  terrain: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
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
