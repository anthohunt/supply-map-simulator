import type * as GeoJSON from 'geojson'

export interface Area {
  id: string
  regionId: string
  countyFips: string[]
  centroid: [number, number]
  boundary: GeoJSON.Polygon
  totalDemand: number
  isContiguous: boolean
}
