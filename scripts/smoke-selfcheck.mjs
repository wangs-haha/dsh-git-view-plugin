/**
 * Freshness self-check smoke test.
 *
 * Bundles `src/client/selfcheck.ts` with a known build marker, then drives it
 * with fake fetch/storage/document to prove the decisions it must make:
 *
 *   - served bundle carries the running marker  -> current, no reload
 *   - served bundle is another build            -> stale, reload exactly once
 *   - same marker already reloaded              -> no second reload (no loop)
 *   - document hidden                           -> no reload, no guard burn
 *   - host unreachable / graph row missing       -> fail open
 *   - no marker compiled                         -> never touches the network
 *
 * Run with `node scripts/smoke-selfcheck.mjs`.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundleCommonJS } from './lib/bundle.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const marker = 'test-build-abc123'
const source = await bundleCommonJS(join(root, '..', 'src', 'client', 'selfcheck.ts'), {
  define: {
    __GV_BUILD__: JSON.stringify(marker),
    __GV_PLUGIN_ID__: JSON.stringify('@local/dsh-git-view'),
  },
})

const module = { exports: {} }
new Function('require', 'module', 'exports', source)((name) => {
  throw new Error(`unexpected require(${name})`)
}, module, module.exports)
const { checkBundleFreshness, startBundleFreshnessWatch, BUILD_MARKER, PLUGIN_ID, holdFreshnessReload, releaseFreshnessReload } =
  module.exports

const failures = []
function check(name, condition, detail) {
  if (condition) {
    console.log(`ok   ${name}`)
    return
  }
  failures.push(name)
  console.error(`FAIL ${name}${detail === undefined ? '' : `: ${detail}`}`)
}

/** Fake SSE stream that yields one graph frame and then ends. */
function graphStream(url, entries) {
  const payload = `data: ${JSON.stringify({ type: 'graph', graph: { entries } })}\n\n`
  let sent = false
  return {
    getReader() {
      return {
        read: async () => {
          if (sent) return { done: true, value: undefined }
          sent = true
          return { done: false, value: new TextEncoder().encode(payload) }
        },
        cancel: async () => undefined,
      }
    },
  }
}

/** Fetch double: answers the graph route and the bundle route. */
function fakeFetch({ entries, bundle, fail = false }) {
  return async (url) => {
    if (fail) throw new Error('offline')
    if (String(url).includes('/plugins/events')) {
      return { ok: true, body: graphStream(url, entries) }
    }
    if (String(url).includes('client.js')) {
      return { ok: true, text: async () => bundle }
    }
    return { ok: false, status: 404, text: async () => '' }
  }
}

function fakeStorage() {
  const map = new Map()
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  }
}

function options(overrides = {}) {
  return {
    origin: 'http://127.0.0.1:50537',
    marker,
    fetchImpl: fakeFetch({
      entries: [{ id: PLUGIN_ID, url: 'plugins/??@local/dsh-git-view/client.js&rev=1' }],
      bundle: `window.__ModuleLoader__.load({ id: '${PLUGIN_ID}' }); /* ${marker} */`,
    }),
    storage: fakeStorage(),
    reload: () => undefined,
    isVisible: () => true,
    timeoutMs: 500,
    ...overrides,
  }
}

check('compiles the build marker', BUILD_MARKER === marker, BUILD_MARKER)
check('knows its plugin id', PLUGIN_ID === '@local/dsh-git-view', PLUGIN_ID)

{
  let reloads = 0
  const result = await checkBundleFreshness(options({ reload: () => (reloads += 1) }))
  check('matching served bundle is current', result === 'current', result)
  check('matching bundle never reloads', reloads === 0, String(reloads))
}

{
  let reloads = 0
  const storage = fakeStorage()
  const stale = options({
    storage,
    reload: () => (reloads += 1),
    fetchImpl: fakeFetch({
      entries: [{ id: PLUGIN_ID, url: 'plugins/??@local/dsh-git-view/client.js&rev=2' }],
      bundle: 'window.__ModuleLoader__.load({}); /* other-build */',
    }),
  })
  const first = await checkBundleFreshness(stale)
  check('different served bundle is stale', first === 'stale', first)
  check('stale bundle reloads once', reloads === 1, String(reloads))
  check('guard is recorded for the marker', storage.getItem(`dsh.git-view.selfcheck.${marker}`) === '1')

  const second = await checkBundleFreshness(stale)
  check('second pass does not reload again', second === 'unknown', second)
  check('exactly one reload happened', reloads === 1, String(reloads))
}

{
  let reloads = 0
  const storage = fakeStorage()
  const hidden = options({
    storage,
    isVisible: () => false,
    reload: () => (reloads += 1),
    fetchImpl: fakeFetch({
      entries: [{ id: PLUGIN_ID, url: 'plugins/??@local/dsh-git-view/client.js&rev=3' }],
      bundle: '/* other-build */',
    }),
  })
  const result = await checkBundleFreshness(hidden)
  check('hidden document never reloads', reloads === 0, String(reloads))
  check('hidden document reports unknown', result === 'unknown', result)
  check(
    'hidden document keeps the guard unused',
    storage.getItem(`dsh.git-view.selfcheck.${marker}`) === null,
  )
}

{
  let reloads = 0
  const storage = fakeStorage()
  const stale = options({
    storage,
    reload: () => (reloads += 1),
    fetchImpl: fakeFetch({
      entries: [{ id: PLUGIN_ID, url: 'plugins/??@local/dsh-git-view/client.js&rev=5' }],
      bundle: '/* other-build */',
    }),
  })
  holdFreshnessReload('draft')
  const held = await checkBundleFreshness(stale)
  check('held reload is skipped', reloads === 0 && held === 'unknown', `${held}/${reloads}`)
  check('held reload keeps the guard unused', storage.getItem(`dsh.git-view.selfcheck.${marker}`) === null)
  releaseFreshnessReload('draft')
  const resumed = await checkBundleFreshness(stale)
  check('reload happens once the hold is released', resumed === 'stale' && reloads === 1, `${resumed}/${reloads}`)
}

{
  const result = await checkBundleFreshness(options({ fetchImpl: fakeFetch({ fail: true }) }))
  check('unreachable host fails open', result === 'unknown', result)
}

{
  const result = await checkBundleFreshness(
    options({ fetchImpl: fakeFetch({ entries: [{ id: 'other-plugin', url: 'x' }], bundle: '' }) }),
  )
  check('missing graph row fails open', result === 'unknown', result)
}

{
  let calls = 0
  const result = await checkBundleFreshness(
    options({
      marker: '',
      fetchImpl: async () => {
        calls += 1
        return { ok: true, text: async () => '' }
      },
    }),
  )
  check('no marker means no check', result === 'unknown' && calls === 0, `${result}/${calls}`)
}

{
  let reloads = 0
  const dispose = startBundleFreshnessWatch(
    options({
      reload: () => (reloads += 1),
      fetchImpl: fakeFetch({
        entries: [{ id: PLUGIN_ID, url: 'plugins/??@local/dsh-git-view/client.js&rev=4' }],
        bundle: '/* other-build */',
      }),
    }),
    { firstMs: 10, intervalMs: 20, visibleGapMs: 0 },
  )
  await new Promise((resolve) => setTimeout(resolve, 120))
  dispose()
  await new Promise((resolve) => setTimeout(resolve, 60))
  check('watch reloads a stale page at most once', reloads === 1, String(reloads))
  check('dispose stops the watch', reloads === 1, String(reloads))
}

if (failures.length) {
  console.error(`\n${failures.length} self-check assertion(s) failed`)
  process.exit(1)
}
console.log('\nself-check smoke test passed')
