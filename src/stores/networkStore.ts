import { create } from 'zustand'
import type { Area, Region, ClusteringParams, Hub, Edge, HubTier, County } from '@/types/index.ts'

export type PixelizationStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled'
export type NetworkGenerationStatus = 'idle' | 'running' | 'complete' | 'error'

interface NetworkState {
  counties: County[]
  areas: Area[]
  regions: Region[]
  pixelizationStatus: PixelizationStatus
  pixelizationProgress: number // 0-100
  pixelizationError: string | null
  params: ClusteringParams

  // Hub network state
  hubs: Hub[]
  edges: Edge[]
  networkStatus: NetworkGenerationStatus
  networkProgress: number
  networkError: string | null
  selectedHubId: string | null

  // Layer visibility
  visibleTiers: Set<HubTier>

  setCounties: (counties: County[]) => void
  setAreas: (areas: Area[]) => void
  setRegions: (regions: Region[]) => void
  setPixelizationStatus: (status: PixelizationStatus) => void
  setPixelizationProgress: (progress: number) => void
  setPixelizationError: (error: string | null) => void
  setParams: (params: Partial<ClusteringParams>) => void
  resetPixelization: () => void

  // Hub network actions
  setHubs: (hubs: Hub[]) => void
  setEdges: (edges: Edge[]) => void
  setNetworkStatus: (status: NetworkGenerationStatus) => void
  setNetworkProgress: (progress: number) => void
  setNetworkError: (error: string | null) => void
  setSelectedHubId: (id: string | null) => void
  toggleTier: (tier: HubTier) => void
  setVisibleTiers: (tiers: Set<HubTier>) => void
  resetNetwork: () => void
}

const defaultParams: ClusteringParams = {
  targetRegions: 4,
  demandBalanceWeight: 0.5,
  contiguityWeight: 0.5,
  compactnessWeight: 0.5,
  maxIterations: 100,
}

const allTiers = new Set<HubTier>(['global', 'regional', 'gateway'])

export const useNetworkStore = create<NetworkState>((set) => ({
  counties: [],
  areas: [],
  regions: [],
  pixelizationStatus: 'idle',
  pixelizationProgress: 0,
  pixelizationError: null,
  params: defaultParams,

  hubs: [],
  edges: [],
  networkStatus: 'idle',
  networkProgress: 0,
  networkError: null,
  selectedHubId: null,
  visibleTiers: new Set<HubTier>(allTiers),

  setCounties: (counties) => set({ counties }),
  setAreas: (areas) => set({ areas }),
  setRegions: (regions) => set({ regions }),
  setPixelizationStatus: (pixelizationStatus) => set({ pixelizationStatus }),
  setPixelizationProgress: (pixelizationProgress) => set({ pixelizationProgress }),
  setPixelizationError: (pixelizationError) => set({ pixelizationError }),
  setParams: (params) =>
    set((state) => ({ params: { ...state.params, ...params } })),
  resetPixelization: () =>
    set({
      counties: [],
      areas: [],
      regions: [],
      pixelizationStatus: 'idle',
      pixelizationProgress: 0,
      pixelizationError: null,
    }),

  setHubs: (hubs) => set({ hubs }),
  setEdges: (edges) => set({ edges }),
  setNetworkStatus: (networkStatus) => set({ networkStatus }),
  setNetworkProgress: (networkProgress) => set({ networkProgress }),
  setNetworkError: (networkError) => set({ networkError }),
  setSelectedHubId: (selectedHubId) => set({ selectedHubId }),
  toggleTier: (tier) =>
    set((state) => {
      const next = new Set(state.visibleTiers)
      if (next.has(tier)) {
        next.delete(tier)
      } else {
        next.add(tier)
      }
      return { visibleTiers: next }
    }),
  setVisibleTiers: (visibleTiers) => set({ visibleTiers }),
  resetNetwork: () =>
    set({
      hubs: [],
      edges: [],
      networkStatus: 'idle',
      networkProgress: 0,
      networkError: null,
      selectedHubId: null,
      visibleTiers: new Set<HubTier>(allTiers),
    }),
}))

