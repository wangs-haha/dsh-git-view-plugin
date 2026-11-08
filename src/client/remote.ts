/**
 * Drives one fetch/pull/push job: starts it, streams snapshots to the UI and
 * exposes cancellation. Components never poll the route themselves.
 *
 * A runner is bound to the repository it started in, so a repository switch
 * cannot change the meaning of `cancel()` or the polling target.
 */
import { GitApi, GitApiError } from './api.js'
import type { RemoteOp, RemoteSnapshot } from './types.js'

export interface RemoteStart {
  id: string
  label: string
}

export class RemoteRunner {
  private readonly api: GitApi
  private readonly onUpdate: (snapshot: RemoteSnapshot) => void
  private currentId = ''
  private currentRepo = ''

  constructor(api: GitApi, onUpdate: (snapshot: RemoteSnapshot) => void) {
    this.api = api
    this.onUpdate = onUpdate
  }

  /** Whether a job started by this runner is still running. */
  get running(): boolean {
    return Boolean(this.currentId)
  }

  /** Repository this runner started its job in. */
  get repoId(): string {
    return this.currentRepo
  }

  /** Job id of the current operation. */
  get jobId(): string {
    return this.currentId
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
      return await this.poll(start.id, signal)
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
    this.currentRepo = repoId
    return start
  }

  /**
   * Poll a job started by this runner until it settles.
   * @param jobId - job id.
   * @param signal - cancellation.
   * @returns the final snapshot.
   */
  async poll(jobId: string, signal?: AbortSignal): Promise<RemoteSnapshot> {
    return this.api.pollRemote(this.currentRepo, jobId, this.onUpdate, signal)
  }

  /** Forget the current job id (after polling ends). */
  clear(): void {
    this.currentId = ''
  }

  /**
   * Ask the running job to stop. Safe to call when nothing is running.
   * @returns whether the host accepted the request.
   */
  async cancel(): Promise<boolean> {
    if (!this.currentId) return true
    try {
      await this.api.write({ repo: this.currentRepo, action: 'remoteCancel', id: this.currentId })
      return true
    } catch (error) {
      // A 404 means the job settled before the request arrived; that is success
      // from the caller's point of view.
      if (error instanceof GitApiError && error.status === 404) return true
      return false
    }
  }
}
