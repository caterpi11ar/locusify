import { Buffer } from 'node:buffer'
/**
 * Real-app export benchmark.
 *
 * Runs the *actual* Locusify app (dev server, real components, real map, real
 * upload flow, real replay store), freezes the replay clock at chosen states,
 * and compares three things on the app's own 16:9 capture box (`cropRef`):
 *
 *   ref    — the live render, via a Playwright screenshot of that box
 *   full   — offline composite: map canvas + hand-made glass blur + whole-DOM raster
 *   split  — offline composite: map canvas + glass + cached static raster + text patches
 *
 * Plus a WebCodecs clip encoded from the split pipeline, so the measured
 * per-frame cost is the real one and not an extrapolation.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { resolve } from 'node:path'
import process from 'node:process'
import { bundleComposer } from './bundle.mjs'
import { bootApp, createRoute, enterReplay, freezeAt } from './flow.mjs'

const BASE = process.env.BENCH_BASE ?? 'http://localhost:1070'
const OUT = resolve('../../../shots/real')
mkdirSync(OUT, { recursive: true })

const STATES = [
  { label: 'w0-early', seg: 0, p: 0.15 },
  { label: 'w1-mid', seg: 0, p: 0.75 },
  { label: 'w2-mid', seg: 1, p: 0.5 },
  { label: 'w3-mid', seg: 2, p: 0.35 },
  { label: 'w3-late', seg: 2, p: 0.85 },
]

const { code, bytes } = await bundleComposer()
console.log(`composer bundle: ${(bytes / 1024).toFixed(0)} KB`)

const { browser, page } = await bootApp({ base: BASE })
await createRoute(page)
const replay = await enterReplay(page)
console.log('replay:', JSON.stringify(replay))
await page.addScriptTag({ content: code })
await page.waitForFunction(() => !!window.__realBench, null, { timeout: 30000 })

// the 16:9 capture box only exists once the recording chrome is on, so enter a
// frozen state first and read the box from there
await freezeAt(page, 0, 0.15)
await page.waitForTimeout(1500)
const clip = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => (d.style?.width ?? '').startsWith('min(100%'))
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, width: r.width, height: r.height }
})
console.log('capture box:', JSON.stringify(clip))

const rows = []
for (const st of STATES) {
  const frozen = await freezeAt(page, st.seg, st.p)
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/ref-${st.label}.png`, clip })

  const one = await page.evaluate(async () => {
    const b = window.__realBench
    const prev = window.__realBenchPrev ?? null
    const full = await b.composeFull(true)
    const staticLayer = await b.prepareStatic()
    const split = await b.composeSplit(staticLayer, prev)
    window.__realBenchPrev = b.textSnapshot()
    return {
      full: { totalMs: +full.totalMs.toFixed(1), mapMs: +full.mapMs.toFixed(1), glassMs: +full.glassMs.toFixed(1), rasterMs: +full.staticMs.toFixed(1), glassCount: full.glassCount },
      staticMs: +staticLayer.ms.toFixed(1),
      split: { totalMs: +split.totalMs.toFixed(1), mapMs: +split.mapMs.toFixed(1), glassMs: +split.glassMs.toFixed(1), patchMs: +split.patchMs.toFixed(1), patchCount: split.patchCount },
      fullUrl: b.dataURL(full.canvas),
      splitUrl: b.dataURL(split.canvas),
    }
  })
  writeFileSync(`${OUT}/full-${st.label}.png`, Buffer.from(one.fullUrl.split(',')[1], 'base64'))
  writeFileSync(`${OUT}/split-${st.label}.png`, Buffer.from(one.splitUrl.split(',')[1], 'base64'))
  const row = { ...st, pos: frozen.pos, full: one.full, staticMs: one.staticMs, split: one.split }
  rows.push(row)
  console.log(`${st.label} seg${st.seg}@${st.p}  full ${one.full.totalMs}ms  split ${one.split.totalMs}ms (patches ${one.split.patchCount})  static ${one.staticMs}ms`)
}

// ---- encode a real clip from the split pipeline ----
await freezeAt(page, 1, 0)
await page.waitForTimeout(1200)
const clipResult = await page.evaluate(async ({ fps, frames }) => {
  const b = window.__realBench
  const { useReplayStore } = await import('/src/stores/replayStore.ts')
  const { computePosition } = await import('/src/stores/replay/utils.ts')
  const segIndex = 1
  const res = await b.encodeClip({
    frames,
    fps,
    bitrate: 16_000_000,
    snapshotFrame: 45,
    seekFrame: async (i) => {
      const s = useReplayStore.getState()
      const p = i / Math.max(1, frames - 1)
      useReplayStore.setState({
        currentWaypointIndex: segIndex,
        segmentProgress: p,
        totalProgress: (segIndex + p) / Math.max(1, s.segments.length),
        currentPosition: computePosition(s.waypoints, segIndex, p, s.segments),
        dwellRemaining: 0,
      })
      // two animation frames so React commits and MapLibre re-renders
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    },
  })
  return { ...res, base64: res.base64 }
}, { fps: 30, frames: 90 })

writeFileSync(`${OUT}/clip-webcodecs.mp4`, Buffer.from(clipResult.base64, 'base64'))
if (clipResult.snapshot)
  writeFileSync(`${OUT}/clip-frame45.png`, Buffer.from(clipResult.snapshot.url.split(',')[1], 'base64'))

// ---- round trip: decode a frame out of the produced MP4 and compare it with
// the exact composite that was handed to the encoder (codec loss only) ----
const verifyIdx = 45
const roundTrip = await page.evaluate(async ({ b64, idx, fps }) => {
  const b = window.__realBench
  const res = await fetch(`data:video/mp4;base64,${b64}`)
  const blob = await res.blob()
  const decoded = await b.decodeFrameAtCanvas(blob, idx / fps)
  return { decodedUrl: b.dataURL(decoded) }
}, { b64: clipResult.base64, idx: verifyIdx, fps: 30 })
writeFileSync(`${OUT}/decoded-clip.png`, Buffer.from(roundTrip.decodedUrl.split(',')[1], 'base64'))
console.log('round-trip frame', verifyIdx, 'decoded ->', `${OUT}/decoded-clip.png`)
const frameMs = clipResult.frameMs
const sorted = [...frameMs].sort((a, b) => a - b)
const summary = {
  pipeline: clipResult.pipeline,
  codec: clipResult.codec,
  frames: clipResult.frames,
  fps: clipResult.fps,
  bytes: clipResult.bytes,
  encodeMs: +clipResult.encodeMs.toFixed(0),
  framesPerSecond: +clipResult.framesPerSecond.toFixed(2),
  realtimeFactor: +clipResult.realtimeFactor.toFixed(2),
  staticMs: clipResult.staticMs,
  frameMs: {
    min: sorted[0],
    p50: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    max: sorted.at(-1),
    mean: +(frameMs.reduce((a, b) => a + b, 0) / frameMs.length).toFixed(2),
  },
  patchCounts: { min: Math.min(...clipResult.patchCounts), max: Math.max(...clipResult.patchCounts) },
  notes: clipResult.notes,
}
console.log('clip:', JSON.stringify(summary, null, 1))

const metrics = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  captureBox: clip,
  replay,
  states: rows,
  clip: summary,
}
writeFileSync(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 2))
await browser.close()
console.log('written', `${OUT}/metrics.json`)
