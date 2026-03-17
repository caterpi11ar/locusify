import type { FC } from 'react'
import type { Plan } from '@/stores/subscriptionStore'
import { m } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { formatDate } from '@/lib/formatters'
import { cn, glassPanel } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

interface PricingDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

const maxFeatures = [
  'pricing.feature.allInPro',
  'pricing.feature.prioritySupport',
  'pricing.feature.earlyAccess',
]

export const PricingDrawer: FC<PricingDrawerProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const { isPro, subscription } = useSubscriptionStore()
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = useState(false)

  const currentPlan = subscription.plan
  const currentOrder = PLAN_ORDER[currentPlan]

  const handleUpgrade = () => {
    onOpenChange(false)
    if (user) {
      navigate('/')
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] border-none bg-transparent backdrop-blur-none">
        <DrawerHeader className="hidden">
          <DrawerTitle>{t('pricing.title')}</DrawerTitle>
          <DrawerDescription>{t('pricing.description')}</DrawerDescription>
        </DrawerHeader>
        <div className={cn(glassPanel, 'flex flex-col overflow-hidden rounded-t-2xl')}>
          <div className="flex-1 overflow-y-auto p-4 pb-safe">
            {/* Header */}
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-text">{t('pricing.title')}</h2>
              <p className="mt-1 text-xs text-text/50">{t('pricing.description')}</p>
            </div>

            {/* Free card - compact */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border border-fill-tertiary bg-material-thick p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-text">{t('pricing.plan.free')}</h3>
                  <span className="text-lg font-extrabold tracking-tighter text-text">
                    {t('pricing.plan.free.price')}
                  </span>
                </div>
                <span
                  className={cn(
                    'rounded-lg px-2 py-1 text-[10px] font-medium',
                    currentPlan === 'free' ? 'bg-text/10 text-text' : 'bg-text/5 text-text/40',
                  )}
                >
                  {currentPlan === 'free' ? t('pricing.currentPlan') : t('pricing.included')}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {freeFeatures.map(feat => (
                  <li key={feat} className="flex items-center gap-1 text-[10px] text-text/50">
                    <i className="i-mingcute-check-line shrink-0 text-text/30" />
                    <span>{t(feat)}</span>
                  </li>
                ))}
              </ul>
            </m.div>

            {/* Pro + Max grid */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {/* Pro card */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="relative overflow-hidden rounded-xl border border-sky-400/50 bg-sky-400/5 p-4"
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(56,189,248,0.15) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite',
                  }}
                />

                <div className="relative flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text">{t('pricing.plan.pro')}</h3>
                  {currentPlan === 'pro' && (
                    <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">
                      {t('pricing.currentPlan')}
                    </span>
                  )}
                </div>

                <ul className="relative mt-3 space-y-1.5">
                  {proFeatures.map(feat => (
                    <li key={feat} className="flex items-start gap-1.5 text-[11px] text-text/60">
                      <i className="i-mingcute-check-line mt-0.5 shrink-0 text-sky-400" />
                      <span>{t(feat)}</span>
                    </li>
                  ))}
                </ul>

                {currentPlan === 'pro'
                  ? (
                      <button
                        type="button"
                        onClick={() => setShowDetails(prev => !prev)}
                        className={cn(
                          'relative mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors',
                          'bg-sky-400 text-white hover:bg-sky-500',
                        )}
                      >
                        {t('pricing.manage')}
                      </button>
                    )
                  : currentOrder > PLAN_ORDER.pro
                    ? (
                        <div className="relative mt-4 w-full rounded-lg bg-text/5 py-2 text-center text-xs font-medium text-text/40">
                          {t('pricing.included')}
                        </div>
                      )
                    : (
                        <button
                          type="button"
                          onClick={handleUpgrade}
                          className={cn(
                            'relative mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors',
                            'bg-sky-400 text-white hover:bg-sky-500',
                          )}
                        >
                          {t('pricing.useRedeemCode')}
                        </button>
                      )}
              </m.div>

              {/* Max card */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="relative overflow-hidden rounded-xl border border-violet-400/50 bg-violet-400/5 p-4"
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.15) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 3s ease-in-out infinite',
                  }}
                />

                <div className="relative flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text">{t('pricing.plan.max')}</h3>
                  {currentPlan === 'max' && (
                    <span className="rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-400">
                      {t('pricing.currentPlan')}
                    </span>
                  )}
                </div>

                <ul className="relative mt-3 space-y-1.5">
                  {maxFeatures.map(feat => (
                    <li key={feat} className="flex items-start gap-1.5 text-[11px] text-text/60">
                      <i className="i-mingcute-check-line mt-0.5 shrink-0 text-violet-400" />
                      <span>{t(feat)}</span>
                    </li>
                  ))}
                </ul>

                {currentPlan === 'max'
                  ? (
                      <button
                        type="button"
                        onClick={() => setShowDetails(prev => !prev)}
                        className={cn(
                          'relative mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors',
                          'bg-violet-400 text-white hover:bg-violet-500',
                        )}
                      >
                        {t('pricing.manage')}
                      </button>
                    )
                  : (
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        className={cn(
                          'relative mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors',
                          'bg-violet-400 text-white hover:bg-violet-500',
                        )}
                      >
                        {t('pricing.useRedeemCode')}
                      </button>
                    )}
              </m.div>
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

        <style>
          {`
          @keyframes shimmer {
            0%, 100% { background-position: -200% 0; }
            50% { background-position: 200% 0; }
          }
        `}
        </style>
      </DrawerContent>
    </Drawer>
  )
}
