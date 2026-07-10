import { describe, expect, it } from 'vitest'
import {
  calculateMapBounds,
  calculateZoomFromBounds,
  convertExifGPSToDecimal,
  isValidGPSCoordinates,
} from '@/pages/map/utils'

describe('convertExifGPSToDecimal', () => {
  it('returns null for null input', () => {
    expect(convertExifGPSToDecimal(null)).toBeNull()
  })

  it('parses exifr pre-processed decimal fields', () => {
    const result = convertExifGPSToDecimal({
      latitude: 35.6895,
      longitude: 139.6917,
    })
    expect(result).not.toBeNull()
    expect(result!.latitude).toBeCloseTo(35.6895)
    expect(result!.longitude).toBeCloseTo(139.6917)
    expect(result!.latitudeRef).toBe('N')
    expect(result!.longitudeRef).toBe('E')
  })

  it('parses DMS array format', () => {
    const result = convertExifGPSToDecimal({
      GPSLatitude: [35, 41, 22.2] as unknown as number,
      GPSLongitude: [139, 41, 30.12] as unknown as number,
      GPSLatitudeRef: 'N',
      GPSLongitudeRef: 'E',
    })
    expect(result).not.toBeNull()
    expect(result!.latitude).toBeCloseTo(35.6895, 2)
    expect(result!.longitude).toBeCloseTo(139.6917, 2)
  })

  it('applies South/West sign correctly', () => {
    const result = convertExifGPSToDecimal({
      latitude: 33.8688,
      longitude: 151.2093,
      GPSLatitudeRef: 'S',
      GPSLongitudeRef: 'W',
    })
    expect(result).not.toBeNull()
    expect(result!.latitude).toBeLessThan(0)
    expect(result!.longitude).toBeLessThan(0)
  })

  it('parses altitude', () => {
    const result = convertExifGPSToDecimal({
      latitude: 35.6895,
      longitude: 139.6917,
      GPSAltitude: 42 as any,
      GPSAltitudeRef: 0 as any,
    })
    expect(result!.altitude).toBe(42)
    expect(result!.altitudeRef).toBe('Above Sea Level')
  })

  it('returns null for missing GPS data', () => {
    expect(convertExifGPSToDecimal({ Make: 'Canon' })).toBeNull()
  })
})

describe('isValidGPSCoordinates', () => {
  it('accepts valid coordinates', () => {
    expect(isValidGPSCoordinates({ latitude: 0, longitude: 0 })).toBe(true)
    expect(isValidGPSCoordinates({ latitude: 90, longitude: 180 })).toBe(true)
    expect(isValidGPSCoordinates({ latitude: -90, longitude: -180 })).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidGPSCoordinates(null)).toBe(false)
  })

  it('rejects out of range coordinates', () => {
    expect(isValidGPSCoordinates({ latitude: 91, longitude: 0 })).toBe(false)
    expect(isValidGPSCoordinates({ latitude: 0, longitude: 181 })).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidGPSCoordinates({ latitude: Number.NaN, longitude: 0 })).toBe(false)
  })
})

describe('calculateZoomFromBounds', () => {
  it('returns high zoom for very close points', () => {
    expect(calculateZoomFromBounds(0.0005, 0.0005)).toBe(16)
  })

  it('returns medium zoom for city-level spread', () => {
    expect(calculateZoomFromBounds(0.5, 0.3)).toBe(8)
  })

  it('returns low zoom for country-level spread', () => {
    expect(calculateZoomFromBounds(5, 8)).toBe(5)
  })

  it('returns minimum zoom for cross-continent spread', () => {
    expect(calculateZoomFromBounds(50, 100)).toBe(2)
  })
})

describe('calculateMapBounds', () => {
  it('returns null for empty array', () => {
    expect(calculateMapBounds([])).toBeNull()
  })

  it('computes bounds for single marker', () => {
    const markers = [{ id: '1', latitude: 35, longitude: 139, photo: {} as any }]
    const bounds = calculateMapBounds(markers)
    expect(bounds).not.toBeNull()
    expect(bounds!.centerLat).toBe(35)
    expect(bounds!.centerLng).toBe(139)
  })

  it('computes bounds for multiple markers', () => {
    const markers = [
      { id: '1', latitude: 34, longitude: 135, photo: {} as any },
      { id: '2', latitude: 36, longitude: 140, photo: {} as any },
    ]
    const bounds = calculateMapBounds(markers)
    expect(bounds!.minLat).toBe(34)
    expect(bounds!.maxLat).toBe(36)
    expect(bounds!.minLng).toBe(135)
    expect(bounds!.maxLng).toBe(140)
    expect(bounds!.centerLat).toBe(35)
    expect(bounds!.centerLng).toBe(137.5)
  })
})
