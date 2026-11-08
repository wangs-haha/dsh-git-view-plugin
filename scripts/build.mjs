/** Build the browser body in memory: never clear another script's build output. */
import { readFile, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { bundleCommonJS } from './lib/bundle.mjs'

const out = (name) => fileURLToPath(new URL(`../${name}`, import.meta.url))
const { name: pluginId } = JSON.parse(await readFile(out('package.json'), 'utf8'))
/** Unique per build, even when the sources are identical. */
const buildMarker = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

// The DSH loader expects both bundles at the package root, not in dist/.
await build({
  entryPoints: [out('src/host/index.ts')],
  outfile: out('index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  charset: 'utf8',
  logLevel: 'warning',
})

// React stays external and is supplied by the host page's module loader.
const body = await bundleCommonJS(out('src/client/index.tsx'), {
  platform: 'browser',
  target: ['es2020'],
  define: {
    __GV_BUILD__: JSON.stringify(buildMarker),
    __GV_PLUGIN_ID__: JSON.stringify(pluginId),
  },
})
const indented = body.split('\n').map((line) => (line ? `    ${line}` : line)).join('\n')
const wrapped = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(pluginId)},
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
${indented}
    return module.exports;
  },
});
`

await writeFile(out('client.js'), wrapped, 'utf8')
console.log(`built index.js and client.js (client build ${buildMarker})`)
