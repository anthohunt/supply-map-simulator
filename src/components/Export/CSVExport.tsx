import { useMemo, useState, useCallback } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useFlowStore } from '@/stores/flowStore.ts'
import { buildFlowCSV, downloadFile } from '@/services/exportService.ts'
import { formatCount } from '@/utils/format.ts'
import styles from './Export.module.css'

const LARGE_THRESHOLD = 100_000

export function CSVExport() {
  const { hubs } = useNetworkStore()
  const { flows, filters } = useFlowStore()
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  // Apply current flow filters
  const filteredFlows = useMemo(() => {
    let f = flows
    if (filters.originHubId) {
      f = f.filter((fl) => fl.originHubId === filters.originHubId)
    }
    if (filters.destinationHubId) {
      f = f.filter((fl) => fl.destinationHubId === filters.destinationHubId)
    }
    if (filters.commodity) {
      f = f.filter((fl) => fl.commodity === filters.commodity)
    }
    if (filters.minVolume > 0) {
      f = f.filter((fl) => fl.volumeTons >= filters.minVolume)
    }
    return f
  }, [flows, filters])

  const result = useMemo(
    () => buildFlowCSV(filteredFlows, hubs),
    [filteredFlows, hubs],
  )

  const previewText = useMemo(() => {
    if (!result.csv) return ''
    const lines = result.csv.split('\n')
    return lines.slice(0, Math.min(20, lines.length)).join('\n') +
      (lines.length > 20 ? `\n... ${lines.length - 20} more rows` : '')
  }, [result])

  const handleDownload = useCallback(async () => {
    if (filteredFlows.length > LARGE_THRESHOLD) {
      setExporting(true)
      setProgress(0)
      // Stream large exports in chunks
      const headers = 'originHubId,destinationHubId,commodity,volumeTons,routeHops\n'
      const chunks: string[] = [headers]
      const chunkSize = 10_000
      for (let i = 0; i < filteredFlows.length; i += chunkSize) {
        const batch = filteredFlows.slice(i, i + chunkSize)
        const batchResult = buildFlowCSV(batch, hubs)
        // Skip header from batch result
        const batchLines = batchResult.csv.split('\n').slice(1).join('\n')
        chunks.push(batchLines + '\n')
        setProgress(Math.min(100, Math.round(((i + chunkSize) / filteredFlows.length) * 100)))
        // Yield to the event loop
        await new Promise((r) => setTimeout(r, 0))
      }
      const fullCsv = chunks.join('')
      downloadFile(fullCsv, 'supply-map-flows.csv', 'text/csv')
      setExporting(false)
      setProgress(100)
    } else {
      downloadFile(result.csv, 'supply-map-flows.csv', 'text/csv')
    }
  }, [filteredFlows, hubs, result.csv])

  if (flows.length === 0) {
    return (
      <div className={styles.emptyMessage} data-testid="csv-no-flows">
        No flow data to export. Enable flow analysis first.
      </div>
    )
  }

  if (filteredFlows.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        No flows match your current filters. Adjust filters or click "Clear All" in the Flows tab.
      </div>
    )
  }

  return (
    <div>
      <div className={styles.info}>
        Export flow data as CSV. Active flow filters are applied to the export.
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Flows</span>
          <span className={styles.statValue}>{formatCount(filteredFlows.length)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Filtered</span>
          <span className={styles.statValue}>
            {filteredFlows.length < flows.length ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className={styles.warningBox} role="alert">
          <span className={styles.warningText}>{result.warnings.join('; ')}</span>
        </div>
      )}

      {exporting && (
        <div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.loading} role="status" aria-label="Exporting CSV">
            <div className={styles.spinner} />
            Exporting... {progress}%
          </div>
        </div>
      )}

      <div className={styles.preview} aria-label="CSV preview">
        {previewText}
      </div>

      <button
        className={styles.downloadBtn}
        onClick={handleDownload}
        disabled={exporting}
        aria-label="Download CSV"
      >
        {exporting ? 'Exporting...' : 'Download CSV'}
      </button>
    </div>
  )
}
