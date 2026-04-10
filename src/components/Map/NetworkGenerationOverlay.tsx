import { useNetworkGeneration } from '@/hooks/useNetworkGeneration.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import styles from './Map.module.css'

export function NetworkGenerationOverlay() {
  const { pixelizationStatus, networkStatus } = useNetworkStore()
  const { setCurrentScreen } = useTerritoryStore()
  const { networkProgress, networkError, generateHubNetwork } = useNetworkGeneration()
  // Only show after pixelization is complete and network not yet generated
  const showGenerateButton = pixelizationStatus === 'complete' && networkStatus === 'idle'
  const showProgress = networkStatus === 'running'
  const showError = networkStatus === 'error'
  const showComplete = networkStatus === 'complete'

  if (!showGenerateButton && !showProgress && !showError && !showComplete) return null

  return (
    <div className={styles.networkOverlay}>
      {showGenerateButton && (
        <div className={styles.networkGenerateCard}>
          <p className={styles.networkGenerateHint}>
            Regions clustered. Generate a hub-and-spoke network from the demand data.
          </p>
          <button
            className={styles.generateBtn}
            onClick={generateHubNetwork}
            aria-label="Generate hub-and-spoke freight network from clustered demand regions"
          >
            Generate Network
          </button>
        </div>
      )}

      {showProgress && (
        <div
          className={styles.networkProgress}
          role="status"
          aria-live="polite"
          aria-label={`Optimizing hub placement and connections, ${networkProgress}% complete`}
        >
          <span>Optimizing hub placement... {networkProgress}%</span>
          <p className={styles.networkProgressHint}>
            Placing hubs at high-demand sites and connecting them by tier.
          </p>
        </div>
      )}

      {showError && (
        <div className={styles.networkError} role="alert">
          <div className={styles.networkErrorText}>
            {networkError ?? 'Network generation failed'}
          </div>
          <button
            className={styles.retryBtn}
            onClick={generateHubNetwork}
          >
            Retry with defaults
          </button>
        </div>
      )}

      {showComplete && (
        <div className={styles.networkGenerateCard}>
          <p className={styles.networkGenerateHint}>
            Network generated. View the hub-and-spoke network on the map.
          </p>
          <button
            className={styles.generateBtn}
            onClick={() => setCurrentScreen('network-map')}
            aria-label="View the generated hub-and-spoke freight network"
          >
            View Network →
          </button>
        </div>
      )}
    </div>
  )
}
