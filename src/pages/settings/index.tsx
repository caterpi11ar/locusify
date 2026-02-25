import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { cn, glassPanel } from '@/lib/utils'
import { AboutSection } from './components/AboutSection'
import { LanguageSetting } from './components/LanguageSetting'
import { PrivacySection } from './components/PrivacySection'
import { SettingsSection } from './components/SettingsSection'
import { ThemeSetting } from './components/ThemeSetting'

interface SettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SettingsDrawer: FC<SettingsDrawerProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] border-none bg-transparent backdrop-blur-none">
        <DrawerHeader className="hidden">
          <DrawerTitle>{t('settings.title')}</DrawerTitle>
          <DrawerDescription>{t('settings.section.appearance')}</DrawerDescription>
        </DrawerHeader>
        <div className={cn(glassPanel, 'flex flex-col overflow-hidden rounded-t-2xl')}>
          <div className="flex-1 overflow-y-auto p-4 pb-safe">
            <h2 className="mb-4 text-lg font-semibold text-text">{t('settings.title')}</h2>
            <SettingsSection label={t('settings.section.appearance')}>
              <ThemeSetting />
              <Separator />
              <LanguageSetting />
            </SettingsSection>
            <SettingsSection label={t('settings.section.privacy')}>
              <PrivacySection />
            </SettingsSection>
            <SettingsSection label={t('settings.section.about')}>
              <AboutSection />
            </SettingsSection>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
