/**
 * Multi-file rollback dialog (IDEA's Rollback): pick the files to restore and
 * decide whether newly added files are deleted from disk or only unstaged.
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { statusClass } from '../format.js'
import { IconClose } from '../icons.js'
import type { StatusEntry, Translate } from '../types.js'

const h = React.createElement

export interface RollbackDialogProps {
  t: Translate
  /** Working-tree entries offered for rollback; all start checked. */
  entries: StatusEntry[]
  /** Disables every control while the rollback runs. */
  busy: boolean
  /** Error text rendered above the buttons. */
  error?: string
  onClose: () => void
  onConfirm: (paths: string[], deleteAdded: boolean) => void
}

/**
 * @param props - entries, busy/error state, callbacks.
 * @returns the portal.
 */
export function RollbackDialog({
  t,
  entries,
  busy,
  error,
  onClose,
  onConfirm,
}: RollbackDialogProps): React.ReactElement {
  const [checked, setChecked] = React.useState<Set<string>>(() => new Set(entries.map((entry) => entry.path)))
  const [deleteAdded, setDeleteAdded] = React.useState(true)
  const confirmRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (confirmRef.current && typeof confirmRef.current.focus === 'function') confirmRef.current.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation()
        onClose()
      }
    }
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.documentElement.style.overflow = previous
    }
  }, [busy, onClose])

  const toggle = (path: string): void => {
    setChecked((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }
  const allChecked = entries.length > 0 && checked.size === entries.length
  const paths = entries.filter((entry) => checked.has(entry.path)).map((entry) => entry.path)

  return ReactDOM.createPortal(
    h(
      'div',
      {
        className: 'gv-modal-mask gv-dialog-mask',
        onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
          if (event.target === event.currentTarget && !busy) onClose()
        },
      },
      h(
        'div',
        { className: 'gv-dialog gv-dialog-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('rollbackTitle') },
        h(
          'div',
          { className: 'gv-dialog-head' },
          h('span', { className: 'gv-dialog-title' }, t('rollbackTitle')),
          h(
            'button',
            {
              type: 'button',
              className: 'gv-icon-button gv-icon-xs',
              title: t('close'),
              'aria-label': t('close'),
              disabled: busy,
              onClick: onClose,
            },
            h(IconClose, { size: 13 }),
          ),
        ),
        h(
          'div',
          { className: 'gv-dialog-body' },
          h('p', { className: 'gv-dialog-text' }, t('rollbackHint')),
          h(
            'label',
            { className: 'gv-dialog-check' },
            h('input', {
              type: 'checkbox',
              checked: allChecked,
              disabled: busy || entries.length === 0,
              onChange: () =>
                setChecked(allChecked ? new Set<string>() : new Set(entries.map((entry) => entry.path))),
            }),
            h('span', null, `${t('selectAll')} · ${checked.size}/${entries.length}`),
          ),
          h(
            'div',
            { className: 'gv-rollback-list' },
            entries.map((entry) =>
              h(
                'label',
                { key: entry.path, className: 'gv-rollback-row' },
                h('input', {
                  type: 'checkbox',
                  checked: checked.has(entry.path),
                  disabled: busy,
                  onChange: () => toggle(entry.path),
                }),
                h('span', { className: `gv-status ${statusClass(entry.status)}` }, entry.status || '?'),
                h('span', { className: 'gv-rollback-path', title: entry.path }, entry.path),
              ),
            ),
          ),
          h(
            'label',
            { className: 'gv-dialog-check' },
            h('input', {
              type: 'checkbox',
              checked: deleteAdded,
              disabled: busy,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDeleteAdded(event.target.checked),
            }),
            h('span', null, t('rollbackDeleteAdded')),
          ),
          error ? h('div', { className: 'gv-dialog-error' }, error) : null,
        ),
        h(
          'div',
          { className: 'gv-dialog-actions' },
          h('button', { type: 'button', className: 'gv-button', onClick: onClose, disabled: busy }, t('cancel')),
          h(
            'button',
            {
              type: 'button',
              ref: confirmRef,
              className: 'gv-button gv-button-danger',
              disabled: busy || paths.length === 0,
              onClick: () => onConfirm(paths, deleteAdded),
            },
            busy ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true }) : null,
            h('span', null, `${t('rollbackConfirm')} · ${paths.length}`),
          ),
        ),
      ),
    ),
    document.body,
  )
}
