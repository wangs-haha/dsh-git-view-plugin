/**
 * One normalization point for every caught value in the panel.
 *
 * The UI never prints a raw `unknown`: this module turns a `GitApiError`, a
 * `TypeError` from `fetch`, an abort, or anything else into a stable title
 * class, a short message and a copyable technical detail block.
 */
import { GitApiError, errorText, isAbort } from './api.js'

export type ErrorKind = 'abort' | 'network' | 'auth' | 'conflict' | 'git' | 'unknown'

export interface ErrorInfo {
  kind: ErrorKind
  message: string
  detail: string
  status: number | null
}

/** Longest detail block the banner will copy; stacks can be huge in a bundle. */
const MAX_DETAIL = 4000

function clampDetail(text: string): string {
  return text.length > MAX_DETAIL ? `${text.slice(0, MAX_DETAIL)}\n…` : text
}

function stackOf(error: unknown): string {
  if (error instanceof Error && error.stack) return error.stack
  return ''
}

/**
 * Normalize one caught value.
 * @param error - value thrown by fetch, the API client, or plugin code.
 * @returns the display kind, message, and copyable detail.
 */
export function normalizeError(error: unknown): ErrorInfo {
  if (isAbort(error)) {
    return { kind: 'abort', message: '', detail: '', status: null }
  }
  if (error instanceof GitApiError) {
    const kind: ErrorKind =
      error.status === 401 || error.status === 403
        ? 'auth'
        : error.conflict
          ? 'conflict'
          : 'git'
    const detail = [`HTTP ${error.status}`, error.conflict ? 'conflict=true' : '', stackOf(error)]
      .filter(Boolean)
      .join('\n')
    return { kind, message: error.message || `HTTP ${error.status}`, detail: clampDetail(detail), status: error.status }
  }
  if (error instanceof TypeError && /fetch|network|load failed|failed to fetch/i.test(error.message)) {
    return {
      kind: 'network',
      message: error.message,
      detail: clampDetail(stackOf(error) || error.message),
      status: null,
    }
  }
  const message = errorText(error) || String(error)
  return {
    kind: 'unknown',
    message,
    detail: clampDetail([message, stackOf(error)].filter(Boolean).join('\n')),
    status: null,
  }
}

/**
 * Whether a window-level error belongs to this plugin. The bundle URL carries
 * the package id, so renderer stacks and resource URLs are enough to tell our
 * errors apart from the host's and other plugins'.
 * @param value - an `Error`, `ErrorEvent.message`, or resource URL.
 * @returns true when the text names this package.
 */
export function isPluginError(value: unknown): boolean {
  const text =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? `${value.message}\n${value.stack || ''}`
        : String(value)
  return /@local\/dsh-git-view|dsh-git-view\/client\.js/i.test(text)
}

/**
 * Translation key for the banner title of one operation context.
 * @param context - `commit`, `branch`, `remote`, `history`, `discard`, `rollback`, `ai`, `read`.
 * @returns the i18n key.
 */
export function errorTitleKey(context: string): string {
  switch (context) {
    case 'commit':
      return 'errorCommit'
    case 'branch':
      return 'errorBranch'
    case 'remote':
      return 'errorRemote'
    case 'history':
      return 'errorHistory'
    case 'discard':
      return 'errorDiscard'
    case 'rollback':
      return 'errorRollback'
    case 'ai':
      return 'errorAi'
    case 'read':
      return 'errorRead'
    default:
      return 'errorTitle'
  }
}
