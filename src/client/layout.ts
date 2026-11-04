/**
 * Persisted panel layout: pane widths and the last opened workspace.
 *
 * A single store owns the localStorage keys so components never touch storage
 * directly; bumping `VERSION` resets stale layouts without losing data.
 */

export const MIN_LEFT = 160
export const MAX_LEFT = 460
export const MIN_RIGHT = 240
export const MAX_RIGHT = 660
export const MIN_CHANGES = 300
export const DEFAULT_CHANGES = 360

export type WidthKey = 'left' | 'right' | 'changes'

export const LAYOUT_DEFAULTS: Record<WidthKey, number> = {
  left: 280,
  right: 360,
  changes: DEFAULT_CHANGES,
}

const VERSION = 'v2'
const KEY_PREFIX = `dsh.git-view.${VERSION}`
const REPO_KEY = 'dsh.git-view.repo'

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export class LayoutStore {
  private readonly storage: Storage | null

  constructor(storage?: Storage | null) {
    this.storage = storage === undefined ? safeStorage() : storage
  }

  /**
   * Read one persisted width.
   * @param key - which pane.
   * @param min - lower clamp.
   * @param max - upper clamp.
   * @returns the width in pixels, falling back to the default.
   */
  readWidth(key: WidthKey, min: number, max: number): number {
    const fallback = LAYOUT_DEFAULTS[key]
    if (!this.storage) return clamp(fallback, min, max)
    const raw = this.storage.getItem(`${KEY_PREFIX}.${key}`)
    const parsed = raw === null ? Number.NaN : Number(raw)
    return clamp(Number.isFinite(parsed) ? parsed : fallback, min, max)
  }

  /** Persist one width. */
  writeWidth(key: WidthKey, value: number): void {
    try {
      this.storage?.setItem(`${KEY_PREFIX}.${key}`, String(Math.round(value)))
    } catch {
      /* private mode or quota */
    }
  }

  /** Last opened workspace id. */
  readRepo(): string {
    try {
      return this.storage?.getItem(REPO_KEY) || ''
    } catch {
      return ''
    }
  }

  /** Remember the opened workspace. */
  writeRepo(id: string): void {
    try {
      if (id) this.storage?.setItem(REPO_KEY, id)
    } catch {
      /* private mode */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}
