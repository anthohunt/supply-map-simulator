import { useEffect, useRef, useState } from 'react'
import { usePixelization } from '@/hooks/usePixelization.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
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

function validateParams(targetRegions: number, weights: number[], countyCount?: number): string | null {
  if (targetRegions < 2) return 'Minimum 2 regions required'
  if (countyCount && targetRegions > countyCount) {
    return `Maximum ${countyCount} regions (limited by county count)`
  }
  if (targetRegions > 50) return 'Maximum 50 regions'
  for (const w of weights) {
    if (w < 0 || w > 1) return 'Weights must be between 0 and 1'
  }
  return null
}

export function PixelizationControls() {
  const {
    areas,
    regions,
    pixelizationStatus,
    pixelizationProgress,
    pixelizationError,
    params,
    countyCount,
    runPixelization,
    cancelPixelization,
  } = usePixelization()

  const { setParams } = useNetworkStore()
  const { setCurrentScreen } = useTerritoryStore()
  const hasAutoStarted = useRef(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Sync validation with current params
  useEffect(() => {
    setValidationError(validateParams(params.targetRegions, [
      params.demandBalanceWeight,
      params.contiguityWeight,
      params.compactnessWeight,
    ], countyCount > 0 ? countyCount : undefined))
  }, [params.targetRegions, params.demandBalanceWeight, params.contiguityWeight, params.compactnessWeight, countyCount])

  // Auto-start pixelization on mount when status is idle
  useEffect(() => {
    if (pixelizationStatus === 'idle') {
      hasAutoStarted.current = true
      runPixelization()
    }
    // Only run on mount, not on every status change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <h2 className={styles.title}>Demand Clustering</h2>
      <p className={styles.subtitle}>
        Groups nearby counties into regions by freight volume,
        so the network optimizer can place hubs efficiently.
      </p>

      <div className={styles.statusBar} role="status" aria-live="polite">
        <div className={styles.statusLabel}>
          <span>
            {isRunning
              ? 'Clustering counties by freight demand...'
              : isComplete
                ? 'Clustering complete'
                : isError
                  ? 'Clustering error'
                  : 'Ready to cluster'}
          </span>
          <span>{pixelizationProgress}%</span>
        </div>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={pixelizationProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Pixelization progress: ${pixelizationProgress}%`}
        >
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

      {(isComplete || isError) && (
        <div className={styles.paramPanel}>
          <h3 className={styles.paramTitle}>Parameters</h3>

          <div className={styles.paramRow}>
            <label className={styles.paramLabel} htmlFor="targetRegions">
              Target Regions
            </label>
            <div className={styles.paramControl}>
              <input
                id="targetRegions"
                type="range"
                min={2}
                max={countyCount > 0 ? Math.min(countyCount, 50) : 20}
                step={1}
                value={params.targetRegions}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setParams({ targetRegions: val })
                  setValidationError(validateParams(val, [
                    params.demandBalanceWeight,
                    params.contiguityWeight,
                    params.compactnessWeight,
                  ], countyCount > 0 ? countyCount : undefined))
                }}
                className={styles.slider}
                aria-label="Target regions"
              />
              <span className={styles.paramValue}>{params.targetRegions}</span>
            </div>
          </div>

          <div className={styles.paramRow}>
            <label className={styles.paramLabel} htmlFor="demandBalance" title="How evenly freight volume should be distributed across regions. Higher = more equal regions.">
              Demand Balance
            </label>
            <div className={styles.paramControl}>
              <input
                id="demandBalance"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={params.demandBalanceWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setParams({ demandBalanceWeight: val })
                  setValidationError(validateParams(params.targetRegions, [
                    val, params.contiguityWeight, params.compactnessWeight,
                  ]))
                }}
                className={styles.slider}
                aria-label="Demand balance weight"
              />
              <span className={styles.paramValue}>{params.demandBalanceWeight.toFixed(1)}</span>
            </div>
          </div>

          <div className={styles.paramRow}>
            <label className={styles.paramLabel} htmlFor="contiguity" title="Preference for geographically connected regions without gaps. Higher = fewer isolated patches.">
              Contiguity
            </label>
            <div className={styles.paramControl}>
              <input
                id="contiguity"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={params.contiguityWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setParams({ contiguityWeight: val })
                  setValidationError(validateParams(params.targetRegions, [
                    params.demandBalanceWeight, val, params.compactnessWeight,
                  ]))
                }}
                className={styles.slider}
                aria-label="Contiguity weight"
              />
              <span className={styles.paramValue}>{params.contiguityWeight.toFixed(1)}</span>
            </div>
          </div>

          <div className={styles.paramRow}>
            <label className={styles.paramLabel} htmlFor="compactness" title="Preference for round, compact regions rather than long, narrow shapes. Higher = rounder clusters.">
              Compactness
            </label>
            <div className={styles.paramControl}>
              <input
                id="compactness"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={params.compactnessWeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setParams({ compactnessWeight: val })
                  setValidationError(validateParams(params.targetRegions, [
                    params.demandBalanceWeight, params.contiguityWeight, val,
                  ]))
                }}
                className={styles.slider}
                aria-label="Compactness weight"
              />
              <span className={styles.paramValue}>{params.compactnessWeight.toFixed(1)}</span>
            </div>
          </div>

          {validationError && (
            <div className={styles.warningMessage}>{validationError}</div>
          )}
        </div>
      )}

      {isComplete && (
        <div className={styles.nextStepGuidance} role="status" aria-live="polite">
          <p className={styles.nextStepText}>
            Regions ready. Click <strong>Generate Network</strong> on the map to place hubs and connect them.
          </p>
        </div>
      )}

      <div className={styles.actions}>
        {isRunning && (
          <button
            className={styles.cancelButton}
            onClick={cancelPixelization}
            aria-label="Cancel clustering"
          >
            Cancel
          </button>
        )}

        {(isComplete || isError) && (
          <button
            className={styles.runButton}
            onClick={runPixelization}
            disabled={validationError !== null}
            aria-label="Re-run clustering with current parameters"
          >
            Re-run Clustering
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
