import type { LucideIcon } from 'lucide-react'
import {
  ChevronRight,
  Download,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sparkles,
  Sun,
  UserCircle,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { logout, useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

interface UserPanelProps {
  collapsed: boolean
  onSettingsClick: () => void
  onPricingClick: () => void
  onLogout?: () => void
  variant?: 'sidebar' | 'menuRow'
  contentSide?: 'left' | 'right'
  contentAlign?: 'start' | 'center' | 'end'
}

interface UserPanelMenuItemProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  danger?: boolean
  trailing?: React.ReactNode
}

const UserPanelTriggerButton = React.forwardRef<HTMLButtonElement, {
  collapsed: boolean
  name: string
  avatarUrl?: string
  variant: 'sidebar' | 'menuRow'
  open: boolean
  onClick: () => void
}>(({
  collapsed,
  name,
  avatarUrl,
  variant,
  open,
  onClick,
}, ref) => {
  if (variant === 'menuRow') {
    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        onClick={onClick}
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-fill-secondary active:bg-fill-tertiary data-[state=open]:bg-fill-secondary"
        data-state={open ? 'open' : 'closed'}
      >
        <UserAvatar avatarUrl={avatarUrl} name={name} className="size-9 rounded-lg" fallbackClassName="size-5" />
        <span className="min-w-0 flex-1">
          <span className="text-text block truncate text-sm font-semibold">
            {name}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-text/35" />
      </button>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        'flex h-11 min-w-0 cursor-pointer select-none items-center overflow-hidden rounded-xl transition-colors hover:bg-fill-secondary active:bg-fill-tertiary data-[state=open]:bg-fill-secondary',
        collapsed ? 'w-10 justify-center px-0' : 'flex-1 gap-2 px-1.5',
      )}
      data-state={open ? 'open' : 'closed'}
    >
      <UserAvatar avatarUrl={avatarUrl} name={name} className="size-7 rounded-lg" fallbackClassName="size-5" />
      {collapsed
        ? <span className="sr-only">{name}</span>
        : (
            <>
              <span className="text-text min-w-0 flex-1 truncate text-left text-sm font-semibold">{name}</span>
              <ChevronRight className={cn('size-4 shrink-0 text-text/35 transition-transform', open && 'rotate-90')} />
            </>
          )}
    </button>
  )
})

export function UserPanel({
  collapsed,
  onSettingsClick,
  onPricingClick,
  onLogout,
  variant = 'sidebar',
  contentSide = 'right',
  contentAlign = 'start',
}: UserPanelProps) {
  const { t } = useTranslation()
  const user = useAuthStore(s => s.user)
  const { subscription } = useSubscriptionStore()
  const [open, setOpen] = useState(false)

  const name = user?.name ?? t('auth.login.button.submit', { defaultValue: 'Login' })
  const avatarUrl = user?.avatarUrl

  const closeThen = (action: () => void) => {
    setOpen(false)
    window.setTimeout(action, 120)
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    onLogout?.()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
  }

  const popoverSide = variant === 'menuRow' ? 'bottom' : contentSide
  const popoverAlign = variant === 'menuRow' ? 'end' : contentAlign

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <UserPanelTriggerButton
          collapsed={collapsed}
          name={name}
          avatarUrl={avatarUrl}
          variant={variant}
          open={open}
          onClick={() => handleOpenChange(!open)}
        />
      </PopoverTrigger>
      <PopoverContent
        data-user-panel-content
        side={popoverSide}
        align={popoverAlign}
        sideOffset={variant === 'menuRow' ? 8 : 4}
        collisionPadding={8}
        className={cn(
          'z-100 rounded-xl border-fill-tertiary bg-material-opaque p-0 text-text shadow-2xl',
          variant === 'menuRow' ? 'w-56' : 'w-80',
        )}
      >
        <UserPanelContent
          avatarUrl={avatarUrl}
          name={name}
          planLabel={t(`settings.subscription.${subscription.plan}`)}
          compact={variant === 'menuRow'}
          onSettingsClick={() => closeThen(onSettingsClick)}
          onPricingClick={() => closeThen(onPricingClick)}
          onLogout={handleLogout}
        />
      </PopoverContent>
    </Popover>
  )
}

function UserPanelContent({
  avatarUrl,
  name,
  planLabel,
  onSettingsClick,
  onPricingClick,
  onLogout,
  compact,
}: {
  avatarUrl?: string
  name: string
  planLabel: string
  compact?: boolean
  onSettingsClick: () => void
  onPricingClick: () => void
  onLogout: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-0.5', compact ? 'min-w-56' : 'min-w-[300px]')}>
      <UserPanelInfo
        avatarUrl={avatarUrl}
        name={name}
        planLabel={planLabel}
      />
      <div className="py-0.5">
        <UserPanelMenuItem
          icon={Sparkles}
          label={t('settings.subscription.upgrade', { defaultValue: 'Upgrade' })}
          onClick={onPricingClick}
          trailing={<ChevronRight className="size-4" />}
        />
        <UserPanelMenuItem
          icon={Settings}
          label={t('settings.title', { defaultValue: 'Settings' })}
          onClick={onSettingsClick}
          trailing={<ChevronRight className="size-4" />}
        />
        <UserPanelMenuItem
          icon={Download}
          label={t('userPanel.getApp', { defaultValue: 'Get App' })}
          onClick={() => window.open('https://app.locusify.cn/', '_blank', 'noopener,noreferrer')}
          trailing={<ChevronRight className="size-4" />}
        />
        <UserPanelLanguage />
      </div>
      <div className="h-px bg-fill-tertiary" />
      <div className="py-0.5">
        <UserPanelMenuItem
          icon={LogOut}
          label={t('auth.logout', { defaultValue: 'Logout' })}
          onClick={onLogout}
          danger
        />
      </div>
    </div>
  )
}

function UserPanelInfo({
  avatarUrl,
  name,
  planLabel,
}: {
  avatarUrl?: string
  name: string
  planLabel: string
}) {
  return (
    <div className="relative p-3">
      <div className="flex items-center gap-3 pr-10">
        <UserAvatar avatarUrl={avatarUrl} name={name} className="size-9 rounded-lg" fallbackClassName="size-5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-[1.4] text-text">{name}</p>
          <span className="mt-1 inline-flex max-w-full items-center rounded-full bg-fill-secondary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
            <span className="truncate">{planLabel}</span>
          </span>
        </div>
      </div>
      <UserPanelThemeSwitch />
    </div>
  )
}

type ThemeOption = 'system' | 'light' | 'dark'

function UserPanelThemeSwitch() {
  const { t } = useTranslation()
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme()
  const theme = useSettingsStore(s => s.theme)
  const setTheme = useSettingsStore(s => s.setTheme)
  const [open, setOpen] = useState(false)
  const currentTheme = (nextTheme ?? theme) as ThemeOption
  const CurrentIcon = getThemeIcon(currentTheme)

  const handleSelect = (value: ThemeOption) => {
    setNextTheme(value)
    setTheme(value)
    setOpen(false)
  }

  const options: Array<{ value: ThemeOption, label: string, icon: LucideIcon }> = [
    { value: 'system', label: t('settings.theme.system', { defaultValue: 'System' }), icon: Monitor },
    { value: 'light', label: t('settings.theme.light', { defaultValue: 'Light' }), icon: Sun },
    { value: 'dark', label: t('settings.theme.dark', { defaultValue: 'Dark' }), icon: Moon },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="absolute top-3 right-3">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t('settings.theme.label', { defaultValue: 'Theme' })}
            aria-expanded={open}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text/55 transition-colors hover:bg-fill-secondary hover:text-text active:bg-fill-tertiary"
          >
            <CurrentIcon className="size-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={4}
        className="z-110 w-44 rounded-[10px] border-fill-tertiary bg-material-opaque p-1 text-text shadow-2xl"
      >
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            className={cn(
              'mx-1 my-1 flex min-h-8 w-[calc(100%-0.5rem)] cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm leading-8 transition-colors hover:bg-fill-tertiary active:bg-fill-tertiary',
              currentTheme === value ? 'text-text' : 'text-text/75',
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function getThemeIcon(theme: ThemeOption): LucideIcon {
  if (theme === 'light')
    return Sun
  if (theme === 'system')
    return Monitor
  return Moon
}

function UserPanelMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  trailing,
}: UserPanelMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mx-1 my-1 flex min-h-8 w-[calc(100%-0.5rem)] cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm leading-8 transition-colors hover:bg-fill-tertiary active:bg-fill-tertiary',
        danger ? 'text-red-500 dark:text-red-400' : 'text-text/75 hover:text-text',
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {trailing && <span className="shrink-0 text-text/35">{trailing}</span>}
    </button>
  )
}

function UserPanelLanguage() {
  const { t } = useTranslation()
  const language = useSettingsStore(s => s.language)
  const setLanguage = useSettingsStore(s => s.setLanguage)

  const options = [
    { value: 'en', label: t('settings.language.en', { defaultValue: 'English' }) },
    { value: 'zh-CN', label: t('settings.language.zh', { defaultValue: '中文' }) },
  ]

  return (
    <div className="mx-1 my-1 flex min-h-8 w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg px-3 py-1.5 text-sm leading-8 text-text/75">
      <span className="flex size-6 shrink-0 items-center justify-center">
        <Languages className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {t('settings.language.label', { defaultValue: 'Language' })}
      </span>
      <div className="flex shrink-0 rounded-lg bg-fill-secondary p-0.5">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={cn(
              'h-7 cursor-pointer rounded-md px-2 text-xs font-semibold transition-colors',
              language === option.value
                ? 'bg-material-thick text-text shadow-sm'
                : 'text-text/45 hover:text-text',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function UserAvatar({
  avatarUrl,
  name,
  className,
  fallbackClassName,
}: {
  avatarUrl?: string
  name: string
  className?: string
  fallbackClassName?: string
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn('shrink-0 object-cover', className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span className={cn('flex shrink-0 items-center justify-center bg-fill-secondary text-text/50', className)}>
      <UserCircle className={fallbackClassName} />
    </span>
  )
}
