/**
 * Workspace → repository resolution.
 *
 * Repositories are resolved from registered DSH workspaces only — the browser
 * names a workspace id, never a filesystem path — so the routes cannot be used
 * to read arbitrary directories. A resolution is cached for a short while so a
 * polling panel does not run `git rev-parse` on every request.
 */

import { GitData } from './data.js'
import { GitError } from './errors.js'
import type { GitRepo, RepoRecord, WorkspaceRegistry } from './types.js'

/** How long a workspace → Git-root resolution is reused. */
export const REPO_CACHE_TTL = 15_000

/** Resolves workspace ids to Git working-tree roots, with a 15 s TTL cache. */
export class RepoResolver {
  private readonly cache = new Map<string, RepoRecord>()

  constructor(
    private readonly workspaceRegistry: WorkspaceRegistry,
    private readonly data: GitData = new GitData(),
    private readonly ttl: number = REPO_CACHE_TTL,
  ) {}

  /**
   * Resolve a registered workspace to the Git working-tree root that contains it.
   * @param id - workspace id sent by the browser.
   * @returns the resolved repository (also cached for {@link REPO_CACHE_TTL}).
   */
  async resolve(id: string): Promise<RepoRecord> {
    const cached = this.cache.get(id)
    if (cached && cached.expires > Date.now()) return cached
    const workspace = this.workspaceRegistry.list().find((entry) => entry.id === id)
    if (!workspace) throw new GitError('workspace not found', 404)
    const root = await this.data.toplevel(workspace.path)
    const value: RepoRecord = {
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
      root,
      expires: Date.now() + this.ttl,
    }
    this.cache.set(id, value)
    return value
  }

  /**
   * Every registered workspace that is inside a Git repository.
   * @returns the repos payload, one entry per repository root.
   */
  async list(): Promise<GitRepo[]> {
    const workspaces = this.workspaceRegistry.list()
    const resolved = await Promise.all(
      workspaces.map(async (workspace): Promise<GitRepo | null> => {
        try {
          const repo = await this.resolve(workspace.id)
          return { id: repo.id, title: repo.title, path: repo.path, root: repo.root }
        } catch {
          return null
        }
      }),
    )
    const unique = new Map<string, GitRepo>()
    for (const repo of resolved) {
      if (repo && !unique.has(repo.root)) unique.set(repo.root, repo)
    }
    return [...unique.values()].sort((a, b) => a.title.localeCompare(b.title))
  }
}
