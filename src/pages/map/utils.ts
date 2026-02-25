import type {
  GPSCoordinates,
  MapBounds,
  MapViewState,
  PhotoManifestItem,
  PhotoMarker,
  PickedExif,
} from '@/types/map'
import { GPSDirection } from '@/types/map'

/**
 * Convert EXIF GPS data to decimal coordinates with proper directional handling
 */
export function convertExifGPSToDecimal(exif: PickedExif | null): {
  latitude: number
  longitude: number
  latitudeRef: GPSDirection.North | GPSDirection.South
  longitudeRef: GPSDirection.East | GPSDirection.West
  altitude?: number
  altitudeRef?: 'Above Sea Level' | 'Below Sea Level'
} | null {
  if (!exif)
    return null

  // Convert GPS coordinates from EXIF format to decimal degrees
  let latitude: number | undefined
  let longitude: number | undefined

  try {
    // Prefer exifr's pre-processed decimal fields
    if (typeof exif.latitude === 'number')
      latitude = exif.latitude
    if (typeof exif.longitude === 'number')
      longitude = exif.longitude

    // Fallback to raw GPS fields
    if (typeof latitude !== 'number' && exif.GPSLatitude != null) {
      if (typeof exif.GPSLatitude === 'number') {
        latitude = exif.GPSLatitude
      }
      else if (Array.isArray(exif.GPSLatitude) && (exif.GPSLatitude as number[]).length === 3) {
        const [degrees, minutes, seconds] = exif.GPSLatitude as number[]
        latitude = degrees + minutes / 60 + seconds / 3600
      }
      else {
        latitude = Number(exif.GPSLatitude)
      }
    }

    if (typeof longitude !== 'number' && exif.GPSLongitude != null) {
      if (typeof exif.GPSLongitude === 'number') {
        longitude = exif.GPSLongitude
      }
      else if (Array.isArray(exif.GPSLongitude) && (exif.GPSLongitude as number[]).length === 3) {
        const [degrees, minutes, seconds] = exif.GPSLongitude as number[]
        longitude = degrees + minutes / 60 + seconds / 3600
      }
      else {
        longitude = Number(exif.GPSLongitude)
      }
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number')
      return null

    // Get GPS direction references
    const latitudeRef
      = exif.GPSLatitudeRef === 'S' || exif.GPSLatitudeRef === 'South'
        ? GPSDirection.South
        : GPSDirection.North

    const longitudeRef
      = exif.GPSLongitudeRef === 'W' || exif.GPSLongitudeRef === 'West'
        ? GPSDirection.West
        : GPSDirection.East

    // Apply reference direction to coordinates only if they're positive
    // Some EXIF tools already provide properly signed coordinates
    if (latitudeRef === GPSDirection.South && latitude > 0) {
      latitude = -latitude
    }

    if (longitudeRef === GPSDirection.West && longitude > 0) {
      longitude = -longitude
    }

    // Process altitude information
    let altitude: number | undefined
    let altitudeRef: 'Above Sea Level' | 'Below Sea Level' | undefined

    // Prefer pre-processed altitude, fallback to raw GPS field
    const rawAltitude = typeof exif.altitude === 'number'
      ? exif.altitude
      : (typeof exif.GPSAltitude === 'number' ? exif.GPSAltitude : undefined)

    if (rawAltitude !== undefined) {
      altitude = rawAltitude
      altitudeRef
        = (typeof exif.GPSAltitudeRef === 'number' && exif.GPSAltitudeRef === 1)
          || exif.GPSAltitudeRef === 'Below Sea Level'
          ? 'Below Sea Level'
          : 'Above Sea Level'

      // Apply altitude reference
      if (altitudeRef === 'Below Sea Level') {
        altitude = -altitude
      }
    }

    // Validate coordinates using the validation function
    const coordinatesToValidate = { latitude, longitude }
    if (!isValidGPSCoordinates(coordinatesToValidate)) {
      return null
    }

    return {
      latitude,
      longitude,
      latitudeRef,
      longitudeRef,
      altitude,
      altitudeRef,
    }
  }
  catch (error) {
    console.warn('Failed to parse GPS coordinates from EXIF:', error)
    return null
  }
}

/**
 * GPS coordinate validation function
 */
export function isValidGPSCoordinates(
  coords: GPSCoordinates | null,
): coords is GPSCoordinates {
  if (!coords)
    return false

  const { latitude, longitude } = coords

  return (
    typeof latitude === 'number'
    && typeof longitude === 'number'
    && !Number.isNaN(latitude)
    && !Number.isNaN(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180
  )
}

/**
 * Convert PhotoManifestItem to PhotoMarker if it has GPS coordinates in EXIF
 */
export function convertPhotoToMarkerFromEXIF(
  photo: PhotoManifestItem,
): PhotoMarker | null {
  const { exif } = photo

  if (!exif) {
    return null
  }

  // Use the common GPS conversion function
  const gpsData = convertExifGPSToDecimal(exif)
  if (!gpsData) {
    return null
  }

  const {
    latitude,
    longitude,
    latitudeRef,
    longitudeRef,
    altitude,
    altitudeRef,
  } = gpsData

  return {
    id: photo.id,
    longitude,
    latitude,
    altitude,
    latitudeRef,
    longitudeRef,
    altitudeRef,
    photo,
  }
}

/**
 * Convert array of PhotoManifestItem to PhotoMarker array using EXIF data
 */
export function convertPhotosToMarkersFromEXIF(
  photos: PhotoManifestItem[],
): PhotoMarker[] {
  return photos
    .map(photo => convertPhotoToMarkerFromEXIF(photo))
    .filter((marker): marker is PhotoMarker => marker !== null)
}

/**
 * Calculate the bounds and center point for a set of markers
 */
export function calculateMapBounds(markers: PhotoMarker[]): MapBounds | null {
  if (markers.length === 0) {
    return null
  }

  const latitudes = markers.map(m => m.latitude)
  const longitudes = markers.map(m => m.longitude)

  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
    bounds: [
      [minLng, minLat], // Southwest coordinates
      [maxLng, maxLat], // Northeast coordinates
    ] as [[number, number], [number, number]],
  }
}

/**
 * Get initial view state that fits all markers
 */
export function getInitialViewStateForMarkers(
  markers: PhotoMarker[],
): MapViewState {
  const bounds = calculateMapBounds(markers)

  if (!bounds) {
    // Default view if no markers
    return {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10,
    }
  }

  // Calculate zoom level based on bounds
  const latDiff = bounds.maxLat - bounds.minLat
  const lngDiff = bounds.maxLng - bounds.minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  let zoom = 10
  if (maxDiff < 0.01)
    zoom = 15
  else if (maxDiff < 0.1)
    zoom = 12
  else if (maxDiff < 1)
    zoom = 8
  else if (maxDiff < 10)
    zoom = 5
  else zoom = 2

  return {
    longitude: bounds.centerLng,
    latitude: bounds.centerLat,
    zoom,
  }
}
