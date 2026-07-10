import type { PlaybackState } from '@/types/workspace'
import { getTrackById } from './tracks'

type ReplayStatus = PlaybackState['status']

class AudioManager {
  private static instance: AudioManager
  private static unavailableTracks = new Set<string>()
  private context: AudioContext | null = null
  private gainNode: GainNode | null = null
  private source: AudioBufferSourceNode | null = null
  private buffer: AudioBuffer | null = null
  private currentTrackId: string | null = null
  private targetVolume = 0.5
  private fadeInDuration = 1
  private fadeOutDuration = 2
  private isPlaying = false

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext()
      this.gainNode = this.context.createGain()
      this.gainNode.connect(this.context.destination)
      this.gainNode.gain.value = 0
    }
    return this.context
  }

  async loadTrack(trackId: string): Promise<void> {
    if (trackId === this.currentTrackId && this.buffer)
      return
    if (trackId === 'none') {
      this.currentTrackId = 'none'
      this.buffer = null
      return
    }

    const track = getTrackById(trackId)
    if (!track || !track.url)
      return

    const ctx = this.getContext()
    try {
      const response = await fetch(track.url)
      const arrayBuffer = await response.arrayBuffer()
      this.buffer = await ctx.decodeAudioData(arrayBuffer)
      this.currentTrackId = trackId
    }
    catch {
      console.warn(`Failed to load audio track: ${trackId}`)
      AudioManager.unavailableTracks.add(trackId)
      this.buffer = null
    }
  }

  static isUnavailable(trackId: string): boolean {
    return AudioManager.unavailableTracks.has(trackId)
  }

  static async probeTrack(trackId: string): Promise<boolean> {
    if (trackId === 'none')
      return true
    if (AudioManager.unavailableTracks.has(trackId))
      return false
    const track = getTrackById(trackId)
    if (!track || !track.url)
      return false
    try {
      const response = await fetch(track.url, { method: 'HEAD' })
      if (!response.ok) {
        AudioManager.unavailableTracks.add(trackId)
        return false
      }
      return true
    }
    catch {
      AudioManager.unavailableTracks.add(trackId)
      return false
    }
  }

  configure(volume: number, fadeIn: number, fadeOut: number) {
    this.targetVolume = volume
    this.fadeInDuration = fadeIn
    this.fadeOutDuration = fadeOut
  }

  play() {
    if (this.isPlaying || !this.buffer || this.currentTrackId === 'none')
      return
    const ctx = this.getContext()
    if (ctx.state === 'suspended')
      ctx.resume()

    this.source = ctx.createBufferSource()
    this.source.buffer = this.buffer
    this.source.loop = true
    this.source.connect(this.gainNode!)

    // Fade in
    this.gainNode!.gain.cancelScheduledValues(ctx.currentTime)
    this.gainNode!.gain.setValueAtTime(0, ctx.currentTime)
    this.gainNode!.gain.linearRampToValueAtTime(this.targetVolume, ctx.currentTime + this.fadeInDuration)

    this.source.start(0)
    this.isPlaying = true
  }

  pause() {
    if (!this.isPlaying || !this.context || !this.gainNode)
      return
    const ctx = this.context
    const sourceToStop = this.source
    // Quick fade to avoid pops
    this.gainNode.gain.cancelScheduledValues(ctx.currentTime)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, ctx.currentTime)
    this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
    this.isPlaying = false
    setTimeout(() => {
      sourceToStop?.stop()
      if (this.source === sourceToStop) {
        this.source = null
      }
    }, 350)
  }

  fadeOutAndStop() {
    if (!this.isPlaying || !this.context || !this.gainNode)
      return
    const ctx = this.context
    const sourceToStop = this.source
    this.gainNode.gain.cancelScheduledValues(ctx.currentTime)
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, ctx.currentTime)
    this.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + this.fadeOutDuration)
    this.isPlaying = false
    setTimeout(() => {
      sourceToStop?.stop()
      if (this.source === sourceToStop) {
        this.source = null
      }
    }, this.fadeOutDuration * 1000 + 100)
  }

  stop() {
    if (!this.isPlaying)
      return
    if (this.gainNode && this.context) {
      this.gainNode.gain.cancelScheduledValues(this.context.currentTime)
      this.gainNode.gain.setValueAtTime(0, this.context.currentTime)
    }
    this.source?.stop()
    this.source = null
    this.isPlaying = false
  }

  syncWithReplayStatus(status: ReplayStatus) {
    switch (status) {
      case 'playing':
        this.play()
        break
      case 'paused':
        this.pause()
        break
      case 'completed':
        this.fadeOutAndStop()
        break
      case 'idle':
      case 'configuring':
        this.stop()
        break
    }
  }

  dispose() {
    this.stop()
    this.context?.close()
    this.context = null
    this.gainNode = null
    this.buffer = null
    this.currentTrackId = null
    AudioManager.instance = null as unknown as AudioManager
  }
}

export default AudioManager
