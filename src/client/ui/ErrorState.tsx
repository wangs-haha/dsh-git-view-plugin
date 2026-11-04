/**
 * Inline error card shared by every pane: icon, title, message and an optional
 * retry button. Panes use it instead of printing a bare string, so a failed
 * read looks the same in the changes list, the log and the details pane.
 */
import * as React from 'react'
import { IconAlert, IconRefresh } from '../icons.js'
import type { Translate } from '../types.js'

const h = React.createElement

export interface ErrorStateProps {
  t: Translate
  message: string
  onRetry?: () => void
  /** Tighter padding for the narrow left column. */
  compact?: boolean
}

/**
 * @param props - message, translator and optional retry.
 * @returns the error card.
 */
export function ErrorState({ t, message, onRetry, compact = false }: ErrorStateProps): React.ReactElement {
  return h(
    'div',
    { className: `gv-error-state${compact ? ' gv-error-state-compact' : ''}`, role: 'alert' },
    h('span', { className: 'gv-error-state-icon', 'aria-hidden': true }, h(IconAlert, { size: compact ? 14 : 16 })),
    h(
      'div',
      { className: 'gv-error-state-body' },
      h('div', { className: 'gv-error-state-title' }, t('errorTitle')),
      h('div', { className: 'gv-error-state-text' }, message),
    ),
    onRetry
      ? h(
          'button',
          {
            type: 'button',
            className: 'gv-button gv-button-xs gv-error-state-retry',
            onClick: onRetry,
          },
          h(IconRefresh, { size: 11 }),
          h('span', null, t('retry')),
        )
      : null,
  )
}
