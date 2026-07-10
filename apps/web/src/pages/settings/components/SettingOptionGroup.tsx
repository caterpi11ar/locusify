import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingOption<T extends string> {
  value: T
  label: ReactNode
  icon?: string
}

interface SettingOptionGroupProps<T extends string> {
  icon: string
  label: string
  options: SettingOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function SettingOptionGroup<T extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: SettingOptionGroupProps<T>) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={cn(icon, 'size-4 text-text/50')} />
        <span className="text-sm font-medium text-text">{label}</span>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-fill-secondary p-1">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              value === opt.value
                ? 'bg-white/90 dark:bg-white/15 text-text shadow-sm'
                : 'text-text/50 hover:text-text',
            )}
          >
            {opt.icon && <span className={cn(opt.icon, 'size-3.5')} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
