import type * as GeoJSON from 'geojson'

export interface Region {
  id: string
  areaIds: string[]
  centroid: [number, number]
  boundary: GeoJSON.Polygon
  totalDemand: number
  color: string
}
