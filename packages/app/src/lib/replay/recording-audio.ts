import type { LiveEncoder } from './live-encoder'
import type { ReplayTemplateConfig } from '@/types/template'
import { getTrackById } from '@/lib/audio/tracks'

export async function prepareRecordingAudio(music: ReplayTemplateConfig['music'], signal: AbortSignal) {
  if (music.trackId === 'none')
    return undefined
  const track = getTrackById(music.trackId)
  if (!track)
    throw new Error('asset-unavailable')
  const response = await fetch(track.url, { signal })
  if (!response.ok)
    throw new Error('asset-unavailable')
  const context = new OfflineAudioContext(2, 1, 48000)
  const buffer = await context.decodeAudioData(await response.arrayBuffer())
  signal.throwIfAborted()
  return buffer
}

export async function encodeRecordingAudio(encoder: LiveEncoder, buffer: AudioBuffer | undefined, music: ReplayTemplateConfig['music'], frames: number, musicStart: number, signal: AbortSignal) {
  if (!buffer)
    return
  const context = new OfflineAudioContext(2, frames * 800, 48000)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  const gain = context.createGain()
  const start = musicStart / 60
  const end = frames / 60
  gain.gain.setValueAtTime(0, 0)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(music.volume, Math.min(end, start + music.fadeIn))
  gain.gain.setValueAtTime(music.volume, Math.max(start + music.fadeIn, end - 2))
  gain.gain.linearRampToValueAtTime(0, Math.min(end, Math.max(start, end - 2) + music.fadeOut))
  source.connect(gain).connect(context.destination)
  source.start(start)
  const mixed = await context.startRendering()
  for (let offset = 0; offset < mixed.length; offset += 48000) {
    signal.throwIfAborted()
    const count = Math.min(48000, mixed.length - offset)
    const data = new Float32Array(count * 2)
    data.set(mixed.getChannelData(0).subarray(offset, offset + count))
    data.set(mixed.getChannelData(1).subarray(offset, offset + count), count)
    encoder.addAudio(data, offset / 48000)
  }
}
