/**
 * Modal side-by-side comparison for one changed file.
 *
 * The dialog owns the unified-diff parser: it aligns deletions with additions,
 * keeps the hunk headers, and renders both sides from one row model so the two
 * scroll columns stay line-for-line comparable.
 */
import * as React from 'react'
import ReactDOM from 'react-dom'
import { statusClass } from '../format.js'
import { IconClose } from '../icons.js'
import { parseDiffRows, type DiffRow } from './diff-parser.js'
import { ErrorState } from '../ui/ErrorState.js'
import { Spinner } from '../ui/Spinner.js'
import type { CommitFile, DiffPayload, Translate } from '../types.js'

const h = React.createElement

/**
 * Render one row of one comparison side.
 * @param row - parsed diff row.
 * @param side - which side to render.
 * @param key - React key.
 * @returns the row.
 */
export function compareRow(row: DiffRow, side: 'old' | 'new', key: number): React.ReactElement {
  if (row.kind === 'hunk') {
    return h('div', { key, className: 'gv-crow gv-crow-hunk' }, h('span', { className: 'gv-chunk' }, row.text))
  }
  const old = side === 'old'
  const kind = old
    ? row.kind === 'del' || row.kind === 'change'
      ? 'del'
      : row.kind === 'add'
        ? 'blank'
        : 'ctx'
    : row.kind === 'add' || row.kind === 'change'
      ? 'add'
      : row.kind === 'del'
        ? 'blank'
        : 'ctx'
  const number = old ? row.oldNo : row.newNo
  const text = old ? row.oldText : row.newText
  return h(
    'div',
    { key, className: `gv-crow gv-crow-${kind}` },
    h('span', { className: 'gv-cnum' }, number === null || number === undefined ? '' : String(number)),
    h('span', { className: 'gv-ccode' }, text === null || text === undefined ? '' : text),
  )
}

export interface CompareDialogProps {
  t: Translate
  file: CommitFile
  commitHash: string
  diff: DiffPayload | null
  loading: boolean
  error: string
  onClose: () => void
}

/**
 * Modal side-by-side comparison for one changed file.
 * @param props - file, diff payload, and close callback.
 * @returns the portal.
 */
export function CompareDialog({ t, file, commitHash, diff, loading, error, onClose }: CompareDialogProps): React.ReactElement {
  const closeRef = React.useRef<HTMLButtonElement | null>(null)
  const previouslyFocused = React.useRef<HTMLElement | null>(null)
  const oldRef = React.useRef<HTMLDivElement | null>(null)
  const newRef = React.useRef<HTMLDivElement | null>(null)
  const syncing = React.useRef(false)
  const parsed = React.useMemo(() => parseDiffRows(diff ? diff.text : ''), [diff])

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    if (closeRef.current) closeRef.current.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      const previous = previouslyFocused.current
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [onClose])

  const syncScroll = (which: 'old' | 'new') => (event: React.UIEvent<HTMLDivElement>) => {
    if (syncing.current) return
    const target = which === 'old' ? newRef.current : oldRef.current
    if (!target) return
    syncing.current = true
    target.scrollTop = event.currentTarget.scrollTop
    window.requestAnimationFrame(() => {
      syncing.current = false
    })
  }

  const text = diff ? diff.text : ''
  const binary = diff !== null && parsed.rows.length === 0 && /Binary files|GIT binary patch/i.test(text)
  const empty = diff !== null && !binary && parsed.rows.length === 0

  let body: React.ReactNode = null
  if (loading) {
    body = h(Spinner, { label: t('loadingDiff') })
  } else if (error) {
    body = h('div', { className: 'gv-details-error' }, h(ErrorState, { t, message: error }))
  } else if (binary) {
    body = h('div', { className: 'gv-modal-empty' }, t('binaryCompare'))
  } else if (empty || !diff) {
    body = h('div', { className: 'gv-modal-empty' }, t('emptyDiff'))
  } else {
    body = h(
      'div',
      { className: 'gv-compare' },
      h(
        'div',
        { className: 'gv-cside' },
        h('div', { className: 'gv-ctitle' }, t('oldVersion')),
        h(
          'div',
          { className: 'gv-clines', ref: oldRef, onScroll: syncScroll('old') },
          parsed.rows.map((row, index) => compareRow(row, 'old', index)),
        ),
      ),
      h(
        'div',
        { className: 'gv-cside' },
        h('div', { className: 'gv-ctitle' }, t('newVersion')),
        h(
          'div',
          { className: 'gv-clines', ref: newRef, onScroll: syncScroll('new') },
          parsed.rows.map((row, index) => compareRow(row, 'new', index)),
        ),
      ),
    )
  }

  const note = parsed.truncated || (diff !== null && diff.truncated)
  const dialog = h(
    'div',
    {
      className: 'gv-modal-mask',
      onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onClose()
      },
    },
    h(
      'div',
      { className: 'gv-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('compareTitle') },
      h(
        'div',
        { className: 'gv-modal-head' },
        h(
          'div',
          { className: 'gv-modal-heading' },
          h('span', { className: `gv-status ${statusClass(file.status)}` }, file.status || '?'),
          h('span', { className: 'gv-modal-path', title: file.path }, file.path),
          h('span', { className: 'gv-modal-hash', title: commitHash }, commitHash.slice(0, 7)),
        ),
        h(
          'button',
          {
            type: 'button',
            ref: closeRef,
            className: 'gv-icon-button',
            title: t('close'),
            'aria-label': t('close'),
            onClick: onClose,
          },
          h(IconClose, { size: 14 }),
        ),
      ),
      h('div', { className: 'gv-modal-body' }, body),
      note ? h('div', { className: 'gv-modal-foot' }, h('span', null, t('fileDiffTruncated'))) : null,
    ),
  )

  return ReactDOM.createPortal(dialog, document.body)
}
