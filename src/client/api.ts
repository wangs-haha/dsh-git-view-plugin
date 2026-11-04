/**
 * Thin typed client for the two authenticated routes the Host half registers.
 *
 * One class owns the transport so components never build URLs or decode error
 * envelopes themselves.
 */
import type { RemoteSnapshot } from './types.js'

/** Base path of the authenticated read route. */
const DEFAULT_BASE = 'api/git-view'

export class GitApiError extends Error {
  readonly status: number
  readonly conflict: boolean
  readonly state: unknown

  constructor(message: string, status: number, conflict = false, state: unknown = null) {
    super(message)
    this.name = 'GitApiError'
    this.status = status
    this.conflict = conflict
    this.state = state
  }
}

interface ErrorBody {
  error?: string
  conflict?: boolean
  state?: unknown
}

export class GitApi {
  private readonly base: string

  constructor(base: string = DEFAULT_BASE) {
    this.base = base
  }

  /**
   * GET one read action.
   * @param action - action name (`status`, `log`, ...).
   * @param params - query parameters; `undefined` values are dropped.
   * @param signal - cancellation.
   * @returns the parsed payload.
   */
  async read<T>(action: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<T> {
    const search = new URLSearchParams({ action })
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') continue
      search.set(key, String(value))
    }
    const response = await fetch(`${this.base}?${search.toString()}`, {
      signal,
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
    return parseResponse<T>(response)
  }

  /**
   * POST one write action.
   * @param body - request payload.
   * @returns the parsed payload.
   */
  async write<T>(body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.base}/write`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse<T>(response)
  }

  /**
   * Poll one remote job until it settles.
   * @param repoId - workspace id.
   * @param jobId - job id returned by `remote`.
   * @param onUpdate - called with every snapshot while running.
   * @param signal - cancellation.
   * @returns the final snapshot.
   */
  async pollRemote(
    repoId: string,
    jobId: string,
    onUpdate: (snapshot: RemoteSnapshot) => void,
    signal?: AbortSignal,
  ): Promise<RemoteSnapshot> {
    for (;;) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
      const snapshot = await this.read<RemoteSnapshot>('remoteJob', { repo: repoId, id: jobId }, signal)
      onUpdate(snapshot)
      if (snapshot.state !== 'running' && snapshot.state !== 'cancelling') return snapshot
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      throw new GitApiError(text.slice(0, 300) || `HTTP ${response.status}`, response.status)
    }
  }
  if (!response.ok) {
    const body = (payload || {}) as ErrorBody
    throw new GitApiError(
      body.error || `HTTP ${response.status}`,
      response.status,
      body.conflict === true,
      body.state ?? null,
    )
  }
  return payload as T
}

/** Whether a caught value is an abort. */
export function isAbort(error: unknown): boolean {
  return Boolean(error) && (error as { name?: string }).name === 'AbortError'
}

/** Display text for a caught value. */
export function errorText(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return error.message
  return String(error)
}
