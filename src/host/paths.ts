/**
 * Repository-relative path handling.
 *
 * A Git path is an opaque identifier: leading/trailing spaces and backslashes
 * can be part of a real file name. Validating a path must never rewrite it —
 * otherwise a destructive action could silently target a different file.
 *
 * Scopes (history filters) are paths too, so they use the same rules; only the
 * empty string is additionally allowed for the repository root.
 */

import { GitError } from './errors.js'

/** Longest path this plugin accepts. */
const MAX_PATH_LENGTH = 4096

/** Options for {@link repoPath}. */
export interface RepoPathOptions {
  /** Accept `''` as the repository root (history/tree scopes). */
  allowEmpty?: boolean
  /** Field name used in the error message. */
  label?: string
}

/**
 * Validate one repository-relative path without changing it.
 * @param raw - value from the request (a string is required).
 * @param options - whether the empty root path is allowed.
 * @returns the same path, unchanged.
 */
export function repoPath(raw: unknown, options: RepoPathOptions = {}): string {
  const label = options.label ?? 'file path'
  if (typeof raw !== 'string') throw new GitError(`invalid ${label}`, 400)
  if (raw === '') {
    if (options.allowEmpty) return ''
    throw new GitError(`invalid ${label}`, 400)
  }
  const invalid =
    raw.length > MAX_PATH_LENGTH ||
    raw.includes('\0') ||
    raw.startsWith('/') ||
    raw.startsWith('\\') ||
    /^[a-zA-Z]:[\\/]/.test(raw) ||
    raw.split('/').some((part) => part === '' || part === '.' || part === '..')
  if (invalid) throw new GitError(`invalid ${label}`, 400)
  return raw
}

/**
 * Validate and deduplicate a list of exact file paths.
 * @param raw - request value; anything but an array is treated as empty.
 * @param max - upper bound on the number of paths.
 * @returns unique paths in request order, unchanged.
 */
export function repoPaths(raw: unknown, max = 200): string[] {
  if (!Array.isArray(raw)) return []
  const unique: string[] = []
  const seen = new Set<string>()
  for (const value of raw) {
    const path = repoPath(value)
    if (seen.has(path)) continue
    seen.add(path)
    unique.push(path)
  }
  if (unique.length > max) throw new GitError('too many files in one operation', 400)
  return unique
}
