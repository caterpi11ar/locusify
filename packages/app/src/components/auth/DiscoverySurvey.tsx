import type { DiscoverySource } from '@/lib/api/discovery-source'
import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FeedbackDialog } from '@/components/feedback'
import { Button } from '@/components/ui/button'
import { discoveryRequest, discoverySources } from '@/lib/api/discovery-source'
import { useTokenStore } from '@/lib/auth/token-storage'
import { createDiscoverySurvey } from '@/lib/discovery-survey'
import { cn, glassPanel } from '@/lib/utils'
import { platformStorage } from '@/lib/zustand-storage'
import { useAuthStore } from '@/stores/authStore'
import { useDiscoverySurveyStore } from '@/stores/discoverySurveyStore'

const sourceIcons: Record<DiscoverySource, string> = {
  friend_colleague: 'i-mingcute-group-line',
  search: 'i-mingcute-google-fill',
  x: 'i-mingcute-social-x-fill',
  linkedin: 'i-mingcute-linkedin-fill text-blue-500',
  youtube: 'i-mingcute-youtube-fill text-red-500',
  github: 'i-mingcute-github-fill',
  bilibili: 'i-mingcute-bilibili-fill text-sky-500',
  douyin: 'i-mingcute-tiktok-fill',
  xiaohongshu: 'i-mingcute-book-2-line text-rose-500',
  other_social: 'i-mingcute-earth-line',
  blog_newsletter: 'i-mingcute-news-line',
  ai_assistant: 'i-mingcute-openai-fill',
  work: 'i-mingcute-briefcase-line',
  offline_event: 'i-mingcute-calendar-line',
  dont_remember: 'i-mingcute-question-line',
  other: 'i-mingcute-more-1-line',
}

function AccountSurvey({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const [view, setView] = useState({ open: false, submitting: false, failed: false })
  const [selected, setSelected] = useState<DiscoverySource | null>(null)
  const [showThanks, setShowThanks] = useState(false)
  const dismissThanks = useCallback(() => setShowThanks(false), [])
  const controller = useRef<ReturnType<typeof createDiscoverySurvey> | null>(null)

  useEffect(() => {
    const survey = createDiscoverySurvey(userId, discoveryRequest, platformStorage, (next) => {
      setView(next)
      useDiscoverySurveyStore.setState({ open: next.open })
    }, () => {
      setShowThanks(true)
    })
    controller.current = survey
    const refresh = () => {
      void survey.refresh()
    }
    refresh()
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    const unsubscribe = useTokenStore.subscribe((next, previous) => {
      if (next.accessToken !== previous.accessToken)
        void survey.refresh(true)
    })
    const timer = window.setInterval(refresh, 1000)
    return () => {
      survey.dispose()
      useDiscoverySurveyStore.setState({ open: false })
      controller.current = null
      window.removeEventListener('online', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(timer)
      unsubscribe()
    }
  }, [userId])

  return (
    <>
      <FeedbackDialog open={showThanks} onClose={dismissThanks} completed />
      <Dialog.Root
        open={view.open}
        onOpenChange={(open) => {
          if (!open)
            controller.current?.skip()
        }}
      >
        <Dialog.Portal>
          <Dialog.Content className={cn(glassPanel, 'text-text fixed left-1/2 top-1/2 z-[101] flex max-h-[min(68dvh,560px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden focus:outline-none sm:max-h-[min(85dvh,720px)]')}>
            <div className="relative shrink-0 p-4 pr-12 sm:p-6 sm:pr-16">
              <Dialog.Title className="text-lg font-semibold leading-snug sm:text-xl">{t('discovery.title')}</Dialog.Title>
              <Dialog.Description className="text-text-secondary mt-2 text-xs sm:text-sm">{t('discovery.description')}</Dialog.Description>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-sm" className="absolute right-3 top-3" aria-label={t('discovery.close')}>
                  <i aria-hidden="true" className="i-mingcute-close-line text-xl" />
                </Button>
              </Dialog.Close>
            </div>
            <form
              className="flex min-h-0 flex-col"
              onSubmit={(event) => {
                event.preventDefault()
                if (selected)
                  void controller.current?.submit(selected)
              }}
            >
              <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6" data-testid="discovery-options-scroll">
                <fieldset disabled={view.submitting}>
                  <legend className="text-text-secondary mb-3 text-sm">{t('discovery.chooseOne')}</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {discoverySources.map(source => (
                      <label key={source} className={cn('border-fill-tertiary bg-fill-secondary flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary', selected === source && 'border-cyan-700 bg-cyan-700/15')}>
                        <i aria-hidden="true" className={cn('size-5 shrink-0 text-xl', sourceIcons[source])} />
                        <span className="min-w-0 flex-1">{t(`discovery.sources.${source}`)}</span>
                        <input
                          type="radio"
                          name="discovery-source"
                          value={source}
                          checked={selected === source}
                          onChange={() => setSelected(source)}
                          className="size-4 shrink-0 accent-cyan-700"
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="text-text-secondary mt-4 text-xs">{t('discovery.privacy')}</p>
                {view.failed && <p role="alert" className="mt-3 text-sm text-red-500">{t('discovery.failed')}</p>}
              </div>
              <div className="border-fill-tertiary flex shrink-0 items-center justify-end gap-3 border-t px-4 py-3 sm:p-4">
                <Button type="button" variant="ghost" onClick={() => controller.current?.skip()}>{t('discovery.skip')}</Button>
                <Button type="submit" variant="primary" disabled={!selected || view.submitting}>
                  {t(view.submitting ? 'discovery.submitting' : 'discovery.submit')}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

export function DiscoverySurvey() {
  const userId = useAuthStore(state => state.user?.id)
  return userId ? <AccountSurvey key={userId} userId={userId} /> : null
}
