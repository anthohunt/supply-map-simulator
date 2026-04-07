import { describe, it, expect, beforeEach } from 'vitest'
import { useTerritoryStore } from './territoryStore'
import type { Territory } from '@/types/index.ts'

const mockTerritory: Territory = {
  id: 'se-usa',
  name: 'Southeast USA',
  type: 'megaregion',
  boundary: {
    type: 'Polygon',
    coordinates: [[[-90, 25], [-75, 25], [-75, 37], [-90, 37], [-90, 25]]],
  },
  bbox: [-90, 25, -75, 37],
}

describe('territoryStore', () => {
  beforeEach(() => {
    useTerritoryStore.setState({
      selectedTerritory: null,
      searchQuery: '',
      currentScreen: 'territory-search',
    })
  })

  it('has correct initial state', () => {
    const state = useTerritoryStore.getState()
    expect(state.selectedTerritory).toBeNull()
    expect(state.searchQuery).toBe('')
    expect(state.currentScreen).toBe('territory-search')
  })

  it('sets selected territory', () => {
    useTerritoryStore.getState().setSelectedTerritory(mockTerritory)
    expect(useTerritoryStore.getState().selectedTerritory).toEqual(mockTerritory)
  })

  it('sets selected territory to null', () => {
    useTerritoryStore.getState().setSelectedTerritory(mockTerritory)
    useTerritoryStore.getState().setSelectedTerritory(null)
    expect(useTerritoryStore.getState().selectedTerritory).toBeNull()
  })

  it('sets search query', () => {
    useTerritoryStore.getState().setSearchQuery('southeast')
    expect(useTerritoryStore.getState().searchQuery).toBe('southeast')
  })

  it('sets current screen', () => {
    useTerritoryStore.getState().setCurrentScreen('data-pipeline')
    expect(useTerritoryStore.getState().currentScreen).toBe('data-pipeline')

    useTerritoryStore.getState().setCurrentScreen('network-map')
    expect(useTerritoryStore.getState().currentScreen).toBe('network-map')
  })

  it('clears territory and resets all fields', () => {
    useTerritoryStore.getState().setSelectedTerritory(mockTerritory)
    useTerritoryStore.getState().setSearchQuery('southeast')
    useTerritoryStore.getState().setCurrentScreen('data-pipeline')

    useTerritoryStore.getState().clearTerritory()

    const state = useTerritoryStore.getState()
    expect(state.selectedTerritory).toBeNull()
    expect(state.searchQuery).toBe('')
    expect(state.currentScreen).toBe('territory-search')
  })
})
