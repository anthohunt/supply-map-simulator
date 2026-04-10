import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useFlowStore } from '@/stores/flowStore.ts'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useFlows } from '@/hooks/useFlows.ts'
import { useLayerState } from '@/hooks/useLayerState.ts'
import { formatTonnage } from '@/utils/format.ts'
import type { Hub, FreightFlow } from '@/types/index.ts'
import type { Corridor } from '@/stores/flowStore.ts'

interface AggregatedEdge {
  sourceHub: Hub
  targetHub: Hub
  totalVolume: number
  flows: FreightFlow[]
}

function aggregateFlowEdges(flows: FreightFlow[], hubMap: Map<string, Hub>): AggregatedEdge[] {
  const edgeMap = new Map<string, AggregatedEdge>()

  for (const flow of flows) {
    for (let i = 0; i < flow.routeHubIds.length - 1; i++) {
      const srcId = flow.routeHubIds[i]
      const tgtId = flow.routeHubIds[i + 1]
      const key = srcId < tgtId ? `${srcId}|${tgtId}` : `${tgtId}|${srcId}`

      if (!edgeMap.has(key)) {
        const sourceHub = hubMap.get(srcId)
        const targetHub = hubMap.get(tgtId)
        if (!sourceHub || !targetHub) continue
        edgeMap.set(key, {
          sourceHub,
          targetHub,
          totalVolume: 0,
          flows: [],
        })
      }
      const entry = edgeMap.get(key)!
      entry.totalVolume += flow.volumeTons
      entry.flows.push(flow)
    }
  }

  return Array.from(edgeMap.values())
}

function volumeToWeight(volume: number, maxVolume: number): number {
  if (maxVolume === 0) return 1
  const normalized = volume / maxVolume
  return Math.max(1, Math.round(normalized * 8))
}

function volumeToColor(volume: number, maxVolume: number): string {
  if (maxVolume === 0) return '#1FBAD6'
  const ratio = Math.min(volume / maxVolume, 1)
  // Gradient from cool (accent blue) to warm (warning orange/red)
  const r = Math.round(31 + (239 - 31) * ratio)
  const g = Math.round(186 + (83 - 186) * ratio)
  const b = Math.round(214 + (80 - 214) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

function buildCorridorEdgeKeys(corridor: Corridor, flows: FreightFlow[]): Set<string> {
  const keys = new Set<string>()
  const corridorFlows = flows.filter(
    (f) => f.originHubId === corridor.entryHubId && f.destinationHubId === corridor.exitHubId
  )
  for (const flow of corridorFlows) {
    for (let i = 0; i < flow.routeHubIds.length - 1; i++) {
      const a = flow.routeHubIds[i]
      const b = flow.routeHubIds[i + 1]
      keys.add(a < b ? `${a}|${b}` : `${b}|${a}`)
    }
  }
  return keys
}

export function FlowAnimationLayer() {
  const map = useMap()
  const { flowsEnabled } = useFlowStore()
  const { hubs, networkStatus } = useNetworkStore()
  const { filteredFlows, selectedCorridor } = useFlows()
  const { visibleTiers, hubOpacity } = useLayerState()
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<L.CircleMarker[]>([])

  const opacity = hubOpacity / 100

  useEffect(() => {
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map)
    }
    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.remove()
        layerGroupRef.current = null
      }
      cancelAnimationFrame(animationRef.current)
    }
  }, [map])

  useEffect(() => {
    const group = layerGroupRef.current
    if (!group) return

    group.clearLayers()
    for (const p of particlesRef.current) {
      p.remove()
    }
    particlesRef.current = []
    cancelAnimationFrame(animationRef.current)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!flowsEnabled || networkStatus !== 'complete' || filteredFlows.length === 0) return

    const hubMap = new Map(hubs.map((h) => [h.id, h]))

    // Filter flows by visible tiers
    const visibleFlows = filteredFlows.filter((flow) => {
      if (!flow.routeHubIds?.length) return false
      return flow.routeHubIds.every((hubId) => {
        const hub = hubMap.get(hubId)
        return hub && visibleTiers.has(hub.tier)
      })
    })

    if (visibleFlows.length === 0) return

    const aggregated = aggregateFlowEdges(visibleFlows, hubMap)
    const maxVolume = Math.max(...aggregated.map((e) => e.totalVolume), 1)

    // Build corridor edge keys for highlighting
    const corridorEdgeKeys = selectedCorridor
      ? buildCorridorEdgeKeys(selectedCorridor, filteredFlows)
      : null

    // Draw flow lines
    for (const edge of aggregated) {
      const srcId = edge.sourceHub.id
      const tgtId = edge.targetHub.id
      const edgeKey = srcId < tgtId ? `${srcId}|${tgtId}` : `${tgtId}|${srcId}`
      const isHighlighted = corridorEdgeKeys?.has(edgeKey) ?? false

      const weight = isHighlighted
        ? Math.max(volumeToWeight(edge.totalVolume, maxVolume) * 2, 5)
        : volumeToWeight(edge.totalVolume, maxVolume)
      const color = isHighlighted
        ? '#00E5FF'
        : volumeToColor(edge.totalVolume, maxVolume)
      const lineOpacity = isHighlighted ? 0.9 * opacity : 0.5 * opacity

      const line = L.polyline(
        [
          [edge.sourceHub.position[1], edge.sourceHub.position[0]],
          [edge.targetHub.position[1], edge.targetHub.position[0]],
        ],
        {
          color,
          weight,
          opacity: lineOpacity,
          interactive: true,
        }
      )

      // Tooltip with flow details
      const commodities = new Map<string, number>()
      for (const f of edge.flows) {
        commodities.set(f.commodity, (commodities.get(f.commodity) ?? 0) + f.volumeTons)
      }
      const topCommodity = [...commodities.entries()].sort((a, b) => b[1] - a[1])[0]

      line.bindTooltip(
        `<strong>${edge.sourceHub.name}</strong> \u2192 <strong>${edge.targetHub.name}</strong><br/>` +
        `Volume: ${formatTonnage(edge.totalVolume)}<br/>` +
        `Top commodity: ${topCommodity?.[0] ?? 'N/A'} (${formatTonnage(topCommodity?.[1] ?? 0)})`,
        { sticky: true }
      )

      group.addLayer(line)
    }

    // Skip particle animation if user prefers reduced motion
    if (prefersReducedMotion) return

    // Animate particles along flow edges
    const PARTICLE_COUNT = Math.min(aggregated.length * 2, 200)
    const particles: Array<{
      marker: L.CircleMarker
      edge: AggregatedEdge
      progress: number
      speed: number
    }> = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const edge = aggregated[i % aggregated.length]
      const color = volumeToColor(edge.totalVolume, maxVolume)
      const marker = L.circleMarker([0, 0], {
        radius: 2,
        color,
        fillColor: color,
        fillOpacity: 0.9 * opacity,
        weight: 0,
        interactive: false,
      }).addTo(map)
      particlesRef.current.push(marker)
      particles.push({
        marker,
        edge,
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
      })
    }

    function animate() {
      for (const p of particles) {
        p.progress += p.speed
        if (p.progress > 1) p.progress -= 1

        const srcLat = p.edge.sourceHub.position[1]
        const srcLng = p.edge.sourceHub.position[0]
        const tgtLat = p.edge.targetHub.position[1]
        const tgtLng = p.edge.targetHub.position[0]

        const lat = srcLat + (tgtLat - srcLat) * p.progress
        const lng = srcLng + (tgtLng - srcLng) * p.progress
        p.marker.setLatLng([lat, lng])
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [flowsEnabled, networkStatus, filteredFlows, hubs, visibleTiers, opacity, map, selectedCorridor])

  return null
}
