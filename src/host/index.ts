/**
 * Host half of the Git Graph plugin.
 *
 * Serves the Git data the browser panel renders over two authenticated routes.
 * Repositories are resolved from registered DSH workspaces only — the browser
 * names a workspace id, never a filesystem path — so these routes cannot be used
 * to read arbitrary directories.
 *
 * The entry only wires the object graph: {@link GitRunner} → {@link GitData} →
 * {@link GitOps} / {@link RepoResolver} / {@link RemoteService} →
 * {@link GitViewRoutes}, then registers both routes inside `ctx.effect` so they
 * are disposed with the plugin.
 */

import { GitData } from './data.js'
import { GitRunner } from './exec.js'
import { GitOps } from './ops.js'
import { RemoteService } from './remote.js'
import { RepoResolver } from './repo.js'
import { GitViewRoutes } from './routes.js'
import type { Logger, ServiceAccessor, WorkspaceRegistry } from './types.js'

/** The authenticated route the Client half reads Git data from. */
export const ROUTE_PATH = '/api/git-view'

/** The authenticated route the Client half sends commits to. */
export const WRITE_ROUTE_PATH = '/api/git-view/write'

/** Bundle row dependencies: the Web connection carrier and the workspace registry. */
export const inject = ['connection', 'workspaceRegistry']

/** One route registered on the Web connection carrier. */
interface FetchRegistration {
  path: string
  methods: string[]
  requestBody: 'buffered'
  fetch: (request: Request) => Promise<Response>
}

/** The slice of the connection service the entry registers routes on. */
interface ConnectionService {
  fetch: {
    register(options: FetchRegistration): unknown
  }
}

/** The slice of the Cordis context the entry uses. */
export interface HostContext {
  get(name: string): unknown
  effect(execute: () => unknown, label: string): unknown
  connection: ConnectionService
  workspaceRegistry: WorkspaceRegistry
  logger?: Logger
}

/**
 * Install the authenticated routes that carry Git data to the browser panel.
 * @param ctx - plugin context.
 */
export function apply(ctx: HostContext): void {
  const runner = new GitRunner()
  const data = new GitData(runner)
  const ops = new GitOps(data)
  const resolver = new RepoResolver(ctx.workspaceRegistry, data)
  const remote = new RemoteService({ data, ops, lock: ops.lock, runner })

  // `llm` and `agentDefaultModel` are looked up per request, not at mount time:
  // the draft action must pick up a model service that is mounted later.
  const services: ServiceAccessor = { get: (name) => ctx.get(name) }
  const routes = new GitViewRoutes({
    data,
    ops,
    resolver,
    remote,
    workspaceRegistry: ctx.workspaceRegistry,
    services,
    logger: ctx.logger,
  })

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: ROUTE_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => routes.read(request),
      }),
    'git-view: data route',
  )

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: WRITE_ROUTE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => routes.write(request),
      }),
    'git-view: write route',
  )

  // Remote jobs outlive the request that started them, so they must be tied to
  // the plugin lifecycle: dispose stops their children and releases the locks.
  ctx.effect(
    () => () => {
      void remote.dispose()
    },
    'git-view: remote jobs',
  )
}
