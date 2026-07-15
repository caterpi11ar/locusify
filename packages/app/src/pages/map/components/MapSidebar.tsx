import type { LucideIcon } from 'lucide-react'
import {
  Images,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useSettingsStore } from '@/stores/settingsStore'
import { UserPanel } from './UserPanel'

const SIDEBAR_WIDTH = 200
const SIDEBAR_COLLAPSED_WIDTH = 56

interface MapSidebarProps {
  onUploadClick: () => void
  onRoutesClick: () => void
  onGalleryClick: () => void
  onShareClick: () => void
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
  onSettingsClick,
  onPricingClick,
  onLogout,
  routesDisabled,
  showUploadHint,
}: MapSidebarProps) {
  const { t } = useTranslation()
  const expanded = useSettingsStore(s => s.mapSidebarExpanded)
  const toggleMapSidebar = useSettingsStore(s => s.toggleMapSidebar)
  const collapsed = !expanded

  const items: SidebarItemProps[] = [
    {
      icon: Upload,
      label: t('menu.upload', { defaultValue: 'Upload Photos' }),
      onClick: onUploadClick,
      expanded,
      hintLabel: t('menu.upload.hint', { defaultValue: 'Upload GPS photos to begin' }),
      onboardingTarget: 'upload',
      showHint: showUploadHint,
    },
    {
      icon: Route,
      label: t('workspace.controls.viewReplay', { defaultValue: 'View Trajectory' }),
      onClick: onRoutesClick,
      expanded,
      disabled: routesDisabled,
    },
    {
      icon: Images,
      label: t('menu.gallery', { defaultValue: 'My Photos' }),
      onClick: onGalleryClick,
      expanded,
    },
    {
      icon: Share2,
      label: t('menu.share', { defaultValue: 'Share' }),
      onClick: onShareClick,
      expanded,
    },
  ]

  return (
    <aside className="absolute top-0 left-0 z-40 hidden h-full sm:block">
      <div
        className="relative flex h-full select-none flex-col overflow-visible border-r border-fill-tertiary bg-material-opaque shadow-2xl transition-[width] duration-200 ease-out"
        style={{ width: expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      >
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
          <SidebarItem
            icon={Settings}
            label={t('settings.title', { defaultValue: 'Settings' })}
            expanded={expanded}
            onClick={onSettingsClick}
          />
        </div>

        <SidebarCollapseButton
          collapsed={collapsed}
          label={collapsed ? t('menu.expandSidebar') : t('menu.collapseSidebar')}
          onClick={toggleMapSidebar}
        />
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
          'group flex h-9 min-w-8 select-none items-center overflow-hidden rounded-lg text-sm transition-colors',
          expanded ? 'gap-2' : 'w-full justify-center',
          disabled
            ? 'cursor-not-allowed text-text/25'
            : 'cursor-pointer text-text/55 hover:bg-fill-secondary hover:text-text active:bg-fill-tertiary',
        )}
        style={expanded ? { paddingLeft: 4 } : undefined}
      >
        <span className="flex size-7 flex-none items-center justify-center">
          <Icon className="size-4" />
        </span>
        {expanded
          ? <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          : <span className="sr-only">{label}</span>}
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

function SidebarCollapseButton({
  collapsed,
  label,
  onClick,
}: {
  collapsed: boolean
  label: string
  onClick: () => void
}) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <div className={cn('flex h-12 shrink-0 items-center py-3', collapsed ? 'justify-center px-1' : 'px-4')}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            aria-expanded={!collapsed}
            onClick={onClick}
            className="flex size-6 cursor-pointer items-center justify-center rounded-lg p-0 text-text/50 transition-colors hover:bg-fill-secondary hover:text-text active:bg-fill-tertiary"
          >
            <Icon className="size-4" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </div>
  )
}
