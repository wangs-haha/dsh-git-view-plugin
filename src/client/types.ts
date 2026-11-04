/**
 * Shared payload types for the Git panel.
 *
 * These mirror the JSON the Host half returns; the Client half never invents a
 * shape the Host does not send.
 */

export interface GitRepo {
  id: string
  title: string
  path: string
  root: string
}

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

export interface RefEntry {
  ref: string
  name: string
  kind: 'branch' | 'remote' | 'tag'
  head: boolean
}

export interface CommitRef {
  name: string
  kind: string
  head: boolean
}

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

export interface LogPayload {
  repo: GitRepo
  scope: string
  head: { branch: string; hash: string; detached: boolean }
  refs: RefEntry[]
  commits: CommitRow[]
  state: RepoState
}

export interface TreeEntry {
  name: string
  path: string
  type: 'tree' | 'blob' | 'submodule'
  status?: string
  untracked?: boolean
  conflict?: boolean
  dirty?: boolean
}

export interface CommitFile {
  status: string
  path: string
  additions: number | null
  deletions: number | null
  binary: boolean
}

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

export interface DiffPayload {
  repo: GitRepo
  hash: string
  path: string
  text: string
  truncated: boolean
}

export type RemoteOp = 'fetch' | 'pull' | 'push'
export type RemoteState = 'running' | 'cancelling' | 'done' | 'cancelled' | 'error'

export interface RemoteSnapshot {
  id: string
  op: RemoteOp
  label: string
  state: RemoteState
  percent: number | null
  exitCode: number | null
  error: string
  lines: string[]
  startedAt: number
  endedAt: number | null
}

export interface MenuItem {
  id?: string
  label?: string
  hint?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  onSelect?: () => void
}

export type DialogKind = 'branch' | 'discard'

export interface DialogConfig {
  kind: DialogKind
  op?: string
  title: string
  description?: string
  label?: string
  input?: boolean
  initialValue?: string
  placeholder?: string
  checkboxLabel?: string
  checkboxDefault?: boolean
  confirmLabel?: string
  danger?: boolean
  entry?: StatusEntry
  payload?: Record<string, unknown>
}

/** Translator handed down by the DSH locale service. */
export type Translate = (key: string) => string

export interface GitErrorPayload {
  error?: string
  state?: RepoState
  conflict?: boolean
}
