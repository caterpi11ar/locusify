import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class values */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Check if a file is a video by MIME type or extension */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(?:mov|mp4|m4v)$/i.test(file.name)
}

/** Check if a file is an image by MIME type or extension */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(?:heic|heif|jpg|jpeg|png|webp|avif|gif|tiff?)$/i.test(file.name)
}

/** Get the filename stem without extension (e.g. "IMG_1234" from "IMG_1234.HEIC") */
export function getFilenameStem(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return lastDot > 0 ? name.substring(0, lastDot) : name
}

/**
 * Categorize files into images, paired Live Photo videos, and standalone videos.
 * Videos with a matching image filename stem are treated as Live Photos;
 * unmatched videos become standalone media items.
 */
export function categorizeFiles(allFiles: File[]): {
  imageFiles: File[]
  videoMap: Map<string, File>
  standaloneVideos: File[]
} {
  const imageFiles: File[] = []
  const videoFiles: File[] = []

  for (const file of allFiles) {
    if (isVideoFile(file)) {
      videoFiles.push(file)
    }
    else if (isImageFile(file)) {
      imageFiles.push(file)
    }
  }

  // Build a set of image filename stems for pairing
  const imageStems = new Set<string>()
  for (const img of imageFiles) {
    imageStems.add(getFilenameStem(img.name).toLowerCase())
  }

  // Partition videos into paired (Live Photo) and standalone
  const videoMap = new Map<string, File>()
  const standaloneVideos: File[] = []

  for (const vf of videoFiles) {
    const stem = getFilenameStem(vf.name).toLowerCase()
    if (imageStems.has(stem)) {
      videoMap.set(stem, vf)
    }
    else {
      standaloneVideos.push(vf)
    }
  }

  return { imageFiles, videoMap, standaloneVideos }
}

/** Shared glass-morphism panel style used across map UI components */
export const glassPanel = 'bg-material-thick border-fill-tertiary rounded-2xl border shadow-2xl backdrop-blur-[120px]'
