import type { ReplayTemplate } from '@/types/template'
import { m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { templates } from '@/data/templates'
import { cn } from '@/lib/utils'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

interface TemplateSelectorProps {
  selectedId: string
  onSelect: (template: ReplayTemplate) => void
  onUpgradeClick: () => void
}

export function TemplateSelector({ selectedId, onSelect, onUpgradeClick }: TemplateSelectorProps) {
  const { t } = useTranslation()
  const isPro = useSubscriptionStore(s => s.isPro)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text">
        {t('template.selector.title')}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {templates.map((template) => {
          const isSelected = template.id === selectedId
          const isLocked = template.tier === 'pro' && !isPro

          return (
            <m.button
              key={template.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (isLocked) {
                  onUpgradeClick()
                }
                else {
                  onSelect(template)
                }
              }}
              className={cn(
                'relative flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all',
                isSelected
                  ? 'border-sky-400 bg-sky-400/10'
                  : 'border-fill-tertiary bg-material-thick hover:border-text/20',
                isLocked && 'opacity-75',
              )}
            >
              {/* Pro badge */}
              {template.tier === 'pro' && (
                <span className="absolute -top-1.5 right-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  PRO
                </span>
              )}

              {/* Lock icon */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/10 backdrop-blur-[1px] dark:bg-black/20">
                  <i className="i-mingcute-lock-line text-lg text-text/50" />
                </div>
              )}

              {/* Template name */}
              <span className={cn(
                'text-xs font-medium',
                isSelected ? 'text-sky-400' : 'text-text',
              )}
              >
                {t(template.nameKey)}
              </span>

              {/* Description */}
              <span className="line-clamp-2 text-[10px] leading-tight text-text/50">
                {t(template.descriptionKey)}
              </span>

              {/* Mini preview tags */}
              <div className="flex flex-wrap gap-1">
                {template.config.filter.type !== 'none' && (
                  <span className="rounded bg-text/5 px-1 py-0.5 text-[8px] text-text/40">
                    {template.config.filter.type}
                  </span>
                )}
                {template.config.music.trackId !== 'none' && (
                  <span className="rounded bg-text/5 px-1 py-0.5 text-[8px] text-text/40">
                    {template.config.music.trackId}
                  </span>
                )}
                <span className="rounded bg-text/5 px-1 py-0.5 text-[8px] text-text/40">
                  {template.config.transitions.type}
                </span>
              </div>
            </m.button>
          )
        })}
      </div>
    </div>
  )
}
