import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { usePipelineStore } from '@/stores/pipelineStore.ts'
import { useLayerState } from '@/hooks/useLayerState.ts'
import type { RoadSegment, RailSegment } from '@/services/osmService.ts'

const ROAD_COLORS: Record<RoadSegment['type'], string> = {
  interstate: '#F5A623',
  highway: '#E0E0E0',
  trunk: '#B0BEC5',
}

const ROAD_WEIGHTS: Record<RoadSegment['type'], number> = {
  interstate: 2.5,
  highway: 1.5,
  trunk: 1.5,
}

const canvasRenderer = L.canvas({ padding: 0.5 })

export function InfrastructureLayer() {
  const { osm, infra } = usePipelineStore()
  const { infraLayers, infraOpacity } = useLayerState()
  const map = useMap()
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = L.layerGroup().addTo(map)
    }
    return () => {
      if (layerRef.current) {
        layerRef.current.remove()
        layerRef.current = null
      }
    }
  }, [map])

  useEffect(() => {
    const group = layerRef.current
    if (!group) return

    group.clearLayers()

    if (osm.status !== 'complete' && osm.status !== 'partial') return

    const opacity = infraOpacity / 100

    // Highways
    if (infraLayers.highways && osm.roadSegments.length > 0) {
      const roadFeatures: GeoJSON.Feature[] = osm.roadSegments.map((seg) => ({
        type: 'Feature' as const,
        geometry: seg.geometry,
        properties: { type: seg.type, ref: seg.ref, lengthKm: seg.lengthKm },
      }))

      const roadLayer = L.geoJSON(
        { type: 'FeatureCollection', features: roadFeatures },
        {
          renderer: canvasRenderer,
          style: (feature) => {
            const t = feature?.properties?.type as RoadSegment['type']
            return {
              color: ROAD_COLORS[t] || '#B0BEC5',
              weight: ROAD_WEIGHTS[t] || 1.5,
              opacity: opacity * 0.7,
            }
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties
            layer.bindTooltip(`${p.ref || p.type} — ${p.lengthKm.toFixed(1)} km`, { sticky: true })
          },
        }
      )
      group.addLayer(roadLayer)
    }

    // Railroads
    if (infraLayers.railroads && osm.railSegments.length > 0) {
      const railLineFeatures: GeoJSON.Feature[] = []
      const railYardFeatures: GeoJSON.Feature[] = []

      for (const seg of osm.railSegments) {
        if (seg.geometry.type === 'Point') {
          railYardFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: seg.geometry.coordinates },
            properties: { operator: seg.operator },
          })
        } else {
          railLineFeatures.push({
            type: 'Feature',
            geometry: seg.geometry,
            properties: { operator: seg.operator, lengthKm: seg.lengthKm },
          })
        }
      }

      if (railLineFeatures.length > 0) {
        const railLineLayer = L.geoJSON(
          { type: 'FeatureCollection', features: railLineFeatures },
          {
            renderer: canvasRenderer,
            style: () => ({
              color: '#AB47BC',
              weight: 1.5,
              opacity: opacity * 0.6,
              dashArray: '4 4',
            }),
            onEachFeature: (feature, layer) => {
              const p = feature.properties
              layer.bindTooltip(
                `Railroad${p.operator ? ` — ${p.operator}` : ''} — ${p.lengthKm.toFixed(1)} km`,
                { sticky: true }
              )
            },
          }
        )
        group.addLayer(railLineLayer)
      }

      if (railYardFeatures.length > 0) {
        const yardLayer = L.geoJSON(
          { type: 'FeatureCollection', features: railYardFeatures },
          {
            renderer: canvasRenderer,
            pointToLayer: (_feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 4,
                color: '#AB47BC',
                fillColor: '#AB47BC',
                fillOpacity: opacity * 0.7,
                weight: 1,
                opacity: opacity * 0.8,
              }),
            onEachFeature: (feature, layer) => {
              const p = feature.properties
              layer.bindTooltip(`Rail Yard${p.operator ? ` — ${p.operator}` : ''}`)
            },
          }
        )
        group.addLayer(yardLayer)
      }
    }

    // Ports
    const portSites = infra.status === 'complete' ? infra.sites.filter((s) => s.type === 'port') : []
    if (infraLayers.ports && portSites.length > 0) {
      const portFeatures: GeoJSON.Feature[] = portSites.map((site) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: site.position },
        properties: { name: site.name },
      }))
      const portLayer = L.geoJSON(
        { type: 'FeatureCollection', features: portFeatures },
        {
          renderer: canvasRenderer,
          pointToLayer: (_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 6,
              color: '#1FBAD6',
              fillColor: '#1FBAD6',
              fillOpacity: opacity * 0.8,
              weight: 2,
              opacity: opacity,
            }),
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(`${feature.properties.name} (Port)`)
          },
        }
      )
      group.addLayer(portLayer)
    }

    // Airports
    const airportSites = infra.status === 'complete' ? infra.sites.filter((s) => s.type === 'airport') : []
    if (infraLayers.airports && airportSites.length > 0) {
      const airportFeatures: GeoJSON.Feature[] = airportSites.map((site) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: site.position },
        properties: { name: site.name },
      }))
      const airportLayer = L.geoJSON(
        { type: 'FeatureCollection', features: airportFeatures },
        {
          renderer: canvasRenderer,
          pointToLayer: (_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 6,
              color: '#66BB6A',
              fillColor: '#66BB6A',
              fillOpacity: opacity * 0.8,
              weight: 2,
              opacity: opacity,
            }),
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(`${feature.properties.name} (Airport)`)
          },
        }
      )
      group.addLayer(airportLayer)
    }
  }, [osm, infra, infraLayers, infraOpacity, map])

  return null
}
