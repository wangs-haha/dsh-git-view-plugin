/**
 * Pane smoke test: bundles the component fixtures with esbuild, runs them with a
 * fake React and walks each element tree, invoking function components.
 *
 * Catches runtime errors in render paths that the module-level smoke test does
 * not touch (data-bearing panes, dialogs, menus).
 *
 * Run with `node scripts/smoke-panes.mjs`.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundleCommonJS } from './lib/bundle.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const source = await bundleCommonJS(join(root, 'panes-entry.tsx'))

globalThis.window = { innerWidth: 1280, innerHeight: 860, addEventListener() {}, removeEventListener() {}, requestAnimationFrame: (run) => run(), localStorage: { getItem: () => null, setItem() {} } }
globalThis.document = { body: {}, addEventListener() {}, removeEventListener() {}, documentElement: { style: {}, lang: 'zh-CN' }, hidden: false, activeElement: null }
Object.defineProperty(globalThis, 'navigator', { value: { language: 'zh-CN', clipboard: { writeText: () => Promise.resolve() } }, configurable: true })
const noopSet = () => {}
const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  Fragment: Symbol('Fragment'),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value ?? null }),
  useState: (init) => [typeof init === 'function' ? init() : init, noopSet],
  useReducer: (reducer, init) => [typeof init === 'function' ? init() : init, noopSet],
  useId: () => 'id',
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  useContext: () => ({}),
  useImperativeHandle: () => {},
  createContext: (value) => ({ Provider: null, Consumer: null, _value: value }),
  memo: (component) => component,
  forwardRef: (render) => render,
  Component: class {
    constructor(props) {
      this.props = props
    }
    setState() {}
  },
}
const fakeReactDom = { createPortal: (node) => node }

const module = { exports: {} }
try {
  new Function('require', 'module', 'exports', source)((name) => {
    if (name === 'react') return fakeReact
    if (name === 'react-dom') return fakeReactDom
    throw new Error(`unexpected require(${name})`)
  }, module, module.exports)
} catch (error) {
  console.error('FAIL loading fixtures:', error)
  process.exit(1)
}

const { CASES } = module.exports
const failures = []
let depthLimitHit = false

function walk(node, depth = 0) {
  if (node === null || node === undefined || node === false) return 0
  if (depth > 400) {
    depthLimitHit = true
    return 0
  }
  if (Array.isArray(node)) return node.reduce((count, child) => count + walk(child, depth), 0)
  if (typeof node !== 'object') return 0
  if (typeof node.type === 'function') {
    const rendered = node.type({ ...node.props, children: node.children })
    return 1 + walk(rendered, depth + 1)
  }
  return (node.children || []).reduce((count, child) => count + walk(child, depth), 0)
}

for (const testCase of CASES) {
  try {
    const components = walk(testCase.element)
    console.log(`ok   ${testCase.name} (${components} component(s))`)
  } catch (error) {
    failures.push(testCase.name)
    console.error(`FAIL ${testCase.name}:`, error && error.stack ? error.stack.split('\n').slice(0, 4).join(' | ') : error)
  }
}

if (depthLimitHit) failures.push('depth-guard')
if (failures.length) {
  console.error(`\n${failures.length} pane check(s) failed`)
  process.exit(1)
}
console.log('\npane smoke test passed')
