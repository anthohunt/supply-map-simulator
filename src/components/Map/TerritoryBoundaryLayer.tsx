import { GeoJSON, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import { useTerritoryStore } from '@/stores/territoryStore.ts'
import type { PathOptions } from 'leaflet'

const boundaryStyle: PathOptions = {
  color: '#1FBAD6',
  weight: 2,
  opacity: 0.8,
  fillColor: '#1FBAD6',
  fillOpacity: 0.1,
  dashArray: '6 3',
}

export function TerritoryBoundaryLayer() {
  const { selectedTerritory } = useTerritoryStore()
  const map = useMap()

  const featureCollection = useMemo(() => {
    if (!selectedTerritory?.boundary) return null
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { name: selectedTerritory.name },
          geometry: selectedTerritory.boundary,
        },
      ],
    }
  }, [selectedTerritory])

  // Fit map to territory boundary when selected
  useEffect(() => {
    if (!selectedTerritory?.bbox) return
    const [west, south, east, north] = selectedTerritory.bbox
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [20, 20] }
    )
  }, [selectedTerritory, map])

  if (!featureCollection) return null

  return (
    <GeoJSON
      key={selectedTerritory?.id ?? 'none'}
      data={featureCollection}
      style={() => boundaryStyle}
    />
  )
}
