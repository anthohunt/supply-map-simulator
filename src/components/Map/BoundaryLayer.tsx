import { GeoJSON, useMap, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { useNetworkStore } from '@/stores/networkStore.ts'
import { useLayerState } from '@/hooks/useLayerState.ts'
import type { PathOptions } from 'leaflet'

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  })
  return null
}

export function BoundaryLayer() {
  const { counties, areas, regions, pixelizationStatus } = useNetworkStore()
  const { boundaryLayers, boundaryOpacity } = useLayerState()
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  const opacity = boundaryOpacity / 100

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

  const showRegions = boundaryLayers.regions
  const showAreas = boundaryLayers.areas
  const showCounties = boundaryLayers.counties

  // If no boundary layers are toggled on, don't render anything
  if (!showRegions && !showAreas && !showCounties) return null

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

  // Build county-to-region color map via areas
  const countyRegionColorMap = new Map<string, string>()
  for (const area of areas) {
    const color = regionColorMap.get(area.regionId) ?? '#6A7485'
    for (const fips of area.countyFips) {
      countyRegionColorMap.set(fips, color)
    }
  }

  // Build county GeoJSON FeatureCollection
  const countyFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: counties.map((county) => ({
      type: 'Feature' as const,
      properties: {
        fips: county.fips,
        name: county.name,
        state: county.state,
        demandTons: county.demandTons,
      },
      geometry: county.boundary,
    })),
  }

  const countyStyle = (feature: GeoJSON.Feature | undefined): PathOptions => {
    const fips = feature?.properties?.fips as string | undefined
    const color = fips ? countyRegionColorMap.get(fips) ?? '#6A7485' : '#6A7485'
    return {
      color,
      weight: 0.5,
      opacity: 0.5 * opacity,
      fillColor: color,
      fillOpacity: 0.08 * opacity,
    }
  }

  const showCountyLabels = zoom >= 8

  const areaStyle = (feature: GeoJSON.Feature | undefined): PathOptions => {
    const regionId = feature?.properties?.regionId as string | undefined
    const color = regionId ? regionColorMap.get(regionId) : '#1FBAD6'
    return {
      color: color ?? '#1FBAD6',
      weight: 1,
      opacity: 0.6 * opacity,
      fillColor: color ?? '#1FBAD6',
      fillOpacity: 0.15 * opacity,
    }
  }

  const regionStyle = (feature: GeoJSON.Feature | undefined): PathOptions => {
    const color = feature?.properties?.color as string | undefined
    return {
      color: color ?? '#F5A623',
      weight: 3,
      opacity: 0.8 * opacity,
      fillColor: color ?? '#F5A623',
      fillOpacity: 0.05 * opacity,
      dashArray: '8 4',
    }
  }

  return (
    <>
      <ZoomTracker onZoomChange={setZoom} />
      {showCounties && counties.length > 0 && (
        <GeoJSON
          key={`counties-${counties.length}-${opacity}-${zoom >= 8 ? 'labels' : 'no'}`}
          data={countyFeatures}
          style={countyStyle}
          onEachFeature={showCountyLabels ? (feature, layer) => {
            const name = feature.properties?.name as string
            if (name) {
              layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'county-label' })
            }
          } : undefined}
        />
      )}
      {showAreas && (
        <GeoJSON
          key={`areas-${areas.length}-${opacity}`}
          data={areaFeatures}
          style={areaStyle}
        />
      )}
      {showRegions && (
        <GeoJSON
          key={`regions-${regions.length}-${opacity}`}
          data={regionFeatures}
          style={regionStyle}
        />
      )}
    </>
  )
}
