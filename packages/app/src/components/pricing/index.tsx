import type { LucideIcon } from 'lucide-react'
import type { FC } from 'react'
import type { Plan } from '@/stores/subscriptionStore'
import { Drawer } from 'antd'
import {
  BadgeCheck,
  Headphones,
  LayoutTemplate,
  Route,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { m } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatDate } from '@/lib/formatters'
import { cn, glassPanel } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

interface PricingDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modal?: boolean
  desktopOffset?: number
}

const PLAN_ORDER: Record<Plan, number> = { free: 0, pro: 1, max: 2 }

const freeFeatures = [
  'pricing.feature.basicTemplates',
  'pricing.feature.unlimitedPhotos',
  'pricing.feature.mapReplay',
]

const proFeatures = [
  'pricing.feature.allTemplates',
  'pricing.feature.customization',
]

const maxIncludedFeatures = [
  'pricing.feature.allInPro',
]

const maxNewFeatures = [
  'pricing.feature.prioritySupport',
  'pricing.feature.earlyAccess',
]

const planIncludedFeatures: Record<Plan, string[]> = {
  free: [],
  pro: freeFeatures,
  max: maxIncludedFeatures,
}

const planNewFeatures: Record<Plan, string[]> = {
  free: freeFeatures,
  pro: proFeatures,
  max: maxNewFeatures,
}

const featureIconMap: Record<string, LucideIcon> = {
  'pricing.feature.basicTemplates': LayoutTemplate,
  'pricing.feature.unlimitedPhotos': UploadCloud,
  'pricing.feature.mapReplay': Route,
  'pricing.feature.allTemplates': LayoutTemplate,
  'pricing.feature.customization': SlidersHorizontal,
  'pricing.feature.allInPro': BadgeCheck,
  'pricing.feature.prioritySupport': Headphones,
  'pricing.feature.earlyAccess': Sparkles,
}

export const PricingDrawer: FC<PricingDrawerProps> = ({ open, onOpenChange, modal, desktopOffset = 0 }) => {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const { isPro, subscription } = useSubscriptionStore()
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = useState(false)
  const isMobile = useIsMobile()

  const currentPlan = subscription.plan
  const currentOrder = PLAN_ORDER[currentPlan]
  const drawerWidth = `min(960px, calc(100dvw - ${desktopOffset}px))`
  const plans: Plan[] = ['free', 'pro', 'max']

  const handleUpgrade = () => {
    onOpenChange(false)
    if (user) {
      navigate('/')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      placement={isMobile ? 'bottom' : 'left'}
      size={isMobile ? 'auto' : 960}
      mask={{ enabled: modal ?? isMobile, closable: modal ?? isMobile }}
      zIndex={!isMobile && modal === false ? 900 : undefined}
      closable={false}
      destroyOnHidden
      rootStyle={!isMobile ? { left: desktopOffset } : undefined}
      styles={{
        wrapper: isMobile ? { maxHeight: '85dvh' } : { height: '100dvh', width: drawerWidth },
        body: { padding: 0, background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
      }}
    >
      <div className={cn(glassPanel, 'pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl sm:rounded-l-none sm:rounded-r-2xl')}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 pb-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-text text-lg font-semibold">{t('pricing.title')}</h2>
            <p className="text-text-secondary mt-1 text-xs">{t('pricing.description')}</p>
          </div>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
            className="bg-fill-secondary hover:bg-fill-tertiary text-text/60 hover:text-text flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-fill-tertiary bg-material-thin md:grid-cols-3 md:divide-x md:divide-y-0 divide-y divide-fill-tertiary">
            {plans.map((plan, index) => {
              const isCurrent = currentPlan === plan
              const isIncluded = currentOrder > PLAN_ORDER[plan]
              const isPaid = plan !== 'free'

              return (
                <m.div
                  key={plan}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.25 }}
                  className={cn(
                    'flex min-h-105 flex-col p-6',
                    plan === 'pro' && 'bg-fill-secondary/20',
                  )}
                >
                  <div className="flex min-h-6 items-center gap-2">
                    <h3 className="text-text text-sm font-semibold">{t(`pricing.plan.${plan}`)}</h3>
                    {plan === 'pro' && (
                      <span className="border-text/70 text-text rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none">
                        {t('pricing.popular')}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="bg-fill-secondary text-text-secondary ml-auto shrink-0 rounded px-2 py-1 text-[10px] font-medium">
                        {t('pricing.currentPlan')}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline gap-2.5">
                    <span className="text-text text-4xl font-semibold tracking-normal">{t(`pricing.plan.${plan}.price`)}</span>
                    {isPaid && <span className="text-text-tertiary text-sm font-normal">{t('pricing.plan.priceSuffix')}</span>}
                  </div>

                  <p className="text-text-secondary mt-4 min-h-16 max-w-88 text-sm leading-relaxed">
                    {t(`pricing.plan.${plan}.description`)}
                  </p>

                  <div className="my-6 h-px w-full bg-fill-tertiary" />

                  <ul className="flex flex-1 flex-col gap-3">
                    {planIncludedFeatures[plan].map(feat => (
                      <FeatureRow key={feat} icon={featureIconMap[feat]} muted>
                        {t(feat)}
                      </FeatureRow>
                    ))}
                    {planNewFeatures[plan].map(feat => (
                      <FeatureRow key={feat} icon={featureIconMap[feat]}>
                        {t(feat)}
                      </FeatureRow>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8">
                    {isCurrent
                      ? (
                          <button
                            type="button"
                            disabled={plan === 'free'}
                            onClick={plan === 'free' ? undefined : () => setShowDetails(prev => !prev)}
                            className="border-fill-tertiary text-text-secondary flex h-9 w-fit min-w-32 cursor-pointer items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-70 enabled:hover:bg-fill-secondary"
                          >
                            {plan === 'free' ? t('pricing.currentPlan') : t('pricing.manage')}
                          </button>
                        )
                      : isIncluded
                        ? (
                            <div className="border-fill-tertiary text-text-secondary flex h-9 w-fit min-w-32 items-center justify-center rounded-full border px-4 text-sm font-medium">
                              {t('pricing.included')}
                            </div>
                          )
                        : (
                            <button
                              type="button"
                              onClick={handleUpgrade}
                              className={cn(
                                'flex h-9 w-fit min-w-32 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-medium transition-colors',
                                'bg-white text-black hover:bg-white/90',
                              )}
                            >
                              {t('pricing.useRedeemCode')}
                            </button>
                          )}
                  </div>
                </m.div>
              )
            })}
          </div>

          {/* Subscription details - shown below grid when manage is clicked */}
          {isPro && showDetails && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 overflow-hidden rounded-xl border border-fill-tertiary bg-material-thick p-3"
            >
              <div className="space-y-1.5 text-[11px] text-text/60">
                {subscription.currentPeriodEnd
                  ? (
                      <>
                        <p>{t('pricing.sub.expires', { date: formatDate(new Date(subscription.currentPeriodEnd), { year: 'numeric', month: 'short', day: 'numeric' }) })}</p>
                        <p>{t('pricing.sub.daysRemaining', { count: Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / 86400000)) })}</p>
                      </>
                    )
                  : <p>{t('pricing.sub.noExpiry')}</p>}
                {subscription.cancelAtPeriodEnd && (
                  <p className="text-amber-400">{t('pricing.sub.willNotRenew')}</p>
                )}
              </div>
            </m.div>
          )}
        </div>
      </div>

    </Drawer>
  )
}

function FeatureRow({
  icon: Icon,
  muted,
  children,
}: {
  icon: LucideIcon
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <li
      className={cn(
        'flex min-h-7 items-start gap-2.5 text-sm leading-relaxed',
        muted ? 'text-text-tertiary' : 'text-text',
      )}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}
