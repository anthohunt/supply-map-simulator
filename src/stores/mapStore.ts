import { create } from 'zustand'

export type TileStyle = 'dark' | 'light' | 'satellite' | 'terrain'

export type InfraLayerKey = 'highways' | 'railroads' | 'ports' | 'airports'
export type BoundaryLayerKey = 'regions' | 'areas' | 'counties'

interface MapState {
  tileStyle: TileStyle
  setTileStyle: (style: TileStyle) => void

  // Split view
  splitViewEnabled: boolean
  setSplitViewEnabled: (enabled: boolean) => void

  // 3D projection
  threeDEnabled: boolean
  setThreeDEnabled: (enabled: boolean) => void

  // Infrastructure overlays
  infraLayers: Record<InfraLayerKey, boolean>
  toggleInfraLayer: (key: InfraLayerKey) => void

  // Boundary overlays
  boundaryLayers: Record<BoundaryLayerKey, boolean>
  toggleBoundaryLayer: (key: BoundaryLayerKey) => void

  // Opacity sliders (0-100)
  hubOpacity: number
  infraOpacity: number
  boundaryOpacity: number
  setHubOpacity: (value: number) => void
  setInfraOpacity: (value: number) => void
  setBoundaryOpacity: (value: number) => void
}

function loadPersistedTileStyle(): TileStyle {
  try {
    const stored = localStorage.getItem('supply-map-tile-style')
    if (stored === 'dark' || stored === 'light' || stored === 'satellite' || stored === 'terrain') {
      return stored
    }
  } catch {
    // localStorage unavailable
  }
  return 'dark'
}

export const useMapStore = create<MapState>((set) => ({
  tileStyle: loadPersistedTileStyle(),
  setTileStyle: (tileStyle) => {
    try {
      localStorage.setItem('supply-map-tile-style', tileStyle)
    } catch {
      // localStorage unavailable
    }
    set({ tileStyle })
  },

  splitViewEnabled: false,
  setSplitViewEnabled: (splitViewEnabled) => set({ splitViewEnabled }),

  threeDEnabled: false,
  setThreeDEnabled: (threeDEnabled) => set({ threeDEnabled }),

  infraLayers: { highways: false, railroads: false, ports: false, airports: false },
  toggleInfraLayer: (key) =>
    set((state) => ({
      infraLayers: { ...state.infraLayers, [key]: !state.infraLayers[key] },
    })),

  boundaryLayers: { regions: false, areas: false, counties: false },
  toggleBoundaryLayer: (key) =>
    set((state) => ({
      boundaryLayers: { ...state.boundaryLayers, [key]: !state.boundaryLayers[key] },
    })),

  hubOpacity: 100,
  infraOpacity: 100,
  boundaryOpacity: 100,
  setHubOpacity: (hubOpacity) => set({ hubOpacity }),
  setInfraOpacity: (infraOpacity) => set({ infraOpacity }),
  setBoundaryOpacity: (boundaryOpacity) => set({ boundaryOpacity }),
}))
