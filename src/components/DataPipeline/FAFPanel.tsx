import type { DataSourceStatus } from '@/stores/pipelineStore.ts'
import { formatTonnage, formatCount } from '@/utils/format.ts'
import styles from './DataPipeline.module.css'

interface FAFPanelProps {
  status: DataSourceStatus
  progress: number
  totalTonnage: number
  countyPairCount: number
  commodityTypes: string[]
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

export function FAFPanel({
  status,
  progress,
  totalTonnage,
  countyPairCount,
  commodityTypes,
  errorMessage,
}: FAFPanelProps) {
  return (
    <div className={styles.panel} role="region" aria-label="FAF freight data">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>FAF Freight Data</span>
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
            <span className={styles.statLabel}>Total Tonnage</span>
            <span className={styles.statValue}>
              {formatTonnage(totalTonnage)}
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
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
    </div>
  )
}
