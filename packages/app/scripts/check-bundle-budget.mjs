import { readFile, stat } from 'node:fs/promises'

const distRoot = new URL('../dist/', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', distRoot), 'utf8'))

function collectStatic(entries) {
  const seen = new Set()
  const visit = (key) => {
    if (seen.has(key) || !manifest[key])
      return
    seen.add(key)
    for (const imported of manifest[key].imports ?? [])
      visit(imported)
  }
  entries.forEach(visit)
  return seen
}

async function measure(keys) {
  let raw = 0
  for (const key of keys)
    raw += (await stat(new URL(manifest[key].file, distRoot))).size
  return raw
}

async function checkLimit(label, keys, limitKiB) {
  const raw = await measure(keys)
  console.log(`${label}: ${(raw / 1024).toFixed(1)} KiB raw across ${keys.size} chunks`)
  if (raw > limitKiB * 1024)
    throw new Error(`${label} budget exceeded: ${(raw / 1024).toFixed(1)} KiB > ${limitKiB} KiB`)
}

const entry = manifest['index.html']
if (!entry)
  throw new Error('Vite manifest is missing the application entry')

const bootstrap = collectStatic(['index.html'])
const preRouteShell = collectStatic(['index.html', ...(entry.dynamicImports ?? [])])

await checkLimit('App bootstrap', bootstrap, 400)
await checkLimit('Pre-route app shell', preRouteShell, 750)

const mapEntry = manifest['src/pages/map/MapSection.tsx']
if (!mapEntry)
  throw new Error('Vite manifest is missing MapSection')
const mapFile = new URL(mapEntry.file, distRoot)
const mapRaw = (await stat(mapFile)).size
console.log(`MapSection core chunk: ${(mapRaw / 1024).toFixed(1)} KiB raw (${mapEntry.file})`)
if (mapRaw > 500 * 1024)
  throw new Error(`MapSection core budget exceeded: ${(mapRaw / 1024).toFixed(1)} KiB > 500 KiB`)

const mapLibreKey = 'src/pages/map/MapLibre.tsx'
const mapLibreEntry = manifest[mapLibreKey]
if (!mapLibreEntry)
  throw new Error('Vite manifest is missing MapLibre')

// The default route renders MapSection and MapLibre immediately. Include that
// runtime chain as well as the pre-route shell so code splitting cannot hide
// cold-start regressions behind nested dynamic imports.
const defaultMapStartup = collectStatic([
  'index.html',
  ...(entry.dynamicImports ?? []),
  'src/pages/map/MapSection.tsx',
  mapLibreKey,
  ...(mapLibreEntry.dynamicImports ?? []),
])
await checkLimit('Default map startup', defaultMapStartup, 2500)

const forbidden = /exifr|webm-to-mp4|mediabunny|boolean-point-in-polygon|@turf/i
for (const key of defaultMapStartup) {
  const file = manifest[key].file
  if (forbidden.test(`${key} ${file}`))
    throw new Error(`Heavy feature dependency entered the default startup graph: ${key} (${file})`)
}
