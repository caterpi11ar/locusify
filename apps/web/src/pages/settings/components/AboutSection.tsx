import type { FC } from 'react'
import pkg from '@pkg'
import { useTranslation } from 'react-i18next'

import locusifyLogo from '@/assets/locusify.png'
import { Separator } from '@/components/ui/separator'

const APP_VERSION = `v${pkg.version}`
const GITHUB_URL = pkg.repository.url
const WEBSITE_URL = 'https://locusify.cn'

export const AboutSection: FC = () => {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={locusifyLogo} alt="Locusify" className="size-4 rounded" />
          <span className="text-sm font-medium text-text">{t('settings.about.appName')}</span>
        </div>
        <span className="text-xs text-text/50">
          {t('settings.about.version')}
          {' '}
          {APP_VERSION}
        </span>
      </div>
      <Separator />
      <a
        href={WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-3 hover:bg-fill-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="i-mingcute-globe-line size-4 text-text/50" />
          <span className="text-sm font-medium text-text">{t('settings.about.website')}</span>
        </div>
        <span className="i-mingcute-arrow-right-line size-4 text-text/50" />
      </a>
      <Separator />
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-3 hover:bg-fill-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="i-mingcute-github-fill size-4 text-text/50" />
          <span className="text-sm font-medium text-text">{t('settings.about.github')}</span>
        </div>
        <span className="i-mingcute-arrow-right-line size-4 text-text/50" />
      </a>
    </div>
  )
}
