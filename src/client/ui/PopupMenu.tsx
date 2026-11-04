/**
 * Small floating menu anchored to a point (commit rows, etc.).
 *
 * It renders through a portal with fixed positioning, closes on Escape or an
 * outside click, and keeps the viewport-clamped placement of the legacy panel.
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import type { MenuItem, Translate } from '../types.js'

const h = React.createElement

/** Anchor point of a popup menu, in viewport coordinates. */
export interface PopupMenuPosition {
  x: number
  y: number
}

/** Menu model: where it opens and what it offers. */
export interface PopupMenuModel extends PopupMenuPosition {
  items: MenuItem[]
}

export interface PopupMenuProps {
  t: Translate
  menu: PopupMenuModel
  onClose: () => void
}

/**
 * @param props - menu descriptor and close callback.
 * @returns the portal.
 */
export function PopupMenu({ t, menu, onClose }: PopupMenuProps): React.ReactElement {
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [onClose])

  const width = 232
  const height = Math.min(menu.items.length * 30 + 16, 340)
  const left = Math.max(8, Math.min(menu.x, window.innerWidth - width - 8))
  const top = Math.max(8, Math.min(menu.y, window.innerHeight - height - 8))

  return ReactDOM.createPortal(
    h(
      'div',
      {
        className: 'gv-menu',
        role: 'menu',
        'aria-label': t('commitActions'),
        ref,
        style: { left: `${left}px`, top: `${top}px`, minWidth: `${width}px` },
        onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
      },
      menu.items.map((item, index) =>
        item.separator
          ? h('div', { key: `sep-${index}`, className: 'gv-menu-sep', role: 'separator' })
          : h(
              'button',
              {
                key: item.id || `item-${index}`,
                type: 'button',
                role: 'menuitem',
                className: `gv-menu-item${item.danger ? ' gv-menu-danger' : ''}`,
                disabled: item.disabled,
                title: item.hint || item.label,
                onClick: () => {
                  onClose()
                  item.onSelect?.()
                },
              },
              h('span', { className: 'gv-menu-label' }, item.label),
              item.hint ? h('span', { className: 'gv-menu-hint' }, item.hint) : null,
            ),
      ),
    ),
    document.body,
  )
}
