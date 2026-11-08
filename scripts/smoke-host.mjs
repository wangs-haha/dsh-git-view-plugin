/**
 * Host smoke test: loads the built `index.js`, registers it with a mock
 * Cordis context, and exercises the routes against a throwaway repository.
 *
 * Run with `node scripts/smoke-host.mjs` after `pnpm build`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'


const bundle = new URL('../index.js', import.meta.url)
const failures = []
const check = (name, condition, detail = '') => {
  if (condition) console.log(`ok   ${name}`)
  else {
    console.error(`FAIL ${name} ${detail}`)
    failures.push(name)
  }
}

const base = mkdtempSync(join(tmpdir(), 'gv-smoke-'))
const remote = join(base, 'remote.git')
const repo = join(base, 'repo')
const solo = join(base, 'solo')
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' })

try {
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote])
  git(base, 'clone', '-q', remote, repo)
  git(repo, 'config', 'user.email', 'smoke@example.com')
  git(repo, 'config', 'user.name', 'Smoke')
  git(repo, 'config', 'core.autocrlf', 'false')
  mkdirSync(solo)
  git(solo, 'init', '-q', '-b', 'main')
  git(solo, 'config', 'user.email', 'smoke@example.com')
  git(solo, 'config', 'user.name', 'Smoke')
  git(solo, 'config', 'core.autocrlf', 'false')
  writeFileSync(join(solo, 'root.txt'), 'root\n')
  git(solo, 'add', '.')
  git(solo, 'commit', '-qm', 'feat: root commit')
  writeFileSync(join(repo, 'readme.md'), 'one\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-qm', 'feat: init')
  writeFileSync(join(repo, 'untracked.md'), 'scratch\n')
  writeFileSync(join(repo, 'readme.md'), 'two\n')

  const routes = new Map()
  const llm = {
    async *stream() {
      yield { type: 'text-delta', text: 'feat(readme): 更新说明' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
  const plugin = await import(bundle.href)
  plugin.apply({
    effect(run) {
      run()
    },
    logger: { warn: (message) => console.warn('[warn]', message) },
    get(name) {
      if (name === 'llm') return llm
      if (name === 'agentDefaultModel') {
        return { currentSelection: () => ({ provider: 'mock', model: 'mock-1', reasoningEffort: 'high' }) }
      }
      return undefined
    },
    connection: { fetch: { register: (def) => routes.set(def.path, def.fetch) } },
    workspaceRegistry: {
      list: () => [
        { id: 'w1', title: 'smoke', path: repo },
        { id: 'w2', title: 'solo', path: solo },
      ],
    },
  })

  const read = routes.get('/api/git-view')
  const write = routes.get('/api/git-view/write')
  check('routes registered', Boolean(read && write))
  const get = async (query) => (await read(new Request(`http://local/api/git-view?${query}`))).json()
  const post = async (body) => {
    const response = await write(
      new Request('http://local/api/git-view/write', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    return { status: response.status, body: await response.json() }
  }

  const repos = await get('action=repos')
  check(
    'repos',
    repos.repos.length === 2 && repos.repos.some((entry) => entry.id === 'w1' && entry.title === 'smoke'),
    JSON.stringify(repos.repos),
  )

  const worktree = await get('action=tree&repo=w1&mode=worktree')
  check(
    'worktree tree lists untracked file',
    worktree.entries.some((entry) => entry.path === 'untracked.md' && entry.untracked),
    JSON.stringify(worktree.entries),
  )
  const refTree = await get('action=tree&repo=w1&mode=ref&ref=refs/heads/main')
  check('ref tree hides untracked file', refTree.entries.every((entry) => entry.path !== 'untracked.md'))

  const message = await post({ repo: 'w1', action: 'message', paths: ['readme.md'], locale: 'zh-CN' })
  check('message draft', message.status === 200 && message.body.message === 'feat(readme): 更新说明', JSON.stringify(message.body))

  const rejected = await post({ repo: 'w1', action: 'commit', paths: ['readme.md'], ai: true })
  check('ai commit rejected', rejected.status === 400)

  const commit = await post({ repo: 'w1', action: 'commit', paths: ['readme.md'], message: 'fix: two' })
  check('commit', commit.status === 200 && /^[0-9a-f]{7,}$/.test(commit.body.shortHash))

  // Regression: a path already staged as deleted must not break `git add -A`.
  writeFileSync(join(repo, 'gone.md'), 'bye\n')
  git(repo, 'add', 'gone.md')
  git(repo, 'commit', '-qm', 'chore: add gone')
  git(repo, 'rm', '-q', 'gone.md')
  const deletion = await post({ repo: 'w1', action: 'commit', paths: ['gone.md'], message: 'chore: remove gone' })
  check('commit staged deletion', deletion.status === 200, JSON.stringify(deletion.body))

  const branch = await post({ repo: 'w1', action: 'branch', op: 'create', name: 'smoke/branch', checkout: false })
  check('branch create', branch.status === 200)
  const merge = await post({ repo: 'w1', action: 'branch', op: 'merge', ref: 'refs/heads/smoke/branch' })
  check('merge', merge.status === 200)

  const rollback = await post({ repo: 'w1', action: 'rollback', paths: ['untracked.md'], deleteAdded: true })
  check('rollback', rollback.status === 200)
  const status = await get('action=status&repo=w1')
  check('clean after rollback', status.entries.length === 0, JSON.stringify(status.entries))

  const undo = await post({ repo: 'w1', action: 'history', op: 'undo' })
  check('undo commit', undo.status === 200)

  const push = await post({ repo: 'w1', action: 'remote', op: 'push' })
  check('push starts', push.status === 200 && typeof push.body.id === 'string')
  let snapshot = null
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    snapshot = await get(`action=remoteJob&repo=w1&id=${push.body.id}`)
    if (snapshot.state !== 'running' && snapshot.state !== 'cancelling') break
  }
  check('push done', snapshot.state === 'done', JSON.stringify(snapshot))

  // A push must only update the current branch, even when git is configured
  // to push matching branches.
  git(repo, 'reset', '--hard', '-q')
  git(repo, 'branch', 'other', 'main')
  git(repo, 'switch', '-q', 'other')
  writeFileSync(join(repo, 'other.txt'), 'other\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-qm', 'test: other branch')
  git(repo, 'switch', '-q', 'main')
  git(repo, 'config', 'push.default', 'matching')
  const scopedPush = await post({ repo: 'w1', action: 'remote', op: 'push' })
  check('scoped push starts', scopedPush.status === 200)
  let scopedSnapshot = null
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    scopedSnapshot = await get(`action=remoteJob&repo=w1&id=${scopedPush.body.id}`)
    if (scopedSnapshot.state !== 'running' && scopedSnapshot.state !== 'cancelling') break
  }
  const remoteHeads = execFileSync(
    'git',
    ['--git-dir', remote, 'for-each-ref', '--format=%(refname)', 'refs/heads'],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
  check(
    'push does not publish other branches',
    scopedSnapshot.state === 'done' &&
      remoteHeads.includes('refs/heads/main') &&
      !remoteHeads.includes('refs/heads/other'),
    remoteHeads.join(','),
  )
  git(repo, 'config', '--unset', 'push.default')
  git(repo, 'branch', '-D', 'other')

  // A path with a leading space is a different file from its trimmed twin.
  writeFileSync(join(repo, ' victim.txt'), 'base\n')
  writeFileSync(join(repo, 'victim.txt'), 'base\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-qm', 'test: path fixtures')
  writeFileSync(join(repo, ' victim.txt'), 'selected change\n')
  writeFileSync(join(repo, 'victim.txt'), 'unselected change\n')
  const exactRollback = await post({ repo: 'w1', action: 'rollback', paths: [' victim.txt'], deleteAdded: true })
  check(
    'rollback targets the exact path',
    exactRollback.status === 200 && exactRollback.body.paths?.[0] === ' victim.txt',
    JSON.stringify(exactRollback.body),
  )
  const afterRollback = await get('action=status&repo=w1')
  check(
    'lookalike file keeps its changes',
    afterRollback.entries.some((entry) => entry.path === 'victim.txt'),
    JSON.stringify(afterRollback.entries),
  )
  check(
    'selected file is restored',
    !afterRollback.entries.some((entry) => entry.path === ' victim.txt'),
    JSON.stringify(afterRollback.entries),
  )
  await post({ repo: 'w1', action: 'rollback', paths: ['victim.txt'], deleteAdded: true })

  const pathCommitHash = git(repo, 'log', '-1', '--format=%H', '--', ' victim.txt').trim()
  const exactDiff = await get(
    `action=diff&repo=w1&hash=${pathCommitHash}&path=${encodeURIComponent(' victim.txt')}`,
  )
  check(
    'diff keeps the exact path',
    exactDiff.text.includes('victim.txt') && exactDiff.path === ' victim.txt',
    JSON.stringify({ path: exactDiff.path, text: (exactDiff.text || '').slice(0, 80) }),
  )
  const badDiff = await get('action=diff&repo=w1&hash=--output=x&path=readme.md')
  check('diff rejects an option-like hash', typeof badDiff.error === 'string', JSON.stringify(badDiff))

  // A scoped commit read must filter in git, not after the 400-file cap.
  mkdirSync(join(repo, 'bulk'))
  for (let index = 0; index < 405; index += 1) {
    writeFileSync(join(repo, 'bulk', `f${String(index).padStart(3, '0')}.txt`), 'x\n')
  }
  writeFileSync(join(repo, 'bulk', 'z-target.txt'), 'target\n')
  git(repo, 'add', 'bulk')
  git(repo, 'commit', '-qm', 'test: many files')
  const bulkHash = git(repo, 'rev-parse', 'HEAD').trim()
  const scopedCommit = await get(`action=commit&repo=w1&hash=${bulkHash}&path=bulk/z-target.txt`)
  check(
    'scoped commit list is filtered before the cap',
    scopedCommit.files.length === 1 && scopedCommit.files[0].path === 'bulk/z-target.txt',
    JSON.stringify(scopedCommit.files),
  )

  // Undoing the root commit on a detached HEAD used to delete .git/HEAD.
  git(solo, 'switch', '--detach', git(solo, 'rev-list', '--max-parents=0', 'HEAD').trim())
  const detachedUndo = await post({ repo: 'w2', action: 'history', op: 'undo' })
  check('detached root undo is rejected', detachedUndo.status === 409, JSON.stringify(detachedUndo.body))
  check('rejected undo leaves HEAD in place', existsSync(join(solo, '.git', 'HEAD')))
  git(solo, 'switch', '-q', 'main')
  const attachedUndo = await post({ repo: 'w2', action: 'history', op: 'undo' })
  check('attached root undo succeeds', attachedUndo.status === 200, JSON.stringify(attachedUndo.body))
  check(
    'attached root undo keeps a symbolic HEAD',
    git(solo, 'symbolic-ref', '--short', 'HEAD').trim() === 'main',
  )
  check('attached root undo keeps the files', existsSync(join(solo, 'root.txt')))

  const fetch = await post({ repo: 'w1', action: 'remote', op: 'fetch' })
  check('fetch starts', fetch.status === 200)
  const unknown = await post({ repo: 'w1', action: 'nope' })
  check('unknown action 404', unknown.status === 404)

  const badTree = await get('action=tree&repo=missing')
  check('unknown repo 404', badTree.error !== undefined)
} finally {
  rmSync(base, { recursive: true, force: true })
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nhost smoke test passed')



