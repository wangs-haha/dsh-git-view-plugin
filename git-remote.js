/**
 * Remote Git operations (fetch / pull / push) for the Git Graph plugin.
 *
 * Long-running network commands are started by the Host as a job: this module
 * only builds and validates the argument vector, so the panel can show progress
 * while `git` streams its output.
 */

import { GitError } from './git-data.js'

/** Remote operations the panel exposes. */
export const REMOTE_OPS = Object.freeze(['fetch', 'pull', 'push'])

/**
 * Reject anything that is not one of the supported remote operations.
 * @param {unknown} value - requested operation.
 * @returns {'fetch'|'pull'|'push'} the operation.
 */
export function assertRemoteOp(value) {
  const op = String(value || '').trim()
  if (!REMOTE_OPS.includes(op)) throw new GitError('unknown remote operation', 404)
  return op
}

/**
 * Reject a name that git would read as an option.
 * @param {string} value - candidate.
 * @param {string} label - field name for the error.
 * @returns {string} the trimmed value.
 */
function assertSafeArg(value, label) {
  const text = String(value || '').trim()
  if (!text || text.startsWith('-')) throw new GitError(`invalid ${label}`, 400)
  return text
}

/**
 * Build the `git` argument vector for one remote operation.
 *
 * - fetch updates every remote with `--prune`;
 * - pull merges (`--no-rebase --ff`) or rebases depending on `options.rebase`;
 * - push uses the upstream when there is one, otherwise sets it on the chosen
 *   remote; `--force-with-lease` is only ever passed when the user asked for it.
 *
 * @param {'fetch'|'pull'|'push'} op - operation.
 * @param {{ branch?: string, upstream?: string, detached?: boolean, remotes?: string[] }} context - repository state.
 * @param {{ rebase?: boolean, forceWithLease?: boolean, tags?: boolean }} [options] - user choices.
 * @returns {{ args: string[], label: string }} the command.
 */
export function buildRemoteCommand(op, context = {}, options = {}) {
  const branch = String(context.branch || '').trim()
  const upstream = String(context.upstream || '').trim()
  const remotes = Array.isArray(context.remotes) ? context.remotes.filter((name) => typeof name === 'string' && name) : []

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
    if (!upstream) {
      const remote = remotes.includes('origin') ? 'origin' : remotes[0]
      const name = assertSafeArg(branch || 'HEAD', 'branch name')
      args.push('--set-upstream', remote, name)
    }
    return { args, label: upstream ? `push ${upstream}` : `push ${remotes.includes('origin') ? 'origin' : remotes[0]}` }
  }

  throw new GitError('unknown remote operation', 404)
}

/**
 * Turn git's credential failures into an actionable message for the panel.
 * @param {string} text - collected output.
 * @returns {string} the message to show.
 */
export function remoteErrorText(text) {
  const raw = String(text || '').trim()
  const last = raw.split(/\r?\n/).filter(Boolean).slice(-4).join('\n')
  if (/could not read Username|terminal prompts disabled|Authentication failed|Permission denied \(publickey\)|fatal: could not read Password/i.test(raw)) {
    return `${last}\n凭据缺失：请先在终端完成一次 git 认证，或配置 credential helper / SSH key 后重试。`
  }
  return last || 'git remote operation failed'
}
