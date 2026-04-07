import type * as GeoJSON from 'geojson'

export type TerritoryType = 'megaregion' | 'country' | 'state' | 'custom'

export interface Territory {
  id: string
  name: string
  type: TerritoryType
  boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon
  bbox: [number, number, number, number] // [west, south, east, north]
}
