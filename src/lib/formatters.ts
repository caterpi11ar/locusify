import i18n from 'i18next'

/**
 * Format GPS coordinates to a display string.
 * Uses absolute values with directional suffixes.
 */
export function formatCoordinates(
  lat: number,
  lng: number,
  latRef?: string,
  lngRef?: string,
  precision = 4,
): string {
  const latDir = latRef || (lat >= 0 ? 'N' : 'S')
  const lngDir = lngRef || (lng >= 0 ? 'E' : 'W')
  return `${Math.abs(lat).toFixed(precision)}°${latDir} ${Math.abs(lng).toFixed(precision)}°${lngDir}`
}

/**
 * Format a Date to a localized date string.
 * Uses the current i18n language by default.
 */
export function formatDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const resolvedLocale = locale ?? i18n.language
  return date.toLocaleDateString(resolvedLocale, options ?? {
    month: 'numeric',
    day: 'numeric',
  })
}

/**
 * Format a Date to a localized time string (HH:MM).
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format bytes into a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
