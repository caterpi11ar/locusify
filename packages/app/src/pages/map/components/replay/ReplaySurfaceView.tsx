import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { SCENE_HEIGHT, SCENE_WIDTH } from '@/lib/replay/scene-motion'
import { registerReplaySurface } from '@/lib/replay/scene-registry'
import { useAuthStore } from '@/stores/authStore'
import { useMapStore } from '@/stores/mapStore'
import { useReplayStore } from '@/stores/replayStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { ReplayIntroOverlay } from './ReplayIntroOverlay'

export function ReplaySurfaceView({ onIntroComplete }: { onIntroComplete: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const callback = useRef(onIntroComplete)
  callback.current = onIntroComplete
  const map = useMapStore(s => s.mapInstance)
  const waypoints = useReplayStore(s => s.waypoints)
  const config = useReplayStore(s => s.templateConfig)
  const recordingActive = useReplayStore(s => s.recordingActive)
  const [ready, setReady] = useState(false)
  const avatar = useSettingsStore(s => s.avatarSource.type === 'preset' ? s.avatarSource.presetId : s.avatarSource.type)
  const avatarUrl = useAuthStore(s => s.user?.avatarUrl)
  const userName = useAuthStore(s => s.user?.name)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const element = host.current
    const capture = element?.closest<HTMLElement>('[data-testid="replay-capture"]')
    if (!map || !element || !capture)
      return
    const controller = new AbortController()
    setReady(false)
    const previousRatio = map.getPixelRatio()
    const resize = () => {
      const container = map.getContainer()
      const scale = Math.min(container.clientWidth / SCENE_WIDTH, container.clientHeight / SCENE_HEIGHT)
      capture.style.setProperty('--replay-unit', `${scale}px`)
      const ratio = 1920 / Math.max(1, container.clientWidth)
      if (Math.abs(map.getPixelRatio() - ratio) > 0.001)
        map.setPixelRatio(ratio)
      else
        map.resize()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(map.getContainer())
    const scene = import('@/lib/replay/replay-surface').then(({ ReplaySurface }) => ReplaySurface.create(map, element, controller.signal, () => callback.current()))
    const unregister = registerReplaySurface(capture, scene)
    void scene.then(() => {
      if (!controller.signal.aborted)
        setReady(true)
    }).catch((error) => {
      if (!controller.signal.aborted)
        console.error('[replay] Scene preparation failed', error)
    })
    return () => {
      controller.abort()
      observer.disconnect()
      capture.style.removeProperty('--replay-unit')
      unregister()
      void scene.then(surface => surface.dispose()).catch(() => {})
      map.setPixelRatio(previousRatio)
    }
  }, [map, waypoints, config, avatar, avatarUrl, userName, resolvedTheme])

  return (
    <div ref={host} className="pointer-events-none absolute inset-0 z-20">
      {!ready && recordingActive && <ReplayIntroOverlay visible onExitComplete={() => {}} />}
    </div>
  )
}
