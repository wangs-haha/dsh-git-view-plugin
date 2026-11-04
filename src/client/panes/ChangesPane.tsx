/**
 * Bottom half of the left column: working-tree changes and the commit composer.
 *
 * This is a typed port of the legacy `ChangesPane` in `client.js`. Every
 * visible file is selected by default; unchecking a file is how a partial
 * commit (or a partial AI draft) is expressed.
 */
import * as React from 'react'
import { changeBadge, changeTags, changeTone, operationLabel, summarizeChanges } from '../format.js'
import { FileIcon, IconAlert, IconCheck, IconRefresh, IconSparkles, IconUndo } from '../icons.js'
import { Spinner } from '../ui/Spinner.js'
import type { GitRepo, RepoState, StatusEntry, Translate } from '../types.js'

const h = React.createElement

export interface ChangesPaneProps {
  t: Translate
  repo: GitRepo | null
  scope: string
  entries: StatusEntry[]
  totalCount: number
  loading: boolean
  error: string
  selected: Set<string>
  message: string
  busy: boolean
  disabled: boolean
  aiBusy: boolean
  repoNotice: { text: string; kind: string } | null
  repoState: RepoState | null
  commitError: string
  height: number
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onToggle: (path: string) => void
  onToggleAll: () => void
  onRefresh: () => void
  onRollback: () => void
  onMessage: (value: string) => void
  onCommit: () => void
  onGenerate: () => void
  onDiscard: (entry: StatusEntry) => void
  onResolve: (entry: StatusEntry) => void
  onContinue: () => void
  onAbort: () => void
}

/**
 * Render the changes list and the commit composer.
 * @param props - entries, selection, repository state, and callbacks.
 * @returns the changes pane element.
 */
export function ChangesPane(props: ChangesPaneProps): React.ReactElement {
  const {
    t,
    repo,
    scope,
    entries,
    totalCount,
    loading,
    error,
    selected,
    message,
    busy,
    disabled,
    aiBusy,
    onGenerate,
    repoNotice,
    repoState,
    commitError,
    height,
    inputRef,
    onToggle,
    onToggleAll,
    onRefresh,
    onRollback,
    onMessage,
    onCommit,
    onDiscard,
    onResolve,
    onContinue,
    onAbort,
  } = props

  const summary = React.useMemo(() => summarizeChanges(entries), [entries])
  const allSelected = entries.length > 0 && entries.every((entry) => selected.has(entry.path))
  const selectedCount = entries.filter((entry) => selected.has(entry.path)).length
  const manualReady = message.trim().length > 0
  const locked = disabled || busy
  const selectedConflict = entries.some((entry) => entry.conflict && selected.has(entry.path))
  const operationPaused = Boolean(repoState && repoState.operation)
  const canCommit = entries.length > 0 && selectedCount > 0 && !locked && !selectedConflict && !operationPaused
  const canSubmit = canCommit && manualReady

  let list: React.ReactNode = null
  if (loading && entries.length === 0) {
    list = h(Spinner, { label: t('loading') })
  } else if (error) {
    list = h(
      'div',
      { className: 'gv-changes-state' },
      h('span', null, error),
      h(
        'button',
        { type: 'button', className: 'gv-button', onClick: onRefresh },
        h(IconRefresh, { size: 12 }),
        h('span', null, t('retry')),
      ),
    )
  } else if (entries.length === 0) {
    list = h('div', { className: 'gv-changes-state' }, scope ? t('noChangesInScope') : t('noChanges'))
  } else {
    list = entries.map((entry) => {
      const dot = entry.path.lastIndexOf('/')
      const dir = dot >= 0 ? entry.path.slice(0, dot) : ''
      const name = dot >= 0 ? entry.path.slice(dot + 1) : entry.path
      const tags = changeTags(entry, t)
      const isSelected = selected.has(entry.path)
      const toggle = (): void => {
        if (!locked) onToggle(entry.path)
      }
      return h(
        'div',
        {
          key: entry.path,
          className: `gv-change-row${isSelected ? ' gv-change-checked' : ''}`,
          title: `${entry.path}\n${entry.x}${entry.y}${entry.untracked ? ` · ${t('untracked')}` : ''}`,
          onClick: toggle,
        },
        h('input', {
          type: 'checkbox',
          className: 'gv-change-check',
          checked: isSelected,
          disabled: locked,
          'aria-label': entry.path,
          onClick: (event) => event.stopPropagation(),
          onChange: toggle,
        }),
        h('span', { className: `gv-change-status gv-chg-${changeTone(entry)}` }, changeBadge(entry)),
        h(FileIcon, { name: entry.path, size: 13 }),
        h(
          'span',
          { className: 'gv-change-text' },
          h('span', { className: 'gv-change-name' }, name),
          dir ? h('span', { className: 'gv-change-dir' }, dir) : null,
        ),
        h(
          'span',
          { className: 'gv-change-tags' },
          tags.map((tag: { tone: string; label: string }, index: number) =>
            h(
              'span',
              { key: `${tag.tone}-${index}`, className: `gv-change-tag gv-tag-${tag.tone}` },
              tag.label,
            ),
          ),
        ),
        entry.conflict
          ? h(
              'button',
              {
                type: 'button',
                className: 'gv-change-resolve',
                title: `${t('markResolved')} · ${entry.path}`,
                'aria-label': `${t('markResolved')} ${entry.path}`,
                disabled: locked,
                onClick: (event) => {
                  event.stopPropagation()
                  if (!locked) onResolve(entry)
                },
              },
              h(IconCheck, { size: 12 }),
            )
          : null,
        h(
          'button',
          {
            type: 'button',
            className: 'gv-change-discard',
            title: `${t('discardChanges')} · ${entry.path}`,
            'aria-label': `${t('discardChanges')} ${entry.path}`,
            disabled: locked,
            onClick: (event) => {
              event.stopPropagation()
              if (!locked) onDiscard(entry)
            },
          },
          h(IconUndo, { size: 12 }),
        ),
      )
    })
  }

  const chips: Array<[string, string, number]> = []
  if (summary.untracked > 0) chips.push(['untracked', t('untracked'), summary.untracked])
  if (summary.modified > 0) chips.push(['modified', t('modifiedHint'), summary.modified])
  if (summary.staged > 0) chips.push(['staged', t('staged'), summary.staged])
  if (summary.conflict > 0) chips.push(['conflict', t('conflictHint'), summary.conflict])
  if (summary.deleted > 0) chips.push(['deleted', t('deletedHint'), summary.deleted])

  return h(
    'div',
    { className: 'gv-changes', style: height ? { height: `${height}px` } : undefined },
    h(
      'div',
      { className: 'gv-changes-head' },
      h(
        'span',
        { className: 'gv-changes-title' },
        h('span', null, t('changes')),
        h('span', { className: 'gv-changes-count' }, String(entries.length)),
        entries.length !== totalCount ? h('span', { className: 'gv-changes-total' }, `/ ${totalCount}`) : null,
        loading && entries.length > 0 ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true }) : null,
      ),
      h(
        'div',
        { className: 'gv-changes-actions' },
        h(
          'button',
          {
            type: 'button',
            className: 'gv-text-button',
            onClick: onToggleAll,
            disabled: entries.length === 0 || locked,
          },
          allSelected ? t('clearSelection') : t('selectAll'),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'gv-text-button gv-text-button-danger',
            title: t('rollbackHint'),
            onClick: onRollback,
            disabled: entries.length === 0 || locked,
          },
          t('rollback'),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'gv-icon-button gv-icon-xs',
            title: t('refreshChanges'),
            'aria-label': t('refreshChanges'),
            onClick: onRefresh,
            disabled: locked,
          },
          h(IconRefresh, { size: 12 }),
        ),
      ),
    ),
    chips.length > 0
      ? h(
          'div',
          { className: 'gv-changes-summary', 'aria-label': `${t('changes')} · ${entries.length}` },
          chips.map(([tone, label, count]) =>
            h(
              'span',
              { key: tone, className: `gv-sum-chip gv-sum-${tone}` },
              h('span', { className: 'gv-sum-dot', 'aria-hidden': true }),
              `${label} ${count}`,
            ),
          ),
        )
      : null,
    scope
      ? h(
          'div',
          { className: 'gv-changes-scope', title: `${scope}${repo ? ` · ${repo.root}` : ''}` },
          h('span', { className: 'gv-changes-scope-label' }, t('changesInScope')),
          h('span', { className: 'gv-changes-scope-path' }, scope),
        )
      : null,
    repoState && repoState.operation
      ? h(
          'div',
          { className: `gv-repo-banner gv-repo-banner-${repoState.operation}` },
          h(IconAlert, { size: 13 }),
          h(
            'span',
            { className: 'gv-repo-banner-text' },
            `${operationLabel(repoState.operation, t)} · ${t('operationHint')}`,
          ),
          h(
            'div',
            { className: 'gv-repo-banner-actions' },
            repoState.operation !== 'bisect'
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'gv-button gv-button-xs',
                    onClick: onContinue,
                    disabled: locked,
                  },
                  t('continueOperation'),
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'gv-button gv-button-xs gv-button-danger-ghost',
                onClick: onAbort,
                disabled: locked,
              },
              t('abortOperation'),
            ),
          ),
        )
      : null,
    repoNotice ? h('div', { className: `gv-repo-notice gv-repo-notice-${repoNotice.kind}` }, repoNotice.text) : null,
    h('div', { className: 'gv-changes-list' }, list),
    h(
      'div',
      { className: 'gv-commit' },
      h('textarea', {
        ref: inputRef,
        className: 'gv-commit-input',
        rows: 2,
        value: message,
        placeholder: t('commitMessagePlaceholder'),
        'aria-label': t('commitMessagePlaceholder'),
        spellCheck: false,
        disabled: locked,
        onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onMessage(event.target.value),
        onKeyDown: (event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            if (canSubmit) onCommit()
          }
        },
      }),
      h(
        'div',
        { className: 'gv-commit-bar' },
        h(
          'button',
          {
            type: 'button',
            className: 'gv-commit-generate',
            onClick: onGenerate,
            disabled: !canCommit || aiBusy,
            title: operationPaused
              ? t('finishOperationFirst')
              : selectedConflict
                ? t('resolveConflictsFirst')
                : selectedCount === 0
                  ? t('commitSelectRequired')
                  : t('generateHint'),
          },
          aiBusy ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true }) : h(IconSparkles, { size: 12 }),
          h('span', null, manualReady ? t('regenerateMessage') : t('generateMessage')),
        ),
        h(
          'span',
          { className: 'gv-commit-hint' },
          `${t('selectedFiles')} ${selectedCount} / ${entries.length}`,
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'gv-button gv-button-primary gv-commit-submit',
            onClick: onCommit,
            disabled: !canSubmit,
            title: operationPaused
              ? t('finishOperationFirst')
              : selectedConflict
                ? t('resolveConflictsFirst')
                : !manualReady
                  ? t('commitMessageRequired')
                  : selectedCount === 0
                    ? t('commitSelectRequired')
                    : t('commitKeyHint'),
          },
          h('span', null, t('commit')),
        ),
      ),
      commitError ? h('div', { className: 'gv-commit-note gv-commit-error' }, commitError) : null,
    ),
  )
}

