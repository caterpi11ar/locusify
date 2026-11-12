import type { ReplaySurface } from './replay-surface'

const surfaces = new WeakMap<HTMLElement, Promise<ReplaySurface>>()

export function registerReplaySurface(host: HTMLElement, surface: Promise<ReplaySurface>) {
  surfaces.set(host, surface)
  void surface.catch(() => {})
  return () => {
    if (surfaces.get(host) === surface)
      surfaces.delete(host)
  }
}

export function getReplaySurface(element: HTMLElement) {
  const surface = surfaces.get(element)
  if (!surface)
    return Promise.reject(new Error('render-failed'))
  return surface
}
