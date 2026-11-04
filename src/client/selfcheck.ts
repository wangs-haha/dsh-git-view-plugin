/**
 * Self-healing bundle freshness check.
 *
 * The panel is a browser bundle served by the DSH host. After `pnpm build` the
 * host pushes a `rebuilt` frame on `/plugins/events` and the page swaps the
 * module — but that channel is a one-shot subscription: if it ever closed, the
 * page keeps running the old bundle until something reloads it, and the desktop
 * shell has no reload entry. This module closes that hole.
 *
 * How it works:
 *   1. read the host's client graph off `/plugins/events` (first frame only) and
 *      take this plugin's current bundle URL;
 *   2. fetch that bundle and look for the build marker compiled into the running
 *      code by `scripts/build.mjs`;
 *   3. on a mismatch reload the page once — guarded per marker in
 *      `sessionStorage`, skipped while the document is hidden, and never
 *      retried for the same marker, so a bad deployment cannot cause a reload
 *      loop.
 *
 * Everything network-facing fails open: an unreachable host, a missing graph
 * row, or a parse error all leave the panel exactly as it is.
 */

/** Build marker injected by `scripts/build.mjs`; empty when bundled without it. */
declare const __GV_BUILD__: string
/** Package name, so the graph row can be found without hard-coding it twice. */
declare const __GV_PLUGIN_ID__: string

/** Marker of the code that is running right now. */
export const BUILD_MARKER: string = typeof __GV_BUILD__ === 'string' ? __GV_BUILD__ : ''
/** Id of this plugin in the host's client graph. */
export const PLUGIN_ID: string = typeof __GV_PLUGIN_ID__ === 'string' ? __GV_PLUGIN_ID__ : '@local/dsh-git-view'

const GUARD_PREFIX = 'dsh.git-view.selfcheck.'
const DEFAULT_TIMEOUT_MS = 5000
const FIRST_CHECK_MS = 4000
const CHECK_INTERVAL_MS = 60_000
const MIN_VISIBLE_GAP_MS = 15_000

/** What the check concluded. */
export type Freshness = 'current' | 'stale' | 'unknown'

/**
 * Reasons the page must not reload right now (an unsent commit message, a
 * running action, an open dialog). The panel holds a key while such state
 * exists, so a rebuild-driven reload can never throw away the user's work: the
 * check simply retries on its next tick.
 */
const holders = new Set<string>()

/** Prevent an automatic reload until the matching {@link releaseFreshnessReload}. */
export function holdFreshnessReload(key: string): void {
  holders.add(key)
}

/** Release one {@link holdFreshnessReload} key. */
export function releaseFreshnessReload(key: string): void {
  holders.delete(key)
}

/** Whether anything currently blocks an automatic reload. */
export function freshnessReloadHeld(): boolean {
  return holders.size > 0
}

export interface FreshnessOptions {
  /** Page origin, e.g. `http://127.0.0.1:50537`. */
  origin: string
  /** Marker of the running code; defaults to {@link BUILD_MARKER}. */
  marker?: string
  fetchImpl: typeof fetch
  /** Storage used for the reload guard; `null` disables the guard. */
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
  /** Reload action; injectable so the check can be tested. */
  reload: () => void
  /** Whether reloading now would be seen by the user. */
  isVisible: () => boolean
  timeoutMs?: number
}

/** Combined abort signal with a timeout, and a disposer for the timer. */
function deadline(controller: AbortController, timeoutMs: number): () => void {
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return () => clearTimeout(timer)
}

/**
 * Read this plugin's bundle URL from the host's client graph.
 * @returns the bundle URL, or `null` when it cannot be determined.
 */
async function readBundleUrl(options: FreshnessOptions): Promise<string | null> {
  const controller = new AbortController()
  const clear = deadline(controller, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const response = await options.fetchImpl(`${options.origin}/plugins/events`, {
      headers: { accept: 'text/event-stream' },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok || !response.body) return null
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) return null
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''
        for (const frame of frames) {
          const data = frame
            .split('\n')
            .find((line) => line.startsWith('data:'))
          if (!data) continue
          let parsed: unknown
          try {
            parsed = JSON.parse(data.slice(5).trim())
          } catch {
            continue
          }
          const frame_ = parsed as { type?: string; graph?: { entries?: Array<{ id?: string; url?: string }> } }
          if (frame_.type !== 'graph') continue
          const row = (frame_.graph?.entries ?? []).find((entry) => entry.id === PLUGIN_ID)
          if (row?.url) return new URL(row.url, options.origin).href
          return null
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined)
    }
  } catch {
    return null
  } finally {
    clear()
  }
}

/**
 * Check whether the served bundle still carries the running build marker.
 * @returns `'current'`, `'stale'`, or `'unknown'` when the check cannot tell.
 */
export async function checkBundleFreshness(options: FreshnessOptions): Promise<Freshness> {
  const marker = options.marker ?? BUILD_MARKER
  if (!marker) return 'unknown'

  const url = await readBundleUrl(options)
  if (!url) return 'unknown'

  const controller = new AbortController()
  const clear = deadline(controller, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  let served = ''
  try {
    const response = await options.fetchImpl(url, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) return 'unknown'
    served = await response.text()
  } catch {
    return 'unknown'
  } finally {
    clear()
  }
  if (served.includes(marker)) return 'current'

  // Served code is a different build: reload once per marker.
  const guardKey = `${GUARD_PREFIX}${marker}`
  try {
    if (options.storage?.getItem(guardKey) === '1') return 'unknown'
  } catch {
    return 'unknown'
  }
  if (!options.isVisible()) return 'unknown'
  if (freshnessReloadHeld()) return 'unknown'
  try {
    options.storage?.setItem(guardKey, '1')
  } catch {
    /* storage is optional; the guard only exists to stop loops */
  }
  options.reload()
  return 'stale'
}

/**
 * Poll the freshness check: once shortly after load, then periodically, and
 * whenever the window becomes visible again (the moment a stale page would be
 * noticed). Checks never overlap and never read the network more than twice.
 * @returns dispose function.
 */
export function startBundleFreshnessWatch(
  options: FreshnessOptions,
  timings: { firstMs?: number; intervalMs?: number; visibleGapMs?: number } = {},
): () => void {
  const marker = options.marker ?? BUILD_MARKER
  if (!marker) return () => undefined

  const firstMs = timings.firstMs ?? FIRST_CHECK_MS
  const intervalMs = timings.intervalMs ?? CHECK_INTERVAL_MS
  const visibleGapMs = timings.visibleGapMs ?? MIN_VISIBLE_GAP_MS
  let running = false
  let disposed = false
  let lastRun = 0

  const run = (): void => {
    if (disposed || running) return
    running = true
    lastRun = Date.now()
    void checkBundleFreshness(options)
      .catch(() => undefined)
      .finally(() => {
        running = false
      })
  }

  const first = setTimeout(run, firstMs)
  const interval = setInterval(run, intervalMs)
  const onVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    if (Date.now() - lastRun < visibleGapMs) return
    run()
  }
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
  }

  return () => {
    disposed = true
    clearTimeout(first)
    clearInterval(interval)
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }
}

/**
 * Wire the watch to the real page. Safe to call in any environment: it returns a
 * no-op disposer when there is no build marker or no `fetch`.
 * @returns dispose function for the plugin effect.
 */
export function installFreshnessCheck(): () => void {
  if (!BUILD_MARKER || typeof fetch !== 'function' || typeof location === 'undefined') {
    return () => undefined
  }
  let storage: Pick<Storage, 'getItem' | 'setItem'> | null = null
  try {
    storage = window.sessionStorage
  } catch {
    storage = null
  }
  return startBundleFreshnessWatch({
    origin: location.origin,
    fetchImpl: fetch,
    storage,
    reload: () => {
      location.reload()
    },
    isVisible: () => document.visibilityState === 'visible',
  })
}
