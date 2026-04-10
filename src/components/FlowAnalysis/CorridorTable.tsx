import { useFlowStore } from '@/stores/flowStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useFlows } from '@/hooks/useFlows.ts'
import { formatTonnage } from '@/utils/format.ts'
import styles from './FlowAnalysis.module.css'

export function CorridorTable() {
  const { networkStatus } = useNetworkStore()
  const { setSelectedCorridorId } = useFlowStore()
  const { corridors, selectedCorridor, selectedCorridorId, flows } = useFlows()

  if (networkStatus !== 'complete') {
    return (
      <div className={styles.corridorContainer}>
        <h3 className={styles.sectionTitle}>Corridor Analysis</h3>
        <div className={styles.emptyMessage}>
          <p>Run network generation first to see freight corridors.</p>
          <button
            className={styles.emptyLink}
            onClick={() => {
              const el = document.querySelector('[aria-label="Control sidebar"]')
              if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Go to Pipeline
          </button>
        </div>
      </div>
    )
  }

  if (flows.length === 0) {
    return (
      <div className={styles.corridorContainer}>
        <h3 className={styles.sectionTitle}>Corridor Analysis</h3>
        <div className={styles.noMatchMessage} data-testid="corridors-empty">
          No corridors to display. No flow data is available for this network.
        </div>
      </div>
    )
  }

  if (corridors.length === 0) {
    return (
      <div className={styles.corridorContainer}>
        <h3 className={styles.sectionTitle}>Corridor Analysis</h3>
        <div className={styles.noMatchMessage}>
          No corridors match your current filters.
        </div>
      </div>
    )
  }

  const displayCorridors = corridors.slice(0, 20)

  return (
    <div className={styles.corridorContainer}>
      <h3 className={styles.sectionTitle}>Corridor Analysis</h3>
      <table className={styles.corridorTable}>
        <thead>
          <tr>
            <th className={styles.corridorHeader}>#</th>
            <th className={styles.corridorHeader}>Corridor</th>
            <th className={styles.corridorHeader}>Throughput</th>
          </tr>
        </thead>
        <tbody>
          {displayCorridors.map((corridor, i) => (
            <tr
              key={corridor.id}
              className={`${styles.corridorRow} ${corridor.id === selectedCorridorId ? styles.corridorRowSelected : ''}`}
              onClick={() => setSelectedCorridorId(corridor.id === selectedCorridorId ? null : corridor.id)}
              role="button"
              tabIndex={0}
              aria-label={`Corridor ${corridor.name}, throughput ${formatTonnage(corridor.totalThroughput)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedCorridorId(corridor.id === selectedCorridorId ? null : corridor.id)
                }
              }}
            >
              <td className={styles.corridorCellMuted}>{i + 1}</td>
              <td className={styles.corridorCell}>{corridor.name}</td>
              <td className={styles.corridorCellMuted}>{formatTonnage(corridor.totalThroughput)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedCorridor && (
        <div className={styles.corridorDetails}>
          <div className={styles.corridorDetailsTitle}>{selectedCorridor.name}</div>
          <div className={styles.corridorDetailRow}>
            <span className={styles.corridorDetailLabel}>Entry Hub</span>
            <span className={styles.corridorDetailValue}>{selectedCorridor.entryHubId}</span>
          </div>
          <div className={styles.corridorDetailRow}>
            <span className={styles.corridorDetailLabel}>Exit Hub</span>
            <span className={styles.corridorDetailValue}>{selectedCorridor.exitHubId}</span>
          </div>
          <div className={styles.corridorDetailRow}>
            <span className={styles.corridorDetailLabel}>Total Throughput</span>
            <span className={styles.corridorDetailValue}>{formatTonnage(selectedCorridor.totalThroughput)}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.corridorDetailsTitle}>Commodity Breakdown</div>
          {Object.entries(selectedCorridor.commodities)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([commodity, volume]) => (
              <div key={commodity} className={styles.corridorDetailRow}>
                <span className={styles.corridorDetailLabel}>{commodity}</span>
                <span className={styles.corridorDetailValue}>{formatTonnage(volume)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
