import type { FC } from 'react'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { glassPanel } from '@/lib/utils'

interface MapInfoPanelProps {
  markersCount: number
  bounds?: {
    minLat: number
    maxLat: number
    minLng: number
    maxLng: number
  } | null
}

/**
 * MapInfoPanel component
 * @description This component displays the map information panel
 * @param markersCount - The number of markers on the map
 * @param bounds - The bounds of the map
 * @returns MapInfoPanel component
 */

export const MapInfoPanel: FC<MapInfoPanelProps> = ({ markersCount }) => {
  const { t } = useTranslation()

  /** If there are no markers, don't show the info panel */
  if (markersCount === 0) {
    return null
  }

  return (
    <m.div
      className="absolute top-4 right-4 z-40 max-w-xs"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className={glassPanel}>
        {/* Header Section */}

        <m.div
          className="flex items-center gap-4 p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          {/* Icon container with enhanced styling */}
          <div className="bg-blue/10 ring-blue/20 flex size-11 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset">
            <i className="i-mingcute-map-line text-blue text-lg" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="bg-green/10 ring-green/20 flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset">
                <div className="bg-green size-1.5 rounded-full" />
                <span className="text-text-secondary text-xs font-medium">
                  {t('explory.found.locations', { count: markersCount })}
                </span>
              </div>
            </div>
          </div>
        </m.div>

      </div>
    </m.div>
  )
}
