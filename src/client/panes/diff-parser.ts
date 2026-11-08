/**
 * Unified-diff parser for the side-by-side comparison dialog.
 *
 * Kept free of React so it can be exercised directly by the smoke tests. The
 * parser is stateful by design: `---`/`+++` are file headers *before* a hunk and
 * ordinary deletion/addition lines *inside* one, which is exactly the case a
 * line-prefix-only parser gets wrong.
 */

/** Maximum number of parsed rows before the dialog truncates. */
export const MAX_DIFF_ROWS = 3000

/** One hunk header line. */
export interface DiffRowHunk {
  kind: 'hunk'
  text: string
}

/** One context, addition, deletion, or replacement row. */
export interface DiffRowSide {
  kind: 'ctx' | 'add' | 'del' | 'change'
  oldNo: number | null
  oldText: string | null
  newNo: number | null
  newText: string | null
}

/** One parsed unified-diff row. */
export type DiffRow = DiffRowHunk | DiffRowSide

/** Parsed diff plus the truncation flag. */
export interface ParsedDiff {
  rows: DiffRow[]
  truncated: boolean
}

/**
 * Parse a unified diff into side-by-side rows.
 * @param text - unified diff output.
 * @returns aligned rows, truncated at {@link MAX_DIFF_ROWS}.
 */
export function parseDiffRows(text: string): ParsedDiff {
  const lines = String(text || '').split(/\r?\n/)
  const rows: DiffRow[] = []
  let oldNo = 0
  let newNo = 0
  let inHunk = false
  let truncated = false
  let index = 0

  /** Append one row unless the budget is exhausted. */
  const add = (row: DiffRow): boolean => {
    if (rows.length >= MAX_DIFF_ROWS) {
      truncated = true
      return false
    }
    rows.push(row)
    return true
  }

  /** Skip a `\ No newline at end of file` marker. */
  const skipMarkers = (): void => {
    while (index < lines.length && lines[index].startsWith('\\')) index += 1
  }

  while (index < lines.length) {
    const line = lines[index]
    if (line.startsWith('@@')) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line)
      if (match) {
        oldNo = Number(match[1])
        newNo = Number(match[2])
      }
      inHunk = true
      if (!add({ kind: 'hunk', text: line })) break
      index += 1
      continue
    }
    if (line.startsWith('diff --git ')) {
      inHunk = false
      index += 1
      continue
    }
    if (!inHunk) {
      index += 1
      continue
    }
    if (line.startsWith('\\')) {
      index += 1
      continue
    }
    if (line.startsWith('-')) {
      const deletions: string[] = []
      while (index < lines.length && lines[index].startsWith('-')) {
        deletions.push(lines[index].slice(1))
        index += 1
      }
      skipMarkers()
      const additions: string[] = []
      while (index < lines.length && lines[index].startsWith('+')) {
        additions.push(lines[index].slice(1))
        index += 1
      }
      skipMarkers()
      const count = Math.max(deletions.length, additions.length)
      for (let k = 0; k < count; k += 1) {
        const oldText = k < deletions.length ? deletions[k] : null
        const newText = k < additions.length ? additions[k] : null
        const ok = add({
          kind: oldText !== null && newText !== null ? 'change' : oldText !== null ? 'del' : 'add',
          oldNo: oldText !== null ? oldNo++ : null,
          oldText,
          newNo: newText !== null ? newNo++ : null,
          newText,
        })
        if (!ok) return { rows, truncated }
      }
      continue
    }
    if (line.startsWith('+')) {
      while (index < lines.length && lines[index].startsWith('+')) {
        if (
          !add({
            kind: 'add',
            oldNo: null,
            oldText: null,
            newNo: newNo++,
            newText: lines[index].slice(1),
          })
        ) {
          return { rows, truncated }
        }
        index += 1
      }
      skipMarkers()
      continue
    }
    if (line.startsWith(' ')) {
      if (
        !add({
          kind: 'ctx',
          oldNo: oldNo++,
          oldText: line.slice(1),
          newNo: newNo++,
          newText: line.slice(1),
        })
      ) {
        break
      }
      index += 1
      continue
    }
    index += 1
  }

  return { rows, truncated }
}
