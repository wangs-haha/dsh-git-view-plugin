/**
 * Right-hand commit details column: hash row, refs, message, meta list,
 * context-aware history actions, and the changed-file list.
 */
import * as React from 'react'
import { fullDate, historyHintKey, statusClass, statusLabel } from '../format.js'
import { FileIcon, IconCompare, IconCopy, IconGraphMark } from '../icons.js'
import { ErrorState } from '../ui/ErrorState.js'
import { Spinner } from '../ui/Spinner.js'
import type { CommitDetails, CommitFile, CommitRow, Translate } from '../types.js'
import { RefChip } from './CommitPane.js'

const h = React.createElement

export interface DetailsPaneProps {
  t: Translate
  commit: CommitRow | null
  details: CommitDetails | null
  loading: boolean
  error: string
  copied: boolean
  scope: string
  headHash: string
  onCopy: (hash: string) => void
  onCompare: (file: CommitFile) => void
  onSelectHash: (hash: string) => void
  onHistory: (op: string) => void
}

/**
 * Right-hand commit details column.
 * @param props - commit payload and callbacks.
 * @returns the details pane.
 */
export function DetailsPane(props: DetailsPaneProps): React.ReactElement {
  const { t, commit, details, loading, error, copied, scope, headHash, onCopy, onCompare, onSelectHash, onHistory } =
    props
  const spinner = h(Spinner, { label: t('loadingDetail') })

  let body: React.ReactNode = null
  if (!details && (loading || (commit && !error))) {
    body = spinner
  } else if (!commit && !details) {
    body = h(
      'div',
      { className: 'gv-details-empty' },
      h('div', { className: 'gv-details-empty-icon' }, h(IconGraphMark, { size: 22 })),
      h('div', null, t('selectCommit')),
    )
  } else if (error) {
    body = h('div', { className: 'gv-details-error' }, h(ErrorState, { t, message: error }))
  } else if (details) {
    const isHead = Boolean(headHash) && details.hash === headHash
    const isMerge = Array.isArray(details.parents) && details.parents.length > 1
    const actions: Array<{ op: string; label: string; danger: boolean }> = []
    if (isHead) actions.push({ op: 'undo', label: t('undoCommit'), danger: true })
    if (!isMerge) actions.push({ op: 'revert', label: t('revertCommit'), danger: false })
    if (!isHead && !isMerge) actions.push({ op: 'cherryPick', label: t('cherryPickCommit'), danger: false })
    if (!isHead) actions.push({ op: 'checkout', label: t('checkoutCommit'), danger: false })

    body = h(
      React.Fragment,
      null,
      h(
        'div',
        { className: 'gv-detail-hashrow' },
        h('code', { className: 'gv-detail-hash' }, details.shortHash),
        h(
          'button',
          {
            type: 'button',
            className: 'gv-icon-button gv-copy',
            title: t('copyHash'),
            'aria-label': t('copyHash'),
            onClick: () => onCopy(details.hash),
          },
          h(IconCopy, { size: 13 }),
        ),
        copied ? h('span', { className: 'gv-copied' }, t('copied')) : null,
      ),
      commit && commit.refs.length
        ? h(
            'div',
            { className: 'gv-detail-refs' },
            commit.refs.map((entry, index) =>
              h(RefChip, { key: `${entry.kind}-${entry.name}-${index}`, entry }),
            ),
          )
        : null,
      h('div', { className: 'gv-detail-subject' }, details.subject || '(no subject)'),
      details.message && details.message.split(/\r?\n/).length > 1
        ? h(
            'pre',
            { className: 'gv-detail-message' },
            details.message.split(/\r?\n/).slice(1).join('\n').trim(),
          )
        : null,
      h(
        'dl',
        { className: 'gv-meta' },
        h('dt', null, t('author')),
        h(
          'dd',
          null,
          details.author.name,
          h('span', { className: 'gv-meta-mail' }, ` <${details.author.email}>`),
        ),
        h('dt', null, t('date')),
        h('dd', null, fullDate(details.date)),
        details.committer && details.committer.name !== details.author.name
          ? h(React.Fragment, null, h('dt', null, t('committer')), h('dd', null, details.committer.name))
          : null,
        details.parents.length ? h('dt', null, t('parents')) : null,
        details.parents.length
          ? h(
              'dd',
              { className: 'gv-parents' },
              details.parents.map((parentHash) =>
                h(
                  'button',
                  {
                    key: parentHash,
                    type: 'button',
                    className: 'gv-parent',
                    title: parentHash,
                    onClick: () => onSelectHash(parentHash),
                  },
                  parentHash.slice(0, 7),
                ),
              ),
            )
          : null,
      ),
      actions.length === 0
        ? null
        : h(
            'div',
            { className: 'gv-detail-actions' },
            actions.map(({ op, label, danger }) =>
              h(
                'button',
                {
                  key: op,
                  type: 'button',
                  className: `gv-action-chip${danger ? ' gv-action-chip-danger' : ''}`,
                  title: t(historyHintKey(op)),
                  onClick: () => onHistory(op),
                },
                label,
              ),
            ),
          ),
      h(
        'div',
        { className: 'gv-section-title' },
        h('span', null, `${t('files')} · ${details.files.length} ${t('fileCountUnit')}`),
        scope ? h('span', { className: 'gv-filter-note', title: scope }, t('filteredBy')) : null,
      ),
      details.files.length === 0
        ? h('div', { className: 'gv-muted' }, scope ? t('noFilesInScope') : t('noFiles'))
        : h(
            'div',
            { className: 'gv-files' },
            details.files.map((entry) => {
              const additions = entry.additions ?? 0
              const deletions = entry.deletions ?? 0
              const lastSlash = entry.path.lastIndexOf('/')
              const fileDir = lastSlash >= 0 ? entry.path.slice(0, lastSlash + 1) : ''
              const fileName = lastSlash >= 0 ? entry.path.slice(lastSlash + 1) : entry.path
              return h(
                'button',
                {
                  key: `${entry.status}-${entry.path}`,
                  type: 'button',
                  className: 'gv-file',
                  title: `${statusLabel(entry.status, t)} · ${entry.path}\n${t('compareHint')}`,
                  onClick: () => onCompare(entry),
                },
                h('span', { className: `gv-status ${statusClass(entry.status)}` }, entry.status || '?'),
                h(FileIcon, { name: entry.path, size: 13 }),
                h(
                  'span',
                  { className: 'gv-file-path', title: entry.path },
                  fileDir ? h('span', { className: 'gv-file-dir' }, fileDir) : null,
                  h('span', { className: 'gv-file-name' }, fileName),
                ),
                entry.binary
                  ? h('span', { className: 'gv-file-stat gv-file-binary' }, t('binary'))
                  : additions > 0 || deletions > 0
                    ? h(
                        'span',
                        { className: 'gv-file-stat' },
                        additions > 0 ? h('span', { className: 'gv-add' }, `+${additions}`) : null,
                        additions > 0 && deletions > 0 ? ' ' : null,
                        deletions > 0 ? h('span', { className: 'gv-del' }, `-${deletions}`) : null,
                      )
                    : null,
                h('span', { className: 'gv-file-compare', 'aria-hidden': true }, h(IconCompare, { size: 12 })),
              )
            }),
          ),
    )
  }

  return h(
    'aside',
    { className: 'gv-details' },
    h(
      'div',
      { className: 'gv-details-head' },
      h(
        'span',
        { className: 'gv-details-heading' },
        h('span', { className: 'gv-head-icon', 'aria-hidden': true }, h(IconGraphMark, { size: 12 })),
        h('span', null, t('detailTitle')),
      ),
      scope ? h('span', { className: 'gv-head-scope', title: scope }, t('filteredBy')) : null,
    ),
    h('div', { className: 'gv-details-body' }, body),
  )
}
