/**
 * Transient notices shown by the panel.
 *
 * One store owns the timeout so every caller (commit, branch, remote, history)
 * uses the same auto-dismiss and the same two severities. Errors carry a title
 * and a copyable detail block and stay until dismissed; successes disappear on
 * their own.
 */

export type NoticeKind = 'ok' | 'error'

export interface Notice {
  text: string
  kind: NoticeKind
  /** Short operation title, e.g. "分支操作失败". */
  title?: string
  /** Copyable technical detail (HTTP status, stack). */
  detail?: string
  /** Whether the notice stays until the user closes it. */
  sticky: boolean
  /** Monotonic id so a repeated message re-renders and re-arms the timer. */
  at: number
}

export interface NoticeOptions {
  title?: string
  detail?: string
  sticky?: boolean
}

type Listener = (notice: Notice | null) => void

export class NoticeCenter {
  private notice: Notice | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly listeners = new Set<Listener>()
  private readonly durationMs: number
  private sequence = 0

  constructor(durationMs = 6000) {
    this.durationMs = durationMs
  }

  /** Current notice, if any. */
  get current(): Notice | null {
    return this.notice
  }

  /**
   * Replace the notice and restart the dismiss timer.
   * @param text - user-facing message.
   * @param kind - success or error.
   * @param options - title, technical detail, sticky override.
   */
  show(text: string, kind: NoticeKind = 'ok', options: NoticeOptions = {}): void {
    if (!text && !options.title) return
    this.sequence += 1
    this.notice = {
      text,
      kind,
      title: options.title,
      detail: options.detail,
      sticky: options.sticky ?? kind === 'error',
      at: this.sequence,
    }
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (!this.notice.sticky) {
      this.timer = setTimeout(() => this.clear(), this.durationMs)
    }
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
