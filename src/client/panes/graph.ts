/**
 * Commit-graph lane layout.
 *
 * `computeRows` is a pure function over the newest-first commit list: it assigns
 * every commit a lane, the edges it contributes, and the per-row lane colours.
 * Keeping it out of the component makes the layout testable and lets the panel
 * compute the graph width once per log payload.
 */
import type { CommitRow } from '../types.js'

/** Height of one commit row, shared by the table and the SVG cell. */
export const ROW_HEIGHT = 30
/** Horizontal distance between two lanes. */
export const LANE_WIDTH = 16
/** Left and right padding inside the graph column. */
export const GRAPH_PAD = 10
/** Colour used for a lane that never received a palette entry. */
export const DEFAULT_COLOR = '#8b96a8'

/** Lane colours tuned for both light and dark surfaces. */
export const PALETTE: readonly string[] = [
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#14b8a6',
]

/** One edge from this row's node to a parent lane. */
export interface GraphEdge {
  /** Lane index the edge ends in. */
  to: number
  /** Whether the parent sits in the same lane (a straight vertical line). */
  straight: boolean
  /** Stroke colour of the edge. */
  color: string
}

/** Layout row produced by {@link computeRows}, one per commit. */
export interface GraphRow {
  /** Lane the commit node is drawn in. */
  lane: number
  /** Whether this commit starts its lane (no incoming edge from above). */
  isNew: boolean
  /** Node colour. */
  color: string
  /** Lanes that continue through this row without ending in it. */
  top: number[]
  /** Edges from this node down to its parents. */
  edges: GraphEdge[]
  /** Snapshot of the lane colours for the `top` lines. */
  colors: Array<string | null>
  /** Number of lanes this row needs. */
  width: number
}

/**
 * Assign every commit a lane and the edges it contributes to the graph.
 * Commits are expected newest-first in `git log --topo-order` order.
 * @param commits - ordered commits.
 * @returns one layout row per commit.
 */
export function computeRows(commits: ReadonlyArray<CommitRow>): GraphRow[] {
  const known = new Set(commits.map((commit) => commit.hash))
  const lanes: Array<string | null> = []
  const colors: Array<string | null> = []
  const rows: GraphRow[] = []
  let cursor = 0

  const takeColor = (): string => PALETTE[cursor++ % PALETTE.length] ?? DEFAULT_COLOR
  const ensureColor = (lane: number): string => {
    const existing = colors[lane]
    if (existing) return existing
    const color = takeColor()
    colors[lane] = color
    return color
  }
  const firstFree = (exclude: number): number => {
    for (let i = 0; i < lanes.length; i += 1) {
      if (i !== exclude && (lanes[i] === null || lanes[i] === undefined)) return i
    }
    lanes.push(null)
    colors.push(null)
    return lanes.length - 1
  }

  for (const commit of commits) {
    let lane = lanes.indexOf(commit.hash)
    const isNew = lane === -1
    if (isNew) {
      lane = firstFree(-1)
      lanes[lane] = commit.hash
    }
    const nodeColor = ensureColor(lane)

    const top: number[] = []
    for (let i = 0; i < lanes.length; i += 1) {
      const occupant = lanes[i]
      if (i !== lane && occupant !== null && occupant !== undefined) top.push(i)
    }

    const parents = Array.isArray(commit.parents)
      ? commit.parents.filter((parent) => known.has(parent))
      : []
    const edges: GraphEdge[] = []
    const claimed = new Set<number>()

    parents.forEach((parent, index) => {
      let target = -1
      for (let i = 0; i < lanes.length; i += 1) {
        if (i !== lane && lanes[i] === parent && !claimed.has(i)) {
          target = i
          break
        }
      }
      let straight = false
      if (target === -1) {
        if (index === 0 && lanes[lane] === commit.hash) {
          target = lane
          straight = true
        } else {
          target = firstFree(lane)
        }
        lanes[target] = parent
      }
      claimed.add(target)
      edges.push({ to: target, straight, color: ensureColor(target) })
    })

    if (lanes[lane] === commit.hash) {
      lanes[lane] = null
      colors[lane] = null
    }
    while (lanes.length > 0 && (lanes[lanes.length - 1] === null || lanes[lanes.length - 1] === undefined)) {
      lanes.pop()
      colors.pop()
    }

    let width = lane + 1
    for (const index of top) width = Math.max(width, index + 1)
    for (const edge of edges) width = Math.max(width, edge.to + 1)

    rows.push({
      lane,
      isNew,
      color: nodeColor,
      top,
      edges,
      colors: colors.slice(),
      width,
    })
  }

  return rows
}
