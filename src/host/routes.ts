/**
 * The two authenticated routes the Host half serves.
 *
 * `GET /api/git-view` carries reads (repos, status, tree, log, commit, diff, and
 * remote-job polling); `POST /api/git-view/write` carries commits, branch
 * operations, discards, history rewrites, and remote jobs. The class knows HTTP
 * and the JSON envelope; every Git detail lives behind {@link GitData},
 * {@link GitOps}, {@link RepoResolver}, and {@link RemoteService}.
 */

import { GitData } from './data.js'
import { GitError } from './errors.js'
import { GitRunner, LIMITS } from './exec.js'
import { GitOps } from './ops.js'
import { repoPath, repoPaths } from './paths.js'
import { RemoteService } from './remote.js'
import { RepoResolver } from './repo.js'
import type {
  DefaultModelService,
  GitRepo,
  LlmSelection,
  LlmService,
  Logger,
  RepoState,
  ServiceAccessor,
  StatusEntry,
  WorkspaceRegistry,
} from './types.js'

/** Largest accepted request body (bytes). */
const MAX_BODY_BYTES = 1_000_000

/** Most files one commit, discard, rollback, or resolve may name. */
const MAX_PATHS = 200

/** How many status entries and commit subjects the draft prompt includes. */
const PROMPT_ENTRIES = 80
const PROMPT_HISTORY = 8

/** Services and settings one {@link GitViewRoutes} needs. */
export interface GitViewRoutesOptions {
  /** Workspace registry; a {@link RepoResolver} is built from it when none is given. */
  workspaceRegistry: WorkspaceRegistry
  /** Lazy lookup for `llm` and `agentDefaultModel`, read per request. */
  services: ServiceAccessor
  logger?: Logger
  runner?: GitRunner
  data?: GitData
  ops?: GitOps
  resolver?: RepoResolver
  remote?: RemoteService
}

/**
 * Build one JSON response.
 * @param body - JSON-serialisable payload.
 * @param status - HTTP status.
 * @returns the response.
 */
function jsonResponse(body: unknown, status = 200): Response {
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
 * @param raw - query value.
 * @param fallback - value used when absent or invalid.
 * @param max - upper bound.
 * @returns the bounded integer.
 */
function boundedInt(raw: string | null, fallback: number, max: number): number {
  if (raw === null) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) return fallback
  return Math.min(value, max)
}

/**
 * Validate a repository-relative scope path ('' is the repository root).
 * The path is never trimmed or rewritten: a directory with a leading space is
 * a different directory.
 * @param raw - query value.
 * @returns the path, unchanged.
 */
function cleanScope(raw: string | null): string {
  return repoPath(raw ?? '', { allowEmpty: true, label: 'path' })
}

/**
 * Read a JSON body as a plain object without trusting its shape.
 * @param value - parsed JSON.
 * @returns the object, or an empty one for every non-object value.
 */
function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/**
 * Narrow a mounted service to the LLM surface this plugin uses.
 * @param value - `ctx.get('llm')`.
 * @returns the service, or undefined when it is not usable.
 */
function asLlmService(value: unknown): LlmService | undefined {
  const record = toRecord(value)
  return typeof record.stream === 'function' ? (value as LlmService) : undefined
}

/**
 * Narrow a mounted service to the default-model surface this plugin uses.
 * @param value - `ctx.get('agentDefaultModel')`.
 * @returns the service, or undefined when it is not usable.
 */
function asDefaultModelService(value: unknown): DefaultModelService | undefined {
  const record = toRecord(value)
  return typeof record.currentSelection === 'function' ? (value as DefaultModelService) : undefined
}

/**
 * Narrow the default model's current selection.
 * @param value - return value of `currentSelection()`.
 * @returns the provider/model pair, or null when none is configured.
 */
function readSelection(value: unknown): LlmSelection | null {
  const record = toRecord(value)
  const provider = typeof record.provider === 'string' ? record.provider : ''
  const model = typeof record.model === 'string' ? record.model : ''
  if (!provider || !model) return null
  const effort = typeof record.reasoningEffort === 'string' ? record.reasoningEffort : undefined
  return effort ? { provider, model, reasoningEffort: effort } : { provider, model }
}

/**
 * Derive a Conventional Commit `scope` from the selected paths: the deepest
 * directory every path shares, reduced to its last segment.
 * @param paths - repository-relative paths.
 * @param all - whether the whole working tree is included.
 * @returns scope, or an empty string when the selection has none.
 */
function deriveScope(paths: string[], all: boolean): string {
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
 * Reduce a model reply to one clean `type(scope): subject` line, coercing
 * answers that ignore the format instead of failing the request.
 * @param raw - model output.
 * @param scope - scope the panel suggested.
 * @returns the normalized subject line.
 */
function normalizeCommitSubject(raw: string, scope: string): string {
  const cleaned =
    String(raw || '')
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
    return `chore${scope ? `(${scope})` : ''}: ${subject}`
  }
  const type = match[1].toLowerCase()
  const foundScope = (match[3] || '').trim()
  const subject = match[4]
    .trim()
    .replace(/[。.]$/, '')
    .slice(0, 60)
  const finalScope = foundScope || scope
  return `${type}${finalScope ? `(${finalScope})` : ''}: ${subject}`
}

/** Serves the two authenticated Git routes. */
export class GitViewRoutes {
  private readonly data: GitData

  private readonly ops: GitOps

  private readonly resolver: RepoResolver

  private readonly remote: RemoteService

  private readonly services: ServiceAccessor

  private readonly logger?: Logger

  constructor(options: GitViewRoutesOptions) {
    const runner = options.runner ?? new GitRunner()
    this.services = options.services
    this.logger = options.logger
    this.data = options.data ?? new GitData(runner)
    this.ops = options.ops ?? new GitOps(this.data)
    this.resolver = options.resolver ?? new RepoResolver(options.workspaceRegistry, this.data)
    this.remote =
      options.remote ??
      new RemoteService({
        data: this.data,
        ops: this.ops,
        lock: this.ops.lock,
        runner,
      })
  }

  /**
   * Answer one Git data request.
   * @param request - authenticated browser request.
   * @returns JSON response.
   */
  async read(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || ''

    try {
      if (action === 'repos') return jsonResponse({ repos: await this.resolver.list() })

      const repo = await this.resolver.resolve(url.searchParams.get('repo') || '')

      if (action === 'status') {
        const [entries, state] = await Promise.all([this.data.status(repo.root), this.ops.state(repo.root)])
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
          mode === 'ref' ? await this.data.tree(repo.root, ref, scope) : await this.data.worktreeTree(repo.root, scope)
        return jsonResponse({ repo, ref, path: scope, mode, entries })
      }

      if (action === 'remoteJob') {
        const id = (url.searchParams.get('id') || '').slice(0, 80)
        return jsonResponse(this.remote.snapshot(id))
      }

      if (action === 'log') {
        const ref = (url.searchParams.get('ref') || '').slice(0, 500)
        const limit = boundedInt(url.searchParams.get('limit'), LIMITS.commits, LIMITS.commits)
        const scope = cleanScope(url.searchParams.get('path'))
        const [payload, state] = await Promise.all([
          this.data.log(repo.root, ref, limit, scope),
          this.ops.state(repo.root),
        ])
        return jsonResponse({ repo, scope, ...payload, state })
      }

      if (action === 'commit') {
        const hash = (url.searchParams.get('hash') || '').trim()
        if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError('invalid commit hash', 400)
        const scope = cleanScope(url.searchParams.get('path'))
        const payload = await this.data.commit(repo.root, hash, scope)
        return jsonResponse({ repo, ...payload })
      }

      if (action === 'diff') {
        const hash = (url.searchParams.get('hash') || '').trim()
        if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError('invalid commit hash', 400)
        // A diff identifies exactly one file, so the path must stay byte-exact.
        const path = repoPath(url.searchParams.get('path'), { label: 'file path' })
        const payload = await this.data.diff(repo.root, hash, path)
        return jsonResponse({ repo, hash, ...payload })
      }

      throw new GitError('unknown action', 404)
    } catch (error) {
      const status = error instanceof GitError ? error.status : 500
      const message = error instanceof Error ? error.message : String(error)
      if (status >= 500) this.logger?.warn?.(`[git-view] ${message}`)
      return jsonResponse({ error: message }, status)
    }
  }

  /**
   * Commit working-tree changes, run a branch/history operation, or start a
   * remote job.
   * @param request - authenticated browser request.
   * @returns JSON response.
   */
  async write(request: Request): Promise<Response> {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: 'request body is too large' }, 413)

    let body: Record<string, unknown>
    try {
      body = toRecord(await request.json())
    } catch {
      return jsonResponse({ error: 'invalid JSON body' }, 400)
    }

    let repo: GitRepo | null = null
    try {
      repo = await this.resolver.resolve(String(body.repo || ''))
      const action = typeof body.action === 'string' ? body.action : 'commit'
      if (action === 'commit') return await this.commitWrite(repo, body)
      if (action === 'message') return await this.messageWrite(repo, body, request.signal)
      if (action === 'branch') return await this.branchWrite(repo, body)
      if (action === 'discard') return await this.discardWrite(repo, body)
      if (action === 'rollback') return await this.rollbackWrite(repo, body)
      if (action === 'history') return await this.historyWrite(repo, body)
      if (action === 'remote') return jsonResponse(await this.remote.start(repo, body))
      if (action === 'remoteCancel') return jsonResponse(this.remote.cancel(body.id))
      if (action === 'resolve') return await this.resolveWrite(repo, body)
      throw new GitError('unknown action', 404)
    } catch (error) {
      const status = error instanceof GitError ? error.status : 500
      const message = error instanceof Error ? error.message : String(error)
      if (status >= 500) this.logger?.warn?.(`[git-view] write: ${message}`)
      let state: RepoState | null = null
      if (repo) {
        try {
          state = await this.ops.state(repo.root)
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

  /**
   * Commit working-tree changes.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  private async commitWrite(repo: GitRepo, body: Record<string, unknown>): Promise<Response> {
    if (body.ai === true) {
      // The panel asks for a draft first and commits it afterwards, so the user
      // can review the message. Keep the old behavior out of reach.
      throw new GitError('generate the commit message first, then commit it', 400)
    }
    const release = this.ops.beginWrite(repo.root)
    try {
      const all = body.all === true
      const paths = this.collectPaths(body)
      if (!all && paths.length === 0) throw new GitError('select at least one changed file', 400)
      if (paths.length > MAX_PATHS) throw new GitError('too many files in one commit', 400)

      const entries = await this.data.status(repo.root)
      const scoped = entries.filter(inScope(all, paths))
      if (scoped.length === 0) {
        throw new GitError(all ? 'no changes to commit' : 'selected files have no changes', 422)
      }
      if (scoped.some((entry) => entry.conflict)) {
        throw new GitError('resolve merge conflicts before committing', 409)
      }

      const message = typeof body.message === 'string' ? body.message.trim() : ''
      const result = await this.data.commitChanges(repo.root, message, paths, all)
      const state = await this.ops.state(repo.root).catch(() => null)
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
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @param signal - request cancellation.
   * @returns JSON response.
   */
  private async messageWrite(repo: GitRepo, body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
    const all = body.all === true
    const paths = this.collectPaths(body)
    if (!all && paths.length === 0) throw new GitError('select at least one changed file', 400)
    if (paths.length > MAX_PATHS) throw new GitError('too many files in one request', 400)
    const entries = await this.data.status(repo.root)
    if (!entries.some(inScope(all, paths))) throw new GitError('selected files have no changes', 422)
    const message = await this.suggestCommitMessage(repo, paths, all, body.locale, signal)
    return jsonResponse({ ok: true, message })
  }

  /**
   * Run one branch/merge/rebase operation for the panel.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  private async branchWrite(repo: GitRepo, body: Record<string, unknown>): Promise<Response> {
    const release = this.ops.beginWrite(repo.root)
    try {
      const result = await this.ops.runBranchOperation(repo.root, String(body.op || ''), body)
      const state = await this.ops.state(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Discard the working-tree changes of the confirmed files.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  private async discardWrite(repo: GitRepo, body: Record<string, unknown>): Promise<Response> {
    const paths = this.collectPaths(body)
    const release = this.ops.beginWrite(repo.root)
    try {
      const result = await this.ops.discardChanges(repo.root, paths)
      const state = await this.ops.state(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Roll back a multi-file selection (optionally keeping newly added files).
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  private async rollbackWrite(repo: GitRepo, body: Record<string, unknown>): Promise<Response> {
    const paths = this.collectPaths(body)
    const release = this.ops.beginWrite(repo.root)
    try {
      const result = await this.ops.rollbackChanges(repo.root, paths, { deleteAdded: body.deleteAdded !== false })
      const state = await this.ops.state(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Undo, reset to, revert, cherry-pick, or check out one commit.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  private async historyWrite(repo: GitRepo, body: Record<string, unknown>): Promise<Response> {
    const release = this.ops.beginWrite(repo.root)
    try {
      const result = await this.ops.commitHistoryOperation(repo.root, body)
      const state = await this.ops.state(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Mark conflicted files as resolved so a paused merge/rebase can continue.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  private async resolveWrite(repo: GitRepo, body: Record<string, unknown>): Promise<Response> {
    const paths = this.collectPaths(body)
    const release = this.ops.beginWrite(repo.root)
    try {
      const result = await this.ops.stageResolvedPaths(repo.root, paths)
      const state = await this.ops.state(repo.root).catch(() => null)
      return jsonResponse({ ok: true, ...result, ...(state ? { state } : {}) })
    } finally {
      release()
    }
  }

  /**
   * Normalize the `paths` array of one request body.
   * @param body - parsed request body.
   * @returns unique, validated repository-relative paths.
   */
  private collectPaths(body: Record<string, unknown>): string[] {
    return repoPaths(body.paths, MAX_PATHS)
  }

  /**
   * Ask the composed default model for one `type(scope): subject` line the user
   * can edit before committing. The model never commits anything.
   * @param repo - resolved repository.
   * @param paths - selected paths, or [] for every change.
   * @param all - whether every change is included.
   * @param locale - UI locale hint.
   * @param signal - request cancellation.
   * @returns the generated subject line.
   */
  private async suggestCommitMessage(
    repo: GitRepo,
    paths: string[],
    all: boolean,
    locale: unknown,
    signal: AbortSignal,
  ): Promise<string> {
    const llm = asLlmService(this.services.get('llm'))
    const defaultModel = asDefaultModelService(this.services.get('agentDefaultModel'))
    if (!llm || !defaultModel) {
      throw new GitError('the LLM service is not mounted', 503)
    }
    let selection: LlmSelection | null
    try {
      selection = readSelection(defaultModel.currentSelection())
    } catch (error) {
      throw new GitError(error instanceof Error ? error.message : String(error), 503)
    }
    if (!selection) {
      throw new GitError('no default model is configured', 503)
    }

    const entries = await this.data.status(repo.root)
    const visible = entries.filter(inScope(all, paths))
    const names = visible
      .slice(0, PROMPT_ENTRIES)
      .map((entry) => `${entry.status} ${entry.path}`)
      .join('\n')
    const diff = await this.data.workingSummary(repo.root, paths, all)
    const scope = deriveScope(paths, all)
    const language = String(locale || '').toLowerCase().startsWith('zh') ? '简体中文' : 'English'
    let recent: string[] = []
    try {
      const history = await this.data.log(repo.root, '', PROMPT_HISTORY, '')
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

    let collected: { text: string; finish: string }
    try {
      collected = await this.streamOnce(llm, selection, system, prompt, selection.reasoningEffort, 600, signal)
      if (!collected.text.trim()) {
        // Reasoning consumed the budget, or the provider returned nothing: retry
        // without reasoning and with more room before reporting a failure.
        collected = await this.streamOnce(llm, selection, system, prompt, undefined, 900, signal)
      }
    } catch (error) {
      if (error instanceof GitError) throw error
      if (error && (error as { name?: string }).name === 'AbortError') throw error
      throw new GitError(`提交信息生成失败：${error instanceof Error ? error.message : String(error)}`, 502)
    }
    if (!collected.text.trim()) {
      throw new GitError(`模型没有返回内容（finish: ${collected.finish || 'unknown'}）`, 502)
    }

    return normalizeCommitSubject(collected.text, scope)
  }

  /**
   * One streaming attempt. A reasoning model can spend the whole token budget on
   * reasoning and return no text, so the caller retries with a larger budget and
   * no reasoning effort.
   * @param llm - mounted LLM service.
   * @param selection - provider/model to use.
   * @param system - system prompt.
   * @param prompt - user prompt.
   * @param effort - reasoning effort to request.
   * @param budget - max tokens for the attempt.
   * @param signal - request cancellation.
   * @returns collected text and finish reason.
   */
  private async streamOnce(
    llm: LlmService,
    selection: LlmSelection,
    system: string,
    prompt: string,
    effort: string | undefined,
    budget: number,
    signal: AbortSignal,
  ): Promise<{ text: string; finish: string }> {
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
      const record = toRecord(chunk)
      if (record.type === 'text-delta') {
        text += typeof record.text === 'string' ? record.text : ''
      } else if (record.type === 'finish') {
        const reason = toRecord(record.reason)
        finish = typeof reason.kind === 'string' && reason.kind ? reason.kind : 'unknown'
        if (finish === 'error' || finish === 'aborted') {
          const failureRecord = toRecord(reason.failure)
          const detail = typeof failureRecord.message === 'string' ? failureRecord.message : ''
          throw new GitError(`提交信息生成失败：${detail || finish}`, 502)
        }
      }
    }
    return { text, finish }
  }
}

/**
 * Whether one status entry belongs to the selected paths.
 * @param all - whether every change is included.
 * @param paths - selected repository-relative paths.
 * @returns the predicate.
 */
function inScope(all: boolean, paths: string[]): (entry: StatusEntry) => boolean {
  return (entry) => all || paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`))
}
