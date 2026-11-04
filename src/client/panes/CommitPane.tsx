/**
 * Middle commit-graph pane: sticky header, lane graph, ref chips, and the
 * repository status bar with the continue/abort controls for a paused
 * operation.
 */
import * as React from 'react'
import { shortDate, fullDate, operationLabel } from '../format.js'
import { COLUMNS } from '../metrics.js'
import { IconBranch, IconClose, IconFolder, IconGraphMark, IconMore } from '../icons.js'
import { ErrorState } from '../ui/ErrorState.js'
import { Spinner } from '../ui/Spinner.js'
import type { CommitRow, LogPayload, RepoState, Translate } from '../types.js'
import { DEFAULT_COLOR, GRAPH_PAD, LANE_WIDTH, ROW_HEIGHT } from './graph.js'
import type { GraphRow } from './graph.js'

export { computeRows, DEFAULT_COLOR, GRAPH_PAD, LANE_WIDTH, PALETTE, ROW_HEIGHT } from './graph.js'
export type { GraphEdge, GraphRow } from './graph.js'

const h = React.createElement

/** Any ref label a chip can render; commit refs and log refs both fit. */
export interface RefChipEntry {
  name: string
  kind: string
  head?: boolean
}

export interface CommitPaneProps {
  t: Translate
  log: LogPayload | null
  loading: boolean
  error: string
  commits: CommitRow[]
  rows: GraphRow[]
  graphWidth: number
  matches: Set<number> | null
  selected: string
  scope: string
  state: RepoState | null
  narrow: boolean
  /** Composer textarea owned by the panel; accepted for layout parity. */
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  busy: boolean
  onSelect: (hash: string) => void
  onRefresh: () => void
  onClearScope: () => void
  onContinue: () => void
  onAbort: () => void
  onMenu: (commit: CommitRow, point: { x: number; y: number }) => void
}

/**
 * Render one row's lane segments, curves, and commit node.
 * @param props - layout row and graph width.
 * @returns the SVG cell.
 */
export function GraphCell({ row, width }: { row: GraphRow; width: number }): React.ReactElement {
  const x = (lane: number): number => GRAPH_PAD + lane * LANE_WIDTH + LANE_WIDTH / 2
  const centerX = x(row.lane)
  const centerY = ROW_HEIGHT / 2
  const parts: React.ReactElement[] = []

  for (const lane of row.top) {
    parts.push(
      h('line', {
        key: `top-${lane}`,
        x1: x(lane),
        y1: 0,
        x2: x(lane),
        y2: ROW_HEIGHT,
        stroke: row.colors[lane] || DEFAULT_COLOR,
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }

  row.edges.forEach((edge, index) => {
    const edgeX = x(edge.to)
    if (edge.straight) {
      parts.push(
        h('line', {
          key: `edge-${index}`,
          x1: centerX,
          y1: centerY,
          x2: centerX,
          y2: ROW_HEIGHT,
          stroke: edge.color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
      )
    } else {
      parts.push(
        h('path', {
          key: `edge-${index}`,
          d: `M ${centerX} ${centerY} C ${centerX} ${centerY + 8}, ${edgeX} ${ROW_HEIGHT - 8}, ${edgeX} ${ROW_HEIGHT}`,
          fill: 'none',
          stroke: edge.color,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
      )
    }
  })

  if (!row.isNew) {
    parts.push(
      h('line', {
        key: 'incoming',
        x1: centerX,
        y1: 0,
        x2: centerX,
        y2: centerY,
        stroke: row.color,
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }

  parts.push(
    h('circle', {
      key: 'node',
      cx: centerX,
      cy: centerY,
      r: 4,
      fill: row.color,
      stroke: 'var(--dsw-alias-bg-base)',
      strokeWidth: 1.5,
    }),
  )

  return h(
    'svg',
    {
      className: 'gv-graph',
      width,
      height: ROW_HEIGHT,
      viewBox: `0 0 ${width} ${ROW_HEIGHT}`,
      'aria-hidden': true,
      focusable: false,
    },
    parts,
  )
}

/**
 * Ref chip shared by commit rows and the details pane.
 * @param props - ref entry.
 * @returns the chip.
 */
export function RefChip({ entry }: { entry: RefChipEntry }): React.ReactElement {
  const isHead = Boolean(entry.head) || entry.kind === 'head'
  const kind = isHead ? 'head' : entry.kind
  const label = isHead && entry.name !== 'HEAD' ? `HEAD → ${entry.name}` : entry.name
  return h(
    'span',
    {
      className: `gv-ref gv-ref-${kind}`,
      title: isHead ? `HEAD → ${entry.name}` : `${kind}: ${entry.name}`,
    },
    label,
  )
}

/**
 * Middle commit graph and table.
 * @param props - log, rows, and callbacks.
 * @returns the commit pane.
 */
export function CommitPane(props: CommitPaneProps): React.ReactElement {
  const {
    t,
    log,
    loading,
    error,
    commits,
    rows,
    graphWidth,
    matches,
    selected,
    scope,
    state,
    narrow,
    busy,
    onSelect,
    onRefresh,
    onClearScope,
    onContinue,
    onAbort,
    onMenu,
  } = props

  const columns = narrow
    ? `${graphWidth}px minmax(0, 1fr)`
    : `${graphWidth}px minmax(140px, 1fr) ${COLUMNS.author}px ${COLUMNS.date}px ${COLUMNS.hash}px`
  const branch =
    log && log.head
      ? log.head.detached
        ? `${t('detached')} @ ${log.head.hash.slice(0, 7)}`
        : log.head.branch
      : ''

  let content: React.ReactNode = null
  if (!log && (loading || !error)) {
    content = h(Spinner, { label: t('loading') })
  } else if (error) {
    content = h('div', { className: 'gv-state' }, h(ErrorState, { t, message: error, onRetry: onRefresh }))
  } else if (commits.length === 0) {
    content = h(
      'div',
      { className: 'gv-state' },
      h(IconGraphMark, { size: 30 }),
      h('div', { className: 'gv-state-title' }, t('noCommits')),
      h('div', { className: 'gv-state-text' }, t('noCommitsHint')),
    )
  } else {
    content = commits.map((commit, index) => {
      const dimmed = matches !== null && !matches.has(index)
      const isSelected = commit.hash === selected
      return h(
        'div',
        {
          key: commit.hash,
          className: `gv-row${isSelected ? ' gv-row-selected' : ''}${dimmed ? ' gv-row-dim' : ''}`,
          role: 'row',
          tabIndex: 0,
          'aria-selected': isSelected,
          title: `${commit.subject}\n${commit.author} <${commit.email}>\n${fullDate(commit.date)}\n${commit.hash}`,
          onClick: () => onSelect(commit.hash),
          onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault()
            onMenu(commit, { x: event.clientX, y: event.clientY })
          },
          onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect(commit.hash)
            } else if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
              event.preventDefault()
              const target = event.currentTarget
              const rect =
                typeof target.getBoundingClientRect === 'function'
                  ? target.getBoundingClientRect()
                  : { left: 0, top: 0, bottom: 0 }
              onMenu(commit, { x: rect.left + 40, y: rect.bottom })
            }
          },
        },
        h('span', { className: 'gv-graphcell' }, h(GraphCell, { row: rows[index], width: graphWidth })),
        h(
          'span',
          { className: 'gv-subjectcell' },
          h('span', { className: 'gv-subject' }, commit.subject || '(no subject)'),
          commit.refs.map((entry, refIndex) =>
            h(RefChip, { key: `${entry.kind}-${entry.name}-${refIndex}`, entry }),
          ),
        ),
        narrow ? null : h('span', { className: 'gv-author', title: commit.email }, commit.author),
        narrow
          ? null
          : h('span', { className: 'gv-date', title: fullDate(commit.date) }, shortDate(commit.date)),
        narrow ? null : h('span', { className: 'gv-hash' }, commit.hash.slice(0, 7)),
        h(
          'button',
          {
            type: 'button',
            className: 'gv-row-more',
            title: t('commitActions'),
            'aria-label': `${t('commitActions')} · ${commit.hash.slice(0, 7)}`,
            'aria-haspopup': 'menu',
            tabIndex: -1,
            onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              onMenu(commit, { x: rect.left, y: rect.bottom + 2 })
            },
          },
          h(IconMore, { size: 14 }),
        ),
      )
    })
  }

  return h(
    'div',
    { className: 'gv-log' },
    scope
      ? h(
          'div',
          { className: 'gv-scopebar' },
          h(IconFolder, { size: 12 }),
          h('span', { className: 'gv-scope-path', title: scope }, scope),
          h(
            'button',
            { type: 'button', className: 'gv-scope-clear', onClick: onClearScope, title: t('clearScope') },
            h(IconClose, { size: 11 }),
            h('span', null, t('clearScope')),
          ),
        )
      : null,
    h(
      'div',
      { className: 'gv-scroll', style: { '--gv-cols': columns } as React.CSSProperties },
      h(
        'div',
        { className: 'gv-thead', role: 'row' },
        h('span', { className: 'gv-th' }, ''),
        h('span', { className: 'gv-th' }, t('subject')),
        narrow ? null : h('span', { className: 'gv-th' }, t('authorColumn')),
        narrow ? null : h('span', { className: 'gv-th' }, t('dateColumn')),
        narrow ? null : h('span', { className: 'gv-th' }, t('hashColumn')),
      ),
      content,
    ),
    h(
      'div',
      { className: 'gv-statusbar' },
      h(
        'span',
        { className: 'gv-status-path', title: log && log.repo ? log.repo.root : '' },
        log && log.repo ? log.repo.root : '',
      ),
      branch
        ? h(
            'span',
            {
              className: 'gv-status-item',
              title: `${t('currentBranch')}: ${branch}${state && state.upstream ? ` · ${state.upstream}` : ''}`,
            },
            h(IconBranch, { size: 11 }),
            h('span', null, branch),
          )
        : null,
      state && state.ahead > 0
        ? h(
            'span',
            { className: 'gv-status-item gv-status-ahead', title: `${t('ahead')} ${state.ahead}` },
            `↑${state.ahead}`,
          )
        : null,
      state && state.behind > 0
        ? h(
            'span',
            { className: 'gv-status-item gv-status-behind', title: `${t('behind')} ${state.behind}` },
            `↓${state.behind}`,
          )
        : null,
      state && state.operation
        ? h(
            'span',
            { className: 'gv-status-item gv-status-op', title: t('operationHint') },
            operationLabel(state.operation, t),
          )
        : null,
      state && state.operation && onContinue
        ? h(
            'span',
            { className: 'gv-status-actions' },
            state.operation !== 'bisect'
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'gv-status-btn',
                    disabled: busy,
                    title: t('continueOperation'),
                    onClick: onContinue,
                  },
                  t('continueOperation'),
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: 'gv-status-btn gv-status-btn-danger',
                disabled: busy,
                title: t('abortOperation'),
                onClick: onAbort,
              },
              t('abortOperation'),
            ),
          )
        : null,
      scope ? h('span', { className: 'gv-status-item' }, `· ${t('filteredBy')}`) : null,
      loading
        ? h(
            'span',
            { className: 'gv-status-busy', title: t('loading'), 'aria-label': t('loading') },
            h('span', { className: 'gv-inline-spin', 'aria-hidden': true }),
          )
        : null,
    ),
  )
}
