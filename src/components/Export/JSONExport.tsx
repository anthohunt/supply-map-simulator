import { useMemo, useState } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { buildHubJSON, downloadFile } from '@/services/exportService.ts'
import { formatCount } from '@/utils/format.ts'
import type { HubTier } from '@/types/index.ts'
import styles from './Export.module.css'

const TIERS: { key: HubTier; label: string; color: string }[] = [
  { key: 'global', label: 'Global', color: '#F5A623' },
  { key: 'regional', label: 'Regional', color: '#EF5350' },
  { key: 'gateway', label: 'Gateway', color: '#1FBAD6' },
]

export function JSONExport() {
  const { hubs } = useNetworkStore()
  const [selectedTiers, setSelectedTiers] = useState<Set<HubTier>>(
    new Set(['global', 'regional', 'gateway']),
  )

  const toggleTier = (tier: HubTier) => {
    setSelectedTiers((prev) => {
      const next = new Set(prev)
      if (next.has(tier)) {
        next.delete(tier)
      } else {
        next.add(tier)
      }
      return next
    })
  }

  const result = useMemo(
    () => buildHubJSON(hubs, selectedTiers.size < 3 ? selectedTiers : undefined),
    [hubs, selectedTiers],
  )

  const previewText = useMemo(() => {
    const arr = result.data
    if (arr.length === 0) return '[]'
    const lines = ['[']
    for (let i = 0; i < Math.min(3, arr.length); i++) {
      const h = arr[i]
      lines.push(`  { "id": "${h.id}", "name": "${h.name}", "tier": "${h.tier}", "lat": ${h.lat.toFixed(4)}, "lng": ${h.lng.toFixed(4)}, "throughput": ${h.throughput}, "capacity": ${h.capacity}, "connectedHubIds": [${h.connectedHubIds.length} items] },`)
    }
    if (arr.length > 3) {
      lines.push(`  ... ${arr.length - 3} more hubs`)
    }
    lines.push(']')
    return lines.join('\n')
  }, [result])

  const handleDownload = () => {
    const json = JSON.stringify(result.data, null, 2)
    downloadFile(json, 'supply-map-hubs.json', 'application/json')
  }

  if (hubs.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        No hub data to export. Run the pipeline and generate a network first.
      </div>
    )
  }

  return (
    <div>
      <div className={styles.info}>
        Export hub data as a JSON array. Use tier filters to export specific tiers.
      </div>

      <div className={styles.filterChips} role="group" aria-label="Tier filter">
        {TIERS.map((t) => (
          <button
            key={t.key}
            className={`${styles.chip} ${selectedTiers.has(t.key) ? styles.chipActive : ''}`}
            onClick={() => toggleTier(t.key)}
            aria-pressed={selectedTiers.has(t.key)}
            style={selectedTiers.has(t.key) ? { borderColor: t.color, color: t.color } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Hubs</span>
          <span className={styles.statValue}>{formatCount(result.data.length)}</span>
        </div>
      </div>

      <div className={styles.preview} aria-label="JSON preview">
        {previewText}
      </div>

      <button
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={result.data.length === 0}
        aria-label="Download JSON"
      >
        Download JSON
      </button>
    </div>
  )
}
