/** Repository checks shared by the CLI and regression tests; reuse esbuild's TS parser. */
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

export function localeIssues(zh, en) {
  const issues = []
  for (const key of new Set([...Object.keys(zh), ...Object.keys(en)])) {
    for (const [language, dictionary] of [['zh', zh], ['en', en]]) {
      if (typeof dictionary[key] !== 'string' || !dictionary[key].trim()) {
        issues.push(`${language}.${key}: missing or empty translation`)
      }
    }
  }
  return issues
}

export function markdownIssues(file, source, root) {
  const issues = []
  const text = source.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '')
  const links = /!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))\)/g
  for (const match of text.matchAll(links)) {
    const target = match[1] ?? match[2]
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue
    let path
    try {
      path = decodeURIComponent(target.split(/[?#]/, 1)[0])
    } catch {
      issues.push(`invalid link encoding: ${target}`)
      continue
    }
    if (!path) continue
    const absolute = resolve(dirname(file), path)
    const local = relative(root, absolute)
    if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
      issues.push(`link escapes repository: ${target}`)
    } else if (!existsSync(absolute)) {
      issues.push(`missing link target: ${target}`)
    }
  }
  return issues
}

const nodeModules = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]))

export async function importIssues(file, source, root) {
  const issues = []
  const host = resolve(root, 'src/host')
  const client = resolve(root, 'src/client')
  const inside = (directory, target) => target === directory || target.startsWith(`${directory}${sep}`)
  const isClient = inside(client, file)
  // Parse instead of scanning text: type-only imports, comments and strings do
  // not create browser dependencies. Preserve unused value imports to avoid
  // accidentally hiding a layering violation during TS import elision.
  const result = await build({
    stdin: { contents: source, sourcefile: file, loader: file.endsWith('.tsx') ? 'tsx' : 'ts' },
    write: false,
    bundle: false,
    format: 'esm',
    platform: 'neutral',
    metafile: true,
    tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } },
    logLevel: 'silent',
  })
  const imports = Object.values(result.metafile.outputs).flatMap((output) => output.imports)
  for (const { path: specifier } of imports) {
    if (isClient && (specifier.startsWith('node:') || nodeModules.has(specifier))) {
      issues.push(`browser imports Node module: ${specifier}`)
    }
    if (!specifier.startsWith('.')) continue
    const target = resolve(dirname(file), specifier)
    if ((isClient && inside(host, target)) || (inside(host, file) && inside(client, target))) {
      issues.push(`crosses host/client boundary: ${specifier}`)
    }
    if (!specifier.endsWith('.js') && !specifier.endsWith('.json')) {
      issues.push(`relative ESM import needs .js or .json suffix: ${specifier}`)
    }
  }
  return issues
}
