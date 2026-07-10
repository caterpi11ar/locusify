import { transmuxMovToMp4 } from './mp4-utils'

let _isSafari: boolean | null = null
function isSafari(): boolean {
  if (_isSafari === null) {
    _isSafari = typeof navigator !== 'undefined'
      && /^(?:(?!chrome|android).)*safari/i.test(navigator.userAgent)
  }
  return _isSafari
}

/**
 * Check if the browser natively supports MOV playback.
 */
function isBrowserSupportMov(): boolean {
  if (isSafari())
    return true

  const video = document.createElement('video')
  const canPlayMov = video.canPlayType('video/quicktime')
  return canPlayMov === 'probably' || canPlayMov === 'maybe'
}

/**
 * Check whether a video URL needs to be transmuxed from MOV to MP4.
 */
export function needsVideoConversion(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  const urlPath = lowerUrl.split('?')[0]
  const isMovFile = urlPath.endsWith('.mov')

  if (!isMovFile)
    return false
  if (isBrowserSupportMov())
    return false

  return true
}

/**
 * Convert a MOV blob URL to an MP4 blob URL if needed.
 */
export async function convertMovToMp4(videoUrl: string): Promise<{ success: boolean, videoUrl?: string, error?: string }> {
  try {
    return await transmuxMovToMp4(videoUrl)
  }
  catch (error) {
    console.error('MOV to MP4 conversion failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
    }
  }
}
