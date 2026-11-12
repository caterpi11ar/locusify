import type { VideoSample } from 'mediabunny'
import type { VideoSource } from '@/types/map'
import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from 'mediabunny'

/** Decode sequentially instead of seeking back to a keyframe for every frame. */
export class SceneVideo {
  private iterator?: AsyncGenerator<VideoSample, void, unknown>
  private current?: VideoSample
  private next?: VideoSample
  private lastTime = -1
  private disposed = false

  private constructor(private input: Input, private sink: VideoSampleSink, readonly duration: number) {}

  static async create(source: Exclude<VideoSource, { type: 'none' }>, signal: AbortSignal) {
    const url = source.type === 'motion-photo' ? source.imageUrl : source.videoUrl
    const response = await fetch(url, { signal })
    if (!response.ok)
      throw new Error('asset-unavailable')
    let blob = await response.blob()
    if (source.type === 'motion-photo')
      blob = blob.slice(source.offset, source.size ? source.offset + source.size : undefined, 'video/mp4')
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
    try {
      const track = await input.getPrimaryVideoTrack()
      if (!track || !await track.canDecode())
        throw new Error('asset-unavailable')
      const duration = await track.computeDuration()
      if (!Number.isFinite(duration) || duration <= 0)
        throw new Error('asset-unavailable')
      signal.throwIfAborted()
      return new SceneVideo(input, new VideoSampleSink(track), duration)
    }
    catch (error) {
      input.dispose()
      throw error
    }
  }

  async at(seconds: number) {
    if (this.disposed)
      throw new DOMException('Scene disposed', 'AbortError')
    const time = seconds % this.duration
    if (!this.iterator || time < this.lastTime) {
      this.current?.close()
      this.next?.close()
      await this.iterator?.return()
      this.iterator = this.sink.samples(0)
      this.current = undefined
      this.next = (await this.iterator.next()).value ?? undefined
    }
    this.lastTime = time
    while (this.next && (!this.current || this.next.timestamp <= time)) {
      this.current?.close()
      this.current = this.next
      this.next = (await this.iterator!.next()).value ?? undefined
    }
    if (this.disposed) {
      this.current?.close()
      this.next?.close()
      throw new DOMException('Scene disposed', 'AbortError')
    }
    return this.current
  }

  dispose() {
    this.disposed = true
    this.current?.close()
    this.next?.close()
    void this.iterator?.return().catch(() => {})
    this.input.dispose()
  }
}
