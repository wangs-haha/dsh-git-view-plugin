/**
 * Accessible custom select with a themed popover list.
 *
 * Rows can be grouped and carry their own `…` action menu, which is rendered
 * through a portal as a fixed-position flyout next to the row so the options
 * read horizontally and are never clipped by the list's scroll box.
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { FileIcon, IconBranch, IconCheck, IconChevronDown, IconMore, IconTag } from '../icons.js'
import type { MenuItem, Translate } from '../types.js'

const h = React.createElement

/** One row of the popover list. */
export interface DropdownOption {
  value: string
  label: string
  description?: string
  /** `repo`, `tag`, `remote`, `head`, or anything else for a branch glyph. */
  icon?: string
  /** Rows sharing a group render under one heading. */
  group?: string
  /** Marks the current HEAD ref, which gets a trailing badge. */
  head?: boolean
  /** Per-row actions behind the `…` button. */
  actions?: MenuItem[]
}

export interface DropdownProps {
  t: Translate
  /** Accessible name of the trigger and list. */
  label: string
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  disabled?: boolean
  /** Icon of the trigger itself. */
  icon?: 'repo' | 'branch'
  /** Trigger width, e.g. `190px`. */
  width?: string
  /** Shown when nothing is selected and when the list is empty. */
  placeholder?: string
}

interface FlyoutPosition {
  left: number
  top: number
}

/**
 * @param props - value, options, and change callback.
 * @returns the dropdown.
 */
export function Dropdown({
  t,
  label,
  value,
  options,
  onChange,
  disabled,
  icon,
  width = '190px',
  placeholder,
}: DropdownProps): React.ReactElement {
  const id = React.useId()
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const [rowMenu, setRowMenu] = React.useState(-1)
  const [rowMenuPos, setRowMenuPos] = React.useState<FlyoutPosition | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const menuRef = React.useRef<HTMLDivElement | null>(null)
  const rowMenuRef = React.useRef<HTMLDivElement | null>(null)
  const rowMenuAnchor = React.useRef<Element | null>(null)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const current = selectedIndex >= 0 ? options[selectedIndex] : null

  React.useEffect(() => {
    if (!open) setRowMenu(-1)
  }, [open])

  React.useEffect(() => {
    if (rowMenu < 0 || !rowMenuRef.current) return
    const node = rowMenuRef.current.querySelector('button')
    if (node && typeof node.focus === 'function') node.focus()
  }, [rowMenu])

  React.useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: MouseEvent): void => {
      if (rowMenuRef.current && rowMenuRef.current.contains(event.target as Node)) return
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setRowMenu(-1)
      }
    }
    document.addEventListener('mousedown', onPointerDown, true)
    return () => document.removeEventListener('mousedown', onPointerDown, true)
  }, [open])

  /**
   * Open the row's action menu as a side flyout next to the row, so the
   * options read horizontally and are not clipped by the list's scroll box.
   * @param index - option index.
   * @param anchor - the row or its "…" button, when the DOM has one.
   */
  const openRowMenu = (index: number, anchor: Element | null): void => {
    if (rowMenu === index) {
      setRowMenu(-1)
      return
    }
    let rect: DOMRect | null = null
    if (anchor) {
      try {
        rect = anchor.getBoundingClientRect()
      } catch {
        rect = null
      }
    }
    rowMenuAnchor.current = anchor
    // Keyboard opening has no pointer target of its own; keep a visible
    // fallback position instead of suppressing the portal.
    setRowMenuPos(
      rect
        ? {
            left: Math.max(8, Math.min(rect.right + 6, window.innerWidth - 232 - 8)),
            top: Math.max(8, Math.min(rect.top - 4, window.innerHeight - 320 - 8)),
          }
        : { left: 8, top: 8 },
    )
    setRowMenu(index)
  }

  /**
   * Open a row menu from the keyboard, anchored on its action button.
   * @param index - option index.
   */
  const openRowMenuAt = (index: number): void => {
    const row = menuRef.current?.querySelector(`[data-index="${index}"]`)
    const anchor = row ? row.querySelector('.gv-opt-action') || row : null
    openRowMenu(index, anchor)
  }

  /** Close the flyout and return focus to the row that opened it. */
  const closeRowMenu = (focusAnchor = false): void => {
    setRowMenu(-1)
    const anchor = rowMenuAnchor.current
    rowMenuAnchor.current = null
    if (focusAnchor && anchor && typeof (anchor as HTMLElement).focus === 'function') {
      ;(anchor as HTMLElement).focus()
    }
  }

  React.useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1)
  }, [open, selectedIndex, options.length])

  React.useEffect(() => {
    if (disabled && open) setOpen(false)
  }, [disabled, open])

  React.useEffect(() => {
    if (!open || active < 0 || !menuRef.current) return
    const node = menuRef.current.querySelector(`[data-index="${active}"]`)
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const pick = (index: number): void => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) return
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (options.length === 0 ? -1 : index < 0 ? 0 : (index + 1) % options.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (options.length === 0 ? -1 : index <= 0 ? options.length - 1 : index - 1))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActive(options.length > 0 ? 0 : -1)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setActive(options.length - 1)
      return
    }
    if (event.key === 'ArrowRight' && active >= 0) {
      const option = options[active]
      if (option && Array.isArray(option.actions) && option.actions.length > 0) {
        event.preventDefault()
        openRowMenuAt(active)
      }
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (active >= 0) pick(active)
    }
  }

  let lastGroup: string | null = null
  const rows: React.ReactNode[] = []
  options.forEach((option, index) => {
    if (option.group && option.group !== lastGroup) {
      rows.push(h('div', { key: `group-${option.group}-${index}`, className: 'gv-dropdown-group' }, option.group))
    }
    lastGroup = option.group || null
    const isActive = index === active
    const isSelected = option.value === value
    const actions = Array.isArray(option.actions) ? option.actions : []
    const iconNode =
      option.icon === 'repo'
        ? h(FileIcon, { name: '', isDir: true, size: 14 })
        : option.icon === 'tag'
          ? h(IconTag, { size: 12 })
          : option.icon === 'remote'
            ? h(IconBranch, { size: 12 })
            : option.icon === 'head'
              ? h('span', { className: 'gv-opt-head-dot', 'aria-hidden': true })
              : h(IconBranch, { size: 12 })
    rows.push(
      h(
        'div',
        {
          key: `${option.value}-${index}`,
          id: `${id}-${index}`,
          'data-index': index,
          role: 'option',
          'aria-selected': isSelected,
          className: `gv-dropdown-option${isActive ? ' gv-dropdown-active' : ''}${isSelected ? ' gv-dropdown-selected' : ''}`,
          onMouseMove: () => setActive(index),
          onClick: () => pick(index),
        },
        h('span', { className: 'gv-opt-icon' }, iconNode),
        h(
          'span',
          { className: 'gv-opt-text' },
          h('span', { className: 'gv-opt-label' }, option.label),
          option.description ? h('span', { className: 'gv-opt-desc', title: option.description }, option.description) : null,
        ),
        option.head ? h('span', { className: 'gv-opt-head' }, t('head')) : null,
        isSelected ? h('span', { className: 'gv-opt-check', 'aria-hidden': true }, h(IconCheck, { size: 11 })) : null,
        actions.length > 0
          ? h(
              'button',
              {
                type: 'button',
                className: `gv-opt-action${rowMenu === index ? ' gv-opt-action-open' : ''}`,
                title: t('branchActions'),
                'aria-label': `${t('branchActions')} · ${option.label}`,
                'aria-haspopup': 'menu',
                'aria-expanded': rowMenu === index,
                tabIndex: -1,
                onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation()
                  setActive(index)
                  openRowMenu(index, event.currentTarget)
                },                onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation(),
              },
              h(IconMore, { size: 14 }),
            )
          : null,
      ),
    )
  })

  const activeActions: MenuItem[] | null =
    rowMenu >= 0 && rowMenu < options.length && Array.isArray(options[rowMenu].actions)
      ? options[rowMenu].actions ?? null
      : null

  return h(
    'div',
    { className: 'gv-dropdown', style: { width }, ref: rootRef },
    h(
      'button',
      {
        type: 'button',
        className: `gv-dropdown-trigger${open ? ' gv-dropdown-open' : ''}`,
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'aria-controls': open ? `${id}-list` : undefined,
        'aria-label': label,
        'aria-activedescendant': open && active >= 0 ? `${id}-${active}` : undefined,
        disabled,
        title: current ? current.label : placeholder,
        onClick: () => {
          if (!disabled) setOpen((value) => !value)
        },
        onKeyDown,
      },
      h('span', { className: 'gv-dropdown-icon' }, icon === 'repo' ? h(FileIcon, { name: '', isDir: true, size: 14 }) : h(IconBranch, { size: 13 })),
      h('span', { className: 'gv-dropdown-label' }, current ? current.label : placeholder),
      h('span', { className: 'gv-dropdown-chevron', 'aria-hidden': true }, h(IconChevronDown, { size: 11 })),
    ),
    open
      ? h(
          'div',
          {
            className: 'gv-dropdown-menu',
            role: 'listbox',
            id: `${id}-list`,
            'aria-label': label,
            ref: menuRef,
          },
          rows.length > 0 ? rows : h('div', { className: 'gv-dropdown-empty' }, placeholder),
        )
      : null,
    activeActions && rowMenuPos
      ? ReactDOM.createPortal(
          h(
            'div',
            {
              className: 'gv-opt-menu',
              role: 'menu',
              'aria-label': t('branchActions'),
              ref: rowMenuRef,
              style: { left: `${rowMenuPos.left}px`, top: `${rowMenuPos.top}px` },
              onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation(),
              onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  closeRowMenu(true)
                  return
                }
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  const items = Array.from(event.currentTarget.querySelectorAll('button'))
                  if (items.length === 0) return
                  const at = items.indexOf(document.activeElement as HTMLButtonElement)
                  const next =
                    event.key === 'ArrowDown'
                      ? (at + 1) % items.length
                      : (at - 1 + items.length) % items.length
                  items[next]?.focus()
                }
              },
            },
            activeActions.map((item, actionIndex) =>
              item.separator
                ? h('div', { key: `sep-${actionIndex}`, className: 'gv-opt-menu-sep', role: 'separator' })
                : h(
                    'button',
                    {
                      key: item.id || `${item.label}-${actionIndex}`,
                      type: 'button',
                      role: 'menuitem',
                      className: `gv-opt-menu-item${item.danger ? ' gv-action-danger' : ''}`,
                      disabled: item.disabled,
                      title: item.hint || item.label,
                      onClick: () => {
                        setRowMenu(-1)
                        setOpen(false)
                        item.onSelect?.()
                      },
                    },
                    h('span', { className: 'gv-opt-menu-label' }, item.label),
                    item.hint ? h('span', { className: 'gv-opt-menu-hint' }, item.hint) : null,
                  ),
            ),
          ),
          document.body,
        )
      : null,
  )
}
