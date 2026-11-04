/**
 * Build the plugin artifacts at the package root, which is where the DSH loader
 * expects them:
 *
 * - `index.js`   the Host half (one ESM bundle, Node built-ins external)
 * - `client.js`  the browser half, wrapped in the module-loader factory so
 *                `require('react')` resolves against the page runtime.
 *
 * Sources live in `src/`; both files are generated and should not be edited by
 * hand. Run `pnpm build`.
 */
import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const out = (name) => join(root, '..', name)
const pluginId = '@local/dsh-git-view'

await rm(out('build'), { recursive: true, force: true })

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

await build({
  entryPoints: [out('src/client/index.tsx')],
  outfile: out('build/client.body.js'),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: ['es2020'],
  jsx: 'transform',
  external: ['react', 'react-dom'],
  charset: 'utf8',
  logLevel: 'warning',
})

const body = await readFile(out('build/client.body.js'), 'utf8')
const indented = body
  .split('\n')
  .map((line) => (line ? `    ${line}` : line))
  .join('\n')

const wrapped = `window.__ModuleLoader__.load({
  id: '${pluginId}',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
${indented}
    return module.exports;
  },
});
`

await writeFile(out('client.js'), wrapped, 'utf8')
await rm(out('build'), { recursive: true, force: true })
console.log('built index.js and client.js')


