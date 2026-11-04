window.__ModuleLoader__.load({
  id: '@local/dsh-git-view',
  factory(require) {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement
    const { Fragment, useCallback, useEffect, useMemo, useRef, useState } = React

    /** Dictionary namespace shared with the Host-side locale resources. */
    const NS = 'gitView'
    /** The sidebar entry id and the main-panel key it opens. */
    const PANEL_ID = 'git-view'
    /** Document-relative path to the authenticated Host route registered by index.js. */
    const API = 'api/git-view'

    const ROW_HEIGHT = 30
    const LANE_WIDTH = 16
    const GRAPH_PAD = 10
    const DEFAULT_COLOR = '#8b96a8'

    const MIN_LEFT = 160
    const MAX_LEFT = 460
    const MIN_RIGHT = 280
    const MAX_RIGHT = 660
    const MIN_CENTER = 300
    const COMPACT_WIDTH = 980
    const MIN_TREE = 140
    const MIN_CHANGES = 300
    const DEFAULT_CHANGES = 360

    /** Lane colours tuned for both light and dark surfaces. */
    const PALETTE = [
      '#3b82f6',
      '#f59e0b',
      '#10b981',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#84cc16',
      '#f97316',
      '#14b8a6',
    ]

    const zh = {
      panel: 'Git',
      title: '提交历史',
      repo: '仓库',
      branch: '分支',
      allRefs: '全部分支',
      searchPlaceholder: '搜索提交、作者或哈希',
      searchClear: '清除搜索',
      refresh: '刷新',
      commitsUnit: '个提交',
      matchesUnit: '个匹配',
      loading: '正在读取 Git 数据…',
      loadingDetail: '正在读取提交详情…',
      loadingDiff: '正在读取差异…',
      noRepos: '没有可用的 Git 仓库',
      noReposHint: '把 Git 仓库所在目录添加为 DSH 工作区后，这里会出现它的提交历史。',
      noCommits: '这个路径下没有提交',
      noCommitsHint: '换一个分支或清除路径筛选后再试。',
      retry: '重试',
      selectCommit: '从中间选择一个提交，查看作者、文件变更与对比。',
      detailTitle: '提交详情',
      files: '文件变更',
      fileCountUnit: '个文件',
      noFiles: '该提交没有文件变更',
      noFilesInScope: '该路径下没有文件变更',
      diff: '差异',
      compare: '对比',
      compareTitle: '文件对比',
      oldVersion: '修改前',
      newVersion: '修改后',
      close: '关闭',
      copyHash: '复制哈希',
      copied: '已复制',
      author: '作者',
      committer: '提交者',
      date: '日期',
      parents: '父提交',
      binary: '二进制',
      truncated: '内容过长，已截断',
      subject: '提交信息',
      authorColumn: '作者',
      dateColumn: '日期',
      hashColumn: '哈希',
      head: 'HEAD',
      detached: '游离 HEAD',
      errorTitle: '读取失败',
      fileDiffTruncated: '差异过大，仅显示前一部分',
      statusAdded: '新增',
      statusModified: '修改',
      statusDeleted: '删除',
      statusRenamed: '重命名',
      statusTypeChanged: '类型变更',
      statusUnmerged: '冲突',
      statusUnknown: '变更',
      tagSuffix: '（标签）',
      filesTab: '文件',
      rootLabel: '仓库根目录',
      historyTreeHint: '历史文件树',
      treeEmpty: '没有可显示的文件',
      treeError: '目录读取失败',
      loadingTree: '正在读取目录…',
      clearScope: '清除范围',
      filteredBy: '已按路径筛选',
      resizeTree: '调整文件树宽度',
      resizeDetails: '调整详情宽度',
      expand: '展开',
      collapse: '折叠',
      binaryCompare: '二进制文件无法并排显示',
      emptyDiff: '没有文本差异',
      compareHint: '打开双栏文件对比',
      scope: '范围',
      refreshHint: '重新读取提交历史',
      changes: '更改',
      noChanges: '工作区没有未提交的更改',
      noChangesInScope: '该路径下没有更改',
      refreshChanges: '刷新更改',
      selectAll: '全选',
      clearSelection: '清除选择',
      commitMessagePlaceholder: '提交信息',
      commit: '提交',
      commitKeyHint: 'Ctrl+Enter 提交',
      commitMessageRequired: '请填写提交信息',
      commitSelectRequired: '请选择要提交的文件',
      resolveConflictsFirst: '请先解决冲突再提交',
      finishOperationFirst: '请先继续或中止当前 Git 操作',
      committing: '正在提交…',
      commitDone: '已提交',
      selectedFiles: '已选',
      discardChanges: '撤销更改',
      discardTitle: '撤销更改',
      discardUntracked: '未跟踪文件将被永久删除，无法恢复。',
      discardAdded: '新增文件将从暂存区移除并被删除。',
      discardModified: '文件将恢复到最近一次提交的状态。',
      discardDeleted: '被删除的文件将恢复。',
      discardConflict: '冲突标记会被丢弃，文件恢复为 HEAD 版本。',
      discardConfirm: '撤销',
      discarded: '已撤销',
      markResolved: '标记为已解决',
      resolved: '已标记为已解决',
      aiWorking: 'AI 正在生成提交信息…',
      generateMessage: '生成信息',
      regenerateMessage: '重新生成',
      generateHint: '让当前默认模型根据已勾选文件写一条 type(scope): 描述，写入输入框，提交前可修改',
      showHistory: '查看此分支历史',
      rollback: '回滚…',
      rollbackTitle: '回滚更改',
      rollbackHint: '选择要还原的文件。回滚会丢弃这些文件的本地改动。',
      rollbackConfirm: '回滚',
      rollbackDeleteAdded: '删除新增文件的本地副本',
      rollbackDone: '已回滚',
      undoCommit: '撤销上次提交',
      undoCommitHint: '把 HEAD 回退一个提交，改动保留在暂存区（soft reset）',
      revertCommit: '还原此提交',
      revertCommitHint: '生成一个反向提交，已推送的历史也可以安全使用',
      cherryPickCommit: '拣选此提交',
      cherryPickCommitHint: '把该提交的改动应用到当前分支',
      checkoutCommit: '检出此提交',
      checkoutCommitHint: '以分离 HEAD 的方式检出该提交（只读查看）',
      historyDone: '操作完成',
      commitActions: '提交操作',
      copyCommitMessage: '复制提交信息',
      fetch: '抓取',
      pull: '拉取',
      push: '推送',
      pullHint: '从当前分支的上游拉取并更新本地分支。',
      pushHint: '把当前分支推送到它的上游；没有上游时推到 origin 并建立跟踪。',
      pullRebase: '用 rebase 而不是 merge',
      forceWithLease: 'force-with-lease（远端有别人的提交时会失败）',
      fetchDone: '已抓取远端更新',
      pullDone: '已拉取',
      pushDone: '已推送',
      remoteFailed: '网络操作失败',
      remoteCancelled: '已取消网络操作',
      remoteRunning: '正在与远端通信…',
      branchActions: '分支操作',
      checkoutBranch: '检出分支',
      checkoutRemote: '检出为本地分支…',
      createBranch: '新建分支…',
      renameBranch: '重命名分支…',
      deleteBranch: '删除分支…',
      mergeBranch: '合并到当前分支',
      rebaseBranch: '将当前分支变基到此分支',
      continueOperation: '继续',
      abortOperation: '中止',
      branchName: '分支名称',
      newBranchName: '新分支名称',
      branchNameRequired: '请输入分支名称',
      invalidBranchName: '分支名称不合法',
      checkoutAfterCreate: '创建后检出新分支',
      forceDelete: '强制删除（未合并的提交会丢失）',
      cancel: '取消',
      confirm: '确定',
      working: '正在执行 Git 操作…',
      operationMerge: '合并',
      operationRebase: '变基',
      operationCherryPick: '拣选',
      operationRevert: '还原',
      operationBisect: '二分查找',
      operationHint: '解决冲突后可继续，也可中止本次操作。',
      checkoutUnavailable: '所选引用不是本地分支',
      detachedUnavailable: '游离 HEAD 上无法执行此操作',
      currentBranch: '当前分支',
      ahead: '领先',
      behind: '落后',
      modifiedHint: '已修改',
      conflictHint: '冲突',
      deletedHint: '已删除',
      renamedHint: '重命名',
      branchDone: '操作完成',
      branchAbortConfirm: '确定中止当前的 Git 操作并恢复工作区吗？',
      resizeChanges: '调整更改区高度',
      untracked: '未跟踪',
      staged: '已暂存',
      changesInScope: '当前范围',
      localBranches: '本地分支',
      remoteBranches: '远程分支',
      tags: '标签',
      selectRepo: '选择仓库',
      selectBranch: '选择分支',
    }

    const en = {
      panel: 'Git',
      title: 'Commit History',
      repo: 'Repository',
      branch: 'Branch',
      allRefs: 'All branches',
      searchPlaceholder: 'Search commits, authors, or hashes',
      searchClear: 'Clear search',
      refresh: 'Refresh',
      commitsUnit: 'commits',
      matchesUnit: 'matches',
      loading: 'Reading Git data…',
      loadingDetail: 'Reading commit details…',
      loadingDiff: 'Reading diff…',
      noRepos: 'No Git repositories available',
      noReposHint: 'Add the directory of a Git repository as a DSH workspace to see its history here.',
      noCommits: 'No commits under this path',
      noCommitsHint: 'Try another branch or clear the path filter.',
      retry: 'Retry',
      selectCommit: 'Select a commit to inspect its author, changed files, and comparisons.',
      detailTitle: 'Commit Details',
      files: 'Changed Files',
      fileCountUnit: 'files',
      noFiles: 'This commit changes no files',
      noFilesInScope: 'No changed files under this path',
      diff: 'Diff',
      compare: 'Compare',
      compareTitle: 'File comparison',
      oldVersion: 'Before',
      newVersion: 'After',
      close: 'Close',
      copyHash: 'Copy hash',
      copied: 'Copied',
      author: 'Author',
      committer: 'Committer',
      date: 'Date',
      parents: 'Parents',
      binary: 'binary',
      truncated: 'output truncated',
      subject: 'Commit Message',
      authorColumn: 'Author',
      dateColumn: 'Date',
      hashColumn: 'Hash',
      head: 'HEAD',
      detached: 'detached HEAD',
      errorTitle: 'Could not load',
      fileDiffTruncated: 'The diff is large; only the beginning is shown',
      statusAdded: 'Added',
      statusModified: 'Modified',
      statusDeleted: 'Deleted',
      statusRenamed: 'Renamed',
      statusTypeChanged: 'Type changed',
      statusUnmerged: 'Unmerged',
      statusUnknown: 'Changed',
      tagSuffix: ' (tag)',
      filesTab: 'Files',
      rootLabel: 'Repository root',
      historyTreeHint: 'Revision tree',
      treeEmpty: 'No files to show',
      treeError: 'Could not read this folder',
      loadingTree: 'Reading folders…',
      clearScope: 'Clear scope',
      filteredBy: 'Filtered by path',
      resizeTree: 'Resize file tree',
      resizeDetails: 'Resize details',
      expand: 'Expand',
      collapse: 'Collapse',
      binaryCompare: 'Binary files cannot be shown side by side',
      emptyDiff: 'No textual changes',
      compareHint: 'Open side-by-side comparison',
      scope: 'Scope',
      refreshHint: 'Reload commit history',
      changes: 'Changes',
      noChanges: 'No uncommitted changes',
      noChangesInScope: 'No changes under this path',
      refreshChanges: 'Refresh changes',
      selectAll: 'Select all',
      clearSelection: 'Clear',
      commitMessagePlaceholder: 'Commit message',
      commit: 'Commit',
      commitKeyHint: 'Ctrl+Enter to commit',
      commitMessageRequired: 'Enter a commit message',
      commitSelectRequired: 'Select files to commit',
      resolveConflictsFirst: 'Resolve conflicts before committing',
      finishOperationFirst: 'Finish or abort the paused Git operation first',
      committing: 'Committing…',
      commitDone: 'Committed',
      selectedFiles: 'Selected',
      discardChanges: 'Discard changes',
      discardTitle: 'Discard Changes',
      discardUntracked: 'The untracked file will be deleted permanently.',
      discardAdded: 'The added file will be removed from the index and deleted.',
      discardModified: 'The file will be restored to the last commit.',
      discardDeleted: 'The deleted file will be restored.',
      discardConflict: 'Conflict markers will be discarded and the file restored to HEAD.',
      discardConfirm: 'Discard',
      discarded: 'Discarded',
      markResolved: 'Mark resolved',
      resolved: 'Marked resolved',
      aiWorking: 'AI is writing the commit message…',
      generateMessage: 'Generate message',
      regenerateMessage: 'Regenerate',
      generateHint: 'Ask the default model for a type(scope): subject from the checked files and put it in the message box',
      showHistory: 'Show this history',
      rollback: 'Rollback…',
      rollbackTitle: 'Rollback changes',
      rollbackHint: 'Choose the files to restore. Rollback discards their local changes.',
      rollbackConfirm: 'Rollback',
      rollbackDeleteAdded: 'Delete local copies of added files',
      rollbackDone: 'Rolled back',
      undoCommit: 'Undo last commit',
      undoCommitHint: 'Move HEAD back one commit, keeping the changes staged (soft reset)',
      revertCommit: 'Revert commit',
      revertCommitHint: 'Create an inverse commit — safe for history that is already pushed',
      cherryPickCommit: 'Cherry-pick',
      cherryPickCommitHint: 'Apply this commit to the current branch',
      checkoutCommit: 'Checkout commit',
      checkoutCommitHint: 'Check out this commit with a detached HEAD (read-only)',
      historyDone: 'Done',
      commitActions: 'Commit actions',
      copyCommitMessage: 'Copy commit message',
      fetch: 'Fetch',
      pull: 'Pull',
      push: 'Push',
      pullHint: 'Fetch and integrate the upstream of the current branch.',
      pushHint: 'Push the current branch to its upstream; origin is used when none is set.',
      pullRebase: 'Rebase instead of merge',
      forceWithLease: 'force-with-lease (fails if the remote moved)',
      fetchDone: 'Fetched remote updates',
      pullDone: 'Pulled',
      pushDone: 'Pushed',
      remoteFailed: 'Remote operation failed',
      remoteCancelled: 'Remote operation cancelled',
      remoteRunning: 'Talking to the remote…',
      branchActions: 'Branch actions',
      checkoutBranch: 'Checkout',
      checkoutRemote: 'Checkout as local branch…',
      createBranch: 'New branch…',
      renameBranch: 'Rename branch…',
      deleteBranch: 'Delete branch…',
      mergeBranch: 'Merge into current branch',
      rebaseBranch: 'Rebase current branch onto this',
      continueOperation: 'Continue',
      abortOperation: 'Abort',
      branchName: 'Branch name',
      newBranchName: 'New branch name',
      branchNameRequired: 'Enter a branch name',
      invalidBranchName: 'Invalid branch name',
      checkoutAfterCreate: 'Checkout the new branch',
      forceDelete: 'Force delete (unmerged commits will be lost)',
      cancel: 'Cancel',
      confirm: 'Confirm',
      working: 'Running Git operation…',
      operationMerge: 'Merging',
      operationRebase: 'Rebasing',
      operationCherryPick: 'Cherry-picking',
      operationRevert: 'Reverting',
      operationBisect: 'Bisecting',
      operationHint: 'Resolve conflicts to continue, or abort this operation.',
      checkoutUnavailable: 'The selected ref is not a local branch',
      detachedUnavailable: 'Unavailable on a detached HEAD',
      currentBranch: 'Current branch',
      ahead: 'ahead',
      behind: 'behind',
      modifiedHint: 'Modified',
      conflictHint: 'Conflict',
      deletedHint: 'Deleted',
      renamedHint: 'Renamed',
      branchDone: 'Done',
      branchAbortConfirm: 'Abort the current Git operation and restore the working tree?',
      resizeChanges: 'Resize changes pane',
      untracked: 'Untracked',
      staged: 'Staged',
      changesInScope: 'In scope',
      localBranches: 'Local branches',
      remoteBranches: 'Remote branches',
      tags: 'Tags',
      selectRepo: 'Select repository',
      selectBranch: 'Select branch',
    }

    //#region graph-layout
    /**
     * Assign every commit a lane and the edges it contributes to the graph.
     * Commits are expected newest-first in `git log --topo-order` order.
     * @param {Array<{ hash: string, parents: string[] }>} commits - ordered commits.
     * @returns {Array<object>} one row per commit.
     */
    function computeRows(commits) {
      const known = new Set(commits.map((commit) => commit.hash))
      const lanes = []
      const colors = []
      const rows = []
      let cursor = 0

      const takeColor = () => PALETTE[cursor++ % PALETTE.length]
      const ensureColor = (lane) => {
        if (!colors[lane]) colors[lane] = takeColor()
        return colors[lane]
      }
      const firstFree = (exclude) => {
        for (let i = 0; i < lanes.length; i += 1) {
          if (i !== exclude && (lanes[i] === null || lanes[i] === undefined)) return i
        }
        lanes.push(null)
        colors.push(null)
        return lanes.length - 1
      }

      for (const commit of commits) {
        let lane = lanes.indexOf(commit.hash)
        const isNew = lane === -1
        if (isNew) {
          lane = firstFree(-1)
          lanes[lane] = commit.hash
        }
        const nodeColor = ensureColor(lane)

        const top = []
        for (let i = 0; i < lanes.length; i += 1) {
          if (i !== lane && lanes[i] !== null && lanes[i] !== undefined) top.push(i)
        }

        const parents = Array.isArray(commit.parents) ? commit.parents.filter((parent) => known.has(parent)) : []
        const edges = []
        const claimed = new Set()

        parents.forEach((parent, index) => {
          let target = -1
          for (let i = 0; i < lanes.length; i += 1) {
            if (i !== lane && lanes[i] === parent && !claimed.has(i)) {
              target = i
              break
            }
          }
          let straight = false
          if (target === -1) {
            if (index === 0 && lanes[lane] === commit.hash) {
              target = lane
              straight = true
            } else {
              target = firstFree(lane)
            }
            lanes[target] = parent
          }
          claimed.add(target)
          edges.push({ to: target, straight, color: ensureColor(target) })
        })

        if (lanes[lane] === commit.hash) {
          lanes[lane] = null
          colors[lane] = null
        }
        while (lanes.length > 0 && (lanes[lanes.length - 1] === null || lanes[lanes.length - 1] === undefined)) {
          lanes.pop()
          colors.pop()
        }

        let width = lane + 1
        for (const index of top) width = Math.max(width, index + 1)
        for (const edge of edges) width = Math.max(width, edge.to + 1)

        rows.push({
          lane,
          isNew,
          color: nodeColor,
          top,
          edges,
          colors: colors.slice(),
          width,
        })
      }

      return rows
    }
    //#endregion graph-layout

    /**
     * Flatten the lazily loaded folder cache into visible rows.
     * @param {Record<string, Array<{ name: string, path: string, type: string }>>} children - cache.
     * @param {Set<string>} expanded - expanded directory paths.
     * @returns {Array<object>} rows with a depth field.
     */
    function flattenTree(children, expanded) {
      const rows = []
      const walk = (path, depth) => {
        for (const entry of children[path] || []) {
          rows.push({ ...entry, depth })
          if (entry.type === 'tree' && expanded.has(entry.path)) walk(entry.path, depth + 1)
        }
      }
      walk('', 0)
      return rows
    }

    /**
     * @param {string} path - repository-relative path.
     * @param {string} scope - selected folder/file path, '' for the root.
     * @returns {boolean} whether the path belongs to the scope.
     */
    function inScope(path, scope) {
      return !scope || path === scope || path.startsWith(`${scope}/`)
    }

    /**
     * Human label for one Git status letter.
     * @param {string} status - the status letter from the Host.
     * @param {(key: string) => string} t - translator.
     * @returns {string} localized label.
     */
    function statusLabel(status, t) {
      switch (status) {
        case 'A':
          return t('statusAdded')
        case 'M':
          return t('statusModified')
        case 'D':
          return t('statusDeleted')
        case 'R':
          return t('statusRenamed')
        case 'T':
          return t('statusTypeChanged')
        case 'U':
          return t('statusUnmerged')
        default:
          return t('statusUnknown')
      }
    }

    /**
     * Pick the CSS modifier class for one Git status letter.
     * @param {string} status - status letter.
     * @returns {string} class suffix.
     */
    function statusClass(status) {
      if (status === 'A') return 'gv-st-add'
      if (status === 'D') return 'gv-st-del'
      if (status === 'M') return 'gv-st-mod'
      if (status === 'R') return 'gv-st-ren'
      return 'gv-st-other'
    }

    /**
     * Pick the CSS tone for one working-tree row.
     * @param {object} entry - status entry from the Host.
     * @returns {'add'|'del'|'ren'|'conflict'|'mod'} tone.
     */
    function changeTone(entry) {
      if (entry.conflict) return 'conflict'
      if (entry.untracked) return 'add'
      const letter = entry.x !== ' ' ? entry.x : entry.y
      if (letter === 'A') return 'add'
      if (letter === 'D') return 'del'
      if (letter === 'R') return 'ren'
      if (letter === 'U') return 'conflict'
      return 'mod'
    }

    /**
     * Single status glyph for one working-tree row. Untracked files show `?`
     * instead of the Host's synthetic `A`, which would look like a staged add.
     * @param {object} entry - status entry.
     * @returns {string} badge text.
     */
    function changeBadge(entry) {
      if (entry.untracked) return '?'
      if (entry.conflict) return 'U'
      return entry.x !== ' ' ? entry.x : entry.y
    }

    /**
     * Short state hints shown on the right of one working-tree row.
     * @param {object} entry - status entry.
     * @param {(key: string) => string} t - translator.
     * @returns {Array<{ tone: string, label: string }>} at most two tags.
     */
    function changeTags(entry, t) {
      if (entry.conflict) return [{ tone: 'conflict', label: t('conflictHint') }]
      if (entry.untracked) return [{ tone: 'untracked', label: t('untracked') }]
      const tags = []
      if (entry.staged) tags.push({ tone: 'staged', label: t('staged') })
      if (entry.unstaged) {
        const letter = entry.y !== ' ' ? entry.y : entry.x
        const label =
          letter === 'D' ? t('deletedHint') : letter === 'R' ? t('renamedHint') : t('modifiedHint')
        tags.push({ tone: 'modified', label })
      }
      if (tags.length === 0) tags.push({ tone: 'modified', label: t('modifiedHint') })
      return tags.slice(0, 2)
    }

    /**
     * Count the working-tree state groups shown in the summary strip.
     * @param {Array<object>} entries - visible status entries.
     * @returns {{ untracked: number, staged: number, modified: number, conflict: number, deleted: number }} counts.
     */
    function summarizeChanges(entries) {
      const summary = { untracked: 0, staged: 0, modified: 0, conflict: 0, deleted: 0 }
      for (const entry of entries) {
        if (entry.conflict) {
          summary.conflict += 1
          continue
        }
        if (entry.untracked) {
          summary.untracked += 1
          continue
        }
        if (entry.staged) summary.staged += 1
        if (entry.unstaged) summary.modified += 1
        if (entry.status === 'D') summary.deleted += 1
      }
      return summary
    }

    /**
     * Localized label for one paused Git operation.
     * @param {string} operation - operation kind from the Host.
     * @param {(key: string) => string} t - translator.
     * @returns {string} label.
     */
    function operationLabel(operation, t) {
      if (operation === 'merge') return t('operationMerge')
      if (operation === 'rebase') return t('operationRebase')
      if (operation === 'cherry-pick') return t('operationCherryPick')
      if (operation === 'revert') return t('operationRevert')
      if (operation === 'bisect') return t('operationBisect')
      return operation
    }

    /**
     * Dictionary key for a commit-level action's label.
     * @param {string} op - undo, revert, cherryPick, or checkout.
     * @returns {string} dictionary key.
     */
    function historyLabelKey(op) {
      if (op === 'undo') return 'undoCommit'
      if (op === 'revert') return 'revertCommit'
      if (op === 'cherryPick') return 'cherryPickCommit'
      return 'checkoutCommit'
    }

    /**
     * Dictionary key for a commit-level action's explanation.
     * @param {string} op - undo, revert, cherryPick, or checkout.
     * @returns {string} dictionary key.
     */
    function historyHintKey(op) {
      if (op === 'undo') return 'undoCommitHint'
      if (op === 'revert') return 'revertCommitHint'
      if (op === 'cherryPick') return 'cherryPickCommitHint'
      return 'checkoutCommitHint'
    }

    /**
     * Dictionary key for a remote operation's progress label.
     * @param {string} op - fetch, pull, or push.
     * @returns {string} dictionary key.
     */
    function remoteOpKey(op) {
      if (op === 'fetch') return 'fetch'
      if (op === 'pull') return 'pull'
      return 'push'
    }

    /**
     * Dictionary key for a remote operation's success notice.
     * @param {string} op - fetch, pull, or push.
     * @returns {string} dictionary key.
     */
    function remoteDoneKey(op) {
      if (op === 'fetch') return 'fetchDone'
      if (op === 'pull') return 'pullDone'
      return 'pushDone'
    }

    /**
     * Default local branch name offered when checking out a remote branch.
     * @param {string} remoteName - e.g. `origin/feature/login`.
     * @returns {string} e.g. `feature/login`.
     */
    function localNameForRemote(remoteName) {
      const parts = String(remoteName || '').split('/')
      return parts.length > 1 ? parts.slice(1).join('/') : String(remoteName || '')
    }

    /**
     * Cheap client-side branch-name check so input errors appear before the
     * Host validates the name again.
     * @param {string} value - candidate name.
     * @returns {boolean} whether it is plausibly a valid short branch name.
     */
    function looksLikeBranchName(value) {
      const name = String(value || '').trim()
      return (
        name.length > 0 &&
        name.length <= 200 &&
        !/[\u0000-\u0020\u007f~^:?*\[\\]/.test(name) &&
        !name.startsWith('-') &&
        !name.startsWith('.') &&
        !name.startsWith('refs/') &&
        !name.endsWith('/') &&
        !name.endsWith('.') &&
        !name.endsWith('.lock') &&
        !name.includes('..') &&
        !name.includes('//') &&
        !name.includes('@{')
      )
    }

    /**
     * Compact `MM-DD HH:mm` (with the year when it differs) timestamp.
     * @param {string} iso - ISO date.
     * @returns {string} display text.
     */
    function shortDate(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return iso || ''
      const pad = (value) => String(value).padStart(2, '0')
      const clock = `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
      const now = new Date()
      return date.getFullYear() === now.getFullYear() ? clock : `${date.getFullYear()}-${clock}`
    }

    const fullDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

    /**
     * Full timestamp for titles and the details pane.
     * @param {string} iso - ISO date.
     * @returns {string} display text.
     */
    function fullDate(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return iso || ''
      return fullDateFormatter.format(date)
    }

    /**
     * Read a JSON response, surfacing the Host's own error text.
     * @param {string} action - route action (`repos`, `tree`, `log`, `commit`, `diff`).
     * @param {Record<string, string>} params - extra query parameters.
     * @param {AbortSignal} signal - cancellation signal.
     * @returns {Promise<any>} parsed payload.
     */
    async function fetchJson(action, params, signal) {
      const search = new URLSearchParams({ action, ...params })
      const response = await fetch(`${API}?${search.toString()}`, {
        signal,
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      const text = await response.text()
      let payload = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw new Error(text.slice(0, 300) || `HTTP ${response.status}`)
        }
      }
      if (!response.ok) throw new Error(payload && payload.error ? payload.error : `HTTP ${response.status}`)
      return payload
    }

    /**
     * Post a JSON body to the authenticated write route.
     * @param {object} body - request payload.
     * @returns {Promise<any>} parsed response.
     */
    async function postJson(body) {
      const response = await fetch(`${API}/write`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await response.text()
      let payload = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw new Error(text.slice(0, 300) || `HTTP ${response.status}`)
        }
      }
      if (!response.ok) {
        const error = new Error(payload && payload.error ? payload.error : `HTTP ${response.status}`)
        if (payload && payload.state) error.state = payload.state
        if (payload && payload.conflict) error.conflict = true
        throw error
      }
      return payload
    }

    /**
     * @param {unknown} error - caught value.
     * @returns {boolean} whether it is an abort.
     */
    function isAbort(error) {
      return Boolean(error) && error.name === 'AbortError'
    }

    /**
     * @param {unknown} error - caught value.
     * @returns {string} display message.
     */
    function errorText(error) {
      if (!error) return ''
      return error.message || String(error)
    }

    /**
     * @returns {string} the current UI locale for AI message generation.
     */
    function uiLocale() {
      try {
        return document.documentElement.lang || navigator.language || 'en'
      } catch {
        return 'en'
      }
    }

    /**
     * Read one persisted pane width.
     * @param {string} key - storage key suffix.
     * @param {number} fallback - default width.
     * @param {number} min - lower bound.
     * @param {number} max - upper bound.
     * @returns {number} the width.
     */
    function readWidth(key, fallback, min, max) {
      try {
        const raw = window.localStorage ? window.localStorage.getItem(`dsh.git-view.v2.${key}`) : null
        if (raw === null || raw === '') return fallback
        const value = Number(raw)
        if (Number.isFinite(value)) return Math.min(max, Math.max(min, Math.round(value)))
      } catch {
        /* private mode */
      }
      return fallback
    }

    /**
     * Persist one pane width.
     * @param {string} key - storage key suffix.
     * @param {number} value - width.
     * @returns {void}
     */
    function writeWidth(key, value) {
      try {
        if (window.localStorage) window.localStorage.setItem(`dsh.git-view.v2.${key}`, String(Math.round(value)))
      } catch {
        /* private mode */
      }
    }

    /** Per-extension colour and glyph family used by tree and change rows. */
    const FILE_VISUALS = {
      ts: ['#3b82f6', 'code'],
      tsx: ['#3b82f6', 'code'],
      js: ['#eab308', 'code'],
      jsx: ['#eab308', 'code'],
      mjs: ['#eab308', 'code'],
      cjs: ['#eab308', 'code'],
      java: ['#f97316', 'code'],
      kt: ['#a855f7', 'code'],
      py: ['#60a5fa', 'code'],
      rb: ['#ef4444', 'code'],
      go: ['#06b6d4', 'code'],
      rs: ['#f97316', 'code'],
      c: ['#3b82f6', 'code'],
      h: ['#8b5cf6', 'code'],
      cpp: ['#3b82f6', 'code'],
      cs: ['#a855f7', 'code'],
      php: ['#8b5cf6', 'code'],
      swift: ['#f97316', 'code'],
      vue: ['#10b981', 'code'],
      svelte: ['#ef4444', 'code'],
      md: ['#7dd3fc', 'doc'],
      mdx: ['#7dd3fc', 'doc'],
      txt: ['#94a3b8', 'doc'],
      rst: ['#94a3b8', 'doc'],
      json: ['#eab308', 'data'],
      jsonc: ['#eab308', 'data'],
      yml: ['#a855f7', 'data'],
      yaml: ['#a855f7', 'data'],
      toml: ['#a855f7', 'data'],
      ini: ['#a855f7', 'data'],
      xml: ['#f59e0b', 'data'],
      sql: ['#f59e0b', 'data'],
      csv: ['#22c55e', 'data'],
      css: ['#ec4899', 'style'],
      scss: ['#ec4899', 'style'],
      sass: ['#ec4899', 'style'],
      less: ['#ec4899', 'style'],
      html: ['#ef4444', 'code'],
      htm: ['#ef4444', 'code'],
      sh: ['#22c55e', 'shell'],
      bash: ['#22c55e', 'shell'],
      zsh: ['#22c55e', 'shell'],
      ps1: ['#22c55e', 'shell'],
      bat: ['#22c55e', 'shell'],
      cmd: ['#22c55e', 'shell'],
      png: ['#a855f7', 'image'],
      jpg: ['#a855f7', 'image'],
      jpeg: ['#a855f7', 'image'],
      gif: ['#a855f7', 'image'],
      webp: ['#a855f7', 'image'],
      svg: ['#a855f7', 'image'],
      ico: ['#a855f7', 'image'],
      lock: ['#94a3b8', 'file'],
      gitignore: ['#94a3b8', 'file'],
      env: ['#eab308', 'file'],
    }

    /**
     * @param {string} name - file name.
     * @returns {{ color: string, kind: string }} visual identity.
     */
    function fileVisual(name) {
      const lower = String(name || '').toLowerCase()
      const dot = lower.lastIndexOf('.')
      const ext = dot >= 0 ? lower.slice(dot + 1) : lower
      const found = FILE_VISUALS[ext]
      if (found) return { color: found[0], kind: found[1] }
      return { color: '#8b96a8', kind: 'file' }
    }

    /**
     * Coloured folder/file glyph used by the tree, details, and change rows.
     * @param {{ name: string, isDir?: boolean, open?: boolean, size?: number }} props - identity.
     * @returns {import('react').ReactElement} the glyph.
     */
    function FileIcon({ name, isDir = false, open = false, size = 13 }) {
      if (isDir) {
        const color = open ? '#f0b429' : '#e0a33e'
        return h(
          'svg',
          { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, style: { color } },
          h('path', {
            d: open
              ? 'M3.5 9V6.8A1.3 1.3 0 0 1 4.8 5.5h4.1l1.7 1.8H18a1.3 1.3 0 0 1 1.3 1.3V10H7.1L4.6 18H3.5V9z'
              : 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9z',
            fill: 'currentColor',
            fillOpacity: 0.18,
            stroke: 'currentColor',
            strokeWidth: 1.4,
            strokeLinejoin: 'round',
          }),
          open
            ? h('path', {
                d: 'M4.6 18l2.5-8h13.4l-2.5 8H4.6z',
                fill: 'currentColor',
                fillOpacity: 0.1,
                stroke: 'currentColor',
                strokeWidth: 1.3,
                strokeLinejoin: 'round',
              })
            : null,
        )
      }

      const visual = fileVisual(name)
      const glyphs = []
      if (visual.kind === 'code') {
        glyphs.push(
          h('path', {
            key: 'code',
            d: 'M10.2 13.2 8.6 15l1.6 1.8M13.8 13.2 15.4 15l-1.6 1.8',
            stroke: 'currentColor',
            strokeWidth: 1.2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        )
      } else if (visual.kind === 'doc') {
        glyphs.push(
          h('path', {
            key: 'doc',
            d: 'M9.2 13.2h6M9.2 16h4.2',
            stroke: 'currentColor',
            strokeWidth: 1.2,
            strokeLinecap: 'round',
          }),
        )
      } else if (visual.kind === 'data') {
        glyphs.push(
          h('path', {
            key: 'data',
            d: 'M10.2 13c-.8 0-1 .5-1 1s.2 1-1 1c1.2 0 1 .5 1 1s.2 1 1 1M14.2 13c.8 0 1 .5 1 1s-.2 1 1 1c-1.2 0-1 .5-1 1s-.2 1-1 1',
            stroke: 'currentColor',
            strokeWidth: 1.1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        )
      } else if (visual.kind === 'image') {
        glyphs.push(
          h('circle', { key: 'img-sun', cx: 10, cy: 13.2, r: 1, fill: 'currentColor' }),
          h('path', {
            key: 'img-hill',
            d: 'M8.8 17.2l2-2 1.4 1.4 1.5-1.8 1.6 2.4',
            stroke: 'currentColor',
            strokeWidth: 1.1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        )
      } else if (visual.kind === 'style') {
        glyphs.push(
          h('path', {
            key: 'style',
            d: 'M9.6 13h5M9.6 15.2h3.4M9.6 17.4h4.6',
            stroke: 'currentColor',
            strokeWidth: 1.1,
            strokeLinecap: 'round',
          }),
        )
      } else if (visual.kind === 'shell') {
        glyphs.push(
          h('path', {
            key: 'shell',
            d: 'M9.4 13.4 11 15l-1.6 1.6M12.6 16.8h2.4',
            stroke: 'currentColor',
            strokeWidth: 1.1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
        )
      }

      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, style: { color: visual.color } },
        h('path', {
          d: 'M6 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z',
          fill: 'currentColor',
          fillOpacity: 0.13,
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M13 3.5V9h5',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinejoin: 'round',
        }),
        glyphs,
      )
    }

    /**
     * Parse a unified diff into side-by-side rows.
     * @param {string} text - unified diff output.
     * @returns {{ rows: Array<object>, truncated: boolean }} aligned rows.
     */
    function parseDiffRows(text) {
      const lines = String(text || '').split(/\r?\n/)
      const rows = []
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
          if (rows.length >= 3000) {
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
          const deletions = []
          while (index < lines.length && lines[index].startsWith('-') && !lines[index].startsWith('---')) {
            deletions.push(lines[index].slice(1))
            index += 1
          }
          const additions = []
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
     * @param {object} row - parsed diff row.
     * @param {'old'|'new'} side - which side to render.
     * @param {number} key - React key.
     * @returns {import('react').ReactElement} the row.
     */
    function compareRow(row, side, key) {
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

    function IconGraphMark({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M6 6v12M6 12c0 3 2.5 4 6 4h4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
        h('circle', { cx: 6, cy: 4.5, r: 2.2, fill: 'currentColor' }),
        h('circle', { cx: 6, cy: 19.5, r: 2.2, fill: 'currentColor' }),
        h('circle', { cx: 17, cy: 12, r: 2.2, fill: 'currentColor' }),
      )
    }

    function IconRefresh({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconArrowUp({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M12 20V5m0 0-6 6m6-6 6 6',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconArrowDown({ size = 14 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M12 4v15m0 0 6-6m-6 6-6-6',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconSearch({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 10.5, cy: 10.5, r: 6.5, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('path', { d: 'M15.5 15.5 21 21', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
      )
    }

    function IconCopy({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', {
          d: 'M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2.5 2.5 0 0 0-2.5 2.5V13',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
      )
    }

    function IconClose({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M6 6l12 12M18 6 6 18', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
      )
    }

    function IconChevron({ size = 10 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M9 5l7 7-7 7', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function IconFolder({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconFile({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M6 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M13 3.5V9h5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' }),
      )
    }

    function IconHome({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M4 10.5 12 4l8 6.5M6.5 9.5V20h11V9.5',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconCompare({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('rect', { x: 2.8, y: 4.5, width: 6.6, height: 15, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('rect', { x: 14.6, y: 4.5, width: 6.6, height: 15, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M10.6 9 8.8 12l1.8 3M13.4 9l1.8 3-1.8 3', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function IconBranch({ size = 12 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 6, cy: 5, r: 2.2, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('circle', { cx: 6, cy: 19, r: 2.2, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('circle', { cx: 18, cy: 8, r: 2.2, stroke: 'currentColor', strokeWidth: 1.7 }),
        h('path', { d: 'M6 7.2v9.6M6 12c0 3.4 2.6 4.4 6 4.4h3.6M6 9c0 3.3 3.6 4.4 7.2 4.4H18', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
      )
    }

    function IconTag({ size = 12 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M3.8 11.4V5.2c0-.8.6-1.4 1.4-1.4h6.2c.4 0 .8.2 1 .4l7.4 7.4c.5.5.5 1.4 0 1.9l-5.9 5.9c-.5.5-1.4.5-1.9 0L4.2 12.4a1.4 1.4 0 0 1-.4-1z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('circle', { cx: 8, cy: 8, r: 1.3, fill: 'currentColor' }),
      )
    }

    function IconSparkles({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5zM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1zM5 14.5l.6 1.4 1.4.6-1.4.6L5 18.5l-.6-1.4L3 16.5l1.4-.6.6-1.4z',
          fill: 'currentColor',
        }),
      )
    }

    function IconCheck({ size = 12 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M5 12.5 10 17l9-10', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function IconChevronDown({ size = 11 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M6 9l6 6 6-6', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      )
    }

    function IconMore({ size = 15 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 5, cy: 12, r: 1.7, fill: 'currentColor' }),
        h('circle', { cx: 12, cy: 12, r: 1.7, fill: 'currentColor' }),
        h('circle', { cx: 19, cy: 12, r: 1.7, fill: 'currentColor' }),
      )
    }

    function IconAlert({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M12 4.5 21 19H3L12 4.5z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M12 10v4.2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
        h('circle', { cx: 12, cy: 17, r: 1, fill: 'currentColor' }),
      )
    }

    function IconUndo({ size = 13 }) {
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M9 7 4.5 11.5 9 16',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M5 11.5h8.2a5.3 5.3 0 0 1 0 10.6H10',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function Spinner({ label }) {
      return h(
        'div',
        { className: 'gv-loading' },
        h('span', { className: 'gv-spinner', 'aria-hidden': true }),
        h('span', null, label),
      )
    }

    /**
     * Render one row's lane segments, curves, and commit node.
     * @param {{ row: object, width: number }} props - layout row and graph width.
     * @returns {import('react').ReactElement} the SVG cell.
     */
    function GraphCell({ row, width }) {
      const x = (lane) => GRAPH_PAD + lane * LANE_WIDTH + LANE_WIDTH / 2
      const centerX = x(row.lane)
      const centerY = ROW_HEIGHT / 2
      const parts = []

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
     * @param {{ entry: { name: string, kind: string, head?: boolean } }} props - ref entry.
     * @returns {import('react').ReactElement} the chip.
     */
    function RefChip({ entry }) {
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
     * Sidebar icon: a small branch graph in the current text colour.
     * @param {{ size?: number }} props - requested square edge.
     * @returns {import('react').ReactElement} the icon.
     */
    function GitViewIcon({ size = 18 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          focusable: false,
        },
        h('path', {
          d: 'M6.5 7.5v9M6.5 12c0 3.2 2.6 4 6 4h3.5M6.5 9c0 3 3.4 4.2 6.8 4.2',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 6.5, cy: 5, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('circle', { cx: 6.5, cy: 19, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('circle', { cx: 17.5, cy: 7.5, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('circle', { cx: 17.5, cy: 16, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
      )
    }

    /**
     * Drag handle between two panes. `axis: 'x'` resizes widths with a vertical
     * bar; `axis: 'y'` resizes heights with a horizontal bar.
     * @param {object} props - value, bounds, axis, change/commit callbacks.
     * @returns {import('react').ReactElement} the separator.
     */
    function ResizeHandle({ t, label, value, min, max, invert, axis = 'x', onChange, onCommit, onReset }) {
      const [dragging, setDragging] = useState(false)
      const startRef = useRef(null)
      const latestRef = useRef(value)
      latestRef.current = value
      const rows = axis === 'y'

      const clampValue = (next) => Math.min(max, Math.max(min, Math.round(next)))
      const finish = () => {
        if (startRef.current === null) return
        startRef.current = null
        setDragging(false)
        if (onCommit) onCommit(latestRef.current)
      }
      const position = (event) => (rows ? event.clientY : event.clientX)

      return h(
        'div',
        {
          className: `gv-split${rows ? ' gv-split-row' : ''}${dragging ? ' gv-split-active' : ''}`,
          role: 'separator',
          'aria-orientation': rows ? 'horizontal' : 'vertical',
          'aria-label': label,
          'aria-valuenow': Math.round(value),
          'aria-valuemin': min,
          'aria-valuemax': max,
          tabIndex: 0,
          title: label,
          onPointerDown: (event) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture?.(event.pointerId)
            startRef.current = { position: position(event), value }
            setDragging(true)
          },
          onPointerMove: (event) => {
            if (!startRef.current) return
            const delta = position(event) - startRef.current.position
            const next = clampValue(startRef.current.value + (invert ? -delta : delta))
            latestRef.current = next
            onChange(next)
          },
          onPointerUp: finish,
          onPointerCancel: finish,
          onLostPointerCapture: finish,
          onDoubleClick: () => {
            if (onReset) onReset()
          },
          onKeyDown: (event) => {
            const back = rows ? 'ArrowUp' : 'ArrowLeft'
            const forward = rows ? 'ArrowDown' : 'ArrowRight'
            if (event.key !== back && event.key !== forward) return
            event.preventDefault()
            const step = event.key === back ? -16 : 16
            const next = clampValue(value + (invert ? -step : step))
            latestRef.current = next
            onChange(next)
            if (onCommit) onCommit(next)
          },
        },
        h('span', { className: 'gv-split-grip', 'aria-hidden': true }),
      )
    }

    /**
     * Accessible custom select with a themed popover list.
     * @param {object} props - value, options, and change callback.
     * @returns {import('react').ReactElement} the dropdown.
     */
    function Dropdown({ t, label, value, options, onChange, disabled, icon, width = '190px', placeholder }) {
      const id = React.useId()
      const [open, setOpen] = useState(false)
      const [active, setActive] = useState(-1)
      const [rowMenu, setRowMenu] = useState(-1)
      const [rowMenuPos, setRowMenuPos] = useState(null)
      const rootRef = useRef(null)
      const menuRef = useRef(null)
      const rowMenuRef = useRef(null)
      const selectedIndex = options.findIndex((option) => option.value === value)
      const current = selectedIndex >= 0 ? options[selectedIndex] : null

      useEffect(() => {
        if (!open) setRowMenu(-1)
      }, [open])

      useEffect(() => {
        if (rowMenu < 0 || !rowMenuRef.current) return
        const node = rowMenuRef.current.querySelector('button')
        if (node && typeof node.focus === 'function') node.focus()
      }, [rowMenu])

      useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          if (rowMenuRef.current && rowMenuRef.current.contains(event.target)) return
          if (rootRef.current && !rootRef.current.contains(event.target)) {
            setOpen(false)
            setRowMenu(-1)
          }
        }
        document.addEventListener('mousedown', onPointerDown, true)
        return () => document.removeEventListener('mousedown', onPointerDown, true)
      }, [open])

      /**
       * Open the row's action menu as a side flyout next to the row, so the
       * options read horizontally and are not clipped by the list's scroll box.
       * @param {number} index - option index.
       * @param {Element} anchor - the "…" button of that row.
       */
      const openRowMenu = (index, anchor) => {
        if (rowMenu === index) {
          setRowMenu(-1)
          return
        }
        let rect = null
        try {
          rect = anchor.getBoundingClientRect()
        } catch {
          rect = null
        }
        if (!rect) {
          setRowMenu(index)
          return
        }
        const width = 232
        const height = 320
        setRowMenuPos({
          left: Math.max(8, Math.min(rect.right + 6, window.innerWidth - width - 8)),
          top: Math.max(8, Math.min(rect.top - 4, window.innerHeight - height - 8)),
        })
        setRowMenu(index)
      }

      useEffect(() => {
        if (open) setActive(selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1)
      }, [open, selectedIndex, options.length])

      useEffect(() => {
        if (disabled && open) setOpen(false)
      }, [disabled, open])

      useEffect(() => {
        if (!open || active < 0 || !menuRef.current) return
        const node = menuRef.current.querySelector(`[data-index="${active}"]`)
        if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' })
      }, [open, active])

      const pick = (index) => {
        const option = options[index]
        if (!option) return
        onChange(option.value)
        setOpen(false)
      }

      const onKeyDown = (event) => {
        if (disabled) return
        if (!open) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          setOpen(false)
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setActive((index) => (options.length === 0 ? -1 : index < 0 ? 0 : (index + 1) % options.length))
          return
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setActive((index) => (options.length === 0 ? -1 : index <= 0 ? options.length - 1 : index - 1))
          return
        }
        if (event.key === 'Home') {
          event.preventDefault()
          setActive(options.length > 0 ? 0 : -1)
          return
        }
        if (event.key === 'End') {
          event.preventDefault()
          setActive(options.length - 1)
          return
        }
        if (event.key === 'ArrowRight' && active >= 0) {
          const option = options[active]
          if (option && Array.isArray(option.actions) && option.actions.length > 0) {
            event.preventDefault()
            setRowMenu(active)
          }
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (active >= 0) pick(active)
        }
      }

      let lastGroup = null
      const rows = []
      options.forEach((option, index) => {
        if (option.group && option.group !== lastGroup) {
          rows.push(h('div', { key: `group-${option.group}-${index}`, className: 'gv-dropdown-group' }, option.group))
        }
        lastGroup = option.group || null
        const isActive = index === active
        const isSelected = option.value === value
        const actions = Array.isArray(option.actions) ? option.actions : []
        const iconNode =
          option.icon === 'repo'
            ? h(FileIcon, { isDir: true, size: 14 })
            : option.icon === 'tag'
              ? h(IconTag, { size: 12 })
              : option.icon === 'remote'
                ? h(IconBranch, { size: 12 })
                : option.icon === 'head'
                  ? h('span', { className: 'gv-opt-head-dot', 'aria-hidden': true })
                  : h(IconBranch, { size: 12 })
        rows.push(
          h(
            'div',
            {
              key: `${option.value}-${index}`,
              id: `${id}-${index}`,
              'data-index': index,
              role: 'option',
              'aria-selected': isSelected,
              className: `gv-dropdown-option${isActive ? ' gv-dropdown-active' : ''}${isSelected ? ' gv-dropdown-selected' : ''}`,
              onMouseMove: () => setActive(index),
              onClick: () => pick(index),
            },
            h('span', { className: 'gv-opt-icon' }, iconNode),
            h(
              'span',
              { className: 'gv-opt-text' },
              h('span', { className: 'gv-opt-label' }, option.label),
              option.description ? h('span', { className: 'gv-opt-desc', title: option.description }, option.description) : null,
            ),
            option.head ? h('span', { className: 'gv-opt-head' }, t('head')) : null,
            isSelected ? h('span', { className: 'gv-opt-check', 'aria-hidden': true }, h(IconCheck, { size: 11 })) : null,
            actions.length > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: `gv-opt-action${rowMenu === index ? ' gv-opt-action-open' : ''}`,
                    title: t('branchActions'),
                    'aria-label': `${t('branchActions')} · ${option.label}`,
                    'aria-haspopup': 'menu',
                    'aria-expanded': rowMenu === index,
                    tabIndex: -1,
                    onClick: (event) => {
                      event.stopPropagation()
                      setActive(index)
                      openRowMenu(index, event.currentTarget)
                    },
                    onMouseDown: (event) => event.stopPropagation(),
                  },
                  h(IconMore, { size: 14 }),
                )
              : null,
          ),
        )
      })

      const activeActions =
        rowMenu >= 0 && rowMenu < options.length && Array.isArray(options[rowMenu].actions)
          ? options[rowMenu].actions
          : null

      return h(
        'div',
        { className: 'gv-dropdown', style: { width }, ref: rootRef },
        h(
          'button',
          {
            type: 'button',
            className: `gv-dropdown-trigger${open ? ' gv-dropdown-open' : ''}`,
            'aria-haspopup': 'listbox',
            'aria-expanded': open,
            'aria-controls': open ? `${id}-list` : undefined,
            'aria-label': label,
            'aria-activedescendant': open && active >= 0 ? `${id}-${active}` : undefined,
            disabled,
            title: current ? current.label : placeholder,
            onClick: () => {
              if (!disabled) setOpen((value) => !value)
            },
            onKeyDown,
          },
          h('span', { className: 'gv-dropdown-icon' }, icon === 'repo' ? h(FileIcon, { isDir: true, size: 14 }) : h(IconBranch, { size: 13 })),
          h('span', { className: 'gv-dropdown-label' }, current ? current.label : placeholder),
          h('span', { className: 'gv-dropdown-chevron', 'aria-hidden': true }, h(IconChevronDown, { size: 11 })),
        ),
        open
          ? h(
              'div',
              {
                className: 'gv-dropdown-menu',
                role: 'listbox',
                id: `${id}-list`,
                'aria-label': label,
                ref: menuRef,
              },
              rows.length > 0 ? rows : h('div', { className: 'gv-dropdown-empty' }, placeholder),
            )
          : null,
        activeActions && rowMenuPos
          ? ReactDOM.createPortal(
              h(
                'div',
                {
                  className: 'gv-opt-menu',
                  role: 'menu',
                  'aria-label': t('branchActions'),
                  ref: rowMenuRef,
                  style: { left: `${rowMenuPos.left}px`, top: `${rowMenuPos.top}px` },
                  onMouseDown: (event) => event.stopPropagation(),
                },
                activeActions.map((item, actionIndex) =>
                  item.separator
                    ? h('div', { key: `sep-${actionIndex}`, className: 'gv-opt-menu-sep', role: 'separator' })
                    : h(
                        'button',
                        {
                          key: item.id || `${item.label}-${actionIndex}`,
                          type: 'button',
                          role: 'menuitem',
                          className: `gv-opt-menu-item${item.danger ? ' gv-action-danger' : ''}`,
                          disabled: item.disabled,
                          title: item.hint || item.label,
                          onClick: () => {
                            setRowMenu(-1)
                            setOpen(false)
                            item.onSelect()
                          },
                        },
                        h('span', { className: 'gv-opt-menu-label' }, item.label),
                        item.hint ? h('span', { className: 'gv-opt-menu-hint' }, item.hint) : null,
                      ),
                ),
              ),
              document.body,
            )
          : null,
      )
    }

    /**
     * Small modal used for branch names, destructive confirmations, and
     * discard prompts.
     * @param {object} props - dialog descriptor, busy/error state, callbacks.
     * @returns {import('react').ReactElement} the portal.
     */
    function ActionDialog({ t, dialog, busy, error, onClose, onConfirm }) {
      const [value, setValue] = useState(dialog.initialValue || '')
      const [checked, setChecked] = useState(Boolean(dialog.checkboxDefault))
      const inputRef = useRef(null)
      const confirmRef = useRef(null)
      const busyRef = useRef(busy)
      busyRef.current = busy

      useEffect(() => {
        const previous = document.activeElement
        const node = dialog.input ? inputRef.current : confirmRef.current
        if (node && typeof node.focus === 'function') {
          node.focus()
          if (dialog.input && typeof node.select === 'function') node.select()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape' && !busyRef.current) {
            event.stopPropagation()
            onClose()
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          if (previous && typeof previous.focus === 'function') previous.focus()
        }
      }, [dialog.input, onClose])

      const canConfirm = !busy && (!dialog.input || value.trim().length > 0)
      const submit = () => {
        if (!canConfirm) return
        onConfirm({ value: value.trim(), checked })
      }

      const panel = h(
        'div',
        { className: 'gv-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': dialog.title },
        h(
          'div',
          { className: 'gv-dialog-head' },
          h('span', { className: 'gv-dialog-title' }, dialog.title),
          h(
            'button',
            {
              type: 'button',
              className: 'gv-icon-button gv-icon-xs',
              title: t('close'),
              'aria-label': t('close'),
              onClick: onClose,
              disabled: busy,
            },
            h(IconClose, { size: 13 }),
          ),
        ),
        h(
          'div',
          { className: 'gv-dialog-body' },
          dialog.description ? h('p', { className: 'gv-dialog-text' }, dialog.description) : null,
          dialog.input
            ? h(
                'label',
                { className: 'gv-dialog-label' },
                h('span', null, dialog.label || t('branchName')),
                h('input', {
                  ref: inputRef,
                  className: 'gv-dialog-input',
                  type: 'text',
                  value,
                  placeholder: dialog.placeholder || '',
                  spellCheck: false,
                  autoComplete: 'off',
                  disabled: busy,
                  onChange: (event) => setValue(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      submit()
                    }
                  },
                }),
              )
            : null,
          dialog.checkboxLabel
            ? h(
                'label',
                { className: 'gv-dialog-check' },
                h('input', {
                  type: 'checkbox',
                  checked,
                  disabled: busy,
                  onChange: (event) => setChecked(event.target.checked),
                }),
                h('span', null, dialog.checkboxLabel),
              )
            : null,
          error ? h('div', { className: 'gv-dialog-error' }, error) : null,
        ),
        h(
          'div',
          { className: 'gv-dialog-actions' },
          h(
            'button',
            { type: 'button', className: 'gv-button gv-button-ghost', onClick: onClose, disabled: busy },
            t('cancel'),
          ),
          h(
            'button',
            {
              type: 'button',
              ref: confirmRef,
              className: `gv-button ${dialog.danger ? 'gv-button-danger' : 'gv-button-primary'}`,
              onClick: submit,
              disabled: !canConfirm,
            },
            busy ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true }) : null,
            h('span', null, dialog.confirmLabel || t('confirm')),
          ),
        ),
      )

      return ReactDOM.createPortal(
        h(
          'div',
          {
            className: 'gv-modal-mask gv-dialog-mask',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget && !busy) onClose()
            },
          },
          panel,
        ),
        document.body,
      )
    }

    /**
     * Top toolbar: repository, branch, and search.
     * @param {object} props - finder state and callbacks.
     * @returns {import('react').ReactElement} the toolbar.
     */
    function Toolbar(props) {
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

      const repoOptions = (repos || []).map((repo) => ({
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
              title: behind > 0 ? `${t('pull')} · ↓${behind}` : t('pull'),
              'aria-label': t('pull'),
              disabled: remoteDisabled,
              onClick: onPull,
            },
            h(IconArrowDown, { size: 14 }),
            behind > 0 ? h('span', { className: 'gv-sync-count gv-sync-behind' }, String(behind)) : null,
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'gv-icon-button',
              title: ahead > 0 ? `${t('push')} · ↑${ahead}` : t('push'),
              'aria-label': t('push'),
              disabled: remoteDisabled,
              onClick: onPush,
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
        matchCount !== null && matchCount !== undefined
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

    /**
     * Lazily loaded repository folder tree.
     * @param {object} props - tree cache, selection, and callbacks.
     * @returns {import('react').ReactElement} the tree pane.
     */
    function FileTreePane(props) {
      const { t, repo, scope, children, expanded, loading, errors, onSelect, onToggle, onRetryRoot, refName } = props
      const nodes = useMemo(() => flattenTree(children, expanded), [children, expanded])
      const rootLoading = loading.has('')
      const rootError = errors['']
      const projectName = repo
        ? repo.title || String(repo.root || '').split(/[\\/]/).filter(Boolean).pop() || ''
        : ''
      const statusTone = (letter) => {
        if (letter === '?') return 'untracked'
        if (letter === 'U') return 'conflict'
        if (letter === 'A') return 'added'
        if (letter === 'D') return 'deleted'
        if (letter === 'R') return 'staged'
        return 'modified'
      }

      const activate = (event, callback) => {
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
          h('span', null, t('filesTab')),
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

    /**
     * Middle commit graph and table.
     * @param {object} props - log, rows, and callbacks.
     * @returns {import('react').ReactElement} the commit pane.
     */
    function CommitPane(props) {
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
        onSelect,
        onRefresh,
        onClearScope,
        onContinue,
        onAbort,
        onMenu,
        busy,
      } = props

      const columns = narrow
        ? `${graphWidth}px minmax(0, 1fr)`
        : `${graphWidth}px minmax(140px, 1fr) 96px 82px 64px`
      const branch = log && log.head
        ? log.head.detached
          ? `${t('detached')} @ ${log.head.hash.slice(0, 7)}`
          : log.head.branch
        : ''

      let content = null
      if (!log && (loading || !error)) {
        content = h(Spinner, { label: t('loading') })
      } else if (error) {
        content = h(
          'div',
          { className: 'gv-state' },
          h('div', { className: 'gv-state-title' }, t('errorTitle')),
          h('div', { className: 'gv-state-text' }, error),
          h(
            'button',
            { type: 'button', className: 'gv-button', onClick: onRefresh },
            h(IconRefresh, { size: 13 }),
            h('span', null, t('retry')),
          ),
        )
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
              onContextMenu: (event) => {
                event.preventDefault()
                onMenu(commit, { x: event.clientX, y: event.clientY })
              },
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(commit.hash)
                } else if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
                  event.preventDefault()
                  const rect = typeof event.currentTarget.getBoundingClientRect === 'function'
                    ? event.currentTarget.getBoundingClientRect()
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
                onClick: (event) => {
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
          { className: 'gv-scroll', style: { '--gv-cols': columns } },
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
                `· ${branch}`,
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

    /**
     * Right-hand commit details column.
     * @param {object} props - commit payload and callbacks.
     * @returns {import('react').ReactElement} the details pane.
     */
    function DetailsPane(props) {
      const { t, commit, details, loading, error, copied, scope, headHash, onCopy, onCompare, onHistory } = props
      const spinner = h(Spinner, { label: t('loadingDetail') })

      let body = null
      if (loading && !details) {
        body = spinner
      } else if (!commit && !details) {
        body = h(
          'div',
          { className: 'gv-details-empty' },
          h('div', { className: 'gv-details-empty-icon' }, h(IconGraphMark, { size: 22 })),
          h('div', null, t('selectCommit')),
        )
      } else if (error) {
        body = h(
          'div',
          { className: 'gv-details-error' },
          h('div', { className: 'gv-state-title' }, t('errorTitle')),
          h('div', { className: 'gv-state-text' }, error),
        )
      } else if (details) {
        body = h(
          Fragment,
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
              ? h(Fragment, null, h('dt', null, t('committer')), h('dd', null, details.committer.name))
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
                        onClick: () => props.onSelectHash(parentHash),
                      },
                      parentHash.slice(0, 7),
                    ),
                  ),
                )
              : null,
          ),
          (() => {
            const isHead = Boolean(headHash) && details.hash === headHash
            const isMerge = Array.isArray(details.parents) && details.parents.length > 1
            const items = []
            if (isHead) items.push(['undo', t('undoCommit'), true])
            if (!isMerge) items.push(['revert', t('revertCommit'), false])
            if (!isHead && !isMerge) items.push(['cherryPick', t('cherryPickCommit'), false])
            if (!isHead) items.push(['checkout', t('checkoutCommit'), false])
            if (items.length === 0) return null
            return h(
              'div',
              { className: 'gv-detail-actions' },
              items.map(([op, label, danger]) =>
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
            )
          })(),
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
                details.files.map((entry) =>
                  h(
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
                    h('span', { className: 'gv-file-path' }, entry.path),
                    entry.binary
                      ? h('span', { className: 'gv-file-stat gv-file-binary' }, t('binary'))
                      : entry.additions > 0 || entry.deletions > 0
                        ? h(
                            'span',
                            { className: 'gv-file-stat' },
                            entry.additions > 0 ? h('span', { className: 'gv-add' }, `+${entry.additions}`) : null,
                            entry.additions > 0 && entry.deletions > 0 ? ' ' : null,
                            entry.deletions > 0 ? h('span', { className: 'gv-del' }, `-${entry.deletions}`) : null,
                          )
                        : null,
                    h('span', { className: 'gv-file-compare', 'aria-hidden': true }, h(IconCompare, { size: 12 })),
                  ),
                ),
              ),
        )
      }

      return h(
        'aside',
        { className: 'gv-details' },
        h(
          'div',
          { className: 'gv-details-head' },
          h('span', null, t('detailTitle')),
          scope ? h('span', { className: 'gv-head-scope', title: scope }, t('filteredBy')) : null,
        ),
        h('div', { className: 'gv-details-body' }, body),
      )
    }

    /**
     * Small floating menu anchored to a point (commit rows, etc.).
     * @param {object} props - menu descriptor and close callback.
     * @returns {import('react').ReactElement} the portal.
     */
    function PopupMenu({ t, menu, onClose }) {
      const ref = useRef(null)

      useEffect(() => {
        const onPointerDown = (event) => {
          if (ref.current && !ref.current.contains(event.target)) onClose()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }
      }, [onClose])

      const width = 232
      const height = Math.min(menu.items.length * 30 + 16, 340)
      const left = Math.max(8, Math.min(menu.x, window.innerWidth - width - 8))
      const top = Math.max(8, Math.min(menu.y, window.innerHeight - height - 8))

      return ReactDOM.createPortal(
        h(
          'div',
          {
            className: 'gv-menu',
            role: 'menu',
            'aria-label': t('commitActions'),
            ref,
            style: { left: `${left}px`, top: `${top}px`, minWidth: `${width}px` },
            onMouseDown: (event) => event.stopPropagation(),
          },
          menu.items.map((item, index) =>
            item.separator
              ? h('div', { key: `sep-${index}`, className: 'gv-menu-sep', role: 'separator' })
              : h(
                  'button',
                  {
                    key: item.id || `item-${index}`,
                    type: 'button',
                    role: 'menuitem',
                    className: `gv-menu-item${item.danger ? ' gv-menu-danger' : ''}`,
                    disabled: item.disabled,
                    title: item.hint || item.label,
                    onClick: () => {
                      onClose()
                      item.onSelect()
                    },
                  },
                  h('span', { className: 'gv-menu-label' }, item.label),
                  item.hint ? h('span', { className: 'gv-menu-hint' }, item.hint) : null,
                ),
          ),
        ),
        document.body,
      )
    }

    /**
     * Multi-file rollback dialog (IDEA's Rollback): pick the files to restore and
     * decide whether newly added files are deleted from disk or only unstaged.
     * @param {object} props - entries, busy/error state, callbacks.
     * @returns {import('react').ReactElement} the portal.
     */
    function RollbackDialog({ t, entries, busy, error, onClose, onConfirm }) {
      const [checked, setChecked] = useState(() => new Set(entries.map((entry) => entry.path)))
      const [deleteAdded, setDeleteAdded] = useState(true)
      const confirmRef = useRef(null)

      useEffect(() => {
        if (confirmRef.current && typeof confirmRef.current.focus === 'function') confirmRef.current.focus()
        const onKeyDown = (event) => {
          if (event.key === 'Escape' && !busy) {
            event.stopPropagation()
            onClose()
          }
        }
        const previous = document.documentElement.style.overflow
        document.documentElement.style.overflow = 'hidden'
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          document.documentElement.style.overflow = previous
        }
      }, [busy, onClose])

      const toggle = (path) => {
        setChecked((previous) => {
          const next = new Set(previous)
          if (next.has(path)) next.delete(path)
          else next.add(path)
          return next
        })
      }
      const allChecked = entries.length > 0 && checked.size === entries.length
      const paths = entries.filter((entry) => checked.has(entry.path)).map((entry) => entry.path)

      return ReactDOM.createPortal(
        h(
          'div',
          {
            className: 'gv-modal-mask gv-dialog-mask',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget && !busy) onClose()
            },
          },
          h(
            'div',
            { className: 'gv-dialog gv-dialog-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('rollbackTitle') },
            h(
              'div',
              { className: 'gv-dialog-head' },
              h('span', { className: 'gv-dialog-title' }, t('rollbackTitle')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'gv-icon-button gv-icon-xs',
                  title: t('close'),
                  'aria-label': t('close'),
                  disabled: busy,
                  onClick: onClose,
                },
                h(IconClose, { size: 13 }),
              ),
            ),
            h(
              'div',
              { className: 'gv-dialog-body' },
              h('p', { className: 'gv-dialog-text' }, t('rollbackHint')),
              h(
                'label',
                { className: 'gv-dialog-check' },
                h('input', {
                  type: 'checkbox',
                  checked: allChecked,
                  disabled: busy || entries.length === 0,
                  onChange: () => setChecked(allChecked ? new Set() : new Set(entries.map((entry) => entry.path))),
                }),
                h('span', null, `${t('selectAll')} · ${checked.size}/${entries.length}`),
              ),
              h(
                'div',
                { className: 'gv-rollback-list' },
                entries.map((entry) =>
                  h(
                    'label',
                    { key: entry.path, className: 'gv-rollback-row' },
                    h('input', {
                      type: 'checkbox',
                      checked: checked.has(entry.path),
                      disabled: busy,
                      onChange: () => toggle(entry.path),
                    }),
                    h('span', { className: `gv-status ${statusClass(entry.status)}` }, entry.status || '?'),
                    h('span', { className: 'gv-rollback-path', title: entry.path }, entry.path),
                  ),
                ),
              ),
              h(
                'label',
                { className: 'gv-dialog-check' },
                h('input', {
                  type: 'checkbox',
                  checked: deleteAdded,
                  disabled: busy,
                  onChange: (event) => setDeleteAdded(event.target.checked),
                }),
                h('span', null, t('rollbackDeleteAdded')),
              ),
              error ? h('div', { className: 'gv-dialog-error' }, error) : null,
            ),
            h(
              'div',
              { className: 'gv-dialog-actions' },
              h('button', { type: 'button', className: 'gv-button gv-button-ghost', onClick: onClose, disabled: busy }, t('cancel')),
              h(
                'button',
                {
                  type: 'button',
                  ref: confirmRef,
                  className: 'gv-button gv-button-danger',
                  disabled: busy || paths.length === 0,
                  onClick: () => onConfirm(paths, deleteAdded),
                },
                busy ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true }) : null,
                h('span', null, `${t('rollbackConfirm')} · ${paths.length}`),
              ),
            ),
          ),
        ),
        document.body,
      )
    }

    /**
     * Bottom half of the left column: working-tree changes and the commit
     * composer. Every visible file is selected by default; unchecking a file is
     * how a partial commit (or partial AI commit) is expressed.
     * @param {object} props - entries, selection, repository state, and callbacks.
     * @returns {import('react').ReactElement} the changes pane.
     */
    function ChangesPane(props) {
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
        notice,
        repoNotice,
        repoState,
        commitError,
        height,
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
        inputRef,
      } = props

      const summary = useMemo(() => summarizeChanges(entries), [entries])
      const allSelected = entries.length > 0 && entries.every((entry) => selected.has(entry.path))
      const selectedCount = entries.filter((entry) => selected.has(entry.path)).length
      const manualReady = message.trim().length > 0
      const locked = disabled || busy
      const selectedConflict = entries.some((entry) => entry.conflict && selected.has(entry.path))
      const operationPaused = Boolean(repoState && repoState.operation)
      const canCommit =
        entries.length > 0 && selectedCount > 0 && !locked && !selectedConflict && !operationPaused
      const canSubmit = canCommit && manualReady

      let list = null
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
          const toggle = () => {
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
            h(
              'span',
              { className: `gv-change-status gv-chg-${changeTone(entry)}` },
              changeBadge(entry),
            ),
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
              tags.map((tag, index) =>
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

      const chips = []
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
            entries.length !== totalCount
              ? h('span', { className: 'gv-changes-total' }, `/ ${totalCount}`)
              : null,
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
        repoNotice
          ? h('div', { className: `gv-repo-notice gv-repo-notice-${repoNotice.kind}` }, repoNotice.text)
          : null,
        h('div', { className: 'gv-changes-list' }, list),
        h(
          'div',
          { className: 'gv-commit' },
          h('textarea', {
            className: 'gv-commit-input',
            ref: inputRef,
            rows: 2,
            value: message,
            placeholder: t('commitMessagePlaceholder'),
            'aria-label': t('commitMessagePlaceholder'),
            spellCheck: false,
            disabled: locked,
            onChange: (event) => onMessage(event.target.value),
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
              aiBusy
                ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true })
                : h(IconSparkles, { size: 12 }),
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
          busy || aiBusy
            ? h(
                'div',
                { className: 'gv-commit-note' },
                busy ? t(aiBusy ? 'aiWorking' : 'committing') : t('aiWorking'),
              )
            : null,
          notice ? h('div', { className: 'gv-commit-note gv-commit-ok' }, notice) : null,
          commitError ? h('div', { className: 'gv-commit-note gv-commit-error' }, commitError) : null,
        ),
      )
    }

    /**
     * Modal side-by-side comparison for one changed file.
     * @param {object} props - file, diff payload, and close callback.
     * @returns {import('react').ReactElement|null} the portal.
     */
    function CompareDialog({ t, file, commitHash, diff, loading, error, onClose }) {
      const closeRef = useRef(null)
      const previouslyFocused = useRef(null)
      const oldRef = useRef(null)
      const newRef = useRef(null)
      const syncing = useRef(false)
      const parsed = useMemo(() => parseDiffRows(diff ? diff.text : ''), [diff])

      useEffect(() => {
        const previousOverflow = document.body.style.overflow
        previouslyFocused.current = document.activeElement
        document.body.style.overflow = 'hidden'
        const onKeyDown = (event) => {
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
          if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
            previouslyFocused.current.focus()
          }
        }
      }, [onClose])

      const syncScroll = (which) => (event) => {
        if (syncing.current) return
        const target = which === 'old' ? newRef.current : oldRef.current
        if (!target) return
        syncing.current = true
        target.scrollTop = event.currentTarget.scrollTop
        window.requestAnimationFrame(() => {
          syncing.current = false
        })
      }

      const binary = Boolean(diff) && parsed.rows.length === 0 && /Binary files|GIT binary patch/i.test(diff.text)
      const empty = Boolean(diff) && !binary && parsed.rows.length === 0

      let body = null
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

      const note = parsed.truncated || (diff && diff.truncated)
      const dialog = h(
        'div',
        {
          className: 'gv-modal-mask',
          onMouseDown: (event) => {
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

    /**
     * The Git panel: file tree, commit graph, and commit details, with resizable panes.
     * @param {{ t?: (key: string) => string }} props - slot props with the bound translator.
     * @returns {import('react').ReactElement} the panel.
     */
    function GitViewPanel(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key
      const rootRef = useRef(null)

      const [repos, setRepos] = useState(null)
      const [repoId, setRepoId] = useState('')
      const [reposError, setReposError] = useState('')
      const [reposTick, setReposTick] = useState(0)

      const [log, setLog] = useState(null)
      const [logError, setLogError] = useState('')
      const [loadingLog, setLoadingLog] = useState(false)
      const [refValue, setRefValue] = useState('')
      const [reloadTick, setReloadTick] = useState(0)

      const [query, setQuery] = useState('')
      const [selected, setSelected] = useState('')
      const [scope, setScope] = useState('')

      const [details, setDetails] = useState(null)
      const [detailsError, setDetailsError] = useState('')
      const [loadingDetails, setLoadingDetails] = useState(false)

      const [compare, setCompare] = useState(null)
      const [diff, setDiff] = useState(null)
      const [diffError, setDiffError] = useState('')
      const [loadingDiff, setLoadingDiff] = useState(false)

      const [treeChildren, setTreeChildren] = useState({})
      const [treeExpanded, setTreeExpanded] = useState(() => new Set())
      const [treeLoading, setTreeLoading] = useState(() => new Set())
      const [treeErrors, setTreeErrors] = useState({})
      const treeGeneration = useRef(0)
      const treeChildrenRef = useRef({})
      const treeLoadingRef = useRef(new Set())
      const lastTreeRefresh = useRef(0)

      const [changes, setChanges] = useState(null)
      const [changesError, setChangesError] = useState('')
      const [changesLoading, setChangesLoading] = useState(false)
      const [changesTick, setChangesTick] = useState(0)
      const [deselectedChanges, setDeselectedChanges] = useState(() => new Set())
      const [commitMessage, setCommitMessage] = useState('')
      const messageRef = useRef(null)
      const [rollbackOpen, setRollbackOpen] = useState(false)
      const [rollbackBusy, setRollbackBusy] = useState(false)
      const [rollbackError, setRollbackError] = useState('')
      const [commitMenu, setCommitMenu] = useState(null)
      const [remoteJob, setRemoteJob] = useState(null)
      const remotePollRef = useRef('')
      const remoteClearTimer = useRef(null)
      const [commitBusy, setCommitBusy] = useState(false)
      const [commitAiBusy, setCommitAiBusy] = useState(false)
      const [commitNotice, setCommitNotice] = useState('')
      const [commitError, setCommitError] = useState('')

      const [actionDialog, setActionDialog] = useState(null)
      const [actionBusy, setActionBusy] = useState(false)
      const [actionError, setActionError] = useState('')
      const [repoNotice, setRepoNotice] = useState(null)
      const noticeTimer = useRef(null)

      const [leftWidth, setLeftWidth] = useState(() => readWidth('left', 280, MIN_LEFT, MAX_LEFT))
      const [rightWidth, setRightWidth] = useState(() => readWidth('right', 360, MIN_RIGHT, MAX_RIGHT))
      const [changesHeight, setChangesHeight] = useState(() =>
        readWidth('changes', DEFAULT_CHANGES, MIN_CHANGES, 900),
      )
      const [leftHeight, setLeftHeight] = useState(0)
      const leftRef = useRef(null)
      const [panelWidth, setPanelWidth] = useState(1200)
      const [compact, setCompact] = useState(false)

      const [copied, setCopied] = useState(false)
      const copyTimer = useRef(null)

      const applyScope = useCallback((next) => {
        setScope(next)
        setSelected('')
        setDetails(null)
        setDetailsError('')
        setCompare(null)
        setDiff(null)
        setDiffError('')
        setCommitError('')
      }, [])

      const selectRepo = useCallback(
        (next) => {
          setRepoId(next)
          setRefValue('')
          setLog(null)
          setLogError('')
          setChanges(null)
          setChangesError('')
          setChangesLoading(false)
          setDeselectedChanges(new Set())
          setCommitMessage('')
          setCommitNotice('')
          setCommitError('')
          setCommitBusy(false)
          setActionDialog(null)
          setActionError('')
          setRepoNotice(null)
          applyScope('')
          try {
            if (window.localStorage && next) window.localStorage.setItem('dsh.git-view.repo', next)
          } catch {
            /* private mode */
          }
        },
        [applyScope],
      )

      const resetTree = useCallback(() => {
        treeGeneration.current += 1
        treeChildrenRef.current = {}
        treeLoadingRef.current = new Set()
        setTreeChildren({})
        setTreeExpanded(new Set())
        setTreeLoading(new Set())
        setTreeErrors({})
      }, [])

      const loadTree = useCallback(
        async (path, options = {}) => {
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
            const params = { repo: repoId, path, mode: refValue ? 'ref' : 'worktree' }
            if (refValue) params.ref = refValue
            const payload = await fetchJson('tree', params)
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
        [repoId, refValue],
      )

      const refreshTree = useCallback(async () => {
        if (!repoId) return
        const paths = new Set([''])
        for (const key of Object.keys(treeChildrenRef.current)) {
          if (key) paths.add(key)
        }
        for (const path of paths) await loadTree(path, { force: true })
      }, [repoId, loadTree])

      useEffect(() => {
        const controller = new AbortController()
        setRepos(null)
        setReposError('')
        fetchJson('repos', {}, controller.signal)
          .then((payload) => {
            if (controller.signal.aborted) return
            const list = Array.isArray(payload.repos) ? payload.repos : []
            setRepos(list)
            let saved = ''
            try {
              saved = window.localStorage ? window.localStorage.getItem('dsh.git-view.repo') || '' : ''
            } catch {
              saved = ''
            }
            const pick = list.find((repo) => repo.id === saved) || list[0] || null
            selectRepo(pick ? pick.id : '')
          })
          .catch((error) => {
            if (!isAbort(error)) setReposError(errorText(error))
          })
        return () => controller.abort()
      }, [reposTick, selectRepo])

      useEffect(() => {
        resetTree()
        if (!repoId) return
        loadTree('')
      }, [repoId, refValue, resetTree, loadTree])

      // Manual refresh reloads the directories that are already open, keeping
      // the expansion state instead of collapsing the tree.
      useEffect(() => {
        if (!repoId || reloadTick === 0) return
        lastTreeRefresh.current = Date.now()
        void refreshTree()
      }, [reloadTick, repoId, refreshTree])

      // The status poll (and every write) bumps changesTick; pick up new and
      // deleted files within a few seconds without thrashing the disk.
      useEffect(() => {
        if (!repoId || changesTick === 0) return
        if (document.hidden) return
        const now = Date.now()
        if (now - lastTreeRefresh.current < 3000) return
        lastTreeRefresh.current = now
        void refreshTree()
      }, [changesTick, repoId, refreshTree])

      useEffect(() => {
        if (!repoId) {
          setLog(null)
          setLogError('')
          setLoadingLog(false)
          return undefined
        }
        const controller = new AbortController()
        setLoadingLog(true)
        setLogError('')
        const params = { repo: repoId, limit: '400' }
        if (refValue) params.ref = refValue
        if (scope) params.path = scope
        fetchJson('log', params, controller.signal)
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
          .catch((error) => {
            if (isAbort(error)) return
            setLogError(errorText(error))
            setLog(null)
            setLoadingLog(false)
          })
        return () => controller.abort()
      }, [repoId, refValue, scope, reloadTick])

      useEffect(() => {
        if (!repoId) {
          setChanges(null)
          setChangesError('')
          setChangesLoading(false)
          return undefined
        }
        const controller = new AbortController()
        setChangesLoading(true)
        setChangesError('')
        fetchJson('status', { repo: repoId }, controller.signal)
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
          .catch((error) => {
            if (isAbort(error)) return
            setChangesError(errorText(error))
            setChanges(null)
            setChangesLoading(false)
          })
        return () => controller.abort()
      }, [repoId, changesTick, reloadTick])

      useEffect(() => {
        if (!repoId) return undefined
        const timer = window.setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden) return
          setChangesTick((value) => value + 1)
        }, 20_000)
        return () => window.clearInterval(timer)
      }, [repoId])

      useEffect(() => {
        if (!repoId || !selected) {
          setDetails(null)
          setDetailsError('')
          setLoadingDetails(false)
          return undefined
        }
        const controller = new AbortController()
        setLoadingDetails(true)
        setDetailsError('')
        const params = { repo: repoId, hash: selected }
        if (scope) params.path = scope
        fetchJson('commit', params, controller.signal)
          .then((payload) => {
            if (controller.signal.aborted) return
            setDetails(payload)
            setLoadingDetails(false)
          })
          .catch((error) => {
            if (isAbort(error)) return
            setDetails(null)
            setDetailsError(errorText(error))
            setLoadingDetails(false)
          })
        return () => controller.abort()
      }, [repoId, selected, scope, reloadTick])

      useEffect(() => {
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
        fetchJson(
          'diff',
          { repo: repoId, hash: compare.hash, path: compare.file.path },
          controller.signal,
        )
          .then((payload) => {
            if (controller.signal.aborted) return
            setDiff(payload)
            setLoadingDiff(false)
          })
          .catch((error) => {
            if (isAbort(error)) return
            setDiffError(errorText(error))
            setLoadingDiff(false)
          })
        return () => controller.abort()
      }, [repoId, compare])

      useEffect(() => {
        const node = rootRef.current
        if (!node) return undefined
        const measure = () => {
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

      useEffect(() => {
        const node = leftRef.current
        if (!node) return undefined
        const measure = () => setLeftHeight(node.clientHeight)
        measure()
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
      }, [compact, repoId, repos])

      useEffect(
        () => () => {
          if (copyTimer.current) window.clearTimeout(copyTimer.current)
          if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
        },
        [],
      )

      const maxLeft = Math.max(
        MIN_LEFT,
        Math.min(MAX_LEFT, panelWidth - (compact ? 0 : rightWidth) - MIN_CENTER - 12),
      )
      const maxRight = Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, panelWidth - leftWidth - MIN_CENTER - 12))
      const maxChanges = Math.max(MIN_CHANGES, leftHeight > 0 ? leftHeight - MIN_TREE - 7 : 900)

      useEffect(() => {
        setLeftWidth((value) => Math.min(value, maxLeft))
      }, [maxLeft])

      useEffect(() => {
        if (!compact) setRightWidth((value) => Math.min(value, maxRight))
      }, [compact, maxRight])

      useEffect(() => {
        setChangesHeight((value) => Math.min(Math.max(value, MIN_CHANGES), maxChanges))
      }, [maxChanges])

      const commits = useMemo(() => (log && Array.isArray(log.commits) ? log.commits : []), [log])
      const rows = useMemo(() => computeRows(commits), [commits])
      const graphWidth = useMemo(() => {
        let laneCount = 1
        for (const row of rows) laneCount = Math.max(laneCount, row.width)
        return GRAPH_PAD * 2 + laneCount * LANE_WIDTH
      }, [rows])
      const centerWidth = compact
        ? panelWidth - leftWidth - 6
        : panelWidth - leftWidth - rightWidth - 12
      const narrowCenter = centerWidth < graphWidth + 446

      const normalizedQuery = query.trim().toLowerCase()
      const matches = useMemo(() => {
        if (!normalizedQuery) return null
        const result = new Set()
        commits.forEach((commit, index) => {
          const haystack = `${commit.subject}\n${commit.author}\n${commit.hash}\n${commit.refs
            .map((entry) => entry.name)
            .join('\n')}`.toLowerCase()
          if (haystack.includes(normalizedQuery)) result.add(index)
        })
        return result
      }, [commits, normalizedQuery])

      const selectedCommit = useMemo(
        () => commits.find((commit) => commit.hash === selected) || null,
        [commits, selected],
      )
      const repo = useMemo(() => (repos || []).find((entry) => entry.id === repoId) || null, [repos, repoId])
      const visibleChanges = useMemo(
        () => (changes || []).filter((entry) => inScope(entry.path, scope)),
        [changes, scope],
      )
      const selectedChangePaths = useMemo(
        () => visibleChanges.filter((entry) => !deselectedChanges.has(entry.path)).map((entry) => entry.path),
        [visibleChanges, deselectedChanges],
      )
      const selectedChangeSet = useMemo(() => new Set(selectedChangePaths), [selectedChangePaths])

      const copyHash = useCallback(async (hash) => {
        try {
          await navigator.clipboard.writeText(hash)
          setCopied(true)
          if (copyTimer.current) window.clearTimeout(copyTimer.current)
          copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
        } catch {
          /* clipboard permission denied */
        }
      }, [])

      const refresh = useCallback(() => {
        setReloadTick((value) => value + 1)
      }, [])

      const retryRepos = useCallback(() => {
        setReposTick((value) => value + 1)
      }, [])

      const chooseCommit = useCallback((hash) => {
        setSelected(hash)
        setCompare(null)
      }, [])

      const changeRef = useCallback(
        (value) => {
          setRefValue(value)
          applyScope('')
        },
        [applyScope],
      )

      const selectTreeNode = useCallback(
        (entry) => {
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
            loadTree(entry.path)
          }
        },
        [applyScope, loadTree],
      )

      const toggleDir = useCallback(
        (path) => {
          const isOpen = treeExpanded.has(path)
          setTreeExpanded((previous) => {
            const next = new Set(previous)
            if (next.has(path)) next.delete(path)
            else next.add(path)
            return next
          })
          if (!isOpen) loadTree(path)
        },
        [treeExpanded, loadTree],
      )

      const retryTreeRoot = useCallback(() => {
        loadTree('')
      }, [loadTree])

      const openCompare = useCallback(
        (entry) => {
          if (!selected) return
          setCompare({ file: entry, hash: selected })
        },
        [selected],
      )

      const closeCompare = useCallback(() => {
        setCompare(null)
      }, [])

      const toggleChange = useCallback((path) => {
        setDeselectedChanges((previous) => {
          const next = new Set(previous)
          if (next.has(path)) next.delete(path)
          else next.add(path)
          return next
        })
      }, [])

      const toggleAllChanges = useCallback(() => {
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

      const refreshChanges = useCallback(() => {
        setChangesTick((value) => value + 1)
      }, [])

      const performCommit = useCallback(async () => {
        if (!repoId || commitBusy) return
        if (selectedChangePaths.length === 0) {
          setCommitError(t('commitSelectRequired'))
          return
        }
        if (!commitMessage.trim()) {
          setCommitError(t('commitMessageRequired'))
          return
        }
        setCommitBusy(true)
        setCommitError('')
        setCommitNotice('')
        try {
          const payload = await postJson({
            repo: repoId,
            action: 'commit',
            paths: selectedChangePaths,
            message: commitMessage,
          })
          setCommitNotice(`${t('commitDone')} ${payload.shortHash}`)
          setCommitMessage('')
          setDeselectedChanges(new Set())
          setSelected('')
          setDetails(null)
          setDetailsError('')
          setCompare(null)
          setReloadTick((value) => value + 1)
          setChangesTick((value) => value + 1)
        } catch (error) {
          setCommitError(errorText(error))
        } finally {
          setCommitBusy(false)
        }
      }, [repoId, commitBusy, selectedChangePaths, commitMessage, t])

      /**
       * Ask the model for a `type(scope): subject` draft and put it in the
       * message box. Nothing is committed: the user reviews and edits it first.
       */
      const generateMessage = useCallback(async () => {
        if (!repoId || commitBusy || commitAiBusy) return
        if (selectedChangePaths.length === 0) {
          setCommitError(t('commitSelectRequired'))
          return
        }
        setCommitAiBusy(true)
        setCommitError('')
        setCommitNotice('')
        try {
          const payload = await postJson({
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
          setCommitError(errorText(error))
        } finally {
          setCommitAiBusy(false)
        }
      }, [repoId, commitBusy, commitAiBusy, selectedChangePaths, t])

      const commitSelected = useCallback(() => {
        void performCommit()
      }, [performCommit])

      const showRepoNotice = useCallback((text, kind = 'ok') => {
        setRepoNotice({ text, kind })
        if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
        noticeTimer.current = window.setTimeout(() => setRepoNotice(null), 6000)
      }, [])

      /**
       * Poll one remote job until it settles. The progress strip shows git's
       * last output line and percentage while it runs.
       * @param {string} id - job id.
       * @param {string} op - fetch, pull, or push.
       * @returns {Promise<void>}
       */
      const pollRemoteJob = useCallback(
        async (id, op) => {
          remotePollRef.current = id
          for (;;) {
            await new Promise((resolve) => setTimeout(resolve, 700))
            if (remotePollRef.current !== id) return
            let snapshot
            try {
              snapshot = await fetchJson('remoteJob', { repo: repoId, id })
            } catch (error) {
              if (remotePollRef.current !== id) return
              remotePollRef.current = ''
              setRemoteJob({ id, op, state: 'error', error: errorText(error), lines: [] })
              return
            }
            if (remotePollRef.current !== id) return
            setRemoteJob(snapshot)
            if (snapshot.state === 'running' || snapshot.state === 'cancelling') continue
            if (snapshot.state === 'done') {
              showRepoNotice(t(remoteDoneKey(op)))
              refresh()
              setChangesTick((value) => value + 1)
            } else if (snapshot.state === 'cancelled') {
              showRepoNotice(t('remoteCancelled'))
            } else {
              showRepoNotice(snapshot.error || t('remoteFailed'), 'error')
            }
            if (remoteClearTimer.current) window.clearTimeout(remoteClearTimer.current)
            remoteClearTimer.current = window.setTimeout(() => setRemoteJob(null), 6000)
            return
          }
        },
        [repoId, refresh, showRepoNotice, t],
      )

      /**
       * Start a remote operation and show its progress.
       * @param {string} op - fetch, pull, or push.
       * @param {{ rebase?: boolean, forceWithLease?: boolean }} [options] - user choices.
       * @returns {Promise<void>}
       */
      const runRemote = useCallback(
        async (op, options = {}) => {
          if (!repoId) return
          setActionBusy(true)
          setActionError('')
          try {
            const payload = await postJson({ repo: repoId, action: 'remote', op, ...options })
            setActionDialog(null)
            setRemoteJob({ id: payload.id, op, label: payload.label, state: 'running', lines: [], percent: null })
            void pollRemoteJob(payload.id, op)
          } catch (error) {
            setActionError(errorText(error))
          } finally {
            setActionBusy(false)
          }
        },
        [repoId, pollRemoteJob],
      )

      /**
       * Fetch runs directly; pull and push confirm their strategy in a dialog.
       * @param {string} op - fetch, pull, or push.
       * @returns {void}
       */
      const requestRemote = useCallback(
        (op) => {
          if (!repoId) return
          if (op === 'fetch') {
            void runRemote('fetch')
            return
          }
          setActionError('')
          setActionDialog({
            kind: 'remote',
            op,
            title: op === 'pull' ? t('pull') : t('push'),
            description: op === 'pull' ? t('pullHint') : t('pushHint'),
            checkboxLabel: op === 'pull' ? t('pullRebase') : t('forceWithLease'),
            checkboxDefault: false,
            confirmLabel: op === 'pull' ? t('pull') : t('push'),
          })
        },
        [repoId, runRemote, t],
      )

      const cancelRemoteJob = useCallback(() => {
        if (!repoId || !remoteJob || remoteJob.state !== 'running') return
        void postJson({ repo: repoId, action: 'remoteCancel', id: remoteJob.id }).catch(() => {})
      }, [repoId, remoteJob])

      const executeBranchOp = useCallback(
        async (op, payload) => {
          if (!repoId || actionBusy) return false
          setActionBusy(true)
          setActionError('')
          try {
            const result = await postJson({ repo: repoId, action: 'branch', op, ...payload })
            const detail = result && (result.newName || result.branch)
              ? ` · ${result.newName || result.branch}`
              : ''
            showRepoNotice(`${t('branchDone')}${detail}`)
            if (op === 'checkout' && result.branch) {
              setRefValue(`refs/heads/${result.branch}`)
            } else if (op === 'create' && result.checkout && result.branch) {
              setRefValue(`refs/heads/${result.branch}`)
            } else if (op === 'rename' && payload.branch && refValue === `refs/heads/${payload.branch}`) {
              setRefValue(`refs/heads/${result.newName}`)
            } else if (op === 'delete' && payload.branch && refValue === `refs/heads/${payload.branch}`) {
              setRefValue('')
            }
            setCommitError('')
            refresh()
            setChangesTick((value) => value + 1)
            return true
          } catch (error) {
            if (error && (error.conflict || (error.state && error.state.operation))) {
              showRepoNotice(errorText(error), 'error')
            } else {
              setActionError(errorText(error))
            }
            // A failed merge/rebase may still have changed the repository state.
            refresh()
            setChangesTick((value) => value + 1)
            return false
          } finally {
            setActionBusy(false)
          }
        },
        [repoId, actionBusy, refValue, t, showRepoNotice, refresh],
      )

      const executeDiscard = useCallback(
        async (entry) => {
          if (!repoId || actionBusy || !entry) return
          setActionBusy(true)
          setActionError('')
          try {
            await postJson({ repo: repoId, action: 'discard', paths: [entry.path] })
            setActionDialog(null)
            setCommitError('')
            showRepoNotice(`${t('discarded')} · ${entry.path}`)
            setChangesTick((value) => value + 1)
          } catch (error) {
            setActionError(errorText(error))
          } finally {
            setActionBusy(false)
          }
        },
        [repoId, actionBusy, t, showRepoNotice],
      )

      const resolveConflict = useCallback(
        async (entry) => {
          if (!repoId || actionBusy || !entry) return
          setActionBusy(true)
          setActionError('')
          try {
            await postJson({ repo: repoId, action: 'resolve', paths: [entry.path] })
            showRepoNotice(`${t('resolved')} · ${entry.path}`)
            setChangesTick((value) => value + 1)
          } catch (error) {
            showRepoNotice(errorText(error), 'error')
          } finally {
            setActionBusy(false)
          }
        },
        [repoId, actionBusy, t, showRepoNotice],
      )

      const requestDiscard = useCallback(
        (entry) => {
          if (!entry) return
          const reason = entry.conflict
            ? t('discardConflict')
            : entry.untracked
              ? t('discardUntracked')
              : entry.x === 'A'
                ? t('discardAdded')
                : entry.status === 'D'
                  ? t('discardDeleted')
                  : t('discardModified')
          setActionError('')
          setActionDialog({
            kind: 'discard',
            entry,
            title: `${t('discardTitle')} · ${entry.path}`,
            description: reason,
            confirmLabel: t('discardConfirm'),
            danger: true,
          })
        },
        [t],
      )

      const executeRollback = useCallback(
        async (paths, deleteAdded) => {
          if (!repoId || rollbackBusy) return
          setRollbackBusy(true)
          setRollbackError('')
          try {
            await postJson({ repo: repoId, action: 'rollback', paths, deleteAdded })
            setRollbackOpen(false)
            setCommitError('')
            setDeselectedChanges(new Set())
            showRepoNotice(`${t('rollbackDone')} · ${paths.length}`)
            setChangesTick((value) => value + 1)
            setReloadTick((value) => value + 1)
          } catch (error) {
            setRollbackError(errorText(error))
          } finally {
            setRollbackBusy(false)
          }
        },
        [repoId, rollbackBusy, t, showRepoNotice],
      )

      /**
       * Run one commit-level action from the details pane.
       * @param {string} op - undo, revert, cherryPick, or checkout.
       * @returns {Promise<void>}
       */
      const executeHistoryOp = useCallback(
        async (op, hashArg) => {
          if (!repoId || actionBusy) return
          const hash = hashArg || (details && details.hash ? details.hash : '')
          setActionBusy(true)
          setActionError('')
          try {
            const result = await postJson({ repo: repoId, action: 'history', op, ...(hash ? { hash } : {}) })
            setActionDialog(null)
            showRepoNotice(`${t('historyDone')} · ${t(historyLabelKey(op))}`)
            setSelected('')
            setDetails(null)
            setDetailsError('')
            refresh()
            setChangesTick((value) => value + 1)
            return result
          } catch (error) {
            if (error && (error.conflict || (error.state && error.state.operation))) {
              showRepoNotice(errorText(error), 'error')
              setActionDialog(null)
            } else {
              setActionError(errorText(error))
            }
            refresh()
            setChangesTick((value) => value + 1)
            return null
          } finally {
            setActionBusy(false)
          }
        },
        [repoId, actionBusy, details, t, showRepoNotice, refresh],
      )

      const requestHistoryOp = useCallback(
        (op, hashArg) => {
          const hash = hashArg || (details && details.hash ? details.hash : '')
          if (op !== 'undo' && !hash) return
          setActionError('')
          setActionDialog({
            kind: 'history',
            op,
            payload: hash ? { hash } : {},
            title: t(historyLabelKey(op)),
            description: t(historyHintKey(op)),
            confirmLabel: t(historyLabelKey(op)),
            danger: op === 'undo' || op === 'checkout',
          })
        },
        [details, t],
      )

      const requestAbortOperation = useCallback(() => {
        setActionError('')
        setActionDialog({
          kind: 'branch',
          op: 'abort',
          title: t('abortOperation'),
          description: t('branchAbortConfirm'),
          confirmLabel: t('abortOperation'),
          danger: true,
        })
      }, [t])

      /**
       * Menu for one commit row. Items depend on the commit itself: the checked
       * out commit cannot be checked out or cherry-picked again, merge commits
       * cannot be reverted here, and "Undo" only exists for HEAD.
       * @param {object} commit - commit row payload.
       * @returns {Array<object>} menu items.
       */
      const buildCommitMenu = useCallback(
        (commit) => {
          const head = log && log.head ? log.head.hash : ''
          const isHead = Boolean(head) && commit.hash === head
          const isMerge = Array.isArray(commit.parents) && commit.parents.length > 1
          const items = [
            { id: 'copy-hash', label: t('copyHash'), hint: commit.hash.slice(0, 7), onSelect: () => void copyHash(commit.hash) },
            {
              id: 'copy-subject',
              label: t('copyCommitMessage'),
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
              label: t('checkoutCommit'),
              onSelect: () => requestHistoryOp('checkout', commit.hash),
            })
            if (!isMerge) {
              items.push({
                id: 'cherryPick',
                label: t('cherryPickCommit'),
                onSelect: () => requestHistoryOp('cherryPick', commit.hash),
              })
            }
          }
          if (!isMerge) {
            items.push({
              id: 'revert',
              label: t('revertCommit'),
              onSelect: () => requestHistoryOp('revert', commit.hash),
            })
          }
          if (isHead) {
            items.push({ separator: true })
            items.push({
              id: 'undo',
              label: t('undoCommit'),
              danger: true,
              onSelect: () => requestHistoryOp('undo', commit.hash),
            })
          }
          return items
        },
        [log, t, copyHash, requestHistoryOp],
      )

      const openCommitMenu = useCallback((commit, point) => {
        setSelected(commit.hash)
        setCommitMenu({ commit, x: point.x, y: point.y })
      }, [])

      const continueBranchOperation = useCallback(() => {
        void executeBranchOp('continue', {})
      }, [executeBranchOp])

      const confirmAction = useCallback(
        ({ value, checked }) => {
          const dialog = actionDialog
          if (!dialog || actionBusy) return
          if (dialog.kind === 'discard') {
            void executeDiscard(dialog.entry)
            return
          }
          if (dialog.kind === 'history') {
            void executeHistoryOp(dialog.op)
            return
          }
          if (dialog.kind === 'remote') {
            void runRemote(
              dialog.op,
              dialog.op === 'pull' ? { rebase: Boolean(checked) } : { forceWithLease: Boolean(checked) },
            )
            return
          }
          const payload = { ...dialog.payload }
          if (dialog.input) {
            const name = String(value || '').trim()
            if (!name) {
              setActionError(t('branchNameRequired'))
              return
            }
            if (!looksLikeBranchName(name)) {
              setActionError(t('invalidBranchName'))
              return
            }
            if (dialog.op === 'rename') payload.newName = name
            else payload.branch = name
          }
          if (dialog.op === 'create') payload.checkout = Boolean(checked)
          if (dialog.op === 'delete') payload.force = Boolean(checked)
          void executeBranchOp(dialog.op, payload)
        },
        [actionDialog, actionBusy, executeBranchOp, executeDiscard, executeHistoryOp, runRemote, t],
      )

      const closeActionDialog = useCallback(() => {
        if (actionBusy) return
        setActionDialog(null)
        setActionError('')
      }, [actionBusy])

      const refEntry = useMemo(() => {
        if (!refValue || !log || !Array.isArray(log.refs)) return null
        return log.refs.find((entry) => entry.ref === refValue) || null
      }, [log, refValue])
      const branchState = log && log.state ? log.state : null

      /**
       * Actions for one branch row in the ref dropdown: browse (single click)
       * stays separate from acting on the branch (the row's "…" button).
       * @param {object|null} entry - ref catalogue entry, or null for "all refs".
       * @returns {Array<object>} menu items.
       */
      const buildBranchMenu = useCallback(
        (entry) => {
          const items = []
          const current = branchState && branchState.branch ? branchState.branch : ''
          const entryName = entry
            ? entry.kind === 'tag'
              ? `${entry.name}${t('tagSuffix')}`
              : entry.name
            : ''
          const open = (config) => () => {
            setActionError('')
            setActionDialog(config)
          }

          if (entry && refValue !== entry.ref) {
            items.push({
              id: 'history',
              label: t('showHistory'),
              hint: entryName,
              onSelect: () => setRefValue(entry.ref),
            })
            items.push({ separator: true })
          }
          if (entry && entry.kind === 'branch' && !entry.head) {
            items.push({
              id: 'checkout',
              label: t('checkoutBranch'),
              hint: entry.name,
              onSelect: open({
                kind: 'branch',
                op: 'checkout',
                title: t('checkoutBranch'),
                description: `${t('checkoutBranch')} · ${entry.name}`,
                confirmLabel: t('checkoutBranch'),
                payload: { branch: entry.name },
              }),
            })
          }
          if (entry && entry.kind === 'remote') {
            items.push({
              id: 'checkout-remote',
              label: t('checkoutRemote'),
              hint: entry.name,
              onSelect: open({
                kind: 'branch',
                op: 'create',
                title: t('checkoutRemote'),
                description: entry.name,
                input: true,
                label: t('branchName'),
                initialValue: localNameForRemote(entry.name),
                placeholder: t('branchName'),
                confirmLabel: t('checkoutBranch'),
                checkboxLabel: t('checkoutAfterCreate'),
                checkboxDefault: true,
                payload: { startRef: entry.ref },
              }),
            })
          }
          items.push({
            id: 'create',
            label: t('createBranch'),
            hint: entryName || t('head'),
            onSelect: open({
              kind: 'branch',
              op: 'create',
              title: t('createBranch'),
              description: entry ? `${t('createBranch')} · ${entryName}` : t('createBranch'),
              input: true,
              label: t('branchName'),
              initialValue: '',
              placeholder: t('branchName'),
              confirmLabel: t('createBranch'),
              checkboxLabel: t('checkoutAfterCreate'),
              checkboxDefault: true,
              payload: entry ? { startRef: entry.ref } : {},
            }),
          })
          if (entry && entry.kind === 'branch') {
            items.push({
              id: 'rename',
              label: t('renameBranch'),
              hint: entry.name,
              onSelect: open({
                kind: 'branch',
                op: 'rename',
                title: `${t('renameBranch')} · ${entry.name}`,
                description: `${t('renameBranch')} ${entry.name}`,
                input: true,
                label: t('newBranchName'),
                initialValue: entry.name,
                placeholder: t('newBranchName'),
                confirmLabel: t('confirm'),
                payload: { branch: entry.name },
              }),
            })
          }
          if (entry && entry.kind === 'branch' && !entry.head) {
            items.push({
              id: 'delete',
              label: t('deleteBranch'),
              hint: entry.name,
              danger: true,
              onSelect: open({
                kind: 'branch',
                op: 'delete',
                title: `${t('deleteBranch')} · ${entry.name}`,
                description: `${t('deleteBranch')} ${entry.name}`,
                danger: true,
                confirmLabel: t('deleteBranch'),
                checkboxLabel: t('forceDelete'),
                checkboxDefault: false,
                payload: { branch: entry.name },
              }),
            })
          }
          if (entry && current && entry.kind !== 'tag' && entry.name !== current) {
            items.push({ separator: true })
            items.push({
              id: 'merge',
              label: t('mergeBranch'),
              hint: `${entryName} → ${current}`,
              onSelect: open({
                kind: 'branch',
                op: 'merge',
                title: t('mergeBranch'),
                description: `${t('mergeBranch')} · ${entryName} → ${current}`,
                confirmLabel: t('mergeBranch'),
                payload: { ref: entry.ref },
              }),
            })
            items.push({
              id: 'rebase',
              label: t('rebaseBranch'),
              hint: `${current} → ${entryName}`,
              onSelect: open({
                kind: 'branch',
                op: 'rebase',
                title: t('rebaseBranch'),
                description: `${t('rebaseBranch')} · ${current} → ${entryName}`,
                confirmLabel: t('rebaseBranch'),
                payload: { ref: entry.ref },
              }),
            })
          }
          if (branchState && branchState.operation) {
            items.push({ separator: true })
            if (branchState.operation !== 'bisect') {
              items.push({
                id: 'continue',
                label: `${t('continueOperation')} · ${operationLabel(branchState.operation, t)}`,
                onSelect: () => {
                  void executeBranchOp('continue', {})
                },
              })
            }
            items.push({
              id: 'abort',
              label: `${t('abortOperation')} · ${operationLabel(branchState.operation, t)}`,
              danger: true,
              onSelect: open({
                kind: 'branch',
                op: 'abort',
                title: t('abortOperation'),
                description: t('branchAbortConfirm'),
                confirmLabel: t('abortOperation'),
                danger: true,
              }),
            })
          }
          return items
        },
        [branchState, t, executeBranchOp, refValue],
      )

      const branchOptions = useMemo(() => {
        const options = [{ value: '', label: t('allRefs'), icon: 'all', actions: buildBranchMenu(null) }]
        for (const entry of log && Array.isArray(log.refs) ? log.refs : []) {
          options.push({
            value: entry.ref,
            label: `${entry.name}${entry.kind === 'tag' ? t('tagSuffix') : ''}`,
            group:
              entry.kind === 'branch'
                ? t('localBranches')
                : entry.kind === 'remote'
                  ? t('remoteBranches')
                  : t('tags'),
            icon: entry.kind,
            head: entry.head,
            actions: buildBranchMenu(entry),
          })
        }
        return options
      }, [log, t, buildBranchMenu])

      const treePane = h(
        'div',
        { className: 'gv-pane gv-pane-left', style: { width: `${leftWidth}px`, flexBasis: `${leftWidth}px` } },
        h(
          'div',
          { className: 'gv-left', ref: leftRef },
          h(FileTreePane, {
            t,
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
            t,
            axis: 'y',
            label: t('resizeChanges'),
            value: changesHeight,
            min: MIN_CHANGES,
            max: maxChanges,
            invert: true,
            onChange: setChangesHeight,
            onCommit: (next) => writeWidth('changes', next),
            onReset: () => {
              setChangesHeight(DEFAULT_CHANGES)
              writeWidth('changes', DEFAULT_CHANGES)
            },
          }),
          h(ChangesPane, {
            t,
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
            notice: commitNotice,
            repoNotice,
            repoState: branchState,
            commitError,
            height: changesHeight,
            onToggle: toggleChange,
            onToggleAll: toggleAllChanges,
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
              t,
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
              onContinue: () => executeBranchOp('continue', {}),
              onAbort: () =>
                setActionDialog({
                  kind: 'branch',
                  op: 'abort',
                  title: t('abortOperation'),
                  description: t('branchAbortConfirm'),
                  confirmLabel: t('abortOperation'),
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
          t,
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
            t,
            label: t('resizeTree'),
            value: leftWidth,
            min: MIN_LEFT,
            max: maxLeft,
            invert: false,
            onChange: setLeftWidth,
            onCommit: (next) => writeWidth('left', next),
            onReset: () => {
              setLeftWidth(220)
              writeWidth('left', 220)
            },
          })

      const rightHandle = compact
        ? null
        : h(ResizeHandle, {
            t,
            label: t('resizeDetails'),
            value: rightWidth,
            min: MIN_RIGHT,
            max: maxRight,
            invert: true,
            onChange: setRightWidth,
            onCommit: (next) => writeWidth('right', next),
            onReset: () => {
              setRightWidth(360)
              writeWidth('right', 360)
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
                t,
                label: t('resizeTree'),
                value: leftWidth,
                min: MIN_LEFT,
                max: maxLeft,
                invert: false,
                onChange: setLeftWidth,
                onCommit: (next) => writeWidth('left', next),
                onReset: () => {
                  setLeftWidth(220)
                  writeWidth('left', 220)
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
        h('style', { key: 'gv-style' }, CSS),
        h(Toolbar, {
          t,
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
          onPull: () => requestRemote('pull'),
          onPush: () => requestRemote('push'),
        }),
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
                `${t(remoteOpKey(remoteJob.op))}${remoteJob.percent != null ? ` · ${remoteJob.percent}%` : ''}`,
              ),
              h(
                'span',
                { className: 'gv-remote-line', title: (remoteJob.lines || []).join('\n') || remoteJob.error || '' },
                (remoteJob.lines && remoteJob.lines.length
                  ? remoteJob.lines[remoteJob.lines.length - 1]
                  : remoteJob.error || t('remoteRunning')),
              ),
              remoteJob.state === 'running'
                ? h('button', { type: 'button', className: 'gv-remote-cancel', onClick: cancelRemoteJob }, t('cancel'))
                : null,
            )
          : null,
        emptyRepos
          ? h(
              'div',
              { className: 'gv-main-empty' },
              h(IconGraphMark, { size: 34 }),
              h('div', { className: 'gv-state-title' }, t('noRepos')),
              h('div', { className: 'gv-state-text' }, t('noReposHint')),
              h(
                'button',
                { type: 'button', className: 'gv-button', onClick: retryRepos },
                h(IconRefresh, { size: 13 }),
                h('span', null, t('retry')),
              ),
            )
          : reposError
            ? h(
                'div',
                { className: 'gv-main-empty' },
                h('div', { className: 'gv-state-title' }, t('errorTitle')),
                h('div', { className: 'gv-state-text' }, reposError),
                h(
                  'button',
                  { type: 'button', className: 'gv-button', onClick: retryRepos },
                  h(IconRefresh, { size: 13 }),
                  h('span', null, t('retry')),
                ),
              )
            : repos === null
              ? h('div', { className: 'gv-main-empty' }, h(Spinner, { label: t('loading') }))
              : main,
        compare
          ? h(CompareDialog, {
              t,
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
              t,
              dialog: actionDialog,
              busy: actionBusy,
              error: actionError,
              onClose: closeActionDialog,
              onConfirm: confirmAction,
            })
          : null,
        rollbackOpen
          ? h(RollbackDialog, {
              t,
              entries: visibleChanges,
              busy: rollbackBusy,
              error: rollbackError,
              onClose: () => {
                if (rollbackBusy) return
                setRollbackOpen(false)
                setRollbackError('')
              },
              onConfirm: (paths, deleteAdded) => {
                void executeRollback(paths, deleteAdded)
              },
            })
          : null,
        commitMenu
          ? h(PopupMenu, {
              t,
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

    const CSS = `
.gv-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;overflow:hidden;padding-top:var(--dsh-frame-top-clearance,0px)}
.gv-root *{box-sizing:border-box}
.gv-toolbar{display:flex;align-items:center;gap:8px;row-gap:6px;padding:6px 12px;padding-left:max(12px,var(--dsh-frame-leading-clearance,12px));min-height:44px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;flex-wrap:wrap}
.gv-brand{display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:var(--dsw-alias-label-primary);white-space:nowrap}
.gv-sync{display:flex;align-items:center;gap:2px;padding:1px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}
.gv-sync .gv-icon-button{position:relative;width:26px;height:26px;border-radius:6px}
.gv-sync-count{position:absolute;top:-4px;right:-4px;min-width:13px;height:13px;line-height:13px;padding:0 3px;border-radius:7px;font-size:8.5px;font-weight:700;text-align:center;color:var(--dsw-alias-bg-base)}
.gv-sync-ahead{background:var(--dsw-alias-state-success-primary)}
.gv-sync-behind{background:var(--dsw-alias-brand-primary)}
.gv-remote{display:flex;align-items:center;gap:8px;padding:4px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary)}
.gv-remote-label{flex:none;font-weight:600;color:var(--dsw-alias-label-primary)}
.gv-remote-line{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left}
.gv-remote-error .gv-remote-label{color:var(--dsw-alias-state-error-primary)}
.gv-remote-cancel{flex:none;height:20px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;cursor:pointer}
.gv-remote-cancel:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-divider{width:1px;height:18px;background:var(--dsw-alias-border-l1);flex:none}
.gv-dropdown{position:relative;flex:none;max-width:220px}
.gv-dropdown-trigger{display:flex;align-items:center;gap:7px;width:100%;height:28px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;outline:none;transition:background .12s,border-color .12s,box-shadow .12s}
.gv-dropdown-trigger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,var(--dsw-alias-border-l1))}
.gv-dropdown-trigger:focus-visible,.gv-dropdown-open{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent)}
.gv-dropdown-trigger:disabled{opacity:.55;cursor:default}
.gv-dropdown-icon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary)}
.gv-dropdown-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.gv-dropdown-chevron{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary);transition:transform .14s}
.gv-dropdown-open .gv-dropdown-chevron{transform:rotate(180deg)}
.gv-dropdown-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:40;min-width:100%;width:max-content;max-width:min(340px,calc(100vw - 24px));max-height:320px;overflow:auto;padding:5px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.22);animation:gv-pop .12s ease-out}
@keyframes gv-pop{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.gv-dropdown-group{padding:6px 8px 4px;font-size:10px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.gv-dropdown-option{position:relative;display:flex;align-items:center;gap:8px;min-height:30px;padding:5px 8px;border-radius:7px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-primary)}
.gv-dropdown-option:hover,.gv-dropdown-active{background:var(--dsw-alias-bg-layer-2)}
.gv-dropdown-selected{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.gv-opt-icon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary)}
.gv-opt-text{display:flex;flex-direction:column;min-width:0;flex:1}
.gv-opt-action{flex:none;margin-left:auto;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.45}
.gv-dropdown-option:hover .gv-opt-action,.gv-opt-action:focus-visible,.gv-opt-action-open{opacity:1}
.gv-opt-action:hover,.gv-opt-action-open{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.gv-opt-menu{position:fixed;left:0;top:0;z-index:60;min-width:232px;max-height:320px;overflow:auto;padding:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 28px rgba(0,0,0,.24);animation:gv-pop .1s ease-out}
.gv-opt-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:5px 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-opt-menu-item:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.gv-opt-menu-item:disabled{opacity:.45;cursor:default}
.gv-opt-menu-label{flex:none;white-space:nowrap}
.gv-opt-menu-hint{margin-left:auto;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px}
.gv-opt-menu-sep{height:1px;margin:4px 3px;background:var(--dsw-alias-border-l1)}
.gv-status-actions{display:flex;align-items:center;gap:6px;flex:none}
.gv-status-btn{height:18px;padding:0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer}
.gv-status-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.gv-status-btn:disabled{opacity:.45;cursor:default}
.gv-status-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent)}
.gv-opt-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-opt-desc{font-size:10.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-opt-check{display:inline-flex;flex:none;color:var(--dsw-alias-brand-primary)}
.gv-opt-head{flex:none;font-size:9.5px;font-weight:700;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-radius:6px;padding:1px 5px}
.gv-opt-head-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.gv-dropdown-empty{padding:10px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.gv-action-menu{position:relative;flex:none}
.gv-action-trigger.gv-action-open{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent);color:var(--dsw-alias-label-primary)}
.gv-action-list{position:absolute;top:calc(100% + 6px);right:0;z-index:45;min-width:238px;max-width:min(330px,calc(100vw - 24px));padding:5px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.22);animation:gv-pop .12s ease-out}
.gv-action-item{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:30px;padding:5px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-action-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.gv-action-item:disabled{opacity:.4;cursor:default}
.gv-action-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-action-hint{flex:none;max-width:148px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--dsw-alias-label-secondary)}
.gv-action-danger .gv-action-label{color:var(--dsw-alias-state-error-primary)}
.gv-action-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.gv-action-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
.gv-search{position:relative;display:flex;align-items:center;min-width:170px;flex:0 1 260px;color:var(--dsw-alias-label-secondary)}
.gv-search svg{position:absolute;left:8px;pointer-events:none}
.gv-search-input{width:100%;height:28px;padding:0 9px 0 27px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.gv-search-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8}
.gv-search-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent)}
.gv-search-input::-webkit-search-cancel-button{cursor:pointer}
.gv-spacer{flex:1;min-width:4px}
.gv-count{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.gv-match-count{color:var(--dsw-alias-brand-primary)}
.gv-icon-button{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;transition:background .12s,color .12s,border-color .12s}
.gv-icon-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.gv-icon-button:active:not(:disabled){transform:translateY(1px)}
.gv-icon-button:disabled{opacity:.45;cursor:not-allowed}
.gv-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background .12s,color .12s,border-color .12s,box-shadow .12s}
.gv-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.gv-button:active:not(:disabled){transform:translateY(1px)}
.gv-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.gv-button:disabled{opacity:.45;cursor:not-allowed}
.gv-button-primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 74%,#000);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 74%,#000);color:#fff;font-weight:600}
.gv-button-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 66%,#000);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 66%,#000)}
.gv-button-ai{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);color:var(--dsw-alias-brand-primary)}
.gv-button-ai:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent)}
.gv-button-danger{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 76%,#000);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 76%,#000);color:#fff;font-weight:600}
.gv-button-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 68%,#000);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 68%,#000)}
.gv-button-danger-ghost{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,transparent);background:transparent;color:var(--dsw-alias-state-error-primary)}
.gv-button-danger-ghost:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.gv-button-ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}
.gv-button-ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.gv-button-xs{height:22px;padding:0 7px;font-size:10.5px;border-radius:5px}
.gv-main{flex:1;min-height:0;display:flex;overflow:hidden}
.gv-pane{min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gv-pane-left{flex:0 0 auto;background:var(--dsw-alias-bg-layer-1);border-right:1px solid var(--dsw-alias-border-l1)}
.gv-left{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gv-left .gv-tree{flex:1;min-height:${MIN_TREE}px}
.gv-changes{flex:0 0 auto;min-height:${MIN_CHANGES}px;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1);container-type:inline-size}
.gv-changes-head{flex:none;height:32px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11.5px;font-weight:600}
.gv-changes-title{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-changes-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 5px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}
.gv-changes-total{font-size:10px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.gv-changes-actions{display:flex;align-items:center;gap:2px;flex:none}
.gv-text-button{height:22px;padding:0 6px;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:10.5px;font-weight:500;cursor:pointer}
.gv-text-button:disabled{opacity:.45;cursor:default}
.gv-text-button-danger{color:var(--dsw-alias-state-error-primary)}
.gv-detail-actions{display:flex;flex-wrap:wrap;gap:4px;padding:2px 0 6px;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:2px}
.gv-rollback-list{flex:1;min-height:90px;max-height:34vh;overflow:auto;display:flex;flex-direction:column;gap:1px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.gv-rollback-row{display:flex;align-items:center;gap:7px;padding:3px 5px;border-radius:5px;cursor:pointer;font-size:11.5px}
.gv-rollback-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-rollback-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left}
.gv-text-button:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.gv-text-button:disabled{opacity:.45;cursor:default}
.gv-icon-xs{width:22px;height:22px;border-radius:5px}
.gv-changes-summary{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.gv-sum-chip{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 6px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9.5px;font-weight:600;white-space:nowrap}
.gv-sum-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
.gv-sum-untracked{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.gv-sum-modified{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}
.gv-sum-staged{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 11%,transparent)}
.gv-sum-conflict,.gv-sum-deleted{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.gv-changes-scope{flex:none;display:flex;align-items:center;gap:5px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary);min-width:0}
.gv-changes-scope-label{flex:none}
.gv-changes-scope-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-repo-banner{flex:none;display:flex;align-items:center;gap:7px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,transparent);color:var(--dsw-alias-label-primary);font-size:10.5px;line-height:1.4}
.gv-repo-banner svg{flex:none;color:var(--dsw-alias-state-warn-primary)}
.gv-repo-banner-text{flex:1;min-width:0}
.gv-repo-banner-actions{display:flex;align-items:center;gap:4px;flex:none}
.gv-repo-notice{flex:none;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:10.5px;line-height:1.4;overflow-wrap:anywhere}
.gv-repo-notice-ok{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 9%,transparent)}
.gv-repo-notice-error{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);max-height:110px;overflow:auto}
.gv-changes-list{flex:1;min-height:0;overflow:auto;padding:4px}
.gv-change-row{display:flex;align-items:center;gap:6px;min-width:0;min-height:30px;padding:3px 5px;border-radius:6px;cursor:pointer;outline:none}
.gv-change-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-change-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-change-check{flex:none;width:13px;height:13px;margin:0;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.gv-change-status{display:inline-flex;align-items:center;justify-content:center;flex:none;width:14px;height:14px;border-radius:3px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;font-weight:700}
.gv-chg-add{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent);color:var(--dsw-alias-state-success-primary)}
.gv-chg-mod{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary)}
.gv-chg-del,.gv-chg-conflict{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary)}
.gv-chg-ren{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);color:var(--dsw-alias-brand-primary)}
.gv-change-text{display:flex;flex-direction:column;min-width:0;flex:1}
.gv-change-name{font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-change-dir{font-size:9.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-change-tags{display:flex;align-items:center;gap:3px;flex:none;max-width:98px;overflow:hidden}
.gv-change-tag{flex:none;font-size:9px;border-radius:5px;padding:1px 5px;line-height:1.5;white-space:nowrap}
.gv-tag-untracked{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent)}
.gv-tag-staged{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.gv-tag-modified{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent)}
.gv-tag-conflict{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent)}
.gv-change-discard{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity .12s,background .12s,color .12s}
.gv-change-resolve{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-state-success-primary);cursor:pointer;opacity:.85;transition:opacity .12s,background .12s}
.gv-change-resolve:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 15%,transparent)}
.gv-change-resolve:disabled{opacity:.35;cursor:not-allowed}
.gv-change-row:hover .gv-change-discard,.gv-change-discard:focus-visible{opacity:1}
@media (hover:none){.gv-change-discard{opacity:.65}}
.gv-change-discard:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.gv-change-discard:disabled{opacity:.3;cursor:not-allowed}
.gv-changes-state{padding:14px 10px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
.gv-commit{flex:none;display:flex;flex-direction:column;gap:6px;padding:8px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.gv-commit-input{width:100%;min-height:46px;max-height:72px;resize:none;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;line-height:1.45;outline:none}
.gv-commit-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent)}
.gv-commit-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8}
.gv-commit-bar{display:flex;align-items:center;gap:8px}
.gv-commit-generate{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.gv-commit-generate:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-border-l1))}
.gv-commit-generate:disabled{opacity:.45;cursor:default}
.gv-commit-hint{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-commit-submit{height:26px;min-width:88px;padding:0 14px;font-size:11.5px;border-radius:7px}
.gv-action-chip{display:inline-flex;align-items:center;height:22px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap}
.gv-action-chip:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.gv-action-chip-danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,var(--dsw-alias-border-l1))}
.gv-action-chip-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.gv-commit-note{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.gv-commit-ok{color:var(--dsw-alias-state-success-primary)}
.gv-commit-error{color:var(--dsw-alias-state-error-primary)}
.gv-pane-center{flex:1 1 auto;min-width:280px;background:var(--dsw-alias-bg-base)}
.gv-pane-right{flex:0 0 auto;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1)}
.gv-main-empty{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;text-align:center;color:var(--dsw-alias-label-secondary)}
.gv-main-empty svg{opacity:.7}
.gv-main-compact{flex-direction:column}
.gv-compact-top{flex:1;min-height:0;display:flex}
.gv-compact-bottom{flex:0 0 44%;min-height:0;display:flex;border-top:1px solid var(--dsw-alias-border-l1)}
.gv-compact-bottom .gv-pane-right{border-left:0;flex:1;width:auto}
.gv-split{flex:0 0 6px;position:relative;cursor:col-resize;touch-action:none;outline:none;background:transparent}
.gv-split::before{content:'';position:absolute;top:0;bottom:0;left:2px;width:2px;background:transparent;transition:background .12s}
.gv-split:hover::before,.gv-split:focus-visible::before,.gv-split-active::before{background:var(--dsw-alias-brand-primary)}
.gv-split-grip{position:absolute;top:50%;left:0;right:0;height:24px;transform:translateY(-50%);border-radius:2px}
.gv-split:focus-visible .gv-split-grip{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-split-row{flex:0 0 7px;cursor:row-resize;background:var(--dsw-alias-bg-base);border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-split-row::before{top:2px;bottom:auto;left:0;right:0;width:auto;height:1px}
.gv-split-row .gv-split-grip{top:0;bottom:0;left:50%;right:auto;width:32px;height:auto;transform:translateX(-50%)}
.gv-log{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.gv-scopebar{flex:none;display:flex;align-items:center;gap:6px;height:30px;padding:0 10px 0 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.gv-scope-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.gv-scope-clear{display:inline-flex;align-items:center;gap:4px;flex:none;height:22px;padding:0 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.gv-scope-clear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.gv-scroll{flex:1;min-height:0;overflow:auto;position:relative;scrollbar-gutter:stable}
.gv-thead,.gv-row{display:grid;grid-template-columns:var(--gv-cols);align-items:center;column-gap:10px;padding:0 12px}
.gv-thead{position:sticky;top:0;z-index:3;height:27px;background:var(--dsw-alias-bg-base);border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.gv-row{height:${ROW_HEIGHT}px;cursor:pointer;border-bottom:1px solid transparent;outline:none;position:relative}
.gv-row-more{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity .1s}
.gv-row:hover .gv-row-more,.gv-row-more:focus-visible{opacity:1}
.gv-row-more:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.gv-menu{position:fixed;z-index:70;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 16px 40px rgba(0,0,0,.28);animation:gv-pop .1s ease-out}
.gv-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-menu-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.gv-menu-item:disabled{opacity:.4;cursor:default}
.gv-menu-danger{color:var(--dsw-alias-state-error-primary)}
.gv-menu-label{flex:none;white-space:nowrap}
.gv-menu-hint{margin-left:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:10.5px}
.gv-menu-sep{height:1px;margin:4px 4px;background:var(--dsw-alias-border-l1)}
.gv-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-row-selected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent)}
.gv-row-selected:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent)}
.gv-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-row-dim{opacity:.32}
.gv-row-dim:hover{opacity:.6}
.gv-graphcell{display:block;overflow:hidden;height:${ROW_HEIGHT}px}
.gv-graph{display:block;overflow:visible}
.gv-subjectcell{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
.gv-subject{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-ref{display:inline-flex;align-items:center;flex:none;max-width:150px;height:17px;padding:0 6px;border:1px solid transparent;border-radius:9px;font-size:10.5px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-ref-branch{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent);color:var(--dsw-alias-label-primary)}
.gv-ref-head{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 76%, #000);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 76%, #000);color:#fff;font-weight:600}
.gv-ref-tag{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, transparent);color:var(--dsw-alias-label-primary)}
.gv-ref-remote{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.gv-author,.gv-date,.gv-hash{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}
.gv-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:56px 24px;text-align:center;color:var(--dsw-alias-label-secondary)}
.gv-state svg{color:var(--dsw-alias-label-secondary);opacity:.7}
.gv-state-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.gv-state-text{font-size:12px;max-width:360px;line-height:1.55}
.gv-loading{display:flex;align-items:center;gap:8px;padding:40px 24px;color:var(--dsw-alias-label-secondary);font-size:12px;justify-content:center}
.gv-spinner{width:14px;height:14px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:gv-spin .8s linear infinite;flex:none}
@keyframes gv-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.gv-spinner{animation-duration:2.4s}}
.gv-statusbar{flex:none;display:flex;align-items:center;gap:10px;height:26px;padding:0 12px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden}
.gv-status-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;min-width:0}
.gv-status-item{flex:none;white-space:nowrap}
.gv-status-ahead{color:var(--dsw-alias-state-success-primary)}
.gv-status-behind{color:var(--dsw-alias-state-warn-primary)}
.gv-status-op{color:var(--dsw-alias-brand-primary);font-weight:600}
.gv-status-busy{margin-left:auto;display:inline-flex;align-items:center}
.gv-inline-spin{width:10px;height:10px;border:1.5px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:gv-spin .8s linear infinite;display:inline-block}
.gv-tree{flex:1;min-height:0;display:flex;flex-direction:column}
.gv-tree-head{flex:none;height:38px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12.5px;font-weight:600}
.gv-tree-rootname{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}
.gv-tree-scroll{flex:1;min-height:0;overflow:auto;padding:4px 0 10px}
.gv-tree-row{display:flex;align-items:center;gap:5px;height:26px;padding-left:8px;padding-right:8px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-primary);white-space:nowrap;outline:none}
.gv-tree-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-tree-row.gv-tree-selected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent)}
.gv-tree-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-tree-row>svg{flex:none;color:var(--dsw-alias-label-secondary)}
.gv-tree-root{font-weight:500}
.gv-chevron{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
.gv-chevron svg{transition:transform .12s}
.gv-chevron-open svg{transform:rotate(90deg)}
.gv-chevron-space{width:16px;flex:none}
.gv-tree-name{overflow:hidden;text-overflow:ellipsis}
.gv-tree-spinner{width:10px;height:10px;border:1.5px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:gv-spin .8s linear infinite;flex:none;margin-left:auto}
.gv-tree-refmode{color:var(--dsw-alias-brand-primary)}
.gv-tree-status{font:600 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:1px 3px;border-radius:3px;flex:none;margin-left:4px;letter-spacing:.02em}
.gv-tone-modified{color:var(--dsw-alias-state-warn-primary)}
.gv-tone-untracked{color:var(--dsw-alias-state-success-primary)}
.gv-tone-added{color:var(--dsw-alias-state-success-primary)}
.gv-tone-deleted{color:var(--dsw-alias-state-error-primary)}
.gv-tone-conflict{color:var(--dsw-alias-state-error-primary)}
.gv-tone-staged{color:var(--dsw-alias-brand-primary)}
.gv-tree-dirty{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);flex:none;margin-left:auto}
.gv-tree-error-mark{margin-left:auto;color:var(--dsw-alias-state-error-primary);font-weight:700;font-size:10px}
.gv-tree-state{padding:10px 12px;font-size:11.5px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gv-tree .gv-loading{padding:20px 10px}
.gv-details{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-1)}
.gv-details-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;height:38px;padding:0 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12.5px;font-weight:600}
.gv-head-scope{font-size:10.5px;font-weight:400;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);border-radius:8px;padding:1px 7px;white-space:nowrap}
.gv-details-body{flex:1;min-height:0;overflow:auto;padding:12px 14px 18px}
.gv-details-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 14px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.gv-details-empty-icon{opacity:.6}
.gv-details-error{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);border-radius:8px;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}
.gv-detail-hashrow{display:flex;align-items:center;gap:6px}
.gv-detail-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:2px 6px}
.gv-copy{width:24px;height:24px}
.gv-copied{font-size:11px;color:var(--dsw-alias-state-success-primary)}
.gv-detail-refs{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.gv-detail-subject{font-size:14px;font-weight:600;line-height:1.45;margin:10px 0 0;overflow-wrap:anywhere}
.gv-detail-message{margin:8px 0 0;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto}
.gv-meta{display:grid;grid-template-columns:62px minmax(0,1fr);gap:6px 10px;margin:14px 0 0;font-size:12px}
.gv-meta dt{color:var(--dsw-alias-label-secondary)}
.gv-meta dd{margin:0;min-width:0;overflow-wrap:anywhere}
.gv-meta-mail{color:var(--dsw-alias-label-secondary);font-size:11.5px}
.gv-parents{display:flex;flex-wrap:wrap;gap:5px}
.gv-parent{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;padding:1px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:4px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer}
.gv-parent:hover{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.gv-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:18px 0 6px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.gv-filter-note{font-size:10.5px;font-weight:400;color:var(--dsw-alias-brand-primary);white-space:nowrap}
.gv-muted{font-size:12px;color:var(--dsw-alias-label-secondary);padding:6px 0}
.gv-files{display:flex;flex-direction:column;gap:1px}
.gv-file{display:flex;align-items:center;gap:8px;min-width:0;width:100%;padding:5px 6px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-file:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-file:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.gv-file-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-file-stat{flex:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px}
.gv-file-binary{color:var(--dsw-alias-label-secondary)}
.gv-file-compare{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);opacity:.6;transition:opacity .12s,background .12s}
.gv-file:hover .gv-file-compare,.gv-file:focus-visible .gv-file-compare{opacity:1;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.gv-add{color:var(--dsw-alias-state-success-primary)}
.gv-del{color:var(--dsw-alias-state-error-primary)}
.gv-status{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:700}
.gv-st-add{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent);color:var(--dsw-alias-state-success-primary)}
.gv-st-mod{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent);color:var(--dsw-alias-state-warn-primary)}
.gv-st-del{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);color:var(--dsw-alias-state-error-primary)}
.gv-st-ren{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);color:var(--dsw-alias-brand-primary)}
.gv-st-other{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.gv-dialog-mask{z-index:10020}
.gv-dialog{width:min(430px,94vw);max-height:min(560px,88vh);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden}
.gv-dialog-wide{width:min(560px,94vw)}
.gv-dialog-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;height:44px;padding:0 10px 0 15px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-dialog-title{font-size:13px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-dialog-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:11px;padding:14px 15px}
.gv-dialog-text{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere}
.gv-dialog-label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.gv-dialog-input{width:100%;height:32px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.gv-dialog-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}
.gv-dialog-check{display:flex;align-items:flex-start;gap:7px;font-size:11.5px;line-height:1.45;color:var(--dsw-alias-label-secondary);cursor:pointer}
.gv-dialog-check input{flex:none;margin:1px 0 0;accent-color:var(--dsw-alias-brand-primary)}
.gv-dialog-error{padding:7px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;overflow:auto}
.gv-dialog-actions{flex:none;display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.gv-modal-mask{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:20px}
.gv-modal-mask,.gv-modal-mask *{box-sizing:border-box}
.gv-modal{width:min(1280px,94vw);height:min(820px,88vh);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.35);overflow:hidden}
.gv-modal-head{flex:none;display:flex;align-items:center;gap:8px;height:46px;padding:0 12px 0 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-modal-heading{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
.gv-modal-path{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-modal-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);padding:1px 6px;border-radius:4px;flex:none}
.gv-modal-body{flex:1;min-height:0;display:flex;flex-direction:column;padding:12px}
.gv-modal-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);font-size:12px}
.gv-modal-foot{flex:none;padding:0 4px 2px;font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.gv-compare{flex:1;min-height:0;display:flex;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-base)}
.gv-cside{flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l1)}
.gv-cside:last-child{border-right:0}
.gv-ctitle{flex:none;height:30px;display:flex;align-items:center;padding:0 10px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-clines{flex:1;min-height:0;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.6;background:var(--dsw-alias-bg-base)}
.gv-crow{display:flex;min-width:max-content;min-height:1.6em}
.gv-cnum{position:sticky;left:0;flex:0 0 46px;text-align:right;padding:0 10px 0 6px;color:var(--dsw-alias-label-secondary);opacity:.75;user-select:none;background:inherit}
.gv-ccode{flex:1;padding:0 14px 0 10px;white-space:pre;color:var(--dsw-alias-label-primary)}
.gv-crow-ctx{background:var(--dsw-alias-bg-base)}
.gv-crow-del{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}
.gv-crow-add{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)}
.gv-crow-blank{background:var(--dsw-alias-bg-base);opacity:.45}
.gv-crow-hunk{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary);font-weight:600}
.gv-chunk{padding:0 10px;white-space:pre}
.gv-loading{justify-content:center}
@container (max-width: 250px){
.gv-change-tags{display:none}
.gv-commit-actions .gv-button svg{display:none}
.gv-commit-keyhint{display:none}
}
@container (max-width: 190px){
.gv-commit-btn{padding:0 4px;gap:4px;font-size:11px}
.gv-commit-actions .gv-button svg{display:none}
.gv-sum-chip{padding:0 5px}
}
`

    /**
     * Register the sidebar entry, its main panel, and the dictionaries.
     * @param {import('@deepseek-ai/cordis').Context} ctx - browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'git-view: dictionaries')
      const t = ctx.locale.bind(NS)

      ctx.slots.inject('main', () =>
        ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, GitViewPanel),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 5,
            label: () => t('panel'),
            locale: NS,
          },
          GitViewIcon,
        ),
      )
    }

    return { inject: ['slots', 'locale'], apply }
  },
})

