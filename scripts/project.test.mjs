import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { bundleCommonJS } from './lib/bundle.mjs'
import { importIssues, localeIssues, markdownIssues } from './lib/project-checks.mjs'
import { reloadTarget } from './lib/reload-target.mjs'

// Every file write/delete below belongs to this freshly allocated fixture root.
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'gv-tooling-'))
  try {
    await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('locale keys and values must exist in both languages', () => {
  assert.deepEqual(localeIssues({ title: '标题' }, { title: 'Title' }), [])
  assert.equal(localeIssues({ title: '标题' }, {}).length, 1)
  assert.equal(localeIssues({ title: ' ' }, { title: 'Title' }).length, 1)
})

test('local Markdown links resolve relative to their document', async () => {
  await fixture(async (root) => {
    await mkdir(join(root, 'docs'))
    await writeFile(join(root, 'docs', 'with space.md'), '# Heading\n')
    const file = join(root, 'README.md')
    const good = '[doc](<docs/with space.md#heading>) [encoded](docs/with%20space.md) [web](https://example.com) [anchor](#heading)'
    assert.deepEqual(markdownIssues(file, good, root), [])
    assert.match(markdownIssues(file, '[bad](missing.md)', root)[0], /missing link/)
    assert.match(markdownIssues(file, '[outside](../outside.md)', root)[0], /escapes repository/)
    assert.match(markdownIssues(file, '[encoding](bad%zz.md)', root)[0], /invalid link encoding/)
    assert.deepEqual(markdownIssues(file, '```md\n[example](missing.md)\n```', root), [])
  })
})

test('host/client runtime imports stay separate without rejecting type-only imports or comments', async () => {
  const root = resolve('fixture-root')
  const client = join(root, 'src/client/view.ts')
  const host = join(root, 'src/host/view.ts')
  assert.deepEqual(await importIssues(client, "import { x } from './types.js'", root), [])
  assert.match((await importIssues(client, "import { x } from '../host/data.js'", root))[0], /boundary/)
  assert.match((await importIssues(host, "export { x } from '../client/types.js'", root))[0], /boundary/)
  assert.match((await importIssues(client, "import fs from 'node:fs'", root))[0], /Node module/)
  assert.match((await importIssues(client, "import fs from 'fs'", root))[0], /Node module/)
  assert.match((await importIssues(client, "import('./types')", root))[0], /suffix/)
  const typesAndExamples = [
    "import type { Repo } from '../host/types.js'",
    "import type { Stats } from 'node:fs'",
    "export type { Repo } from '../host/types.js'",
    "// import fs from 'node:fs'",
    "/* export { x } from '../host/data.js' */",
    'const example = "from \'node:fs\'"',
  ].join('\n')
  assert.deepEqual(await importIssues(client, typesAndExamples, root), [])
})

test('reload endpoint ignores page paths, queries and fragments', () => {
  for (const value of ['http://localhost:12345', 'http://localhost:12345/view/?token=x#panel']) {
    assert.equal(reloadTarget(value).href, 'http://localhost:12345/plugins/events')
  }
  assert.equal(reloadTarget('https://example.com/path?token=x#panel').href, 'https://example.com/plugins/events')
  assert.throws(() => reloadTarget(undefined), /no default port/)
  assert.throws(() => reloadTarget('file:///tmp'), /HTTP\(S\)/)
})

test('reload requires a valid explicit origin before touching a bundle', async () => {
  await fixture(async (root) => {
    await mkdir(join(root, 'scripts', 'lib'), { recursive: true })
    await writeFile(join(root, 'scripts', 'lib', 'reload-target.mjs'), await readFile(new URL('./lib/reload-target.mjs', import.meta.url), 'utf8'))
    const script = join(root, 'scripts', 'reload.mjs')
    await writeFile(script, await readFile(new URL('./reload.mjs', import.meta.url), 'utf8'))
    const bundle = join(root, 'client.js')
    await writeFile(bundle, '// fixture bundle\n')
    await utimes(bundle, new Date('2000-01-01T00:00:00Z'), new Date('2000-01-01T00:00:00Z'))
    const before = (await stat(bundle)).mtimeMs
    const env = { ...process.env }
    delete env.DSH_ORIGIN
    delete env.DSH_WEB_URL
    const missing = spawnSync(process.execPath, [script], { env, encoding: 'utf8' })
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, /no default port/)
    assert.equal((await stat(bundle)).mtimeMs, before)
    const invalid = spawnSync(process.execPath, [script], { env: { ...env, DSH_WEB_URL: 'file:///not-a-host' }, encoding: 'utf8' })
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /HTTP\(S\)/)
    assert.equal((await stat(bundle)).mtimeMs, before)
    // Without --wait this does not connect to a host, only touches this fixture.
    const valid = spawnSync(process.execPath, [script], { env: { ...env, DSH_WEB_URL: 'https://localhost:12345' }, encoding: 'utf8' })
    assert.equal(valid.status, 0, valid.stderr)
    assert.ok((await stat(bundle)).mtimeMs > before)
  })
})

test('fixture bundling is in-memory and preserves unrelated preview output', async () => {
  await fixture(async (root) => {
    await mkdir(join(root, 'build', 'preview'), { recursive: true })
    await writeFile(join(root, 'build', 'preview', 'keep.txt'), 'user preview\n')
    const entry = join(root, 'entry.ts')
    await writeFile(entry, 'export const answer: number = 42\n')
    const before = await readdir(root, { recursive: true })
    const source = await bundleCommonJS(entry, { write: true, outfile: join(root, 'must-not-exist.cjs') })
    const module = { exports: {} }
    new Function('module', 'exports', source)(module, module.exports)
    assert.equal(module.exports.answer, 42)
    assert.deepEqual(await readdir(root, { recursive: true }), before)
    assert.equal(await readFile(join(root, 'build', 'preview', 'keep.txt'), 'utf8'), 'user preview\n')
  })
})
