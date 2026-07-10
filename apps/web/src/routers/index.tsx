import type { RouteObject } from 'react-router'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
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
      {
        path: '/',
        element: <Map />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]

/** Router */
export const router = createBrowserRouter(routes)
