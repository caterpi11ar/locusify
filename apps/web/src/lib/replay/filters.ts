import type { FilterType } from '@/types/template'

const cssFilters: Record<FilterType, string> = {
  'none': '',
  'vintage': 'sepia(0.3) contrast(1.1) saturate(0.8)',
  'warm': 'saturate(1.2) sepia(0.1) brightness(1.05)',
  'cool': 'saturate(0.9) hue-rotate(10deg) brightness(1.05)',
  'b&w': 'grayscale(1) contrast(1.1)',
  'film': 'contrast(1.15) saturate(0.85) sepia(0.15)',
  'cinematic': 'contrast(1.2) saturate(0.9) brightness(0.95)',
}

export function getFilterStyle(type: FilterType, intensity: number = 1): string {
  const filter = cssFilters[type]
  if (!filter || intensity >= 1)
    return filter
  // Blend with "none" by scaling the filter intensity
  // We wrap in a CSS string that interpolates intensity
  return filter
    .replace(/([\d.]+)(deg)?\)/g, (_match, numStr, unit) => {
      const val = Number.parseFloat(numStr)
      if (unit === 'deg') {
        // For hue-rotate: scale degrees toward 0 by intensity
        const blended = val * intensity
        return `${blended.toFixed(3)}deg)`
      }
      // For values normally at 1.0 (no change), interpolate toward 1.0
      // For values normally at 0.0, interpolate toward 0.0
      const blended = val > 1 ? 1 + (val - 1) * intensity : val < 1 ? 1 - (1 - val) * intensity : val
      return `${blended.toFixed(3)})`
    })
}

export { cssFilters }
