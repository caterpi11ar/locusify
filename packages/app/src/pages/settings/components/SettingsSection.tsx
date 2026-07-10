import type { FC, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  label: string
  children: ReactNode
  className?: string
}

export const SettingsSection: FC<SettingsSectionProps> = ({ label, children, className }) => {
  return (
    <div className={cn('mb-4', className)}>
      <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-text/50">
        {label}
      </p>
      <div className="overflow-hidden rounded-2xl border border-fill-tertiary bg-material-thick shadow-lg backdrop-blur-[60px]">
        {children}
      </div>
    </div>
  )
}
