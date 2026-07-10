import type { FC } from 'react'
import { useTranslation } from 'react-i18next'

const PRIVACY_ITEMS = [
  'settings.privacy.noCollection',
  'settings.privacy.locationDisplay',
  'settings.privacy.localOnly',
  'settings.privacy.noTracking',
] as const

export const PrivacySection: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="i-mingcute-shield-line size-4 text-text/50" />
        <span className="text-sm font-medium text-text">{t('settings.privacy.heading')}</span>
      </div>
      <div className="space-y-2">
        {PRIVACY_ITEMS.map(key => (
          <div key={key} className="flex items-start gap-2">
            <span className="i-mingcute-check-circle-line size-3.5 text-green-500 mt-0.5 shrink-0" />
            <span className="text-xs text-text/60 leading-relaxed">{t(key)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
