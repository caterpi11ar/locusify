import type { CSSProperties, RefObject } from 'react'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'

import type { PhotoMarker } from '@/types/map'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map from 'react-map-gl/maplibre'
import { getMapStyle } from '@/features/afilmory/shared/offline-map'
import { getCurrentPosition, isGeolocationGranted } from '@/lib/geolocation'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { useMapStore } from '@/stores/mapStore'

import { useRegionStore } from '@/stores/regionStore'
import { useReplayStore } from '@/stores/replayStore'
import { clusterMarkers } from './clustering'
import { CurrentLocationMarker } from './components/CurrentLocationMarker'
import { EarthZoomController } from './components/EarthZoomController'
import { GeoJsonLayer } from './components/GeoJsonLayer'
import { GlobeOrbitController } from './components/GlobeOrbitController'
import { MapControls } from './components/MapControls'
import { PhotoMarkerPin } from './components/PhotoMarkerPin'
import { RegionFillLayer } from './components/RegionFillLayer'
import { StarfieldCanvas } from './components/StarfieldCanvas'
import { TrajectoryController } from './components/TrajectoryController'
import { TrajectoryLineLayer } from './components/TrajectoryLineLayer'
import { WaypointDot } from './components/WaypointDot'
import { calculateMapBounds, calculateZoomFromBounds, getFragmentModeForZoom } from './utils'
// Side-effect: must run before any Map instance is created.
import '@/lib/maplibre-worker'
// Styles
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE: CSSProperties = { width: '100%', height: '100%', position: 'relative', zIndex: 10 }
const MAP_SKY = { 'atmosphere-blend': 0 }

interface CurrentLocation {
  longitude: number
  latitude: number
}

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
  const mapStyle = getMapStyle()

  const isReplayMode = useReplayStore(s => s.isReplayMode)
  const earthZoomPhase = useReplayStore(s => s.earthZoomPhase)
  const isOrbiting = useGlobeOrbitStore(s => s.isOrbiting)
  const isFragmentMode = useRegionStore(s => s.isFragmentMode)
  const updateFragmentMode = useRegionStore(s => s.updateFragmentMode)
  const registerMap = useMapStore(s => s.registerMap)
  const unregisterMap = useMapStore(s => s.unregisterMap)
  const [currentZoom, setCurrentZoom] = useState(initialViewState.zoom)
  const [viewState, setViewState] = useState(initialViewState)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  /** 上一次已适配过的 bounds 签名（用于判断坐标集合是否真的变了） */
  const lastFitKeyRef = useRef('')
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null)
  const earthZoomActive = earthZoomPhase !== 'idle' && earthZoomPhase !== 'done'

  const syncFragmentModeFromZoom = useCallback((zoom: number) => {
    updateFragmentMode(
      getFragmentModeForZoom(zoom, useRegionStore.getState().isFragmentMode),
    )
  }, [updateFragmentMode])

  // Get user's geolocation on mount to set initial view.
  // 仅在用户此前已授权时自动定位：否则首屏就会弹浏览器权限框打断用户，
  // 而且一旦被拒必然抛错（只是噪音，因为用户根本没请求过定位）。
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!(await isGeolocationGranted()))
        return
      try {
        const position = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
        if (cancelled)
          return
        const { longitude, latitude } = position.coords
        setCurrentLocation({ longitude, latitude })
        setViewState({
          longitude,
          latitude,
          zoom: 14,
        })
        setCurrentZoom(14)
      }
      catch {
        // 已授权仍失败（超时 / 取不到信号）不可恢复，静默退回默认视野
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleGeolocate = useCallback((longitude: number, latitude: number) => {
    setCurrentLocation({ longitude, latitude })
    onGeolocate?.(longitude, latitude)
  }, [onGeolocate])

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

  // Clustered markers
  const clusteredMarkers = useMemo(
    () => clusterMarkers(markers, currentZoom),
    [markers, currentZoom],
  )

  // 用「bounds 签名」代替一次性布尔标记：只有真实坐标集合变化时才重新适配。
  // 一次性标记会导致首次之后的照片全都落在视野外（实测 marker 在 x=-142475，
  // 屏幕外 14 万像素），而按签名判断既能把相机带过去，又不会因为无关的
  // 重渲染反复抢镜头、与用户平移打架。
  const markersBoundsKey = useMemo(() => {
    const b = calculateMapBounds(markers)
    return b
      ? `${b.minLng.toFixed(5)},${b.minLat.toFixed(5)},${b.maxLng.toFixed(5)},${b.maxLat.toFixed(5)}`
      : ''
  }, [markers])

  // 自动适配到包含所有照片的区域 - 坐标集合变化时执行
  const fitMapToBounds = useCallback(() => {
    if (
      !autoFitBounds
      || markers.length === 0
      || !isMapLoaded
      || !markersBoundsKey
      || lastFitKeyRef.current === markersBoundsKey
    ) {
      return
    }

    const bounds = calculateMapBounds(markers)
    if (!bounds)
      return

    // 记录本次已适配的坐标集合
    lastFitKeyRef.current = markersBoundsKey

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
    markersBoundsKey,
  ])

  // 当地图加载完成时触发适配
  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true)
    if (mapRef?.current?.getMap) {
      const map = mapRef.current.getMap()
      registerMap(map)
      if (!earthZoomActive) {
        syncFragmentModeFromZoom(map.getZoom())
      }
    }
  }, [mapRef, registerMap, earthZoomActive, syncFragmentModeFromZoom])

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

  // Background for fragment mode.
  // The Map instance is remounted when projection changes, so avoid calling
  // setProjection here; mutating an active MapLibre projection during low-zoom
  // gestures can leave handlers stuck.
  useEffect(() => {
    const map = mapRef?.current?.getMap()
    if (!map || !isMapLoaded)
      return

    // Earth zoom controller manages projection/background during its active phases.
    if (earthZoomActive)
      return

    const apply = () => {
      const canvas = map.getCanvas()
      const container = map.getContainer()

      if (isFragmentMode) {
        canvas.style.background = 'transparent'
        container.style.background = 'transparent'
      }
      else {
        canvas.style.background = ''
        container.style.background = ''
      }
    }

    apply()
    map.on('style.load', apply)
    return () => {
      map.off('style.load', apply)
    }
  }, [mapRef, isFragmentMode, isMapLoaded, earthZoomActive])

  const shouldShowCurrentLocation = !!currentLocation && !isReplayMode && !isOrbiting && !earthZoomActive

  return (
    <div className={`${className} relative`} style={style}>
      <StarfieldCanvas />
      <Map
        key={isFragmentMode ? 'fragment-globe' : 'street-mercator'}
        id={id}
        ref={mapRef}
        {...viewState}
        style={MAP_STYLE}
        mapStyle={mapStyle}
        projection={isFragmentMode ? 'globe' : 'mercator'}
        sky={MAP_SKY}
        attributionControl={false}
        canvasContextAttributes={{ preserveDrawingBuffer: true }}
        interactiveLayerIds={geoJsonData ? ['data'] : undefined}
        onClick={onGeoJsonClick}
        onContextMenu={onContextMenu}
        onLoad={handleMapLoad}
        onMove={(evt) => {
          const nextViewState = evt.viewState
          setCurrentZoom(nextViewState.zoom)
          setViewState(nextViewState)
        }}
        onMoveEnd={(evt) => {
          if (!earthZoomActive) {
            syncFragmentModeFromZoom(evt.viewState.zoom)
          }
        }}
        minZoom={isOrbiting ? 0.5 : 0}
        maxZoom={22}
      >
        {/* Map Controls — hidden during replay (camera follows automatically) */}
        {!isReplayMode && !isOrbiting && <MapControls onGeolocate={handleGeolocate} />}

        {/* Region Fill Layer — country photo fills (below markers) */}
        <RegionFillLayer />

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

        {/* Current Location Marker */}
        {shouldShowCurrentLocation && (
          <CurrentLocationMarker
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
          />
        )}

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
