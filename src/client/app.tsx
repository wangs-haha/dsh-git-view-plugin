/**
 * Stateful Git panel: repositories, branch filter, scoped history, working-tree
 * changes, commit composer, branch/history operations, and remote jobs.
 *
 * This is the typed port of the legacy `GitViewPanel`: the same state machine,
 * effects and request lifecycle, but the transport lives in {@link GitApi},
 * layout persistence in {@link LayoutStore}, notices in {@link NoticeCenter}
 * and fetch/pull/push polling in {@link RemoteRunner}. The presentational panes
 * receive the state through their fixed prop contracts.
 */
import * as React from 'react'
import { GitApi, errorText, isAbort } from './api.js'
import {
  DEFAULT_CHANGES,
  DEFAULT_LEFT,
  DEFAULT_RIGHT,
  LayoutStore,
  MAX_LEFT,
  MAX_RIGHT,
  MIN_CHANGES,
  MIN_LEFT,
  MIN_RIGHT,
  type ChangesView,
} from './layout.js'
import {
  COMPACT_WIDTH,
  MIN_CENTER,
  MIN_TREE,
  SPLIT_SIZE,
  TABLE_CHROME_WIDTH,
} from './metrics.js'
import {
  historyHintKey,
  historyLabelKey,
  localNameForRemote,
  looksLikeBranchName,
  operationLabel,
  remoteDoneKey,
  remoteOpKey,
  uiLocale,
} from './format.js'
import { IconGraphMark, IconRefresh } from './icons.js'
import { errorTitleKey, isPluginError, normalizeError } from './errors.js'
import type { Notice } from './notices.js'
import { NoticeCenter } from './notices.js'
import { RemoteRunner } from './remote.js'
import { holdFreshnessReload, releaseFreshnessReload } from './selfcheck.js'
import { PANEL_CSS } from './styles.js'
import type {
  CommitDetails,
  CommitFile,
  CommitRow,
  DialogConfig,
  DiffPayload,
  GitRepo,
  LogPayload,
  MenuItem,
  RefEntry,
  RemoteOp,
  RemoteSnapshot,
  RepoState,
  StatusEntry,
  Translate,
  TreeEntry,
} from './types.js'
import { ActionDialog } from './ui/ActionDialog.js'
import { ErrorNotice } from './ui/ErrorNotice.js'
import { ErrorState } from './ui/ErrorState.js'
import { PopupMenu } from './ui/PopupMenu.js'
import { ResizeHandle } from './ui/ResizeHandle.js'
import { RollbackDialog } from './ui/RollbackDialog.js'
import { Spinner } from './ui/Spinner.js'
import type { DropdownOption } from './ui/Dropdown.js'
import { ChangesPane } from './panes/ChangesPane.js'
import { CommitPane, computeRows } from './panes/CommitPane.js'
import { CompareDialog } from './panes/CompareDialog.js'
import { DetailsPane } from './panes/DetailsPane.js'
import { FileTreePane } from './panes/FileTreePane.js'
import { Toolbar } from './panes/Toolbar.js'
import { GRAPH_PAD, LANE_WIDTH } from './panes/graph.js'

const h = React.createElement

/** Interval of the working-tree status poll. */
const STATUS_POLL_MS = 20_000
/** Minimum gap between two tree refreshes triggered by the status poll. */
const TREE_REFRESH_THROTTLE_MS = 3000
/** How long the remote progress strip stays after the job settles. */
const REMOTE_STRIP_MS = 6000
/** How long the "copied" flash stays visible. */
const COPIED_MS = 1600

/** Translator used when the host does not pass one. */
const IDENTITY: Translate = (key: string): string => key

/** Cached folder contents, keyed by repository-relative directory path. */
type TreeChildren = Record<string, TreeEntry[]>

/** One open file comparison. */
interface CompareState {
  file: CommitFile
  hash: string
}

/** One open commit-row context menu. */
interface CommitMenuState {
  commit: CommitRow
  x: number
  y: number
}

/** Result of the `repos` read action. */
interface ReposPayload {
  repos: GitRepo[]
}

/** Result of the `tree` read action. */
interface TreePayload {
  entries: TreeEntry[]
}

/** Result of the `status` read action. */
interface StatusPayload {
  entries: StatusEntry[]
}

/** Result of the `commit` write action. */
interface CommitPayload {
  shortHash?: string
  hash?: string
}

/** Result of the `message` write action. */
interface MessagePayload {
  message?: string
}

/** Result of one branch write action. */
interface BranchPayload {
  newName?: string
  branch?: string
  checkout?: boolean
}

/** Value a dialog hands back when the user confirms. */
interface ConfirmValue {
  value: string
  checked: boolean
}

/**
 * Whether a path belongs to the selected scope.
 * @param path - repository-relative path.
 * @param scope - selected folder/file path, '' for the root.
 * @returns whether the path is inside the scope.
 */
function inScope(path: string, scope: string): boolean {
  return !scope || path === scope || path.startsWith(`${scope}/`)
}

/**
 * Read a string out of an untyped request payload.
 * @param value - candidate value.
 * @returns the value when it is a string, otherwise ''.
 */
function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Whether a caught write error reports a paused Git operation or a conflict.
 * @param error - caught value.
 * @returns whether the panel should show it as a repository notice.
 */
function isOperationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { conflict?: unknown; state?: unknown }
  if (candidate.conflict === true) return true
  const state = candidate.state as RepoState | null
  return Boolean(state && state.operation)
}

/**
 * Build the error snapshot for a remote job whose polling failed.
 * @param previous - last known snapshot, if any.
 * @param op - the remote operation.
 * @param error - display message.
 * @returns a settled error snapshot.
 */
function remoteErrorSnapshot(previous: RemoteSnapshot | null, op: RemoteOp, error: string): RemoteSnapshot {
  return {
    id: previous ? previous.id : '',
    op,
    label: previous ? previous.label : '',
    state: 'error',
    percent: previous ? previous.percent : null,
    exitCode: null,
    error,
    lines: [],
    startedAt: previous ? previous.startedAt : Date.now(),
    endedAt: Date.now(),
  }
}

/**
 * Render the Git panel.
 * @param props - optional translator handed down by the host slot.
 * @returns the panel element.
 */
export function GitViewPanel({ t }: { t?: Translate }): React.ReactElement {
  const translate = t ?? IDENTITY
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const [api] = React.useState(() => new GitApi())
  const [layout] = React.useState(() => new LayoutStore())
  const [notices] = React.useState(() => new NoticeCenter())

  const [repos, setRepos] = React.useState<GitRepo[] | null>(null)
  const [repoId, setRepoId] = React.useState('')
  const [reposError, setReposError] = React.useState('')
  const [reposTick, setReposTick] = React.useState(0)

  const [log, setLog] = React.useState<LogPayload | null>(null)
  const [logError, setLogError] = React.useState('')
  const [loadingLog, setLoadingLog] = React.useState(false)
  const [refValue, setRefValue] = React.useState('')
  const [reloadTick, setReloadTick] = React.useState(0)

  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState('')
  const [scope, setScope] = React.useState('')

  const [details, setDetails] = React.useState<CommitDetails | null>(null)
  const [detailsError, setDetailsError] = React.useState('')
  const [loadingDetails, setLoadingDetails] = React.useState(false)

  const [compare, setCompare] = React.useState<CompareState | null>(null)
  const [diff, setDiff] = React.useState<DiffPayload | null>(null)
  const [diffError, setDiffError] = React.useState('')
  const [loadingDiff, setLoadingDiff] = React.useState(false)

  const [treeChildren, setTreeChildren] = React.useState<TreeChildren>({})
  const [treeExpanded, setTreeExpanded] = React.useState<Set<string>>(() => new Set())
  const [treeLoading, setTreeLoading] = React.useState<Set<string>>(() => new Set())
  const [treeErrors, setTreeErrors] = React.useState<Record<string, string>>({})
  const treeGeneration = React.useRef(0)
  const treeChildrenRef = React.useRef<TreeChildren>({})
  const treeLoadingRef = React.useRef<Set<string>>(new Set())
  const lastTreeRefresh = React.useRef(0)

  const [changes, setChanges] = React.useState<StatusEntry[] | null>(null)
  const [changesError, setChangesError] = React.useState('')
  const [changesLoading, setChangesLoading] = React.useState(false)
  const [changesTick, setChangesTick] = React.useState(0)
  const [changesView, setChangesView] = React.useState<ChangesView>(() => layout.readChangesView())
  const [deselectedChanges, setDeselectedChanges] = React.useState<Set<string>>(() => new Set())
  const [commitMessage, setCommitMessage] = React.useState('')
  const messageRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [rollbackOpen, setRollbackOpen] = React.useState(false)
  const [rollbackBusy, setRollbackBusy] = React.useState(false)
  const [rollbackError, setRollbackError] = React.useState('')
  const [commitMenu, setCommitMenu] = React.useState<CommitMenuState | null>(null)
  const [remoteJob, setRemoteJob] = React.useState<RemoteSnapshot | null>(null)
  const remoteClearTimer = React.useRef<number | null>(null)
  const runnerRef = React.useRef<RemoteRunner | null>(null)
  const [commitBusy, setCommitBusy] = React.useState(false)
  const [commitAiBusy, setCommitAiBusy] = React.useState(false)
  const [commitError, setCommitError] = React.useState('')

  const [actionDialog, setActionDialog] = React.useState<DialogConfig | null>(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState('')

  const [leftWidth, setLeftWidth] = React.useState(() => layout.readWidth('left', MIN_LEFT, MAX_LEFT))
  const [rightWidth, setRightWidth] = React.useState(() => layout.readWidth('right', MIN_RIGHT, MAX_RIGHT))
  const [changesHeight, setChangesHeight] = React.useState(() =>
    layout.readWidth('changes', MIN_CHANGES, 900),
  )
  const [leftHeight, setLeftHeight] = React.useState(0)
  const leftRef = React.useRef<HTMLDivElement | null>(null)
  const [panelWidth, setPanelWidth] = React.useState(1200)
  const [compact, setCompact] = React.useState(false)

  const [copied, setCopied] = React.useState(false)
  const copyTimer = React.useRef<number | null>(null)

  const [repoNotice, setRepoNotice] = React.useState<Notice | null>(null)

  React.useEffect(() => notices.subscribe(setRepoNotice), [notices])

  /**
   * Show one operation failure in the panel-level exception banner. Every
   * command funnels through here so the title, message, detail and dismiss
   * affordance are identical regardless of which pane started it.
   * @param context - `commit`, `branch`, `remote`, `history`, `discard`, ...
   * @param message - user-facing message.
   * @param detail - copyable technical detail.
   */
  const reportMessage = React.useCallback(
    (context: string, message: string, detail = '') => {
      notices.show(message || translate('errorUnknown'), 'error', {
        title: translate(errorTitleKey(context)),
        detail,
        sticky: true,
      })
    },
    [notices, translate],
  )

  /**
   * Normalize a caught value and report it through {@link reportMessage}.
   * @param context - operation name used for the banner title.
   * @param error - caught value.
   */
  const reportError = React.useCallback(
    (context: string, error: unknown) => {
      if (isAbort(error)) return
      const info = normalizeError(error)
      if (info.kind === 'abort') return
      console.error(`[git-view] ${context}:`, error)
      reportMessage(context, info.message, info.detail)
    },
    [reportMessage],
  )

  // Global safety net: uncaught renderer errors and promise rejections that
  // originate in this bundle still reach the same banner. Errors from the host
  // or other plugins are ignored by the bundle-id filter.
  React.useEffect(() => {
    const onError = (event: ErrorEvent): void => {
      const value = event.error ?? event.message
      if (!isPluginError(value) && !isPluginError(event.filename)) return
      reportError('window', value)
    }
    const onRejection = (event: PromiseRejectionEvent): void => {
      if (!isPluginError(event.reason)) return
      event.preventDefault()
      reportError('promise', event.reason)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [reportError])

  const applyScope = React.useCallback((next: string) => {
    setScope(next)
    setSelected('')
    setDetails(null)
    setDetailsError('')
    setCompare(null)
    setDiff(null)
    setDiffError('')
    setCommitError('')
  }, [])

  const selectRepo = React.useCallback(
    (next: string) => {
      setRepoId(next)
      setRefValue('')
      setLog(null)
      setLogError('')
      setChanges(null)
      setChangesError('')
      setChangesLoading(false)
      setDeselectedChanges(new Set())
      setCommitMessage('')
        setCommitError('')
      setCommitBusy(false)
      setActionDialog(null)
      setActionError('')
      notices.clear()
      applyScope('')
      layout.writeRepo(next)
    },
    [applyScope, layout, notices],
  )

  const resetTree = React.useCallback(() => {
    treeGeneration.current += 1
    treeChildrenRef.current = {}
    treeLoadingRef.current = new Set()
    setTreeChildren({})
    setTreeExpanded(new Set())
    setTreeLoading(new Set())
    setTreeErrors({})
  }, [])

  const loadTree = React.useCallback(
    async (path: string, options: { force?: boolean } = {}): Promise<void> => {
      if (!repoId) return
      if (treeLoadingRef.current.has(path)) return
      const force = options.force === true
      if (!force && path && treeChildrenRef.current[path]) return
      const generation = treeGeneration.current
      treeLoadingRef.current.add(path)
      setTreeLoading((previous) => new Set(previous).add(path))
      setTreeErrors((previous) => {
        if (!(path in previous)) return previous
        const next = { ...previous }
        delete next[path]
        return next
      })
      try {
        // The working tree is shown by default so untracked files (and any
        // directory created since the last commit) are visible; a branch
        // filter switches the pane to that revision's file list.
        const params: Record<string, string | number | undefined> = {
          repo: repoId,
          path,
          mode: refValue ? 'ref' : 'worktree',
        }
        if (refValue) params.ref = refValue
        const payload = await api.read<TreePayload>('tree', params)
        if (generation !== treeGeneration.current) return
        treeChildrenRef.current = { ...treeChildrenRef.current, [path]: payload.entries || [] }
        setTreeChildren(treeChildrenRef.current)
      } catch (error) {
        if (generation !== treeGeneration.current) return
        setTreeErrors((previous) => ({ ...previous, [path]: errorText(error) }))
      } finally {
        if (generation === treeGeneration.current) {
          treeLoadingRef.current.delete(path)
          setTreeLoading((previous) => {
            const next = new Set(previous)
            next.delete(path)
            return next
          })
        }
      }
    },
    [repoId, refValue, api],
  )

  const refreshTree = React.useCallback(async (): Promise<void> => {
    if (!repoId) return
    const paths = new Set<string>([''])
    for (const key of Object.keys(treeChildrenRef.current)) {
      if (key) paths.add(key)
    }
    for (const path of paths) await loadTree(path, { force: true })
  }, [repoId, loadTree])

  React.useEffect(() => {
    const controller = new AbortController()
    setRepos(null)
    setReposError('')
    api
      .read<ReposPayload>('repos', {}, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        const list = Array.isArray(payload.repos) ? payload.repos : []
        setRepos(list)
        const saved = layout.readRepo()
        const pick = list.find((repo) => repo.id === saved) || list[0] || null
        selectRepo(pick ? pick.id : '')
      })
      .catch((error: unknown) => {
        if (!isAbort(error)) setReposError(errorText(error))
      })
    return () => controller.abort()
  }, [reposTick, selectRepo, api, layout])

  React.useEffect(() => {
    resetTree()
    if (!repoId) return
    void loadTree('')
  }, [repoId, refValue, resetTree, loadTree])

  // Manual refresh reloads the directories that are already open, keeping
  // the expansion state instead of collapsing the tree.
  React.useEffect(() => {
    if (!repoId || reloadTick === 0) return
    lastTreeRefresh.current = Date.now()
    void refreshTree()
  }, [reloadTick, repoId, refreshTree])

  // The status poll (and every write) bumps changesTick; pick up new and
  // deleted files within a few seconds without thrashing the disk.
  React.useEffect(() => {
    if (!repoId || changesTick === 0) return
    if (document.hidden) return
    const now = Date.now()
    if (now - lastTreeRefresh.current < TREE_REFRESH_THROTTLE_MS) return
    lastTreeRefresh.current = now
    void refreshTree()
  }, [changesTick, repoId, refreshTree])

  React.useEffect(() => {
    if (!repoId) {
      setLog(null)
      setLogError('')
      setLoadingLog(false)
      return undefined
    }
    const controller = new AbortController()
    setLoadingLog(true)
    setLogError('')
    const params: Record<string, string | number | undefined> = { repo: repoId, limit: '400' }
    if (refValue) params.ref = refValue
    if (scope) params.path = scope
    api
      .read<LogPayload>('log', params, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        setLog(payload)
        const commits = Array.isArray(payload.commits) ? payload.commits : []
        setSelected((previous) =>
          previous && commits.some((commit) => commit.hash === previous)
            ? previous
            : commits[0]
              ? commits[0].hash
              : '',
        )
        setLoadingLog(false)
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return
        setLogError(errorText(error))
        setLog(null)
        setLoadingLog(false)
      })
    return () => controller.abort()
  }, [repoId, refValue, scope, reloadTick, api])

  React.useEffect(() => {
    if (!repoId) {
      setChanges(null)
      setChangesError('')
      setChangesLoading(false)
      return undefined
    }
    const controller = new AbortController()
    setChangesLoading(true)
    setChangesError('')
    api
      .read<StatusPayload>('status', { repo: repoId }, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        const entries = Array.isArray(payload.entries) ? payload.entries : []
        setChanges(entries)
        setChangesLoading(false)
        setDeselectedChanges((previous) => {
          if (previous.size === 0) return previous
          const existing = new Set(entries.map((entry) => entry.path))
          const next = new Set([...previous].filter((path) => existing.has(path)))
          return next.size === previous.size ? previous : next
        })
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return
        setChangesError(errorText(error))
        setChanges(null)
        setChangesLoading(false)
      })
    return () => controller.abort()
  }, [repoId, changesTick, reloadTick, api])

  React.useEffect(() => {
    if (!repoId) return undefined
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setChangesTick((value) => value + 1)
    }, STATUS_POLL_MS)
    return () => window.clearInterval(timer)
  }, [repoId])

  React.useEffect(() => {
    if (!repoId || !selected) {
      setDetails(null)
      setDetailsError('')
      setLoadingDetails(false)
      return undefined
    }
    const controller = new AbortController()
    setLoadingDetails(true)
    setDetailsError('')
    const params: Record<string, string | number | undefined> = { repo: repoId, hash: selected }
    if (scope) params.path = scope
    api
      .read<CommitDetails>('commit', params, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        setDetails(payload)
        setLoadingDetails(false)
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return
        setDetails(null)
        setDetailsError(errorText(error))
        setLoadingDetails(false)
      })
    return () => controller.abort()
  }, [repoId, selected, scope, reloadTick, api])

  React.useEffect(() => {
    if (!repoId || !compare) {
      setDiff(null)
      setDiffError('')
      setLoadingDiff(false)
      return undefined
    }
    const controller = new AbortController()
    setLoadingDiff(true)
    setDiffError('')
    setDiff(null)
    api
      .read<DiffPayload>(
        'diff',
        { repo: repoId, hash: compare.hash, path: compare.file.path },
        controller.signal,
      )
      .then((payload) => {
        if (controller.signal.aborted) return
        setDiff(payload)
        setLoadingDiff(false)
      })
      .catch((error: unknown) => {
        if (isAbort(error)) return
        setDiffError(errorText(error))
        setLoadingDiff(false)
      })
    return () => controller.abort()
  }, [repoId, compare, api])

  React.useEffect(() => {
    const node = rootRef.current
    if (!node) return undefined
    const measure = (): void => {
      const width = node.clientWidth
      if (width <= 0) return
      setPanelWidth(width)
      setCompact(width < COMPACT_WIDTH)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const node = leftRef.current
    if (!node) return undefined
    const measure = (): void => setLeftHeight(node.clientHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [compact, repoId, repos])

  React.useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      if (remoteClearTimer.current !== null) window.clearTimeout(remoteClearTimer.current)
    },
    [],
  )

  // A rebuilt plugin reloads the page to pick up new code; never let that throw
  // away unsent work. While a draft message, a running action, or an open modal
  // exists, the reload is held and the self-check retries on its next tick.
  React.useEffect(() => {
    const key = 'git-view:work-in-progress'
    const working =
      commitMessage.trim().length > 0 ||
      commitBusy ||
      commitAiBusy ||
      rollbackBusy ||
      actionBusy ||
      rollbackOpen ||
      actionDialog !== null ||
      compare !== null
    if (working) holdFreshnessReload(key)
    else releaseFreshnessReload(key)
    return () => releaseFreshnessReload(key)
  }, [commitMessage, commitBusy, commitAiBusy, rollbackBusy, actionBusy, rollbackOpen, actionDialog, compare])

  const maxLeft = Math.max(
    MIN_LEFT,
    Math.min(MAX_LEFT, panelWidth - (compact ? 0 : rightWidth) - MIN_CENTER - SPLIT_SIZE * 2),
  )
  const maxRight = Math.max(
    MIN_RIGHT,
    Math.min(MAX_RIGHT, panelWidth - leftWidth - MIN_CENTER - SPLIT_SIZE * 2),
  )
  const maxChanges = Math.max(
    MIN_CHANGES,
    leftHeight > 0 ? leftHeight - MIN_TREE - (SPLIT_SIZE + 1) : 900,
  )

  React.useEffect(() => {
    setLeftWidth((value) => Math.min(value, maxLeft))
  }, [maxLeft])

  React.useEffect(() => {
    if (!compact) setRightWidth((value) => Math.min(value, maxRight))
  }, [compact, maxRight])

  React.useEffect(() => {
    setChangesHeight((value) => Math.min(Math.max(value, MIN_CHANGES), maxChanges))
  }, [maxChanges])

  const commits = React.useMemo(
    () => (log && Array.isArray(log.commits) ? log.commits : []),
    [log],
  )
  const rows = React.useMemo(() => computeRows(commits), [commits])
  const graphWidth = React.useMemo(() => {
    let laneCount = 1
    for (const row of rows) laneCount = Math.max(laneCount, row.width)
    return GRAPH_PAD * 2 + laneCount * LANE_WIDTH
  }, [rows])
  const centerWidth = compact
    ? panelWidth - leftWidth - SPLIT_SIZE
    : panelWidth - leftWidth - rightWidth - SPLIT_SIZE * 2
  const narrowCenter = centerWidth < graphWidth + TABLE_CHROME_WIDTH

  const normalizedQuery = query.trim().toLowerCase()
  const matches = React.useMemo(() => {
    if (!normalizedQuery) return null
    const result = new Set<number>()
    commits.forEach((commit, index) => {
      const haystack = `${commit.subject}\n${commit.author}\n${commit.hash}\n${commit.refs
        .map((entry) => entry.name)
        .join('\n')}`.toLowerCase()
      if (haystack.includes(normalizedQuery)) result.add(index)
    })
    return result
  }, [commits, normalizedQuery])

  const selectedCommit = React.useMemo(
    () => commits.find((commit) => commit.hash === selected) || null,
    [commits, selected],
  )
  const repo = React.useMemo(
    () => (repos || []).find((entry) => entry.id === repoId) || null,
    [repos, repoId],
  )
  const visibleChanges = React.useMemo(
    () => (changes || []).filter((entry) => inScope(entry.path, scope)),
    [changes, scope],
  )
  const selectedChangePaths = React.useMemo(
    () => visibleChanges.filter((entry) => !deselectedChanges.has(entry.path)).map((entry) => entry.path),
    [visibleChanges, deselectedChanges],
  )
  const selectedChangeSet = React.useMemo(() => new Set(selectedChangePaths), [selectedChangePaths])

  const copyHash = React.useCallback(async (hash: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
    } catch {
      /* clipboard permission denied */
    }
  }, [])

  const refresh = React.useCallback(() => {
    setReloadTick((value) => value + 1)
  }, [])

  const retryRepos = React.useCallback(() => {
    setReposTick((value) => value + 1)
  }, [])

  const chooseCommit = React.useCallback((hash: string) => {
    setSelected(hash)
    setCompare(null)
  }, [])

  const changeRef = React.useCallback(
    (value: string) => {
      setRefValue(value)
      applyScope('')
    },
    [applyScope],
  )

  const selectTreeNode = React.useCallback(
    (entry: TreeEntry | null) => {
      if (!entry) {
        applyScope('')
        return
      }
      applyScope(entry.path)
      if (entry.type === 'tree') {
        setTreeExpanded((previous) => {
          if (previous.has(entry.path)) return previous
          const next = new Set(previous)
          next.add(entry.path)
          return next
        })
        void loadTree(entry.path)
      }
    },
    [applyScope, loadTree],
  )

  const toggleDir = React.useCallback(
    (path: string) => {
      const isOpen = treeExpanded.has(path)
      setTreeExpanded((previous) => {
        const next = new Set(previous)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })
      if (!isOpen) void loadTree(path)
    },
    [treeExpanded, loadTree],
  )

  const retryTreeRoot = React.useCallback(() => {
    void loadTree('')
  }, [loadTree])

  const openCompare = React.useCallback(
    (entry: CommitFile) => {
      if (!selected) return
      setCompare({ file: entry, hash: selected })
    },
    [selected],
  )

  const closeCompare = React.useCallback(() => {
    setCompare(null)
  }, [])

  const toggleChange = React.useCallback((path: string) => {
    setDeselectedChanges((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const toggleAllChanges = React.useCallback(() => {
    setDeselectedChanges((previous) => {
      const allSelected =
        visibleChanges.length > 0 && visibleChanges.every((entry) => !previous.has(entry.path))
      const next = new Set(previous)
      for (const entry of visibleChanges) {
        if (allSelected) next.add(entry.path)
        else next.delete(entry.path)
      }
      return next
    })
  }, [visibleChanges])

  /** Select or deselect every file under one directory (tree view). */
  const toggleChangePaths = React.useCallback((paths: string[], select: boolean) => {
    setDeselectedChanges((previous) => {
      const next = new Set(previous)
      for (const path of paths) {
        if (select) next.delete(path)
        else next.add(path)
      }
      return next
    })
  }, [])

  const changeChangesView = React.useCallback(
    (next: ChangesView) => {
      setChangesView(next)
      layout.writeChangesView(next)
    },
    [layout],
  )

  const refreshChanges = React.useCallback(() => {
    setChangesTick((value) => value + 1)
  }, [])

  const performCommit = React.useCallback(async (): Promise<void> => {
    if (!repoId || commitBusy) return
    if (selectedChangePaths.length === 0) {
      setCommitError(translate('commitSelectRequired'))
      return
    }
    if (!commitMessage.trim()) {
      setCommitError(translate('commitMessageRequired'))
      return
    }
    setCommitBusy(true)
    setCommitError('')
    try {
      const payload = await api.write<CommitPayload>({
        repo: repoId,
        action: 'commit',
        paths: selectedChangePaths,
        message: commitMessage,
      })
      setCommitMessage('')
      setDeselectedChanges(new Set())
      setSelected('')
      setDetails(null)
      setDetailsError('')
      setCompare(null)
      setReloadTick((value) => value + 1)
      setChangesTick((value) => value + 1)
    } catch (error) {
      setCommitError('')
      reportError('commit', error)
    } finally {
      setCommitBusy(false)
    }
  }, [repoId, commitBusy, selectedChangePaths, commitMessage, translate, api, reportError])

  /**
   * Ask the model for a `type(scope): subject` draft and put it in the
   * message box. Nothing is committed: the user reviews and edits it first.
   */
  const generateMessage = React.useCallback(async (): Promise<void> => {
    if (!repoId || commitBusy || commitAiBusy) return
    if (selectedChangePaths.length === 0) {
      setCommitError(translate('commitSelectRequired'))
      return
    }
    setCommitAiBusy(true)
    setCommitError('')
    try {
      const payload = await api.write<MessagePayload>({
        repo: repoId,
        action: 'message',
        paths: selectedChangePaths,
        locale: uiLocale(),
      })
      const draft = typeof payload.message === 'string' ? payload.message : ''
      setCommitMessage(draft)
      window.requestAnimationFrame(() => {
        const node = messageRef.current
        if (!node) return
        node.focus()
        const end = node.value.length
        try {
          node.setSelectionRange(end, end)
        } catch {
          /* some input types reject ranges */
        }
      })
    } catch (error) {
      setCommitError('')
      reportError('ai', error)
    } finally {
      setCommitAiBusy(false)
    }
  }, [repoId, commitBusy, commitAiBusy, selectedChangePaths, translate, api, reportError])

  const commitSelected = React.useCallback(() => {
    void performCommit()
  }, [performCommit])

  const showRepoNotice = React.useCallback(
    (text: string) => {
      notices.show(text, 'ok')
    },
    [notices],
  )

  /**
   * Start one remote operation and follow it through {@link RemoteRunner}.
   * The progress strip shows git's last output line and percentage while it
   * runs.
   * @param op - fetch, pull, or push.
   * @param options - rebase / force-with-lease.
   */
  const runRemote = React.useCallback(
    async (op: RemoteOp, options: Record<string, boolean> = {}): Promise<void> => {
      if (!repoId) return
      setActionBusy(true)
      setActionError('')
      let started = false
      const runner = new RemoteRunner(api, (snapshot: RemoteSnapshot) => {
        started = true
        setRemoteJob(snapshot)
        setActionBusy(false)
        setActionDialog(null)
      })
      runnerRef.current = runner
      try {
        const start = await runner.start(repoId, op, options)
        started = true
        setActionBusy(false)
        setActionDialog(null)
        setRemoteJob({
          id: start.id,
          op,
          label: start.label,
          state: 'running',
          percent: null,
          exitCode: null,
          error: '',
          lines: [],
          startedAt: Date.now(),
          endedAt: null,
        })
        const snapshot = await runner.poll(repoId, start.id)
        runner.clear()
        setActionBusy(false)
        if (snapshot.state === 'done') {
          showRepoNotice(translate(remoteDoneKey(op)))
          refresh()
          setChangesTick((value) => value + 1)
        } else if (snapshot.state === 'cancelled') {
          showRepoNotice(translate('remoteCancelled'))
        } else {
          reportMessage('remote', snapshot.error || translate('remoteFailed'), (snapshot.lines || []).join('\n'))
        }
        if (remoteClearTimer.current !== null) window.clearTimeout(remoteClearTimer.current)
        remoteClearTimer.current = window.setTimeout(() => setRemoteJob(null), REMOTE_STRIP_MS)
      } catch (error) {
        setActionBusy(false)
        if (isAbort(error)) return
        if (!started) {
          reportError('remote', error)
          return
        }
        setRemoteJob((previous) => remoteErrorSnapshot(previous, op, errorText(error)))
        runner.clear()
        reportError('remote', error)
      }
    },
    [repoId, api, translate, showRepoNotice, refresh, reportError, reportMessage],
  )

  /**
   * Run fetch, pull, or push immediately. The progress strip carries running
   * output; there is no strategy dialog — Shift on pull/push selects rebase /
   * force-with-lease.
   * @param op - fetch, pull, or push.
   * @param options - rebase / force-with-lease.
   */
  const requestRemote = React.useCallback(
    (op: RemoteOp, options: Record<string, boolean> = {}) => {
      if (!repoId) return
      void runRemote(op, options)
    },
    [repoId, runRemote],
  )

  const cancelRemoteJob = React.useCallback(() => {
    if (!repoId || !remoteJob || remoteJob.state !== 'running') return
    void runnerRef.current?.cancel(repoId)
  }, [repoId, remoteJob])

  const executeBranchOp = React.useCallback(
    async (op: string, payload: Record<string, unknown>): Promise<boolean> => {
      if (!repoId || actionBusy) return false
      setActionBusy(true)
      setActionError('')
      try {
        const result = await api.write<BranchPayload>({ repo: repoId, action: 'branch', op, ...payload })
        const detailSource = result.newName || result.branch
        const detail = detailSource ? ` · ${detailSource}` : ''
        showRepoNotice(`${translate('branchDone')}${detail}`)
        const branch = asString(payload.branch)
        if (op === 'checkout' && result.branch) {
          setRefValue(`refs/heads/${result.branch}`)
        } else if (op === 'create' && result.checkout && result.branch) {
          setRefValue(`refs/heads/${result.branch}`)
        } else if (op === 'rename' && branch && refValue === `refs/heads/${branch}`) {
          setRefValue(`refs/heads/${result.newName ?? ''}`)
        } else if (op === 'delete' && branch && refValue === `refs/heads/${branch}`) {
          setRefValue('')
        }
        setCommitError('')
        setActionError('')
        setActionDialog(null)
        refresh()
        setChangesTick((value) => value + 1)
        return true
      } catch (error) {
        // A paused operation has new repository state to show; a plain input
        // rejection keeps the prompt open so the name can be corrected.
        if (isOperationError(error)) {
          setActionDialog(null)
          setActionError('')
          reportError('branch', error)
        } else if (actionDialog) {
          setActionError(errorText(error))
        } else {
          reportError('branch', error)
        }
        // A failed merge/rebase may still have changed the repository state.
        refresh()
        setChangesTick((value) => value + 1)
        return false
      } finally {
        setActionBusy(false)
      }
    },
    [repoId, actionBusy, refValue, translate, showRepoNotice, refresh, api, reportError, actionDialog],
  )

  const executeDiscard = React.useCallback(
    async (entry?: StatusEntry): Promise<void> => {
      if (!repoId || actionBusy || !entry) return
      setActionBusy(true)
      setActionError('')
      try {
        await api.write({ repo: repoId, action: 'discard', paths: [entry.path] })
        setActionDialog(null)
        setCommitError('')
        showRepoNotice(`${translate('discarded')} · ${entry.path}`)
        setChangesTick((value) => value + 1)
      } catch (error) {
        setActionError(errorText(error))
      } finally {
        setActionBusy(false)
      }
    },
    [repoId, actionBusy, translate, showRepoNotice, api],
  )

  const resolveConflict = React.useCallback(
    async (entry?: StatusEntry): Promise<void> => {
      if (!repoId || actionBusy || !entry) return
      setActionBusy(true)
      setActionError('')
      try {
        await api.write({ repo: repoId, action: 'resolve', paths: [entry.path] })
        showRepoNotice(`${translate('resolved')} · ${entry.path}`)
        setChangesTick((value) => value + 1)
      } catch (error) {
        reportError('discard', error)
      } finally {
        setActionBusy(false)
      }
    },
    [repoId, actionBusy, translate, showRepoNotice, api, reportError],
  )

  const requestDiscard = React.useCallback(
    (entry: StatusEntry) => {
      if (!entry) return
      const reason = entry.conflict
        ? translate('discardConflict')
        : entry.untracked
          ? translate('discardUntracked')
          : entry.x === 'A'
            ? translate('discardAdded')
            : entry.status === 'D'
              ? translate('discardDeleted')
              : translate('discardModified')
      setActionError('')
      setActionDialog({
        kind: 'discard',
        entry,
        title: `${translate('discardTitle')} · ${entry.path}`,
        description: reason,
        confirmLabel: translate('discardConfirm'),
        danger: true,
      })
    },
    [translate],
  )

  const executeRollback = React.useCallback(
    async (paths: string[], deleteAdded: boolean): Promise<void> => {
      if (!repoId || rollbackBusy) return
      setRollbackBusy(true)
      setRollbackError('')
      try {
        await api.write({ repo: repoId, action: 'rollback', paths, deleteAdded })
        setRollbackOpen(false)
        setCommitError('')
        setDeselectedChanges(new Set())
        showRepoNotice(`${translate('rollbackDone')} · ${paths.length}`)
        setChangesTick((value) => value + 1)
        setReloadTick((value) => value + 1)
      } catch (error) {
        setRollbackError(errorText(error))
      } finally {
        setRollbackBusy(false)
      }
    },
    [repoId, rollbackBusy, translate, showRepoNotice, api],
  )

  /**
   * Run one commit-level action from the details pane or a commit row.
   * @param op - undo, revert, cherryPick, or checkout.
   * @param hashArg - commit hash; falls back to the open details.
   */
  const executeHistoryOp = React.useCallback(
    async (op: string, hashArg?: string): Promise<unknown> => {
      if (!repoId || actionBusy) return undefined
      const hash = hashArg || (details && details.hash ? details.hash : '')
      setActionBusy(true)
      setActionError('')
      try {
        const result = await api.write<Record<string, unknown>>({
          repo: repoId,
          action: 'history',
          op,
          ...(hash ? { hash } : {}),
        })
        setActionDialog(null)
        showRepoNotice(`${translate('historyDone')} · ${translate(historyLabelKey(op))}`)
        setSelected('')
        setDetails(null)
        setDetailsError('')
        refresh()
        setChangesTick((value) => value + 1)
        return result
      } catch (error) {
        setActionDialog(null)
        reportError('history', error)
        refresh()
        setChangesTick((value) => value + 1)
        return null
      } finally {
        setActionBusy(false)
      }
    },
    [repoId, actionBusy, details, translate, showRepoNotice, refresh, api, reportError],
  )

  const requestHistoryOp = React.useCallback(
    (op: string, hashArg?: string) => {
      const hash = hashArg || (details && details.hash ? details.hash : '')
      if (op !== 'undo' && !hash) return
      setActionError('')
      setActionDialog({
        kind: 'history',
        op,
        payload: hash ? { hash } : {},
        title: translate(historyLabelKey(op)),
        description: translate(historyHintKey(op)),
        confirmLabel: translate(historyLabelKey(op)),
        danger: op === 'undo' || op === 'checkout',
      })
    },
    [details, translate],
  )

  const requestAbortOperation = React.useCallback(() => {
    setActionError('')
    setActionDialog({
      kind: 'branch',
      op: 'abort',
      title: translate('abortOperation'),
      description: translate('branchAbortConfirm'),
      confirmLabel: translate('abortOperation'),
      danger: true,
    })
  }, [translate])

  /**
   * Menu for one commit row. Items depend on the commit itself: the checked
   * out commit cannot be checked out or cherry-picked again, merge commits
   * cannot be reverted here, and "Undo" only exists for HEAD.
   * @param commit - commit row payload.
   * @returns menu items.
   */
  const buildCommitMenu = React.useCallback(
    (commit: CommitRow): MenuItem[] => {
      const head = log && log.head ? log.head.hash : ''
      const isHead = Boolean(head) && commit.hash === head
      const isMerge = Array.isArray(commit.parents) && commit.parents.length > 1
      const items: MenuItem[] = [
        {
          id: 'copy-hash',
          label: translate('copyHash'),
          hint: commit.hash.slice(0, 7),
          onSelect: () => void copyHash(commit.hash),
        },
        {
          id: 'copy-subject',
          label: translate('copyCommitMessage'),
          onSelect: () => {
            try {
              void navigator.clipboard.writeText(commit.subject || '')
            } catch {
              /* clipboard permission denied */
            }
          },
        },
        { separator: true },
      ]
      if (!isHead) {
        items.push({
          id: 'checkout',
          label: translate('checkoutCommit'),
          onSelect: () => requestHistoryOp('checkout', commit.hash),
        })
        if (!isMerge) {
          items.push({
            id: 'cherryPick',
            label: translate('cherryPickCommit'),
            onSelect: () => requestHistoryOp('cherryPick', commit.hash),
          })
        }
      }
      if (!isMerge) {
        items.push({
          id: 'revert',
          label: translate('revertCommit'),
          onSelect: () => requestHistoryOp('revert', commit.hash),
        })
      }
      if (isHead) {
        items.push({ separator: true })
        items.push({
          id: 'undo',
          label: translate('undoCommit'),
          danger: true,
          onSelect: () => requestHistoryOp('undo', commit.hash),
        })
      }
      return items
    },
    [log, translate, copyHash, requestHistoryOp],
  )

  const openCommitMenu = React.useCallback((commit: CommitRow, point: { x: number; y: number }) => {
    setSelected(commit.hash)
    setCommitMenu({ commit, x: point.x, y: point.y })
  }, [])

  const continueBranchOperation = React.useCallback(() => {
    void executeBranchOp('continue', {})
  }, [executeBranchOp])

  const confirmAction = React.useCallback(
    ({ value, checked }: ConfirmValue) => {
      const dialog = actionDialog
      if (!dialog || actionBusy) return
      if (dialog.kind === 'discard') {
        void executeDiscard(dialog.entry)
        return
      }
      if (dialog.kind === 'history') {
        void executeHistoryOp(dialog.op ?? '')
        return
      }
      const payload: Record<string, unknown> = { ...(dialog.payload || {}) }
      if (dialog.input) {
        const name = String(value || '').trim()
        if (!name) {
          setActionError(translate('branchNameRequired'))
          return
        }
        if (!looksLikeBranchName(name)) {
          setActionError(translate('invalidBranchName'))
          return
        }
        if (dialog.op === 'rename') payload.newName = name
        else payload.branch = name
      }
      if (dialog.op === 'create') payload.checkout = Boolean(checked)
      if (dialog.op === 'delete') payload.force = Boolean(checked)
      void executeBranchOp(dialog.op || '', payload)
    },
    [actionDialog, actionBusy, executeBranchOp, executeDiscard, executeHistoryOp, translate],
  )

  const closeActionDialog = React.useCallback(() => {
    if (actionBusy) return
    setActionDialog(null)
    setActionError('')
  }, [actionBusy])

  const refEntry = React.useMemo<RefEntry | null>(() => {
    if (!refValue || !log || !Array.isArray(log.refs)) return null
    return log.refs.find((entry) => entry.ref === refValue) || null
  }, [log, refValue])
  const branchState = log && log.state ? log.state : null

  /**
   * Actions for one branch row in the ref dropdown: browse (single click)
   * stays separate from acting on the branch (the row's "…" button).
   * @param entry - ref catalogue entry, or null for "all refs".
   * @returns menu items.
   */
  const buildBranchMenu = React.useCallback(
    (entry: RefEntry | null): MenuItem[] => {
      const items: MenuItem[] = []
      const current = branchState && branchState.branch ? branchState.branch : ''
      const entryName = entry
        ? entry.kind === 'tag'
          ? `${entry.name}${translate('tagSuffix')}`
          : entry.name
        : ''
      const open = (config: DialogConfig) => (): void => {
        setActionError('')
        setActionDialog(config)
      }

      if (entry && refValue !== entry.ref) {
        const target = entry.ref
        items.push({
          id: 'history',
          label: translate('showHistory'),
          hint: entryName,
          onSelect: () => setRefValue(target),
        })
        items.push({ separator: true })
      }
      if (entry && entry.kind === 'branch' && !entry.head) {
        const name = entry.name
        items.push({
          id: 'checkout',
          label: translate('checkoutBranch'),
          hint: name,
          onSelect: open({
            kind: 'branch',
            op: 'checkout',
            title: translate('checkoutBranch'),
            description: `${translate('checkoutBranch')} · ${name}`,
            confirmLabel: translate('checkoutBranch'),
            payload: { branch: name },
          }),
        })
      }
      if (entry && entry.kind === 'remote') {
        const name = entry.name
        const remoteRef = entry.ref
        items.push({
          id: 'checkout-remote',
          label: translate('checkoutRemote'),
          hint: name,
          onSelect: open({
            kind: 'branch',
            op: 'create',
            title: translate('checkoutRemote'),
            description: name,
            input: true,
            label: translate('branchName'),
            initialValue: localNameForRemote(name),
            placeholder: translate('branchName'),
            confirmLabel: translate('checkoutBranch'),
            checkboxLabel: translate('checkoutAfterCreate'),
            checkboxDefault: true,
            payload: { startRef: remoteRef },
          }),
        })
      }
      items.push({
        id: 'create',
        label: translate('createBranch'),
        hint: entryName || translate('head'),
        onSelect: open({
          kind: 'branch',
          op: 'create',
          title: translate('createBranch'),
          description: entry ? `${translate('createBranch')} · ${entryName}` : translate('createBranch'),
          input: true,
          label: translate('branchName'),
          initialValue: '',
          placeholder: translate('branchName'),
          confirmLabel: translate('createBranch'),
          checkboxLabel: translate('checkoutAfterCreate'),
          checkboxDefault: true,
          payload: entry ? { startRef: entry.ref } : {},
        }),
      })
      if (entry && entry.kind === 'branch') {
        const name = entry.name
        items.push({
          id: 'rename',
          label: translate('renameBranch'),
          hint: name,
          onSelect: open({
            kind: 'branch',
            op: 'rename',
            title: `${translate('renameBranch')} · ${name}`,
            description: `${translate('renameBranch')} ${name}`,
            input: true,
            label: translate('newBranchName'),
            initialValue: name,
            placeholder: translate('newBranchName'),
            confirmLabel: translate('confirm'),
            payload: { branch: name },
          }),
        })
      }
      if (entry && entry.kind === 'branch' && !entry.head) {
        const name = entry.name
        items.push({
          id: 'delete',
          label: translate('deleteBranch'),
          hint: name,
          danger: true,
          onSelect: open({
            kind: 'branch',
            op: 'delete',
            title: `${translate('deleteBranch')} · ${name}`,
            description: `${translate('deleteBranch')} ${name}`,
            danger: true,
            confirmLabel: translate('deleteBranch'),
            checkboxLabel: translate('forceDelete'),
            checkboxDefault: false,
            payload: { branch: name },
          }),
        })
      }
      if (entry && current && entry.kind !== 'tag' && entry.name !== current) {
        const targetRef = entry.ref
        items.push({ separator: true })
        items.push({
          id: 'merge',
          label: translate('mergeBranch'),
          hint: `${entryName} → ${current}`,
          onSelect: open({
            kind: 'branch',
            op: 'merge',
            title: translate('mergeBranch'),
            description: `${translate('mergeBranch')} · ${entryName} → ${current}`,
            confirmLabel: translate('mergeBranch'),
            payload: { ref: targetRef },
          }),
        })
        items.push({
          id: 'rebase',
          label: translate('rebaseBranch'),
          hint: `${current} → ${entryName}`,
          onSelect: open({
            kind: 'branch',
            op: 'rebase',
            title: translate('rebaseBranch'),
            description: `${translate('rebaseBranch')} · ${current} → ${entryName}`,
            confirmLabel: translate('rebaseBranch'),
            payload: { ref: targetRef },
          }),
        })
      }
      if (branchState && branchState.operation) {
        const operation = branchState.operation
        items.push({ separator: true })
        if (operation !== 'bisect') {
          items.push({
            id: 'continue',
            label: `${translate('continueOperation')} · ${operationLabel(operation, translate)}`,
            onSelect: () => {
              void executeBranchOp('continue', {})
            },
          })
        }
        items.push({
          id: 'abort',
          label: `${translate('abortOperation')} · ${operationLabel(operation, translate)}`,
          danger: true,
          onSelect: open({
            kind: 'branch',
            op: 'abort',
            title: translate('abortOperation'),
            description: translate('branchAbortConfirm'),
            confirmLabel: translate('abortOperation'),
            danger: true,
          }),
        })
      }
      return items
    },
    [branchState, translate, executeBranchOp, refValue],
  )

  const branchOptions = React.useMemo<DropdownOption[]>(() => {
    const options: DropdownOption[] = [
      { value: '', label: translate('allRefs'), icon: 'all', actions: buildBranchMenu(null) },
    ]
    for (const entry of log && Array.isArray(log.refs) ? log.refs : []) {
      options.push({
        value: entry.ref,
        label: `${entry.name}${entry.kind === 'tag' ? translate('tagSuffix') : ''}`,
        group:
          entry.kind === 'branch'
            ? translate('localBranches')
            : entry.kind === 'remote'
              ? translate('remoteBranches')
              : translate('tags'),
        icon: entry.kind,
        head: entry.head,
        actions: buildBranchMenu(entry),
      })
    }
    return options
  }, [log, translate, buildBranchMenu])

  const treePane = h(
    'div',
    { className: 'gv-pane gv-pane-left', style: { width: `${leftWidth}px`, flexBasis: `${leftWidth}px` } },
    h(
      'div',
      { className: 'gv-left', ref: leftRef },
      h(FileTreePane, {
        t: translate,
        repo,
        scope,
        refName: refEntry
          ? refEntry.name
          : refValue
            ? refValue.replace(/^refs\/(heads|remotes|tags)\//, '')
            : '',
        children: treeChildren,
        expanded: treeExpanded,
        loading: treeLoading,
        errors: treeErrors,
        onSelect: selectTreeNode,
        onToggle: toggleDir,
        onRetryRoot: retryTreeRoot,
      }),
      h(ResizeHandle, {
        t: translate,
        axis: 'y',
        label: translate('resizeChanges'),
        value: changesHeight,
        min: MIN_CHANGES,
        max: maxChanges,
        invert: true,
        onChange: setChangesHeight,
        onCommit: (next: number) => layout.writeWidth('changes', next),
        onReset: () => {
          setChangesHeight(DEFAULT_CHANGES)
          layout.writeWidth('changes', DEFAULT_CHANGES)
        },
      }),
      h(ChangesPane, {
        t: translate,
        repo,
        scope,
        entries: visibleChanges,
        totalCount: changes ? changes.length : 0,
        loading: changesLoading,
        error: changesError,
        selected: selectedChangeSet,
        message: commitMessage,
        busy: commitBusy,
        disabled: commitBusy || actionBusy,
        aiBusy: commitAiBusy,
        repoNotice: repoNotice && repoNotice.kind === 'ok' ? repoNotice : null,
        repoState: branchState,
        commitError,
        height: changesHeight,
        view: changesView,
        inputRef: messageRef,
        onToggle: toggleChange,
        onTogglePaths: toggleChangePaths,
        onToggleAll: toggleAllChanges,
        onView: changeChangesView,
        onRefresh: refreshChanges,
        onRollback: () => {
          setRollbackError('')
          setRollbackOpen(true)
        },
        onMessage: setCommitMessage,
        onCommit: commitSelected,
        onGenerate: generateMessage,
        onDiscard: requestDiscard,
        onResolve: resolveConflict,
        onContinue: continueBranchOperation,
        onAbort: requestAbortOperation,
      }),
    ),
  )

  const centerPane = h(
    'div',
    { className: 'gv-pane gv-pane-center' },
    repoId
      ? h(CommitPane, {
          t: translate,
          log,
          loading: loadingLog,
          error: logError,
          commits,
          rows,
          graphWidth,
          matches,
          selected,
          scope,
          state: branchState,
          narrow: narrowCenter,
          inputRef: messageRef,
          onSelect: chooseCommit,
          onRefresh: refresh,
          onClearScope: () => applyScope(''),
          onMenu: openCommitMenu,
          onContinue: () => {
            void executeBranchOp('continue', {})
          },
          onAbort: () =>
            setActionDialog({
              kind: 'branch',
              op: 'abort',
              title: translate('abortOperation'),
              description: translate('branchAbortConfirm'),
              confirmLabel: translate('abortOperation'),
              danger: true,
            }),
          busy: actionBusy,
        })
      : null,
  )

  const detailsPane = h(
    'div',
    {
      className: 'gv-pane gv-pane-right',
      style: compact ? undefined : { width: `${rightWidth}px`, flexBasis: `${rightWidth}px` },
    },
    h(DetailsPane, {
      t: translate,
      commit: selectedCommit,
      details,
      loading: loadingDetails,
      error: detailsError,
      copied,
      scope,
      headHash: log && log.head ? log.head.hash : '',
      onCopy: copyHash,
      onCompare: openCompare,
      onSelectHash: chooseCommit,
      onHistory: requestHistoryOp,
    }),
  )

  const leftHandle = compact
    ? null
    : h(ResizeHandle, {
        t: translate,
        label: translate('resizeTree'),
        value: leftWidth,
        min: MIN_LEFT,
        max: maxLeft,
        invert: false,
        onChange: setLeftWidth,
        onCommit: (next: number) => layout.writeWidth('left', next),
        onReset: () => {
          setLeftWidth(DEFAULT_LEFT)
          layout.writeWidth('left', DEFAULT_LEFT)
        },
      })

  const rightHandle = compact
    ? null
    : h(ResizeHandle, {
        t: translate,
        label: translate('resizeDetails'),
        value: rightWidth,
        min: MIN_RIGHT,
        max: maxRight,
        invert: true,
        onChange: setRightWidth,
        onCommit: (next: number) => layout.writeWidth('right', next),
        onReset: () => {
          setRightWidth(DEFAULT_RIGHT)
          layout.writeWidth('right', DEFAULT_RIGHT)
        },
      })

  const main = compact
    ? h(
        'div',
        { className: 'gv-main gv-main-compact' },
        h(
          'div',
          { className: 'gv-compact-top' },
          treePane,
          h(ResizeHandle, {
            t: translate,
            label: translate('resizeTree'),
            value: leftWidth,
            min: MIN_LEFT,
            max: maxLeft,
            invert: false,
            onChange: setLeftWidth,
            onCommit: (next: number) => layout.writeWidth('left', next),
            onReset: () => {
              setLeftWidth(DEFAULT_LEFT)
              layout.writeWidth('left', DEFAULT_LEFT)
            },
          }),
          centerPane,
        ),
        h('div', { className: 'gv-compact-bottom' }, detailsPane),
      )
    : h('div', { className: 'gv-main' }, treePane, leftHandle, centerPane, rightHandle, detailsPane)

  const emptyRepos = !repoId && repos !== null

  return h(
    'div',
    { className: 'gv-root', ref: rootRef },
    h('style', { key: 'gv-style' }, PANEL_CSS),
    h(Toolbar, {
      t: translate,
      repos,
      repoId,
      onRepo: selectRepo,
      log,
      refValue,
      onRef: changeRef,
      branchOptions,
      query,
      onQuery: setQuery,
      count: log ? commits.length : 0,
      matchCount: matches ? matches.size : null,
      onRefresh: refresh,
      sync: branchState,
      syncBusy: actionBusy || Boolean(remoteJob && remoteJob.state === 'running'),
      onFetch: () => requestRemote('fetch'),
      onPull: (rebase: boolean) => requestRemote('pull', rebase ? { rebase: true } : {}),
      onPush: (force: boolean) => requestRemote('push', force ? { forceWithLease: true } : {}),
    }),
    repoNotice && repoNotice.kind === 'error'
      ? h(ErrorNotice, {
          key: repoNotice.at,
          t: translate,
          notice: repoNotice,
          onClose: () => notices.clear(),
        })
      : null,
    remoteJob
      ? h(
          'div',
          { className: `gv-remote gv-remote-${remoteJob.state}` },
          remoteJob.state === 'running' || remoteJob.state === 'cancelling'
            ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true })
            : null,
          h(
            'span',
            { className: 'gv-remote-label' },
            `${translate(remoteOpKey(remoteJob.op))}${remoteJob.percent != null ? ` · ${remoteJob.percent}%` : ''}`,
          ),
          h(
            'span',
            {
              className: 'gv-remote-line',
              title: (remoteJob.lines || []).join('\n') || remoteJob.error || '',
            },
            remoteJob.lines && remoteJob.lines.length
              ? remoteJob.lines[remoteJob.lines.length - 1]
              : remoteJob.error || translate('remoteRunning'),
          ),
          remoteJob.state === 'running'
            ? h(
                'button',
                { type: 'button', className: 'gv-remote-cancel', onClick: cancelRemoteJob },
                translate('cancel'),
              )
            : null,
        )
      : null,
    emptyRepos
      ? h(
          'div',
          { className: 'gv-main-empty' },
          h(IconGraphMark, { size: 34 }),
          h('div', { className: 'gv-state-title' }, translate('noRepos')),
          h('div', { className: 'gv-state-text' }, translate('noReposHint')),
          h(
            'button',
            { type: 'button', className: 'gv-button', onClick: retryRepos },
            h(IconRefresh, { size: 13 }),
            h('span', null, translate('retry')),
          ),
        )
      : reposError
        ? h(
            'div',
            { className: 'gv-main-empty' },
            h(ErrorState, { t: translate, message: reposError, onRetry: retryRepos }),
          )
        : repos === null
          ? h('div', { className: 'gv-main-empty' }, h(Spinner, { label: translate('loading') }))
          : main,
    compare
      ? h(CompareDialog, {
          t: translate,
          file: compare.file,
          commitHash: compare.hash,
          diff,
          loading: loadingDiff,
          error: diffError,
          onClose: closeCompare,
        })
      : null,
    actionDialog
      ? h(ActionDialog, {
          t: translate,
          dialog: actionDialog,
          busy: actionBusy,
          error: actionError,
          onClose: closeActionDialog,
          onConfirm: confirmAction,
        })
      : null,
    rollbackOpen
      ? h(RollbackDialog, {
          t: translate,
          entries: visibleChanges,
          busy: rollbackBusy,
          error: rollbackError,
          onClose: () => {
            if (rollbackBusy) return
            setRollbackOpen(false)
            setRollbackError('')
          },
          onConfirm: (paths: string[], deleteAdded: boolean) => {
            void executeRollback(paths, deleteAdded)
          },
        })
      : null,
    commitMenu
      ? h(PopupMenu, {
          t: translate,
          menu: {
            x: commitMenu.x,
            y: commitMenu.y,
            items: buildCommitMenu(commitMenu.commit),
          },
          onClose: () => setCommitMenu(null),
        })
      : null,
  )
}
