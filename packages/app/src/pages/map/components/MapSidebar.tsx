import type { LucideIcon } from 'lucide-react'
import {
  CircleHelp,
  Images,
  Route,
  Settings,
  Share2,
  Upload,
} from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { UserPanel } from './UserPanel'

interface MapSidebarProps {
  onUploadClick: () => void
  onRoutesClick: () => void
  onGalleryClick: () => void
  onShareClick: () => void
  onHelpClick: () => void
  showHelpHint?: boolean
  onSettingsClick: () => void
  onPricingClick: () => void
  onLogout?: () => void
  routesDisabled?: boolean
  showUploadHint?: boolean
}

interface SidebarItemProps {
  disabled?: boolean
  expanded: boolean
  icon: LucideIcon
  label: string
  shortLabel?: string
  hintLabel?: string
  onboardingTarget?: string
  onClick: () => void
  showHint?: boolean
}

export function MapSidebar({
  onUploadClick,
  onRoutesClick,
  onGalleryClick,
  onShareClick,
  onHelpClick,
  showHelpHint,
  onSettingsClick,
  onPricingClick,
  onLogout,
  routesDisabled,
  showUploadHint,
}: MapSidebarProps) {
  const { t } = useTranslation()
  const expanded = false
  const collapsed = true

  const items: SidebarItemProps[] = [
    {
      icon: Upload,
      label: t('menu.upload', { defaultValue: 'Upload Photos' }),
      shortLabel: t('menu.upload.short', { defaultValue: 'Upload' }),
      onClick: onUploadClick,
      expanded,
      hintLabel: t('menu.upload.hint', { defaultValue: 'Upload GPS photos to begin' }),
      onboardingTarget: 'upload',
      showHint: showUploadHint,
    },
    {
      icon: Route,
      label: t('workspace.controls.viewReplay', { defaultValue: 'View Trajectory' }),
      shortLabel: t('menu.replay.short', { defaultValue: 'Replay' }),
      onClick: onRoutesClick,
      expanded,
      disabled: routesDisabled,
    },
    {
      icon: Images,
      label: t('menu.gallery', { defaultValue: 'My Photos' }),
      shortLabel: t('menu.gallery.short', { defaultValue: 'Photos' }),
      onClick: onGalleryClick,
      expanded,
    },
    {
      icon: Share2,
      label: t('menu.share', { defaultValue: 'Share' }),
      shortLabel: t('menu.share.short', { defaultValue: 'Share' }),
      onClick: onShareClick,
      expanded,
    },
  ]

  return (
    <aside className="absolute top-0 left-0 z-1000 hidden h-full sm:block">
      <div className="relative flex h-full w-14 select-none flex-col overflow-visible border-r border-fill-tertiary bg-material-opaque shadow-2xl">
        <UserHeader
          collapsed={collapsed}
          onSettingsClick={onSettingsClick}
          onPricingClick={onPricingClick}
          onLogout={onLogout}
        />

        <nav
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-px overflow-visible px-1',
          )}
        >
          {items.map(item => (
            <SidebarItem key={item.label} {...item} />
          ))}
        </nav>

        <div className={cn('flex flex-col gap-px', collapsed ? 'px-1' : 'px-3')}>
          <div className="relative">
            {showHelpHint && (
              <m.div
                aria-hidden
                className="pointer-events-none absolute inset-1 rounded-xl border border-sky-400/70"
                animate={{ scale: [1, 1.18, 1.18], opacity: [0, 0.75, 0] }}
                transition={{ duration: 2.4, repeat: 2, repeatDelay: 0.6 }}
              />
            )}
            <AnimatePresence>
              {showHelpHint && (
                <m.div
                  className="border-fill-tertiary bg-material-opaque text-text pointer-events-none absolute top-1/2 left-full z-100 ml-2 -translate-y-1/2 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium shadow-xl backdrop-blur-xl"
                  initial={{ opacity: 0, x: -8, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -6, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="mr-1.5 text-sky-400">?</span>
                  {t('help.hint')}
                </m.div>
              )}
            </AnimatePresence>
            <SidebarItem
              icon={CircleHelp}
              label={t('help.menu')}
              shortLabel={t('help.menu.short')}
              expanded={expanded}
              onClick={onHelpClick}
            />
          </div>
          <SidebarItem
            icon={Settings}
            label={t('settings.title', { defaultValue: 'Settings' })}
            shortLabel={t('settings.title.short', { defaultValue: 'Settings' })}
            expanded={expanded}
            onClick={onSettingsClick}
          />
        </div>
      </div>
    </aside>
  )
}

function UserHeader({
  collapsed,
  onSettingsClick,
  onPricingClick,
  onLogout,
}: {
  collapsed: boolean
  onSettingsClick: () => void
  onPricingClick: () => void
  onLogout?: () => void
}) {
  return (
    <div className={cn('flex shrink-0 items-center gap-1.5 p-1', collapsed ? 'justify-center' : '')}>
      <UserPanel
        collapsed={collapsed}
        onSettingsClick={onSettingsClick}
        onPricingClick={onPricingClick}
        onLogout={onLogout}
      />
    </div>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  shortLabel,
  hintLabel,
  expanded,
  onClick,
  disabled,
  onboardingTarget,
  showHint,
}: SidebarItemProps) {
  const button = (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        data-onboarding={onboardingTarget}
        aria-label={label}
        className={cn(
          'group flex min-w-8 select-none overflow-hidden rounded-lg text-sm transition-colors',
          expanded ? 'h-9 items-center gap-2' : 'h-[52px] w-full flex-col items-center justify-center gap-0.5 py-1',
          disabled
            ? 'cursor-not-allowed text-text/25'
            : 'cursor-pointer text-text/55 hover:bg-fill-secondary hover:text-text active:bg-fill-tertiary',
        )}
        style={expanded ? { paddingLeft: 4 } : undefined}
      >
        <span className="flex size-6 flex-none items-center justify-center">
          <Icon className="size-4" />
        </span>
        {expanded
          ? <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          : <span className="max-w-full truncate px-0.5 text-center text-[10px] leading-none">{shortLabel ?? label}</span>}
      </button>
      <AnimatePresence>
        {showHint && (
          <m.div
            className="absolute top-1/2 left-full z-100 ml-2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-black/80 px-3 py-1.5 text-xs text-white backdrop-blur-sm"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            {hintLabel ?? label}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )

  if (expanded)
    return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
