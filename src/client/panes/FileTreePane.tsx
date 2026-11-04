/**
 * Lazily loaded repository folder tree.
 *
 * This is a typed port of the legacy `FileTreePane` and its `flattenTree`
 * helper in `client.js`. The pane only ever renders the cache the panel hands
 * down; it never fetches folders itself.
 */
import * as React from 'react'
import { FileIcon, IconChevron, IconFolder, IconHome } from '../icons.js'
import { Spinner } from '../ui/Spinner.js'
import type { GitRepo, Translate, TreeEntry } from '../types.js'

const h = React.createElement

/** One visible tree row: the cached entry plus its indent depth. */
export interface TreeRow extends TreeEntry {
  depth: number
}

/**
 * Flatten the lazily loaded folder cache into visible rows.
 * @param children - cache of folder path to its entries.
 * @param expanded - expanded directory paths.
 * @returns rows with a depth field, parents before their children.
 */
export function flattenTree(children: Record<string, TreeEntry[]>, expanded: Set<string>): TreeRow[] {
  const rows: TreeRow[] = []
  const walk = (path: string, depth: number): void => {
    for (const entry of children[path] || []) {
      rows.push({ ...entry, depth })
      if (entry.type === 'tree' && expanded.has(entry.path)) walk(entry.path, depth + 1)
    }
  }
  walk('', 0)
  return rows
}

export interface FileTreePaneProps {
  t: Translate
  repo: GitRepo | null
  scope: string
  refName?: string
  children: Record<string, TreeEntry[]>
  expanded: Set<string>
  loading: Set<string>
  errors: Record<string, string>
  onSelect: (entry: TreeEntry | null) => void
  onToggle: (path: string) => void
  onRetryRoot: () => void
}

/**
 * CSS tone suffix for one single-letter status glyph.
 * @param letter - status letter, including the synthetic `?` for untracked.
 * @returns tone name used by the `gv-tone-*` classes.
 */
function statusTone(letter: string): string {
  if (letter === '?') return 'untracked'
  if (letter === 'U') return 'conflict'
  if (letter === 'A') return 'added'
  if (letter === 'D') return 'deleted'
  if (letter === 'R') return 'staged'
  return 'modified'
}

/**
 * Render the file tree column.
 * @param props - tree cache, selection, and callbacks.
 * @returns the tree pane element.
 */
export function FileTreePane(props: FileTreePaneProps): React.ReactElement {
  const { t, repo, scope, children, expanded, loading, errors, onSelect, onToggle, onRetryRoot, refName } = props
  const nodes = React.useMemo(() => flattenTree(children, expanded), [children, expanded])
  const rootLoading = loading.has('')
  const rootError = errors['']
  const projectName = repo
    ? repo.title || String(repo.root || '').split(/[\\/]/).filter(Boolean).pop() || ''
    : ''

  const activate = (event: React.KeyboardEvent<HTMLElement>, callback: () => void): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    callback()
  }

  return h(
    'div',
    { className: 'gv-tree' },
    h(
      'div',
      { className: 'gv-tree-head' },
      h(
        'span',
        { className: 'gv-tree-heading' },
        h('span', { className: 'gv-head-icon', 'aria-hidden': true }, h(IconFolder, { size: 12 })),
        h('span', null, t('filesTab')),
      ),
      refName
        ? h('span', { className: 'gv-tree-rootname gv-tree-refmode', title: refName }, `${t('historyTreeHint')} · ${refName}`)
        : h('span', { className: 'gv-tree-rootname', title: repo ? repo.root : '' }, projectName),
    ),
    h(
      'div',
      { className: 'gv-tree-scroll', role: 'tree', 'aria-label': t('filesTab') },
      h(
        'div',
        {
          className: `gv-tree-row gv-tree-root${scope === '' ? ' gv-tree-selected' : ''}`,
          role: 'treeitem',
          'aria-selected': scope === '',
          'aria-level': 1,
          tabIndex: 0,
          title: repo ? repo.root : '',
          onClick: () => onSelect(null),
          onKeyDown: (event) => activate(event, () => onSelect(null)),
        },
        h(IconHome, { size: 13 }),
        h('span', { className: 'gv-tree-name' }, projectName || t('rootLabel')),
      ),
      nodes.map((node) => {
        const isDir = node.type === 'tree'
        const isOpen = isDir && expanded.has(node.path)
        const isLoading = loading.has(node.path)
        const error = errors[node.path]
        return h(
          'div',
          {
            key: node.path,
            className: `gv-tree-row${isDir ? ' gv-tree-dir' : ''}${scope === node.path ? ' gv-tree-selected' : ''}`,
            role: 'treeitem',
            'aria-selected': scope === node.path,
            'aria-expanded': isDir ? isOpen : undefined,
            'aria-level': node.depth + 2,
            tabIndex: 0,
            style: { paddingLeft: `${8 + node.depth * 14}px` },
            title: error ? `${node.path}\n${error}` : node.path,
            onClick: () => onSelect(node),
            onKeyDown: (event) => activate(event, () => onSelect(node)),
          },
          isDir
            ? h(
                'button',
                {
                  type: 'button',
                  className: `gv-chevron${isOpen ? ' gv-chevron-open' : ''}`,
                  'aria-label': isOpen ? t('collapse') : t('expand'),
                  tabIndex: -1,
                  onClick: (event) => {
                    event.stopPropagation()
                    onToggle(node.path)
                  },
                },
                h(IconChevron, { size: 10 }),
              )
            : h('span', { className: 'gv-chevron-space' }),
          h(FileIcon, { name: node.name, isDir, open: isOpen, size: 14 }),
          h('span', { className: 'gv-tree-name' }, node.name),
          isDir && node.dirty ? h('span', { className: 'gv-tree-dirty', title: t('modifiedHint'), 'aria-hidden': true }) : null,
          !isDir && node.status
            ? h(
                'span',
                {
                  className: `gv-tree-status gv-tone-${statusTone(node.status)}`,
                  title: node.status === '?' ? t('untracked') : t('modifiedHint'),
                },
                node.status,
              )
            : null,
          isLoading ? h('span', { className: 'gv-tree-spinner', 'aria-hidden': true }) : null,
          error ? h('span', { className: 'gv-tree-error-mark', title: error }, '!') : null,
        )
      }),
      rootLoading && nodes.length === 0 ? h(Spinner, { label: t('loadingTree') }) : null,
      rootError
        ? h(
            'div',
            { className: 'gv-tree-state' },
            h('span', null, t('treeError')),
            h('button', { type: 'button', className: 'gv-button', onClick: onRetryRoot }, t('retry')),
          )
        : null,
      !rootLoading && !rootError && nodes.length === 0
        ? h('div', { className: 'gv-tree-state' }, t('treeEmpty'))
        : null,
    ),
  )
}
