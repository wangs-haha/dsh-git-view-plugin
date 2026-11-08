/**
 * Read-only Git plumbing for the Git Graph plugin.
 *
 * One {@link GitData} instance owns every read: it resolves the repository
 * top-level, lists refs/commits/trees/status/remotes, and can stage and commit
 * working-tree changes. Callers pass a repository root that was resolved from a
 * registered DSH workspace; no user-supplied path ever reaches these methods.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { LIMITS, GitRunner, type GitResult, type GitRunOptions } from './exec.js'
import { GitError } from './errors.js'
import { repoPath } from './paths.js'
import type {
  CommitDetails,
  CommitFile,
  CommitRef,
  CommitResult,
  CommitRow,
  DiffData,
  HeadInfo,
  LogData,
  RefEntry,
  RefKind,
  RefRecord,
  StatusEntry,
  TreeEntry,
} from './types.js'

/**
 * Read-only repository access plus the one write the panel performs directly
 * (staging and committing a selection).
 */
export class GitData {
  constructor(private readonly runner: GitRunner = new GitRunner()) {}

  /**
   * Run git in a repository root and return its stdout.
   * @param root - repository root.
   * @param args - git arguments.
   * @param options - per-call overrides.
   * @returns stdout.
   */
  run(root: string, args: readonly string[], options: GitRunOptions = {}): Promise<string> {
    return this.runner.run(root, args, options)
  }

  /**
   * Run git in a repository root, returning the exit status instead of throwing.
   * @param root - repository root.
   * @param args - git arguments.
   * @param options - per-call overrides.
   * @returns the captured run.
   */
  runResult(root: string, args: readonly string[], options: GitRunOptions = {}): Promise<GitResult> {
    return this.runner.runResult(root, args, options)
  }

  /**
   * Resolve the working-tree root that contains `directory`.
   * @param directory - absolute directory.
   * @returns absolute repository root.
   */
  async toplevel(directory: string): Promise<string> {
    const out = await this.runner.run(directory, ['rev-parse', '--show-toplevel'], { timeout: 10_000 })
    const root = out.trim()
    if (!root) throw new GitError('not a Git repository')
    return root
  }

  /**
   * List local branches, remote-tracking branches, and tags.
   * @param root - repository root.
   * @returns the ref catalogue, HEAD first.
   */
  async refs(root: string): Promise<RefRecord[]> {
    const format = ['%(refname)', '%(refname:short)', '%(objectname)', '%(*objectname)', '%(HEAD)', '%(symref)'].join('%00')
    const out = await this.runner.run(root, [
      'for-each-ref',
      `--format=${format}`,
      'refs/heads',
      'refs/remotes',
      'refs/tags',
    ])
    const refs: RefRecord[] = []
    for (const line of out.split('\n')) {
      if (!line) continue
      const [ref, short, object, peeled, head, symref] = line.split('\0')
      if (!ref || !short || symref) continue
      const kind: RefKind = ref.startsWith('refs/heads/') ? 'branch' : ref.startsWith('refs/remotes/') ? 'remote' : 'tag'
      refs.push({
        ref,
        short,
        kind,
        head: head === '*',
        target: peeled || object,
      })
    }
    const rank: Record<RefKind, number> = { branch: 0, remote: 1, tag: 2 }
    refs.sort((a, b) => {
      if (a.head !== b.head) return a.head ? -1 : 1
      if (a.kind !== b.kind) return rank[a.kind] - rank[b.kind]
      return a.short.localeCompare(b.short)
    })
    return refs
  }

  /**
   * Read the current branch and HEAD commit, tolerating unborn and detached HEADs.
   * @param root - repository root.
   * @returns current branch, HEAD hash, and whether HEAD is detached.
   */
  async head(root: string): Promise<HeadInfo> {
    let branch = ''
    try {
      branch = (await this.runner.run(root, ['symbolic-ref', '--short', '-q', 'HEAD'])).trim()
    } catch {
      branch = ''
    }
    let hash = ''
    try {
      hash = (await this.runner.run(root, ['rev-parse', 'HEAD'])).trim()
    } catch {
      hash = ''
    }
    return { branch, hash, detached: !branch && Boolean(hash) }
  }

  /**
   * List the immediate children of one directory at a ref.
   * @param root - repository root.
   * @param ref - full ref to read, or an empty string for HEAD.
   * @param path - repository-relative directory path ('' for the root).
   * @returns the directory entries, directories first.
   */
  async tree(root: string, ref: string, path: string): Promise<TreeEntry[]> {
    let target = 'HEAD'
    if (ref) {
      const refs = await this.refs(root)
      if (!refs.some((entry) => entry.ref === ref)) throw new GitError('unknown ref', 400)
      target = ref
    }
    const spec = path ? `${target}:${path}` : target
    let out: string
    try {
      out = await this.runner.run(root, ['ls-tree', '-z', spec])
    } catch (error) {
      // An unborn HEAD has no tree yet; that is an empty directory, not an error.
      if (error instanceof GitError && /Not a valid object name|unknown revision|bad revision|does not exist/i.test(error.message)) {
        return []
      }
      throw error
    }
    const entries: TreeEntry[] = []
    for (const record of out.split('\0')) {
      if (!record) continue
      const tab = record.indexOf('\t')
      if (tab < 0) continue
      const meta = record.slice(0, tab).split(' ')
      const name = record.slice(tab + 1)
      if (!name) continue
      const type: TreeEntry['type'] = meta[1] === 'tree' ? 'tree' : meta[1] === 'commit' ? 'submodule' : 'blob'
      entries.push({
        name,
        path: path ? `${path}/${name}` : name,
        type,
      })
    }
    entries.sort((a, b) => {
      const aDir = a.type === 'tree' ? 0 : 1
      const bDir = b.type === 'tree' ? 0 : 1
      if (aDir !== bDir) return aDir - bDir
      return a.name.localeCompare(b.name)
    })
    return entries
  }

  /**
   * List the immediate children of one directory in the working tree.
   *
   * Unlike {@link tree} this reads the working tree, not one commit's tree, so
   * untracked files and directories that are not committed yet are visible.
   * Paths match the `.gitignore` rules Git itself applies, and every entry
   * carries the status letter the changes list would show for it.
   *
   * @param root - repository root.
   * @param path - repository-relative directory path ('' for the root).
   * @returns the directory entries with their status letters.
   */
  async worktreeTree(root: string, path = ''): Promise<TreeEntry[]> {
    const scope = String(path || '').replace(/^\/+|\/+$/g, '')
    const prefix = scope ? `${scope}/` : ''
    const [listed, status] = await Promise.all([
      this.runner.run(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
        maxBuffer: 32 * 1024 * 1024,
      }),
      this.status(root),
    ])

    const byPath = new Map(status.map((entry) => [entry.path, entry]))
    const dirs = new Map<string, true>()
    const files: TreeEntry[] = []
    const dirtyDirs = new Set<string>()

    for (const changed of byPath.keys()) {
      if (!changed.startsWith(prefix)) continue
      const rest = changed.slice(prefix.length)
      const slash = rest.indexOf('/')
      if (slash > 0) dirtyDirs.add(rest.slice(0, slash))
    }

    for (const record of listed.split('\0')) {
      if (!record || !record.startsWith(prefix)) continue
      const rest = record.slice(prefix.length)
      if (!rest) continue
      const slash = rest.indexOf('/')
      if (slash >= 0) {
        dirs.set(rest.slice(0, slash), true)
        continue
      }
      if (files.length >= 2000) break
      const entry = byPath.get(record)
      const untracked = Boolean(entry && entry.untracked)
      const conflict = Boolean(entry && entry.conflict)
      const letter = conflict ? 'U' : untracked ? '?' : entry ? entry.status : ''
      files.push({
        name: rest,
        path: record,
        type: 'blob',
        status: letter || '',
        untracked,
        conflict,
      })
    }

    const entries: TreeEntry[] = []
    for (const name of [...dirs.keys()].sort((a, b) => a.localeCompare(b))) {
      entries.push({
        name,
        path: prefix ? `${prefix}${name}` : name,
        type: 'tree',
        status: '',
        untracked: false,
        conflict: false,
        dirty: dirtyDirs.has(name),
      })
    }
    files.sort((a, b) => a.name.localeCompare(b.name))
    for (const file of files) entries.push({ ...file, dirty: false })
    return entries
  }

  /**
   * List the repository's remote names.
   * @param root - repository root.
   * @returns remote names.
   */
  async remotes(root: string): Promise<string[]> {
    const out = await this.runner.run(root, ['remote'])
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  }

  /**
   * Build a commit list plus the ref catalogue a branch selector needs.
   * @param root - repository root.
   * @param ref - full ref to walk, or an empty string for every ref.
   * @param limit - maximum commits.
   * @param path - repository-relative path filter (a folder or a file).
   * @returns log payload.
   */
  async log(root: string, ref: string, limit: number, path = ''): Promise<LogData> {
    const refs = await this.refs(root)
    const head = await this.head(root)

    let target: RefRecord | null = null
    if (ref) {
      target = refs.find((entry) => entry.ref === ref) || null
      if (!target) throw new GitError('unknown branch or tag', 400)
    }

    const format = ['%H', '%P', '%an', '%ae', '%aI', '%cn', '%ce', '%cI', '%s'].join('%x1f')
    const sources = target
      ? [target.ref]
      : [...(head.hash ? ['HEAD'] : []), '--branches', '--remotes', '--tags']
    if (!target && refs.length === 0 && !head.hash) {
      return { head, refs: [], commits: [] }
    }
    let out: string
    try {
      out = await this.runner.run(root, [
        'log',
        ...sources,
        '--topo-order',
        '--date-order',
        `--max-count=${limit}`,
        `--pretty=format:${format}`,
        ...(path ? ['--', path] : []),
      ])
    } catch (error) {
      // A freshly initialized repository has no commits yet; that is an empty
      // history, not a failure the panel should surface as an error.
      if (error instanceof GitError && /does not have any commits yet|bad default revision|unknown revision/i.test(error.message)) {
        return { head, refs: [], commits: [] }
      }
      throw error
    }

    const byHash = new Map<string, CommitRef[]>()
    for (const entry of refs) {
      const list = byHash.get(entry.target) || []
      list.push({ name: entry.short, kind: entry.kind, head: entry.head })
      byHash.set(entry.target, list)
    }

    const commits: CommitRow[] = []
    for (const line of out.split('\n')) {
      if (!line) continue
      const [hash, parents, author, email, date, committer, committerEmail, commitDate, ...rest] = line.split('\x1f')
      if (!hash) continue
      const commitRefs = (byHash.get(hash) || []).slice()
      if (head.detached && head.hash === hash) {
        commitRefs.unshift({ name: 'HEAD', kind: 'head', head: true })
      }
      commitRefs.sort((a, b) => (a.head === b.head ? 0 : a.head ? -1 : 1))
      commits.push({
        hash,
        parents: parents ? parents.split(' ').filter(Boolean) : [],
        author,
        email,
        date,
        committer,
        committerEmail,
        commitDate,
        subject: rest.join('\x1f'),
        refs: commitRefs,
      })
    }

    return {
      head,
      refs: refs.map(({ ref: fullRef, short, kind, head: isHead }): RefEntry => ({
        ref: fullRef,
        name: short,
        kind,
        head: isHead,
      })),
      commits,
    }
  }

  /**
   * Read one commit's metadata and changed files.
   * @param root - repository root.
   * @param hash - full or abbreviated commit hash.
   * @param path - repository-relative scope; only changes under it are listed.
   * @returns commit payload.
   */
  async commit(root: string, hash: string, path = ''): Promise<CommitDetails> {
    const format = ['%H', '%P', '%an', '%ae', '%aI', '%cn', '%ce', '%cI', '%B'].join('%x1f')
    const out = await this.runner.run(root, ['show', '-s', `--format=${format}`, hash, '--'])
    const fields = out.split('\x1f')
    if (fields.length < 9) throw new GitError('cannot read commit', 404)
    const [full, parents, author, email, date, committer, committerEmail, commitDate, ...bodyParts] = fields
    const message = bodyParts.join('\x1f').replace(/\s+$/, '').slice(0, LIMITS.message)
    const subject = message.split(/\r?\n/, 1)[0] || ''

    const [statusOut, numstatOut] = await Promise.all([
      this.runner.run(root, [
        'show',
        '--format=',
        '--name-status',
        '--diff-merges=first-parent',
        '--no-renames',
        hash,
        '--',
        ...(path ? [path] : []),
      ]),
      this.runner.run(root, [
        'show',
        '--format=',
        '--numstat',
        '--diff-merges=first-parent',
        '--no-renames',
        hash,
        '--',
        ...(path ? [path] : []),
      ]),
    ])

    const stats = new Map<string, { additions: number | null; deletions: number | null; binary: boolean }>()
    for (const line of numstatOut.split('\n')) {
      if (!line) continue
      const [adds, dels, ...pathParts] = line.split('\t')
      const filePath = pathParts.join('\t')
      if (!filePath) continue
      stats.set(filePath, {
        additions: adds === '-' ? null : Number(adds) || 0,
        deletions: dels === '-' ? null : Number(dels) || 0,
        binary: adds === '-' || dels === '-',
      })
    }

    let files: CommitFile[] = []
    for (const line of statusOut.split('\n')) {
      if (!line) continue
      const tab = line.indexOf('\t')
      if (tab < 0) continue
      const status = line.slice(0, tab)
      const filePath = line.slice(tab + 1)
      if (!filePath) continue
      const stat = stats.get(filePath) || { additions: 0, deletions: 0, binary: false }
      files.push({ status: status.charAt(0), path: filePath, ...stat })
      if (files.length >= LIMITS.files) break
    }
    files.sort((a, b) => a.path.localeCompare(b.path))

    return {
      hash: full,
      shortHash: full.slice(0, 7),
      parents: parents ? parents.split(' ').filter(Boolean) : [],
      author: { name: author, email },
      date,
      committer: { name: committer, email: committerEmail },
      commitDate,
      subject,
      message,
      files,
      scope: path,
    }
  }

  /**
   * Read one file's diff within a commit.
   * @param root - repository root.
   * @param hash - commit hash.
   * @param path - repository-relative path.
   * @returns the diff text, clipped to the diff limit.
   */
  async diff(root: string, hash: string, path: string): Promise<DiffData> {
    const out = await this.runner.run(
      root,
      ['show', '--format=', '--no-ext-diff', '--unified=3', '--diff-merges=first-parent', hash, '--', path],
      { maxBuffer: 32 * 1024 * 1024 },
    )
    const truncated = out.length > LIMITS.diff
    return {
      path,
      text: truncated ? `${out.slice(0, LIMITS.diff)}\n… diff truncated …\n` : out,
      truncated,
    }
  }

  /**
   * Read the working-tree status without touching the index.
   * @param root - repository root.
   * @returns changed entries.
   */
  async status(root: string): Promise<StatusEntry[]> {
    const out = await this.runner.run(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'])
    const entries: StatusEntry[] = []
    for (const record of out.split('\0')) {
      if (!record) continue
      const x = record.charAt(0)
      const y = record.charAt(1)
      const path = record.slice(3)
      if (!path) continue
      if (x === '!' && y === '!') continue
      const untracked = x === '?' && y === '?'
      const conflict = x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')
      const staged = !untracked && x !== ' '
      const unstaged = untracked || y !== ' '
      const status = untracked ? 'A' : conflict ? 'U' : x !== ' ' ? x : y
      entries.push({
        path,
        status,
        x,
        y,
        untracked,
        staged,
        unstaged,
        conflict,
      })
      if (entries.length >= 2000) break
    }
    entries.sort((a, b) => a.path.localeCompare(b.path))
    return entries
  }

  /**
   * Collect a bounded diff of the working tree for an AI commit message.
   * @param root - repository root.
   * @param paths - partial paths, or [] for every change.
   * @param all - include every change.
   * @returns diff text.
   */
  async workingSummary(root: string, paths: string[], all: boolean): Promise<string> {
    const targets = all ? [] : (paths || []).filter((value) => typeof value === 'string' && value !== '')
    const suffix = targets.length > 0 ? ['--', ...targets] : []
    const [staged, unstaged] = await Promise.all([
      this.runner.run(root, ['diff', '--cached', '--no-ext-diff', '--unified=2', ...suffix], { maxBuffer: 16 * 1024 * 1024 }),
      this.runner.run(root, ['diff', '--no-ext-diff', '--unified=2', ...suffix], { maxBuffer: 16 * 1024 * 1024 }),
    ])
    const parts: string[] = []
    if (staged.trim()) parts.push(`--- staged ---\n${staged.trim()}`)
    if (unstaged.trim()) parts.push(`--- unstaged ---\n${unstaged.trim()}`)
    return parts.join('\n\n').slice(0, 24_000)
  }

  /**
   * Stage and commit either every working-tree change or only the given paths.
   *
   * Partial commits use a pathspec-limited commit so unrelated staged work stays
   * staged and is not recorded.
   *
   * @param root - repository root.
   * @param message - commit message.
   * @param paths - repository-relative paths for a partial commit.
   * @param all - commit every change instead.
   * @returns committed revision.
   */
  async commitChanges(root: string, message: string, paths: string[], all: boolean): Promise<CommitResult> {
    const text = String(message || '').trim()
    if (!text) throw new GitError('commit message is required', 400)
    if (text.includes('\0')) throw new GitError('commit message contains an invalid character', 400)
    if (text.length > 5000) throw new GitError('commit message is too long', 400)

    if (!all) {
      const targets = [...new Set((paths || []).filter((value): value is string => typeof value === 'string' && value !== ''))]
      if (targets.length === 0) throw new GitError('select at least one changed file', 400)
      if (targets.length > 200) throw new GitError('too many files in one commit', 400)
      for (const target of targets) {
        // Validate only; a path with leading/trailing spaces is a real file.
        repoPath(target)
      }
      // A path that is already deleted from both the index and the worktree (a
      // staged deletion) no longer matches `git add -A -- <path>`; git answers
      // "pathspec ... did not match any files". Such a path still commits fine
      // through `git commit -- <path>`, so only stage the paths git can see.
      const indexed = new Set(
        (await this.runner.run(root, ['ls-files', '-z', '--']))
          .split('\0')
          .filter(Boolean),
      )
      const addable = targets.filter((target) => indexed.has(target) || existsSync(join(root, target)))
      if (addable.length > 0) {
        await this.runner.run(root, ['add', '-A', '--', ...addable])
      }
      await this.runner.run(root, ['commit', '-m', text, '--', ...targets])
    } else {
      await this.runner.run(root, ['add', '-A'])
      await this.runner.run(root, ['commit', '-m', text])
    }

    const hash = (await this.runner.run(root, ['rev-parse', 'HEAD'])).trim()
    return { hash, message: text, output: '' }
  }
}
