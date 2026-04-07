import type * as GeoJSON from 'geojson'

export interface County {
  fips: string
  name: string
  state: string
  centroid: [number, number] // [lng, lat]
  boundary: GeoJSON.Polygon
  demandTons: number
  peakDailyTons: number
  commodities: Record<string, number> // commodity -> tons
}
