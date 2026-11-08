/**
 * Component fixtures for `scripts/smoke-panes.mjs`.
 *
 * Bundled by the smoke script with esbuild; never shipped to the browser.
 */
import * as React from 'react'
import { Toolbar } from '../src/client/panes/Toolbar.js'
import { FileTreePane } from '../src/client/panes/FileTreePane.js'
import { ChangesPane } from '../src/client/panes/ChangesPane.js'
import { CommitPane } from '../src/client/panes/CommitPane.js'
import { computeRows } from '../src/client/panes/graph.js'
import { DetailsPane } from '../src/client/panes/DetailsPane.js'
import { CompareDialog } from '../src/client/panes/CompareDialog.js'
import { Dropdown } from '../src/client/ui/Dropdown.js'
import { PopupMenu } from '../src/client/ui/PopupMenu.js'
import { ActionDialog } from '../src/client/ui/ActionDialog.js'
import { RollbackDialog } from '../src/client/ui/RollbackDialog.js'
import { ResizeHandle } from '../src/client/ui/ResizeHandle.js'
import { Spinner } from '../src/client/ui/Spinner.js'
import type { CommitRow, CommitDetails, GitRepo, LogPayload, RepoState, StatusEntry } from '../src/client/types.js'
import { zh } from '../src/client/i18n.js'

const t = (key: string) => (zh as Record<string, string>)[key] || key
const noop = () => {}

const repo: GitRepo = { id: 'w1', title: 'demo', path: '/tmp/demo', root: '/tmp/demo' }
const state: RepoState = {
  branch: 'main',
  hash: 'aaa1111',
  detached: false,
  unborn: false,
  operation: '',
  upstream: 'origin/main',
  ahead: 2,
  behind: 1,
}

const entry: StatusEntry = {
  path: 'src/app.ts',
  status: 'M',
  x: ' ',
  y: 'M',
  untracked: false,
  staged: false,
  unstaged: true,
  conflict: false,
}

const treeEntries: StatusEntry[] = [
  entry,
  {
    path: 'src/panes/ChangesPane.tsx',
    status: 'A',
    x: 'A',
    y: ' ',
    untracked: true,
    staged: true,
    unstaged: false,
    conflict: false,
  },
  {
    path: 'README.md',
    status: '?',
    x: '?',
    y: '?',
    untracked: true,
    staged: false,
    unstaged: true,
    conflict: false,
  },
]

/** One ChangesPane fixture; the tree case only overrides view/entries. */
function changesCase(overrides: Record<string, unknown>): React.ReactElement {
  return React.createElement(ChangesPane as never, {
    t,
    repo,
    scope: '',
    entries: [entry],
    totalCount: 1,
    loading: false,
    error: '',
    selected: new Set(['src/app.ts']),
    message: 'feat(panel): add remote sync',
    busy: false,
    disabled: false,
    aiBusy: false,
    repoNotice: null,
    repoState: state,
    commitError: '',
    height: 260,
    view: 'list',
    onToggle: noop,
    onTogglePaths: noop,
    onToggleAll: noop,
    onView: noop,
    onRefresh: noop,
    onRollback: noop,
    onMessage: noop,
    onCommit: noop,
    onGenerate: noop,
    onDiscard: noop,
    onResolve: noop,
    onContinue: noop,
    onAbort: noop,
    ...overrides,
  })
}

const commits: CommitRow[] = [
  {
    hash: 'aaa1111',
    parents: ['bbb2222'],
    author: 'Ada',
    email: 'ada@example.com',
    date: '2026-01-02T03:04:05+08:00',
    committer: 'Ada',
    committerEmail: 'ada@example.com',
    commitDate: '2026-01-02T03:04:05+08:00',
    subject: 'feat(panel): add remote sync',
    refs: [{ name: 'main', kind: 'branch', head: true }],
  },
  {
    hash: 'bbb2222',
    parents: ['ccc3333'],
    author: 'Linus',
    email: 'linus@example.com',
    date: '2026-01-01T03:04:05+08:00',
    committer: 'Linus',
    committerEmail: 'linus@example.com',
    commitDate: '2026-01-01T03:04:05+08:00',
    subject: 'fix(core): handle empty repository',
    refs: [],
  },
]

const log: LogPayload = {
  repo,
  scope: '',
  head: { branch: 'main', hash: 'aaa1111', detached: false },
  refs: [
    { ref: 'refs/heads/main', name: 'main', kind: 'branch', head: true },
    { ref: 'refs/remotes/origin/main', name: 'origin/main', kind: 'remote', head: false },
  ],
  commits,
  state,
}

const details: CommitDetails = {
  hash: 'aaa1111',
  shortHash: 'aaa1111',
  parents: ['bbb2222'],
  author: { name: 'Ada', email: 'ada@example.com' },
  date: '2026-01-02T03:04:05+08:00',
  committer: { name: 'Ada', email: 'ada@example.com' },
  commitDate: '2026-01-02T03:04:05+08:00',
  subject: 'feat(panel): add remote sync',
  message: 'feat(panel): add remote sync\n\nDetails.',
  files: [
    { status: 'M', path: 'src/app.ts', additions: 4, deletions: 1, binary: false },
    { status: 'A', path: 'src/remote.ts', additions: 40, deletions: 0, binary: false },
  ],
  scope: '',
}

const diff = {
  repo,
  hash: 'aaa1111',
  path: 'src/app.ts',
  truncated: false,
  text: [
    'diff --git a/src/app.ts b/src/app.ts',
    'index 111..222 100644',
    '--- a/src/app.ts',
    '+++ b/src/app.ts',
    '@@ -1,3 +1,4 @@',
    ' const a = 1',
    '-const b = 2',
    '+const b = 3',
    '+const c = 4',
    ' const d = 5',
    '',
  ].join('\n'),
}

const branchOptions = [
  {
    value: '',
    label: 'all refs',
    icon: 'all',
    actions: [{ id: 'create', label: 'New branch…', onSelect: noop }],
  },
  {
    value: 'refs/heads/main',
    label: 'main',
    head: true,
    group: 'Local',
    actions: [
      { id: 'merge', label: 'Merge into current', onSelect: noop },
      { separator: true },
      { id: 'delete', label: 'Delete', danger: true, onSelect: noop },
    ],
  },
]

export const CASES: Array<{ name: string; element: React.ReactElement }> = [
  {
    name: 'Toolbar',
    element: React.createElement(Toolbar as never, {
      t,
      repos: [repo],
      repoId: 'w1',
      onRepo: noop,
      log,
      refValue: '',
      onRef: noop,
      branchOptions,
      query: '',
      onQuery: noop,
      count: commits.length,
      matchCount: null,
      onRefresh: noop,
      sync: state,
      syncBusy: false,
      onFetch: noop,
      onPull: noop,
      onPush: noop,
    }),
  },
  {
    name: 'FileTreePane',
    element: React.createElement(FileTreePane as never, {
      t,
      repo,
      scope: '',
      refName: '',
      children: {
        '': [
          { name: 'src', path: 'src', type: 'tree', status: '', untracked: false, conflict: false, dirty: true },
          { name: 'docs', path: 'docs', type: 'tree', status: '', untracked: false, conflict: false, dirty: false },
        ],
        src: [{ name: 'app.ts', path: 'src/app.ts', type: 'blob', status: 'M', untracked: false, conflict: false, dirty: false }],
      },
      expanded: new Set(['src']),
      loading: new Set(),
      errors: {},
      onSelect: noop,
      onToggle: noop,
      onRetryRoot: noop,
    }),
  },
  {
    name: 'ChangesPane',
    element: changesCase({}),
  },
  {
    name: 'ChangesPane (tree)',
    element: changesCase({
      view: 'tree',
      entries: treeEntries,
      selected: new Set(['src/app.ts', 'src/panes/ChangesPane.tsx']),
      totalCount: treeEntries.length,
    }),
  },
  {
    name: 'CommitPane',
    element: React.createElement(CommitPane as never, {
      t,
      log,
      loading: false,
      error: '',
      commits,
      rows: computeRows(commits),
      graphWidth: 40,
      matches: null,
      selected: 'aaa1111',
      scope: '',
      state,
      narrow: false,
      inputRef: { current: null },
      busy: false,
      onSelect: noop,
      onRefresh: noop,
      onClearScope: noop,
      onContinue: noop,
      onAbort: noop,
      onMenu: noop,
    }),
  },
  {
    name: 'DetailsPane (HEAD)',
    element: React.createElement(DetailsPane as never, {
      t,
      commit: commits[0],
      details,
      loading: false,
      error: '',
      copied: false,
      scope: '',
      headHash: 'aaa1111',
      onCopy: noop,
      onCompare: noop,
      onSelectHash: noop,
      onHistory: noop,
    }),
  },
  {
    name: 'DetailsPane (older)',
    element: React.createElement(DetailsPane as never, {
      t,
      commit: commits[1],
      details: { ...details, hash: 'bbb2222', shortHash: 'bbb2222', parents: ['ccc3333'] },
      loading: false,
      error: '',
      copied: false,
      scope: '',
      headHash: 'aaa1111',
      onCopy: noop,
      onCompare: noop,
      onSelectHash: noop,
      onHistory: noop,
    }),
  },
  {
    name: 'CompareDialog',
    element: React.createElement(CompareDialog as never, {
      t,
      file: details.files[0],
      commitHash: 'aaa1111',
      diff,
      loading: false,
      error: '',
      onClose: noop,
    }),
  },
  {
    name: 'Dropdown',
    element: React.createElement(Dropdown as never, {
      t,
      label: 'branch',
      value: '',
      options: branchOptions,
      onChange: noop,
      icon: 'branch',
    }),
  },
  {
    name: 'PopupMenu',
    element: React.createElement(PopupMenu as never, {
      t,
      menu: { x: 10, y: 10, items: [{ id: 'copy', label: 'Copy hash', onSelect: noop }, { separator: true }, { id: 'undo', label: 'Undo', danger: true, onSelect: noop }] },
      onClose: noop,
    }),
  },
  {
    name: 'ActionDialog',
    element: React.createElement(ActionDialog as never, {
      t,
      dialog: { kind: 'branch', title: 'Checkout', description: 'demo', input: true, label: 'Name', initialValue: 'main', confirmLabel: 'OK' },
      busy: false,
      error: '',
      onClose: noop,
      onConfirm: noop,
    }),
  },
  {
    name: 'RollbackDialog',
    element: React.createElement(RollbackDialog as never, { t, entries: [entry], busy: false, error: '', onClose: noop, onConfirm: noop }),
  },
  {
    name: 'ResizeHandle',
    element: React.createElement(ResizeHandle as never, { label: 'resize', value: 280, min: 160, max: 520, onChange: noop, onCommit: noop, onReset: noop }),
  },
  {
    name: 'Spinner',
    element: React.createElement(Spinner as never, { label: 'loading' }),
  },
]
