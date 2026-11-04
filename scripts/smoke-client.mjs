/**
 * Client smoke test: loads the built `client.js` through the module-loader
 * contract, registers it with a mock browser context and renders the panel once
 * with a fake React so module wiring and the first frame are exercised.
 *
 * Run with `node scripts/smoke-client.mjs` after `pnpm build`.
 */
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const failures = []
const check = (name, condition, detail = '') => {
  if (condition) console.log(`ok   ${name}`)
  else {
    console.error(`FAIL ${name} ${detail}`)
    failures.push(name)
  }
}

let definition = null
const windowStub = {
  __ModuleLoader__: {
    load(def) {
      definition = def
    },
  },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1440,
  innerHeight: 900,
  requestAnimationFrame: (run) => run(),
  setTimeout: (run) => run(),
  clearTimeout() {},
}
const documentStub = {
  addEventListener() {},
  removeEventListener() {},
  documentElement: { lang: 'zh-CN', style: {} },
  body: {},
  hidden: false,
  activeElement: null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
}
const navigatorStub = { language: 'zh-CN', clipboard: { writeText: () => Promise.resolve() } }

const noopSet = () => {}
const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('Fragment'),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value }),
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

try {
  new Function('window', 'document', 'navigator', source)(windowStub, documentStub, navigatorStub)
} catch (error) {
  console.error('FAIL loading client.js:', error)
  process.exit(1)
}
check('module registered', Boolean(definition) && definition.id === '@local/dsh-git-view')
check('module exposes factory', typeof definition?.factory === 'function')

let module = null
try {
  module = definition.factory((name) => {
    if (name === 'react') return fakeReact
    if (name === 'react-dom') return fakeReactDom
    throw new Error(`unexpected require(${name})`)
  })
} catch (error) {
  console.error('FAIL factory threw:', error)
  process.exit(1)
}
check('exports apply', typeof module?.apply === 'function')
check('exports inject', Array.isArray(module?.inject) && module.inject.join(',') === 'slots,locale')

let panel = null
const registrations = []
try {
  module.apply({
    effect(run) {
      run()
    },
    locale: {
      register(namespace, dictionaries) {
        registrations.push(['locale', namespace, Object.keys(dictionaries.zh).length, Object.keys(dictionaries.en).length])
      },
      bind: () => (key) => key,
    },
    slots: {
      inject: (slot, run) => run(),
      register(options, component) {
        registrations.push(['register', options.name, options.key || options.id])
        if (options.name === 'main') panel = component
      },
    },
  })
} catch (error) {
  console.error('FAIL apply threw:', error)
  process.exit(1)
}
const names = registrations.map((entry) => entry.slice(1).join(':'))
check('registers dictionaries', registrations.some((entry) => entry[0] === 'locale' && entry[2] > 0 && entry[2] === entry[3]))
check('registers main panel', names.includes('main:git-view'))
check('registers sidebar entry', names.includes('sidebar.panellist:git-view'))

try {
  const tree = panel({ t: (key) => key })
  check(
    'renders first frame',
    Boolean(tree) && (tree.type === 'div' || typeof tree.type === 'function'),
    JSON.stringify(tree)?.slice(0, 120),
  )
} catch (error) {
  console.error('FAIL first render threw:', error)
  process.exit(1)
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nclient smoke test passed')



