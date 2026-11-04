/**
 * Top toolbar: repository, branch, sync actions, and search.
 *
 * This is a typed port of the legacy `Toolbar` in `client.js`; every class name,
 * aria attribute, and behaviour is preserved so the shipped stylesheet keeps
 * applying unchanged.
 */
import * as React from 'react'
import { Dropdown, type DropdownOption } from '../ui/Dropdown.js'
import { IconArrowDown, IconArrowUp, IconGraphMark, IconRefresh, IconSearch } from '../icons.js'
import type { GitRepo, LogPayload, RepoState, Translate } from '../types.js'

const h = React.createElement

export interface ToolbarProps {
  t: Translate
  repos: GitRepo[] | null
  repoId: string
  onRepo: (id: string) => void
  log: LogPayload | null
  refValue: string
  onRef: (ref: string) => void
  branchOptions: DropdownOption[]
  query: string
  onQuery: (value: string) => void
  count: number
  matchCount: number | null
  onRefresh: () => void
  sync: RepoState | null
  syncBusy: boolean
  onFetch: () => void
  /** `rebase` is true when the click carried Shift. */
  onPull: (rebase: boolean) => void
  /** `force` is true when the click carried Shift. */
  onPush: (force: boolean) => void
}

/**
 * Render the toolbar row.
 * @param props - finder state and callbacks.
 * @returns the toolbar element.
 */
export function Toolbar(props: ToolbarProps): React.ReactElement {
  const {
    t,
    repos,
    repoId,
    onRepo,
    log,
    refValue,
    onRef,
    branchOptions,
    query,
    onQuery,
    count,
    matchCount,
    onRefresh,
    sync,
    syncBusy,
    onFetch,
    onPull,
    onPush,
  } = props

  const repoOptions: DropdownOption[] = (repos || []).map((repo) => ({
    value: repo.id,
    label: repo.title || repo.path,
    description: repo.path,
    icon: 'repo',
  }))
  const ahead = sync && sync.ahead ? sync.ahead : 0
  const behind = sync && sync.behind ? sync.behind : 0
  const remoteDisabled = !log || syncBusy

  return h(
    'div',
    { className: 'gv-toolbar' },
    h('div', { className: 'gv-brand' }, h(IconGraphMark, { size: 13 }), h('span', null, t('panel'))),
    h('span', { className: 'gv-divider', 'aria-hidden': true }),
    h(Dropdown, {
      t,
      label: t('selectRepo'),
      value: repoId,
      options: repoOptions,
      onChange: onRepo,
      disabled: !repos || repos.length === 0,
      icon: 'repo',
      width: '190px',
      placeholder: t('noRepos'),
    }),
    h(Dropdown, {
      t,
      label: t('selectBranch'),
      value: refValue,
      options: branchOptions || [{ value: '', label: t('allRefs'), icon: 'all' }],
      onChange: onRef,
      disabled: !log,
      icon: 'branch',
      width: '210px',
      placeholder: t('branch'),
    }),
    h(
      'div',
      { className: 'gv-sync' },
      h(
        'button',
        {
          type: 'button',
          className: 'gv-icon-button',
          title: t('fetch'),
          'aria-label': t('fetch'),
          disabled: remoteDisabled,
          onClick: onFetch,
        },
        h(IconRefresh, { size: 14 }),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'gv-icon-button',
          title: behind > 0 ? `${t('pull')} · ↓${behind} · ${t('pullModifierHint')}` : `${t('pull')} · ${t('pullModifierHint')}`,
          'aria-label': t('pull'),
          disabled: remoteDisabled,
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => onPull(event.shiftKey),
        },
        h(IconArrowDown, { size: 14 }),
        behind > 0 ? h('span', { className: 'gv-sync-count gv-sync-behind' }, String(behind)) : null,
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'gv-icon-button',
          title: ahead > 0 ? `${t('push')} · ↑${ahead} · ${t('pushModifierHint')}` : `${t('push')} · ${t('pushModifierHint')}`,
          'aria-label': t('push'),
          disabled: remoteDisabled,
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => onPush(event.shiftKey),
        },
        h(IconArrowUp, { size: 14 }),
        ahead > 0 ? h('span', { className: 'gv-sync-count gv-sync-ahead' }, String(ahead)) : null,
      ),
    ),
    h(
      'div',
      { className: 'gv-search' },
      h(IconSearch),
      h('input', {
        className: 'gv-search-input',
        type: 'search',
        value: query,
        placeholder: t('searchPlaceholder'),
        'aria-label': t('searchPlaceholder'),
        onChange: (event) => onQuery(event.target.value),
        onKeyDown: (event) => {
          if (event.key === 'Escape' && query) {
            event.stopPropagation()
            onQuery('')
          }
        },
      }),
    ),
    h('div', { className: 'gv-spacer' }),
    matchCount !== null
      ? h('span', { className: 'gv-count gv-match-count' }, `${matchCount} ${t('matchesUnit')}`)
      : null,
    count ? h('span', { className: 'gv-count' }, `${count} ${t('commitsUnit')}`) : null,
    h(
      'button',
      {
        type: 'button',
        className: 'gv-icon-button',
        title: t('refresh'),
        'aria-label': t('refresh'),
        onClick: onRefresh,
      },
      h(IconRefresh, { size: 14 }),
    ),
  )
}
