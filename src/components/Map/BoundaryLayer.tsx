import { GeoJSON, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import type { PathOptions } from 'leaflet'

export function BoundaryLayer() {
  const { areas, regions, pixelizationStatus } = useNetworkStore()
  const map = useMap()

  // Fit map to region bounds when pixelization completes
  useEffect(() => {
    if (pixelizationStatus !== 'complete' || regions.length === 0) return

    const allCoords: [number, number][] = []
    for (const region of regions) {
      for (const ring of region.boundary.coordinates) {
        for (const coord of ring) {
          const [lng, lat] = coord as [number, number]
          allCoords.push([lat, lng])
        }
      }
    }

    if (allCoords.length > 0) {
      const lats = allCoords.map((c) => c[0])
      const lngs = allCoords.map((c) => c[1])
      map.fitBounds([
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ], { padding: [20, 20] })
    }
  }, [pixelizationStatus, regions, map])

  if (pixelizationStatus !== 'complete') return null

  // Build GeoJSON FeatureCollections for areas and regions
  const areaFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: areas.map((area) => ({
      type: 'Feature' as const,
      properties: {
        id: area.id,
        regionId: area.regionId,
        totalDemand: area.totalDemand,
        countyCount: area.countyFips.length,
        isContiguous: area.isContiguous,
      },
      geometry: area.boundary,
    })),
  }

  const regionFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: regions.map((region) => ({
      type: 'Feature' as const,
      properties: {
        id: region.id,
        totalDemand: region.totalDemand,
        areaCount: region.areaIds.length,
        color: region.color,
      },
      geometry: region.boundary,
    })),
  }

  const regionColorMap = new Map(regions.map((r) => [r.id, r.color]))

  const areaStyle = (feature: GeoJSON.Feature | undefined): PathOptions => {
    const regionId = feature?.properties?.regionId as string | undefined
    const color = regionId ? regionColorMap.get(regionId) : '#1FBAD6'
    return {
      color: color ?? '#1FBAD6',
      weight: 1,
      opacity: 0.6,
      fillColor: color ?? '#1FBAD6',
      fillOpacity: 0.15,
    }
  }

  const regionStyle = (feature: GeoJSON.Feature | undefined): PathOptions => {
    const color = feature?.properties?.color as string | undefined
    return {
      color: color ?? '#F5A623',
      weight: 3,
      opacity: 0.8,
      fillColor: color ?? '#F5A623',
      fillOpacity: 0.05,
      dashArray: '8 4',
    }
  }

  return (
    <>
      <GeoJSON
        key={`areas-${areas.length}`}
        data={areaFeatures}
        style={areaStyle}
      />
      <GeoJSON
        key={`regions-${regions.length}`}
        data={regionFeatures}
        style={regionStyle}
      />
    </>
  )
}
