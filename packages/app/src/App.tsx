import type { FC } from 'react'
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { ThemeProvider } from 'next-themes'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router'
import { SeoManager } from './components/seo/SeoManager'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { router } from './routers'

const App: FC = () => {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <LazyMotion features={domAnimation} strict key="framer">
        <MotionConfig transition={{
          type: 'spring',
          duration: 0.4,
          bounce: 0,
        }}
        >
          <ErrorBoundary
            fallbackRender={(props: { error: unknown }) => <div>{props.error instanceof Error ? props.error.message : 'Unknown error'}</div>}
            onReset={() => {
              window.location.reload()
            }}
          >
            <TooltipProvider>
              <SeoManager />
              <RouterProvider router={router} />
              <Toaster />
            </TooltipProvider>
          </ErrorBoundary>
        </MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  )
}

export default App
