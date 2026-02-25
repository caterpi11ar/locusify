import type { FC } from 'react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/stores/settingsStore'
import { SettingOptionGroup } from './SettingOptionGroup'

type ThemeOption = 'light' | 'dark' | 'system'

export const ThemeSetting: FC = () => {
  const { t } = useTranslation()
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme()
  const { theme, setTheme } = useSettingsStore()

  const currentTheme = nextTheme as ThemeOption ?? theme

  const handleChange = (value: ThemeOption) => {
    setNextTheme(value)
    setTheme(value)
  }

  return (
    <SettingOptionGroup
      icon="i-mingcute-paint-brush-line"
      label={t('settings.theme.label')}
      options={[
        { value: 'light' as ThemeOption, icon: 'i-mingcute-sun-line', label: null },
        { value: 'dark' as ThemeOption, icon: 'i-mingcute-moon-line', label: null },
        { value: 'system' as ThemeOption, icon: 'i-mingcute-computer-line', label: null },
      ]}
      value={currentTheme}
      onChange={handleChange}
    />
  )
}
