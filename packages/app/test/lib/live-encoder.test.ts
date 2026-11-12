import type { EncoderCommand, EncoderReply } from '../../src/lib/replay/encoder-protocol'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LiveEncoder } from '../../src/lib/replay/live-encoder'

class WorkerStub {
  static current: WorkerStub
  onmessage?: (event: { data: EncoderReply }) => void
  onerror?: () => void
  postMessage = vi.fn<(message: EncoderCommand, transfer: Transferable[]) => void>()
  terminate = vi.fn()
  constructor() { WorkerStub.current = this }
  reply(data: EncoderReply) { this.onmessage?.({ data }) }
}

class FrameStub {
  close = vi.fn()
  constructor(readonly source: unknown, readonly init: VideoFrameInit) {}
}

let encoder: LiveEncoder
beforeEach(() => {
  vi.stubGlobal('Worker', WorkerStub)
  vi.stubGlobal('VideoFrame', FrameStub)
  encoder = new LiveEncoder(1920, 1080, false)
})
afterEach(() => {
  encoder.dispose()
  vi.unstubAllGlobals()
})

it('transfers the displayed canvas frame with exact 60 fps timestamps', async () => {
  WorkerStub.current.reply({ type: 'ready' })
  await encoder.ready
  const canvas = {} as HTMLCanvasElement
  encoder.add(canvas, 59)
  const [message, transfer] = WorkerStub.current.postMessage.mock.calls.at(-1)!
  expect(message.type).toBe('frame')
  if (message.type !== 'frame')
    throw new Error('Expected a frame')
  expect(message.frame).toMatchObject({ source: canvas, init: { timestamp: 983333, duration: 16667 } })
  expect(transfer).toEqual([message.frame])
})

it('bounds in-flight frames and resumes only after the worker consumes a frame', () => {
  const canvas = {} as HTMLCanvasElement
  for (let i = 0; i < 3; i++) encoder.add(canvas, i)
  expect(encoder.available).toBe(false)
  expect(() => encoder.add(canvas, 3)).toThrow('queue is full')
  WorkerStub.current.reply({ type: 'accepted' })
  expect(encoder.available).toBe(true)
  encoder.add(canvas, 3)
  expect(encoder.available).toBe(false)
})

it('returns MP4 bytes after the worker finalizes', async () => {
  const task = encoder.finish()
  WorkerStub.current.reply({ type: 'done', buffer: new Uint8Array([0, 1, 2]).buffer })
  const result = await task
  expect(result.type).toBe('video/mp4')
  expect(new Uint8Array(await result.arrayBuffer())).toEqual(new Uint8Array([0, 1, 2]))
})

it('stops the worker and rejects pending work on page cancellation', async () => {
  encoder.dispose()
  await expect(encoder.ready).rejects.toMatchObject({ name: 'AbortError' })
  await expect(encoder.done).rejects.toMatchObject({ name: 'AbortError' })
  expect(WorkerStub.current.terminate).toHaveBeenCalled()
  expect(() => encoder.add({} as HTMLCanvasElement, 0)).toThrow('cancelled')
})

it('reports unsupported codecs and worker crashes instead of hanging', async () => {
  WorkerStub.current.reply({ type: 'error', message: 'encoder-unsupported' })
  await expect(encoder.ready).rejects.toThrow('encoder-unsupported')
  await expect(encoder.done).rejects.toThrow('encoder-unsupported')
})

it('closes a frame if transferring it fails', () => {
  let frame: VideoFrame | undefined
  WorkerStub.current.postMessage.mockImplementation((message) => {
    if (message.type === 'frame')
      frame = message.frame
    throw new Error('Transfer failed')
  })
  expect(() => encoder.add({} as HTMLCanvasElement, 0)).toThrow('Transfer failed')
  expect(frame?.close).toHaveBeenCalledOnce()
})
