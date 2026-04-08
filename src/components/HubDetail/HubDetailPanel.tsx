import { useEffect, useCallback } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { formatTonnage } from '@/utils/format.ts'
import type { HubTier } from '@/types/index.ts'
import styles from './HubDetail.module.css'

const TIER_COLORS: Record<HubTier, string> = {
  global: '#F5A623',
  regional: '#EF5350',
  gateway: '#1FBAD6',
  local: '#AB47BC',
  access: '#66BB6A',
}

const TIER_LABELS: Record<HubTier, string> = {
  global: 'Global',
  regional: 'Regional',
  gateway: 'Gateway',
  local: 'Local',
  access: 'Access',
}

export function HubDetailPanel() {
  const { hubs, selectedHubId, setSelectedHubId } = useNetworkStore()
  const { infra } = usePipelineStore()

  const hub = selectedHubId ? hubs.find((h) => h.id === selectedHubId) : null
  const isOpen = hub !== null && hub !== undefined

  const handleClose = useCallback(() => {
    setSelectedHubId(null)
  }, [setSelectedHubId])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, handleClose])

  const handleConnectedClick = useCallback((connectedId: string) => {
    setSelectedHubId(connectedId)
  }, [setSelectedHubId])

  const panelClass = isOpen
    ? styles.panel
    : `${styles.panel} ${styles.panelHidden}`

  if (!hub) {
    return <div className={`${styles.panel} ${styles.panelHidden}`} aria-hidden="true" />
  }

  const connectedHubs = hub.connectedHubIds
    .map((id) => hubs.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => h !== undefined)

  const candidateSites = hub.candidateSiteIds
    .map((id) => infra.sites.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)

  return (
    <div
      className={panelClass}
      role="complementary"
      aria-label={`Hub detail panel: ${hub.name}`}
    >
      <div className={styles.header}>
        <span className={styles.hubName}>{hub.name}</span>
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close hub detail panel"
        >
          &times;
        </button>
      </div>

      <div className={styles.body}>
        <div
          className={styles.tierBadge}
          style={{ background: TIER_COLORS[hub.tier] }}
        >
          {TIER_LABELS[hub.tier]}
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Throughput</span>
            <span className={styles.statValue}>
              {formatTonnage(hub.throughputTons)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Capacity</span>
            <span className={styles.statValue}>
              {formatTonnage(hub.capacityTons)}
            </span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Candidate Sites</div>
          {hub.isFixed ? (
            <div className={styles.sectionNote}>
              Fixed location &mdash; not generated from candidates
            </div>
          ) : candidateSites.length > 0 ? (
            candidateSites.map((site) => (
              <div key={site.id} className={styles.candidateItem}>
                {site.name} ({site.type})
              </div>
            ))
          ) : (
            <div className={styles.sectionNote}>No candidate sites</div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Connected Hubs ({connectedHubs.length})
          </div>
          {connectedHubs.map((ch) => (
            <button
              key={ch.id}
              className={styles.connectedHub}
              onClick={() => handleConnectedClick(ch.id)}
              aria-label={`Navigate to ${ch.name}`}
            >
              <div
                className={styles.connectedDot}
                style={{ background: TIER_COLORS[ch.tier] }}
              />
              {ch.name}
            </button>
          ))}
          {connectedHubs.length === 0 && (
            <div className={styles.sectionNote}>No connections</div>
          )}
        </div>
      </div>
    </div>
  )
}
