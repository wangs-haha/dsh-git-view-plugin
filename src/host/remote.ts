/**
 * Long-running remote Git jobs (fetch / pull / push).
 *
 * {@link RemoteService} owns the job map and the child-process streaming; it
 * knows nothing about HTTP. The routes poll {@link RemoteService.snapshot} while
 * a job runs, and finished jobs stay pollable for ten minutes so the browser
 * always sees the final state, even if it was polling slowly.
 *
 * The per-repository write lock is claimed *before* the repository state is
 * read, so a concurrent checkout cannot make a push/pull run against a branch
 * the plan was not built for. A job reaches exactly one terminal state through
 * {@link RemoteService.settle}: the lock is released there, and a late close
 * event can never turn a timeout into success.
 */

import type { ChildProcess } from 'node:child_process'

import { GitData } from './data.js'
import { GitError } from './errors.js'
import { GitRunner } from './exec.js'
import { GitOps } from './ops.js'
import { assertRemoteOp, buildRemoteCommand, remoteErrorText } from './remote-command.js'
import type {
  GitRepo,
  RemoteCancelResult,
  RemoteJobSnapshot,
  RemoteOp,
  RemoteStartResult,
  RemoteState,
  WriteLock,
} from './types.js'

/** Hard cap so a stuck credential helper cannot hold the write lock forever. */
export const REMOTE_TIMEOUT_MS = 10 * 60 * 1000

/** How long an unresponsive child gets before the lock is released anyway. */
export const REMOTE_KILL_GRACE_MS = 15_000

/** How long {@link RemoteService.dispose} waits for children to exit. */
export const REMOTE_DISPOSE_WAIT_MS = 3_000

/** Finished jobs are dropped after this long. */
export const REMOTE_KEEP_MS = 10 * 60 * 1000

/** How many output lines a job keeps for polling. */
const MAX_LINES = 200

/** How many of those lines one poll returns. */
const SNAPSHOT_LINES = 40

/** One remote job request, as sent by the panel. */
export interface RemoteRequest {
  op?: unknown
  rebase?: unknown
  forceWithLease?: unknown
  tags?: unknown
}

/** Services one remote job needs. */
export interface RemoteServiceOptions {
  data: GitData
  ops: GitOps
  lock: WriteLock
  runner?: GitRunner
}

/** Internal job record; never exposed, because it holds the child process. */
interface RemoteJob {
  id: string
  op: RemoteOp
  label: string
  repo: string
  state: RemoteState
  startedAt: number
  endedAt: number | null
  percent: number | null
  exitCode: number | null
  error: string
  lines: string[]
  child: ChildProcess | null
  release: () => void
  watchdog: ReturnType<typeof setTimeout> | null
  stopTimer: ReturnType<typeof setTimeout> | null
  cancelRequested: boolean
  timeoutError: string
  settled: boolean
  done: Promise<void>
  resolveDone: () => void
}

/** Owns the fetch/pull/push job map and their child processes. */
export class RemoteService {
  private readonly jobs = new Map<string, RemoteJob>()

  private sequence = 0

  private disposing = false

  private readonly data: GitData

  private readonly ops: GitOps

  private readonly lock: WriteLock

  private readonly runner: GitRunner

  constructor(options: RemoteServiceOptions) {
    this.data = options.data
    this.ops = options.ops
    this.lock = options.lock
    this.runner = options.runner ?? new GitRunner()
  }

  /**
   * Start `git fetch|pull|push` as a job and stream its output into the job
   * record. The per-repository write lock is held from before the state read
   * until the job settles.
   * @param repo - resolved repository.
   * @param body - parsed request body (`op`, `rebase`, `forceWithLease`, `tags`).
   * @returns `{ ok, id, op, label }`.
   */
  async start(repo: GitRepo, body: RemoteRequest): Promise<RemoteStartResult> {
    if (this.disposing) throw new GitError('the Git plugin is shutting down', 503)
    const op = assertRemoteOp(body.op)
    const release = this.lock.begin(repo.root)
    let job: RemoteJob | null = null
    try {
      // Read the state and build the plan while the write slot is already held.
      const [state, remotes] = await Promise.all([this.ops.state(repo.root), this.data.remotes(repo.root)])
      const { args, label } = buildRemoteCommand(
        op,
        {
          branch: state.branch,
          upstream: state.upstream,
          upstreamRef: state.upstreamRef,
          detached: state.detached,
          remotes,
        },
        {
          rebase: body.rebase === true,
          forceWithLease: body.forceWithLease === true,
          tags: body.tags === true,
        },
      )

      this.prune()
      const id = `remote-${++this.sequence}-${Date.now().toString(36)}`
      let resolveDone: () => void = () => undefined
      const done = new Promise<void>((resolve) => {
        resolveDone = resolve
      })
      job = {
        id,
        op,
        label,
        repo: repo.root,
        state: 'running',
        startedAt: Date.now(),
        endedAt: null,
        percent: null,
        exitCode: null,
        error: '',
        lines: [],
        child: null,
        release,
        watchdog: null,
        stopTimer: null,
        cancelRequested: false,
        timeoutError: '',
        settled: false,
        done,
        resolveDone,
      }
      this.jobs.set(id, job)

      let child: ChildProcess
      try {
        child = this.runner.spawn(repo.root, args)
      } catch (error) {
        throw new GitError(error instanceof Error ? error.message : String(error), 502)
      }
      job.child = child

      const absorb = (chunk: unknown): void => {
        for (const raw of String(chunk).split(/[\r\n]+/)) {
          const line = raw.trim()
          if (!line) continue
          job!.lines.push(line)
          if (job!.lines.length > MAX_LINES) job!.lines.shift()
          const match = /(\d{1,3})%/.exec(line)
          if (match) job!.percent = Math.max(job!.percent || 0, Number(match[1]))
        }
      }
      child.stdout?.on('data', absorb)
      child.stderr?.on('data', absorb)

      const current = job
      child.on('error', (error) => {
        this.settle(current, {
          state: 'error',
          error: `无法启动 git：${error.message}`,
        })
      })
      child.on('close', () => {
        if (current.settled) return
        const exitCode = typeof child.exitCode === 'number' ? child.exitCode : null
        current.exitCode = exitCode
        if (current.cancelRequested) {
          this.settle(current, { state: 'cancelled' })
        } else if (current.timeoutError) {
          this.settle(current, { state: 'error', error: current.timeoutError })
        } else if (exitCode === 0) {
          current.percent = 100
          this.settle(current, { state: 'done' })
        } else {
          this.settle(current, { state: 'error', error: remoteErrorText(current.lines.join('\n')) })
        }
      })

      current.watchdog = setTimeout(() => {
        this.onDeadline(current)
      }, REMOTE_TIMEOUT_MS)

      return { ok: true, id, op, label }
    } catch (error) {
      if (job) this.jobs.delete(job.id)
      release()
      throw error
    }
  }

  /**
   * Ask a running remote job to stop. Re-issuing the stop request is safe: it
   * kills the child again if the first signal did not take effect.
   * @param id - job id.
   * @returns acknowledgement.
   */
  cancel(id: unknown): RemoteCancelResult {
    const job = this.jobs.get(String(id || ''))
    if (!job) throw new GitError('unknown remote job', 404)
    if (job.settled) return { ok: true, id: job.id, state: job.state }
    job.cancelRequested = true
    if (!job.timeoutError) job.state = 'cancelling'
    this.killChild(job)
    this.armForceSettle(job, 'cancelled', job.error || '网络操作取消超时（进程未响应）')
    return { ok: true, id: job.id, state: job.state }
  }

  /**
   * Read the pollable snapshot of one job.
   * @param id - job id.
   * @returns the snapshot.
   */
  snapshot(id: unknown): RemoteJobSnapshot {
    const job = this.jobs.get(String(id || ''))
    if (!job) throw new GitError('unknown remote job', 404)
    return {
      id: job.id,
      op: job.op,
      label: job.label,
      state: job.state,
      startedAt: job.startedAt,
      endedAt: job.endedAt || null,
      percent: job.percent,
      exitCode: job.exitCode,
      error: job.error || '',
      lines: job.lines.slice(-SNAPSHOT_LINES),
    }
  }

  /**
   * Stop every child, wait briefly for it to exit, then settle whatever is
   * left. Called when the plugin is disposed so no process outlives its routes.
   * @returns resolves when the jobs are settled or the wait expired.
   */
  async dispose(): Promise<void> {
    this.disposing = true
    const jobs = [...this.jobs.values()].filter((job) => !job.settled)
    if (jobs.length === 0) {
      this.jobs.clear()
      return
    }
    for (const job of jobs) this.killChild(job)
    await Promise.race([
      Promise.all(jobs.map((job) => job.done)),
      new Promise<void>((resolve) => setTimeout(resolve, REMOTE_DISPOSE_WAIT_MS)),
    ])
    for (const job of jobs) {
      this.settle(job, { state: 'cancelled', error: '插件已卸载，网络操作被取消' })
    }
    this.jobs.clear()
  }

  /**
   * Timeout handler: stop the child and bound how long the lock may wait for it.
   * @param job - running job.
   */
  private onDeadline(job: RemoteJob): void {
    if (job.settled) return
    if (job.cancelRequested) {
      this.killChild(job)
      this.armForceSettle(job, 'cancelled', job.error || '网络操作取消超时（进程未响应）')
      return
    }
    job.timeoutError = '网络操作超时（10 分钟）'
    job.state = 'cancelling'
    this.killChild(job)
    this.armForceSettle(job, 'error', job.timeoutError)
  }

  /**
   * Settle a job after the child had a grace period to exit.
   * @param job - job to settle.
   * @param fallback - terminal state used when the child never reports close.
   * @param message - error/notice attached to that state.
   */
  private armForceSettle(job: RemoteJob, fallback: RemoteState, message: string): void {
    if (job.stopTimer) return
    job.stopTimer = setTimeout(() => {
      if (job.settled) return
      this.killChild(job, 'SIGKILL')
      this.settle(job, { state: fallback, error: message })
    }, REMOTE_KILL_GRACE_MS)
  }

  /**
   * Send a termination signal without throwing when the child is already gone.
   * @param job - job whose child should stop.
   * @param signal - signal to send (default SIGTERM).
   * @returns whether the signal was delivered.
   */
  private killChild(job: RemoteJob, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    try {
      return job.child ? job.child.kill(signal) : false
    } catch {
      return false
    }
  }

  /**
   * The single terminal transition of a job: timers cleared, lock released,
   * done promise resolved. Later calls are ignored.
   * @param job - job to settle.
   * @param outcome - terminal state and optional error text.
   */
  private settle(job: RemoteJob, outcome: { state: RemoteState; error?: string }): void {
    if (job.settled) return
    job.settled = true
    if (job.watchdog) clearTimeout(job.watchdog)
    if (job.stopTimer) clearTimeout(job.stopTimer)
    job.watchdog = null
    job.stopTimer = null
    job.endedAt = Date.now()
    job.child = null
    job.state = outcome.state
    if (outcome.error !== undefined) job.error = outcome.error
    job.resolveDone()
    job.release()
  }

  /**
   * Drop finished jobs that nobody will poll anymore.
   * @returns nothing.
   */
  private prune(): void {
    const now = Date.now()
    for (const [id, job] of this.jobs) {
      if (job.settled && job.endedAt && now - job.endedAt > REMOTE_KEEP_MS) this.jobs.delete(id)
    }
  }
}
