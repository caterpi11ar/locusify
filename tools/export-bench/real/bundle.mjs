import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'esbuild'

/** Bundle the in-page composer to a single IIFE string for addScriptTag. */
export async function bundleComposer() {
  const outfile = resolve('../../../shots/real/.composer.bundle.js')
  const result = await build({
    entryPoints: [resolve('composer.ts')],
    bundle: true,
    format: 'iife',
    target: 'chrome120',
    write: false,
    minify: false,
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const code = result.outputFiles?.[0]?.text ?? ''
  if (!code)
    throw new Error('composer bundle empty')
  return { code, bytes: code.length, outfile, read: () => readFileSync(outfile, 'utf8') }
}
