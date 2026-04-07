import { describe, it, expect, beforeEach } from 'vitest'
import { usePipelineStore } from './pipelineStore'

describe('pipelineStore', () => {
  beforeEach(() => {
    usePipelineStore.getState().resetPipeline()
  })

  describe('initial state', () => {
    it('has idle status for all sources', () => {
      const { faf, osm, infra } = usePipelineStore.getState()
      expect(faf.status).toBe('idle')
      expect(osm.status).toBe('idle')
      expect(infra.status).toBe('idle')
    })

    it('has zero overall progress', () => {
      expect(usePipelineStore.getState().overallProgress).toBe(0)
    })

    it('has empty records and counts', () => {
      const { faf, osm, infra } = usePipelineStore.getState()
      expect(faf.records).toEqual([])
      expect(faf.totalTonnage).toBe(0)
      expect(faf.countyPairCount).toBe(0)
      expect(faf.commodityTypes).toEqual([])
      expect(osm.interstateCount).toBe(0)
      expect(osm.totalRoadKm).toBe(0)
      expect(infra.sites).toEqual([])
      expect(infra.warehouseCount).toBe(0)
    })
  })

  describe('setFAF', () => {
    it('updates FAF status to loading', () => {
      usePipelineStore.getState().setFAF({ status: 'loading', progress: 25 })
      const { faf } = usePipelineStore.getState()
      expect(faf.status).toBe('loading')
      expect(faf.progress).toBe(25)
    })

    it('updates FAF to complete with data', () => {
      usePipelineStore.getState().setFAF({
        status: 'complete',
        records: [
          { originFips: '13001', destFips: '13002', commodity: 'Grain', annualTons: 50000, mode: 'Truck' },
        ],
        totalTonnage: 50000,
        countyPairCount: 1,
        commodityTypes: ['Grain'],
      })
      const { faf } = usePipelineStore.getState()
      expect(faf.status).toBe('complete')
      expect(faf.records).toHaveLength(1)
      expect(faf.totalTonnage).toBe(50000)
    })

    it('updates FAF error state', () => {
      usePipelineStore.getState().setFAF({ status: 'error', errorMessage: 'Network error' })
      const { faf } = usePipelineStore.getState()
      expect(faf.status).toBe('error')
      expect(faf.errorMessage).toBe('Network error')
    })
  })

  describe('setOSM', () => {
    it('updates road and rail progress independently', () => {
      usePipelineStore.getState().setOSM({ status: 'loading', roadProgress: 60, railProgress: 30 })
      const { osm } = usePipelineStore.getState()
      expect(osm.roadProgress).toBe(60)
      expect(osm.railProgress).toBe(30)
    })

    it('updates OSM to complete with counts', () => {
      usePipelineStore.getState().setOSM({
        status: 'complete',
        interstateCount: 12,
        highwayCount: 47,
        railroadCount: 23,
        yardCount: 8,
        totalRoadKm: 14832,
        totalRailKm: 6241,
      })
      const { osm } = usePipelineStore.getState()
      expect(osm.status).toBe('complete')
      expect(osm.interstateCount).toBe(12)
      expect(osm.totalRailKm).toBe(6241)
    })
  })

  describe('setInfra', () => {
    it('updates infrastructure progress', () => {
      usePipelineStore.getState().setInfra({ status: 'loading', progress: 50 })
      expect(usePipelineStore.getState().infra.progress).toBe(50)
    })

    it('updates infrastructure to complete with site counts', () => {
      usePipelineStore.getState().setInfra({
        status: 'complete',
        warehouseCount: 3,
        terminalCount: 2,
        dcCount: 3,
        portCount: 3,
        airportCount: 2,
        railYardCount: 2,
      })
      const { infra } = usePipelineStore.getState()
      expect(infra.warehouseCount).toBe(3)
      expect(infra.portCount).toBe(3)
    })
  })

  describe('overallProgress', () => {
    it('calculates weighted progress (FAF 40%, OSM 35%, Infra 25%)', () => {
      // FAF at 50% progress, OSM road 40% + rail 60% = avg 50%, Infra at 50%
      usePipelineStore.getState().setFAF({ progress: 50 })
      usePipelineStore.getState().setOSM({ roadProgress: 40, railProgress: 60 })
      usePipelineStore.getState().setInfra({ progress: 50 })

      // 50*0.4 + 50*0.35 + 50*0.25 = 20 + 17.5 + 12.5 = 50
      expect(usePipelineStore.getState().overallProgress).toBe(50)
    })

    it('reaches 100 when all sources complete', () => {
      usePipelineStore.getState().setFAF({ status: 'complete' })
      usePipelineStore.getState().setOSM({ status: 'complete' })
      usePipelineStore.getState().setInfra({ status: 'complete' })

      expect(usePipelineStore.getState().overallProgress).toBe(100)
    })

    it('shows partial progress when only FAF completes', () => {
      usePipelineStore.getState().setFAF({ status: 'complete' })
      // FAF=100*0.4=40, OSM=0*0.35=0, Infra=0*0.25=0 => 40
      expect(usePipelineStore.getState().overallProgress).toBe(40)
    })
  })

  describe('resetPipeline', () => {
    it('resets everything to initial state', () => {
      usePipelineStore.getState().setFAF({ status: 'complete', progress: 100 })
      usePipelineStore.getState().setOSM({ status: 'complete' })
      usePipelineStore.getState().setInfra({ status: 'complete' })

      usePipelineStore.getState().resetPipeline()

      const state = usePipelineStore.getState()
      expect(state.faf.status).toBe('idle')
      expect(state.osm.status).toBe('idle')
      expect(state.infra.status).toBe('idle')
      expect(state.overallProgress).toBe(0)
    })
  })
})
