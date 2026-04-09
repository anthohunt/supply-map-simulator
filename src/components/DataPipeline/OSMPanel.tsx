import type { DataSourceStatus } from '@/stores/pipelineStore.ts'
import { useElapsedTimer, formatElapsed } from '@/hooks/useElapsedTimer.ts'
import { formatCount } from '@/utils/format.ts'
import styles from './DataPipeline.module.css'

interface OSMPanelProps {
  status: DataSourceStatus
  roadProgress: number
  railProgress: number
  interstateCount: number
  highwayCount: number
  railroadCount: number
  yardCount: number
  totalRoadKm: number
  totalRailKm: number
  errorMessage: string | null
  skippedCount?: number
  estimatedLabel?: string
  onRetry?: () => void
}

function statusLabel(status: DataSourceStatus): string {
  const labels: Record<DataSourceStatus, string> = {
    idle: 'Queued',
    loading: 'Fetching...',
    complete: 'Complete',
    partial: 'Partial Data',
    error: 'Error',
  }
  return labels[status]
}

function statusClass(status: DataSourceStatus): string {
  const classes: Record<DataSourceStatus, string> = {
    idle: styles.statusIdle,
    loading: styles.statusLoading,
    complete: styles.statusComplete,
    partial: styles.statusWarning ?? styles.statusComplete,
    error: styles.statusError,
  }
  return classes[status]
}

export function OSMPanel({
  status,
  roadProgress,
  railProgress,
  interstateCount,
  highwayCount,
  railroadCount,
  yardCount,
  totalRoadKm,
  totalRailKm,
  errorMessage,
  skippedCount = 0,
  estimatedLabel,
  onRetry,
}: OSMPanelProps) {
  const elapsed = useElapsedTimer(status === 'loading')

  return (
    <div className={styles.panel} role="region" aria-label="Road and rail transportation data">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          Road &amp; Rail Network
          <span className={styles.panelTitleHint} title="US DOT Bureau of Transportation Statistics provides official highway and railroad data for the selected territory">
            ?
          </span>
        </span>
        <span className={`${styles.panelStatus} ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {status === 'idle' && (
        <p className={styles.panelDescription}>
          Will load interstates, US highways, and railroads from BTS after freight data loads.
        </p>
      )}

      {status === 'loading' && (
        <div
          className={styles.panelDescription}
          role="status"
          aria-live="polite"
          aria-label={`Loading road and rail network from BTS, ${formatElapsed(elapsed)} elapsed`}
        >
          Loading road &amp; rail network from BTS National Transportation Database...
          {estimatedLabel
            ? ` Estimated: ${estimatedLabel}.`
            : ' Usually completes in under 30 seconds.'}
          <span className={styles.elapsedTime}>{formatElapsed(elapsed)} elapsed</span>
        </div>
      )}

      {status === 'partial' && errorMessage && (
        <div className={styles.warningMessage} role="alert">
          {errorMessage}
        </div>
      )}

      {(status === 'loading' || status === 'complete' || status === 'partial') && (
        <div className={styles.subProgress}>
          <div className={styles.subProgressRow}>
            <span className={styles.subProgressLabel}>Road</span>
            <div className={styles.subProgressBarWrapper}>
              <div
                className={styles.subProgressFill}
                style={{ width: `${roadProgress}%` }}
              />
            </div>
          </div>
          <div className={styles.subProgressRow}>
            <span className={styles.subProgressLabel}>Rail</span>
            <div className={styles.subProgressBarWrapper}>
              <div
                className={styles.subProgressFill}
                style={{ width: `${railProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {(status === 'complete' || status === 'partial') && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Interstates</span>
            <span className={styles.statValue}>
              {formatCount(interstateCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Highways</span>
            <span className={styles.statValue}>
              {formatCount(highwayCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Railroads</span>
            <span className={styles.statValue}>
              {formatCount(railroadCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rail Yards</span>
            <span className={styles.statValue}>
              {formatCount(yardCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Road km</span>
            <span className={styles.statValue}>
              {formatCount(totalRoadKm)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rail km</span>
            <span className={styles.statValue}>
              {formatCount(totalRailKm)}
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
