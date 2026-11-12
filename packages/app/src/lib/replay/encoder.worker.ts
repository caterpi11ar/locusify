import type { EncoderCommand, EncoderReply } from './encoder-protocol'
import { AudioSample, AudioSampleSource, BufferTarget, canEncodeAudio, canEncodeVideo, Mp4OutputFormat, Output, VideoSample, VideoSampleSource } from 'mediabunny'

const scope = globalThis as unknown as {
  postMessage: (message: EncoderReply, transfer: Transferable[]) => void
  onmessage: (event: MessageEvent<EncoderCommand>) => void
}
let output: Output<Mp4OutputFormat, BufferTarget>
let video: VideoSampleSource
let audio: AudioSampleSource | undefined
let failed = false
let queue = Promise.resolve()
const reply = (message: EncoderReply, transfer: Transferable[] = []) => scope.postMessage(message, transfer)

async function handle(message: EncoderCommand) {
  if (message.type === 'start') {
    const config = { width: message.width, height: message.height, bitrate: 24_000_000 }
    if (!await canEncodeVideo('avc', config) || (message.audio && !await canEncodeAudio('aac', { sampleRate: 48000, numberOfChannels: 2 })))
      throw new Error('encoder-unsupported')
    output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
    video = new VideoSampleSource({ codec: 'avc', bitrate: config.bitrate, hardwareAcceleration: 'prefer-hardware', contentHint: 'detail' })
    output.addVideoTrack(video, { frameRate: 60 })
    if (message.audio) {
      audio = new AudioSampleSource({ codec: 'aac', bitrate: 192_000 })
      output.addAudioTrack(audio)
    }
    await output.start()
    reply({ type: 'ready' })
  }
  else if (message.type === 'frame') {
    const sample = new VideoSample(message.frame)
    try {
      await video.add(sample)
    }
    finally {
      sample.close()
      message.frame.close()
    }
    reply({ type: 'accepted' })
  }
  else if (message.type === 'audio') {
    const sample = new AudioSample({ data: message.data, format: 'f32-planar', numberOfChannels: 2, sampleRate: 48000, timestamp: message.timestamp })
    try {
      await audio!.add(sample)
    }
    finally {
      sample.close()
    }
  }
  else {
    video.close()
    audio?.close()
    await output.finalize()
    const buffer = output.target.buffer!
    reply({ type: 'done', buffer }, [buffer])
  }
}

scope.onmessage = ({ data }: MessageEvent<EncoderCommand>) => {
  queue = queue.then(async () => {
    if (failed) {
      if (data.type === 'frame')
        data.frame.close()
      return
    }
    await handle(data)
  }).catch(async (error: unknown) => {
    failed = true
    reply({ type: 'error', message: error instanceof Error ? error.message : 'encoding-failed' })
    await output?.cancel()
  })
}
