import { describe, it, expect } from 'vitest'
import { haversine, bboxFromCoordinates, centroid } from './geo'

describe('haversine', () => {
  it('returns 0 for the same point', () => {
    const point: [number, number] = [-84.39, 33.75]
    expect(haversine(point, point)).toBe(0)
  })

  it('calculates distance between New York and Los Angeles (~3944 km)', () => {
    const nyc: [number, number] = [-74.006, 40.7128]
    const la: [number, number] = [-118.2437, 33.9425]
    const distance = haversine(nyc, la)
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4000)
  })

  it('calculates distance between London and Paris (~343 km)', () => {
    const london: [number, number] = [-0.1276, 51.5074]
    const paris: [number, number] = [2.3522, 48.8566]
    const distance = haversine(london, paris)
    expect(distance).toBeGreaterThan(330)
    expect(distance).toBeLessThan(360)
  })

  it('handles antipodal points (~20015 km, half Earth circumference)', () => {
    const north: [number, number] = [0, 90]
    const south: [number, number] = [0, -90]
    const distance = haversine(north, south)
    // Should be approximately pi * R = ~20015 km
    expect(distance).toBeGreaterThan(20000)
    expect(distance).toBeLessThan(20050)
  })

  it('is symmetric (a->b equals b->a)', () => {
    const a: [number, number] = [-84.39, 33.75]
    const b: [number, number] = [-81.10, 32.08]
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 10)
  })
})

describe('bboxFromCoordinates', () => {
  it('returns correct bbox for multiple points', () => {
    const coords: [number, number][] = [
      [-84.39, 33.75],
      [-81.10, 32.08],
      [-86.78, 36.16],
    ]
    const [west, south, east, north] = bboxFromCoordinates(coords)
    expect(west).toBe(-86.78)
    expect(south).toBe(32.08)
    expect(east).toBe(-81.10)
    expect(north).toBe(36.16)
  })

  it('returns a point bbox for a single point', () => {
    const coords: [number, number][] = [[-90.0, 35.0]]
    const [west, south, east, north] = bboxFromCoordinates(coords)
    expect(west).toBe(-90.0)
    expect(south).toBe(35.0)
    expect(east).toBe(-90.0)
    expect(north).toBe(35.0)
  })

  it('returns Infinity/-Infinity for empty array', () => {
    const [west, south, east, north] = bboxFromCoordinates([])
    expect(west).toBe(Infinity)
    expect(south).toBe(Infinity)
    expect(east).toBe(-Infinity)
    expect(north).toBe(-Infinity)
  })
})

describe('centroid', () => {
  it('returns [0, 0] for empty array', () => {
    expect(centroid([])).toEqual([0, 0])
  })

  it('returns the point itself for a single point', () => {
    expect(centroid([[-84.39, 33.75]])).toEqual([-84.39, 33.75])
  })

  it('returns the midpoint for two points', () => {
    const [lng, lat] = centroid([
      [-80, 30],
      [-90, 40],
    ])
    expect(lng).toBe(-85)
    expect(lat).toBe(35)
  })

  it('calculates average for multiple points', () => {
    const coords: [number, number][] = [
      [0, 0],
      [10, 10],
      [20, 20],
    ]
    const [lng, lat] = centroid(coords)
    expect(lng).toBe(10)
    expect(lat).toBe(10)
  })
})
