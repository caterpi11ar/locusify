import type { TextStyleOptions } from 'pixi.js'

// Resolve the same CSS utilities/inherited font as the original replay UI.
// Read once during scene preparation, never during the frame loop.
export const replayTextClasses = {
  body: '',
  date: 'font-handwriting text-[0.65rem]',
  coordinates: 'font-mono text-[0.5rem]',
  captionTitle: 'font-serif text-[1.05rem] font-semibold tracking-[0.02em]',
  captionBody: 'font-serif text-[0.85rem] italic leading-[1.7]',
  introTitle: 'text-4xl font-bold tracking-tight',
  introSubtitle: 'text-base',
  brand: 'text-sm font-semibold',
  statValue: 'text-base font-semibold tabular-nums',
  statLabel: 'text-2xs',
  statUnit: 'text-2xs font-normal',
  attribution: 'text-xs',
  avatar: 'text-xl',
} as const

export type ReplayTextRole = keyof typeof replayTextClasses
export interface SceneTextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: TextStyleOptions['fontWeight']
  fontStyle: TextStyleOptions['fontStyle']
  letterSpacing: number
  lineHeight: number
}
export type SceneTypography = Record<ReplayTextRole, SceneTextStyle>

export function canvasFont(style: SceneTextStyle) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
}

export function applyCanvasTextStyle(ctx: CanvasRenderingContext2D, style: SceneTextStyle) {
  ctx.font = canvasFont(style)
  ctx.letterSpacing = `${style.letterSpacing}px`
}

export async function prepareSceneTypography(signal: AbortSignal, text = 'Locusify 0123456789 城市漫游') {
  signal.throwIfAborted()
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  probe.setAttribute('aria-hidden', 'true')
  const entries = Object.entries(replayTextClasses).map(([role, className]) => {
    const element = document.createElement('span')
    element.className = className
    probe.append(element)
    return { role, element }
  })
  document.body.append(probe)
  let typography: SceneTypography
  try {
    typography = Object.fromEntries(entries.map(({ role, element }) => {
      const css = getComputedStyle(element)
      const fontSize = Number.parseFloat(css.fontSize)
      return [role, {
        fontFamily: css.fontFamily,
        fontSize,
        fontWeight: css.fontWeight,
        fontStyle: css.fontStyle,
        letterSpacing: Number.parseFloat(css.letterSpacing) || 0,
        lineHeight: Number.parseFloat(css.lineHeight) || fontSize * 1.2,
      }]
    })) as SceneTypography
  }
  finally { probe.remove() }
  // fonts.ready alone does not request faces which have not been used by DOM.
  const fonts = new Set(Object.values(typography).map(canvasFont))
  await Promise.all([...fonts].map(font => document.fonts.load(font, text)))
  await document.fonts.ready
  signal.throwIfAborted()
  return typography
}
