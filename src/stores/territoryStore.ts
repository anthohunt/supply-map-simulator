import { create } from 'zustand'
import type { Territory } from '@/types/index.ts'

export type AppScreen = 'territory-search' | 'data-pipeline' | 'pixelization' | 'network-map'

interface TerritoryState {
  selectedTerritory: Territory | null
  searchQuery: string
  currentScreen: AppScreen
  setSelectedTerritory: (territory: Territory | null) => void
  setSearchQuery: (query: string) => void
  setCurrentScreen: (screen: AppScreen) => void
  clearTerritory: () => void
}

export const useTerritoryStore = create<TerritoryState>((set) => ({
  selectedTerritory: null,
  searchQuery: '',
  currentScreen: 'territory-search',
  setSelectedTerritory: (territory) => set({ selectedTerritory: territory }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  clearTerritory: () =>
    set({
      selectedTerritory: null,
      searchQuery: '',
      currentScreen: 'territory-search',
    }),
}))
