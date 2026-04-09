import type { DataSourceStatus } from '@/stores/pipelineStore.ts'
import type { CandidateSite } from '@/types/site.ts'
import { useElapsedTimer, formatElapsed } from '@/hooks/useElapsedTimer.ts'
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
  totalSqft: number
  skippedCount: number
  duplicatesRemoved: number
  fewSitesWarning: boolean
  errorMessage: string | null
  sites: CandidateSite[]
  onHoverSite?: (siteId: string | null) => void
}

function statusLabel(status: DataSourceStatus): string {
  const labels: Record<DataSourceStatus, string> = {
    idle: 'Queued',
    loading: 'Scanning...',
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
  totalSqft,
  skippedCount,
  duplicatesRemoved,
  fewSitesWarning,
  errorMessage,
  sites,
  onHoverSite,
}: InfraPanelProps) {
  const elapsed = useElapsedTimer(status === 'loading')
  return (
    <div className={styles.panel} role="region" aria-label="Infrastructure sites">
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          Infrastructure Sites
          <span className={styles.panelTitleHint} title="Warehouses, terminals, ports, airports, and rail yards within the territory">
            ?
          </span>
        </span>
        <span className={`${styles.panelStatus} ${statusClass(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      {status === 'idle' && (
        <p className={styles.panelDescription}>
          Will locate warehouses, ports, airports, and rail yards after road/rail data loads.
        </p>
      )}

      {status === 'loading' && (
        <div
          className={styles.panelDescription}
          role="status"
          aria-live="polite"
          aria-label={`Scanning for infrastructure sites, ${formatElapsed(elapsed)} elapsed`}
        >
          Scanning for warehouses, ports, airports, and rail yards...
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
          <div className={`${styles.stat} ${styles.totalSqft}`}>
            <span className={styles.statLabel}>Total sqft</span>
            <span className={styles.statValue}>
              {formatCount(totalSqft)}
            </span>
          </div>
        </div>
      )}

      {status === 'complete' && (skippedCount > 0 || duplicatesRemoved > 0) && (
        <div className={styles.stats}>
          {skippedCount > 0 && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Skipped</span>
              <span className={styles.statValue}>
                {formatCount(skippedCount)}
              </span>
            </div>
          )}
          {duplicatesRemoved > 0 && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Deduped</span>
              <span className={styles.statValue}>
                {formatCount(duplicatesRemoved)}
              </span>
            </div>
          )}
        </div>
      )}

      {status === 'complete' && fewSitesWarning && (
        <p className={styles.errorMessage}>
          Few sites found ({formatCount(totalSites)}). Try expanding the territory or lowering the sqft threshold.
        </p>
      )}

      {status === 'complete' && sites.length > 0 && (
        <div className={styles.siteList} data-testid="site-list">
          <span className={styles.siteListLabel}>Sites ({sites.length})</span>
          {sites.slice(0, 20).map((site) => (
            <div
              key={site.id}
              className={styles.siteListItem}
              onMouseEnter={() => onHoverSite?.(site.id)}
              onMouseLeave={() => onHoverSite?.(null)}
              data-site-id={site.id}
            >
              <span className={styles.siteListItemName}>{site.name}</span>
              <span className={styles.siteListItemType}>{site.type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
    </div>
  )
}
