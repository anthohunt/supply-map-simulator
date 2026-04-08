import { useEffect, useRef } from 'react'
import { useNetworkGeneration } from '@/hooks/useNetworkGeneration.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import styles from './Map.module.css'

export function NetworkGenerationOverlay() {
  const { pixelizationStatus, networkStatus } = useNetworkStore()
  const { setCurrentScreen } = useTerritoryStore()
  const { networkProgress, networkError, generateHubNetwork } = useNetworkGeneration()
  const transitioned = useRef(false)

  // Auto-transition to network-map screen when generation completes
  useEffect(() => {
    if (networkStatus === 'complete' && !transitioned.current) {
      transitioned.current = true
      setCurrentScreen('network-map')
    }
    if (networkStatus === 'idle') {
      transitioned.current = false
    }
  }, [networkStatus, setCurrentScreen])

  // Only show after pixelization is complete and network not yet generated
  const showGenerateButton = pixelizationStatus === 'complete' && networkStatus === 'idle'
  const showProgress = networkStatus === 'running'
  const showError = networkStatus === 'error'

  if (!showGenerateButton && !showProgress && !showError) return null

  return (
    <div className={styles.networkOverlay}>
      {showGenerateButton && (
        <button
          className={styles.generateBtn}
          onClick={generateHubNetwork}
          aria-label="Generate hub network"
        >
          Generate Network
        </button>
      )}

      {showProgress && (
        <div className={styles.networkProgress}>
          Generating network... {networkProgress}%
        </div>
      )}

      {showError && (
        <div className={styles.networkError}>
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
    </div>
  )
}
