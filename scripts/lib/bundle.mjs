/** Small shared bundler for fixtures and the DSH browser factory. No disk output. */
import { build } from 'esbuild'

export async function bundleCommonJS(entry, options = {}) {
  const result = await build({
    platform: 'node',
    target: ['node22'],
    jsx: 'transform',
    external: ['react', 'react-dom'],
    charset: 'utf8',
    logLevel: 'warning',
    ...options,
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    write: false,
  })
  return result.outputFiles[0].text
}
