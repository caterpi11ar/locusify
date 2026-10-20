/**
 * MediaRecorder WebM and fastStart MP4 both lack usable cues, so seeking is
 * unreliable — decode a frame by *playing* to it instead and grabbing the first
 * frame at or after the requested media time.
 */
export async function decodeFrameAtCanvas(blob: Blob, time: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.style.cssText = 'position:fixed;left:-4000px;top:0;width:2px;height:2px'
  document.body.appendChild(video)
  try {
    video.src = url
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res()
      video.onerror = () => rej(new Error('video decode failed'))
      setTimeout(() => rej(new Error('video load timeout')), 15000)
    })
    const target = Math.min(time, Math.max(0, (video.duration || 0) - 0.05))
    await new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error('video playback timeout')), 30000)
      const onFrame: VideoFrameRequestCallback = (_now, meta) => {
        if (meta.mediaTime + 1e-3 < target) {
          video.requestVideoFrameCallback(onFrame)
          return
        }
        video.pause()
        clearTimeout(timer)
        res()
      }
      video.requestVideoFrameCallback(onFrame)
      video.play().catch(rej)
    })
    const c = document.createElement('canvas')
    c.width = video.videoWidth
    c.height = video.videoHeight
    c.getContext('2d')!.drawImage(video, 0, 0)
    return c
  }
  finally {
    video.remove()
    URL.revokeObjectURL(url)
  }
}
