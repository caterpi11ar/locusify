import { SCENE_HEIGHT, SCENE_WIDTH } from './scene-motion'

/** Screen density belongs to preview; recording has a fixed pixel budget. */
export function getSceneViewport(cssWidth: number, cssHeight: number, pixelRatio: number, recording: boolean) {
  const scale = Math.min(cssWidth / SCENE_WIDTH, cssHeight / SCENE_HEIGHT)
  const width = recording ? SCENE_WIDTH : cssWidth / scale
  const height = recording ? SCENE_HEIGHT : cssHeight / scale
  const mapPixelRatio = recording ? 1920 / cssWidth : pixelRatio
  return { width, height, scale, mapPixelRatio, resolution: recording ? 1.5 : scale * pixelRatio }
}
