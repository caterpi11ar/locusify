import type { WaypointLocation } from '@/lib/reverse-geocode'
import { useEffect, useMemo, useRef } from 'react'
import { resolveAllWaypointLocations } from '@/lib/reverse-geocode'
import { useMapStore } from '@/stores/mapStore'
import { useRegionStore } from '@/stores/regionStore'
import { useReplayStore } from '@/stores/replayStore'

export interface ReplayLiveStats {
  durationDays: number
  countriesVisited: number
  citiesVisited: number
  totalDistanceKm: number
}

const EMPTY_STATS: ReplayLiveStats = {
  durationDays: 0,
  countriesVisited: 0,
  citiesVisited: 0,
  totalDistanceKm: 0,
}

/**
 * Computes live replay statistics that update as waypoints are reached.
 * Pre-computes country/city locations once when replay starts,
 * then derives cumulative stats from the current waypoint index.
 */
export function useReplayStats(): ReplayLiveStats {
  const status = useReplayStore(s => s.status)
  const waypoints = useReplayStore(s => s.waypoints)
  const segments = useReplayStore(s => s.segments)
  const currentWaypointIndex = useReplayStore(s => s.currentWaypointIndex)
  const boundaryData = useRegionStore(s => s.boundaryData)
  const loadBoundaries = useRegionStore(s => s.loadBoundaries)
  const mapInstance = useMapStore(s => s.mapInstance)

  const locationsRef = useRef<Map<number, WaypointLocation>>(new Map())

  // Ensure boundaries are loaded
  useEffect(() => {
    loadBoundaries()
  }, [loadBoundaries])

  // Pre-compute all waypoint locations when replay enters playing state
  useEffect(() => {
    if (
      (status === 'playing' || status === 'paused')
      && waypoints.length > 0
      && boundaryData
      && mapInstance
      && locationsRef.current.size === 0
    ) {
      const positions = waypoints.map(w => w.position)
      locationsRef.current = resolveAllWaypointLocations(positions, boundaryData, mapInstance)
    }

    // Clear cache when replay is reset
    if (status === 'idle' || status === 'configuring') {
      locationsRef.current = new Map()
    }
  }, [status, waypoints, boundaryData, mapInstance])

  return useMemo(() => {
    if (waypoints.length === 0 || locationsRef.current.size === 0) {
      return EMPTY_STATS
    }

    const idx = Math.min(currentWaypointIndex, waypoints.length - 1)

    // Duration in days
    const firstTs = waypoints[0].timestamp.getTime()
    const currentTs = waypoints[idx].timestamp.getTime()
    const durationDays = Math.max(0, Math.round((currentTs - firstTs) / (1000 * 60 * 60 * 24)))

    // Unique countries & cities up to current waypoint
    const countryIds = new Set<string>()
    const cityNames = new Set<string>()

    for (let i = 0; i <= idx; i++) {
      const loc = locationsRef.current.get(i)
      if (loc?.country) {
        countryIds.add(loc.country.id)
      }
      if (loc?.city) {
        cityNames.add(loc.city)
      }
    }

    // Cumulative distance from segments
    const segEnd = Math.min(idx, segments.length)
    let totalDistanceKm = 0
    for (let i = 0; i < segEnd; i++) {
      totalDistanceKm += segments[i].distanceKm
    }

    return {
      durationDays,
      countriesVisited: countryIds.size,
      citiesVisited: cityNames.size,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    }
  }, [currentWaypointIndex, waypoints, segments])
}
