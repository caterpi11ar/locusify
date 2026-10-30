/** Decode device-owned URLs only. Browser dimensions include image orientation. */
export async function readLocalMediaDimensions(url: string, video = false): Promise<{ width: number, height: number } | undefined> {
  if (!url.startsWith('blob:'))
    return undefined
  return new Promise((resolve) => {
    const media = video ? document.createElement('video') : new Image()
    let timeout: ReturnType<typeof setTimeout>
    const finish = (dimensions?: { width: number, height: number }) => {
      clearTimeout(timeout)
      media.onload = null
      media.onerror = null
      media.onloadedmetadata = null
      media.removeAttribute('src')
      if (media instanceof HTMLVideoElement)
        media.load()
      resolve(dimensions)
    }
    timeout = setTimeout(finish, 15000)
    const loaded = () => {
      const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth
      const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight
      finish(width > 0 && height > 0 ? { width, height } : undefined)
    }
    media.onload = loaded
    media.onloadedmetadata = loaded
    media.onerror = () => finish()
    if (media instanceof HTMLVideoElement)
      media.preload = 'metadata'
    media.src = url
  })
}
