import { useRef, useCallback } from 'react'
import { useFlowStore } from '@/stores/flowStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useFlows } from '@/hooks/useFlows.ts'
import { formatTonnage } from '@/utils/format.ts'
import styles from './FlowAnalysis.module.css'

export function FlowFilters() {
  const { setFilter, clearFilters } = useFlowStore()
  const { hubs } = useNetworkStore()
  const { filters, uniqueOrigins, uniqueDestinations, uniqueCommodities, maxVolume, filteredFlows } = useFlows()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hubMap = new Map(hubs.map((h) => [h.id, h]))

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilter({ minVolume: value })
    }, 200)
  }, [setFilter])

  const hasActiveFilters = filters.originHubId !== null ||
    filters.destinationHubId !== null ||
    filters.commodity !== null ||
    filters.minVolume > 0

  return (
    <div className={styles.filterContainer}>
      <h3 className={styles.sectionTitle}>Flow Filters</h3>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor="flow-origin">Origin Hub</label>
        <select
          id="flow-origin"
          className={styles.filterSelect}
          value={filters.originHubId ?? ''}
          onChange={(e) => setFilter({ originHubId: e.target.value || null })}
        >
          <option value="">All origins</option>
          {uniqueOrigins.map((id) => (
            <option key={id} value={id}>{hubMap.get(id)?.name ?? id}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor="flow-dest">Destination Hub</label>
        <select
          id="flow-dest"
          className={styles.filterSelect}
          value={filters.destinationHubId ?? ''}
          onChange={(e) => setFilter({ destinationHubId: e.target.value || null })}
        >
          <option value="">All destinations</option>
          {uniqueDestinations.map((id) => (
            <option key={id} value={id}>{hubMap.get(id)?.name ?? id}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor="flow-commodity">Commodity</label>
        <select
          id="flow-commodity"
          className={styles.filterSelect}
          value={filters.commodity ?? ''}
          onChange={(e) => setFilter({ commodity: e.target.value || null })}
        >
          <option value="">All commodities</option>
          {uniqueCommodities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor="flow-volume">
          Min Volume: {formatTonnage(filters.minVolume)}
        </label>
        <input
          id="flow-volume"
          type="range"
          className={styles.volumeSlider}
          min={0}
          max={maxVolume}
          step={Math.max(1, Math.floor(maxVolume / 100))}
          defaultValue={filters.minVolume}
          onChange={handleVolumeChange}
          aria-label="Minimum volume threshold"
        />
        <div className={styles.volumeValue}>
          0 — {formatTonnage(maxVolume)}
        </div>
      </div>

      {hasActiveFilters && (
        <button className={styles.clearBtn} onClick={clearFilters}>
          Clear All Filters
        </button>
      )}

      {hasActiveFilters && filteredFlows.length === 0 && (
        <div className={styles.noMatchMessage} role="status" aria-live="polite">
          No flows match your filters. Adjust or clear filters to see flows.
        </div>
      )}

      {filteredFlows.length > 0 && (
        <div className={styles.volumeValue} style={{ marginTop: '8px', textAlign: 'center' }}>
          {filteredFlows.length} flow{filteredFlows.length !== 1 ? 's' : ''} visible
        </div>
      )}
    </div>
  )
}
