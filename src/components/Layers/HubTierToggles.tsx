import { useNetworkStore } from '@/stores/networkStore.ts'
import type { HubTier } from '@/types/index.ts'
import styles from './Layers.module.css'

const TIERS: { tier: HubTier; label: string; color: string }[] = [
  { tier: 'global', label: 'Global', color: '#F5A623' },
  { tier: 'regional', label: 'Regional', color: '#EF5350' },
  { tier: 'gateway', label: 'Gateway', color: '#1FBAD6' },
]

export function HubTierToggles() {
  const { hubs, visibleTiers, toggleTier } = useNetworkStore()

  const allOff = visibleTiers.size === 0

  return (
    <div>
      <div className={styles.sectionTitle}>Hub Tiers</div>
      {TIERS.map(({ tier, label, color }) => {
        const isVisible = visibleTiers.has(tier)
        const count = hubs.filter((h) => h.tier === tier).length

        return (
          <button
            key={tier}
            className={`${styles.tierToggle} ${!isVisible ? styles.tierToggleDisabled : ''}`}
            onClick={() => toggleTier(tier)}
            aria-label={`Toggle ${label} hubs ${isVisible ? 'off' : 'on'}`}
            aria-pressed={isVisible}
          >
            <div className={styles.colorDot} style={{ background: color }} />
            <span className={styles.tierLabel}>{label}</span>
            <span className={styles.tierCount}>{count}</span>
            <span className={styles.checkMark}>{isVisible ? '\u2713' : ''}</span>
          </button>
        )
      })}
      {allOff && (
        <div className={styles.hint}>
          Enable at least one tier to view the network
        </div>
      )}
    </div>
  )
}
