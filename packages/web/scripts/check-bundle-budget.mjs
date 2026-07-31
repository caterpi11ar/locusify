import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

const root = new URL('../', import.meta.url)
const manifestPath = new URL('.next/server/app/[locale]/page_client-reference-manifest.js', root)
const manifest = await readFile(manifestPath, 'utf8')
const files = [...new Set(manifest.match(/static\/chunks\/[^"']+\.js/g) ?? [])]
const sizes = await Promise.all(files.map(async (file) => {
  const bytes = await readFile(new URL(`.next/${file}`, root))
  return gzipSync(bytes).length
}))
const gzip = sizes.reduce((sum, size) => sum + size, 0)
console.log(`Homepage client JavaScript: ${(gzip / 1024).toFixed(1)} KiB gzip across ${sizes.length} chunks`)
if (gzip > 180 * 1024) {
  console.error(`Bundle budget exceeded: ${(gzip / 1024).toFixed(1)} KiB > 180 KiB gzip`)
  process.exit(1)
}
