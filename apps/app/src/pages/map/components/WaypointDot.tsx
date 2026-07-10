import { m } from 'motion/react'
import { Marker } from 'react-map-gl/maplibre'
import { presetAvatars } from '@/data/presetAvatars'
import { transportModeIcons } from '@/data/transportModes'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useReplayStore } from '@/stores/replayStore'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Pulsing dot marker at the current playback position.
 * Renders user avatar, preset character, or default blue dot
 * based on settings. Shows transport mode badge for current segment.
 * Uses lineStyle color for pulse ring and enhanced glow when animated.
 */
export function WaypointDot() {
  const currentPosition = useReplayStore(s => s.currentPosition)
  const currentSegmentMode = useReplayStore(s => s.currentSegmentMode)
  const lineStyle = useReplayStore(s => s.templateConfig.lineStyle)
  const avatarSource = useSettingsStore(s => s.avatarSource)
  const user = useAuthStore(s => s.user)

  if (!currentPosition)
    return null

  const showBadge = currentSegmentMode !== 'unknown'
  const pulseColor = lineStyle.color

  return (
    <Marker longitude={currentPosition[0]} latitude={currentPosition[1]} anchor="center" style={{ zIndex: 40 }}>
      <m.div
        className="relative flex items-center justify-center"
        initial={false}
        animate={{ scale: 1 }}
      >
        {/* Primary pulse ring — uses lineStyle color */}
        <div
          className="absolute size-10 animate-ping rounded-full opacity-30"
          style={{ backgroundColor: pulseColor }}
        />

        {/* Secondary pulse ring — larger, slower, only when animated */}
        {lineStyle.animated && (
          <div
            className="absolute size-14 animate-pulse rounded-full opacity-15"
            style={{ backgroundColor: pulseColor }}
          />
        )}

        {/* Avatar / dot */}
        <AvatarContent avatarSource={avatarSource} avatarUrl={user?.avatarUrl} userName={user?.name} lineColor={pulseColor} />

        {/* Transport mode badge */}
        {showBadge && (
          <div className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-material-thick shadow-sm">
            <span className={cn(transportModeIcons[currentSegmentMode], 'size-2.5 text-text')} />
          </div>
        )}
      </m.div>
    </Marker>
  )
}

function AvatarContent({
  avatarSource,
  avatarUrl,
  userName,
  lineColor,
}: {
  avatarSource: { type: string, presetId?: string }
  avatarUrl?: string
  userName?: string
  lineColor: string
}) {
  // Profile avatar with image
  if (avatarSource.type === 'profile' && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="relative size-9 rounded-full border-2 object-cover"
        style={{ borderColor: lineColor, boxShadow: `0 0 8px ${lineColor}66` }}
      />
    )
  }

  // Profile avatar fallback: initial letter
  if (avatarSource.type === 'profile') {
    const initial = (userName?.[0] ?? '?').toUpperCase()
    return (
      <div
        className="relative flex size-9 items-center justify-center rounded-full border-2 text-lg font-semibold text-white"
        style={{ borderColor: lineColor, backgroundColor: lineColor, boxShadow: `0 0 8px ${lineColor}66` }}
      >
        {initial}
      </div>
    )
  }

  // Preset avatar
  if (avatarSource.type === 'preset' && avatarSource.presetId) {
    const preset = presetAvatars.find(p => p.id === avatarSource.presetId)
    if (preset) {
      return (
        <div
          className="relative flex size-9 items-center justify-center rounded-full border-2"
          style={{ backgroundColor: preset.color, borderColor: preset.color, boxShadow: `0 0 8px ${lineColor}66` }}
        >
          <span className={cn(preset.icon, 'size-5 text-white')} />
        </div>
      )
    }
  }

  // Default dot — uses lineStyle color
  return (
    <div
      className="relative size-3 rounded-full"
      style={{ backgroundColor: lineColor, boxShadow: `0 0 8px ${lineColor}99` }}
    />
  )
}
