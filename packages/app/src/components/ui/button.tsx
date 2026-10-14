import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * 全应用统一的按钮体系。
 *
 * 之前的状况（运行时实测，82 个可见按钮）：
 *   圆角 0px / 4px / 8px / 12px / 16px / full 六种
 *   高度 16~60px 共 14 种「圆角×高度」组合
 *   主 CTA 角色在 6 个文件里有 6 种不同实现
 *   主色同时存在 sky-400 / blue-600 / cyan-700 三种蓝
 *   登录抽屉的「验证码/密码」是 display:block，文字垂直偏移 -6.3%
 *
 * 本组件把规则固化下来：
 *   1. 文字按钮一律 rounded-xl；纯图标按钮一律 rounded-full
 *   2. 高度只允许 sm 36 / md 44 / lg 48 三档（图标同尺寸正方形）
 *   3. 一律 inline-flex + items-center + justify-center，垂直居中不靠 line-height
 *   4. 主色只有 cyan-700（白字 5.3:1 达 WCAG AA；品牌 primary #13ACF0 配白字只有 2.6:1）
 */
const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-colors duration-200 select-none',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        /** 主操作：整个界面里只应出现一个 */
        primary: 'bg-cyan-700 text-white hover:bg-cyan-800 active:bg-cyan-900',
        /** 次操作：与玻璃面板同族的浅填充 */
        secondary: 'bg-fill-secondary text-text hover:bg-fill-tertiary active:bg-fill-secondary/80',
        /** 低权重操作 */
        ghost: 'text-text-secondary hover:bg-fill-secondary hover:text-text',
        /** 带描边的中性按钮 */
        outline: 'border-fill-tertiary text-text hover:bg-fill-secondary border',
        /** 破坏性操作 */
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        /** 地图上的浮层按钮：毛玻璃 */
        glass: 'bg-material-thick border-fill-tertiary text-text hover:bg-material-opaque border backdrop-blur-[120px]',
      },
      size: {
        'sm': 'h-9 rounded-xl px-3.5 text-xs',
        'md': 'h-11 rounded-xl px-5 text-sm',
        'lg': 'h-12 rounded-xl px-6 text-sm',
        'icon': 'size-11 rounded-full',
        'icon-sm': 'size-9 rounded-full',
        'icon-lg': 'size-12 rounded-full',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'>
  & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
