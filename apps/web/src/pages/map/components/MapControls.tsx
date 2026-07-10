import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { useMap } from 'react-map-gl/maplibre'
import { getCurrentPosition } from '@/lib/geolocation'
import { cn, glassPanel } from '@/lib/utils'
import { useRegionStore } from '@/stores/regionStore'

interface MapControlsProps {
  onGeolocate?: (longitude: number, latitude: number) => void
}

export function MapControls({ onGeolocate }: MapControlsProps) {
  const { current: map } = useMap()
  const { t } = useTranslation()
  const isFragmentMode = useRegionStore(s => s.isFragmentMode)
  const toggleFragmentMode = useRegionStore(s => s.toggleFragmentMode)

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom()
      map.easeTo({ zoom: currentZoom + 1, duration: 300 })
    }
  }

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom()
      map.easeTo({ zoom: currentZoom - 1, duration: 300 })
    }
  }

  const handleCompass = () => {
    if (map) {
      map.easeTo({ bearing: 0, pitch: 0, duration: 500 })
    }
  }

  const handleGeolocate = () => {
    getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }).then((position) => {
      const { longitude, latitude } = position.coords
      if (map) {
        map.flyTo({
          center: [longitude, latitude],
          zoom: isFragmentMode ? 3 : 14,
          duration: 1000,
        })
      }
      onGeolocate?.(longitude, latitude)
    }).catch((error) => {
      console.warn('Geolocation error:', error)
    })
  }

  return (
    <m.div
      className="absolute bottom-4 left-2 z-40 flex flex-col gap-2 sm:left-4 sm:gap-3"
      style={{ paddingBottom: 'var(--safe-area-bottom)', paddingLeft: 'var(--safe-area-left)' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Control Group Container */}
      <div className={cn(glassPanel, 'flex flex-col overflow-hidden')}>
        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex size-10 items-center justify-center transition-colors sm:size-12"
          title={t('explory.controls.zoom.in')}
        >
          <i className="i-mingcute-add-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>

        {/* Divider */}
        <div className="bg-fill-secondary h-px w-full" />

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex size-10 items-center justify-center transition-colors sm:size-12"
          title={t('explory.controls.zoom.out')}
        >
          <i className="i-mingcute-minimize-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Compass Button */}
      <div className={cn(glassPanel, 'overflow-hidden')}>
        <button
          type="button"
          onClick={handleCompass}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex size-10 items-center justify-center transition-colors sm:size-12"
          title={t('explory.controls.compass')}
        >
          <i className="i-mingcute-navigation-line text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Geolocate Button */}
      <div className={cn(glassPanel, 'overflow-hidden')}>
        <button
          type="button"
          onClick={handleGeolocate}
          className="group hover:bg-fill-secondary active:bg-fill-tertiary flex size-10 items-center justify-center transition-colors sm:size-12"
          title={t('explory.controls.locate')}
        >
          <i className="i-mingcute-location-fill text-text size-5 transition-transform group-hover:scale-110 group-active:scale-95" />
        </button>
      </div>

      {/* Fragment Mode Toggle */}
      <div className={cn(glassPanel, 'overflow-hidden')}>
        <button
          type="button"
          onClick={toggleFragmentMode}
          className={cn(
            'group flex size-10 items-center justify-center transition-colors sm:size-12',
            isFragmentMode
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-fill-secondary active:bg-fill-tertiary',
          )}
          title={t('explory.controls.fragmentMode')}
        >
          <i
            className={cn(
              'size-5 transition-transform group-hover:scale-110 group-active:scale-95',
              isFragmentMode ? 'i-mingcute-earth-fill' : 'i-mingcute-earth-line text-text',
            )}
          />
        </button>
      </div>
    </m.div>
  )
}
