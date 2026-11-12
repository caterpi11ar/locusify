import type { Map as LibreMap } from 'maplibre-gl'
import type { RecordingOptions } from './recording-options'
import type { ReplayTextRole, SceneTypography } from './scene-typography'
import type { SceneVideo } from './scene-video'
import type { ReplayState } from '@/stores/replay/types'
import { BlurFilter, CanvasSource, Container, Graphics, Sprite, Text, Texture, WebGLRenderer } from 'pixi.js'
import { presetAvatars } from '@/data/presetAvatars'
import { transportModeIcons } from '@/data/transportModes'
import { i18n } from '@/i18n'
import AudioManager from '@/lib/audio/AudioManager'
import { useAuthStore } from '@/stores/authStore'
import { claimReplayClock } from '@/stores/replay/loop'
import { useReplayStore } from '@/stores/replayStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getFilterStyle } from './filters'
import { LiveEncoder } from './live-encoder'
import { waitForReplayTiles } from './map-ready'
import { prepareReplayAvatar } from './prepare-avatar'
import { encodeRecordingAudio, prepareRecordingAudio } from './recording-audio'
import { captionTexture, iconTexture, loadSceneBrand, loadSceneImage, loadScenePhoto, metadataTexture, paintTexture, photoTexture } from './scene-assets'
import { easePhoto, easeScroll, FRAME_MS, FRAME_SECONDS, SCENE_HEIGHT as H, swing, SCENE_WIDTH as W } from './scene-motion'
import { SceneText } from './scene-text'
import { prepareSceneTypography } from './scene-typography'

interface Card {
  root: Container
  body: Container
  photo: Sprite
  still: Texture
  caption: Sprite
  blur: BlurFilter
  video?: { decoder: SceneVideo, canvas: HTMLCanvasElement, texture: Texture, timestamp: number }
}
interface Recording {
  encoder: LiveEncoder
  request: RecordingOptions
  signal: AbortSignal
  frames: number
  musicStart: number
  completed: number
  audio?: AudioBuffer
  resolve: (video: { blob: Blob, mimeType: 'video/mp4', width: number, height: number }) => void
  reject: (error: unknown) => void
  progress: (value: number) => void
  abort: () => void
}

/** The visible replay surface is also the only source of encoded video frames. */
export class ReplaySurface {
  readonly canvas = document.createElement('canvas')
  private renderer = new WebGLRenderer<HTMLCanvasElement>()
  private stage = new Container()
  private viewport = { width: W, height: H }
  private layouts: ((width: number, height: number) => void)[] = []
  private resizeObserver?: ResizeObserver
  private needsResizePaint = false
  private mapSource: CanvasSource
  private mapTexture: Texture
  private cards: Card[] = []
  private textures: Texture[] = []
  private avatar = new Container()
  private pulse = new Graphics()
  private badge = new Sprite()
  private icons = new globalThis.Map<string, Texture>()
  private intro = new Container()
  private stats = new Container()
  private typography!: SceneTypography
  private days!: SceneText
  private distance!: SceneText
  private daysUnit!: SceneText
  private distanceUnit!: SceneText
  private statsHeight = 106
  private layoutStats = () => {}
  private layoutAttribution = () => {}
  private tick = 0
  private lastPaint = 0
  private raf = 0
  private pending = false
  private awaitingMedia = false
  private tileWait?: AbortController
  private disposed = false
  private time = 0
  private introExit = -1
  private active = 0
  private previous = 0
  private changedAt = -10
  private scroll = 0
  private scrollFrom = 0
  private springDistance = 0
  private springVelocity = 0
  private recording?: Recording
  private finishing?: Recording
  private releaseClock = () => {}
  private signal: AbortSignal
  private onIntroComplete: () => void

  static async create(map: LibreMap, host: HTMLElement, signal: AbortSignal, onIntroComplete: () => void) {
    const scene = new ReplaySurface(map, signal, onIntroComplete)
    try {
      await scene.initialize()
      signal.throwIfAborted()
      scene.pending = true
      scene.paint()
      host.append(scene.canvas)
      scene.resize()
      scene.resizeObserver = new ResizeObserver(scene.resize)
      scene.resizeObserver.observe(host)
      scene.releaseClock = claimReplayClock()
      map.on('render', scene.paint)
      scene.raf = requestAnimationFrame(scene.schedule)
      return scene
    }
    catch (error) {
      scene.dispose()
      throw error
    }
  }

  private constructor(private map: LibreMap, signal: AbortSignal, onIntroComplete: () => void) {
    this.signal = signal
    this.onIntroComplete = onIntroComplete
    this.canvas.dataset.testid = 'replay-surface'
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
    const source = map.getCanvas()
    this.mapSource = new CanvasSource({ resource: source, width: source.width, height: source.height, resolution: 1 })
    this.mapTexture = new Texture({ source: this.mapSource, dynamic: true })
  }

  private sprite(texture: Texture, width: number, height: number, x = 0, y = 0) {
    const sprite = new Sprite(texture)
    sprite.width = width
    sprite.height = height
    sprite.position.set(x, y)
    return sprite
  }

  private own(texture: Texture) {
    if (texture !== Texture.EMPTY)
      this.textures.push(texture)
    return texture
  }

  private label(text: string, x: number, y: number, role: ReplayTextRole, alpha = 1) {
    const label = new Text({ text, style: { fill: 'white', ...this.typography[role] }, resolution: 2 })
    label.position.set(x, y)
    label.alpha = alpha
    return label
  }

  private footerLabel(text: string, role: ReplayTextRole, alpha = 1) {
    const label = new SceneText(text, this.typography[role])
    label.alpha = alpha
    return label
  }

  private resize = () => {
    if (this.disposed)
      return
    const rect = this.map.getContainer().getBoundingClientRect()
    if (!rect.width || !rect.height)
      return
    // Browse at the workspace aspect ratio. Only the recording frame is 16:9.
    // Extend the scene instead of stretching photos, text, or circular avatars.
    const scale = Math.min(rect.width / W, rect.height / H)
    const recording = useReplayStore.getState().recordingActive
    const width = recording ? W : rect.width / scale
    const height = recording ? H : rect.height / scale
    this.viewport = { width, height }
    this.renderer.resize(width, height, 1920 / width)
    for (const layout of this.layouts) layout(width, height)
    this.needsResizePaint = true
  }

  private async initialize() {
    const state = useReplayStore.getState()
    const light = document.documentElement.dataset.theme === 'light'
    const user = useAuthStore.getState().user
    const avatar = useSettingsStore.getState().avatarSource
    const [brand, images, avatarUrl, typography] = await Promise.all([
      loadSceneBrand(this.signal),
      Promise.all(state.waypoints.map(w => loadScenePhoto(w.marker, this.signal))),
      avatar.type === 'profile' ? prepareReplayAvatar(user?.avatarUrl ?? '') : Promise.resolve(''),
      prepareSceneTypography(this.signal, `Locusify 0123456789 城市漫游 ${state.waypoints.map(w => `${w.marker.photo.title ?? ''} ${w.marker.photo.description ?? ''}`).join(' ')}`),
    ])
    this.typography = typography
    // The same surface is presented by the browser and read by VideoFrame.
    // Retain the last complete frame between paints, including encoder backpressure.
    await this.renderer.init({ canvas: this.canvas, width: W, height: H, resolution: 1.5, backgroundColor: '#050509', antialias: true, preserveDrawingBuffer: true })
    const mapBackground = this.sprite(this.mapTexture, W, H)
    this.stage.addChild(mapBackground)
    this.layouts.push((width, height) => {
      mapBackground.width = width
      mapBackground.height = height
    })

    // The blurred panel samples the real map texture, not a substitute background.
    const panel = new Container()
    const blurred = this.sprite(this.mapTexture, W, H)
    blurred.filters = [new BlurFilter({ strength: 4, quality: 3 })]
    panel.addChild(blurred)
    const mask = new Graphics().rect(0, 0, W * 0.4, H).fill(0xFFFFFF)
    panel.addChild(mask)
    panel.mask = mask
    const panelShade = new Graphics().rect(0, 0, W * 0.4, H).fill({ color: 0, alpha: 0.1 })
    panel.addChild(panelShade)
    this.layouts.push((width, height) => {
      blurred.width = width
      blurred.height = height
      mask.clear().rect(0, 0, W * 0.4, height).fill(0xFFFFFF)
      panelShade.clear().rect(0, 0, W * 0.4, height).fill({ color: 0, alpha: 0.1 })
    })
    this.stage.addChild(panel)
    const photoRail = new Container()
    const railMask = new Graphics().rect(0, 0, W * 0.4, H - 105).fill(0xFFFFFF)
    this.stage.addChild(photoRail, railMask)
    photoRail.mask = railMask
    this.layouts.push((_, height) => {
      photoRail.y = (height - H) / 2
      railMask.clear().rect(0, 0, W * 0.4, height - 105).fill(0xFFFFFF)
    })
    photoRail.addChild(new Graphics().moveTo(0, 110).quadraticCurveTo(256, 142, 512, 110).stroke({ color: light ? '#8fa8be' : '#65809a', width: 1.5 }))
    for (let index = 0; index < images.length; index++) {
      const marker = state.waypoints[index].marker
      const root = new Container()
      const body = new Container()
      body.pivot.set(174, -18)
      const photo = this.sprite(this.own(photoTexture(images[index], state.templateConfig.filter)), 348, 261)
      const blur = new BlurFilter({ strength: 0, quality: 3 })
      body.addChild(photo, this.sprite(this.own(metadataTexture(marker, index, images.length, light, typography)), 348, 36, 0, 267))
      const clip = this.own(paintTexture(12, 29, (ctx) => {
        const gradient = ctx.createLinearGradient(0, 0, 12, 0)
        gradient.addColorStop(0, light ? '#6d8ca7' : '#3d617e')
        gradient.addColorStop(0.48, light ? '#b7cce0' : '#799cbb')
        gradient.addColorStop(1, light ? '#6d8ca7' : '#3d617e')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(0, 0, 12, 29, 3)
        ctx.fill()
      }))
      body.addChild(this.sprite(clip, 12, 29, 168, -18))
      root.addChild(body)
      photoRail.addChild(root)
      const caption = this.sprite(this.own(captionTexture(marker, light, typography)), 348, 160, 82, 470)
      photoRail.addChild(caption)
      const card: Card = { root, body, photo, still: photo.texture, caption, blur }
      this.cards.push(card)
      const source = marker.photo.video
      if (source && source.type !== 'none') {
        const { SceneVideo } = await import('./scene-video')
        const decoder = await SceneVideo.create(source, this.signal)
        const canvas = document.createElement('canvas')
        canvas.width = 696
        canvas.height = 522
        card.video = { decoder, canvas, texture: this.own(Texture.from(canvas)), timestamp: -1 }
        await this.prepareVideo(index, 0)
      }
    }
    const lineColor = state.templateConfig.lineStyle.color
    this.pulse.circle(0, 0, 20).fill(lineColor)
    this.avatar.addChild(this.pulse)
    const profile = avatarUrl ? await loadSceneImage(avatarUrl, this.signal) : undefined
    const preset = avatar.type === 'preset' ? presetAvatars.find(p => p.id === avatar.presetId) : undefined
    const color = preset?.color ?? lineColor
    this.avatar.addChild(new Graphics().circle(0, 0, avatar.type === 'none' ? 6 : 19).fill(color))
    if (profile) {
      const face = this.sprite(this.own(paintTexture(36, 36, (ctx) => {
        ctx.beginPath()
        ctx.arc(18, 18, 17, 0, Math.PI * 2)
        ctx.clip()
        const size = Math.min(profile.naturalWidth, profile.naturalHeight)
        ctx.drawImage(profile, (profile.naturalWidth - size) / 2, (profile.naturalHeight - size) / 2, size, size, 0, 0, 36, 36)
      })), 36, 36, -18, -18)
      this.avatar.addChild(face)
    }
    else if (preset) {
      const icon = this.own(await iconTexture(preset.icon, '#fff', this.signal))
      this.avatar.addChild(this.sprite(icon, 20, 20, -10, -10))
    }
    else if (avatar.type === 'profile') {
      this.avatar.addChild(this.label(user?.name?.[0]?.toUpperCase() ?? '?', -7, -12, 'avatar'))
    }
    for (const [mode, className] of Object.entries(transportModeIcons))
      this.icons.set(mode, this.own(await iconTexture(className, light ? '#171717' : '#fff', this.signal)))
    this.avatar.addChild(new Graphics().circle(17, 17, 9).fill(light ? '#eee' : '#333'))
    this.badge.position.set(11, 11)
    this.badge.width = 12
    this.badge.height = 12
    this.avatar.addChild(this.badge)
    this.stage.addChild(this.avatar)

    const statsMap = this.sprite(this.mapTexture, W, H)
    statsMap.filters = [new BlurFilter({ strength: 4, quality: 3 })]
    const statsMask = new Graphics()
    const statsBg = new Container()
    statsBg.addChild(statsMap, statsMask)
    statsBg.mask = statsMask
    const statsShade = new Graphics()
    this.stats.addChild(statsBg, statsShade)
    const logo = this.sprite(this.own(paintTexture(64, 64, (ctx) => {
      ctx.beginPath()
      ctx.roundRect(0, 0, 64, 64, 19.2)
      ctx.clip()
      ctx.drawImage(brand.logo, 0, 0, 64, 64)
    })), 64, 64)
    const brandLabel = this.footerLabel('Locusify', 'brand')
    this.stats.addChild(logo, brandLabel)
    this.days = this.footerLabel('0', 'statValue')
    this.distance = this.footerLabel('0.00', 'statValue')
    this.daysUnit = this.footerLabel(i18n.t('stats.bar.durationUnit'), 'statUnit', 0.6)
    this.distanceUnit = this.footerLabel(i18n.t('stats.bar.distanceUnit'), 'statUnit', 0.6)
    const durationLabel = this.footerLabel(i18n.t('stats.bar.duration'), 'statLabel', 0.6)
    const distanceLabel = this.footerLabel(i18n.t('stats.bar.distance'), 'statLabel', 0.6)
    this.stats.addChild(this.days, this.distance, this.daysUnit, this.distanceUnit, durationLabel, distanceLabel)
    const qr = this.sprite(this.own(Texture.from(brand.qr)), 64, 64)
    const qrLabel = this.footerLabel(i18n.t('stats.bar.scanQr'), 'statLabel', 0.6)
    const divider = new Graphics()
    this.stats.addChild(qr, qrLabel, divider)
    const contentHeight = Math.max(64, 64 + 4 + typography.statLabel.lineHeight)
    this.statsHeight = contentHeight + 24
    const centerY = 12 + contentHeight / 2
    logo.position.set(24, centerY - 32)
    brandLabel.position.set(96, centerY - typography.brand.lineHeight / 2)
    const rowTop = centerY - (typography.statValue.lineHeight + typography.statLabel.lineHeight) / 2
    this.days.y = this.distance.y = rowTop
    this.daysUnit.y = this.distanceUnit.y = rowTop + this.days.baseline - this.daysUnit.baseline
    durationLabel.y = distanceLabel.y = rowTop + typography.statValue.lineHeight
    this.layoutStats = () => {
      const width = this.viewport.width
      const qrWidth = Math.max(64, qrLabel.advanceWidth)
      const qrLeft = width - 24 - qrWidth
      qr.position.set(qrLeft + (qrWidth - 64) / 2, 12)
      qrLabel.position.set(qrLeft + (qrWidth - qrLabel.advanceWidth) / 2, 80)
      divider.clear().moveTo(qrLeft - 17, 12).lineTo(qrLeft - 17, 12 + contentHeight).stroke({ color: 0xFFFFFF, alpha: 0.15, width: 1 })
      // Match the original flex row: brand padding, two 16px gaps, space-around.
      const left = 96 + brandLabel.advanceWidth + 16 + 16
      const available = qrLeft - 17 - 16 - left
      const rows = [[this.days, this.daysUnit, durationLabel], [this.distance, this.distanceUnit, distanceLabel]]
      const widths = rows.map(([value, unit, label]) => Math.max(value.advanceWidth + 2 + unit.advanceWidth, label.advanceWidth))
      const gap = (available - widths[0] - widths[1]) / 4
      let x = left + gap
      rows.forEach(([value, unit, label], index) => {
        const center = x + widths[index] / 2
        value.x = center - (value.advanceWidth + 2 + unit.advanceWidth) / 2
        unit.x = value.x + value.advanceWidth + 2
        label.x = center - label.advanceWidth / 2
        x += widths[index] + 2 * gap
      })
    }
    this.layouts.push((width, height) => {
      this.stats.y = height - 4 - this.statsHeight
      statsMap.width = width
      statsMap.height = height
      statsMap.y = -this.stats.y
      statsMask.clear().roundRect(8, 0, width - 16, this.statsHeight, 12).fill(0xFFFFFF)
      statsShade.clear().roundRect(8, 0, width - 16, this.statsHeight, 12).fill({ color: 0, alpha: 0.6 })
      this.layoutStats()
    })
    this.stage.addChild(this.stats)
    const attribution = new Container()
    const copyright = this.footerLabel('© OpenStreetMap contributors', 'attribution', 0.85)
    const copyrightWidth = copyright.advanceWidth + 16
    const copyrightHeight = copyright.style.lineHeight + 12
    attribution.addChild(new Graphics().roundRect(0, 0, copyrightWidth, copyrightHeight, 6).fill({ color: 0, alpha: 0.6 }))
    copyright.position.set(8, 6)
    attribution.addChild(copyright)
    this.stage.addChild(attribution)
    this.layoutAttribution = () => {
      const bottom = this.stats.visible ? this.stats.y - 8 : this.viewport.height - 16
      attribution.position.set(this.viewport.width - 16 - copyrightWidth, bottom - copyrightHeight)
    }
    this.layouts.push(this.layoutAttribution)

    const introBackground = new Graphics().rect(0, 0, W, H).fill('#0a0a0a')
    const introLogo = this.sprite(this.own(Texture.from(brand.logo)), 96, 96, W / 2 - 48, H / 2 - 105)
    this.intro.addChild(introBackground, introLogo)
    const title = this.label('Locusify', W / 2, H / 2 + 12, 'introTitle')
    title.anchor.set(0.5, 0)
    const subtitle = this.label('Your Journey, Mapped', W / 2, H / 2 + 62, 'introSubtitle', 0.4)
    subtitle.anchor.set(0.5, 0)
    this.intro.addChild(title, subtitle)
    this.layouts.push((width, height) => {
      introBackground.clear().rect(0, 0, width, height).fill('#0a0a0a')
      introLogo.position.set(width / 2 - 48, height / 2 - 105)
      title.position.set(width / 2, height / 2 + 12)
      subtitle.position.set(width / 2, height / 2 + 62)
    })
    this.intro.visible = false
    this.stage.addChild(this.intro)
  }

  private schedule = (now: number) => {
    if (this.disposed)
      return
    this.raf = requestAnimationFrame(this.schedule)
    if (this.pending || now - this.lastPaint < FRAME_MS - 1)
      return
    try {
      if (this.recording && !this.recording.encoder.available) {
        if (now - this.lastPaint > 100)
          AudioManager.getInstance().stop()
        return
      }
      const state = useReplayStore.getState()
      if (state.status === 'completed' && !this.recording && !this.needsResizePaint)
        return
      // Do not advance the authoritative clock into missing map tiles.
      if (state.status === 'playing' && !this.map.areTilesLoaded()) {
        if (now - this.lastPaint > 100)
          AudioManager.getInstance().stop()
        if (!this.tileWait) {
          const controller = new AbortController()
          this.tileWait = controller
          void waitForReplayTiles(this.map, controller.signal).catch((error) => {
            if (!controller.signal.aborted && !this.disposed) {
              const current = useReplayStore.getState()
              if (current.status === 'playing')
                current.togglePlayPause()
              this.fail(error)
            }
          }).finally(() => {
            if (this.tileWait === controller)
              this.tileWait = undefined
          })
        }
        return
      }
      this.pending = true
      this.lastPaint = now
      if (state.status === 'playing')
        state._tick(FRAME_MS)
      const index = Math.min(useReplayStore.getState().currentWaypointIndex, this.cards.length - 1)
      if (this.cards[index].video) {
        this.awaitingMedia = true
        void this.prepareVideo(index, index === this.active ? Math.max(0, this.tick * FRAME_SECONDS - Math.max(0, this.changedAt)) : 0).then(() => {
          this.awaitingMedia = false
          if (!this.disposed)
            this.map.triggerRepaint()
        }).catch((error) => {
          this.awaitingMedia = false
          this.pending = false
          if (!this.disposed)
            this.fail(error)
        })
      }
      else {
        this.map.triggerRepaint()
      }
    }
    catch (error) { this.fail(error) }
  }

  private paint = () => {
    if (!this.pending || this.awaitingMedia || this.disposed)
      return
    this.pending = false
    try {
      const state = useReplayStore.getState()
      this.time = this.tick++ * FRAME_SECONDS
      this.update(state)
      const mapCanvas = this.map.getCanvas()
      if (this.mapSource.resize(mapCanvas.width, mapCanvas.height, 1)) {
        // Source dimensions also change the texture's quad/UVs. Reapply the
        // intended scene sizes before drawing any sprites that share this map.
        for (const layout of this.layouts) layout(this.viewport.width, this.viewport.height)
      }
      this.mapSource.update()
      this.renderer.render({ container: this.stage })
      this.needsResizePaint = false
      const recording = this.recording
      if (!recording) {
        if (state.status === 'playing')
          AudioManager.getInstance().syncWithReplayStatus(state.status)
        return
      }
      recording.encoder.add(this.canvas, recording.frames++)
      if (state.status === 'playing' && recording.musicStart < 0)
        recording.musicStart = recording.frames - 1
      if (recording.musicStart >= 0 && recording.audio) {
        const elapsed = (recording.frames - 1 - recording.musicStart) / 60
        const music = recording.request.music
        const fadeIn = music.fadeIn ? Math.min(1, elapsed / music.fadeIn) : 1
        const fadeOut = recording.completed >= 0 && music.fadeOut ? Math.max(0, 1 - (recording.frames - recording.completed) / 60 / music.fadeOut) : 1
        AudioManager.getInstance().syncTimeline(elapsed, music.volume * fadeIn * fadeOut)
      }
      if (state.status === 'completed') {
        if (recording.completed < 0)
          recording.completed = recording.frames
        if (recording.frames - recording.completed >= 120)
          void this.finish(recording)
      }
      if (recording.frames % 30 === 0)
        recording.progress(Math.round(state.totalProgress * 95))
    }
    catch (error) { this.fail(error) }
  }

  private update(state: ReplayState) {
    const index = Math.min(state.currentWaypointIndex, this.cards.length - 1)
    if (index !== this.active) {
      this.previous = this.active
      this.active = index
      this.changedAt = this.time
      this.scrollFrom = this.scroll
    }
    const elapsed = this.time - this.changedAt
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    this.scroll = this.scrollFrom + (index * 368 - this.scrollFrom) * (reduced ? 1 : easeScroll(elapsed / 0.5))
    const transition = state.templateConfig.transitions
    const progress = reduced ? 1 : easePhoto(elapsed / (transition.type === 'cut' ? 0.05 : transition.duration / 1000))
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i]
      card.photo.texture = i === index && card.video ? card.video.texture : card.still
      const x = 256 + i * 368 - this.scroll
      card.root.visible = x > -200 && x < 712
      const position = Math.max(0, Math.min(1, x / 512))
      card.root.position.set(x, 128 + 96 * position * (1 - position))
      card.root.angle = reduced ? 0 : [-2, 1.6, -1, 2][i % 4]
      card.body.angle = reduced || (Math.abs(i - index) > 1 && i !== this.previous) ? 0 : swing(elapsed) * Math.sign(index - this.previous)
      // Tint changes brightness without dimming the panel behind the photograph.
      const brightnessProgress = reduced ? 1 : Math.min(1, elapsed / 0.3)
      const brightness = i === index ? (i === this.previous ? 1 : 0.5 + brightnessProgress * 0.5) : i === this.previous ? 1 - brightnessProgress * 0.5 : 0.5
      card.photo.tint = Math.round(255 * brightness) * 0x010101
      card.photo.alpha = i === index ? progress : 1
      card.photo.pivot.set(card.photo.texture.width / 2, card.photo.texture.height / 2)
      card.photo.position.set(174 + (i === index && transition.type === 'slide-left' ? 60 * (1 - progress) : 0), 130.5 + (i === index && transition.type === 'slide-up' ? 60 * (1 - progress) : 0))
      const scale = i === index && transition.type === 'zoom-in' ? 0.7 + 0.3 * progress : i === index && transition.type === 'crossfade' ? 0.96 + 0.04 * progress : 1
      card.photo.width = 348 * scale
      card.photo.height = 261 * scale
      if (transition.type === 'blur' && i === index && progress < 0.999) {
        card.blur.strength = 12 * (1 - progress)
        card.photo.filters = [card.blur]
      }
      else {
        card.photo.filters = []
      }
      const captionEnter = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - 0.3) / 0.3))
      const exiting = i === this.previous && i !== index && elapsed < 0.3 && !reduced
      card.caption.visible = i === index || exiting
      card.caption.alpha = exiting ? 1 - elapsed / 0.3 : captionEnter
      card.caption.y = exiting ? 470 - 8 * elapsed / 0.3 : 470 + 8 * (1 - captionEnter)
    }
    if (state.currentPosition) {
      const point = this.map.project(state.currentPosition)
      const rect = this.map.getContainer().getBoundingClientRect()
      this.avatar.position.set(point.x / rect.width * this.viewport.width, point.y / rect.height * this.viewport.height)
      this.avatar.visible = Number.isFinite(point.x) && Number.isFinite(point.y)
    }
    const pulse = reduced ? 0 : this.time % 1
    this.pulse.scale.set(1 + pulse)
    this.pulse.alpha = 0.3 * (1 - pulse)
    this.badge.texture = this.icons.get(state.currentSegmentMode) ?? Texture.EMPTY
    this.badge.width = 12
    this.badge.height = 12
    this.stats.visible = state.recordingActive
    this.stats.position.set(0, this.viewport.height - 4 - this.statsHeight)
    const distance = state.segments.slice(0, index).reduce((sum, s) => sum + s.distanceKm, 0)
    this.springVelocity += (100 * (distance - this.springDistance) - 30 * this.springVelocity) * FRAME_SECONDS
    this.springDistance += this.springVelocity * FRAME_SECONDS
    this.distance.text = this.springDistance.toFixed(2)
    const days = Math.max(0, Math.round((state.waypoints[index].timestamp.getTime() - state.waypoints[0].timestamp.getTime()) / 86400000))
    this.days.text = String(days)
    this.layoutStats()
    this.layoutAttribution()
    if (state.recordingActive && state.earthZoomPhase !== 'done') {
      this.intro.visible = true
      this.intro.alpha = 1
      this.introExit = -1
    }
    else if (this.intro.visible) {
      if (this.introExit < 0)
        this.introExit = this.time
      this.intro.alpha = 1 - easeScroll((this.time - this.introExit) / 0.7)
      if (this.intro.alpha <= 0) {
        this.intro.visible = false
        this.onIntroComplete()
      }
    }
  }

  private async prepareVideo(index: number, time: number) {
    const video = this.cards[index].video!
    const sample = await video.decoder.at(time)
    if (!sample || sample.timestamp === video.timestamp || this.disposed)
      return
    const ctx = video.canvas.getContext('2d')!
    const filter = useReplayStore.getState().templateConfig.filter
    ctx.clearRect(0, 0, video.canvas.width, video.canvas.height)
    ctx.filter = getFilterStyle(filter.type, filter.intensity) || 'none'
    sample.drawWithFit(ctx, { fit: sample.displayHeight > sample.displayWidth ? 'contain' : 'cover' })
    video.texture.source.update()
    video.timestamp = sample.timestamp
  }

  async start(request: RecordingOptions, signal: AbortSignal, progress: (value: number) => void) {
    if (this.recording || this.finishing)
      throw new Error('busy')
    this.resize()
    const encoder = new LiveEncoder(request.width, request.height, request.music.trackId !== 'none')
    const cancelStart = () => encoder.dispose()
    signal.addEventListener('abort', cancelStart, { once: true })
    try {
      const [audio] = await Promise.all([prepareRecordingAudio(request.music, signal), encoder.ready])
      signal.throwIfAborted()
      let resolve!: Recording['resolve']
      let reject!: Recording['reject']
      const done = new Promise<Parameters<Recording['resolve']>[0]>((yes, no) => {
        resolve = yes
        reject = no
      })
      void done.catch(() => {})
      const abort = () => this.fail(signal.reason)
      const recording: Recording = { encoder, request, signal, audio, frames: 0, musicStart: -1, completed: -1, resolve, reject, progress, abort }
      this.recording = recording
      this.introExit = -1
      this.intro.visible = true
      this.intro.alpha = 1
      this.tick = 0
      this.changedAt = -10
      this.scroll = this.scrollFrom = 0
      this.active = this.previous = 0
      signal.addEventListener('abort', abort, { once: true })
      void encoder.done.catch((error) => {
        if (this.recording === recording)
          this.fail(error)
      })
      return { done }
    }
    catch (error) {
      encoder.dispose()
      throw error
    }
    finally { signal.removeEventListener('abort', cancelStart) }
  }

  private async finish(recording: Recording) {
    AudioManager.getInstance().stop()
    this.recording = undefined
    this.finishing = recording
    try {
      await encodeRecordingAudio(recording.encoder, recording.audio, recording.request.music, recording.frames, Math.max(0, recording.musicStart), recording.signal)
      const blob = await recording.encoder.finish()
      recording.signal.throwIfAborted()
      recording.resolve({ blob, mimeType: 'video/mp4', width: 1920, height: 1080 })
    }
    catch (error) { recording.reject(error) }
    finally {
      recording.signal.removeEventListener('abort', recording.abort)
      recording.encoder.dispose()
      if (this.finishing === recording)
        this.finishing = undefined
    }
  }

  private fail(error: unknown) {
    const recording = this.recording ?? this.finishing
    this.recording = undefined
    this.finishing = undefined
    if (recording) {
      recording.signal.removeEventListener('abort', recording.abort)
      recording.encoder.dispose()
      recording.reject(error)
      AudioManager.getInstance().stop()
    }
  }

  dispose() {
    if (this.disposed)
      return
    this.disposed = true
    this.tileWait?.abort()
    this.fail(new DOMException('Recording cancelled', 'AbortError'))
    cancelAnimationFrame(this.raf)
    this.resizeObserver?.disconnect()
    this.map.off('render', this.paint)
    this.releaseClock()
    AudioManager.getInstance().stop()
    this.canvas.remove()
    this.stage.destroy({ children: true })
    for (const card of this.cards) {
      card.video?.decoder.dispose()
      card.blur.destroy()
    }
    this.mapTexture.destroy(true)
    for (const texture of new Set(this.textures)) texture.destroy(true)
    if (this.renderer.gl)
      this.renderer.destroy()
  }
}
