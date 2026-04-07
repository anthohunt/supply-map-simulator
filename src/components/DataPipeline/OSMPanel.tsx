import type { DataSourceStatus } from '@/stores/pipelineStore.ts'
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
}

function statusLabel(status: DataSourceStatus): string {
  const labels: Record<DataSourceStatus, string> = {
    idle: 'Waiting',
    loading: 'Loading',
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
}: OSMPanelProps) {
  return (
    <div className={styles.panel} role="region" aria-label="OSM road and rail data">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>OSM Road / Rail</span>
        <span className={`${styles.panelStatus} ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

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
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
    </div>
  )
}
