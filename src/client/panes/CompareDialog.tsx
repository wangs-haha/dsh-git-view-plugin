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
import { Spinner } from '../ui/Spinner.js'
import type { CommitFile, DiffPayload, Translate } from '../types.js'

const h = React.createElement

/** Maximum number of parsed rows before the dialog truncates. */
const MAX_DIFF_ROWS = 3000

/** One hunk header line. */
export interface DiffRowHunk {
  kind: 'hunk'
  text: string
}

/** One context, addition, deletion, or replacement row. */
export interface DiffRowSide {
  kind: 'ctx' | 'add' | 'del' | 'change'
  oldNo: number | null
  oldText: string | null
  newNo: number | null
  newText: string | null
}

/** One parsed unified-diff row. */
export type DiffRow = DiffRowHunk | DiffRowSide

/** Parsed diff plus the truncation flag. */
export interface ParsedDiff {
  rows: DiffRow[]
  truncated: boolean
}

/**
 * Parse a unified diff into side-by-side rows.
 * @param text - unified diff output.
 * @returns aligned rows.
 */
export function parseDiffRows(text: string): ParsedDiff {
  const lines = String(text || '').split(/\r?\n/)
  const rows: DiffRow[] = []
  let oldNo = 0
  let newNo = 0
  let inHunk = false
  let truncated = false
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.startsWith('@@')) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (match) {
        oldNo = Number(match[1])
        newNo = Number(match[2])
      }
      rows.push({ kind: 'hunk', text: line })
      inHunk = true
      index += 1
      if (rows.length >= MAX_DIFF_ROWS) {
        truncated = true
        break
      }
      continue
    }
    if (!inHunk) {
      index += 1
      continue
    }
    if (line.startsWith('\\')) {
      index += 1
      continue
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      const deletions: string[] = []
      while (index < lines.length && lines[index].startsWith('-') && !lines[index].startsWith('---')) {
        deletions.push(lines[index].slice(1))
        index += 1
      }
      const additions: string[] = []
      while (index < lines.length && lines[index].startsWith('+') && !lines[index].startsWith('+++')) {
        additions.push(lines[index].slice(1))
        index += 1
      }
      const count = Math.max(deletions.length, additions.length)
      for (let k = 0; k < count; k += 1) {
        const oldText = k < deletions.length ? deletions[k] : null
        const newText = k < additions.length ? additions[k] : null
        rows.push({
          kind: oldText !== null && newText !== null ? 'change' : oldText !== null ? 'del' : 'add',
          oldNo: oldText !== null ? oldNo++ : null,
          oldText,
          newNo: newText !== null ? newNo++ : null,
          newText,
        })
      }
      continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      while (index < lines.length && lines[index].startsWith('+') && !lines[index].startsWith('+++')) {
        rows.push({
          kind: 'add',
          oldNo: null,
          oldText: null,
          newNo: newNo++,
          newText: lines[index].slice(1),
        })
        index += 1
      }
      continue
    }
    if (line.startsWith(' ')) {
      rows.push({
        kind: 'ctx',
        oldNo: oldNo++,
        oldText: line.slice(1),
        newNo: newNo++,
        newText: line.slice(1),
      })
      index += 1
      continue
    }
    index += 1
  }

  return { rows, truncated }
}

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
    body = h(
      'div',
      { className: 'gv-details-error' },
      h('div', { className: 'gv-state-title' }, t('errorTitle')),
      h('div', { className: 'gv-state-text' }, error),
    )
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
