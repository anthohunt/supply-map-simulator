import { useCallback } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { generateNetwork } from '@/services/networkOptimizer.ts'

export function useNetworkGeneration() {
  const {
    regions,
    areas,
    hubs,
    edges,
    networkStatus,
    networkProgress,
    networkError,
    setHubs,
    setEdges,
    setNetworkStatus,
    setNetworkProgress,
    setNetworkError,
    resetNetwork,
  } = useNetworkStore()

  const { infra } = usePipelineStore()

  const generateHubNetwork = useCallback(() => {
    resetNetwork()
    setNetworkStatus('running')
    setNetworkProgress(0)

    try {
      const result = generateNetwork(
        regions,
        areas,
        infra.sites,
        (progress) => setNetworkProgress(progress),
      )

      if (result.hubs.length === 0) {
        setNetworkError('No hubs could be placed. Ensure candidate sites exist.')
        setNetworkStatus('error')
        return
      }

      setHubs(result.hubs)
      setEdges(result.edges)
      setNetworkStatus('complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network generation failed'
      setNetworkError(message)
      setNetworkStatus('error')
    }
  }, [regions, areas, infra.sites, setHubs, setEdges, setNetworkStatus, setNetworkProgress, setNetworkError, resetNetwork])

  return {
    hubs,
    edges,
    networkStatus,
    networkProgress,
    networkError,
    generateHubNetwork,
    resetNetwork,
  }
}
