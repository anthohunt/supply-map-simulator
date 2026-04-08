import { useMapStore } from '@/stores/mapStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useSplitPanelContext, type LayerState } from '@/contexts/SplitPanelContext.tsx'

/**
 * Returns layer state for the current map panel.
 * If inside a SplitPanelProvider (right panel), returns independent local state.
 * Otherwise, returns the global store state (left panel / single view).
 */
export function useLayerState(): LayerState {
  const splitCtx = useSplitPanelContext()

  const { infraLayers, toggleInfraLayer, boundaryLayers, toggleBoundaryLayer, hubOpacity, infraOpacity, boundaryOpacity } = useMapStore()
  const { visibleTiers, toggleTier } = useNetworkStore()

  if (splitCtx) return splitCtx

  return {
    visibleTiers,
    toggleTier,
    infraLayers,
    toggleInfraLayer,
    boundaryLayers,
    toggleBoundaryLayer,
    hubOpacity,
    infraOpacity,
    boundaryOpacity,
  }
}
