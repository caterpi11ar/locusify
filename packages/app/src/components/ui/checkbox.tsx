'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * 复选框。
 *
 * 原版用 `border-border-secondary` / `bg-primary` 等 shadcn token
 * （本仓库未定义），尺寸 size-4（16px）也低于 44px 的最小触控目标。
 *
 * 现在：与按钮/输入框共用语义 token，选中态用与主按钮相同的强调色；
 * 尺寸给到 size-5（20px），并靠外层 label 把可点区域扩到 44px 高。
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-5 shrink-0 rounded-(--ctl-radius-sm) border transition-colors',
        // 边框原来用 border-fill-tertiary（5% 白）—— 叠在深色抽屉上几乎看不见，
        // 且不同背景透出的颜色不同，看上去像两个控件。UI 边界按
        // WCAG 1.4.11 需与相邻色 ≥3:1；text-secondary 实测约 5:1。
        'border-text-secondary bg-fill-secondary',
        'data-[state=checked]:border-cyan-700 data-[state=checked]:bg-cyan-700',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3.5" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
