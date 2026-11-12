import type { FC } from 'react'
import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router'
import { Spinner } from '@/components/ui/spinner'
import { SplashScreen } from '@/components/ui/splash-screen'
import { useAuthStore } from '@/stores/authStore'

const DiscoverySurvey = lazy(() => import('@/components/auth/DiscoverySurvey').then(module => ({ default: module.DiscoverySurvey })))

const Layout: FC = () => {
  const authReady = useAuthStore(s => s.authReady)

  if (!authReady) {
    return <SplashScreen />
  }

  return (
    <div className="h-dvh flex flex-col">
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
      <Suspense fallback={null}>
        <DiscoverySurvey />
      </Suspense>
    </div>
  )
}

export default Layout
