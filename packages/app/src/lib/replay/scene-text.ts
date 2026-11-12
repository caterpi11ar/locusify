import type { SceneTextStyle } from './scene-typography'
import { Container, Sprite, Texture } from 'pixi.js'
import { paintTexture } from './scene-assets'
import { applyCanvasTextStyle } from './scene-typography'

/** A CSS line box, with advance width and baseline shared by values and units. */
export class SceneText extends Container {
  private image = new Sprite()
  private texture = Texture.EMPTY
  private value = ''
  readonly baseline: number
  advanceWidth = 0
  private measure = document.createElement('canvas').getContext('2d')!

  constructor(text: string, readonly style: SceneTextStyle) {
    super()
    applyCanvasTextStyle(this.measure, style)
    const metrics = this.measure.measureText('Mg')
    this.baseline = (style.lineHeight - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent
    this.addChild(this.image)
    this.text = text
  }

  get text() { return this.value }
  set text(value: string) {
    if (value === this.value && this.texture !== Texture.EMPTY)
      return
    this.value = value
    this.advanceWidth = this.measure.measureText(value).width
    const previous = this.texture
    // Preserve glyph overhang without including it in flex/inline layout widths.
    this.texture = paintTexture(Math.max(1, this.advanceWidth) + 4, this.style.lineHeight + 4, (ctx) => {
      applyCanvasTextStyle(ctx, this.style)
      ctx.fillStyle = '#fff'
      ctx.fillText(value, 2, this.baseline + 2)
    })
    this.image.texture = this.texture
    this.image.width = Math.ceil((Math.max(1, this.advanceWidth) + 4) * 2) / 2
    this.image.height = this.style.lineHeight + 4
    this.image.position.set(-2, -2)
    if (previous !== Texture.EMPTY)
      previous.destroy(true)
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    if (this.texture !== Texture.EMPTY)
      this.texture.destroy(true)
    super.destroy(options)
  }
}
