import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settingsStore'
import { SettingOptionGroup } from './SettingOptionGroup'

export const LanguageSetting: FC = () => {
  const { t } = useTranslation()
  const { language, setLanguage } = useSettingsStore()

  return (
    <SettingOptionGroup
      icon="i-mingcute-translate-2-line"
      label={t('settings.language.label')}
      options={[
        { value: 'en', label: t('settings.language.en') },
        { value: 'zh-CN', label: t('settings.language.zh') },
      ]}
      value={language}
      onChange={setLanguage}
    />
  )
}
