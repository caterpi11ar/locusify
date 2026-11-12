export type EncoderCommand
  = | { type: 'start', width: number, height: number, audio: boolean }
    | { type: 'frame', frame: VideoFrame }
    | { type: 'audio', data: Float32Array, timestamp: number }
    | { type: 'finish' }

export type EncoderReply
  = | { type: 'ready' | 'accepted' }
    | { type: 'done', buffer: ArrayBuffer }
    | { type: 'error', message: string }
