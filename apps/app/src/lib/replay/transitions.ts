import type { TransitionType } from '@/types/template'

export interface TransitionVariants {
  initial: Record<string, number | string>
  animate: Record<string, number | string>
  exit: Record<string, number | string>
  transition: { duration: number, ease?: [number, number, number, number] }
}

export function getTransitionVariants(type: TransitionType, duration: number): TransitionVariants {
  const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

  switch (type) {
    case 'cut':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.05 },
      }
    case 'crossfade':
      return {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: duration / 1000, ease },
      }
    case 'slide-left':
      return {
        initial: { opacity: 0, x: 60 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -60 },
        transition: { duration: duration / 1000, ease },
      }
    case 'slide-up':
      return {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -60 },
        transition: { duration: duration / 1000, ease },
      }
    case 'zoom-in':
      return {
        initial: { opacity: 0, scale: 0.7 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.15 },
        transition: { duration: duration / 1000, ease },
      }
    case 'blur':
      return {
        initial: { opacity: 0, filter: 'blur(12px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(12px)' },
        transition: { duration: duration / 1000, ease },
      }
    default:
      return {
        initial: { opacity: 0, scale: 0.85, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.35, ease },
      }
  }
}
