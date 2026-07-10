/**
 * Motion Photo video extraction for local File objects.
 * Extracts embedded MP4 video data from Google Motion Photos.
 */

/**
 * Extract the embedded MP4 video from a local File object.
 * @param file The image File containing an embedded video
 * @param offset Byte offset where the video starts
 * @param size Optional video size in bytes
 * @returns Blob URL for the extracted video, or null on failure
 */
export async function extractMotionPhotoVideoFromFile(
  file: File,
  offset: number,
  size?: number,
): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const videoData = size
      ? arrayBuffer.slice(offset, offset + size)
      : arrayBuffer.slice(offset)

    const blob = new Blob([videoData], { type: 'video/mp4' })

    if (!(await isValidMp4(blob))) {
      console.error('[motion-photo] Extracted data is not a valid MP4')
      return null
    }

    return URL.createObjectURL(blob)
  }
  catch (error) {
    console.error('[motion-photo] Failed to extract video from file:', error)
    return null
  }
}

/**
 * Extract the embedded MP4 video from a remote image URL.
 * Tries Range Request first, then falls back to full download.
 */
export async function extractMotionPhotoVideo(
  imageUrl: string,
  offset: number,
  size?: number,
): Promise<string | null> {
  try {
    // Try Range Request first if size is known
    if (size && size > 0) {
      try {
        const endByte = offset + size - 1
        const response = await fetch(imageUrl, {
          headers: { Range: `bytes=${offset}-${endByte}` },
        })

        if (response.status === 206) {
          const blob = await response.blob()
          if (await isValidMp4(blob)) {
            return URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }))
          }
        }
      }
      catch {
        // Fall through to full download
      }
    }

    // Fallback: full download and slice
    const response = await fetch(imageUrl)
    const arrayBuffer = await response.arrayBuffer()
    const videoData = size ? arrayBuffer.slice(offset, offset + size) : arrayBuffer.slice(offset)
    const blob = new Blob([videoData], { type: 'video/mp4' })

    if (!(await isValidMp4(blob))) {
      console.error('[motion-photo] Extracted data is not a valid MP4')
      return null
    }

    return URL.createObjectURL(blob)
  }
  catch (error) {
    console.error('[motion-photo] Failed to extract video:', error)
    return null
  }
}

/**
 * Validate that a Blob contains a valid MP4 file by checking for 'ftyp' signature.
 */
async function isValidMp4(blob: Blob): Promise<boolean> {
  if (blob.size < 32)
    return false

  const header = await blob.slice(0, 32).arrayBuffer()
  const bytes = new Uint8Array(header)
  const ftyp = [0x66, 0x74, 0x79, 0x70] // 'ftyp'

  for (let i = 0; i <= bytes.length - 4; i++) {
    if (bytes[i] === ftyp[0] && bytes[i + 1] === ftyp[1] && bytes[i + 2] === ftyp[2] && bytes[i + 3] === ftyp[3]) {
      return true
    }
  }

  return false
}

/**
 * Revoke a blob URL created by the extraction functions.
 */
export function revokeMotionPhotoVideoUrl(blobUrl: string): void {
  if (blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl)
  }
}
