import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * 输入框。
 *
 * 原版是 shadcn 默认样式，用的 `border-input` / `bg-input` /
 * `text-muted-foreground` / `ring-ring` 这些 token **本仓库并未定义**，
 * 等于样式是坏的；而且尺寸是 h-9 rounded-md，与按钮的 h-11 rounded-xl
 * 不是一套 —— 登录表单里输入框和按钮高度差 8px、圆角差 4px。
 *
 * 现在与按钮共用同一组三层 token：
 *   高度 = --input-height（= --ctl-height-md = 44px，与按钮同高）
 *   圆角 = --input-radius（= --ctl-radius-md = 12px，与按钮同圆角）
 * 颜色用本项目的语义 token（text-text / bg-fill-* / border-fill-*）。
 */
function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-fill-tertiary bg-fill-secondary text-text w-full min-w-0 border',
        'h-(--input-height) rounded-(--input-radius) px-4 text-sm',
        'placeholder:text-text-secondary',
        'transition-colors duration-200',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-red-500 aria-invalid:ring-red-500/30',
        'file:text-text file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
