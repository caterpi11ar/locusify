import type { RouteObject } from 'react-router'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { SplashScreen } from '@/components/ui/splash-screen'
import { i18n } from '@/i18n'
import Layout from '@/layout'
import { ErrorElement } from '@/pages/error/ErrorElement'
import { Map } from '@/pages/map'

const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))

/** Routes */
export const routes: RouteObject[] = [
  {
    path: '/auth/callback',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <AuthCallback />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <ResetPassword />
      </Suspense>
    ),
  },
  {
    element: <Layout />,
    errorElement: <ErrorElement />,
    children: [
      ...(['en', 'zh-CN'] as const).map(language => ({
        path: `/${language}/photos`,
        element: <Navigate to={`/${language}/`} replace />,
        loader: () => {
          void i18n.changeLanguage(language)
          return null
        },
      })),
      {
        path: '/',
        element: <Navigate to={i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ? '/zh-CN/' : '/en/'} replace />,
      },
      {
        path: '/en/',
        element: <Map />,
        loader: () => {
          void i18n.changeLanguage('en')
          return null
        },
      },
      {
        path: '/zh-CN/',
        element: <Map />,
        loader: () => {
          void i18n.changeLanguage('zh-CN')
          return null
        },
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/en/" replace />,
  },
]

/** Router */
export const router = createBrowserRouter(routes)
