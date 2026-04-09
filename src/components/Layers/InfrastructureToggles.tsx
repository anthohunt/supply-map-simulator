import { useMapStore, type InfraLayerKey } from '@/stores/mapStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import styles from './Layers.module.css'

const INFRA_LAYERS: { key: InfraLayerKey; label: string; color: string; emptyTooltip: string }[] = [
  { key: 'highways', label: 'Highways', color: '#F5A623', emptyTooltip: 'No highway data in this territory' },
  { key: 'railroads', label: 'Railroads', color: '#AB47BC', emptyTooltip: 'No rail data in this territory' },
  { key: 'ports', label: 'Ports', color: '#1FBAD6', emptyTooltip: 'No port data in this territory' },
  { key: 'airports', label: 'Airports', color: '#66BB6A', emptyTooltip: 'No airport data in this territory' },
]

export function InfrastructureToggles() {
  const { infraLayers, toggleInfraLayer } = useMapStore()
  const { osm, infra } = usePipelineStore()

  if (osm.status !== 'complete' && osm.status !== 'partial') return null

  const hasData: Record<InfraLayerKey, boolean> = {
    highways: osm.roadSegments.length > 0,
    railroads: osm.railSegments.length > 0,
    ports: infra.status === 'complete' && infra.sites.some((s) => s.type === 'port'),
    airports: infra.status === 'complete' && infra.sites.some((s) => s.type === 'airport'),
  }

  return (
    <div>
      <div className={styles.sectionTitle}>Infrastructure</div>
      {INFRA_LAYERS.map(({ key, label, color, emptyTooltip }) => {
        const isVisible = infraLayers[key]
        const isEmpty = !hasData[key]

        return (
          <button
            key={key}
            className={`${styles.tierToggle} ${!isVisible ? styles.tierToggleDisabled : ''}`}
            onClick={() => {
              if (!isEmpty) toggleInfraLayer(key)
            }}
            aria-label={`Toggle ${label} ${isVisible ? 'off' : 'on'}`}
            aria-pressed={isVisible}
            title={isEmpty ? emptyTooltip : `Show/hide ${label}`}
            disabled={isEmpty}
          >
            <div className={styles.colorDot} style={{ background: color }} />
            <span className={styles.tierLabel}>{label}</span>
            <span className={styles.checkMark}>{isVisible ? '\u2713' : ''}</span>
          </button>
        )
      })}
    </div>
  )
}
