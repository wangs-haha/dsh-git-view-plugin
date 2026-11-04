/**
 * Git write operations (branch lifecycle, merge, rebase, discard, history)
 * used by the Git Graph plugin.
 *
 * Like {@link GitData}, every command is spawned with an argument array — never
 * a shell string — inside a repository root resolved from a registered DSH
 * workspace. Branch names and refs are validated before they reach `git`, and
 * no argument is allowed to look like a command-line option.
 *
 * {@link GitOps} also owns the per-repository write slot ({@link RepoWriteLock}):
 * commits, branch operations, and long-running remote jobs all claim it, so two
 * writes can never interleave inside one working tree.
 */

import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'

import { GitData } from './data.js'
import { GitError } from './errors.js'
import { failure, type GitResult } from './exec.js'
import type {
  BranchOperationResult,
  CheckoutResult,
  ContinueResult,
  CreateBranchResult,
  DeleteBranchResult,
  DiscardResult,
  HistoryOperationResult,
  MergeResult,
  RefRecord,
  RenameBranchResult,
  RepoState,
  StageResult,
  WriteLock,
} from './types.js'

/** Upper bound for the human-readable output returned with one operation. */
const MAX_OUTPUT = 6000

/** Git output that means the operation stopped on a conflict. */
const CONFLICT_PATTERN =
  /CONFLICT|Automatic merge failed|Resolve all conflicts|needs merge|could not apply|error: could not apply/i

/** Characters Git forbids in a ref name (plus ASCII controls and DEL). */
const INVALID_NAME = /[\u0000-\u0020\u007f~^:?*\[\\]/

/** Git commands that resume each kind of paused operation. */
const CONTINUE_ARGS: Partial<Record<string, string[]>> = {
  merge: ['merge', '--continue'],
  rebase: ['rebase', '--continue'],
  'cherry-pick': ['cherry-pick', '--continue'],
  revert: ['revert', '--continue'],
}

/** Git commands that cancel each kind of paused operation. */
const ABORT_ARGS: Partial<Record<string, string[]>> = {
  merge: ['merge', '--abort'],
  rebase: ['rebase', '--abort'],
  'cherry-pick': ['cherry-pick', '--abort'],
  revert: ['revert', '--abort'],
  bisect: ['bisect', 'reset'],
}

/** Options for {@link GitOps.createBranch}. */
export interface CreateBranchOptions {
  name: unknown
  startRef?: unknown
  checkout?: boolean
}

/** Options for {@link GitOps.discardChanges} and {@link GitOps.rollbackChanges}. */
export interface DiscardOptions {
  deleteAdded?: boolean
}

/** Options for {@link GitOps.resolveRef}. */
interface ResolveRefOptions {
  allowHash?: boolean
}

/** A ref or commit hash the caller selected in the UI. */
interface ResolvedRef {
  ref: string
  short: string
  kind: string
  head: boolean
}

/**
 * Collect stdout and stderr into one bounded message.
 * @param result - captured run.
 * @returns display text.
 */
function outputText(result: Pick<GitResult, 'stdout' | 'stderr'>): string {
  const text = [result.stdout, result.stderr]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
  return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}\n…` : text
}

/**
 * Turn a failed write into a GitError, flagging merge/rebase conflicts so the
 * browser can refresh and show the in-progress banner.
 * @param result - captured run.
 * @param fallback - message used when git printed nothing.
 * @returns the error.
 */
export function writeFailure(result: GitResult, fallback: string): GitError {
  const text = outputText(result)
  const error = text ? failure(result) : new GitError(fallback)
  if (CONFLICT_PATTERN.test(text)) return new GitError(error.message, 409, true)
  return error
}

/**
 * Validate and normalize a branch name before it is passed to git.
 * @param value - candidate name.
 * @param label - field name used in messages.
 * @returns the trimmed name.
 */
export function assertBranchName(value: unknown, label = 'branch name'): string {
  const name = String(value ?? '').trim()
  if (!name) throw new GitError(`${label} is required`, 400)
  if (name.length > 200) throw new GitError(`${label} is too long`, 400)
  if (
    name.startsWith('-') ||
    name.startsWith('/') ||
    name.startsWith('.') ||
    name.startsWith('refs/') ||
    name.endsWith('/') ||
    name.endsWith('.') ||
    name.endsWith('.lock') ||
    name === '@' ||
    name.includes('..') ||
    name.includes('//') ||
    name.includes('@{') ||
    INVALID_NAME.test(name)
  ) {
    throw new GitError(`invalid ${label}: ${name}`, 400)
  }
  return name
}

/**
 * Validate a commit hash before it reaches git.
 * @param value - candidate hash.
 * @returns the trimmed hash.
 */
function assertCommitHash(value: unknown): string {
  const hash = String(value ?? '').trim()
  if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError('invalid commit hash', 400)
  return hash
}

/**
 * Serializes write operations per repository.
 *
 * One repository may run at most one commit, branch operation, or remote job at
 * a time; a second attempt is answered with HTTP 409 so the panel can explain
 * that another Git operation is already running.
 */
export class RepoWriteLock implements WriteLock {
  private readonly active = new Set<string>()

  /**
   * Claim the single write slot of one repository.
   * @param root - repository root.
   * @returns release callback; calling it more than once is harmless.
   */
  begin(root: string): () => void {
    if (this.active.has(root)) {
      throw new GitError('another Git operation is already running for this repository', 409)
    }
    this.active.add(root)
    let released = false
    return () => {
      if (released) return
      released = true
      this.active.delete(root)
    }
  }

  /**
   * Whether a write currently holds the slot of one repository.
   * @param root - repository root.
   * @returns true while a write is in flight.
   */
  isBusy(root: string): boolean {
    return this.active.has(root)
  }
}

/** Every write operation the panel can perform on a repository. */
export class GitOps {
  /** The write slot shared with remote jobs. */
  readonly lock = new RepoWriteLock()

  constructor(private readonly data: GitData = new GitData()) {}

  /**
   * Claim the write slot of one repository.
   * @param root - repository root.
   * @returns release callback.
   */
  beginWrite(root: string): () => void {
    return this.lock.begin(root)
  }

  /**
   * Detect the current branch, upstream tracking, ahead/behind counts, and any
   * merge/rebase/cherry-pick/revert/bisect operation left in progress.
   * @param root - repository root.
   * @returns repository state.
   */
  async state(root: string): Promise<RepoState> {
    const head = await this.data.head(root)

    let gitDir = ''
    try {
      gitDir = (await this.data.run(root, ['rev-parse', '--absolute-git-dir'])).trim()
    } catch {
      try {
        const relative = (await this.data.run(root, ['rev-parse', '--git-dir'])).trim()
        gitDir = relative ? (isAbsolute(relative) ? relative : resolve(root, relative)) : ''
      } catch {
        gitDir = ''
      }
    }
    const has = (name: string): boolean => {
      if (!gitDir) return false
      try {
        return existsSync(join(gitDir, name))
      } catch {
        return false
      }
    }

    let operation = ''
    if (has('rebase-merge') || has('rebase-apply')) operation = 'rebase'
    else if (has('MERGE_HEAD')) operation = 'merge'
    else if (has('CHERRY_PICK_HEAD')) operation = 'cherry-pick'
    else if (has('REVERT_HEAD')) operation = 'revert'
    else if (has('BISECT_LOG')) operation = 'bisect'

    let upstream = ''
    let ahead = 0
    let behind = 0
    if (head.branch) {
      try {
        upstream = (await this.data.run(root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])).trim()
        const counts = (await this.data.run(root, ['rev-list', '--left-right', '--count', '@{upstream}...HEAD']))
          .trim()
          .split(/\s+/)
        behind = Number.parseInt(counts[0], 10) || 0
        ahead = Number.parseInt(counts[1], 10) || 0
      } catch {
        upstream = ''
        ahead = 0
        behind = 0
      }
    }

    return {
      branch: head.branch,
      hash: head.hash,
      detached: head.detached,
      unborn: Boolean(head.branch && !head.hash),
      operation,
      upstream,
      ahead,
      behind,
    }
  }

  /**
   * Switch the working tree to an existing local branch.
   * @param root - repository root.
   * @param rawName - branch name.
   * @returns operation result.
   */
  async checkoutBranch(root: string, rawName: unknown): Promise<CheckoutResult> {
    const name = assertBranchName(rawName)
    const entry = await this.findLocalBranch(root, name)
    if (!entry) throw new GitError(`branch not found: ${name}`, 404)
    const head = await this.data.head(root)
    if (head.branch === entry.short) {
      return { op: 'checkout', branch: entry.short, unchanged: true, output: '' }
    }

    let result = await this.data.runResult(root, ['switch', entry.short])
    if (result.code !== 0 && /not a git command|unknown subcommand|is not a git command/i.test(result.stderr || '')) {
      result = await this.data.runResult(root, ['checkout', entry.short])
    }
    if (result.code !== 0) throw writeFailure(result, 'could not switch branches')
    return { op: 'checkout', branch: entry.short, output: outputText(result) }
  }

  /**
   * Create a local branch, optionally starting at a ref and switching to it.
   * @param root - repository root.
   * @param options - branch details.
   * @returns operation result.
   */
  async createBranch(root: string, options: CreateBranchOptions): Promise<CreateBranchResult> {
    const name = assertBranchName(options.name)
    await this.assertRefFormat(root, name)
    if (await this.findLocalBranch(root, name)) throw new GitError(`branch already exists: ${name}`, 409)
    const start = options.startRef ? (await this.resolveRef(root, options.startRef)).ref : ''
    const wantCheckout = options.checkout !== false
    const suffix = start ? [start] : []

    let result: GitResult
    if (wantCheckout) {
      result = await this.data.runResult(root, ['switch', '-c', name, ...suffix])
      if (result.code !== 0 && /not a git command|unknown subcommand|is not a git command/i.test(result.stderr || '')) {
        result = await this.data.runResult(root, ['checkout', '-b', name, ...suffix])
      }
    } else {
      result = await this.data.runResult(root, ['branch', name, ...suffix])
    }
    if (result.code !== 0) {
      if (wantCheckout) {
        // `switch -c` may create the branch before failing to check it out (for
        // example when local changes would be overwritten). Remove the branch we
        // just created so the user can retry cleanly.
        try {
          const head = await this.data.head(root)
          if (head.branch !== name && (await this.findLocalBranch(root, name))) {
            await this.data.runResult(root, ['branch', '-D', name])
          }
        } catch {
          /* best-effort cleanup */
        }
      }
      throw writeFailure(result, 'could not create the branch')
    }
    return {
      op: 'create',
      branch: name,
      startRef: start,
      checkout: wantCheckout,
      output: outputText(result),
    }
  }

  /**
   * Rename a local branch (the current branch included).
   * @param root - repository root.
   * @param rawName - existing branch name.
   * @param rawNewName - new branch name.
   * @returns operation result.
   */
  async renameBranch(root: string, rawName: unknown, rawNewName: unknown): Promise<RenameBranchResult> {
    const name = assertBranchName(rawName)
    const entry = await this.findLocalBranch(root, name)
    if (!entry) throw new GitError(`branch not found: ${name}`, 404)
    const newName = assertBranchName(rawNewName, 'new branch name')
    await this.assertRefFormat(root, newName)
    if (newName === entry.short) {
      return { op: 'rename', branch: entry.short, newName, unchanged: true, output: '' }
    }
    if (await this.findLocalBranch(root, newName)) throw new GitError(`branch already exists: ${newName}`, 409)

    const result = await this.data.runResult(root, ['branch', '-m', entry.short, newName])
    if (result.code !== 0) throw writeFailure(result, 'could not rename the branch')
    return { op: 'rename', branch: entry.short, newName, output: outputText(result) }
  }

  /**
   * Delete a local branch. The checked-out branch is never removable, and a
   * non-force delete keeps Git's "not fully merged" protection.
   * @param root - repository root.
   * @param rawName - branch name.
   * @param force - pass `-D` instead of `-d`.
   * @returns operation result.
   */
  async deleteBranch(root: string, rawName: unknown, force: boolean): Promise<DeleteBranchResult> {
    const name = assertBranchName(rawName)
    const entry = await this.findLocalBranch(root, name)
    if (!entry) throw new GitError(`branch not found: ${name}`, 404)
    const head = await this.data.head(root)
    if (head.branch === entry.short) {
      throw new GitError('cannot delete the branch that is currently checked out', 409)
    }

    const result = await this.data.runResult(root, ['branch', force === true ? '-D' : '-d', entry.short])
    if (result.code !== 0) throw writeFailure(result, 'could not delete the branch')
    return { op: 'delete', branch: entry.short, force: force === true, output: outputText(result) }
  }

  /**
   * Merge one branch, remote branch, tag, or commit into the current branch.
   * @param root - repository root.
   * @param rawRef - full ref or commit hash.
   * @returns operation result.
   */
  async mergeRef(root: string, rawRef: unknown): Promise<MergeResult> {
    const target = await this.resolveRef(root, rawRef, { allowHash: true })
    const head = await this.data.head(root)
    if (!head.branch) throw new GitError('cannot merge into a detached HEAD', 409)
    if (target.kind === 'branch' && target.short === head.branch) {
      throw new GitError('cannot merge a branch into itself', 400)
    }

    const result = await this.data.runResult(root, ['merge', '--no-edit', target.ref])
    if (result.code !== 0) throw writeFailure(result, 'merge failed')
    return {
      op: 'merge',
      branch: head.branch,
      ref: target.ref,
      target: target.short,
      output: outputText(result),
    }
  }

  /**
   * Rebase the current branch onto another branch, remote branch, tag, or commit.
   * @param root - repository root.
   * @param rawRef - full ref or commit hash.
   * @returns operation result.
   */
  async rebaseRef(root: string, rawRef: unknown): Promise<MergeResult> {
    const target = await this.resolveRef(root, rawRef, { allowHash: true })
    const head = await this.data.head(root)
    if (!head.branch) throw new GitError('cannot rebase a detached HEAD', 409)
    if (target.kind === 'branch' && target.short === head.branch) {
      throw new GitError('cannot rebase a branch onto itself', 400)
    }

    const result = await this.data.runResult(root, ['rebase', target.ref])
    if (result.code !== 0) throw writeFailure(result, 'rebase failed')
    return {
      op: 'rebase',
      branch: head.branch,
      ref: target.ref,
      target: target.short,
      output: outputText(result),
    }
  }

  /**
   * Resume a paused merge/rebase/cherry-pick/revert after conflicts were marked
   * resolved. An empty `core.editor` keeps the existing message without opening
   * an editor the browser cannot display.
   * @param root - repository root.
   * @returns operation result.
   */
  async continueOperation(root: string): Promise<ContinueResult> {
    const state = await this.state(root)
    const args = CONTINUE_ARGS[state.operation]
    if (!args) throw new GitError('no paused Git operation can be continued', 409)

    const result = await this.data.runResult(root, ['-c', 'core.editor=true', ...args])
    if (result.code !== 0) throw writeFailure(result, `could not continue the ${state.operation}`)
    return { op: 'continue', operation: state.operation, output: outputText(result) }
  }

  /**
   * Cancel a paused merge/rebase/cherry-pick/revert/bisect.
   * @param root - repository root.
   * @returns operation result.
   */
  async abortOperation(root: string): Promise<ContinueResult> {
    const state = await this.state(root)
    const args = ABORT_ARGS[state.operation]
    if (!args) throw new GitError('no paused Git operation can be aborted', 409)

    const result = await this.data.runResult(root, args)
    if (result.code !== 0) throw writeFailure(result, `could not abort the ${state.operation}`)
    return { op: 'abort', operation: state.operation, output: outputText(result) }
  }

  /**
   * Discard working-tree changes for specific files, choosing the safe command
   * for each Git state:
   *
   * - untracked files are removed with `git clean -f`;
   * - files newly added to the index are removed from the index and worktree;
   * - tracked modifications, deletions, renames, and conflicted files are
   *   restored from HEAD in both the index and the worktree.
   *
   * @param root - repository root.
   * @param rawPaths - repository-relative files the user confirmed.
   * @param options - keep newly added files on disk when `deleteAdded` is false.
   * @returns operation result.
   */
  async discardChanges(root: string, rawPaths: unknown[], options: DiscardOptions = {}): Promise<DiscardResult> {
    const deleteAdded = options.deleteAdded !== false
    const requested = [
      ...new Set((Array.isArray(rawPaths) ? rawPaths : []).map((value) => String(value || '').trim()).filter(Boolean)),
    ]
    if (requested.length === 0) throw new GitError('select at least one changed file', 400)
    if (requested.length > 200) throw new GitError('too many files in one operation', 400)

    const entries = await this.data.status(root)
    const byPath = new Map(entries.map((entry) => [entry.path, entry]))
    const found = requested.map((path) => byPath.get(path)).filter((entry) => entry !== undefined)
    if (found.length === 0) throw new GitError('the selected files have no changes', 422)

    const untracked: string[] = []
    const added: string[] = []
    const keepAdded: string[] = []
    const tracked: string[] = []
    const addedCandidates = found.filter((entry) => !entry.untracked && !entry.conflict && entry.x === 'A')
    const headFiles = new Set<string>()
    if (addedCandidates.length > 0) {
      // A path can be staged as `A` after being deleted and re-added even though
      // HEAD still tracks it; only truly new paths may be removed from disk.
      const result = await this.data.runResult(root, [
        'ls-tree',
        '-r',
        '--name-only',
        '-z',
        'HEAD',
        '--',
        ...addedCandidates.map((entry) => entry.path),
      ])
      if (result.code === 0) {
        for (const name of result.stdout.split('\0')) {
          if (name) headFiles.add(name)
        }
      }
    }
    for (const entry of found) {
      if (entry.conflict) tracked.push(entry.path)
      else if (entry.untracked) {
        // Keeping local copies leaves untracked files untouched.
        if (deleteAdded) untracked.push(entry.path)
      } else if (entry.x === 'A' && !headFiles.has(entry.path)) {
        if (deleteAdded) added.push(entry.path)
        else keepAdded.push(entry.path)
      } else tracked.push(entry.path)
    }

    const outputs: string[] = []
    const run = async (args: string[], fallback: string): Promise<void> => {
      const result = await this.data.runResult(root, args)
      if (result.code !== 0) throw writeFailure(result, fallback)
      const text = outputText(result)
      if (text) outputs.push(text)
    }

    if (untracked.length > 0) {
      await run(['clean', '-f', '--', ...untracked], 'could not remove untracked files')
    }
    if (added.length > 0) {
      await run(['rm', '-f', '--ignore-unmatch', '--', ...added], 'could not remove added files')
    }
    if (keepAdded.length > 0) {
      // Unstage the new files but leave them on disk as untracked content.
      await run(['rm', '--cached', '-r', '-q', '--ignore-unmatch', '--', ...keepAdded], 'could not unstage the added files')
    }
    if (tracked.length > 0) {
      let result = await this.data.runResult(root, [
        'restore',
        '--source=HEAD',
        '--staged',
        '--worktree',
        '--',
        ...tracked,
      ])
      if (result.code !== 0 && /not a git command|unknown subcommand|is not a git command/i.test(result.stderr || '')) {
        result = await this.data.runResult(root, ['checkout', 'HEAD', '--', ...tracked])
      }
      if (result.code !== 0) throw writeFailure(result, 'could not restore files')
      const text = outputText(result)
      if (text) outputs.push(text)
    }

    return {
      op: 'discard',
      count: found.length,
      paths: found.map((entry) => entry.path),
      kept: keepAdded,
      output: outputs.join('\n'),
    }
  }

  /**
   * Roll back a multi-file selection, with IDEA's "delete local copies of added
   * files" option: when it is off, newly added files are only unstaged.
   * @param root - repository root.
   * @param rawPaths - repository-relative files to roll back.
   * @param options - whether new files are removed from disk.
   * @returns operation result.
   */
  async rollbackChanges(root: string, rawPaths: unknown[], options: DiscardOptions = {}): Promise<DiscardResult> {
    const result = await this.discardChanges(root, rawPaths, options)
    return { ...result, op: 'rollback' }
  }

  /**
   * Commit-level operations offered from the details pane: undo the last commit,
   * reset to a commit, revert it, cherry-pick it, or check it out detached.
   * Merge commits are refused for undo/revert/cherry-pick because they need a
   * mainline parent the panel cannot choose for the user.
   * @param root - repository root.
   * @param params - `op`, `hash`, optional `mode`.
   * @returns operation result.
   */
  async commitHistoryOperation(root: string, params: Record<string, unknown> = {}): Promise<HistoryOperationResult> {
    const op = String(params.op || '')
    if (op === 'undo') {
      const head = await this.data.head(root)
      if (!head.hash) throw new GitError('the repository has no commits', 422)
      const parents = await this.resolveParents(root, 'HEAD')
      if (parents.length > 1) throw new GitError('cannot undo a merge commit — revert it instead', 409)
      if (parents.length === 0) {
        // The root commit has no parent: drop the branch pointer, keep the files.
        const output = await this.runWrite(root, ['update-ref', '-d', 'HEAD'], 'could not undo the first commit')
        return { op: 'undo', from: head.hash, to: null, output }
      }
      const output = await this.runWrite(root, ['reset', '--soft', parents[0], '--'], 'could not undo the last commit')
      return { op: 'undo', from: head.hash, to: parents[0], output }
    }

    const hash = assertCommitHash(params.hash)
    // rev-list validates the revision; an unknown hash throws before any write.
    const parents = await this.resolveParents(root, hash)
    const merge = parents.length > 1
    if (op === 'reset') {
      const mode = ['soft', 'mixed', 'hard'].includes(String(params.mode)) ? String(params.mode) : 'mixed'
      const output = await this.runWrite(root, ['reset', `--${mode}`, hash, '--'], 'could not reset to that commit')
      return { op: 'reset', mode, hash, output }
    }
    if (op === 'revert') {
      if (merge) throw new GitError('reverting a merge commit is not supported here', 409)
      const output = await this.runWrite(root, ['revert', '--no-edit', '--', hash], 'could not revert that commit')
      return { op: 'revert', hash, output }
    }
    if (op === 'cherryPick') {
      if (merge) throw new GitError('cherry-picking a merge commit is not supported here', 409)
      const output = await this.runWrite(root, ['cherry-pick', '--', hash], 'could not cherry-pick that commit')
      return { op: 'cherryPick', hash, output }
    }
    if (op === 'checkout') {
      const output = await this.runWrite(root, ['switch', '--detach', hash], 'could not check out that commit')
      return { op: 'checkout', hash, output }
    }
    throw new GitError('unknown history operation', 404)
  }

  /**
   * Mark conflicted files as resolved by staging them, so a paused merge/rebase
   * can continue. Only paths that are currently unmerged are accepted.
   * @param root - repository root.
   * @param rawPaths - repository-relative conflicted files.
   * @returns operation result.
   */
  async stageResolvedPaths(root: string, rawPaths: unknown[]): Promise<StageResult> {
    const requested = [
      ...new Set((Array.isArray(rawPaths) ? rawPaths : []).map((value) => String(value || '').trim()).filter(Boolean)),
    ]
    if (requested.length === 0) throw new GitError('select at least one conflicted file', 400)
    if (requested.length > 200) throw new GitError('too many files in one operation', 400)

    const entries = await this.data.status(root)
    const conflicted = new Set(entries.filter((entry) => entry.conflict).map((entry) => entry.path))
    const paths = requested.filter((path) => conflicted.has(path))
    if (paths.length === 0) throw new GitError('the selected files are not in conflict', 422)

    const result = await this.data.runResult(root, ['add', '-A', '--', ...paths])
    if (result.code !== 0) throw writeFailure(result, 'could not stage the resolved files')
    return {
      op: 'stage',
      count: paths.length,
      paths,
      output: outputText(result),
    }
  }

  /**
   * Dispatch one branch operation requested by the browser.
   * @param root - repository root.
   * @param op - operation name.
   * @param params - validated body fields.
   * @returns operation result.
   */
  async runBranchOperation(
    root: string,
    op: string,
    params: Record<string, unknown> = {},
  ): Promise<BranchOperationResult> {
    switch (String(op || '')) {
      case 'checkout':
        return this.checkoutBranch(root, params.branch)
      case 'create':
        return this.createBranch(root, {
          name: params.name ?? params.branch,
          startRef: params.startRef,
          checkout: params.checkout !== false,
        })
      case 'rename':
        return this.renameBranch(root, params.branch, params.newName)
      case 'delete':
        return this.deleteBranch(root, params.branch, params.force === true)
      case 'merge':
        return this.mergeRef(root, params.ref)
      case 'rebase':
        return this.rebaseRef(root, params.ref)
      case 'continue':
        return this.continueOperation(root)
      case 'abort':
        return this.abortOperation(root)
      default:
        throw new GitError('unknown branch operation', 404)
    }
  }

  /**
   * Ask git itself whether a branch name is well formed.
   * @param root - repository root.
   * @param name - candidate name.
   * @returns resolves when accepted.
   */
  private async assertRefFormat(root: string, name: string): Promise<void> {
    const result = await this.data.runResult(root, ['check-ref-format', '--branch', name])
    if (result.code !== 0) throw new GitError(`invalid branch name: ${name}`, 400)
  }

  /**
   * Find one local branch by short or full name.
   * @param root - repository root.
   * @param name - short or full branch name.
   * @returns the matching ref entry, or null.
   */
  private async findLocalBranch(root: string, name: string): Promise<RefRecord | null> {
    const full = name.startsWith('refs/heads/') ? name : `refs/heads/${name}`
    const refs = await this.data.refs(root)
    return refs.find((entry) => entry.kind === 'branch' && entry.ref === full) || null
  }

  /**
   * Resolve a full ref (or, optionally, a commit hash) the caller selected in the
   * UI. Refs must be exact catalogue entries; revisions such as `--all` or
   * `HEAD~1` are rejected.
   * @param root - repository root.
   * @param raw - full ref or hash.
   * @param options - whether abbreviated hashes are accepted.
   * @returns resolved ref.
   */
  private async resolveRef(root: string, raw: unknown, options: ResolveRefOptions = {}): Promise<ResolvedRef> {
    const value = String(raw ?? '').trim()
    if (!value || value.startsWith('-')) throw new GitError('invalid ref', 400)
    const refs = await this.data.refs(root)
    const exact = refs.find((entry) => entry.ref === value)
    if (exact) return exact
    if (options.allowHash && /^[0-9a-f]{4,64}$/i.test(value)) {
      const result = await this.data.runResult(root, ['rev-parse', '--verify', '--quiet', `${value}^{commit}`])
      if (result.code === 0) return { ref: value, short: value.slice(0, 7), kind: 'commit', head: false }
      throw new GitError(`unknown revision: ${value}`, 404)
    }
    throw new GitError(`unknown ref: ${value}`, 404)
  }

  /**
   * Run one write command and return its bounded output.
   * @param root - repository root.
   * @param args - git arguments.
   * @param fallback - message used when git printed nothing.
   * @returns output text.
   */
  private async runWrite(root: string, args: string[], fallback: string): Promise<string> {
    const result = await this.data.runResult(root, args)
    if (result.code !== 0) throw writeFailure(result, fallback)
    return outputText(result)
  }

  /**
   * Parents of one commit, from `rev-list --parents`.
   * @param root - repository root.
   * @param ref - commit-ish.
   * @returns parent hashes.
   */
  private async resolveParents(root: string, ref: string): Promise<string[]> {
    const out = await this.data.run(root, ['rev-list', '--parents', '-n', '1', ref, '--'])
    const parts = out.trim().split(/\s+/).filter(Boolean)
    return parts.slice(1)
  }
}
