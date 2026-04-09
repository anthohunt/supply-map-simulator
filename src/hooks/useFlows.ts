import { useMemo, useCallback, useEffect } from 'react'
import { useFlowStore, type Corridor } from '@/stores/flowStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { routeFlows } from '@/services/networkOptimizer.ts'
import type { FreightFlow } from '@/types/index.ts'

export function useFlows() {
  const { flows, flowsEnabled, filters, corridors, selectedCorridorId, setFlows, setCorridors } = useFlowStore()
  const { hubs, edges, networkStatus, counties } = useNetworkStore()
  const fafRecords = usePipelineStore((s) => s.faf.records)

  // Compute flows when network is ready and we have FAF records
  const computeFlows = useCallback(() => {
    if (networkStatus !== 'complete' || hubs.length === 0 || edges.length === 0) return

    const countyPositions = new Map<string, [number, number]>()
    for (const county of counties) {
      countyPositions.set(county.fips, county.centroid)
    }

    const records = fafRecords ?? []
    const computed = routeFlows(records, hubs, edges, countyPositions)
    setFlows(computed)

    // Compute corridors from flows
    const corridorMap = new Map<string, { flows: FreightFlow[]; hubIds: Set<string> }>()
    for (const flow of computed) {
      const key = `${flow.originHubId}->${flow.destinationHubId}`
      if (!corridorMap.has(key)) {
        corridorMap.set(key, { flows: [], hubIds: new Set() })
      }
      const entry = corridorMap.get(key)!
      entry.flows.push(flow)
      for (const hubId of flow.routeHubIds) {
        entry.hubIds.add(hubId)
      }
    }

    const hubMap = new Map(hubs.map((h) => [h.id, h]))
    const computedCorridors: Corridor[] = []
    let corridorIdx = 0
    for (const [, value] of corridorMap) {
      const totalThroughput = value.flows.reduce((sum, f) => sum + f.volumeTons, 0)
      const commodities: Record<string, number> = {}
      for (const f of value.flows) {
        commodities[f.commodity] = (commodities[f.commodity] ?? 0) + f.volumeTons
      }
      const hubIds = Array.from(value.hubIds)
      const entryHub = hubMap.get(value.flows[0].originHubId)
      const exitHub = hubMap.get(value.flows[0].destinationHubId)
      computedCorridors.push({
        id: `corridor-${++corridorIdx}`,
        name: `${entryHub?.name ?? 'Unknown'} \u2192 ${exitHub?.name ?? 'Unknown'}`,
        hubIds,
        totalThroughput,
        commodities,
        entryHubId: value.flows[0].originHubId,
        exitHubId: value.flows[0].destinationHubId,
      })
    }

    computedCorridors.sort((a, b) => b.totalThroughput - a.totalThroughput)
    setCorridors(computedCorridors)
  }, [networkStatus, hubs, edges, counties, fafRecords, setFlows, setCorridors])

  // Auto-compute when network completes
  useEffect(() => {
    if (networkStatus === 'complete' && flows.length === 0 && hubs.length > 0) {
      computeFlows()
    }
  }, [networkStatus, flows.length, hubs.length, computeFlows])

  // Apply filters
  const filteredFlows = useMemo(() => {
    let result = flows
    if (filters.originHubId) {
      result = result.filter((f) => f.originHubId === filters.originHubId)
    }
    if (filters.destinationHubId) {
      result = result.filter((f) => f.destinationHubId === filters.destinationHubId)
    }
    if (filters.commodity) {
      result = result.filter((f) => f.commodity === filters.commodity)
    }
    if (filters.minVolume > 0) {
      result = result.filter((f) => f.volumeTons >= filters.minVolume)
    }
    return result
  }, [flows, filters])

  // Filter corridors to match
  const filteredCorridors = useMemo(() => {
    if (!filters.originHubId && !filters.destinationHubId && !filters.commodity && filters.minVolume === 0) {
      return corridors
    }
    // Recompute corridors from filtered flows
    const corridorMap = new Map<string, FreightFlow[]>()
    for (const flow of filteredFlows) {
      const key = `${flow.originHubId}->${flow.destinationHubId}`
      if (!corridorMap.has(key)) corridorMap.set(key, [])
      corridorMap.get(key)!.push(flow)
    }
    const hubMap = new Map(hubs.map((h) => [h.id, h]))
    const result: Corridor[] = []
    let idx = 0
    for (const [, flowGroup] of corridorMap) {
      const totalThroughput = flowGroup.reduce((sum, f) => sum + f.volumeTons, 0)
      const commodities: Record<string, number> = {}
      const hubIds = new Set<string>()
      for (const f of flowGroup) {
        commodities[f.commodity] = (commodities[f.commodity] ?? 0) + f.volumeTons
        for (const hId of f.routeHubIds) hubIds.add(hId)
      }
      const entryHub = hubMap.get(flowGroup[0].originHubId)
      const exitHub = hubMap.get(flowGroup[0].destinationHubId)
      result.push({
        id: `fcorr-${++idx}`,
        name: `${entryHub?.name ?? 'Unknown'} \u2192 ${exitHub?.name ?? 'Unknown'}`,
        hubIds: Array.from(hubIds),
        totalThroughput,
        commodities,
        entryHubId: flowGroup[0].originHubId,
        exitHubId: flowGroup[0].destinationHubId,
      })
    }
    result.sort((a, b) => b.totalThroughput - a.totalThroughput)
    return result
  }, [filteredFlows, corridors, filters, hubs])

  // Unique values for filter dropdowns
  const uniqueOrigins = useMemo(() => [...new Set(flows.map((f) => f.originHubId))], [flows])
  const uniqueDestinations = useMemo(() => [...new Set(flows.map((f) => f.destinationHubId))], [flows])
  const uniqueCommodities = useMemo(() => [...new Set(flows.map((f) => f.commodity))].sort(), [flows])
  const maxVolume = useMemo(() => {
    if (flows.length === 0) return 0
    return Math.max(...flows.map((f) => f.volumeTons))
  }, [flows])

  const selectedCorridor = useMemo(
    () => filteredCorridors.find((c) => c.id === selectedCorridorId) ?? null,
    [filteredCorridors, selectedCorridorId]
  )

  return {
    flows,
    filteredFlows,
    flowsEnabled,
    corridors: filteredCorridors,
    selectedCorridor,
    selectedCorridorId,
    uniqueOrigins,
    uniqueDestinations,
    uniqueCommodities,
    maxVolume,
    filters,
    computeFlows,
  }
}
