import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { registerReplaySurface } from '@/lib/replay/scene-registry'
import { getSceneViewport } from '@/lib/replay/scene-viewport'
import { useAuthStore } from '@/stores/authStore'
import { useMapStore } from '@/stores/mapStore'
import { useReplayStore } from '@/stores/replayStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { PhotoPanel } from './PhotoPanel'
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
      if (!container.clientWidth || !container.clientHeight)
        return
      const { scale, mapPixelRatio: ratio } = getSceneViewport(container.clientWidth, container.clientHeight, window.devicePixelRatio, useReplayStore.getState().recordingActive)
      capture.style.setProperty('--replay-unit', `${scale}px`)
      if (Math.abs(map.getPixelRatio() - ratio) > 0.001)
        map.setPixelRatio(ratio)
      else
        map.resize()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(map.getContainer())
    window.addEventListener('resize', resize)
    const unsubscribe = useReplayStore.subscribe((state, previous) => {
      if (state.recordingActive !== previous.recordingActive)
        resize()
    })
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
      window.removeEventListener('resize', resize)
      unsubscribe()
      capture.style.removeProperty('--replay-unit')
      unregister()
      void scene.then(surface => surface.dispose()).catch(() => {})
      map.setPixelRatio(previousRatio)
    }
  }, [map, waypoints, config, avatar, avatarUrl, userName, resolvedTheme])

  return (
    <div ref={host} className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-0 z-0">
        <PhotoPanel />
      </div>
      {!ready && recordingActive && <ReplayIntroOverlay visible onExitComplete={() => {}} />}
    </div>
  )
}
