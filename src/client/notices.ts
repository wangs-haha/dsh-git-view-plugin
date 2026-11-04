/**
 * Transient notices shown by the panel.
 *
 * One store owns the timeout so every caller (commit, branch, remote, history)
 * uses the same 6 s auto-dismiss and the same two severities.
 */

export type NoticeKind = 'ok' | 'error'

export interface Notice {
  text: string
  kind: NoticeKind
}

type Listener = (notice: Notice | null) => void

export class NoticeCenter {
  private notice: Notice | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly listeners = new Set<Listener>()
  private readonly durationMs: number

  constructor(durationMs = 6000) {
    this.durationMs = durationMs
  }

  /** Current notice, if any. */
  get current(): Notice | null {
    return this.notice
  }

  /** Replace the notice and restart the dismiss timer. */
  show(text: string, kind: NoticeKind = 'ok'): void {
    if (!text) return
    this.notice = { text, kind }
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.clear(), this.durationMs)
    this.emit()
  }

  /** Dismiss immediately. */
  clear(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.notice === null) return
    this.notice = null
    this.emit()
  }

  /** Subscribe to notice changes. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.notice)
  }
}
