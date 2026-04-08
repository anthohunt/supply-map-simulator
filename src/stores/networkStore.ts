import { create } from 'zustand'
import type { Area, Region, ClusteringParams } from '@/types/index.ts'

export type PixelizationStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled'

interface NetworkState {
  areas: Area[]
  regions: Region[]
  pixelizationStatus: PixelizationStatus
  pixelizationProgress: number // 0-100
  pixelizationError: string | null
  params: ClusteringParams
  setAreas: (areas: Area[]) => void
  setRegions: (regions: Region[]) => void
  setPixelizationStatus: (status: PixelizationStatus) => void
  setPixelizationProgress: (progress: number) => void
  setPixelizationError: (error: string | null) => void
  setParams: (params: Partial<ClusteringParams>) => void
  resetPixelization: () => void
}

const defaultParams: ClusteringParams = {
  targetRegions: 4,
  demandBalanceWeight: 0.5,
  contiguityWeight: 0.5,
  compactnessWeight: 0.5,
  maxIterations: 100,
}

export const useNetworkStore = create<NetworkState>((set) => ({
  areas: [],
  regions: [],
  pixelizationStatus: 'idle',
  pixelizationProgress: 0,
  pixelizationError: null,
  params: defaultParams,
  setAreas: (areas) => set({ areas }),
  setRegions: (regions) => set({ regions }),
  setPixelizationStatus: (pixelizationStatus) => set({ pixelizationStatus }),
  setPixelizationProgress: (pixelizationProgress) => set({ pixelizationProgress }),
  setPixelizationError: (pixelizationError) => set({ pixelizationError }),
  setParams: (params) =>
    set((state) => ({ params: { ...state.params, ...params } })),
  resetPixelization: () =>
    set({
      areas: [],
      regions: [],
      pixelizationStatus: 'idle',
      pixelizationProgress: 0,
      pixelizationError: null,
    }),
}))
