import { useMapStore } from '@/stores/mapStore.ts'
import type { TileStyle } from '@/stores/mapStore.ts'
import styles from './Map.module.css'

/** Static tile thumbnails — zoom 4, tile coords covering SE US (Atlanta area) */
const TILE_THUMBNAILS: Record<TileStyle, string> = {
  dark: 'https://a.basemaps.cartocdn.com/dark_all/4/4/6.png',
  light: 'https://a.basemaps.cartocdn.com/light_all/4/4/6.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/4/6/4',
  terrain: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/4/4/6.png',
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
