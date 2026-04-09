import { create } from 'zustand'
import type { FreightFlow } from '@/types/index.ts'

export interface FlowFilters {
  originHubId: string | null
  destinationHubId: string | null
  commodity: string | null
  minVolume: number
}

export interface Corridor {
  id: string
  name: string
  hubIds: string[]
  totalThroughput: number
  commodities: Record<string, number>
  entryHubId: string
  exitHubId: string
}

interface FlowState {
  flows: FreightFlow[]
  flowsEnabled: boolean
  filters: FlowFilters
  selectedCorridorId: string | null
  corridors: Corridor[]

  setFlows: (flows: FreightFlow[]) => void
  setFlowsEnabled: (enabled: boolean) => void
  setFilter: (filter: Partial<FlowFilters>) => void
  clearFilters: () => void
  setSelectedCorridorId: (id: string | null) => void
  setCorridors: (corridors: Corridor[]) => void
  resetFlows: () => void
}

const defaultFilters: FlowFilters = {
  originHubId: null,
  destinationHubId: null,
  commodity: null,
  minVolume: 0,
}

export const useFlowStore = create<FlowState>((set) => ({
  flows: [],
  flowsEnabled: false,
  filters: defaultFilters,
  selectedCorridorId: null,
  corridors: [],

  setFlows: (flows) => set({ flows }),
  setFlowsEnabled: (flowsEnabled) => set({ flowsEnabled }),
  setFilter: (filter) =>
    set((state) => ({ filters: { ...state.filters, ...filter } })),
  clearFilters: () => set({ filters: defaultFilters }),
  setSelectedCorridorId: (selectedCorridorId) => set({ selectedCorridorId }),
  setCorridors: (corridors) => set({ corridors }),
  resetFlows: () =>
    set({
      flows: [],
      flowsEnabled: false,
      filters: defaultFilters,
      selectedCorridorId: null,
      corridors: [],
    }),
}))

