import { useEffect, useRef } from 'react'
import { usePixelization } from '@/hooks/usePixelization.ts'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import { formatTonnage } from '@/utils/format.ts'
import styles from './PixelizationControls.module.css'

type StepState = 'pending' | 'active' | 'complete'

function getStepStates(
  status: string,
  progress: number
): [StepState, StepState, StepState] {
  if (status === 'idle' || status === 'cancelled') return ['pending', 'pending', 'pending']
  if (status === 'error') return ['complete', 'pending', 'pending']
  if (status === 'complete') return ['complete', 'complete', 'complete']

  // running
  if (progress < 40) return ['active', 'pending', 'pending']
  if (progress < 70) return ['complete', 'active', 'pending']
  return ['complete', 'complete', 'active']
}

function StepIndicator({ state, label }: { state: StepState; label: string }) {
  const iconClass =
    state === 'complete'
      ? styles.stepIconComplete
      : state === 'active'
        ? styles.stepIconActive
        : styles.stepIconPending

  const stepClass =
    state === 'complete'
      ? `${styles.step} ${styles.stepComplete}`
      : state === 'active'
        ? `${styles.step} ${styles.stepActive}`
        : styles.step

  const labelClass = state === 'pending' ? styles.stepLabelMuted : styles.stepLabel

  return (
    <div className={stepClass}>
      <div className={`${styles.stepIcon} ${iconClass}`}>
        {state === 'complete' ? '✓' : state === 'active' ? '⟳' : '○'}
      </div>
      <span className={labelClass}>{label}</span>
    </div>
  )
}

export function PixelizationControls() {
  const {
    areas,
    regions,
    pixelizationStatus,
    pixelizationProgress,
    pixelizationError,
    runPixelization,
    cancelPixelization,
  } = usePixelization()

  const { setCurrentScreen } = useTerritoryStore()
  const hasAutoStarted = useRef(false)

  // Auto-start pixelization when entering this screen
  useEffect(() => {
    if (!hasAutoStarted.current && pixelizationStatus === 'idle') {
      hasAutoStarted.current = true
      runPixelization()
    }
  }, [pixelizationStatus, runPixelization])

  const isRunning = pixelizationStatus === 'running'
  const isComplete = pixelizationStatus === 'complete'
  const isError = pixelizationStatus === 'error'

  const [step1, step2, step3] = getStepStates(
    pixelizationStatus,
    pixelizationProgress
  )

  const progressFillClass = isComplete
    ? `${styles.progressFill} ${styles.progressFillComplete}`
    : isError
      ? `${styles.progressFill} ${styles.progressFillError}`
      : styles.progressFill

  const totalDemand = areas.reduce((s, a) => s + a.totalDemand, 0)

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Space Pixelization</h2>
      <p className={styles.subtitle}>Multi-tier clustering of freight demand</p>

      <div className={styles.statusBar}>
        <div className={styles.statusLabel}>
          <span>
            {isRunning
              ? 'Clustering...'
              : isComplete
                ? 'Complete'
                : isError
                  ? 'Error'
                  : 'Ready'}
          </span>
          <span>{pixelizationProgress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={progressFillClass}
            style={{ width: `${pixelizationProgress}%` }}
          />
        </div>
      </div>

      <div className={styles.stepsContainer}>
        <StepIndicator state={step1} label="Color counties by demand" />
        <StepIndicator state={step2} label="Cluster into areas" />
        <StepIndicator state={step3} label="Group into regions" />
      </div>

      {isError && pixelizationError && (
        <div className={styles.errorMessage}>{pixelizationError}</div>
      )}

      {isComplete && (
        <div className={styles.results}>
          <h3 className={styles.resultsTitle}>Results</h3>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Areas</span>
              <span className={styles.statValue}>{areas.length}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Regions</span>
              <span className={styles.statValue}>{regions.length}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total Demand</span>
              <span className={styles.statValue}>{formatTonnage(totalDemand)}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Contiguous</span>
              <span className={styles.statValue}>
                {areas.filter((a) => a.isContiguous).length}/{areas.length}
              </span>
            </div>
          </div>
          <div className={styles.regionList}>
            {regions.map((r) => (
              <div key={r.id} className={styles.regionItem}>
                <div
                  className={styles.regionDot}
                  style={{ background: r.color }}
                />
                <span>
                  {r.id} — {r.areaIds.length} areas, {formatTonnage(r.totalDemand)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {isRunning && (
          <button
            className={styles.cancelButton}
            onClick={cancelPixelization}
            aria-label="Cancel pixelization"
          >
            Cancel
          </button>
        )}

        {(isComplete || isError) && (
          <button
            className={styles.runButton}
            onClick={runPixelization}
            aria-label="Re-run pixelization"
          >
            Re-run Pixelization
          </button>
        )}

        <button
          className={styles.backButton}
          onClick={() => setCurrentScreen('data-pipeline')}
          aria-label="Back to data pipeline"
        >
          Back to Pipeline
        </button>
      </div>
    </div>
  )
}
