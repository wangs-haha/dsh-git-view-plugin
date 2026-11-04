/**
 * Process plumbing for the Host half: one hardened `git` invocation path.
 *
 * Every command is spawned with an argument array — never a shell string —
 * inside the repository root it is given. Callers resolve that root from a
 * registered DSH workspace, so no user-supplied path ever reaches Git.
 */

import { execFile, spawn as spawnProcess, type ChildProcess } from 'node:child_process'

import { GitError } from './errors.js'

/** Largest stdout a single git invocation may produce (bytes). */
export const MAX_BUFFER = 24 * 1024 * 1024

/** Hard deadline for one git invocation. */
export const TIMEOUT_MS = 20_000

/** Root commits, files, messages, and diffs are clipped so one response stays renderable. */
export const LIMITS = Object.freeze({
  commits: 400,
  files: 400,
  message: 60_000,
  diff: 400_000,
})

/** Config overrides prepended to every non-streaming invocation. */
const CONFIG_ARGS = ['-c', 'core.quotepath=false', '-c', 'color.ui=false', '-c', 'core.pager=cat'] as const

/** Environment every non-streaming invocation runs with. */
const GIT_ENV: NodeJS.ProcessEnv = {
  GIT_OPTIONAL_LOCKS: '0',
  GIT_TERMINAL_PROMPT: '0',
  GIT_LITERAL_PATHSPECS: '1',
}

/**
 * Environment for streaming network commands: credentials can never prompt and
 * a stable C locale keeps progress parsing predictable.
 */
const STREAM_ENV: NodeJS.ProcessEnv = {
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  GIT_PAGER: 'cat',
  LC_ALL: 'C',
  LANG: 'C',
}

/** One captured `git` run. */
export interface GitResult {
  code: number
  stdout: string
  stderr: string
  spawnError?: NodeJS.ErrnoException
}

/** Per-call overrides for {@link GitRunner.runResult}. */
export interface GitRunOptions {
  maxBuffer?: number
  timeout?: number
}

/**
 * Build the user-facing error for one failed git invocation.
 * @param result - captured run.
 * @returns the error.
 */
export function failure(result: GitResult): GitError {
  if (result.spawnError && result.spawnError.code === 'ENOENT') {
    return new GitError('git executable not found on PATH', 503)
  }
  const detail = String(result.stderr || '').trim() || String(result.stdout || '').trim()
  const lines = detail.split(/\r?\n/).filter(Boolean).slice(-6).join('\n')
  const fallback = result.spawnError ? result.spawnError.message : 'git command failed'
  return new GitError(lines || fallback)
}

/**
 * Spawn `git` without a shell and capture its output.
 *
 * Reads use {@link GitRunner.run} so a failure throws; writes use
 * {@link GitRunner.runResult} so a conflict can be reported together with the
 * repository state it leaves behind.
 */
export class GitRunner {
  /**
   * Run git in `cwd`, returning the exit status instead of throwing.
   * @param cwd - repository root.
   * @param args - git arguments (the executable and config overrides are prepended).
   * @param options - per-call overrides.
   * @returns the captured run.
   */
  runResult(cwd: string, args: readonly string[], options: GitRunOptions = {}): Promise<GitResult> {
    return new Promise((resolve) => {
      execFile(
        'git',
        [...CONFIG_ARGS, ...args],
        {
          cwd,
          env: { ...process.env, ...GIT_ENV },
          windowsHide: true,
          timeout: options.timeout ?? TIMEOUT_MS,
          maxBuffer: options.maxBuffer ?? MAX_BUFFER,
          encoding: 'utf8',
        },
        (error, stdout, stderr) => {
          const out = String(stdout || '')
          const err = String(stderr || '')
          if (!error) {
            resolve({ code: 0, stdout: out, stderr: err })
            return
          }
          const code = typeof error.code === 'number' ? error.code : 1
          resolve({ code, stdout: out, stderr: err, spawnError: error as unknown as NodeJS.ErrnoException })
        },
      )
    })
  }

  /**
   * Run git in `cwd`, throwing {@link GitError} when it fails.
   * @param cwd - repository root.
   * @param args - git arguments (the executable is prepended).
   * @param options - per-call overrides.
   * @returns stdout.
   */
  async run(cwd: string, args: readonly string[], options: GitRunOptions = {}): Promise<string> {
    const result = await this.runResult(cwd, args, options)
    if (result.code !== 0) throw failure(result)
    return result.stdout
  }

  /**
   * Start a streaming git command whose output the caller consumes live.
   *
   * Only remote (network) commands use this: they must not buffer 24 MB of
   * progress output, and they need a stable locale.
   *
   * @param cwd - repository root.
   * @param args - git arguments (the executable is prepended).
   * @param env - extra environment entries; they win over the defaults.
   * @returns the running child process.
   */
  spawn(cwd: string, args: readonly string[], env: NodeJS.ProcessEnv = {}): ChildProcess {
    return spawnProcess('git', [...args], {
      cwd,
      env: { ...process.env, ...STREAM_ENV, ...env },
      windowsHide: true,
    })
  }
}
