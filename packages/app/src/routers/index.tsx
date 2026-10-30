import type { RouteObject } from 'react-router'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { i18n } from '@/i18n'
import Layout from '@/layout'
import { ErrorElement } from '@/pages/error/ErrorElement'
import { Map } from '@/pages/map'

const GalleryPage = lazy(() => import('@/pages/gallery'))

const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))

/** Routes */
export const routes: RouteObject[] = [
  {
    path: '/auth/callback',
    element: (
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><p className="text-sm text-text/50">Signing in...</p></div>}>
        <AuthCallback />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><p className="text-sm text-text/50">Loading...</p></div>}>
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
        element: <GalleryPage />,
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
