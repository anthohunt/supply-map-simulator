import type { DataSourceStatus } from '@/stores/pipelineStore.ts'
import { useElapsedTimer, formatElapsed } from '@/hooks/useElapsedTimer.ts'
import { formatTonnage, formatCount } from '@/utils/format.ts'
import styles from './DataPipeline.module.css'

interface FAFPanelProps {
  status: DataSourceStatus
  progress: number
  totalTonnage: number
  filteredTonnage: number
  countyPairCount: number
  commodityTypes: string[]
  disabledCommodities: Set<string>
  errorMessage: string | null
  skippedCount?: number
  isOfflineFallback?: boolean
  onRetry?: () => void
  onToggleCommodity?: (commodity: string) => void
}

function statusLabel(status: DataSourceStatus): string {
  const labels: Record<DataSourceStatus, string> = {
    idle: 'Queued',
    loading: 'Fetching...',
    complete: 'Complete',
    error: 'Error',
  }
  return labels[status]
}

function statusClass(status: DataSourceStatus): string {
  const classes: Record<DataSourceStatus, string> = {
    idle: styles.statusIdle,
    loading: styles.statusLoading,
    complete: styles.statusComplete,
    error: styles.statusError,
  }
  return classes[status]
}

export function FAFPanel({
  status,
  progress,
  totalTonnage,
  filteredTonnage,
  countyPairCount,
  commodityTypes,
  disabledCommodities,
  errorMessage,
  skippedCount = 0,
  isOfflineFallback = false,
  onRetry,
  onToggleCommodity,
}: FAFPanelProps) {
  const hasFilter = disabledCommodities.size > 0
  const displayTonnage = hasFilter ? filteredTonnage : totalTonnage
  const elapsed = useElapsedTimer(status === 'loading')
  return (
    <div className={styles.panel} role="region" aria-label="FAF freight data">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          FAF Freight Data
          <span className={styles.panelTitleHint} title="Freight Analysis Framework — federal commodity flow data between county pairs">
            ?
          </span>
        </span>
        <span className={`${styles.panelStatus} ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {status === 'loading' && (
        <div
          className={styles.panelDescription}
          role="status"
          aria-live="polite"
          aria-label={`Loading freight commodity flow data, ${formatElapsed(elapsed)} elapsed`}
        >
          Loading county-to-county shipping volumes...
          <span className={styles.elapsedTime}>{formatElapsed(elapsed)} elapsed</span>
        </div>
      )}

      {(status === 'loading' || status === 'complete') && (
        <div className={styles.panelProgressBar}>
          <div
            className={styles.panelProgressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status === 'complete' && isOfflineFallback && (
        <p className={styles.warningMessage}>
          Using offline fallback data. Full SE USA dataset could not be loaded.
        </p>
      )}

      {status === 'complete' && countyPairCount === 0 && (
        <p className={styles.warningMessage}>
          No freight data available for this territory. Offline data is only available for SE USA.
        </p>
      )}

      {status === 'complete' && countyPairCount > 0 && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                {hasFilter ? 'Filtered Tonnage' : 'Total Tonnage'}
              </span>
              <span className={styles.statValue}>
                {formatTonnage(displayTonnage)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>County Pairs</span>
              <span className={styles.statValue}>
                {formatCount(countyPairCount)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Commodities</span>
              <span className={styles.statValue}>
                {commodityTypes.length}
              </span>
            </div>
            {skippedCount > 0 && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Skipped</span>
                <span className={styles.statValue}>
                  {formatCount(skippedCount)}
                </span>
              </div>
            )}
          </div>
          {commodityTypes.length > 0 && (
            <div className={styles.commodityFilter} data-testid="commodity-filter">
              <span className={styles.commodityFilterLabel}>Commodity Filter</span>
              <div className={styles.commodityToggles}>
                {commodityTypes.slice(0, 8).map((commodity) => {
                  const isDisabled = disabledCommodities.has(commodity)
                  return (
                    <button
                      key={commodity}
                      type="button"
                      className={`${styles.commodityToggle} ${isDisabled ? styles.commodityToggleOff : ''}`}
                      onClick={() => onToggleCommodity?.(commodity)}
                      title={commodity}
                      aria-pressed={!isDisabled}
                    >
                      {commodity}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {status === 'error' && errorMessage && (
        <div>
          <p className={styles.errorMessage}>{errorMessage}</p>
          {onRetry && (
            <button
              className={styles.retryButton}
              onClick={onRetry}
              type="button"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
