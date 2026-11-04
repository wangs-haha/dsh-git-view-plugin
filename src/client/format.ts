/**
 * Presentation helpers shared by the panes.
 *
 * Everything here is pure: status letters become labels and CSS modifiers,
 * working-tree rows become tone/tag descriptors, dates become display text, and
 * operation kinds become dictionary keys.
 */
import type { StatusEntry, Translate } from './types.js'

/** Colour family of one working-tree row. */
export type ChangeTone = 'add' | 'del' | 'ren' | 'conflict' | 'mod'

/** One short state hint shown at the right of a working-tree row. */
export interface ChangeTag {
  tone: string
  label: string
}

/** State groups counted by the summary strip. */
export interface ChangeSummary {
  untracked: number
  staged: number
  modified: number
  conflict: number
  deleted: number
}

/**
 * Human label for one Git status letter.
 * @param status - the status letter from the Host.
 * @param t - translator.
 * @returns localized label.
 */
export function statusLabel(status: string, t: Translate): string {
  switch (status) {
    case 'A':
      return t('statusAdded')
    case 'M':
      return t('statusModified')
    case 'D':
      return t('statusDeleted')
    case 'R':
      return t('statusRenamed')
    case 'T':
      return t('statusTypeChanged')
    case 'U':
      return t('statusUnmerged')
    default:
      return t('statusUnknown')
  }
}

/**
 * Pick the CSS modifier class for one Git status letter.
 * @param status - status letter.
 * @returns class suffix.
 */
export function statusClass(status: string): string {
  if (status === 'A') return 'gv-st-add'
  if (status === 'D') return 'gv-st-del'
  if (status === 'M') return 'gv-st-mod'
  if (status === 'R') return 'gv-st-ren'
  return 'gv-st-other'
}

/**
 * Pick the CSS tone for one working-tree row.
 * @param entry - status entry from the Host.
 * @returns the tone.
 */
export function changeTone(entry: StatusEntry): ChangeTone {
  if (entry.conflict) return 'conflict'
  if (entry.untracked) return 'add'
  const letter = entry.x !== ' ' ? entry.x : entry.y
  if (letter === 'A') return 'add'
  if (letter === 'D') return 'del'
  if (letter === 'R') return 'ren'
  if (letter === 'U') return 'conflict'
  return 'mod'
}

/**
 * Single status glyph for one working-tree row. Untracked files show `?`
 * instead of the Host's synthetic `A`, which would look like a staged add.
 * @param entry - status entry.
 * @returns badge text.
 */
export function changeBadge(entry: StatusEntry): string {
  if (entry.untracked) return '?'
  if (entry.conflict) return 'U'
  return entry.x !== ' ' ? entry.x : entry.y
}

/**
 * Short state hints shown on the right of one working-tree row.
 * @param entry - status entry.
 * @param t - translator.
 * @returns at most two tags.
 */
export function changeTags(entry: StatusEntry, t: Translate): ChangeTag[] {
  if (entry.conflict) return [{ tone: 'conflict', label: t('conflictHint') }]
  if (entry.untracked) return [{ tone: 'untracked', label: t('untracked') }]
  const tags: ChangeTag[] = []
  if (entry.staged) tags.push({ tone: 'staged', label: t('staged') })
  if (entry.unstaged) {
    const letter = entry.y !== ' ' ? entry.y : entry.x
    const label =
      letter === 'D' ? t('deletedHint') : letter === 'R' ? t('renamedHint') : t('modifiedHint')
    tags.push({ tone: 'modified', label })
  }
  if (tags.length === 0) tags.push({ tone: 'modified', label: t('modifiedHint') })
  return tags.slice(0, 2)
}

/**
 * Count the working-tree state groups shown in the summary strip.
 * @param entries - visible status entries.
 * @returns the counts.
 */
export function summarizeChanges(entries: StatusEntry[]): ChangeSummary {
  const summary: ChangeSummary = { untracked: 0, staged: 0, modified: 0, conflict: 0, deleted: 0 }
  for (const entry of entries) {
    if (entry.conflict) {
      summary.conflict += 1
      continue
    }
    if (entry.untracked) {
      summary.untracked += 1
      continue
    }
    if (entry.staged) summary.staged += 1
    if (entry.unstaged) summary.modified += 1
    if (entry.status === 'D') summary.deleted += 1
  }
  return summary
}

/**
 * Localized label for one paused Git operation.
 * @param operation - operation kind from the Host.
 * @param t - translator.
 * @returns label.
 */
export function operationLabel(operation: string, t: Translate): string {
  if (operation === 'merge') return t('operationMerge')
  if (operation === 'rebase') return t('operationRebase')
  if (operation === 'cherry-pick') return t('operationCherryPick')
  if (operation === 'revert') return t('operationRevert')
  if (operation === 'bisect') return t('operationBisect')
  return operation
}

/**
 * Dictionary key for a commit-level action's label.
 * @param op - undo, revert, cherryPick, or checkout.
 * @returns dictionary key.
 */
export function historyLabelKey(op: string): string {
  if (op === 'undo') return 'undoCommit'
  if (op === 'revert') return 'revertCommit'
  if (op === 'cherryPick') return 'cherryPickCommit'
  return 'checkoutCommit'
}

/**
 * Dictionary key for a commit-level action's explanation.
 * @param op - undo, revert, cherryPick, or checkout.
 * @returns dictionary key.
 */
export function historyHintKey(op: string): string {
  if (op === 'undo') return 'undoCommitHint'
  if (op === 'revert') return 'revertCommitHint'
  if (op === 'cherryPick') return 'cherryPickCommitHint'
  return 'checkoutCommitHint'
}

/**
 * Dictionary key for a remote operation's progress label.
 * @param op - fetch, pull, or push.
 * @returns dictionary key.
 */
export function remoteOpKey(op: string): string {
  if (op === 'fetch') return 'fetch'
  if (op === 'pull') return 'pull'
  return 'push'
}

/**
 * Dictionary key for a remote operation's success notice.
 * @param op - fetch, pull, or push.
 * @returns dictionary key.
 */
export function remoteDoneKey(op: string): string {
  if (op === 'fetch') return 'fetchDone'
  if (op === 'pull') return 'pullDone'
  return 'pushDone'
}

/**
 * Default local branch name offered when checking out a remote branch.
 * @param name - e.g. `origin/feature/login`.
 * @returns e.g. `feature/login`.
 */
export function localNameForRemote(name: string): string {
  const parts = String(name || '').split('/')
  return parts.length > 1 ? parts.slice(1).join('/') : String(name || '')
}

/**
 * Cheap client-side branch-name check so input errors appear before the
 * Host validates the name again.
 * @param value - candidate name.
 * @returns whether it is plausibly a valid short branch name.
 */
export function looksLikeBranchName(value: string): boolean {
  const name = String(value || '').trim()
  return (
    name.length > 0 &&
    name.length <= 200 &&
    !/[\u0000-\u0020\u007f~^:?*\[\\]/.test(name) &&
    !name.startsWith('-') &&
    !name.startsWith('.') &&
    !name.startsWith('refs/') &&
    !name.endsWith('/') &&
    !name.endsWith('.') &&
    !name.endsWith('.lock') &&
    !name.includes('..') &&
    !name.includes('//') &&
    !name.includes('@{')
  )
}

/**
 * Compact `MM-DD HH:mm` (with the year when it differs) timestamp.
 * @param value - ISO date.
 * @returns display text.
 */
export function shortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || ''
  const pad = (part: number): string => String(part).padStart(2, '0')
  const clock = `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  const now = new Date()
  return date.getFullYear() === now.getFullYear() ? clock : `${date.getFullYear()}-${clock}`
}

const fullDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Full timestamp for titles and the details pane.
 * @param value - ISO date.
 * @returns display text.
 */
export function fullDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || ''
  return fullDateFormatter.format(date)
}

/**
 * @returns the current UI locale for AI message generation.
 */
export function uiLocale(): string {
  try {
    return document.documentElement.lang || navigator.language || 'en'
  } catch {
    return 'en'
  }
}
