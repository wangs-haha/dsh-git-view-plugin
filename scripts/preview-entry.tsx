/**
 * Screenshot fixtures for `scripts/preview.mjs`.
 *
 * Reuses the pane fixtures from `panes-entry.tsx` and adds a composite "full
 * panel" case plus a labelled gallery, so the whole surface can be rendered to
 * static HTML and photographed in both themes. Never shipped.
 */
import * as React from 'react'
import { PANEL_CSS } from '../src/client/styles.js'
import { ErrorNotice } from '../src/client/ui/ErrorNotice.js'
import { CASES } from './panes-entry.js'

const h = React.createElement

/** Look up one fixture element by its case name. */
function fixture(name: string): React.ReactElement {
  const found = CASES.find((item) => item.name === name)
  if (!found) throw new Error(`missing fixture: ${name}`)
  return found.element
}

/** Re-render a fixture with a few props replaced. */
function withProps(name: string, props: Record<string, unknown>): React.ReactElement {
  const element = fixture(name)
  return h(element.type as never, { ...(element.props as Record<string, unknown>), ...props })
}

const styleTag = h('style', { key: 'panel-css' }, PANEL_CSS)

const remoteStrip = h(
  'div',
  { className: 'gv-remote gv-remote-running' },
  h('span', { className: 'gv-inline-spin', 'aria-hidden': true }),
  h('span', { className: 'gv-remote-label' }, 'pull · 42%'),
  h('span', { className: 'gv-remote-line' }, 'Receiving objects: 42% (128/305)'),
  h('button', { type: 'button', className: 'gv-remote-cancel' }, 'cancel'),
)

const split = (axis: 'x' | 'y'): React.ReactElement =>
  h(
    'div',
    {
      className: `gv-split${axis === 'y' ? ' gv-split-row' : ''}`,
      role: 'separator',
      tabIndex: 0,
    },
    h(
      'span',
      { className: 'gv-split-grip', 'aria-hidden': true },
      h('i', { key: 'a' }),
      h('i', { key: 'b' }),
      h('i', { key: 'c' }),
    ),
  )

const leftPane = h(
  'div',
  { className: 'gv-pane gv-pane-left', style: { width: '280px', flexBasis: '280px' } },
  h('div', { className: 'gv-left' }, fixture('FileTreePane'), split('y'), fixture('ChangesPane')),
)

const centerPane = h('div', { className: 'gv-pane gv-pane-center' }, fixture('CommitPane'))

const rightPane = h(
  'div',
  { className: 'gv-pane gv-pane-right', style: { width: '360px', flexBasis: '360px' } },
  fixture('DetailsPane (HEAD)'),
)

const fullPanel = h(
  'div',
  { className: 'gv-root', style: { height: '760px' } },
  styleTag,
  fixture('Toolbar'),
  remoteStrip,
  h('div', { className: 'gv-main' }, leftPane, split('x'), centerPane, split('x'), rightPane),
)

const compactPanel = h(
  'div',
  { className: 'gv-root', style: { height: '620px' } },
  fixture('Toolbar'),
  h(
    'div',
    { className: 'gv-main gv-main-compact' },
    h('div', { className: 'gv-compact-top' }, leftPane, split('x'), centerPane),
    h('div', { className: 'gv-compact-bottom' }, rightPane),
  ),
)

const statesPanel = h(
  'div',
  { className: 'gv-root', style: { height: '520px', display: 'flex', flexDirection: 'column' } },
  h(
    'div',
    { className: 'gv-changes', style: { height: '260px' } },
    withProps('ChangesPane', {
      entries: [],
      totalCount: 0,
      error: 'fatal: unable to read repository state',
    }),
  ),
  h(
    'div',
    { className: 'gv-changes', style: { height: '260px' } },
    withProps('ChangesPane', {
      repoState: { branch: 'main', hash: 'aaa1111', detached: false, unborn: false, operation: 'merge', upstream: 'origin/main', ahead: 0, behind: 0 },
      repoNotice: { kind: 'error', text: 'CONFLICT (content): Merge conflict in src/app.ts' },
    }),
  ),
)

const errorBanner = h(
  'div',
  { className: 'gv-root', style: { height: '200px', display: 'flex', flexDirection: 'column' } },
  h(ErrorNotice, {
    t: (key: string) => key,
    notice: {
      kind: 'error',
      title: '分支操作失败',
      text: '创建分支失败：分支已存在',
      detail: 'HTTP 409\nGitApiError: branch already exists\n    at GitViewPanel (client.js:1200:13)',
      sticky: true,
      at: 1,
    },
    onClose: () => {},
  }),
)

/** One labelled block in the gallery. */
function shot(label: string, element: React.ReactNode, height: string, wide = false): React.ReactElement {
  return h(
    'section',
    { className: `shot${wide ? ' shot-wide' : ''}`, style: { height } },
    h('h2', null, label),
    h('div', { className: 'shot-body' }, element),
  )
}

/** The gallery page: every surface at once, so one screenshot covers the panel. */
export const GALLERY: React.ReactElement = h(
  'div',
  { className: 'gallery' },
  styleTag,
  shot('Controls: toolbar + dropdown', h('div', { className: 'gv-root' }, fixture('Toolbar'), h('div', { className: 'gv-toolbar' }, fixture('Dropdown'), h('div', { className: 'gv-spacer' }), h('div', { className: 'gv-sync' }, h('button', { type: 'button', className: 'gv-icon-button' }, h('span', null, '↑'))))), '180px', true),
  shot('Exception banner', errorBanner, '220px', true),
  shot('Full panel (tree + changes | graph | details)', fullPanel, '800px', true),
  shot('Compact panel (details below)', compactPanel, '660px'),
  shot('States: error, paused merge, conflict notice', statesPanel, '560px'),
  shot('Changes pane', h('div', { className: 'gv-root' }, fixture('ChangesPane')), '420px'),
  shot('Commit pane', h('div', { className: 'gv-root' }, fixture('CommitPane')), '380px'),
  shot('Tree pane', h('div', { className: 'gv-root' }, fixture('FileTreePane')), '280px'),
  shot('Details pane', h('div', { className: 'gv-root' }, fixture('DetailsPane (older)')), '380px'),
  shot('Compare dialog', fixture('CompareDialog'), '520px', true),
  shot('Action dialog', fixture('ActionDialog'), '360px'),
  shot('Rollback dialog', fixture('RollbackDialog'), '420px'),
  shot('Menu + spinner', h('div', { className: 'gv-root' }, fixture('PopupMenu'), h('div', { className: 'gv-loading' }, fixture('Spinner'), ' loading')), '240px'),
)

/** Every fixture, for the per-case screenshots. */
export const ALL_CASES: Array<{ name: string; element: React.ReactElement }> = [
  ...CASES,
  { name: 'Full panel', element: fullPanel },
  { name: 'Gallery', element: GALLERY },
]
