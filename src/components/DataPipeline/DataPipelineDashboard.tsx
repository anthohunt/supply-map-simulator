import { useEffect, useRef, useState } from 'react'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { usePipeline } from '@/hooks/usePipeline.ts'
import { FAFPanel } from './FAFPanel.tsx'
import { OSMPanel } from './OSMPanel.tsx'
import { InfraPanel } from './InfraPanel.tsx'
import styles from './DataPipeline.module.css'

interface DataPipelineDashboardProps {
  onHoverSite?: (siteId: string | null) => void
}

export function DataPipelineDashboard({ onHoverSite }: DataPipelineDashboardProps) {
  const { selectedTerritory, clearTerritory } = useTerritoryStore()
  const { faf, osm, infra, overallProgress, startPipeline } = usePipeline()
  const toggleCommodity = usePipelineStore((s) => s.toggleCommodity)
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

  const isLoading = !allComplete && !hasError && hasStarted.current
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isLoading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isLoading])

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

      <div className={styles.overallProgress} role="status" aria-live="polite">
        <div className={styles.overallLabel}>
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={overallProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Data pipeline progress: ${overallProgress}%`}
        >
          <div
            className={progressFillClass}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        {!allComplete && !hasError && (
          <p className={styles.progressHint}>
            Loading freight, road/rail, and infrastructure data.
            {elapsed > 0 && ` ${elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`} elapsed`}
          </p>
        )}
      </div>

      <div className={styles.panels}>
        <FAFPanel
          status={faf.status}
          progress={faf.progress}
          totalTonnage={faf.totalTonnage}
          filteredTonnage={faf.filteredTonnage}
          countyPairCount={faf.countyPairCount}
          commodityTypes={faf.commodityTypes}
          disabledCommodities={faf.disabledCommodities}
          errorMessage={faf.errorMessage}
          skippedCount={faf.skippedCount}
          isOfflineFallback={faf.isOfflineFallback}
          onRetry={startPipeline}
          onToggleCommodity={toggleCommodity}
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
          totalChunks={osm.totalChunks}
          currentChunk={osm.currentChunk}
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
          totalSqft={infra.sites.reduce((sum, s) => sum + s.sqft, 0)}
          skippedCount={infra.skippedCount}
          duplicatesRemoved={infra.duplicatesRemoved}
          fewSitesWarning={infra.fewSitesWarning}
          errorMessage={infra.errorMessage}
          sites={infra.sites}
          onHoverSite={onHoverSite}
        />
      </div>

      {allComplete && (
        <div className={styles.nextStepGuidance} role="status" aria-live="polite">
          <p className={styles.nextStepText}>
            All data loaded. Next, group counties into demand regions so the optimizer can place hubs.
          </p>
          <button
            className={styles.nextStepButton}
            onClick={() => useTerritoryStore.getState().setCurrentScreen('pixelization')}
            aria-label="Proceed to demand clustering step to group counties into regions"
          >
            Next: Demand Clustering →
          </button>
        </div>
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
