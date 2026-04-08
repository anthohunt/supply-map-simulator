import { createContext, useContext, useState, useCallback } from 'react'
import type { InfraLayerKey, BoundaryLayerKey } from '@/stores/mapStore.ts'
import type { HubTier } from '@/types/index.ts'

export interface LayerState {
  visibleTiers: Set<HubTier>
  toggleTier: (tier: HubTier) => void
  infraLayers: Record<InfraLayerKey, boolean>
  toggleInfraLayer: (key: InfraLayerKey) => void
  boundaryLayers: Record<BoundaryLayerKey, boolean>
  toggleBoundaryLayer: (key: BoundaryLayerKey) => void
  hubOpacity: number
  infraOpacity: number
  boundaryOpacity: number
}

const SplitPanelContext = createContext<LayerState | null>(null)

export function useSplitPanelContext() {
  return useContext(SplitPanelContext)
}

const ALL_TIERS = new Set<HubTier>(['global', 'regional', 'gateway'])

export function SplitPanelProvider({ children }: { children: React.ReactNode }) {
  const [visibleTiers, setVisibleTiers] = useState<Set<HubTier>>(new Set(ALL_TIERS))
  const [infraLayers, setInfraLayers] = useState<Record<InfraLayerKey, boolean>>({
    highways: false, railroads: false, ports: false, airports: false,
  })
  const [boundaryLayers, setBoundaryLayers] = useState<Record<BoundaryLayerKey, boolean>>({
    regions: false, areas: false, counties: false,
  })

  const toggleTier = useCallback((tier: HubTier) => {
    setVisibleTiers(prev => {
      const next = new Set(prev)
      if (next.has(tier)) next.delete(tier)
      else next.add(tier)
      return next
    })
  }, [])

  const toggleInfraLayer = useCallback((key: InfraLayerKey) => {
    setInfraLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleBoundaryLayer = useCallback((key: BoundaryLayerKey) => {
    setBoundaryLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const value: LayerState = {
    visibleTiers,
    toggleTier,
    infraLayers,
    toggleInfraLayer,
    boundaryLayers,
    toggleBoundaryLayer,
    hubOpacity: 100,
    infraOpacity: 100,
    boundaryOpacity: 100,
  }

  return (
    <SplitPanelContext.Provider value={value}>
      {children}
    </SplitPanelContext.Provider>
  )
}
