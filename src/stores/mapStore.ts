import { create } from 'zustand'

export type TileStyle = 'dark' | 'light' | 'satellite' | 'terrain'

interface MapState {
  tileStyle: TileStyle
  setTileStyle: (style: TileStyle) => void
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
}))
