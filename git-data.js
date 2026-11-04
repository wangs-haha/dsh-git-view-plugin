/**
 * Read-only Git plumbing used by the Git Graph plugin.
 *
 * Every function here spawns `git` with an argument array — never a shell
 * string — inside the repository root it is given. Callers resolve the root
 * from a registered DSH workspace, so no user-supplied path ever reaches these
 * functions.
 */

import { execFile } from 'node:child_process'

/** Largest stdout a single git invocation may produce (bytes). */
const MAX_BUFFER = 24 * 1024 * 1024
/** Hard deadline for one git invocation. */
const TIMEOUT_MS = 20_000
/** Root commits, files, messages, and diffs are clipped so one response stays renderable. */
export const LIMITS = Object.freeze({
  commits: 400,
  files: 400,
  message: 60_000,
  diff: 400_000,
})

/** A user-correctable Git failure carrying the HTTP status the route answers with. */
export class GitError extends Error {
  /**
   * @param {string} message - text shown to the caller.
   * @param {number} [status] - HTTP status to answer with.
   */
  constructor(message, status = 422) {
    super(message)
    this.name = 'GitError'
    this.status = status
  }
}

/**
 * Build the user-facing error for one failed git invocation.
 * @param {{ code: number, stdout: string, stderr: string, spawnError?: NodeJS.ErrnoException }} result - captured run.
 * @returns {GitError} the error.
 */
export function gitFailure(result) {
  if (result.spawnError && result.spawnError.code === 'ENOENT') {
    return new GitError('git executable not found on PATH', 503)
  }
  const detail = String(result.stderr || '').trim() || String(result.stdout || '').trim()
  const lines = detail.split(/\r?\n/).filter(Boolean).slice(-6).join('\n')
  const fallback = result.spawnError ? result.spawnError.message : 'git command failed'
  return new GitError(lines || fallback)
}

/**
 * Run git without a shell in `cwd`, returning the exit status instead of throwing.
 * Write operations use this so a conflict can be reported together with the
 * repository state it leaves behind.
 * @param {string} cwd - repository root.
 * @param {string[]} args - git arguments (the executable is prepended).
 * @param {{ maxBuffer?: number, timeout?: number }} [options] - per-call overrides.
 * @returns {Promise<{ code: number, stdout: string, stderr: string, spawnError?: NodeJS.ErrnoException }>} captured run.
 */
export function runGitResult(cwd, args, options = {}) {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['-c', 'core.quotepath=false', '-c', 'color.ui=false', '-c', 'core.pager=cat', ...args],
      {
        cwd,
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: '0',
          GIT_TERMINAL_PROMPT: '0',
          GIT_LITERAL_PATHSPECS: '1',
        },
        windowsHide: true,
        timeout: options.timeout ?? TIMEOUT_MS,
        maxBuffer: options.maxBuffer ?? MAX_BUFFER,
        encoding: 'utf8',
      },
      (error, stdout, stderr) => {
        const out = String(stdout || '')
        const err = String(stderr || '')
        if (!error) {
          resolve({ code: 0, stdout: out, stderr: err })
          return
        }
        const code = typeof error.code === 'number' ? error.code : 1
        resolve({ code, stdout: out, stderr: err, spawnError: error })
      },
    )
  })
}

/**
 * Run git without a shell in `cwd`.
 * @param {string} cwd - repository root.
 * @param {string[]} args - git arguments (the executable is prepended).
 * @param {{ maxBuffer?: number, timeout?: number }} [options] - per-call overrides.
 * @returns {Promise<string>} stdout.
 */
export async function runGit(cwd, args, options = {}) {
  const result = await runGitResult(cwd, args, options)
  if (result.code !== 0) throw gitFailure(result)
  return result.stdout
}

/**
 * Resolve the working-tree root that contains `directory`.
 * @param {string} directory - absolute directory.
 * @returns {Promise<string>} absolute repository root.
 */
export async function gitToplevel(directory) {
  const out = await runGit(directory, ['rev-parse', '--show-toplevel'], { timeout: 10_000 })
  const root = out.trim()
  if (!root) throw new GitError('not a Git repository')
  return root
}

/**
 * List local branches, remote-tracking branches, and tags.
 * @param {string} root - repository root.
 * @returns {Promise<Array<{ ref: string, short: string, kind: 'branch'|'remote'|'tag', head: boolean, target: string }>>}
 */
export async function readRefs(root) {
  const format = ['%(refname)', '%(refname:short)', '%(objectname)', '%(*objectname)', '%(HEAD)', '%(symref)'].join('%00')
  const out = await runGit(root, ['for-each-ref', `--format=${format}`, 'refs/heads', 'refs/remotes', 'refs/tags'])
  const refs = []
  for (const line of out.split('\n')) {
    if (!line) continue
    const [ref, short, object, peeled, head, symref] = line.split('\0')
    if (!ref || !short || symref) continue
    const kind = ref.startsWith('refs/heads/') ? 'branch' : ref.startsWith('refs/remotes/') ? 'remote' : 'tag'
    refs.push({
      ref,
      short,
      kind,
      head: head === '*',
      target: peeled || object,
    })
  }
  const rank = { branch: 0, remote: 1, tag: 2 }
  refs.sort((a, b) => {
    if (a.head !== b.head) return a.head ? -1 : 1
    if (a.kind !== b.kind) return rank[a.kind] - rank[b.kind]
    return a.short.localeCompare(b.short)
  })
  return refs
}

/**
 * Read the current branch and HEAD commit, tolerating unborn and detached HEADs.
 * @param {string} root - repository root.
 * @returns {Promise<{ branch: string, hash: string, detached: boolean }>}
 */
export async function readHead(root) {
  let branch = ''
  try {
    branch = (await runGit(root, ['symbolic-ref', '--short', '-q', 'HEAD'])).trim()
  } catch {
    branch = ''
  }
  let hash = ''
  try {
    hash = (await runGit(root, ['rev-parse', 'HEAD'])).trim()
  } catch {
    hash = ''
  }
  return { branch, hash, detached: !branch && Boolean(hash) }
}

/**
 * List the immediate children of one directory at a ref.
 * @param {string} root - repository root.
 * @param {string} ref - full ref to read, or an empty string for HEAD.
 * @param {string} path - repository-relative directory path ('' for the root).
 * @returns {Promise<Array<{ name: string, path: string, type: 'tree'|'blob'|'submodule' }>>}
 */
export async function readTree(root, ref, path) {
  let target = 'HEAD'
  if (ref) {
    const refs = await readRefs(root)
    if (!refs.some((entry) => entry.ref === ref)) throw new GitError('unknown ref', 400)
    target = ref
  }
  const spec = path ? `${target}:${path}` : target
  let out
  try {
    out = await runGit(root, ['ls-tree', '-z', spec])
  } catch (error) {
    // An unborn HEAD has no tree yet; that is an empty directory, not an error.
    if (error instanceof GitError && /Not a valid object name|unknown revision|bad revision|does not exist/i.test(error.message)) {
      return []
    }
    throw error
  }
  const entries = []
  for (const record of out.split('\0')) {
    if (!record) continue
    const tab = record.indexOf('\t')
    if (tab < 0) continue
    const meta = record.slice(0, tab).split(' ')
    const name = record.slice(tab + 1)
    if (!name) continue
    const type = meta[1] === 'tree' ? 'tree' : meta[1] === 'commit' ? 'submodule' : 'blob'
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
 * Unlike {@link readTree} this reads the working tree, not one commit's tree, so
 * untracked files and directories that are not committed yet are visible. Paths
 * match the `.gitignore` rules Git itself applies, and every entry carries the
 * status letter the changes list would show for it.
 *
 * @param {string} root - repository root.
 * @param {string} path - repository-relative directory path ('' for the root).
 * @returns {Promise<Array<{ name: string, path: string, type: 'tree'|'blob', status: string, untracked: boolean, conflict: boolean, dirty: boolean }>>}
 */
export async function readWorktreeTree(root, path = '') {
  const scope = String(path || '').replace(/^\/+|\/+$/g, '')
  const prefix = scope ? `${scope}/` : ''
  const [listed, status] = await Promise.all([
    runGit(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      maxBuffer: 32 * 1024 * 1024,
    }),
    readStatus(root),
  ])

  const byPath = new Map(status.map((entry) => [entry.path, entry]))
  /** @type {Map<string, true>} */
  const dirs = new Map()
  /** @type {Array<{ name: string, path: string, type: 'blob', status: string, untracked: boolean, conflict: boolean }>} */
  const files = []
  const dirtyDirs = new Set()

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

  const entries = []
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
 * @param {string} root - repository root.
 * @returns {Promise<string[]>} remote names.
 */
export async function readRemotes(root) {
  const out = await runGit(root, ['remote'])
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Build a commit list plus the ref catalogue a branch selector needs.
 * @param {string} root - repository root.
 * @param {string} ref - full ref to walk, or an empty string for every ref.
 * @param {number} limit - maximum commits.
 * @param {string} [path] - repository-relative path filter (a folder or a file).
 * @returns {Promise<object>} log payload.
 */
export async function readLog(root, ref, limit, path = '') {
  const refs = await readRefs(root)
  const head = await readHead(root)

  let target = null
  if (ref) {
    target = refs.find((entry) => entry.ref === ref)
    if (!target) throw new GitError('unknown branch or tag', 400)
  }

  const format = ['%H', '%P', '%an', '%ae', '%aI', '%cn', '%ce', '%cI', '%s'].join('%x1f')
  const sources = target
    ? [target.ref]
    : [...(head.hash ? ['HEAD'] : []), '--branches', '--remotes', '--tags']
  if (!target && refs.length === 0 && !head.hash) {
    return { head, refs: [], commits: [] }
  }
  let out
  try {
    out = await runGit(root, [
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

  const byHash = new Map()
  for (const entry of refs) {
    const list = byHash.get(entry.target) || []
    list.push({ name: entry.short, kind: entry.kind, head: entry.head })
    byHash.set(entry.target, list)
  }

  const commits = []
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
    refs: refs.map(({ ref: fullRef, short, kind, head: isHead }) => ({
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
 * @param {string} root - repository root.
 * @param {string} hash - full or abbreviated commit hash.
 * @param {string} hash - full or abbreviated commit hash.
 * @param {string} [path] - repository-relative scope; only changes under it are listed.
 * @returns {Promise<object>} commit payload.
 */
export async function readCommit(root, hash, path = '') {
  const format = ['%H', '%P', '%an', '%ae', '%aI', '%cn', '%ce', '%cI', '%B'].join('%x1f')
  const out = await runGit(root, ['show', '-s', `--format=${format}`, hash, '--'])
  const fields = out.split('\x1f')
  if (fields.length < 9) throw new GitError('cannot read commit', 404)
  const [full, parents, author, email, date, committer, committerEmail, commitDate, ...bodyParts] = fields
  const message = bodyParts.join('\x1f').replace(/\s+$/, '').slice(0, LIMITS.message)
  const subject = message.split(/\r?\n/, 1)[0] || ''

  const [statusOut, numstatOut] = await Promise.all([
    runGit(root, ['show', '--format=', '--name-status', '--diff-merges=first-parent', '--no-renames', hash, '--']),
    runGit(root, ['show', '--format=', '--numstat', '--diff-merges=first-parent', '--no-renames', hash, '--']),
  ])

  const stats = new Map()
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

  let files = []
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
  if (path) {
    const prefix = `${path}/`
    files = files.filter((entry) => entry.path === path || entry.path.startsWith(prefix))
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
 * @param {string} root - repository root.
 * @param {string} hash - commit hash.
 * @param {string} path - repository-relative path.
 * @returns {Promise<{ path: string, text: string, truncated: boolean }>}
 */
export async function readDiff(root, hash, path) {
  const out = await runGit(
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
 * @param {string} root - repository root.
 * @returns {Promise<Array<object>>} changed entries.
 */
export async function readStatus(root) {
  const out = await runGit(root, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--no-renames',
  ])
  const entries = []
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
 * Stage and commit either every working-tree change or only the given paths.
 * Partial commits use a pathspec-limited commit so unrelated staged work stays
 * staged and is not recorded.
 * @param {string} root - repository root.
 * @param {string} message - commit message.
 * @param {string[]} paths - repository-relative paths for a partial commit.
 * @param {boolean} all - commit every change instead.
 * @returns {Promise<{ hash: string, message: string, output: string }>} committed revision.
 */
export async function commitChanges(root, message, paths, all) {
  const text = String(message || '').trim()
  if (!text) throw new GitError('commit message is required', 400)
  if (text.includes('\0')) throw new GitError('commit message contains an invalid character', 400)
  if (text.length > 5000) throw new GitError('commit message is too long', 400)

  let targets = []
  if (!all) {
    targets = [...new Set((paths || []).map((value) => String(value || '').trim()).filter(Boolean))]
    if (targets.length === 0) throw new GitError('select at least one changed file', 400)
    if (targets.length > 200) throw new GitError('too many files in one commit', 400)
    for (const target of targets) {
      if (target.startsWith('/') || target.includes('\0') || target.split('/').some((part) => part === '..')) {
        throw new GitError('invalid file path', 400)
      }
    }
    await runGit(root, ['add', '-A', '--', ...targets])
    await runGit(root, ['commit', '-m', text, '--', ...targets])
  } else {
    await runGit(root, ['add', '-A'])
    await runGit(root, ['commit', '-m', text])
  }

  const hash = (await runGit(root, ['rev-parse', 'HEAD'])).trim()
  return { hash, message: text, output: '' }
}

/**
 * Collect a bounded diff of the working tree for an AI commit message.
 * @param {string} root - repository root.
 * @param {string[]} paths - partial paths, or [] for every change.
 * @param {boolean} all - include every change.
 * @returns {Promise<string>} diff text.
 */
export async function readWorkingSummary(root, paths, all) {
  const targets = all ? [] : (paths || []).filter(Boolean)
  const suffix = targets.length > 0 ? ['--', ...targets] : []
  const [staged, unstaged] = await Promise.all([
    runGit(root, ['diff', '--cached', '--no-ext-diff', '--unified=2', ...suffix], { maxBuffer: 16 * 1024 * 1024 }),
    runGit(root, ['diff', '--no-ext-diff', '--unified=2', ...suffix], { maxBuffer: 16 * 1024 * 1024 }),
  ])
  const parts = []
  if (staged.trim()) parts.push(`--- staged ---\n${staged.trim()}`)
  if (unstaged.trim()) parts.push(`--- unstaged ---\n${unstaged.trim()}`)
  return parts.join('\n\n').slice(0, 24_000)
}

