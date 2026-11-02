// Development-only fixture of real components. No photos, accounts or recording.
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { createRoot } from 'react-dom/client'
import Map from 'react-map-gl/maplibre'
import { LoginButton } from '../../src/components/auth/LoginButton'
import { SplashScreen } from '../../src/components/ui/splash-screen'
import { i18n } from '../../src/i18n'
import { brandLogo } from '../../src/lib/brand'
import { ReplayIntroOverlay } from '../../src/pages/map/components/replay/ReplayIntroOverlay'
import { TrajectoryStatsBar } from '../../src/pages/map/components/replay/TrajectoryStatsBar'
import { WaypointDot } from '../../src/pages/map/components/WaypointDot'
import { useAuthStore } from '../../src/stores/authStore'
import { useReplayStore } from '../../src/stores/replayStore'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../../src/index.css'

const params = new URLSearchParams(location.search)
const state = params.get('state') ?? 'splash'
document.documentElement.dataset.theme = params.get('theme') ?? 'dark'
await i18n.changeLanguage(params.get('lang') ?? 'en')
useReplayStore.setState({ recordingActive: true, currentPosition: [0, 0] })
useAuthStore.setState({ user: { id: 'brand-fixture', name: 'Brand Check', avatarUrl: brandLogo, provider: 'email' }, authReady: true })

createRoot(document.getElementById('root')!).render(
  <LazyMotion features={domAnimation}>
    <MotionConfig reducedMotion="always">
      <div className="relative min-h-dvh bg-neutral-950">
        {state === 'splash' && <SplashScreen />}
        {state === 'intro' && <ReplayIntroOverlay visible autoHide={false} onExitComplete={() => {}} />}
        {state === 'stats' && <div className="absolute inset-x-0 bottom-0"><TrajectoryStatsBar /></div>}
        {state === 'login-button' && <LoginButton onClick={() => {}} />}
        {state === 'waypoint' && (
          <Map
            onLoad={() => { document.body.dataset.mapReady = 'true' }}
            initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
            style={{ width: '100vw', height: '100dvh' }}
            mapStyle={{ version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': params.get('theme') === 'light' ? '#eeeeee' : '#171717' } }] }}
          >
            <WaypointDot />
          </Map>
        )}
      </div>
    </MotionConfig>
  </LazyMotion>,
)
