/**
 * Host half of the Git Graph plugin.
 *
 * Serves the read-only Git data the browser panel renders. Repositories are
 * resolved from registered DSH workspaces only — the browser names a workspace
 * id, never a filesystem path — so this route cannot be used to read arbitrary
 * directories.
 */

import {
  GitError,
  LIMITS,
  commitChanges,
  gitToplevel,
  readCommit,
  readDiff,
  readLog,
  readStatus,
  readTree,
  readWorkingSummary,
} from './git-data.js'
import { discardChanges, readRepoState, runBranchOperation, stageResolvedPaths } from './git-ops.js'

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

  /**
   * Ask the composed default model for one Conventional Commit subject line.
   * @param {object} repo - resolved repository.
   * @param {string[]} paths - selected paths, or [] for every change.
   * @param {boolean} all - whether every change is included.
   * @param {string} locale - UI locale hint.
   * @param {AbortSignal} signal - request cancellation.
   * @returns {Promise<string>} the generated subject.
   */
  async function suggestCommitMessage(repo, paths, all, locale, signal) {
    const llm = ctx.get('llm')
    const defaultModel = ctx.get('agentDefaultModel')
    if (!llm || !defaultModel) {
      throw new GitError('AI commit is unavailable: the LLM service is not mounted', 503)
    }
    let selection
    try {
      selection = defaultModel.currentSelection()
    } catch (error) {
      throw new GitError(
        `AI commit is unavailable: ${error instanceof Error ? error.message : String(error)}`,
        503,
      )
    }
    if (!selection || !selection.provider || !selection.model) {
      throw new GitError('AI commit is unavailable: no default model is configured', 503)
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
    const language = String(locale || '').toLowerCase().startsWith('zh') ? 'Simplified Chinese' : 'English'
    const prompt = [
      `Repository: ${repo.title}`,
      `Changed files:`,
      names || '(none)',
      '',
      'Diff:',
      diff || '(no textual diff; only untracked or binary files)',
    ].join('\n')

    let text = ''
    try {
      for await (const chunk of llm.stream({
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort ? { reasoningEffort: selection.reasoningEffort } : {}),
        system: `You write one concise Conventional Commit subject line in ${language}. Return only the subject line, without quotes or a body, at most 72 characters.`,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        maxTokens: 160,
        temperature: 0.2,
        signal,
      })) {
        if (chunk.type === 'text-delta') {
          text += chunk.text
        } else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
          const failure = chunk.reason.failure
          throw new GitError(
            `AI commit message failed: ${failure && failure.message ? failure.message : chunk.reason.kind}`,
            502,
          )
        }
      }
    } catch (error) {
      if (error instanceof GitError) throw error
      throw new GitError(
        `AI commit message failed: ${error instanceof Error ? error.message : String(error)}`,
        502,
      )
    }

    const first = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)[0] || ''
    const cleaned = first.replace(/[\u0000-\u001f]/g, ' ').replace(/^[`"'\s]+|[`"'\s]+$/g, '').slice(0, 120)
    if (!cleaned) throw new GitError('AI did not return a commit message', 502)
    return cleaned
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
        const entries = await readTree(repo.root, ref, scope)
        return jsonResponse({ repo, ref, path: scope, entries })
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
   * Commit working-tree changes, optionally generating the message with AI.
   * @param {object} repo - resolved repository.
   * @param {object} body - parsed request body.
   * @param {Request} request - authenticated browser request.
   * @returns {Promise<Response>} JSON response.
   */
  async function handleCommitWrite(repo, body, request) {
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

      let message = typeof body.message === 'string' ? body.message.trim() : ''
      let ai = false
      if (body.ai === true) {
        message = await suggestCommitMessage(repo, paths, all, body.locale, request.signal)
        ai = true
      }
      const result = await commitChanges(repo.root, message, paths, all)
      const state = await readRepoState(repo.root).catch(() => null)
      return jsonResponse({
        ok: true,
        ai,
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
      if (action === 'branch') return await handleBranchWrite(repo, body)
      if (action === 'discard') return await handleDiscardWrite(repo, body)
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
