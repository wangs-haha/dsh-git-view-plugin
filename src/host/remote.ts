/**
 * Long-running remote Git jobs (fetch / pull / push).
 *
 * {@link RemoteService} owns the job map and the child-process streaming; it
 * knows nothing about HTTP. The routes poll {@link RemoteService.snapshot} while
 * a job runs, and finished jobs stay pollable for ten minutes so the browser
 * always sees the final state, even if it was polling slowly.
 *
 * The per-repository write lock is held for the whole life of a job, so a commit
 * can never race a fetch that is rewriting the index.
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
  timer: ReturnType<typeof setTimeout> | null
}

/** Owns the fetch/pull/push job map and their child processes. */
export class RemoteService {
  private readonly jobs = new Map<string, RemoteJob>()

  private sequence = 0

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
   * record. The per-repository write lock is held until the job settles.
   * @param repo - resolved repository.
   * @param body - parsed request body (`op`, `rebase`, `forceWithLease`, `tags`).
   * @returns `{ ok, id, op, label }`.
   */
  async start(repo: GitRepo, body: RemoteRequest): Promise<RemoteStartResult> {
    const op = assertRemoteOp(body.op)
    const [state, remotes] = await Promise.all([this.ops.state(repo.root), this.data.remotes(repo.root)])
    const { args, label } = buildRemoteCommand(
      op,
      {
        branch: state.branch,
        upstream: state.upstream,
        detached: state.detached,
        remotes,
      },
      {
        rebase: body.rebase === true,
        forceWithLease: body.forceWithLease === true,
        tags: body.tags === true,
      },
    )

    const release = this.lock.begin(repo.root)
    this.prune()
    const id = `remote-${++this.sequence}-${Date.now().toString(36)}`
    const job: RemoteJob = {
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
      timer: null,
    }
    this.jobs.set(id, job)

    let child: ChildProcess
    try {
      child = this.runner.spawn(repo.root, args)
    } catch (error) {
      release()
      this.jobs.delete(id)
      throw new GitError(error instanceof Error ? error.message : String(error), 502)
    }
    job.child = child

    const absorb = (chunk: unknown): void => {
      for (const raw of String(chunk).split(/[\r\n]+/)) {
        const line = raw.trim()
        if (!line) continue
        job.lines.push(line)
        if (job.lines.length > MAX_LINES) job.lines.shift()
        const match = /(\d{1,3})%/.exec(line)
        if (match) job.percent = Math.max(job.percent || 0, Number(match[1]))
      }
    }
    child.stdout?.on('data', absorb)
    child.stderr?.on('data', absorb)

    let settled = false
    const settle = (spawnError: Error | null): void => {
      if (settled) return
      settled = true
      if (job.timer) clearTimeout(job.timer)
      job.endedAt = Date.now()
      job.exitCode = typeof child.exitCode === 'number' ? child.exitCode : null
      if (spawnError) {
        job.state = 'error'
        job.error = `无法启动 git：${spawnError.message}`
      } else if (job.state === 'cancelling') {
        job.state = 'cancelled'
      } else if (job.exitCode === 0) {
        job.state = 'done'
        job.percent = 100
      } else {
        job.state = 'error'
        job.error = remoteErrorText(job.lines.join('\n'))
      }
      job.child = null
      release()
    }
    child.on('error', (error) => settle(error))
    child.on('close', () => settle(null))
    job.timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* already gone */
      }
      job.error = '网络操作超时（10 分钟）'
      job.state = 'error'
    }, REMOTE_TIMEOUT_MS)

    return { ok: true, id, op, label }
  }

  /**
   * Ask a running remote job to stop.
   * @param id - job id.
   * @returns acknowledgement.
   */
  cancel(id: unknown): RemoteCancelResult {
    const job = this.jobs.get(String(id || ''))
    if (!job) throw new GitError('unknown remote job', 404)
    if (job.state !== 'running') return { ok: true, id: job.id, state: job.state }
    job.state = 'cancelling'
    try {
      job.child?.kill()
    } catch {
      /* already gone */
    }
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
   * Drop finished jobs that nobody will poll anymore.
   * @returns nothing.
   */
  private prune(): void {
    const now = Date.now()
    for (const [id, job] of this.jobs) {
      if (job.endedAt && now - job.endedAt > REMOTE_KEEP_MS) this.jobs.delete(id)
    }
  }
}
