import { useMapStore } from '@/stores/mapStore.ts'
import type { TileStyle } from '@/stores/mapStore.ts'
import styles from './Map.module.css'

/** Static tile thumbnails — zoom 4, tile coords covering SE US (Atlanta area) */
const TILE_THUMBNAILS: Record<TileStyle, string> = {
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/4/6/4',
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/4/6/4',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/4',
  terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/4/6/4',
}

const TILE_OPTIONS: { id: TileStyle; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
]

export function TileStylePicker() {
  const { tileStyle, setTileStyle } = useMapStore()

  return (
    <div className={styles.tilePicker} role="radiogroup" aria-label="Map tile style">
      {TILE_OPTIONS.map((opt) => {
        const isSelected = tileStyle === opt.id
        return (
          <button
            key={opt.id}
            className={`${styles.tileOption} ${isSelected ? styles.tileOptionSelected : ''}`}
            onClick={() => setTileStyle(opt.id)}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${opt.label} map style`}
          >
            <img
              className={styles.tilePreview}
              src={TILE_THUMBNAILS[opt.id]}
              alt={`${opt.label} tile preview`}
              loading="lazy"
            />
            <span className={styles.tileLabel}>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
