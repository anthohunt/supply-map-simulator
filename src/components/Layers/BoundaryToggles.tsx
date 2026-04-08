import { useMapStore, type BoundaryLayerKey } from '@/stores/mapStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import styles from './Layers.module.css'

const BOUNDARY_LAYERS: { key: BoundaryLayerKey; label: string; color: string }[] = [
  { key: 'regions', label: 'Region Boundaries', color: '#F5A623' },
  { key: 'areas', label: 'Area Boundaries', color: '#1FBAD6' },
  { key: 'counties', label: 'County Boundaries', color: '#6A7485' },
]

export function BoundaryToggles() {
  const { boundaryLayers, toggleBoundaryLayer } = useMapStore()
  const { pixelizationStatus } = useNetworkStore()

  const pixelizationComplete = pixelizationStatus === 'complete'

  return (
    <div>
      <div className={styles.sectionTitle}>Boundaries</div>
      {BOUNDARY_LAYERS.map(({ key, label, color }) => {
        const isVisible = boundaryLayers[key]

        return (
          <button
            key={key}
            className={`${styles.tierToggle} ${!isVisible ? styles.tierToggleDisabled : ''}`}
            onClick={() => {
              if (pixelizationComplete) toggleBoundaryLayer(key)
            }}
            aria-label={`Toggle ${label} ${isVisible ? 'off' : 'on'}`}
            aria-pressed={isVisible}
            title={pixelizationComplete ? `Show/hide ${label}` : 'Run pixelization first'}
            disabled={!pixelizationComplete}
          >
            <div className={styles.colorDot} style={{ background: color }} />
            <span className={styles.tierLabel}>{label}</span>
            <span className={styles.checkMark}>{isVisible ? '\u2713' : ''}</span>
          </button>
        )
      })}
      {!pixelizationComplete && (
        <div className={styles.hint}>
          Run pixelization first to enable boundary overlays
        </div>
      )}
    </div>
  )
}
