/**
 * Pure argument builder for remote Git operations (fetch / pull / push).
 *
 * Long-running network commands are started by {@link RemoteService}: this
 * module only validates the request and builds the argument vector, so the
 * panel can show progress while `git` streams its output.
 */

import { GitError } from './errors.js'
import type { RemoteOp } from './types.js'

/** Remote operations the panel exposes. */
export const REMOTE_OPS = Object.freeze(['fetch', 'pull', 'push'] as const)

/** Repository context one command is built from. */
export interface RemoteContext {
  branch?: string
  upstream?: string
  /** Full upstream ref (`refs/remotes/<remote>/<branch>`), when known. */
  upstreamRef?: string
  detached?: boolean
  remotes?: string[]
}

/** User choices for one remote command. */
export interface RemoteOptions {
  rebase?: boolean
  forceWithLease?: boolean
  tags?: boolean
}

/** One built remote command. */
export interface RemoteCommand {
  args: string[]
  label: string
}

/**
 * Reject anything that is not one of the supported remote operations.
 * @param value - requested operation.
 * @returns the operation.
 */
export function assertRemoteOp(value: unknown): RemoteOp {
  const op = String(value || '').trim()
  if (!(REMOTE_OPS as readonly string[]).includes(op)) throw new GitError('unknown remote operation', 404)
  return op as RemoteOp
}

/**
 * Reject a name that git would read as an option.
 * @param value - candidate.
 * @param label - field name for the error.
 * @returns the trimmed value.
 */
function assertSafeArg(value: string, label: string): string {
  const text = String(value || '').trim()
  if (!text || text.startsWith('-')) throw new GitError(`invalid ${label}`, 400)
  return text
}

/**
 * Split a full upstream ref into its remote and branch.
 * @param upstreamRef - `refs/remotes/<remote>/<branch>`, or ''.
 * @param remotes - configured remote names.
 * @returns the target, or null when the ref does not name a known remote.
 */
function parseUpstream(upstreamRef: string, remotes: string[]): { remote: string; branch: string } | null {
  const prefix = 'refs/remotes/'
  if (!upstreamRef.startsWith(prefix)) return null
  const rest = upstreamRef.slice(prefix.length)
  const matches = remotes
    .filter((remote) => rest.startsWith(`${remote}/`))
    .sort((a, b) => b.length - a.length)
  for (const remote of matches) {
    const branch = rest.slice(remote.length + 1)
    if (branch && branch !== 'HEAD') return { remote, branch }
  }
  return null
}

/**
 * Build the `git` argument vector for one remote operation.
 *
 * - fetch updates every remote with `--prune`;
 * - pull merges (`--no-rebase --ff`) or rebases depending on `options.rebase`;
 * - push always names the remote and exactly one destination ref, so
 *   `push.default=matching` or a `remote.<name>.push` setting cannot publish
 *   other branches behind the user's back; `--force-with-lease` is only ever
 *   passed when the user asked for it.
 *
 * @param op - operation.
 * @param context - repository state.
 * @param options - user choices.
 * @returns the command.
 */
export function buildRemoteCommand(
  op: RemoteOp,
  context: RemoteContext = {},
  options: RemoteOptions = {},
): RemoteCommand {
  const branch = String(context.branch || '').trim()
  const upstream = String(context.upstream || '').trim()
  const upstreamRef = String(context.upstreamRef || '').trim()
  const remotes = Array.isArray(context.remotes)
    ? context.remotes.filter((name) => typeof name === 'string' && name)
    : []

  if (op === 'fetch') {
    return { args: ['fetch', '--all', '--prune', '--progress'], label: 'fetch' }
  }

  if (op === 'pull') {
    if (context.detached) throw new GitError('cannot pull while HEAD is detached', 409)
    if (!upstream) throw new GitError('the current branch has no upstream — push it first', 409)
    const strategy = options.rebase ? '--rebase' : '--no-rebase'
    return { args: ['pull', '--progress', strategy, '--ff'], label: `pull ${upstream}` }
  }

  if (op === 'push') {
    if (context.detached) throw new GitError('cannot push while HEAD is detached', 409)
    if (remotes.length === 0) throw new GitError('no remote is configured for this repository', 409)
    const args = ['push', '--progress']
    if (options.forceWithLease) args.push('--force-with-lease')
    if (options.tags) args.push('--follow-tags')
    if (upstream) {
      const target = parseUpstream(upstreamRef, remotes)
      if (!target) {
        throw new GitError(
          'cannot determine the upstream remote — push once from a terminal to repair the tracking ref',
          409,
        )
      }
      // `HEAD:refs/heads/<branch>` updates exactly the tracked branch.
      args.push(target.remote, `HEAD:refs/heads/${target.branch}`)
      return { args, label: `push ${target.remote}/${target.branch}` }
    }
    const remote = remotes.includes('origin') ? 'origin' : remotes[0]
    const name = assertSafeArg(branch || 'HEAD', 'branch name')
    args.push('--set-upstream', remote, name)
    return { args, label: `push ${remote}/${name}` }
  }

  throw new GitError('unknown remote operation', 404)
}

/**
 * Turn git's credential failures into an actionable message for the panel.
 * @param text - collected output.
 * @returns the message to show.
 */
export function remoteErrorText(text: string): string {
  const raw = String(text || '').trim()
  const last = raw.split(/\r?\n/).filter(Boolean).slice(-4).join('\n')
  if (
    /could not read Username|terminal prompts disabled|Authentication failed|Permission denied \(publickey\)|fatal: could not read Password/i.test(
      raw,
    )
  ) {
    return `${last}\n凭据缺失：请先在终端完成一次 git 认证，或配置 credential helper / SSH key 后重试。`
  }
  return last || 'git remote operation failed'
}

/** Object-style facade over the pure builders, for callers that prefer one handle. */
export const RemoteCommandBuilder = Object.freeze({
  assertOp: assertRemoteOp,
  build: buildRemoteCommand,
  errorText: remoteErrorText,
})
