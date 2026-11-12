import { brandLoading } from '@/lib/brand-loading'

/** Shared loading UI; callers own placement and readiness, never its artwork. */
export function BrandLoading({ className = 'absolute', unit = '1px' }: { className?: string, unit?: string }) {
  const size = (value: number) => `calc(${unit} * ${value})`
  return (
    <div
      data-testid="brand-loading"
      className={`${className} inset-0 flex items-center justify-center`}
      style={{ backgroundColor: brandLoading.background }}
    >
      <div className="flex flex-col items-center" style={{ gap: size(brandLoading.gap) }}>
        <img
          src={brandLoading.logo}
          alt={brandLoading.logoAlt}
          width={brandLoading.logoSize}
          height={brandLoading.logoSize}
          className="shrink-0 object-cover"
          style={{ width: size(brandLoading.logoSize), height: size(brandLoading.logoSize), borderRadius: size(brandLoading.logoRadius) }}
        />
        <span style={{ color: brandLoading.color, opacity: brandLoading.textOpacity, fontSize: size(brandLoading.fontSize), lineHeight: size(brandLoading.lineHeight), fontWeight: brandLoading.fontWeight }}>
          {brandLoading.message}
        </span>
      </div>
    </div>
  )
}
