/**
 * Shared payload and service contracts for the Host half of the plugin.
 *
 * Every payload interface mirrors JSON the routes return; every service
 * interface describes the minimal slice of a DSH service the Host consumes, so
 * the port stays testable without the full Cordis runtime. The Client half keeps
 * its own copy of the payload types: the two halves are bundled separately and
 * never share a runtime import.
 */

/** A registered DSH workspace as the plugin sees it. */
export interface WorkspaceEntry {
  id: string
  title: string
  path: string
}

/** The workspace registry service (`ctx.workspaceRegistry`). */
export interface WorkspaceRegistry {
  list(): WorkspaceEntry[]
}

/** A repository the panel can serve. */
export interface GitRepo {
  id: string
  title: string
  path: string
  root: string
}

/** A cached workspace → repository resolution. */
export interface RepoRecord extends GitRepo {
  expires: number
}

/** Kinds of refs the panel lists. */
export type RefKind = 'branch' | 'remote' | 'tag'

/** One entry of the ref catalogue, including the commit it points at. */
export interface RefRecord {
  ref: string
  short: string
  kind: RefKind
  head: boolean
  target: string
}

/** A ref name as the browser branch selector sees it. */
export interface RefEntry {
  ref: string
  name: string
  kind: RefKind
  head: boolean
}

/** A ref pointing at one commit row. */
export interface CommitRef {
  name: string
  kind: string
  head: boolean
}

/** Current branch and HEAD commit. */
export interface HeadInfo {
  branch: string
  hash: string
  detached: boolean
}

/** Branch, upstream, and in-progress operation state of one repository. */
export interface RepoState {
  branch: string
  hash: string
  detached: boolean
  unborn: boolean
  operation: string
  upstream: string
  ahead: number
  behind: number
}

/** One changed working-tree entry. */
export interface StatusEntry {
  path: string
  status: string
  x: string
  y: string
  untracked: boolean
  staged: boolean
  unstaged: boolean
  conflict: boolean
}

/** One child of a directory, either from a commit tree or from the working tree. */
export interface TreeEntry {
  name: string
  path: string
  type: 'tree' | 'blob' | 'submodule'
  status?: string
  untracked?: boolean
  conflict?: boolean
  dirty?: boolean
}

/** One row of the commit graph. */
export interface CommitRow {
  hash: string
  parents: string[]
  author: string
  email: string
  date: string
  committer: string
  committerEmail: string
  commitDate: string
  subject: string
  refs: CommitRef[]
}

/** Commit list plus the ref catalogue a branch selector needs. */
export interface LogData {
  head: HeadInfo
  refs: RefEntry[]
  commits: CommitRow[]
}

/** One changed file inside a commit. */
export interface CommitFile {
  status: string
  path: string
  additions: number | null
  deletions: number | null
  binary: boolean
}

/** Metadata and changed files of one commit. */
export interface CommitDetails {
  hash: string
  shortHash: string
  parents: string[]
  author: { name: string; email: string }
  date: string
  committer: { name: string; email: string }
  commitDate: string
  subject: string
  message: string
  files: CommitFile[]
  scope: string
}

/** One file's diff within a commit. */
export interface DiffData {
  path: string
  text: string
  truncated: boolean
}

/** A committed revision. */
export interface CommitResult {
  hash: string
  message: string
  output: string
}

/** Remote operations the panel exposes. */
export type RemoteOp = 'fetch' | 'pull' | 'push'

/** Lifecycle of one remote job. */
export type RemoteState = 'running' | 'cancelling' | 'done' | 'cancelled' | 'error'

/** Detached, pollable view of one remote job. */
export interface RemoteJobSnapshot {
  id: string
  op: RemoteOp
  label: string
  state: RemoteState
  startedAt: number
  endedAt: number | null
  percent: number | null
  exitCode: number | null
  error: string
  lines: string[]
}

/** Acknowledgement of a started remote job. */
export interface RemoteStartResult {
  ok: true
  id: string
  op: RemoteOp
  label: string
}

/** Acknowledgement of a cancelled (or already settled) remote job. */
export interface RemoteCancelResult {
  ok: true
  id: string
  state: RemoteState
}

/** Result of switching to an existing branch. */
export interface CheckoutResult {
  op: 'checkout'
  branch: string
  output: string
  unchanged?: boolean
}

/** Result of creating a branch. */
export interface CreateBranchResult {
  op: 'create'
  branch: string
  startRef: string
  checkout: boolean
  output: string
}

/** Result of renaming a branch. */
export interface RenameBranchResult {
  op: 'rename'
  branch: string
  newName: string
  output: string
  unchanged?: boolean
}

/** Result of deleting a branch. */
export interface DeleteBranchResult {
  op: 'delete'
  branch: string
  force: boolean
  output: string
}

/** Result of a merge or rebase. */
export interface MergeResult {
  op: 'merge' | 'rebase'
  branch: string
  ref: string
  target: string
  output: string
}

/** Result of continuing or aborting a paused operation. */
export interface ContinueResult {
  op: 'continue' | 'abort'
  operation: string
  output: string
}

/** Result of discarding or rolling back working-tree changes. */
export interface DiscardResult {
  op: 'discard' | 'rollback'
  count: number
  paths: string[]
  kept: string[]
  output: string
}

/** Result of staging conflicted files after they were resolved. */
export interface StageResult {
  op: 'stage'
  count: number
  paths: string[]
  output: string
}

/** Result of undoing the last commit. */
export interface HistoryUndoResult {
  op: 'undo'
  from: string
  to: string | null
  output: string
}

/** Result of resetting to a commit. */
export interface HistoryResetResult {
  op: 'reset'
  mode: string
  hash: string
  output: string
}

/** Result of reverting, cherry-picking, or checking out one commit. */
export interface HistoryTargetResult {
  op: 'revert' | 'cherryPick' | 'checkout'
  hash: string
  output: string
}

/** Any branch/merge/rebase result. */
export type BranchOperationResult =
  | CheckoutResult
  | CreateBranchResult
  | RenameBranchResult
  | DeleteBranchResult
  | MergeResult
  | ContinueResult

/** Any commit-level history result. */
export type HistoryOperationResult = HistoryUndoResult | HistoryResetResult | HistoryTargetResult

/** The per-repository write slot shared by commits, branch operations, and remote jobs. */
export interface WriteLock {
  /**
   * Claim the single write slot of one repository.
   * @param root - repository root.
   * @returns release callback; calling it more than once is harmless.
   */
  begin(root: string): () => void
}

/** Minimal logger surface the Host uses (`ctx.logger`). */
export interface Logger {
  warn?(message: string): void
}

/** Lazy lookup for mounted DSH services (`ctx.get`). */
export interface ServiceAccessor {
  get(name: string): unknown
}

/** The provider/model pair a commit message is drafted with. */
export interface LlmSelection {
  provider: string
  model: string
  reasoningEffort?: string
}

/** Minimal LLM service surface used to draft a commit message. */
export interface LlmService {
  stream(options: Record<string, unknown>): AsyncIterable<unknown>
}

/** Minimal default-model service surface (`ctx.get('agentDefaultModel')`). */
export interface DefaultModelService {
  currentSelection(): unknown
}
