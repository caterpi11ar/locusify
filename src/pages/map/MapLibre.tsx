import type { CSSProperties, RefObject } from 'react'
import type { MapLayerMouseEvent, MapRef, StyleSpecification } from 'react-map-gl/maplibre'

import type { PhotoMarker } from '@/types/map'
import type { NearbyUser } from '@/types/presence'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map from 'react-map-gl/maplibre'
import { getGeolocation } from '@/platforms'
import { useAuthStore } from '@/stores/authStore'
import { computeOrbitZoom, useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { useMapStore } from '@/stores/mapStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { useRegionStore } from '@/stores/regionStore'

import { useReplayStore } from '@/stores/replayStore'
import { clusterMarkers, clusterNearbyUsers } from './clustering'
import { EarthZoomController } from './components/EarthZoomController'
import { GeoJsonLayer } from './components/GeoJsonLayer'
import { GlobeOrbitController } from './components/GlobeOrbitController'
import { MapControls } from './components/MapControls'
import { NearbyUserMarker } from './components/NearbyUserMarker'
import { PhotoMarkerPin } from './components/PhotoMarkerPin'
import { RegionFillLayer } from './components/RegionFillLayer'
import { StarfieldCanvas } from './components/StarfieldCanvas'
import { TrajectoryController } from './components/TrajectoryController'
import { TrajectoryLineLayer } from './components/TrajectoryLineLayer'
import { WaypointDot } from './components/WaypointDot'
import MapStyleDark from './MapLibreStyleDark.json'
import MapStyleLight from './MapLibreStyleLight.json'
import { calculateMapBounds, calculateZoomFromBounds } from './utils'
// Styles
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE: CSSProperties = { width: '100%', height: '100%', position: 'relative', zIndex: 10 }

export interface PureMaplibreProps {
  id?: string
  initialViewState?: {
    longitude: number
    latitude: number
    zoom: number
  }
  markers?: PhotoMarker[]
  selectedMarkerId?: string | null
  geoJsonData?: GeoJSON.FeatureCollection
  onMarkerClick?: (marker: PhotoMarker) => void
  onGeoJsonClick?: (event: MapLayerMouseEvent) => void
  onGeolocate?: (longitude: number, latitude: number) => void
  className?: string
  style?: CSSProperties
  mapRef?: RefObject<MapRef | null>
  onContextMenu?: (e: MapLayerMouseEvent) => void
  autoFitBounds?: boolean
}

export function Maplibre({
  id,
  initialViewState = {
    longitude: -122.4,
    latitude: 37.8,
    zoom: 14,
  },
  markers = [],
  selectedMarkerId,
  geoJsonData,
  onMarkerClick,
  onGeoJsonClick,
  onGeolocate,
  onContextMenu,
  className = 'size-full',
  style = { width: '100%', height: '100%' },
  mapRef,
  autoFitBounds = true,
}: PureMaplibreProps) {
  const { resolvedTheme } = useTheme()
  const mapStyle = (resolvedTheme === 'light' ? MapStyleLight : MapStyleDark) as StyleSpecification

  const isReplayMode = useReplayStore(s => s.isReplayMode)
  const earthZoomPhase = useReplayStore(s => s.earthZoomPhase)
  const isOrbiting = useGlobeOrbitStore(s => s.isOrbiting)
  const isFragmentMode = useRegionStore(s => s.isFragmentMode)
  const setPreviousViewState = useRegionStore(s => s.setPreviousViewState)
  const nearbyUsers = usePresenceStore(s => s.nearbyUsers)
  const myLocation = usePresenceStore(s => s.myLocation)
  const registerMap = useMapStore(s => s.registerMap)
  const unregisterMap = useMapStore(s => s.unregisterMap)
  const [currentZoom, setCurrentZoom] = useState(initialViewState.zoom)
  const [viewState, setViewState] = useState(initialViewState)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [hasInitialFitCompleted, setHasInitialFitCompleted] = useState(false)

  // Get user's geolocation on mount to set initial view
  const user = useAuthStore(s => s.user)
  const reportLocation = usePresenceStore(s => s.reportLocation)
  const fetchNearbyUsers = usePresenceStore(s => s.fetchNearbyUsers)
  const setMyLocation = usePresenceStore(s => s.setMyLocation)

  useEffect(() => {
    getGeolocation().getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }).then((position) => {
      const { longitude, latitude } = position
      setViewState({
        longitude,
        latitude,
        zoom: 14,
      })
      setCurrentZoom(14)
    }).catch((error) => {
      console.warn('Geolocation error:', error)
    })
  }, [])

  // Report presence when user is available — separate from map init to avoid
  // re-triggering geolocation when auth state changes.
  useEffect(() => {
    if (!user)
      return
    getGeolocation().getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }).then((position) => {
      const { longitude, latitude, accuracy } = position
      setMyLocation(latitude, longitude)
      reportLocation(latitude, longitude, accuracy)
      fetchNearbyUsers(latitude, longitude)
    }).catch(() => {
      // Geolocation may have already been handled above
    })
  }, [user, setMyLocation, reportLocation, fetchNearbyUsers])

  // Handle marker click - only call the external callback
  const handleMarkerClick = useCallback(
    (marker: PhotoMarker) => {
      onMarkerClick?.(marker)
    },
    [onMarkerClick],
  )

  // Handle marker close - call onMarkerClick with the currently selected marker to toggle it off
  const handleMarkerClose = useCallback(() => {
    if (selectedMarkerId && onMarkerClick) {
      // Find the currently selected marker and call onMarkerClick to deselect it
      const selectedMarker = markers.find(
        marker => marker.id === selectedMarkerId,
      )
      if (selectedMarker) {
        onMarkerClick(selectedMarker)
      }
    }
  }, [selectedMarkerId, onMarkerClick, markers])

  // Merge self + nearby users, then cluster together
  const allPresenceUsers = useMemo(() => {
    const all: NearbyUser[] = []
    if (myLocation)
      all.push(myLocation)
    all.push(...nearbyUsers)
    return all
  }, [myLocation, nearbyUsers])

  const nearbyUserClusters = useMemo(
    () => clusterNearbyUsers(allPresenceUsers, currentZoom),
    [allPresenceUsers, currentZoom],
  )

  // Clustered markers
  const clusteredMarkers = useMemo(
    () => clusterMarkers(markers, currentZoom),
    [markers, currentZoom],
  )

  // 自动适配到包含所有照片的区域 - 只在初次加载时执行
  const fitMapToBounds = useCallback(() => {
    if (
      !autoFitBounds
      || markers.length === 0
      || !isMapLoaded
      || hasInitialFitCompleted
    ) {
      return
    }

    const bounds = calculateMapBounds(markers)
    if (!bounds)
      return

    // 标记初次适配已完成
    setHasInitialFitCompleted(true)

    // 如果只有一个点，设置默认缩放级别
    if (markers.length === 1) {
      const newViewState = {
        longitude: markers[0].longitude,
        latitude: markers[0].latitude,
        zoom: 13, // 单点时的合理缩放级别
      }
      setViewState(newViewState)
      setCurrentZoom(newViewState.zoom)
      return
    }

    // 使用 mapRef 的 fitBounds 方法（推荐方式）
    if (mapRef?.current?.getMap) {
      // 计算动态padding，确保照片区域控制在窗口的80%内
      // 这意味着每边留出10%的空间作为缓冲区
      const mapContainer = mapRef.current.getContainer()
      const containerWidth = mapContainer.offsetWidth
      const containerHeight = mapContainer.offsetHeight

      const paddingPercentage = 0.1 // 每边10%的padding
      const horizontalPadding = containerWidth * paddingPercentage
      const verticalPadding = containerHeight * paddingPercentage

      const padding = {
        top: Math.max(verticalPadding, 40), // 最小40px
        bottom: Math.max(verticalPadding, 40),
        left: Math.max(horizontalPadding, 40),
        right: Math.max(horizontalPadding, 40),
      }

      try {
        const map = mapRef.current.getMap()
        map.fitBounds(
          [
            [bounds.minLng, bounds.minLat], // 西南角
            [bounds.maxLng, bounds.maxLat], // 东北角
          ],
          {
            padding,
            duration: 800, // 平滑动画
            maxZoom: 15, // 最大缩放级别限制，避免过度放大
          },
        )
      }
      catch (error) {
        console.warn('使用 fitBounds 失败，使用备用方案:', error)
        // 备用方案：手动计算视图状态
        fallbackToViewState(bounds)
      }
    }
    else {
      // mapRef 不可用时的备用方案
      fallbackToViewState(bounds)
    }

    function fallbackToViewState(
      bounds: ReturnType<typeof calculateMapBounds>,
    ) {
      if (!bounds)
        return

      const latDiff = bounds.maxLat - bounds.minLat
      const lngDiff = bounds.maxLng - bounds.minLng
      // 为备用方案也增加一些缓冲，降低一级缩放
      const zoom = Math.max(calculateZoomFromBounds(latDiff, lngDiff) - 1, 2)

      const newViewState = {
        longitude: bounds.centerLng,
        latitude: bounds.centerLat,
        zoom,
      }

      setViewState(newViewState)
      setCurrentZoom(zoom)
    }
  }, [
    markers,
    autoFitBounds,
    isMapLoaded,
    mapRef,
    hasInitialFitCompleted,
  ])

  // 当地图加载完成时触发适配
  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true)
    if (mapRef?.current?.getMap) {
      const map = mapRef.current.getMap()
      map.setProjection({
        type: 'mercator',
      })
      registerMap(map)
    }
  }, [registerMap])

  // 组件卸载时注销 map 实例
  useEffect(() => {
    return () => {
      unregisterMap()
    }
  }, [unregisterMap])

  // 当标记点变化时，重新适配边界
  useEffect(() => {
    // 延迟执行，确保地图已渲染
    const timer = setTimeout(() => {
      fitMapToBounds()
    }, 100)

    return () => clearTimeout(timer)
  }, [fitMapToBounds])

  // Fragment mode: fly to global view on enter, restore previous view on exit
  const prevFragmentMode = useRef(isFragmentMode)
  const viewStateRef = useRef(viewState)
  viewStateRef.current = viewState
  useEffect(() => {
    if (isFragmentMode === prevFragmentMode.current)
      return
    prevFragmentMode.current = isFragmentMode

    if (isFragmentMode) {
      // Save current view before flying out
      setPreviousViewState({ ...viewStateRef.current })
      const prev = viewStateRef.current
      const globalView = { longitude: prev.longitude, latitude: prev.latitude, zoom: computeOrbitZoom() }
      setViewState(globalView)
      setCurrentZoom(globalView.zoom)
    }
    else {
      const saved = useRegionStore.getState().previousViewState
      if (saved) {
        setViewState(saved)
        setCurrentZoom(saved.zoom)
        setPreviousViewState(null)
      }
    }
  }, [isFragmentMode, setPreviousViewState])

  // Atmosphere + projection for fragment mode.
  // setStyle (theme switch) resets projection & sky, so re-apply on style.load.
  // Skip when earth zoom is active — EarthZoomController manages projection.
  const earthZoomActive = earthZoomPhase !== 'idle' && earthZoomPhase !== 'done'
  useEffect(() => {
    const map = mapRef?.current?.getMap()
    if (!map || !isMapLoaded)
      return

    // Earth zoom controller manages projection during its active phases
    if (earthZoomActive)
      return

    const apply = () => {
      const canvas = map.getCanvas()
      const container = map.getContainer()

      if (isFragmentMode) {
        map.setProjection({ type: 'globe' })
        map.setSky({ 'atmosphere-blend': 0 })
        canvas.style.background = 'transparent'
        container.style.background = 'transparent'
      }
      else {
        map.setProjection({ type: 'mercator' })
        map.setSky({ 'atmosphere-blend': 0 })
        canvas.style.background = ''
        container.style.background = ''
      }
    }

    apply()
    map.on('style.load', apply)
    return () => {
      map.off('style.load', apply)
    }
  }, [isFragmentMode, isMapLoaded, earthZoomActive])

  return (
    <div className={`${className} relative`} style={style}>
      <StarfieldCanvas />
      <Map
        id={id}
        ref={mapRef}
        {...viewState}
        style={MAP_STYLE}
        mapStyle={mapStyle}
        attributionControl={false}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        interactiveLayerIds={geoJsonData ? ['data'] : undefined}
        onClick={onGeoJsonClick}
        onContextMenu={onContextMenu}
        onLoad={handleMapLoad}
        onMove={(evt) => {
          setCurrentZoom(evt.viewState.zoom)
          setViewState(evt.viewState)
        }}
        minZoom={isOrbiting ? 0.5 : earthZoomActive ? 0 : isFragmentMode ? 1 : 0}
        maxZoom={isFragmentMode ? 5 : 22}
      >
        {/* Map Controls — hidden during replay (camera follows automatically) */}
        {!isReplayMode && !isOrbiting && <MapControls onGeolocate={onGeolocate} />}

        {/* Region Fill Layer — country photo fills (below markers) */}
        <RegionFillLayer />

        {/* Nearby User Markers — hidden in fragment/replay mode */}
        {!isFragmentMode && !isReplayMode && nearbyUserClusters.map(cp => (
          <NearbyUserMarker
            key={cp.user.userId}
            user={cp.user}
            clusteredUsers={cp.clusteredUsers}
            longitude={cp.coordinates[0]}
            latitude={cp.coordinates[1]}
          />
        ))}

        {/* Photo Markers — hidden in fragment mode */}
        {!isFragmentMode && clusteredMarkers.map((clusterPoint) => {
          const { marker, clusteredPhotos } = clusterPoint.properties
          if (!marker)
            return null

          return (
            <PhotoMarkerPin
              key={clusterPoint.properties.cluster ? `cluster-${marker.id}` : marker.id}
              marker={marker}
              isSelected={selectedMarkerId === marker.id}
              onClick={handleMarkerClick}
              onClose={handleMarkerClose}
              clusteredMarkers={clusterPoint.properties.cluster ? clusteredPhotos : undefined}
            />
          )
        })}

        {/* GeoJSON Layer */}
        {geoJsonData && <GeoJsonLayer data={geoJsonData} />}

        {/* Trajectory Replay Layers */}
        {isReplayMode && (
          <>
            {/* Hide visual layers during earth zoom animation */}
            {!earthZoomActive && (
              <>
                <TrajectoryLineLayer />
                <WaypointDot />
              </>
            )}
            <TrajectoryController />
            <EarthZoomController />
          </>
        )}

        {/* Globe Orbit Controller */}
        {isOrbiting && <GlobeOrbitController />}
      </Map>
    </div>
  )
}
