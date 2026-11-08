/**
 * Directory tree for the working-tree changes list.
 *
 * The status route returns a flat path list; the tree view groups it by folder.
 * Building is deterministic (`<` on names, never locale collation) so the same
 * repository renders the same order on every machine and in the smoke tests.
 */
import type { StatusEntry } from '../types.js'

export interface ChangeDir {
  name: string
  path: string
  dirs: ChangeDir[]
  files: StatusEntry[]
  /** Descendant file count, including files in child directories. */
  total: number
  /** Child directory lookup, so wide directories build in linear time. */
  index: Map<string, ChangeDir>
}

function makeDir(name: string, path: string): ChangeDir {
  return { name, path, dirs: [], files: [], total: 0, index: new Map() }
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
}

function finalize(node: ChangeDir): void {
  node.dirs.sort(byName)
  node.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  for (const dir of node.dirs) finalize(dir)
  node.total =
    node.files.length + node.dirs.reduce((count, dir) => count + dir.total, 0)
}

/**
 * Group flat status entries into nested folders.
 * @param entries - status entries in their original order.
 * @returns the synthetic root; its own `files` are root-level files.
 */
export function buildChangeTree(entries: StatusEntry[]): ChangeDir {
  const root = makeDir('', '')
  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean)
    let node = root
    let path = ''
    for (let index = 0; index < parts.length - 1; index += 1) {
      path = path ? `${path}/${parts[index]}` : parts[index]
      let next = node.index.get(parts[index])
      if (!next) {
        next = makeDir(parts[index], path)
        node.dirs.push(next)
        node.index.set(parts[index], next)
      }
      node = next
    }
    node.files.push(entry)
  }
  finalize(root)
  return root
}

/**
 * Every file under one directory, including nested directories.
 * @param dir - directory node.
 * @returns repository-relative paths.
 */
export function collectPaths(dir: ChangeDir): string[] {
  const paths: string[] = []
  const visit = (node: ChangeDir): void => {
    for (const file of node.files) paths.push(file.path)
    for (const child of node.dirs) visit(child)
  }
  visit(dir)
  return paths
}

/**
 * How many files under one directory are selected.
 * @param dir - directory node.
 * @param selected - selected path set.
 * @returns selected file count.
 */
export function collectSelected(dir: ChangeDir, selected: Set<string>): number {
  let count = 0
  const visit = (node: ChangeDir): void => {
    for (const file of node.files) if (selected.has(file.path)) count += 1
    for (const child of node.dirs) visit(child)
  }
  visit(dir)
  return count
}

/**
 * Selected file count for every directory, computed in one post-order pass.
 * @param root - synthetic root.
 * @param selected - selected path set.
 * @returns counts keyed by directory node.
 */
export function countSelectedByDir(root: ChangeDir, selected: Set<string>): Map<ChangeDir, number> {
  const counts = new Map<ChangeDir, number>()
  const visit = (node: ChangeDir): number => {
    let count = 0
    for (const file of node.files) if (selected.has(file.path)) count += 1
    for (const child of node.dirs) count += visit(child)
    counts.set(node, count)
    return count
  }
  visit(root)
  return counts
}
