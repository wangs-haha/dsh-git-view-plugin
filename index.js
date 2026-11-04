/**
 * Host half of the Git Graph plugin.
 *
 * Serves the read-only Git data the browser panel renders. Repositories are
 * resolved from registered DSH workspaces only — the browser names a workspace
 * id, never a filesystem path — so this route cannot be used to read arbitrary
 * directories.
 */

import { spawn } from 'node:child_process'
import {
  GitError,
  LIMITS,
  commitChanges,
  gitToplevel,
  readCommit,
  readDiff,
  readLog,
  readRemotes,
  readStatus,
  readTree,
  readWorktreeTree,
  readWorkingSummary,
} from './git-data.js'
import {
  commitHistoryOperation,
  discardChanges,
  readRepoState,
  rollbackChanges,
  runBranchOperation,
  stageResolvedPaths,
} from './git-ops.js'
import { assertRemoteOp, buildRemoteCommand, remoteErrorText } from './git-remote.js'

/** The authenticated route the Client half reads Git data from. */
export const ROUTE_PATH = '/api/git-view'

/** The authenticated route the Client half sends commits to. */
export const WRITE_ROUTE_PATH = '/api/git-view/write'

/** Bundle row dependencies: the Web connection carrier and the workspace registry. */
export const inject = ['connection', 'workspaceRegistry']

/** How long a workspace → Git-root resolution is reused. */
const REPO_CACHE_TTL = 15_000

/**
 * Build one JSON response.
 * @param {unknown} body - JSON-serialisable payload.
 * @param {number} [status] - HTTP status.
 * @returns {Response} the response.
 */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/**
 * Parse a positive integer query parameter with a fallback and a cap.
 * @param {string | null} raw - query value.
 * @param {number} fallback - value used when absent or invalid.
 * @param {number} max - upper bound.
 * @returns {number} the bounded integer.
 */
function boundedInt(raw, fallback, max) {
  if (raw === null) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(value, max)
}

/**
 * Normalize and validate a repository-relative scope path.
 * @param {string | null} raw - query value, '' for the repository root.
 * @returns {string} the clean path.
 */
function cleanScope(raw) {
  const original = String(raw || '').trim()
  if (original.startsWith('/') || original.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(original)) {
    throw new GitError('invalid path', 400)
  }
  let value = original.replace(/\\/g, '/')
  value = value.replace(/^\/+/, '').replace(/\/+$/, '')
  if (!value) return ''
  if (value.length > 4096 || /[\0-\x1f]/.test(value) || value.includes(':')) {
    throw new GitError('invalid path', 400)
  }
  if (value.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new GitError('invalid path', 400)
  }
  return value
}

/**
 * Install the authenticated route that carries Git data to the browser panel.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 */
export function apply(ctx) {
  /** @type {Map<string, { id: string, title: string, path: string, root: string, expires: number }>} */
  const repoCache = new Map()
  /** Repository roots with a write (commit or branch operation) currently running. */
  const writesInFlight = new Set()

  /**
   * Claim the single write slot of one repository.
   * @param {string} root - repository root.
   * @returns {() => void} release callback.
   */
  function beginWrite(root) {
    if (writesInFlight.has(root)) {
      throw new GitError('another Git operation is already running for this repository', 409)
    }
    writesInFlight.add(root)
    return () => writesInFlight.delete(root)
  }

  /** Remote jobs (fetch/pull/push), kept for polling after they finish. */
  const remoteJobs = new Map()
  let remoteJobSeq = 0
  /** Hard cap so a stuck credential helper cannot hold the write lock forever. */
  const REMOTE_TIMEOUT_MS = 10 * 60 * 1000
  /** Finished jobs are dropped after this long. */
  const REMOTE_KEEP_MS = 10 * 60 * 1000

  /**
   * Detached view of one remote job (never exposes the child process).
   * @param {object} job - internal job record.
   * @returns {object} pollable snapshot.
   */
  function remoteSnapshot(job) {
    return {
      id: job.id,
      op: job.op,
      label: job.label,
      state: job.state,
      startedAt: job.startedAt,
      endedAt: job.endedAt || null,
      percent: job.percent,
      exitCode: job.exitCode,
      error: job.error || '',
      lines: job.lines.slice(-40),
    }
  }

  /**
   * Drop finished jobs that nobody will poll anymore.
   * @returns {void}
   */
  function pruneRemoteJobs() {
    const now = Date.now()
    for (const [id, job] of remoteJobs) {
      if (job.endedAt && now - job.endedAt > REMOTE_KEEP_MS) remoteJobs.delete(id)
    }
  }

  /**
   * Start `git fetch|pull|push` as a job and stream its output into the job
   * record. The per-repository write lock is held until the job settles.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body (`op`, `rebase`, `forceWithLease`, `tags`).
   * @returns {Promise<object>} `{ ok, id, op, label }`.
   */
  async function startRemote(repo, body) {
    const op = assertRemoteOp(body.op)
    const [state, remotes] = await Promise.all([readRepoState(repo.root), readRemotes(repo.root)])
    const { args, label } = buildRemoteCommand(
      op,
      {
        branch: state.branch,
        upstream: state.upstream,
        detached: state.detached,
        remotes,
      },
      {
        rebase: body.rebase === true,
        forceWithLease: body.forceWithLease === true,
        tags: body.tags === true,
      },
    )

    const release = beginWrite(repo.root)
    pruneRemoteJobs()
    const id = `remote-${++remoteJobSeq}-${Date.now().toString(36)}`
    /** @type {object} */
    const job = {
      id,
      op,
      label,
      repo: repo.root,
      state: 'running',
      startedAt: Date.now(),
      endedAt: null,
      percent: null,
      exitCode: null,
      error: '',
      lines: [],
      child: null,
      release,
      timer: null,
    }
    remoteJobs.set(id, job)

    let child
    try {
      child = spawn('git', args, {
        cwd: repo.root,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
          GIT_OPTIONAL_LOCKS: '0',
          GIT_PAGER: 'cat',
          LC_ALL: 'C',
          LANG: 'C',
        },
        windowsHide: true,
      })
    } catch (error) {
      release()
      remoteJobs.delete(id)
      throw new GitError(error instanceof Error ? error.message : String(error), 502)
    }
    job.child = child

    const absorb = (chunk) => {
      for (const raw of String(chunk).split(/[\r\n]+/)) {
        const line = raw.trim()
        if (!line) continue
        job.lines.push(line)
        if (job.lines.length > 200) job.lines.shift()
        const match = /(\d{1,3})%/.exec(line)
        if (match) job.percent = Math.max(job.percent || 0, Number(match[1]))
      }
    }
    child.stdout?.on('data', absorb)
    child.stderr?.on('data', absorb)

    let settled = false
    const settle = (spawnError) => {
      if (settled) return
      settled = true
      if (job.timer) clearTimeout(job.timer)
      job.endedAt = Date.now()
      job.exitCode = typeof child.exitCode === 'number' ? child.exitCode : null
      if (spawnError) {
        job.state = 'error'
        job.error = `无法启动 git：${spawnError.message}`
      } else if (job.state === 'cancelling') {
        job.state = 'cancelled'
      } else if (job.exitCode === 0) {
        job.state = 'done'
        job.percent = 100
      } else {
        job.state = 'error'
        job.error = remoteErrorText(job.lines.join('\n'))
      }
      job.child = null
      release()
    }
    child.on('error', (error) => settle(error))
    child.on('close', () => settle(null))
    job.timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* already gone */
      }
      job.error = '网络操作超时（10 分钟）'
      job.state = 'error'
    }, REMOTE_TIMEOUT_MS)

    return { ok: true, id, op, label }
  }

  /**
   * Ask a running remote job to stop.
   * @param {string} id - job id.
   * @returns {{ ok: boolean, id: string, state: string }} acknowledgement.
   */
  function cancelRemote(id) {
    const job = remoteJobs.get(String(id || ''))
    if (!job) throw new GitError('unknown remote job', 404)
    if (job.state !== 'running') return { ok: true, id: job.id, state: job.state }
    job.state = 'cancelling'
    try {
      job.child?.kill()
    } catch {
      /* already gone */
    }
    return { ok: true, id: job.id, state: job.state }
  }

  /**
   * Derive a Conventional Commit `scope` from the selected paths: the deepest
   * directory every path shares, reduced to its last segment.
   * @param {string[]} paths - repository-relative paths.
   * @param {boolean} all - whether the whole working tree is included.
   * @returns {string} scope, or an empty string when the selection has none.
   */
  function deriveScope(paths, all) {
    if (all || paths.length === 0) return ''
    const dirs = paths.map((path) => {
      const segments = String(path).split('/').filter(Boolean)
      return segments.slice(0, -1)
    })
    if (dirs.some((segments) => segments.length === 0)) return ''
    let common = dirs[0].slice()
    for (const segments of dirs.slice(1)) {
      let index = 0
      while (index < common.length && index < segments.length && common[index] === segments[index]) index += 1
      common = common.slice(0, index)
    }
    if (common.length === 0) return ''
    return common[common.length - 1].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 32)
  }

  /**
   * Ask the composed default model for one `type(scope): subject` line the user
   * can edit before committing. The model never commits anything.
   * @param {object} repo - resolved repository.
   * @param {string[]} paths - selected paths, or [] for every change.
   * @param {boolean} all - whether every change is included.
   * @param {string} locale - UI locale hint.
   * @param {AbortSignal} signal - request cancellation.
   * @returns {Promise<string>} the generated subject line.
   */
  async function suggestCommitMessage(repo, paths, all, locale, signal) {
    const llm = ctx.get('llm')
    const defaultModel = ctx.get('agentDefaultModel')
    if (!llm || !defaultModel) {
      throw new GitError('the LLM service is not mounted', 503)
    }
    let selection
    try {
      selection = defaultModel.currentSelection()
    } catch (error) {
      throw new GitError(error instanceof Error ? error.message : String(error), 503)
    }
    if (!selection || !selection.provider || !selection.model) {
      throw new GitError('no default model is configured', 503)
    }

    const entries = await readStatus(repo.root)
    const scopeMatches = (entry) =>
      all || paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`))
    const visible = entries.filter(scopeMatches)
    const names = visible
      .slice(0, 80)
      .map((entry) => `${entry.status} ${entry.path}`)
      .join('\n')
    const diff = await readWorkingSummary(repo.root, paths, all)
    const scope = deriveScope(paths, all)
    const language = String(locale || '').toLowerCase().startsWith('zh') ? '简体中文' : 'English'
    let recent = []
    try {
      const history = await readLog(repo.root, '', 8, '')
      recent = history.commits.map((commit) => commit.subject).filter(Boolean)
    } catch {
      recent = []
    }

    const prompt = [
      `分支：${repo.title}`,
      `scope 建议：${scope || '（省略）'}`,
      '',
      '本次改动的文件：',
      names || '(none)',
      '',
      'Diff：',
      diff || '(no textual diff; only untracked or binary files)',
      '',
      '最近的提交标题（仅用于参考语气与用词，不要照抄）：',
      recent.length ? recent.map((subject) => `- ${subject}`).join('\n') : '(none)',
    ].join('\n')

    const system = [
      '你是一名资深工程师，负责为一次改动写提交信息首行，遵循 Conventional Commits 规范。',
      `只输出一行，格式严格为：type(scope): 主题（使用中文时冒号后用中文，主题用${language}书写）。`,
      'type 必须是以下之一：feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert。',
      `scope 规则：${scope ? `优先使用「${scope}」。` : '若改动集中在某个目录/模块，可用其最后一段作为 scope；否则省略 scope，写成 type: 主题。'}`,
      '主题要求：祈使句、说明做了什么而不是怎么做、不超过 60 个字符、结尾不加句号、不使用引号或反引号。',
      '不要输出解释、不要输出代码块、不要输出多行。',
    ].join('\n')

    /**
     * One streaming attempt. A reasoning model can spend the whole token budget
     * on reasoning and return no text, so the caller retries with a larger
     * budget and no reasoning effort.
     * @param {string|undefined} effort - reasoning effort to request.
     * @param {number} budget - max tokens for the attempt.
     * @returns {Promise<{ text: string, finish: string }>} collected text and finish reason.
     */
    const streamOnce = async (effort, budget) => {
      let text = ''
      let finish = ''
      for await (const chunk of llm.stream({
        provider: selection.provider,
        model: selection.model,
        ...(effort ? { reasoningEffort: effort } : {}),
        system,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        maxTokens: budget,
        temperature: 0.2,
        signal,
      })) {
        if (chunk.type === 'text-delta') {
          text += chunk.text
        } else if (chunk.type === 'finish') {
          finish = chunk.reason && chunk.reason.kind ? chunk.reason.kind : 'unknown'
          if (finish === 'error' || finish === 'aborted') {
            const failure = chunk.reason.failure
            throw new GitError(
              `提交信息生成失败：${failure && failure.message ? failure.message : finish}`,
              502,
            )
          }
        }
      }
      return { text, finish }
    }

    let collected
    try {
      collected = await streamOnce(selection.reasoningEffort, 600)
      if (!collected.text.trim()) {
        // Reasoning consumed the budget, or the provider returned nothing: retry
        // without reasoning and with more room before reporting a failure.
        collected = await streamOnce(undefined, 900)
      }
    } catch (error) {
      if (error instanceof GitError) throw error
      if (error && error.name === 'AbortError') throw error
      throw new GitError(`提交信息生成失败：${error instanceof Error ? error.message : String(error)}`, 502)
    }
    if (!collected.text.trim()) {
      throw new GitError(`模型没有返回内容（finish: ${collected.finish || 'unknown'}）`, 502)
    }

    return normalizeCommitSubject(collected.text, scope)
  }

  /**
   * Reduce a model reply to one clean `type(scope): subject` line, coercing
   * answers that ignore the format instead of failing the request.
   * @param {string} raw - model output.
   * @param {string} scope - scope the panel suggested.
   * @returns {string} the normalized subject line.
   */
  function normalizeCommitSubject(raw, scope) {
    const cleaned = String(raw || '')
      .replace(/```[a-zA-Z]*/g, ' ')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => line.length > 0) || ''
    const line = cleaned
      .replace(/[\u0000-\u001f]/g, ' ')
      .replace(/^\s*(?:[-*]|\d+\.)\s*/, '')
      .replace(/^[`"'\s]+|[`"'\s]+$/g, '')
      .replace(/：/, ':')
      .replace(/\s+/g, ' ')
      .trim()
    if (!line) throw new GitError('模型没有返回提交信息', 502)
    const types = 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
    const pattern = new RegExp(`^(${types})(\\(([^)]{1,40})\\))?!?:\\s*(.+)$`, 'i')
    const match = line.match(pattern)
    if (!match) {
      const subject = line.replace(/^(提交信息|commit message)\s*[:：]\s*/i, '').slice(0, 60)
      return `${'chore'}${scope ? `(${scope})` : ''}: ${subject}`
    }
    const type = match[1].toLowerCase()
    const foundScope = (match[3] || '').trim()
    const subject = match[4].trim().replace(/[。.]$/, '').slice(0, 60)
    const finalScope = foundScope || scope
    return `${type}${finalScope ? `(${finalScope})` : ''}: ${subject}`
  }

  /**
   * Resolve a registered workspace to the Git working-tree root that contains it.
   * @param {string} id - workspace id sent by the browser.
   * @returns {Promise<{ id: string, title: string, path: string, root: string, expires: number }>}
   */
  async function resolveRepo(id) {
    const cached = repoCache.get(id)
    if (cached && cached.expires > Date.now()) return cached
    const workspace = ctx.workspaceRegistry.list().find((entry) => entry.id === id)
    if (!workspace) throw new GitError('workspace not found', 404)
    const root = await gitToplevel(workspace.path)
    const value = {
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
      root,
      expires: Date.now() + REPO_CACHE_TTL,
    }
    repoCache.set(id, value)
    return value
  }

  /**
   * Every registered workspace that is inside a Git repository.
   * @returns {Promise<Array<{ id: string, title: string, path: string, root: string }>>}
   */
  async function listRepos() {
    const workspaces = ctx.workspaceRegistry.list()
    const resolved = await Promise.all(
      workspaces.map(async (workspace) => {
        try {
          const repo = await resolveRepo(workspace.id)
          return { id: repo.id, title: repo.title, path: repo.path, root: repo.root }
        } catch {
          return null
        }
      }),
    )
    const unique = new Map()
    for (const repo of resolved) {
      if (repo && !unique.has(repo.root)) unique.set(repo.root, repo)
    }
    return [...unique.values()].sort((a, b) => a.title.localeCompare(b.title))
  }

  /**
   * Answer one Git data request.
   * @param {Request} request - authenticated browser request.
   * @returns {Promise<Response>} JSON response.
   */
  async function handle(request) {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || ''

    try {
      if (action === 'repos') return jsonResponse({ repos: await listRepos() })

      const repo = await resolveRepo(url.searchParams.get('repo') || '')

      if (action === 'status') {
        const [entries, state] = await Promise.all([readStatus(repo.root), readRepoState(repo.root)])
        const head = {
          branch: state.branch,
          hash: state.hash,
          detached: state.detached,
        }
        return jsonResponse({ repo, entries, head, state })
      }

      if (action === 'tree') {
        const ref = (url.searchParams.get('ref') || '').slice(0, 500)
        const scope = cleanScope(url.searchParams.get('path'))
        const requested = url.searchParams.get('mode')
        // The working tree is the default so untracked files are visible; a ref
        // is only read when the panel is showing that revision's file list.
        const mode = requested === 'ref' || (!requested && ref) ? 'ref' : 'worktree'
        const entries =
          mode === 'ref' ? await readTree(repo.root, ref, scope) : await readWorktreeTree(repo.root, scope)
        return jsonResponse({ repo, ref, path: scope, mode, entries })
      }

      if (action === 'remoteJob') {
        const id = (url.searchParams.get('id') || '').slice(0, 80)
        const job = remoteJobs.get(id)
        if (!job) throw new GitError('unknown remote job', 404)
        return jsonResponse({ ...remoteSnapshot(job) })
      }

      if (action === 'log') {
        const ref = (url.searchParams.get('ref') || '').slice(0, 500)
        const limit = boundedInt(url.searchParams.get('limit'), LIMITS.commits, LIMITS.commits)
        const scope = cleanScope(url.searchParams.get('path'))
        const [payload, state] = await Promise.all([
          readLog(repo.root, ref, limit, scope),
          readRepoState(repo.root),
        ])
        return jsonResponse({ repo, scope, ...payload, state })
      }

      if (action === 'commit') {
        const hash = (url.searchParams.get('hash') || '').trim()
        if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError('invalid commit hash', 400)
        const scope = cleanScope(url.searchParams.get('path'))
        const payload = await readCommit(repo.root, hash, scope)
        return jsonResponse({ repo, ...payload })
      }

      if (action === 'diff') {
        const hash = (url.searchParams.get('hash') || '').trim()
        const path = cleanScope(url.searchParams.get('path'))
        if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError('invalid commit hash', 400)
        if (!path) throw new GitError('invalid file path', 400)
        const payload = await readDiff(repo.root, hash, path)
        return jsonResponse({ repo, hash, ...payload })
      }

      throw new GitError('unknown action', 404)
    } catch (error) {
      const status = error instanceof GitError ? error.status : 500
      const message = error instanceof Error ? error.message : String(error)
      if (status >= 500) ctx.logger?.warn?.(`[git-view] ${message}`)
      return jsonResponse({ error: message }, status)
    }
  }

  /**
   * Commit working-tree changes.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @param {Request} request - authenticated browser request.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleCommitWrite(repo, body, request) {
    if (body.ai === true) {
      // The panel asks for a draft first and commits it afterwards, so the user
      // can review the message. Keep the old behavior out of reach.
      throw new GitError('generate the commit message first, then commit it', 400)
    }
    const release = beginWrite(repo.root)
    try {
      const all = body.all === true
      const paths = Array.isArray(body.paths)
        ? [...new Set(body.paths.map((value) => cleanScope(String(value || ''))).filter(Boolean))]
        : []
      if (!all && paths.length === 0) throw new GitError('select at least one changed file', 400)
      if (paths.length > 200) throw new GitError('too many files in one commit', 400)

      const entries = await readStatus(repo.root)
      const inScope = (entry) =>
        all || paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`))
      const scoped = entries.filter(inScope)
      if (scoped.length === 0) {
        throw new GitError(all ? 'no changes to commit' : 'selected files have no changes', 422)
      }
      if (scoped.some((entry) => entry.conflict)) {
        throw new GitError('resolve merge conflicts before committing', 409)
      }

      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const result = await commitChanges(repo.root, message, paths, all)
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({
        ok: true,
        message: result.message,
        hash: result.hash,
        shortHash: result.hash.slice(0, 7),
        ...(state ? { state } : {}),
      })
    } finally {
      release()
    }
  }

  /**
   * Generate one commit message draft without touching the repository. This
   * intentionally does not take the write lock: an LLM call must not block
   * commits, merges, or rollbacks.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @param {Request} request - authenticated browser request.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleMessageWrite(repo, body, request) {
    const all = body.all === true
    const paths = Array.isArray(body.paths)
      ? [...new Set(body.paths.map((value) => cleanScope(String(value || ''))).filter(Boolean))]
      : []
    if (!all && paths.length === 0) throw new GitError('select at least one changed file', 400)
    if (paths.length > 200) throw new GitError('too many files in one request', 400)
    const entries = await readStatus(repo.root)
    const inScope = (entry) =>
      all || paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`))
    if (!entries.some(inScope)) throw new GitError('selected files have no changes', 422)
    const message = await suggestCommitMessage(repo, paths, all, body.locale, request.signal)
    return jsonResponse({ ok: true, message })
  }

  /**
   * Run one branch/merge/rebase operation for the panel.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleBranchWrite(repo, body) {
    const release = beginWrite(repo.root)
    try {
      const result = await runBranchOperation(repo.root, String(body.op || ''), body)
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Discard the working-tree changes of the confirmed files.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleDiscardWrite(repo, body) {
    const paths = Array.isArray(body.paths)
      ? [...new Set(body.paths.map((value) => cleanScope(String(value || ''))).filter(Boolean))]
      : []
    const release = beginWrite(repo.root)
    try {
      const result = await discardChanges(repo.root, paths)
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Roll back a multi-file selection (optionally keeping newly added files).
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleRollbackWrite(repo, body) {
    const paths = Array.isArray(body.paths)
      ? [...new Set(body.paths.map((value) => cleanScope(String(value || ''))).filter(Boolean))]
      : []
    const release = beginWrite(repo.root)
    try {
      const result = await rollbackChanges(repo.root, paths, { deleteAdded: body.deleteAdded !== false })
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Undo, reset to, revert, cherry-pick, or check out one commit.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleHistoryWrite(repo, body) {
    const release = beginWrite(repo.root)
    try {
      const result = await commitHistoryOperation(repo.root, body)
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Mark conflicted files as resolved so a paused merge/rebase can continue.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleResolveWrite(repo, body) {
    const paths = Array.isArray(body.paths)
      ? [...new Set(body.paths.map((value) => cleanScope(String(value || ''))).filter(Boolean))]
      : []
    const release = beginWrite(repo.root)
    try {
      const result = await stageResolvedPaths(repo.root, paths)
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Commit working-tree changes or run a branch operation.
   * @param {Request} request - authenticated browser request.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleWrite(request) {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 1_000_000) return jsonResponse({ error: 'request body is too large' }, 413)

    let body
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'invalid JSON body' }, 400)
    }

    /** @type {object|null} */
    let repo = null
    try {
      repo = await resolveRepo(String(body.repo || ''))
      const action = typeof body.action === 'string' ? body.action : 'commit'
      if (action === 'commit') return await handleCommitWrite(repo, body, request)
      if (action === 'message') return await handleMessageWrite(repo, body, request)
      if (action === 'branch') return await handleBranchWrite(repo, body)
      if (action === 'discard') return await handleDiscardWrite(repo, body)
      if (action === 'rollback') return await handleRollbackWrite(repo, body)
      if (action === 'history') return await handleHistoryWrite(repo, body)
      if (action === 'remote') return jsonResponse(await startRemote(repo, body))
      if (action === 'remoteCancel') return jsonResponse(cancelRemote(body.id))
      if (action === 'resolve') return await handleResolveWrite(repo, body)
      throw new GitError('unknown action', 404)
    } catch (error) {
      const status = error instanceof GitError ? error.status : 500
      const message = error instanceof Error ? error.message : String(error)
      if (status >= 500) ctx.logger?.warn?.(`[git-view] write: ${message}`)
      let state = null
      if (repo) {
        try {
          state = await readRepoState(repo.root)
        } catch {
          state = null
        }
      }
      return jsonResponse(
        {
          error: message,
          ...(state ? { state } : {}),
          ...(error instanceof GitError && error.conflict ? { conflict: true } : {}),
        },
        status,
      )
    }
  }

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: ROUTE_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: handle,
      }),
    'git-view: data route',
  )

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: WRITE_ROUTE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: handleWrite,
      }),
    'git-view: write route',
  )
}
