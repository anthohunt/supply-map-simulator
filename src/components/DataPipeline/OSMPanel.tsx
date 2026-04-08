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
  totalChunks?: number
  currentChunk?: number
  onRetry?: () => void
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
  totalChunks = 1,
  currentChunk = 0,
  onRetry,
}: OSMPanelProps) {
  const elapsed = useElapsedTimer(status === 'loading')

  return (
    <div className={styles.panel} role="region" aria-label="OSM road and rail data">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          Road &amp; Rail Network
          <span className={styles.panelTitleHint} title="OpenStreetMap Overpass API provides real highway and railroad geometry for the selected territory">
            ?
          </span>
        </span>
        <span className={`${styles.panelStatus} ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {status === 'idle' && (
        <p className={styles.panelDescription}>
          Will query OpenStreetMap for interstates, highways, and railroads after freight data loads.
        </p>
      )}

      {status === 'loading' && (
        <div
          className={styles.panelDescription}
          role="status"
          aria-live="polite"
          aria-label={`Loading road and rail network from OpenStreetMap, ${formatElapsed(elapsed)} elapsed, ${totalChunks > 1 ? `chunk ${currentChunk + 1} of ${totalChunks}` : 'processing'}`}
        >
          Loading road &amp; rail network from OpenStreetMap...
          {totalChunks > 1
            ? ' Large territories are split into chunks and may take 2–4 minutes.'
            : ' This usually takes 30 seconds to 2 minutes.'}
          <span className={styles.elapsedTime}>{formatElapsed(elapsed)} elapsed</span>
        </div>
      )}

      {status === 'loading' && totalChunks > 1 && (
        <div className={styles.chunkInfo} data-testid="chunk-progress">
          Chunking: {currentChunk + 1} / {totalChunks} sub-regions
        </div>
      )}

      {status === 'complete' && totalChunks > 1 && (
        <div className={styles.chunkInfo} data-testid="chunk-complete">
          Loaded from {totalChunks} sub-region chunks
        </div>
      )}

      {(status === 'loading' || status === 'complete') && (
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

      {status === 'complete' && (
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
