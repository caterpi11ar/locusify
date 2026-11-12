import type { EncoderCommand, EncoderReply } from './encoder-protocol'

/** A bounded queue: the display waits when the worker cannot consume frames. */
export class LiveEncoder {
  private worker = new Worker(new URL('./encoder.worker.ts', import.meta.url), { type: 'module' })
  private pending = 0
  private error: Error | undefined
  private resolveReady!: () => void
  private rejectReady!: (cause: unknown) => void
  private resolveDone!: (blob: Blob) => void
  private rejectDone!: (cause: unknown) => void
  readonly ready = new Promise<void>((resolve, reject) => {
    this.resolveReady = resolve
    this.rejectReady = reject
  })

  readonly done = new Promise<Blob>((resolve, reject) => {
    this.resolveDone = resolve
    this.rejectDone = reject
  })

  constructor(width: number, height: number, audio: boolean) {
    void this.ready.catch(() => {})
    void this.done.catch(() => {})
    this.worker.onmessage = ({ data }: MessageEvent<EncoderReply>) => {
      if (data.type === 'ready')
        this.resolveReady()
      else if (data.type === 'accepted')
        this.pending--
      else if (data.type === 'done')
        this.resolveDone(new Blob([data.buffer], { type: 'video/mp4' }))
      else if (data.type === 'error')
        this.fail(new Error(data.message))
    }
    this.worker.onerror = () => this.fail(new Error('encoding-failed'))
    this.send({ type: 'start', width, height, audio })
  }

  get available() {
    if (this.error)
      throw this.error
    return this.pending < 3
  }

  add(canvas: HTMLCanvasElement, index: number) {
    if (!this.available)
      throw new Error('Encoder queue is full')
    const timestamp = Math.round(index * 1e6 / 60)
    const frame = new VideoFrame(canvas, { timestamp, duration: Math.round((index + 1) * 1e6 / 60) - timestamp })
    try {
      this.send({ type: 'frame', frame }, [frame])
      this.pending++
    }
    catch (error) {
      frame.close()
      throw error
    }
  }

  addAudio(data: Float32Array, timestamp: number) {
    this.send({ type: 'audio', data, timestamp }, [data.buffer])
  }

  finish() {
    this.send({ type: 'finish' })
    return this.done
  }

  private send(message: EncoderCommand, transfer: Transferable[] = []) {
    if (this.error)
      throw this.error
    this.worker.postMessage(message, transfer)
  }

  private fail(error: Error) {
    this.error = error
    this.rejectReady(error)
    this.rejectDone(error)
  }

  dispose() {
    this.fail(new DOMException('Recording cancelled', 'AbortError'))
    this.worker.terminate()
  }
}
