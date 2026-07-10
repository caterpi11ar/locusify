import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import type { PhotoMarker } from '@/types/map'
import { AnimatePresence, m } from 'motion/react'
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoginButton, LoginDrawer } from '@/components/auth'
import { FeedbackDialog } from '@/components/feedback'
import { SelectPhotosDrawer } from '@/components/upload'
import { useLongPress } from '@/hooks/useLongPress'
import { useRecordingFlow } from '@/hooks/useRecordingFlow'
import { useRegionPhotoMapping } from '@/hooks/useRegionPhotoMapping'
import { cn } from '@/lib/utils'
import { SettingsDrawer } from '@/pages/settings'
import { useAuthStore } from '@/stores/authStore'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { usePhotoStore } from '@/stores/photoStore'
import { useRegionStore } from '@/stores/regionStore'
import { useReplayStore } from '@/stores/replayStore'
import { AnnouncementDialog } from './components/AnnouncementDialog'
import { GalleryDrawer } from './components/GalleryDrawer'
import { GlobeOrbitOverlay } from './components/GlobeOrbitOverlay'
import { MapContextMenu } from './components/MapContextMenu'
import { MapMenuButton } from './components/MapMenuButton'
import { OnboardingGuide } from './components/OnboardingGuide'
import { PortraitLockOverlay } from './components/replay/PortraitLockOverlay'
import { ReplayIntroOverlay } from './components/replay/ReplayIntroOverlay'
import { SaveVideoDialog } from './components/SaveVideoDialog'
import { TrajectoryOverlay } from './components/TrajectoryOverlay'
import {
  ANNOUNCEMENT_STORAGE_KEY,
  ANNOUNCEMENT_VERSION,
  FEEDBACK_INTERVAL_MS,
  FEEDBACK_STORAGE_KEY,
  GUIDE_STORAGE_KEY,
} from './constants'
import { buildPhotosForManualPlacement } from './manualPlacement'
import { getInitialViewStateForMarkers } from './utils'

const Maplibre = lazy(() =>
  import('./MapLibre').then(m => ({ default: m.Maplibre })),
)

function MapSectionContent() {
  const user = useAuthStore(s => s.user)
  const markers = usePhotoStore(s => s.markers)
  const selectedMarkerId = usePhotoStore(s => s.selectedMarkerId)
  const setSelectedMarkerId = usePhotoStore(s => s.setSelectedMarkerId)
  const mapRef = useRef<MapRef>(null)
  const cropRef = useRef<HTMLDivElement>(null)

  // Region photo mapping — auto GPS→country matching
  useRegionPhotoMapping()

  const isFragmentMode = useRegionStore(s => s.isFragmentMode)

  const isReplayMode = useReplayStore(s => s.isReplayMode)
  const prepareReplay = useReplayStore(s => s.prepareReplay)
  const exitReplay = useReplayStore(s => s.exitReplay)

  const isOrbiting = useGlobeOrbitStore(s => s.isOrbiting)
  const startOrbit = useGlobeOrbitStore(s => s.startOrbit)
  const exitOrbit = useGlobeOrbitStore(s => s.exitOrbit)

  const {
    recordingActive,
    introVisible,
    videoDialogOpen,
    isRecording,
    isProcessing,
    pendingVideo,
    conversionProgress,
    beginRecording,
    showIntro,
    onIntroComplete,
    saveVideo,
    discardVideo,
    exitRecording,
  } = useRecordingFlow({ cropRef })

  const earthZoomPhase = useReplayStore(s => s.earthZoomPhase)
  const earthZoomActive = earthZoomPhase !== 'idle' && earthZoomPhase !== 'done'
  const templateConfig = useReplayStore(s => s.templateConfig)

  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [loginDrawerOpen, setLoginDrawerOpen] = useState(() => !user)
  const [announcementOpen, setAnnouncementOpen] = useState(
    () => localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) !== ANNOUNCEMENT_VERSION,
  )
  const [guideOpen, setGuideOpen] = useState(
    () => localStorage.getItem(GUIDE_STORAGE_KEY) !== 'true',
  )
  const [feedbackOpen, setFeedbackOpen] = useState(() => {
    const last = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (!last) {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, String(Date.now()))
      return false
    }
    return Date.now() - Number(last) >= FEEDBACK_INTERVAL_MS
  })

  // Context menu state
  const pendingLngLat = useRef<{ lng: number, lat: number } | null>(null)
  const contextMenuFileInputRef = useRef<HTMLInputElement>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number } | null>(null)

  // Re-open login drawer when user logs out
  useEffect(() => {
    if (!user)
      setLoginDrawerOpen(true)
  }, [user])

  const handleMarkerClick = useCallback((marker: PhotoMarker) => {
    setSelectedMarkerId(selectedMarkerId === marker.id ? null : marker.id)
  }, [selectedMarkerId, setSelectedMarkerId])

  const initialViewState = useMemo(() => {
    return getInitialViewStateForMarkers(markers)
  }, [markers])

  const handleRoutesClick = useCallback(() => {
    if (isFragmentMode) {
      const center = mapRef.current?.getMap()?.getCenter()
      startOrbit(center?.lng ?? 0, center?.lat ?? 20)
    }
    else {
      prepareReplay(markers)
    }
  }, [isFragmentMode, prepareReplay, markers, startOrbit])

  const handleExitReplay = useCallback(() => {
    exitReplay()
    exitOrbit()
    exitRecording()
  }, [exitReplay, exitOrbit, exitRecording])

  const handleDismissAnnouncement = useCallback(() => {
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, ANNOUNCEMENT_VERSION)
    setAnnouncementOpen(false)
  }, [])

  const handleDismissGuide = useCallback(() => {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true')
    setGuideOpen(false)
  }, [])

  const handleDismissFeedback = useCallback(() => {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, String(Date.now()))
    setFeedbackOpen(false)
  }, [])

  const handleMapContextMenu = useCallback((e: MapLayerMouseEvent) => {
    if (contextMenuPos)
      return // Already shown (e.g. from long-press)
    pendingLngLat.current = { lng: e.lngLat.lng, lat: e.lngLat.lat }
    setContextMenuPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY })
  }, [contextMenuPos])

  // Long-press on mobile → open the same context menu
  const longPressHandlers = useLongPress(
    useCallback(({ clientX, clientY }: { clientX: number, clientY: number }) => {
      const map = mapRef.current
      if (!map)
        return
      const rect = map.getContainer().getBoundingClientRect()
      const lngLat = map.unproject([clientX - rect.left, clientY - rect.top])
      pendingLngLat.current = { lng: lngLat.lng, lat: lngLat.lat }
      setContextMenuPos({ x: clientX, y: clientY })
    }, []),
  )

  const handleContextMenuAddPhotos = useCallback(() => {
    contextMenuFileInputRef.current?.click()
  }, [])

  const handleContextMenuClose = useCallback(() => {
    setContextMenuPos(null)
  }, [])

  const handleContextMenuFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0 || !pendingLngLat.current)
      return

    const { lng, lat } = pendingLngLat.current
    const files = Array.from(fileList)
    const photos = await buildPhotosForManualPlacement({
      files,
      longitude: lng,
      latitude: lat,
    })

    if (photos.length > 0) {
      usePhotoStore.getState().addPhotos(photos)
    }

    e.target.value = ''
  }, [])

  const hasEnoughPhotos = markers.length >= 2
  const displayMarkers = isReplayMode ? [] : markers
  const isInAnyReplay = isReplayMode || isOrbiting

  return (
    <div className={cn('absolute size-full', recordingActive && 'bg-black')}>
      {/* Hide menu button during active recording (intro + playback) */}
      {!recordingActive && !isRecording && !!user && (
        <MapMenuButton
          onUploadClick={() => {
            setUploadDrawerOpen(true)
            handleDismissGuide()
          }}
          onRoutesClick={handleRoutesClick}
          onSettingsClick={() => setSettingsOpen(true)}
          onGalleryClick={() => setGalleryOpen(true)}
          routesDisabled={!hasEnoughPhotos && !isFragmentMode}
          isReplayMode={isInAnyReplay}
          onExitReplay={handleExitReplay}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />
      )}

      <SelectPhotosDrawer
        open={uploadDrawerOpen}
        onOpenChange={setUploadDrawerOpen}
      />

      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} onLogout={() => setLoginDrawerOpen(true)} />
      <GalleryDrawer open={galleryOpen} onOpenChange={setGalleryOpen} />
      <LoginDrawer open={loginDrawerOpen} onOpenChange={setLoginDrawerOpen} dismissible={!!user} />

      {!isInAnyReplay && !!user && (
        <LoginButton onClick={() => setSettingsOpen(true)} />
      )}

      {isReplayMode && (
        <PortraitLockOverlay />
      )}

      {/* Announcement dialog — shown once per version */}
      <AnimatePresence>
        {announcementOpen && !!user && (
          <AnnouncementDialog
            open={announcementOpen}
            onClose={handleDismissAnnouncement}
          />
        )}
      </AnimatePresence>

      {/* Onboarding guide — shown once for new users */}
      <AnimatePresence>
        {guideOpen && markers.length === 0 && !announcementOpen && !isReplayMode && !!user && (
          <OnboardingGuide
            open
            onDismiss={handleDismissGuide}
          />
        )}
      </AnimatePresence>

      {/* Save / Discard dialog — shown 2 s after replay completes */}
      <AnimatePresence>
        {videoDialogOpen && (
          <SaveVideoDialog
            pendingVideo={pendingVideo}
            isProcessing={isProcessing}
            conversionProgress={conversionProgress}
            onSave={saveVideo}
            onDiscard={discardVideo}
          />
        )}
      </AnimatePresence>

      {/* Feedback dialog — shown every 7 days, lowest priority */}
      <AnimatePresence>
        {feedbackOpen && !!user && !announcementOpen && !guideOpen && !videoDialogOpen && (
          <FeedbackDialog
            open
            onClose={handleDismissFeedback}
          />
        )}
      </AnimatePresence>

      {!isInAnyReplay && !!user && (
        <MapContextMenu
          position={contextMenuPos}
          onAddPhotos={handleContextMenuAddPhotos}
          onClose={handleContextMenuClose}
        />
      )}

      {/* Crop container — fixed 16:9 during recording for Region Capture */}
      <div
        ref={cropRef}
        className={cn(
          'relative overflow-hidden',
          recordingActive ? 'mx-auto aspect-video max-h-full max-w-full' : 'size-full',
        )}
      >
        {isReplayMode && (
          <TrajectoryOverlay
            onBeginRecording={beginRecording}
            onShowIntro={showIntro}
            onUpgradeClick={() => setSettingsOpen(true)}
          />
        )}

        {isOrbiting && <GlobeOrbitOverlay onBeginRecording={beginRecording} />}

        {/* Shared intro overlay — controlled by useRecordingFlow */}
        {/* Force logo-fade for globe orbit or earth zoom, even if template has intro: 'none' */}
        <div className="absolute inset-0">
          <ReplayIntroOverlay
            visible={introVisible}
            onExitComplete={onIntroComplete}
            introStyle={(isOrbiting || earthZoomActive) ? 'logo-fade' : templateConfig.intro.style}
            autoHide={!earthZoomActive}
          />
        </div>

        <m.div
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={cn(
            'isolate size-full transition-all duration-500 ease-in-out',
            !user && 'pointer-events-none',
          )}
          {...(!isInAnyReplay ? longPressHandlers : {})}
        >
          <Maplibre
            markers={displayMarkers}
            initialViewState={initialViewState}
            autoFitBounds={false}
            selectedMarkerId={isInAnyReplay ? null : selectedMarkerId}
            onMarkerClick={handleMarkerClick}
            onContextMenu={isInAnyReplay ? undefined : handleMapContextMenu}
            className="size-full"
            mapRef={mapRef}
          />
        </m.div>
      </div>

      <input
        ref={contextMenuFileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={handleContextMenuFileChange}
      />
    </div>
  )
}

export function MapSection() {
  return <MapSectionContent />
}
