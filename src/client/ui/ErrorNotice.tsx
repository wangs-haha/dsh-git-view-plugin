/**
 * Panel-level exception banner.
 *
 * One persistent, dismissible card under the toolbar: operation title, the
 * host's message, a collapsible technical detail block and a copy action. It is
 * the only presentation for action failures, so every command reports the same
 * way regardless of which pane started it.
 */
import * as React from 'react'
import { IconAlert, IconCheck, IconClose, IconCopy } from '../icons.js'
import type { Notice } from '../notices.js'
import type { Translate } from '../types.js'

const h = React.createElement

export interface ErrorNoticeProps {
  t: Translate
  notice: Notice
  onClose: () => void
}

/**
 * @param props - the error notice and its dismiss action.
 * @returns the banner element.
 */
export function ErrorNotice({ t, notice, onClose }: ErrorNoticeProps): React.ReactElement {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = (): void => {
    const text = [notice.title, notice.text, notice.detail].filter(Boolean).join('\n\n')
    try {
      void navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), 1600)
        })
        .catch(() => undefined)
    } catch {
      /* clipboard permission denied */
    }
  }

  return h(
    'div',
    { className: 'gv-alert gv-alert-error', role: 'alert', 'aria-live': 'assertive' },
    h('span', { className: 'gv-alert-icon', 'aria-hidden': true }, h(IconAlert, { size: 15 })),
    h(
      'div',
      { className: 'gv-alert-body' },
      h('div', { className: 'gv-alert-title' }, notice.title || t('errorTitle')),
      notice.text ? h('div', { className: 'gv-alert-text' }, notice.text) : null,
      notice.detail
        ? h(
            'details',
            { className: 'gv-alert-detail' },
            h('summary', null, t('errorDetail')),
            h('pre', null, notice.detail),
          )
        : null,
    ),
    h(
      'div',
      { className: 'gv-alert-actions' },
      h(
        'button',
        {
          type: 'button',
          className: 'gv-alert-action',
          title: copied ? t('copiedDetails') : t('copyDetails'),
          'aria-label': copied ? t('copiedDetails') : t('copyDetails'),
          onClick: copy,
        },
        copied ? h(IconCheck, { size: 12 }) : h(IconCopy, { size: 12 }),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'gv-alert-action',
          title: t('close'),
          'aria-label': t('close'),
          onClick: onClose,
        },
        h(IconClose, { size: 12 }),
      ),
    ),
  )
}
