/**
 * Diff parser smoke test: bundles `src/client/panes/diff-parser.ts` in memory
 * and asserts the cases the dialog must get right.
 *
 * Run with `node scripts/smoke-diff.mjs`.
 */
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const entry = fileURLToPath(new URL('../src/client/panes/diff-parser.ts', import.meta.url))
const result = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  target: ['node22'],
  logLevel: 'warning',
})
const source = result.outputFiles[0].text
const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const { parseDiffRows, MAX_DIFF_ROWS } = module

const failures = []
const check = (name, condition, detail = '') => {
  if (condition) console.log(`ok   ${name}`)
  else {
    console.error(`FAIL ${name} ${detail}`)
    failures.push(name)
  }
}

{
  const diff = [
    'diff --git a/x b/x',
    '--- a/x',
    '+++ b/x',
    '@@ -1,3 +1,3 @@',
    '---old',
    '+++new',
    ' keep',
    '-tail',
    '+head',
  ].join('\n')
  const parsed = parseDiffRows(diff)
  const sides = parsed.rows.filter((row) => row.kind !== 'hunk')
  check('prefix lines kept', sides.length === 3, JSON.stringify(parsed.rows))
  check(
    'first pair keeps its text',
    sides[0]?.oldText === '--old' && sides[0]?.newText === '++new',
    JSON.stringify(sides[0]),
  )
  check('numbers stay in step', sides[0]?.oldNo === 1 && sides[0]?.newNo === 1, JSON.stringify(sides[0]))
  check(
    'context after the pair',
    sides[1]?.oldNo === 2 && sides[1]?.newNo === 2 && sides[1]?.oldText === 'keep',
    JSON.stringify(sides[1]),
  )
  check('trailing pair numbered last', sides[2]?.oldNo === 3 && sides[2]?.newNo === 3, JSON.stringify(sides[2]))
  check('not truncated', parsed.truncated === false)
}

{
  const parsed = parseDiffRows(['@@ -1,2 +1,2 @@', '-old', '\\ No newline at end of file', '+new'].join('\n'))
  const sides = parsed.rows.filter((row) => row.kind !== 'hunk')
  check(
    'no-newline marker keeps pairing',
    sides.length === 1 && sides[0].oldText === 'old' && sides[0].newText === 'new',
    JSON.stringify(parsed.rows),
  )
}

{
  const lines = ['@@ -0,0 +1,3500 @@']
  for (let index = 0; index < 3500; index += 1) lines.push(`+line${index}`)
  const parsed = parseDiffRows(lines.join('\n'))
  check('row budget is enforced inside one hunk', parsed.rows.length === MAX_DIFF_ROWS, String(parsed.rows.length))
  check('truncation reported', parsed.truncated === true)
  const last = parsed.rows[parsed.rows.length - 1]
  check('last kept row is numbered', last?.newNo === MAX_DIFF_ROWS - 1, JSON.stringify(last))
}

{
  const parsed = parseDiffRows(
    ['diff --git a/x b/x', '--- a/x', '+++ b/x', '@@ -1 +1 @@', '-a', '+b', 'diff --git a/y b/y', '@@ -1 +1 @@', '-c', '+d'].join(
      '\n',
    ),
  )
  const sides = parsed.rows.filter((row) => row.kind !== 'hunk')
  check(
    'second file is parsed independently',
    sides.length === 2 && sides[0].oldText === 'a' && sides[1].oldText === 'c',
    JSON.stringify(sides),
  )
}

if (failures.length) {
  console.error(`\n${failures.length} diff check(s) failed`)
  process.exit(1)
}
console.log('\ndiff parser smoke test passed')
