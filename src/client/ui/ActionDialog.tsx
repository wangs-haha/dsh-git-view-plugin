/**
 * Small modal used for branch names, destructive confirmations, and discard
 * prompts.
 *
 * It owns only the transient input state; the caller owns `busy`, `error`, and
 * what confirming means.
 */
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { IconClose } from '../icons.js'
import type { DialogConfig, Translate } from '../types.js'

const h = React.createElement

/** Values collected by the dialog's single input and checkbox. */
export interface ActionDialogResult {
  value: string
  checked: boolean
}

export interface ActionDialogProps {
  t: Translate
  dialog: DialogConfig
  /** Disables every control while the caller's action is in flight. */
  busy: boolean
  /** Error text rendered above the buttons. */
  error?: string
  onClose: () => void
  onConfirm: (result: ActionDialogResult) => void
}

/**
 * @param props - dialog descriptor, busy/error state, callbacks.
 * @returns the portal.
 */
export function ActionDialog({ t, dialog, busy, error, onClose, onConfirm }: ActionDialogProps): React.ReactElement {
  const [value, setValue] = React.useState(dialog.initialValue || '')
  const [checked, setChecked] = React.useState(Boolean(dialog.checkboxDefault))
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const confirmRef = React.useRef<HTMLButtonElement | null>(null)
  const busyRef = React.useRef(busy)
  busyRef.current = busy

  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = dialog.input ? inputRef.current : confirmRef.current
    if (node && typeof node.focus === 'function') {
      node.focus()
      if (dialog.input && node instanceof HTMLInputElement) node.select()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      if (previous && typeof previous.focus === 'function') previous.focus()
    }
  }, [dialog.input, onClose])

  const canConfirm = !busy && (!dialog.input || value.trim().length > 0)
  const submit = (): void => {
    if (!canConfirm) return
    onConfirm({ value: value.trim(), checked })
  }

  const panel = h(
    'div',
    { className: 'gv-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': dialog.title },
    h(
      'div',
      { className: 'gv-dialog-head' },
      h('span', { className: 'gv-dialog-title' }, dialog.title),
      h(
        'button',
        {
          type: 'button',
          className: 'gv-icon-button gv-icon-xs',
          title: t('close'),
          'aria-label': t('close'),
          onClick: onClose,
          disabled: busy,
        },
        h(IconClose, { size: 13 }),
      ),
    ),
    h(
      'div',
      { className: 'gv-dialog-body' },
      dialog.description ? h('p', { className: 'gv-dialog-text' }, dialog.description) : null,
      dialog.input
        ? h(
            'label',
            { className: 'gv-dialog-label' },
            h('span', null, dialog.label || t('branchName')),
            h('input', {
              ref: inputRef,
              className: 'gv-dialog-input',
              type: 'text',
              value,
              placeholder: dialog.placeholder || '',
              spellCheck: false,
              autoComplete: 'off',
              disabled: busy,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
              onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submit()
                }
              },
            }),
          )
        : null,
      dialog.checkboxLabel
        ? h(
            'label',
            { className: 'gv-dialog-check' },
            h('input', {
              type: 'checkbox',
              checked,
              disabled: busy,
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => setChecked(event.target.checked),
            }),
            h('span', null, dialog.checkboxLabel),
          )
        : null,
      error ? h('div', { className: 'gv-dialog-error' }, error) : null,
    ),
    h(
      'div',
      { className: 'gv-dialog-actions' },
      h(
        'button',
        { type: 'button', className: 'gv-button gv-button-ghost', onClick: onClose, disabled: busy },
        t('cancel'),
      ),
      h(
        'button',
        {
          type: 'button',
          ref: confirmRef,
          className: `gv-button ${dialog.danger ? 'gv-button-danger' : 'gv-button-primary'}`,
          onClick: submit,
          disabled: !canConfirm,
        },
        busy ? h('span', { className: 'gv-inline-spin', 'aria-hidden': true }) : null,
        h('span', null, dialog.confirmLabel || t('confirm')),
      ),
    ),
  )

  return ReactDOM.createPortal(
    h(
      'div',
      {
        className: 'gv-modal-mask gv-dialog-mask',
        onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
          if (event.target === event.currentTarget && !busy) onClose()
        },
      },
      panel,
    ),
    document.body,
  )
}
