import logo from '@/assets/locusify.png'

/** Single visual definition for page loading, replay preparation and video intro. */
export const brandLoading = {
  logo,
  logoAlt: 'Locusify',
  message: 'Your Journey, Mapped',
  background: '#0a0a0a',
  color: '#ffffff',
  logoSize: 96,
  logoRadius: 28.8,
  gap: 20,
  fontSize: 16,
  lineHeight: 24,
  fontWeight: 400,
  textOpacity: 0.4,
} as const

export function getBrandLoadingLayout(width: number, height: number) {
  const top = (height - brandLoading.logoSize - brandLoading.gap - brandLoading.lineHeight) / 2
  return {
    logoX: (width - brandLoading.logoSize) / 2,
    logoY: top,
    textCenterX: width / 2,
    textY: top + brandLoading.logoSize + brandLoading.gap,
  }
}
