import { useEffect, useRef } from 'react'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { usePipeline } from '@/hooks/usePipeline.ts'
import { FAFPanel } from './FAFPanel.tsx'
import { OSMPanel } from './OSMPanel.tsx'
import { InfraPanel } from './InfraPanel.tsx'
import styles from './DataPipeline.module.css'

export function DataPipelineDashboard() {
  const { selectedTerritory, clearTerritory } = useTerritoryStore()
  const { faf, osm, infra, overallProgress, startPipeline } = usePipeline()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (selectedTerritory && !hasStarted.current) {
      hasStarted.current = true
      startPipeline()
    }
  }, [selectedTerritory, startPipeline])

  const allComplete =
    faf.status === 'complete' &&
    osm.status === 'complete' &&
    infra.status === 'complete'

  const hasError =
    faf.status === 'error' ||
    osm.status === 'error' ||
    infra.status === 'error'

  const progressFillClass = allComplete
    ? `${styles.progressFill} ${styles.progressFillComplete}`
    : hasError
      ? `${styles.progressFill} ${styles.progressFillError}`
      : styles.progressFill

  return (
    <div className={styles.dashboard}>
      <h2 className={styles.dashboardTitle}>Data Pipeline</h2>
      {selectedTerritory && (
        <p className={styles.territoryName}>{selectedTerritory.name}</p>
      )}

      <div className={styles.overallProgress}>
        <div className={styles.overallLabel}>
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={progressFillClass}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className={styles.panels}>
        <FAFPanel
          status={faf.status}
          progress={faf.progress}
          totalTonnage={faf.totalTonnage}
          countyPairCount={faf.countyPairCount}
          commodityTypes={faf.commodityTypes}
          errorMessage={faf.errorMessage}
          skippedCount={faf.skippedCount}
          isOfflineFallback={faf.isOfflineFallback}
          onRetry={startPipeline}
        />
        <OSMPanel
          status={osm.status}
          roadProgress={osm.roadProgress}
          railProgress={osm.railProgress}
          interstateCount={osm.interstateCount}
          highwayCount={osm.highwayCount}
          railroadCount={osm.railroadCount}
          yardCount={osm.yardCount}
          totalRoadKm={osm.totalRoadKm}
          totalRailKm={osm.totalRailKm}
          errorMessage={osm.errorMessage}
          skippedCount={osm.skippedCount}
          onRetry={startPipeline}
        />
        <InfraPanel
          status={infra.status}
          progress={infra.progress}
          warehouseCount={infra.warehouseCount}
          terminalCount={infra.terminalCount}
          dcCount={infra.dcCount}
          portCount={infra.portCount}
          airportCount={infra.airportCount}
          railYardCount={infra.railYardCount}
          totalSites={infra.sites.length}
          skippedCount={infra.skippedCount}
          duplicatesRemoved={infra.duplicatesRemoved}
          fewSitesWarning={infra.fewSitesWarning}
          errorMessage={infra.errorMessage}
        />
      </div>

      {allComplete && (
        <button
          className={styles.nextStepButton}
          onClick={() => useTerritoryStore.getState().setCurrentScreen('pixelization')}
          aria-label="Start pixelization"
        >
          Start Pixelization →
        </button>
      )}

      <button
        className={styles.changeTerritoryButton}
        onClick={clearTerritory}
        aria-label="Change territory"
      >
        Change Territory
      </button>
    </div>
  )
}
