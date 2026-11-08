/**
 * Shared plumbing for the visual-QA scripts: bundle the pane fixtures with a
 * fake React, serialize the element tree to HTML, and wrap it in a page that
 * carries the host's real theme tokens.
 *
 * Used by `preview.mjs` (screenshots) and `audit.mjs` (computed-style checks).
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundleCommonJS } from './lib/bundle.mjs'

export const root = dirname(fileURLToPath(import.meta.url))
export const pluginRoot = join(root, '..')
export const outDir = join(pluginRoot, 'build', 'preview')

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

export const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate))

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])
const UNITLESS = new Set([
  'opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order',
  'fillOpacity', 'strokeOpacity', 'strokeWidth',
])
const ATTRS = {
  className: 'class',
  htmlFor: 'for',
  tabIndex: 'tabindex',
  spellCheck: 'spellcheck',
  autoComplete: 'autocomplete',
  readOnly: 'readonly',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeOpacity: 'stroke-opacity',
  fillOpacity: 'fill-opacity',
  clipPath: 'clip-path',
  strokeDasharray: 'stroke-dasharray',
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;')
}

function styleText(style) {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      const name = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
      const text = typeof value === 'number' && !UNITLESS.has(key) ? `${value}px` : String(value)
      return `${name}:${text}`
    })
    .join(';')
}

const fakeReact = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  Fragment: Symbol('Fragment'),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (value) => ({ current: value ?? null }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useReducer: (reducer, init) => [typeof init === 'function' ? init() : init, () => {}],
  useId: () => 'id',
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  useContext: () => ({}),
  useImperativeHandle: () => {},
  createContext: (value) => ({ Provider: null, Consumer: null, _value: value }),
  memo: (component) => component,
  forwardRef: (render) => render,
}

const fakeReactDom = { createPortal: (node) => node }

function serialize(node) {
  if (node === null || node === undefined || node === false || node === true) return ''
  if (Array.isArray(node)) return node.map(serialize).join('')
  if (typeof node === 'string' || typeof node === 'number') return escapeText(node)
  if (typeof node !== 'object') return ''

  const { type, props = {}, children = [] } = node
  if (type === fakeReact.Fragment) return serialize(children)
  if (typeof type === 'function') return serialize(type({ ...props, children }))
  if (typeof type !== 'string') return ''

  const attrs = []
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'key' || key === 'ref' || key === 'dangerouslySetInnerHTML') continue
    if (/^on[A-Z]/.test(key)) continue
    if (value === undefined || value === null || value === false) continue
    if (key === 'style') {
      const text = styleText(value)
      if (text) attrs.push(`style="${escapeAttr(text)}"`)
      continue
    }
    const name = ATTRS[key] || (key.startsWith('--') ? key : key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))
    if (value === true) {
      attrs.push(name)
      continue
    }
    attrs.push(`${name}="${escapeAttr(value)}"`)
  }

  const open = `<${type}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`
  if (VOID_TAGS.has(type)) return open
  const inner = type === 'textarea' && props.value !== undefined ? escapeText(props.value) : serialize(children)
  return `${open}${inner}</${type}>`
}

/** Fake the browser globals the fixtures touch while rendering. */
function installGlobals() {
  globalThis.window = {
    innerWidth: 1440,
    innerHeight: 900,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: (run) => run(),
    localStorage: { getItem: () => null, setItem() {} },
  }
  globalThis.document = {
    body: { style: {} },
    addEventListener() {},
    removeEventListener() {},
    documentElement: { style: {}, lang: 'zh-CN' },
    hidden: false,
    activeElement: null,
  }
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'zh-CN', clipboard: { writeText: () => Promise.resolve() } },
    configurable: true,
  })
}

/** Bundle the fixtures and return the exported cases. */
export async function loadFixtures() {
  const source = await bundleCommonJS(join(root, 'preview-entry.tsx'))
  installGlobals()

  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(
    (name) => {
      if (name === 'react') return fakeReact
      if (name === 'react-dom') return fakeReactDom
      throw new Error(`unexpected require(${name})`)
    },
    module,
    module.exports,
  )
  return module.exports
}

const STATIC_TOKENS = `
--dsw-static-deepseek-100:#e4edfd;--dsw-static-deepseek-200:#d3e2ff;--dsw-static-deepseek-400:#7aaaff;
--dsw-static-deepseek-450:#5686fe;--dsw-static-deepseek-50:#edf3fe;--dsw-static-deepseek-500:#4176e6;
--dsw-static-deepseek-600:#4868b2;--dsw-static-deepseek-800:#34415b;
--dsw-static-green-100:#e6faed;--dsw-static-green-400:#4ed17e;--dsw-static-green-500:#22c55e;--dsw-static-green-900:#233c2c;
--dsw-static-neutral-300:#d4d4d4;--dsw-static-neutral-600:#545557;--dsw-static-neutral-700:#3c3c3d;
--dsw-static-neutral-800:#292929;--dsw-static-neutral-850:#212123;
--dsw-static-neutral-bluish-00:#fff;--dsw-static-neutral-bluish-1000:#0f1115;--dsw-static-neutral-bluish-100:#ebeef2;
--dsw-static-neutral-bluish-150:#e9ecf2;--dsw-static-neutral-bluish-200:#e1e5ee;--dsw-static-neutral-bluish-300:#cfd3d6;
--dsw-static-neutral-bluish-400:#adb2b8;--dsw-static-neutral-bluish-50:#f9fafb;--dsw-static-neutral-bluish-500:#979da6;
--dsw-static-neutral-bluish-600:#81858c;--dsw-static-neutral-bluish-700:#61666b;--dsw-static-neutral-bluish-750:#43454a;
--dsw-static-neutral-bluish-75:#f1f3f5;--dsw-static-neutral-bluish-800:#353638;--dsw-static-neutral-bluish-850:#2c2c2e;
--dsw-static-neutral-bluish-875:#232324;--dsw-static-neutral-bluish-900:#1b1b1c;--dsw-static-neutral-bluish-950:#151517;
--dsw-static-amber-100:#fef3c7;--dsw-static-amber-400:#fbbf24;--dsw-static-amber-500:#f59e0b;--dsw-static-amber-600:#d97706;--dsw-static-amber-900:#451a03;
--dsw-static-red-100:#fee2e2;--dsw-static-red-400:#f25a5a;--dsw-static-red-500:#ef4444;--dsw-static-red-600:#ec1313;--dsw-static-red-900:#570c0c;
--dsw-static-blue-300:#b7c8fe;--dsw-static-blue-500:#5686fe;--dsw-static-blue-900:#0e3074;--dsw-static-blue-950:#172554;
`

const ALIAS_LIGHT = `
--dsw-alias-bg-base:var(--dsw-static-neutral-bluish-00);
--dsw-alias-bg-layer-1:var(--dsw-static-neutral-bluish-00);
--dsw-alias-bg-layer-2:var(--dsw-static-neutral-bluish-00);
--dsw-alias-bg-layer-3:var(--dsw-static-neutral-bluish-00);
--dsw-alias-bg-overlay:var(--dsw-static-neutral-bluish-150);
--dsw-alias-bg-mask-1:#0000003d;
--dsw-alias-bg-skeleton:#0000000a;
--dsw-alias-border-l1:#0000000a;--dsw-alias-border-l2:#0000001a;--dsw-alias-border-l3:#0000001f;--dsw-alias-border-l4:#00000029;
--dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-1000);
--dsw-alias-brand-text:var(--dsw-static-neutral-bluish-1000);
--dsw-alias-button-primary-hover:var(--dsw-static-neutral-bluish-750);
--dsw-alias-label-primary:var(--dsw-static-neutral-bluish-1000);
--dsw-alias-label-secondary:var(--dsw-static-neutral-bluish-700);
--dsw-alias-label-tertiary:var(--dsw-static-neutral-bluish-600);
--dsw-alias-label-caption:var(--dsw-static-neutral-bluish-400);
--dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-00);
--dsw-alias-interactive-bg-hover:#2631480f;
--dsw-alias-interactive-bg-active:#2631481a;
--dsw-alias-state-business-primary:var(--dsw-static-deepseek-500);
--dsw-alias-state-business-tertiary:var(--dsw-static-deepseek-100);
--dsw-alias-state-success-primary:var(--dsw-static-green-500);
--dsw-alias-state-success-tertiary:var(--dsw-static-green-100);
--dsw-alias-state-warn-primary:var(--dsw-static-amber-500);
--dsw-alias-state-warn-tertiary:var(--dsw-static-amber-100);
--dsw-alias-state-error-primary:var(--dsw-static-red-600);
--dsw-alias-state-error-secondary:var(--dsw-static-red-400);
--dsw-alias-state-idle-primary:var(--dsw-static-neutral-300);
--dsw-alias-menu-icon:var(--dsw-static-neutral-bluish-800);
--dsw-alias-link:var(--dsw-static-deepseek-500);
--dsw-menu-surface-fill:#f8f9faf0;
--dsw-specific-sidebar-fill:var(--dsw-static-neutral-bluish-50);
`

const ALIAS_DARK = `
--dsw-alias-bg-base:var(--dsw-static-neutral-bluish-950);
--dsw-alias-bg-layer-1:var(--dsw-static-neutral-bluish-875);
--dsw-alias-bg-layer-2:var(--dsw-static-neutral-bluish-850);
--dsw-alias-bg-layer-3:var(--dsw-static-neutral-bluish-800);
--dsw-alias-bg-overlay:var(--dsw-static-neutral-bluish-700);
--dsw-alias-bg-mask-1:#00000080;
--dsw-alias-bg-skeleton:#ffffff14;
--dsw-alias-border-l1:#ffffff0f;--dsw-alias-border-l2:#ffffff1f;--dsw-alias-border-l3:#ffffff29;--dsw-alias-border-l4:#fff3;
--dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-50);
--dsw-alias-brand-text:var(--dsw-static-neutral-bluish-50);
--dsw-alias-button-primary-hover:var(--dsw-static-neutral-bluish-100);
--dsw-alias-label-primary:var(--dsw-static-neutral-bluish-50);
--dsw-alias-label-secondary:var(--dsw-static-neutral-bluish-300);
--dsw-alias-label-tertiary:var(--dsw-static-neutral-bluish-400);
--dsw-alias-label-caption:var(--dsw-static-neutral-bluish-600);
--dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-1000);
--dsw-alias-interactive-bg-hover:#ffffff14;
--dsw-alias-interactive-bg-active:#ffffff24;
--dsw-alias-state-business-primary:var(--dsw-static-deepseek-450);
--dsw-alias-state-business-tertiary:var(--dsw-static-deepseek-800);
--dsw-alias-state-success-primary:var(--dsw-static-green-500);
--dsw-alias-state-success-tertiary:var(--dsw-static-green-900);
--dsw-alias-state-warn-primary:var(--dsw-static-amber-500);
--dsw-alias-state-warn-tertiary:var(--dsw-static-amber-900);
--dsw-alias-state-error-primary:var(--dsw-static-red-400);
--dsw-alias-state-error-secondary:var(--dsw-static-red-400);
--dsw-alias-state-idle-primary:var(--dsw-static-neutral-600);
--dsw-alias-menu-icon:var(--dsw-alias-label-primary-dimmed);
--dsw-alias-link:var(--dsw-static-deepseek-400);
--dsw-menu-surface-fill:#43454a73;
--dsw-specific-sidebar-fill:var(--dsw-static-neutral-bluish-900);
`

const PREVIEW_CSS = `
html,body{margin:0;padding:0}
body{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:13px/1.5 "Segoe UI",system-ui,-apple-system,sans-serif}
.gallery{display:flex;flex-direction:column;gap:20px;padding:20px;max-width:1560px}
.shot{position:relative;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l3);border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-base)}
.shot:not(.shot-wide){max-width:820px}
.shot h2{margin:0;flex:none;padding:7px 12px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l2)}
.shot-body{position:relative;flex:1;min-height:0;overflow:hidden}
.shot .gv-root{height:100%;padding-top:0}
.shot .gv-modal-mask,.shot .gv-dialog-mask{position:absolute!important;inset:0!important;padding:12px}
.shot .gv-modal{height:100%!important;max-height:100%!important;width:100%!important;max-width:100%!important}
.shot .gv-dialog{max-height:calc(100% - 24px)!important}
.shot .gv-menu{position:absolute!important;left:12px!important;top:12px!important}
.shot .gv-opt-menu{position:absolute!important;left:12px!important;top:12px!important}
`

/** Serialize one fixture case into a standalone, themed document. */
export function renderPage(theme, bodyHtml) {
  const alias = theme === 'dark' ? ALIAS_DARK : ALIAS_LIGHT
  const attr = theme === 'dark' ? ' data-ds-dark-theme' : ''
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>git-view · ${theme}</title>
<style>:root{${STATIC_TOKENS}}body{${alias}}</style>
<style>${PREVIEW_CSS}</style>
</head><body${attr}>${bodyHtml}</body></html>`
}

/** Serialize a fixture element (or the whole gallery) to HTML. */
export function renderFixture(element) {
  return serialize(element)
}
