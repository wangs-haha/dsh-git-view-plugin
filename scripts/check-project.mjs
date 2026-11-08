/** Lightweight repository guardrails. No install, network, Git writes or disk bundles. */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { bundleCommonJS } from './lib/bundle.mjs'
import { importIssues, localeIssues, markdownIssues } from './lib/project-checks.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const issues = []
const report = (file, messages) => {
  for (const message of messages) issues.push(`${relative(root, file)}: ${message}`)
}

async function walk(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (path === join(root, 'docs', 'archive')) continue
      files.push(...await walk(path))
    } else if (entry.isFile()) files.push(path)
  }
  return files
}

const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const required = [
  'AGENTS.md', '.editorconfig', '.gitattributes', '.gitignore',
  '.agents/skills/git-view-maintenance/SKILL.md', '.github/workflows/verify.yml',
  'docs/README.md', 'docs/architecture.md', 'docs/development.md', 'docs/maintenance.md',
  'docs/ui-design-system.md', 'docs/images/panel-light.png', 'docs/images/panel-dark.png',
  'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'LICENSE', 'README.md',
  'locale/en.json', 'locale/zh.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
]
for (const name of required) {
  const file = join(root, name)
  try {
    if (!(await stat(file)).isFile()) report(file, ['must be a regular file'])
  } catch {
    report(file, ['required file missing'])
  }
}
if (manifest.type !== 'module' || manifest.main !== './index.js') {
  issues.push('package.json: preserve ESM and the package-root Host entry')
}
for (const [key, value] of Object.entries({ '.': './index.js', './client': './client.js', './locale/*.json': './locale/*.json', './icon': './icon.svg' })) {
  if (manifest.exports?.[key] !== value) issues.push(`package.json: unexpected export ${key}`)
}
for (const name of ['index.js', 'client.js', 'cordis.patch.yml', 'locale/*.json', 'icon.svg', 'README.md']) {
  if (!manifest.files?.includes(name)) issues.push(`package.json: missing package file ${name}`)
}
if (!/^pnpm@\d+\.\d+\.\d+$/.test(manifest.packageManager ?? '')) {
  issues.push('package.json: pin an exact pnpm version in packageManager')
}
if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml' || manifest.dsh?.client?.platform !== 'web') {
  issues.push('package.json: preserve the DSH patch and web client declarations')
}
const patch = await readFile(join(root, 'cordis.patch.yml'), 'utf8')
if (!patch.includes(`name: '${manifest.name}'`)) issues.push('cordis.patch.yml: package name differs from manifest')

const documents = [join(root, 'README.md'), join(root, 'AGENTS.md'), ...await walk(join(root, 'docs')), ...await walk(join(root, '.agents'))]
for (const file of documents.filter((path) => path.endsWith('.md'))) {
  report(file, markdownIssues(file, await readFile(file, 'utf8'), root))
}
const sources = (await walk(join(root, 'src'))).filter((path) => /\.tsx?$/.test(path))
for (const file of sources) report(file, await importIssues(file, await readFile(file, 'utf8'), root))

const source = await bundleCommonJS(join(root, 'src/client/i18n.ts'))
const module = { exports: {} }
runInNewContext(source, { module, exports: module.exports }, { timeout: 1000 })
report(join(root, 'src/client/i18n.ts'), localeIssues(module.exports.zh, module.exports.en))
for (const language of ['zh', 'en']) {
  const file = join(root, 'locale', `${language}.json`)
  const dictionary = JSON.parse(await readFile(file, 'utf8'))
  for (const key of ['title', 'description']) {
    if (typeof dictionary.meta?.[key] !== 'string' || !dictionary.meta[key].trim()) report(file, [`meta.${key} is missing`])
  }
}
const skill = await readFile(join(root, '.agents/skills/git-view-maintenance/SKILL.md'), 'utf8')
if (!/^---\r?\nname: git-view-maintenance\r?\ndescription: .+\r?\n---/.test(skill)) {
  issues.push('SKILL.md: keep discoverable name/description frontmatter')
}

if (issues.length) {
  for (const issue of issues) console.error(`FAIL ${issue}`)
  process.exitCode = 1
} else {
  console.log(`project checks passed (${sources.length} source files; local links, metadata, locales and boundaries)`)
}
