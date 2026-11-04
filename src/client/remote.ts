/**
 * Drives one fetch/pull/push job: starts it, streams snapshots to the UI and
 * exposes cancellation. Components never poll the route themselves.
 */
import { GitApi } from './api.js'
import type { RemoteOp, RemoteSnapshot } from './types.js'

export interface RemoteStart {
  id: string
  label: string
}

export class RemoteRunner {
  private readonly api: GitApi
  private readonly onUpdate: (snapshot: RemoteSnapshot) => void
  private currentId = ''

  constructor(api: GitApi, onUpdate: (snapshot: RemoteSnapshot) => void) {
    this.api = api
    this.onUpdate = onUpdate
  }

  /** Whether a job started by this runner is still running. */
  get running(): boolean {
    return Boolean(this.currentId)
  }

  /**
   * Start one remote operation and poll until it settles.
   * @param repoId - workspace id.
   * @param op - fetch, pull, or push.
   * @param options - rebase / force-with-lease / tags.
   * @param signal - cancellation of the polling itself.
   * @returns the final snapshot.
   */
  async run(
    repoId: string,
    op: RemoteOp,
    options: Record<string, boolean> = {},
    signal?: AbortSignal,
  ): Promise<RemoteSnapshot> {
    const start = await this.start(repoId, op, options)
    try {
      return await this.poll(repoId, start.id, signal)
    } finally {
      this.currentId = ''
    }
  }

  /**
   * Start the job only, so the caller can show its progress strip before the
   * first poll round-trip.
   * @param repoId - workspace id.
   * @param op - fetch, pull, or push.
   * @param options - rebase / force-with-lease / tags.
   * @returns the job id and label.
   */
  async start(repoId: string, op: RemoteOp, options: Record<string, boolean> = {}): Promise<RemoteStart> {
    const start = await this.api.write<RemoteStart>({ repo: repoId, action: 'remote', op, ...options })
    this.currentId = start.id
    return start
  }

  /**
   * Poll a job started by this runner until it settles.
   * @param repoId - workspace id.
   * @param jobId - job id.
   * @param signal - cancellation.
   * @returns the final snapshot.
   */
  async poll(repoId: string, jobId: string, signal?: AbortSignal): Promise<RemoteSnapshot> {
    return this.api.pollRemote(repoId, jobId, this.onUpdate, signal)
  }

  /** Forget the current job id (after polling ends). */
  clear(): void {
    this.currentId = ''
  }

  /**
   * Ask the running job to stop. Safe to call when nothing is running.
   * @param repoId - workspace id.
   */
  async cancel(repoId: string): Promise<void> {
    if (!this.currentId) return
    try {
      await this.api.write({ repo: repoId, action: 'remoteCancel', id: this.currentId })
    } catch {
      /* the job may have finished between the click and the request */
    }
  }
}
