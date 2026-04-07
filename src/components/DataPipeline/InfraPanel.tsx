import type { DataSourceStatus } from '@/stores/pipelineStore.ts'
import { formatCount } from '@/utils/format.ts'
import styles from './DataPipeline.module.css'

interface InfraPanelProps {
  status: DataSourceStatus
  progress: number
  warehouseCount: number
  terminalCount: number
  dcCount: number
  portCount: number
  airportCount: number
  railYardCount: number
  totalSites: number
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

export function InfraPanel({
  status,
  progress,
  warehouseCount,
  terminalCount,
  dcCount,
  portCount,
  airportCount,
  railYardCount,
  totalSites,
  errorMessage,
}: InfraPanelProps) {
  return (
    <div className={styles.panel} role="region" aria-label="Infrastructure sites">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Infrastructure Sites</span>
        <span className={`${styles.panelStatus} ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {(status === 'loading' || status === 'complete') && (
        <div className={styles.panelProgressBar}>
          <div
            className={styles.panelProgressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status === 'complete' && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Sites</span>
            <span className={styles.statValue}>
              {formatCount(totalSites)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Warehouses</span>
            <span className={styles.statValue}>
              {formatCount(warehouseCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Terminals</span>
            <span className={styles.statValue}>
              {formatCount(terminalCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Dist. Centers</span>
            <span className={styles.statValue}>
              {formatCount(dcCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Ports</span>
            <span className={styles.statValue}>
              {formatCount(portCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Airports</span>
            <span className={styles.statValue}>
              {formatCount(airportCount)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Rail Yards</span>
            <span className={styles.statValue}>
              {formatCount(railYardCount)}
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
