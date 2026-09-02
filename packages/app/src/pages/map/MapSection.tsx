import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import type { PhotoMarker } from '@/types/map'
import { AnimatePresence, m } from 'motion/react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useLongPress } from '@/hooks/useLongPress'
import { useRecordingFlow } from '@/hooks/useRecordingFlow'
import { useRegionPhotoMapping } from '@/hooks/useRegionPhotoMapping'
import { useWebShare } from '@/hooks/useWebShare'
import { createDemoPhotos } from '@/lib/demo-photos'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useGlobeOrbitStore } from '@/stores/globeOrbitStore'
import { usePhotoStore } from '@/stores/photoStore'
import { useRegionStore } from '@/stores/regionStore'
import { useReplayStore } from '@/stores/replayStore'
import { GlobeOrbitOverlay } from './components/GlobeOrbitOverlay'
import { MapContextMenu } from './components/MapContextMenu'
import { MapMenuButton } from './components/MapMenuButton'
import { MapSidebar } from './components/MapSidebar'
import { PortraitLockOverlay } from './components/replay/PortraitLockOverlay'
import { ReplayIntroOverlay } from './components/replay/ReplayIntroOverlay'
import { TrajectoryOverlay } from './components/TrajectoryOverlay'
import {
  ANNOUNCEMENT_STORAGE_KEY,
  ANNOUNCEMENT_VERSION,
  FEEDBACK_INTERVAL_MS,
  FEEDBACK_STORAGE_KEY,
  HELP_SEEN_STORAGE_KEY,
} from './constants'
import { buildPhotosForManualPlacement } from './manualPlacement'
import { getInitialViewStateForMarkers } from './utils'

const Maplibre = lazy(() =>
  import('./MapLibre').then(m => ({ default: m.Maplibre })),
)

// Keep secondary dialogs and drawers out of the map's core chunk. Most of
// these surfaces are closed on first paint, and some pull in sizeable feature
// dependencies such as react-markdown, upload parsing, or settings forms.
const AnnouncementDialog = lazy(() =>
  import('./components/AnnouncementDialog').then(m => ({ default: m.AnnouncementDialog })),
)
const EmptyJourneyPrompt = lazy(() =>
  import('./components/FirstJourneyPrompt').then(m => ({ default: m.EmptyJourneyPrompt })),
)
const FeedbackDialog = lazy(() =>
  import('@/components/feedback').then(m => ({ default: m.FeedbackDialog })),
)
const GalleryDrawer = lazy(() =>
  import('./components/GalleryDrawer').then(m => ({ default: m.GalleryDrawer })),
)
const LoginDrawer = lazy(() =>
  import('@/components/auth').then(m => ({ default: m.LoginDrawer })),
)
const PricingDrawer = lazy(() =>
  import('@/components/pricing').then(m => ({ default: m.PricingDrawer })),
)
const RecordingErrorDialog = lazy(() =>
  import('./components/RecordingErrorDialog').then(m => ({ default: m.RecordingErrorDialog })),
)
const RouteReadyPrompt = lazy(() =>
  import('./components/FirstJourneyPrompt').then(m => ({ default: m.RouteReadyPrompt })),
)
const SaveVideoDialog = lazy(() =>
  import('./components/SaveVideoDialog').then(m => ({ default: m.SaveVideoDialog })),
)
const SelectPhotosDrawer = lazy(() =>
  import('@/components/upload').then(m => ({ default: m.SelectPhotosDrawer })),
)
const SettingsDrawer = lazy(() =>
  import('@/pages/settings').then(m => ({ default: m.SettingsDrawer })),
)

function MapSectionContent() {
  const user = useAuthStore(s => s.user)
  const markers = usePhotoStore(s => s.markers)
  const selectedMarkerId = usePhotoStore(s => s.selectedMarkerId)
  const setSelectedMarkerId = usePhotoStore(s => s.setSelectedMarkerId)
  const mapRef = useRef<MapRef>(null)
  const cropRef = useRef<HTMLDivElement>(null)
  const { shareLink } = useWebShare()
  const { t } = useTranslation()
  const isMobile = useIsMobile()

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
    recordingError,
    beginRecording,
    showIntro,
    onIntroComplete,
    saveVideo,
    discardVideo,
    exitRecording,
    dismissRecordingError,
  } = useRecordingFlow({ cropRef })

  const earthZoomPhase = useReplayStore(s => s.earthZoomPhase)
  const earthZoomActive = earthZoomPhase !== 'idle' && earthZoomPhase !== 'done'
  const templateConfig = useReplayStore(s => s.templateConfig)

  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(() => localStorage.getItem(HELP_SEEN_STORAGE_KEY) !== 'true')
  const [showHelpHint, setShowHelpHint] = useState(false)
  const [routeReadyPromptOpen, setRouteReadyPromptOpen] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [loginDrawerOpen, setLoginDrawerOpen] = useState(() => !user)
  const [announcementOpen, setAnnouncementOpen] = useState(
    () => localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) !== ANNOUNCEMENT_VERSION,
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

  useEffect(() => {
    if (helpOpen) {
      setShowHelpHint(false)
      return
    }
    setShowHelpHint(true)
    const timer = window.setTimeout(setShowHelpHint, 5000, false)
    return () => window.clearTimeout(timer)
  }, [helpOpen])

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
    setRouteReadyPromptOpen(false)
    if (isFragmentMode) {
      const center = mapRef.current?.getMap()?.getCenter()
      startOrbit(center?.lng ?? 0, center?.lat ?? 20)
    }
    else {
      prepareReplay(markers)
    }
  }, [isFragmentMode, prepareReplay, markers, startOrbit])

  const handleShareClick = useCallback(() => {
    setUploadDrawerOpen(false)
    setSettingsOpen(false)
    setPricingOpen(false)
    setGalleryOpen(false)
    setLoginDrawerOpen(false)
    shareLink({
      title: t('share.appTitle', { defaultValue: 'Locusify' }),
      text: t('share.appText', { defaultValue: 'Transform your travel photos into visual route maps and cinematic vlogs' }),
      url: 'https://app.locusify.cn/',
    })
  }, [shareLink, t])

  const handleExitReplay = useCallback(() => {
    exitReplay()
    exitOrbit()
    exitRecording()
  }, [exitReplay, exitOrbit, exitRecording])

  const handleDismissAnnouncement = useCallback(() => {
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, ANNOUNCEMENT_VERSION)
    setAnnouncementOpen(false)
  }, [])

  const closeMenuDrawers = useCallback(() => {
    setUploadDrawerOpen(false)
    setSettingsOpen(false)
    setPricingOpen(false)
    setGalleryOpen(false)
    setHelpOpen(false)
    setLoginDrawerOpen(false)
  }, [])

  const handleUploadClick = useCallback(() => {
    closeMenuDrawers()
    setRouteReadyPromptOpen(false)
    setUploadDrawerOpen(true)
  }, [closeMenuDrawers])

  const handlePhotosAdded = useCallback(() => {
    setRouteReadyPromptOpen(usePhotoStore.getState().markers.length >= 2)
  }, [])

  const handleUseDemo = useCallback(async () => {
    if (demoLoading)
      return
    setDemoLoading(true)
    try {
      const store = usePhotoStore.getState()
      const hasDemo = store.photos.some(photo => photo.id.startsWith('locusify-demo-'))
      if (!hasDemo) {
        const photos = await createDemoPhotos()
        usePhotoStore.getState().addPhotos(photos)
      }
      setRouteReadyPromptOpen(usePhotoStore.getState().markers.length >= 2)
    }
    catch {
      // Keep the user in the guide and allow retrying if demo generation fails.
      setHelpOpen(true)
    }
    finally {
      setDemoLoading(false)
    }
  }, [demoLoading])

  const handleSettingsClick = useCallback(() => {
    closeMenuDrawers()
    setSettingsOpen(true)
  }, [closeMenuDrawers])

  const handlePricingClick = useCallback(() => {
    closeMenuDrawers()
    setPricingOpen(true)
  }, [closeMenuDrawers])

  const handleGalleryClick = useCallback(() => {
    closeMenuDrawers()
    setGalleryOpen(true)
  }, [closeMenuDrawers])

  const handleHelpClick = useCallback(() => {
    closeMenuDrawers()
    setHelpOpen(true)
  }, [closeMenuDrawers])

  const handleCloseHelp = useCallback(() => {
    localStorage.setItem(HELP_SEEN_STORAGE_KEY, 'true')
    setHelpOpen(false)
  }, [])

  const handleHelpSelectPhotos = useCallback(() => {
    setHelpOpen(false)
    handleUploadClick()
  }, [handleUploadClick])

  const handleHelpUseDemo = useCallback(() => {
    setHelpOpen(false)
    void handleUseDemo()
  }, [handleUseDemo])

  const handleHelpStartReplay = useCallback(() => {
    setHelpOpen(false)
    handleRoutesClick()
  }, [handleRoutesClick])

  const handleLoginClick = useCallback(() => {
    closeMenuDrawers()
    setLoginDrawerOpen(true)
  }, [closeMenuDrawers])

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
  const captureUiActive = introVisible || recordingActive || isRecording
  const showDesktopSidebar = !captureUiActive && !!user && !isInAnyReplay
  const mapDrawerModal = isMobile ? undefined : false
  const mapDrawerDesktopOffset = showDesktopSidebar && !isMobile ? 56 : 0

  return (
    <div className={cn('absolute size-full', captureUiActive && 'flex items-center justify-center overflow-hidden bg-black')}>
      {/* Hide menu button during active recording (intro + playback) */}
      {!captureUiActive && !!user && (
        <MapMenuButton
          onUploadClick={handleUploadClick}
          onRoutesClick={handleRoutesClick}
          onSettingsClick={handleSettingsClick}
          onPricingClick={handlePricingClick}
          onLogout={handleLoginClick}
          onGalleryClick={handleGalleryClick}
          onHelpClick={handleHelpClick}
          showHelpHint={showHelpHint}
          routesDisabled={!hasEnoughPhotos && !isFragmentMode}
          isReplayMode={isInAnyReplay}
          onExitReplay={handleExitReplay}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />
      )}

      {showDesktopSidebar && (
        <MapSidebar
          onUploadClick={handleUploadClick}
          onRoutesClick={handleRoutesClick}
          onSettingsClick={handleSettingsClick}
          onPricingClick={handlePricingClick}
          onLogout={handleLoginClick}
          onGalleryClick={handleGalleryClick}
          onShareClick={handleShareClick}
          onHelpClick={handleHelpClick}
          showHelpHint={showHelpHint}
          routesDisabled={!hasEnoughPhotos && !isFragmentMode}
        />
      )}

      <Suspense fallback={null}>
        {uploadDrawerOpen && (
          <SelectPhotosDrawer
            open
            onOpenChange={setUploadDrawerOpen}
            onPhotosAdded={handlePhotosAdded}
            modal={mapDrawerModal}
            desktopOffset={mapDrawerDesktopOffset}
          />
        )}
        {settingsOpen && (
          <SettingsDrawer open onOpenChange={setSettingsOpen} onLogout={handleLoginClick} modal={mapDrawerModal} desktopOffset={mapDrawerDesktopOffset} />
        )}
        {pricingOpen && (
          <PricingDrawer open onOpenChange={setPricingOpen} modal={mapDrawerModal} desktopOffset={mapDrawerDesktopOffset} />
        )}
        {galleryOpen && (
          <GalleryDrawer open onOpenChange={setGalleryOpen} modal={mapDrawerModal} desktopOffset={mapDrawerDesktopOffset} />
        )}
        {loginDrawerOpen && (
          <LoginDrawer open onOpenChange={setLoginDrawerOpen} dismissible={!!user} modal={mapDrawerModal} desktopOffset={mapDrawerDesktopOffset} />
        )}
        {recordingError && (
          <RecordingErrorDialog reason={recordingError} onClose={dismissRecordingError} />
        )}
      </Suspense>
      {isReplayMode && (
        <PortraitLockOverlay />
      )}

      {/* Announcement dialog — shown once per version */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {announcementOpen && !!user && (
            <AnnouncementDialog
              open
              onClose={handleDismissAnnouncement}
            />
          )}
        </AnimatePresence>
      </Suspense>

      {/* Save / Discard dialog — shown 2 s after replay completes */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Feedback dialog — shown every 7 days, lowest priority */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {feedbackOpen && !!user && !announcementOpen && !videoDialogOpen && (
            <FeedbackDialog
              open
              onClose={handleDismissFeedback}
            />
          )}
        </AnimatePresence>
      </Suspense>

      {!isInAnyReplay && !!user && (
        <MapContextMenu
          position={contextMenuPos}
          onAddPhotos={handleContextMenuAddPhotos}
          onClose={handleContextMenuClose}
        />
      )}

      {/* Export canvas: a real 16:9 box whose exact bounds are Region Captured. */}
      <div
        ref={cropRef}
        className={cn(
          'relative overflow-hidden',
          captureUiActive
            ? 'aspect-video h-auto w-full max-h-full max-w-full bg-black'
            : 'size-full',
          showDesktopSidebar && 'sm:ml-14 sm:w-[calc(100%-3.5rem)]',
        )}
        style={captureUiActive
          ? {
              width: 'min(100%, calc(100vh * 16 / 9))',
              height: 'min(100%, calc(100vw * 9 / 16))',
            }
          : undefined}
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

        <Suspense fallback={null}>
          <AnimatePresence>
            {!announcementOpen && !isInAnyReplay && !!user && helpOpen && !uploadDrawerOpen && (
              <EmptyJourneyPrompt
                open
                onSelectPhotos={handleHelpSelectPhotos}
                onUseDemo={handleHelpUseDemo}
                onStartReplay={handleHelpStartReplay}
                onClose={handleCloseHelp}
                canStartReplay={hasEnoughPhotos || isFragmentMode}
              />
            )}
            {routeReadyPromptOpen && hasEnoughPhotos && !uploadDrawerOpen && !isInAnyReplay && !!user && (
              <RouteReadyPrompt
                photoCount={markers.length}
                onStartReplay={handleRoutesClick}
                onDismiss={() => setRouteReadyPromptOpen(false)}
              />
            )}
          </AnimatePresence>
        </Suspense>

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
