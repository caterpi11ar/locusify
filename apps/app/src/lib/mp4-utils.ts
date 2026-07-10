interface ConversionResult {
  success: boolean
  videoUrl?: string
  error?: string
  convertedSize?: number
}

interface TransmuxOptions {
  onProgress?: (progress: number) => void
}

/**
 * Convert MOV to MP4 using transmux (re-muxing without re-encoding).
 * MOV and MP4 share the ISOBMFF container format, so we only need to
 * change the MIME type — original quality is fully preserved.
 */
export async function transmuxMovToMp4(videoUrl: string, options: TransmuxOptions = {}): Promise<ConversionResult> {
  return transmuxMovToMp4Simple(videoUrl, options)
}

/**
 * Simplified transmux: fetch the MOV bytes and wrap them in a video/mp4 Blob.
 */
async function transmuxMovToMp4Simple(
  videoUrl: string,
  options: TransmuxOptions = {},
): Promise<ConversionResult> {
  const { onProgress } = options

  try {
    onProgress?.(10)

    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    onProgress?.(60)

    const blob = new Blob([buffer], { type: 'video/mp4' })
    const convertedUrl = URL.createObjectURL(blob)

    onProgress?.(100)

    return {
      success: true,
      videoUrl: convertedUrl,
      convertedSize: blob.size,
    }
  }
  catch (error) {
    console.error('Simple transmux error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Simple transmux failed',
    }
  }
}
