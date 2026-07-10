import { describe, expect, it } from 'vitest'
import { computeBearing, haversineDistance } from '@/lib/geo'

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    const p: [number, number] = [139.6917, 35.6895] // Tokyo
    expect(haversineDistance(p, p)).toBe(0)
  })

  it('computes distance between Tokyo and Osaka (~400 km)', () => {
    const tokyo: [number, number] = [139.6917, 35.6895]
    const osaka: [number, number] = [135.5023, 34.6937]
    const dist = haversineDistance(tokyo, osaka)
    expect(dist).toBeGreaterThan(390)
    expect(dist).toBeLessThan(410)
  })

  it('computes distance between London and New York (~5570 km)', () => {
    const london: [number, number] = [-0.1276, 51.5074]
    const nyc: [number, number] = [-74.006, 40.7128]
    const dist = haversineDistance(london, nyc)
    expect(dist).toBeGreaterThan(5500)
    expect(dist).toBeLessThan(5600)
  })

  it('is symmetric', () => {
    const a: [number, number] = [139.6917, 35.6895]
    const b: [number, number] = [135.5023, 34.6937]
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 10)
  })
})

describe('computeBearing', () => {
  it('returns ~0 for due north', () => {
    const from: [number, number] = [0, 0]
    const to: [number, number] = [0, 10]
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(0, 0)
  })

  it('returns ~90 for due east', () => {
    const from: [number, number] = [0, 0]
    const to: [number, number] = [10, 0]
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(90, 0)
  })

  it('returns ~180 for due south', () => {
    const from: [number, number] = [0, 10]
    const to: [number, number] = [0, 0]
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(180, 0)
  })

  it('returns ~270 for due west', () => {
    const from: [number, number] = [10, 0]
    const to: [number, number] = [0, 0]
    const bearing = computeBearing(from, to)
    expect(bearing).toBeCloseTo(270, 0)
  })
})
