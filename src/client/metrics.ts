/**
 * Shared geometry for the Git panel.
 *
 * These numbers are consumed twice: by the React layout (pane widths, compact
 * breakpoint, table columns) and by the stylesheet (row heights, header
 * heights, control sizes). Keeping them here means the two can never drift
 * apart, which is what happened before this module existed — the CSS said
 * `30px`, the graph said `ROW_HEIGHT = 30`, and the details pane budgeted a
 * magic `446px` for columns that were declared somewhere else.
 */

/** One commit-table row, also the height of one graph cell. */
export const ROW_HEIGHT = 30
/** One row in the lazily loaded file tree (dense, no second line). */
export const TREE_ROW_HEIGHT = 26
/** One working-tree change row (name over directory). */
export const CHANGE_ROW_HEIGHT = 38
/** Sticky table head of the commit list. */
export const TABLE_HEAD_HEIGHT = 26
/** Header of a column pane (file tree, commit details, modal). */
export const PANE_HEAD_HEIGHT = 34
/** Secondary header inside a pane (changes title bar, scope bar). */
export const SUB_HEAD_HEIGHT = 28
/** Bottom status line of the commit pane. */
export const STATUS_BAR_HEIGHT = 24
/** Toolbar minimum height; it may wrap to a second line on narrow panels. */
export const TOOLBAR_MIN_HEIGHT = 44

/** Default control height (buttons, inputs, dropdown triggers). */
export const CONTROL_HEIGHT = 26
/** Compact control height (icon buttons in dense headers, small buttons). */
export const CONTROL_SMALL = 22
/** Comfortable control height (toolbar dropdowns and search). */
export const CONTROL_LARGE = 28

/** Panel width below which the details pane stacks under the other two. */
export const COMPACT_WIDTH = 960
/** Minimum width kept for the commit pane next to both side panes. */
export const MIN_CENTER = 300
/** Minimum height kept for the file tree above the changes list. */
export const MIN_TREE = 140
/** Minimum height kept for the changes list under the file tree. */
export const MIN_CHANGES = 300

/** Commit-table column widths beside the graph column. */
export const COLUMNS = { author: 96, date: 82, hash: 64 } as const
/** Gap between commit-table columns. */
export const COLUMN_GAP = 10
/** Horizontal padding inside a commit row. */
export const ROW_PADDING_X = 12
/** Resize handle thickness. */
export const SPLIT_SIZE = 6

/**
 * Width the commit table needs for its non-subject columns, including gaps and
 * the row padding. The pane drops those columns once the graph plus this budget
 * no longer fits, which is the same rule the stylesheet used to hard-code.
 */
export const TABLE_CHROME_WIDTH =
  COLUMNS.author + COLUMNS.date + COLUMNS.hash + COLUMN_GAP * 3 + ROW_PADDING_X * 2
