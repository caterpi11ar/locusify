import logo from '@/assets/locusify.png'

export const brandImageClasses = 'object-cover overflow-hidden rounded-[30%] [corner-shape:superellipse(1.45)]'
export const brandLogo = logo

/** Recognize only our local assets, including URLs persisted by older builds. */
export function isBrandAvatar(src?: string): boolean {
  return src === logo || src === '/src/assets/locusify.png'
    || /^\/assets\/locusify-[\w-]+\.png$/.test(src ?? '')
}
