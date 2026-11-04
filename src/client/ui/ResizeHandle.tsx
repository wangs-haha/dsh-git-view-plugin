/**
 * Drag handle between two panes.
 *
 * It is a focusable `separator`: dragging (with pointer capture), the arrow
 * keys, and a double-click reset all go through the same clamped value, so a
 * keyboard user gets the same result as a mouse user.
 */
import * as React from 'react'
import type { Translate } from '../types.js'

const h = React.createElement

export interface ResizeHandleProps {
  /** Translator, kept for call-site symmetry with the other components. */
  t?: Translate
  /** Accessible name of the separator. */
  label: string
  /** Current size in pixels. */
  value: number
  /** Lower clamp. */
  min: number
  /** Upper clamp. */
  max: number
  /** Whether dragging towards larger coordinates shrinks the pane. */
  invert?: boolean
  /** `x` resizes widths, `y` resizes heights. */
  axis?: 'x' | 'y'
  /** Called continuously while dragging or pressing an arrow key. */
  onChange: (value: number) => void
  /** Called once the gesture ends, to persist the size. */
  onCommit?: (value: number) => void
  /** Called on double-click. */
  onReset?: () => void
}

interface DragStart {
  position: number
  value: number
}

/**
 * @param props - value, bounds, axis, change/commit callbacks.
 * @returns the separator.
 */
export function ResizeHandle({
  label,
  value,
  min,
  max,
  invert,
  axis = 'x',
  onChange,
  onCommit,
  onReset,
}: ResizeHandleProps): React.ReactElement {
  const [dragging, setDragging] = React.useState(false)
  const startRef = React.useRef<DragStart | null>(null)
  const latestRef = React.useRef(value)
  latestRef.current = value
  const rows = axis === 'y'

  const clampValue = (next: number): number => Math.min(max, Math.max(min, Math.round(next)))
  const finish = (): void => {
    if (startRef.current === null) return
    startRef.current = null
    setDragging(false)
    if (onCommit) onCommit(latestRef.current)
  }
  const position = (event: React.PointerEvent<HTMLDivElement>): number =>
    rows ? event.clientY : event.clientX

  return h(
    'div',
    {
      className: `gv-split${rows ? ' gv-split-row' : ''}${dragging ? ' gv-split-active' : ''}`,
      role: 'separator',
      'aria-orientation': rows ? 'horizontal' : 'vertical',
      'aria-label': label,
      'aria-valuenow': Math.round(value),
      'aria-valuemin': min,
      'aria-valuemax': max,
      tabIndex: 0,
      title: label,
      onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture?.(event.pointerId)
        startRef.current = { position: position(event), value }
        setDragging(true)
      },
      onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
        if (!startRef.current) return
        const delta = position(event) - startRef.current.position
        const next = clampValue(startRef.current.value + (invert ? -delta : delta))
        latestRef.current = next
        onChange(next)
      },
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onDoubleClick: () => {
        if (onReset) onReset()
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        const back = rows ? 'ArrowUp' : 'ArrowLeft'
        const forward = rows ? 'ArrowDown' : 'ArrowRight'
        if (event.key !== back && event.key !== forward) return
        event.preventDefault()
        const step = event.key === back ? -16 : 16
        const next = clampValue(value + (invert ? -step : step))
        latestRef.current = next
        onChange(next)
        if (onCommit) onCommit(next)
      },
    },
    h(
      'span',
      { className: 'gv-split-grip', 'aria-hidden': true },
      h('i', { key: 'a' }),
      h('i', { key: 'b' }),
      h('i', { key: 'c' }),
    ),
  )
}
