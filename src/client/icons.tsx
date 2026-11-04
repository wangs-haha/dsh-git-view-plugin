/**
 * Inline SVG icons for the Git panel.
 *
 * Markup is byte-identical to the legacy client bundle: same paths, viewBoxes,
 * stroke widths and aria-hidden flags. Icons inherit the surrounding text
 * colour unless a component sets an explicit style.
 */
import * as React from 'react'

const h = React.createElement

/** Square edge requested by an icon; each icon has its own default. */
export interface IconProps {
  size?: number
}

/** Identity of a folder/file glyph, chosen from the file name. */
export interface FileIconProps {
  name: string
  isDir?: boolean
  open?: boolean
  size?: number
}

/** Colour and glyph family for one file name. */
export interface FileVisual {
  color: string
  kind: string
}

const FILE_VISUALS: Record<string, readonly [string, string] | undefined> = {
  ts: ['#3b82f6', 'code'],
  tsx: ['#3b82f6', 'code'],
  js: ['#eab308', 'code'],
  jsx: ['#eab308', 'code'],
  mjs: ['#eab308', 'code'],
  cjs: ['#eab308', 'code'],
  java: ['#f97316', 'code'],
  kt: ['#a855f7', 'code'],
  py: ['#60a5fa', 'code'],
  rb: ['#ef4444', 'code'],
  go: ['#06b6d4', 'code'],
  rs: ['#f97316', 'code'],
  c: ['#3b82f6', 'code'],
  h: ['#8b5cf6', 'code'],
  cpp: ['#3b82f6', 'code'],
  cs: ['#a855f7', 'code'],
  php: ['#8b5cf6', 'code'],
  swift: ['#f97316', 'code'],
  vue: ['#10b981', 'code'],
  svelte: ['#ef4444', 'code'],
  md: ['#7dd3fc', 'doc'],
  mdx: ['#7dd3fc', 'doc'],
  txt: ['#94a3b8', 'doc'],
  rst: ['#94a3b8', 'doc'],
  json: ['#eab308', 'data'],
  jsonc: ['#eab308', 'data'],
  yml: ['#a855f7', 'data'],
  yaml: ['#a855f7', 'data'],
  toml: ['#a855f7', 'data'],
  ini: ['#a855f7', 'data'],
  xml: ['#f59e0b', 'data'],
  sql: ['#f59e0b', 'data'],
  csv: ['#22c55e', 'data'],
  css: ['#ec4899', 'style'],
  scss: ['#ec4899', 'style'],
  sass: ['#ec4899', 'style'],
  less: ['#ec4899', 'style'],
  html: ['#ef4444', 'code'],
  htm: ['#ef4444', 'code'],
  sh: ['#22c55e', 'shell'],
  bash: ['#22c55e', 'shell'],
  zsh: ['#22c55e', 'shell'],
  ps1: ['#22c55e', 'shell'],
  bat: ['#22c55e', 'shell'],
  cmd: ['#22c55e', 'shell'],
  png: ['#a855f7', 'image'],
  jpg: ['#a855f7', 'image'],
  jpeg: ['#a855f7', 'image'],
  gif: ['#a855f7', 'image'],
  webp: ['#a855f7', 'image'],
  svg: ['#a855f7', 'image'],
  ico: ['#a855f7', 'image'],
  lock: ['#94a3b8', 'file'],
  gitignore: ['#94a3b8', 'file'],
  env: ['#eab308', 'file'],
}

/**
 * Colour and glyph family for a file name, keyed by extension.
 * @param name - file name.
 * @returns the visual identity.
 */
export function fileVisual(name: string): FileVisual {
  const lower = String(name || '').toLowerCase()
  const dot = lower.lastIndexOf('.')
  const ext = dot >= 0 ? lower.slice(dot + 1) : lower
  const found = FILE_VISUALS[ext]
  if (found) return { color: found[0], kind: found[1] }
  return { color: '#8b96a8', kind: 'file' }
}

/** Commit-graph mark used by empty states and the details placeholder. */
export function IconGraphMark({ size = 14 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M6 6v12M6 12c0 3 2.5 4 6 4h4', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
    h('circle', { cx: 6, cy: 4.5, r: 2.2, fill: 'currentColor' }),
    h('circle', { cx: 6, cy: 19.5, r: 2.2, fill: 'currentColor' }),
    h('circle', { cx: 17, cy: 12, r: 2.2, fill: 'currentColor' }),
  )
}

/** Two-arrow refresh glyph used by retry buttons. */
export function IconRefresh({ size = 14 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Magnifier for the finder input. */
export function IconSearch({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('circle', { cx: 10.5, cy: 10.5, r: 6.5, stroke: 'currentColor', strokeWidth: 1.8 }),
    h('path', { d: 'M15.5 15.5 21 21', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
  )
}

/** Overlapping sheets for copy actions. */
export function IconCopy({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2, stroke: 'currentColor', strokeWidth: 1.6 }),
    h('path', {
      d: 'M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2.5 2.5 0 0 0-2.5 2.5V13',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
    }),
  )
}

/** Cross for closing dialogs and clearing input. */
export function IconClose({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M6 6l12 12M18 6 6 18', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }),
  )
}

/** Right-pointing chevron for expandable tree rows. */
export function IconChevron({ size = 10 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M9 5l7 7-7 7', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** Outline folder used by tree rows. */
export function IconFolder({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9z',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
    }),
  )
}

/** Outline file used by tree rows. */
export function IconFile({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M6 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z',
      stroke: 'currentColor',
      strokeWidth: 1.5,
      strokeLinejoin: 'round',
    }),
    h('path', { d: 'M13 3.5V9h5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' }),
  )
}

/** House glyph for the repository-root row. */
export function IconHome({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M4 10.5 12 4l8 6.5M6.5 9.5V20h11V9.5',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Side-by-side panes for the compare action. */
export function IconCompare({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('rect', { x: 2.8, y: 4.5, width: 6.6, height: 15, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.5 }),
    h('rect', { x: 14.6, y: 4.5, width: 6.6, height: 15, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.5 }),
    h('path', { d: 'M10.6 9 8.8 12l1.8 3M13.4 9l1.8 3-1.8 3', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** Branch graph used by branch pickers and ref rows. */
export function IconBranch({ size = 12 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('circle', { cx: 6, cy: 5, r: 2.2, stroke: 'currentColor', strokeWidth: 1.7 }),
    h('circle', { cx: 6, cy: 19, r: 2.2, stroke: 'currentColor', strokeWidth: 1.7 }),
    h('circle', { cx: 18, cy: 8, r: 2.2, stroke: 'currentColor', strokeWidth: 1.7 }),
    h('path', { d: 'M6 7.2v9.6M6 12c0 3.4 2.6 4.4 6 4.4h3.6M6 9c0 3.3 3.6 4.4 7.2 4.4H18', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
  )
}

/** Tag glyph for tag refs. */
export function IconTag({ size = 12 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M3.8 11.4V5.2c0-.8.6-1.4 1.4-1.4h6.2c.4 0 .8.2 1 .4l7.4 7.4c.5.5.5 1.4 0 1.9l-5.9 5.9c-.5.5-1.4.5-1.9 0L4.2 12.4a1.4 1.4 0 0 1-.4-1z',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
    }),
    h('circle', { cx: 8, cy: 8, r: 1.3, fill: 'currentColor' }),
  )
}

/** Sparkles marking the AI message action. */
export function IconSparkles({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5zM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1zM5 14.5l.6 1.4 1.4.6-1.4.6L5 18.5l-.6-1.4L3 16.5l1.4-.6.6-1.4z',
      fill: 'currentColor',
    }),
  )
}

/** Check mark for the selected dropdown option. */
export function IconCheck({ size = 12 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M5 12.5 10 17l9-10', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** Down chevron for dropdown triggers. */
export function IconChevronDown({ size = 11 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M6 9l6 6 6-6', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** Horizontal ellipsis for row action menus. */
export function IconMore({ size = 15 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('circle', { cx: 5, cy: 12, r: 1.7, fill: 'currentColor' }),
    h('circle', { cx: 12, cy: 12, r: 1.7, fill: 'currentColor' }),
    h('circle', { cx: 19, cy: 12, r: 1.7, fill: 'currentColor' }),
  )
}

/** Warning triangle for error states. */
export function IconAlert({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M12 4.5 21 19H3L12 4.5z',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinejoin: 'round',
    }),
    h('path', { d: 'M12 10v4.2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
    h('circle', { cx: 12, cy: 17, r: 1, fill: 'currentColor' }),
  )
}

/** Back-curving arrow for undo actions. */
export function IconUndo({ size = 13 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M9 7 4.5 11.5 9 16',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
    h('path', {
      d: 'M5 11.5h8.2a5.3 5.3 0 0 1 0 10.6H10',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Up arrow for the push button. */
export function IconArrowUp({ size = 14 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M12 20V5m0 0-6 6m6-6 6 6',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Down arrow for the pull button. */
export function IconArrowDown({ size = 14 }: IconProps): React.ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M12 4v15m0 0 6-6m-6 6-6-6',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Sidebar icon: a small branch graph in the current text colour. */
export function GitViewIcon({ size = 18 }: IconProps): React.ReactElement {
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': true,
      focusable: false,
    },
    h('path', {
      d: 'M6.5 7.5v9M6.5 12c0 3.2 2.6 4 6 4h3.5M6.5 9c0 3 3.4 4.2 6.8 4.2',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
    }),
    h('circle', { cx: 6.5, cy: 5, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
    h('circle', { cx: 6.5, cy: 19, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
    h('circle', { cx: 17.5, cy: 7.5, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
    h('circle', { cx: 17.5, cy: 16, r: 2.1, stroke: 'currentColor', strokeWidth: 1.6 }),
  )
}

/** Coloured folder/file glyph used by the tree, details, and change rows. */
export function FileIcon({ name, isDir = false, open = false, size = 13 }: FileIconProps): React.ReactElement {
  if (isDir) {
    const color = open ? '#f0b429' : '#e0a33e'
    return h(
      'svg',
      { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, style: { color } },
      h('path', {
        d: open
          ? 'M3.5 9V6.8A1.3 1.3 0 0 1 4.8 5.5h4.1l1.7 1.8H18a1.3 1.3 0 0 1 1.3 1.3V10H7.1L4.6 18H3.5V9z'
          : 'M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9z',
        fill: 'currentColor',
        fillOpacity: 0.18,
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinejoin: 'round',
      }),
      open
        ? h('path', {
            d: 'M4.6 18l2.5-8h13.4l-2.5 8H4.6z',
            fill: 'currentColor',
            fillOpacity: 0.1,
            stroke: 'currentColor',
            strokeWidth: 1.3,
            strokeLinejoin: 'round',
          })
        : null,
    )
  }

  const visual = fileVisual(name)
  const glyphs: React.ReactNode[] = []
  if (visual.kind === 'code') {
    glyphs.push(
      h('path', {
        key: 'code',
        d: 'M10.2 13.2 8.6 15l1.6 1.8M13.8 13.2 15.4 15l-1.6 1.8',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    )
  } else if (visual.kind === 'doc') {
    glyphs.push(
      h('path', {
        key: 'doc',
        d: 'M9.2 13.2h6M9.2 16h4.2',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
      }),
    )
  } else if (visual.kind === 'data') {
    glyphs.push(
      h('path', {
        key: 'data',
        d: 'M10.2 13c-.8 0-1 .5-1 1s.2 1-1 1c1.2 0 1 .5 1 1s.2 1 1 1M14.2 13c.8 0 1 .5 1 1s-.2 1 1 1c-1.2 0-1 .5-1 1s-.2 1-1 1',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    )
  } else if (visual.kind === 'image') {
    glyphs.push(
      h('circle', { key: 'img-sun', cx: 10, cy: 13.2, r: 1, fill: 'currentColor' }),
      h('path', {
        key: 'img-hill',
        d: 'M8.8 17.2l2-2 1.4 1.4 1.5-1.8 1.6 2.4',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    )
  } else if (visual.kind === 'style') {
    glyphs.push(
      h('path', {
        key: 'style',
        d: 'M9.6 13h5M9.6 15.2h3.4M9.6 17.4h4.6',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinecap: 'round',
      }),
    )
  } else if (visual.kind === 'shell') {
    glyphs.push(
      h('path', {
        key: 'shell',
        d: 'M9.4 13.4 11 15l-1.6 1.6M12.6 16.8h2.4',
        stroke: 'currentColor',
        strokeWidth: 1.1,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }),
    )
  }

  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true, style: { color: visual.color } },
    h('path', {
      d: 'M6 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z',
      fill: 'currentColor',
      fillOpacity: 0.13,
      stroke: 'currentColor',
      strokeWidth: 1.3,
      strokeLinejoin: 'round',
    }),
    h('path', {
      d: 'M13 3.5V9h5',
      stroke: 'currentColor',
      strokeWidth: 1.3,
      strokeLinejoin: 'round',
    }),
    glyphs,
  )
}

