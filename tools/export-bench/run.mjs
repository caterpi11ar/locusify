/**
 * Drives the export-pipeline bench in real Chrome and writes artifacts.
 *
 *   node run.mjs            # full run
 *   node run.mjs --quick    # shorter encodes (for iteration)
 */
import { execSync, spawn } from 'node:child_process'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { chromium } from 'playwright-core'

const QUICK = process.argv.includes('--quick')
const PORT = 1060
const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const ART = `${ROOT}artifacts`
const REPORTS = `${ROOT}../../reports/export-bench`

const SAMPLE_TIMES = [0, 2.6, 5.1, 8.3]

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve()
      }
      catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('vite server did not start'))
      setTimeout(tick, 400)
    }
    tick()
  })
}

async function saveDataUrl(path, dataUrl) {
  const base64 = dataUrl.split(',')[1]
  await writeFile(path, Buffer.from(base64, 'base64'))
}

// ffmpeg.wasm core is served as a static asset (its package `exports` map does
// not allow importing dist paths through Vite).
await mkdir(`${ROOT}public/ffmpeg-core`, { recursive: true })
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  await copyFile(`${ROOT}../../node_modules/@ffmpeg/core/dist/esm/${f}`, `${ROOT}public/ffmpeg-core/${f}`)
}

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', '--port', String(PORT), '--strictPort', '--clearScreen', 'false'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' },
)
server.stdout.on('data', d => process.stdout.write(`[vite] ${d}`))
server.stderr.on('data', d => process.stderr.write(`[vite] ${d}`))

let browser
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`)
  await mkdir(ART, { recursive: true })
  await mkdir(REPORTS, { recursive: true })

  browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--autoplay-policy=no-user-gesture-required',
      '--force-device-scale-factor=1',
    ],
  })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[page]', m.text())
  })
  page.on('pageerror', e => console.error('[pageerror]', e))

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__bench && (window.__bench.ready === true || window.__bench.error), null, { timeout: 120000 })
  const bootError = await page.evaluate(() => window.__bench.error ?? null)
  if (bootError) throw new Error(`bench boot failed: ${bootError}`)

  const metrics = { generatedAt: new Date().toISOString(), quick: QUICK }
  metrics.probe = await page.evaluate(() => window.__bench.probe())
  console.log('probe:', JSON.stringify(metrics.probe.apis), metrics.probe.chromeVersion)
  console.log('encoders:', JSON.stringify(metrics.probe.encoderConfigs))

  // ── 1. Ground-truth DOM frames (what the user sees) ──────────────────────────
  const refs = []
  for (const t of SAMPLE_TIMES) {
    await page.evaluate(t => window.__bench.setDomTime(t), t)
    await page.waitForTimeout(250)
    const name = `ref-${t.toFixed(2)}.png`
    await page.locator('#stage').screenshot({ path: `${ART}/${name}` })
    refs.push({ t, file: name })
  }
  metrics.samples = SAMPLE_TIMES

  // ── 2. Canvas-composited frames at the same timestamps ───────────────────────
  const composites = await page.evaluate(times => window.__bench.compositesAt(times, true), SAMPLE_TIMES)
  const noGlass = await page.evaluate(t => window.__bench.compositeNoGlass(t), 5.1)
  metrics.compositeTimes = composites.map(c => ({ t: c.t, ms: c.ms }))
  for (const c of composites) await saveDataUrl(`${ART}/composite-${c.t.toFixed(2)}.png`, c.png)
  await saveDataUrl(`${ART}/composite-noglass-5.10.png`, noGlass.png)
  metrics.statsCardRect = noGlass.statsRect

  // ── 3. Snapshot + per-frame compositing cost ────────────────────────────────
  metrics.snapshots = await page.evaluate(() => window.__bench.benchSnapshots())
  console.log('snapshots:', JSON.stringify(metrics.snapshots))
  metrics.compose = await page.evaluate(
    f => window.__bench.benchCompose(f.hybrid, f.naive),
    QUICK ? { hybrid: 20, naive: 6 } : { hybrid: 45, naive: 12 },
  )
  console.log('compose:', JSON.stringify(metrics.compose))

  // ── 4. Encoders ─────────────────────────────────────────────────────────────
  // All pipelines cover the same timeline so the decoded stills are comparable.
  const frames = QUICK ? { webCodecsFrames: 90, recorderFrames: 90, ffmpegFrames: 90 } : { webCodecsFrames: 300, recorderFrames: 300, ffmpegFrames: 300 }
  // Decode at a timestamp every pipeline actually contains; quick runs are 3 s.
  const decodeTime = QUICK ? 2.6 : 5.1
  metrics.decodeTime = decodeTime
  const encoded = await page.evaluate(o => window.__bench.runEncoders(o), frames)
  metrics.encoders = {}
  for (const key of ['webcodecs', 'recorder', 'ffmpeg']) {
    const r = encoded[key]
    if (!r) continue
    metrics.encoders[key] = {
      pipeline: r.pipeline,
      container: r.container,
      codec: r.codec,
      width: r.width,
      height: r.height,
      frames: r.frames,
      fps: r.fps,
      bytes: r.bytes,
      encodeMs: Math.round(r.encodeMs),
      framesPerSecond: Math.round(r.framesPerSecond * 10) / 10,
      realtimeFactor: Math.round(r.realtimeFactor * 100) / 100,
      notes: r.notes,
    }
    await writeFile(`${ART}/${key}.${r.container}`, Buffer.from(r.base64, 'base64'))
    console.log(`encoder ${key}: ${Math.round(r.encodeMs)} ms, ${(r.bytes / 1024 / 1024).toFixed(2)} MB`)
  }

  // ── 5. Decode a frame out of each file for the codec figure ─────────────────
  const decoded = await page.evaluate(
    entries => window.__bench.decodeFrames(entries),
    ['webcodecs', 'recorder', 'ffmpeg']
      .filter(k => encoded[k])
      .map(k => ({ key: k, base64: encoded[k].base64, time: decodeTime })),
  )
  for (const [key, png] of Object.entries(decoded)) await saveDataUrl(`${ART}/decoded-${key}.png`, png)
  metrics.decoded = Object.keys(decoded)

  await writeFile(`${ART}/metrics.json`, JSON.stringify(metrics, null, 2))
  await writeFile(`${REPORTS}/metrics.json`, JSON.stringify(metrics, null, 2))
  console.log('done →', ART)
}
finally {
  if (browser) await browser.close()
  // `npx` spawns vite as a grandchild; kill the whole tree on Windows.
  try {
    if (process.platform === 'win32' && server.pid)
      execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' })
    else server.kill()
  }
  catch {}
}
