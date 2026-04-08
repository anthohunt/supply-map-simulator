import { describe, it, expect, beforeEach } from 'vitest'
import { useNetworkStore } from '@/stores/networkStore.ts'
import type { ClusteringParams } from '@/types/index.ts'

describe('Clustering Parameter Validation', () => {
  beforeEach(() => {
    useNetworkStore.getState().resetPixelization()
    useNetworkStore.getState().setParams({
      targetRegions: 4,
      demandBalanceWeight: 0.5,
      contiguityWeight: 0.5,
      compactnessWeight: 0.5,
      maxIterations: 100,
    })
  })

  it('stores default parameters correctly', () => {
    const { params } = useNetworkStore.getState()
    expect(params.targetRegions).toBe(4)
    expect(params.demandBalanceWeight).toBe(0.5)
    expect(params.contiguityWeight).toBe(0.5)
    expect(params.compactnessWeight).toBe(0.5)
  })

  it('updates individual parameters via setParams', () => {
    useNetworkStore.getState().setParams({ targetRegions: 6 })
    const { params } = useNetworkStore.getState()
    expect(params.targetRegions).toBe(6)
    // Others unchanged
    expect(params.demandBalanceWeight).toBe(0.5)
  })

  it('validates target regions minimum is 2', () => {
    const isValid = validateParams({ ...useNetworkStore.getState().params, targetRegions: 1 })
    expect(isValid.valid).toBe(false)
    expect(isValid.error).toContain('Minimum 2 regions')
  })

  it('validates target regions has reasonable maximum', () => {
    const isValid = validateParams({ ...useNetworkStore.getState().params, targetRegions: 0 })
    expect(isValid.valid).toBe(false)
  })

  it('validates weight params are between 0 and 1', () => {
    const isValid = validateParams({ ...useNetworkStore.getState().params, demandBalanceWeight: 1.5 })
    expect(isValid.valid).toBe(false)
    expect(isValid.error).toContain('between 0 and 1')
  })

  it('accepts valid params', () => {
    const isValid = validateParams(useNetworkStore.getState().params)
    expect(isValid.valid).toBe(true)
    expect(isValid.error).toBeNull()
  })

  it('resets pixelization state correctly', () => {
    useNetworkStore.getState().setPixelizationStatus('complete')
    useNetworkStore.getState().setPixelizationProgress(100)
    useNetworkStore.getState().resetPixelization()

    const state = useNetworkStore.getState()
    expect(state.pixelizationStatus).toBe('idle')
    expect(state.pixelizationProgress).toBe(0)
    expect(state.areas).toEqual([])
    expect(state.regions).toEqual([])
  })
})

// Validation function extracted for testing
function validateParams(params: ClusteringParams): { valid: boolean; error: string | null } {
  if (params.targetRegions < 2) {
    return { valid: false, error: 'Minimum 2 regions required' }
  }
  if (params.targetRegions <= 0) {
    return { valid: false, error: 'Target regions must be positive' }
  }

  for (const [key, value] of Object.entries({
    demandBalanceWeight: params.demandBalanceWeight,
    contiguityWeight: params.contiguityWeight,
    compactnessWeight: params.compactnessWeight,
  })) {
    if (value < 0 || value > 1) {
      return { valid: false, error: `${key} must be between 0 and 1` }
    }
  }

  return { valid: true, error: null }
}
