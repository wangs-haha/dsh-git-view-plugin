/**
 * Last-resort boundary around the whole panel.
 *
 * A render error in one pane unmounts the React tree, which would otherwise
 * leave a blank slot. This boundary keeps the panel frame, explains that the
 * failure is internal, and offers retry / copy actions. It injects the panel
 * stylesheet itself because the crashed tree owned the style element.
 */
import * as React from 'react'
import { PANEL_CSS } from '../styles.js'
import { IconAlert, IconCopy, IconRefresh } from '../icons.js'
import type { Translate } from '../types.js'

const h = React.createElement

export interface ErrorBoundaryProps {
  t: Translate
  children?: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Render a styled crash card when a descendant throws.
 */
export class PanelErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }
  private timer: ReturnType<typeof setTimeout> | null = null

  /** React calls this during render; store the error for the crash card. */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  /** Log once so the console still carries the original stack. */
  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[git-view] render error', error, info.componentStack)
  }

  override componentWillUnmount(): void {
    if (this.timer) clearTimeout(this.timer)
  }

  private retry = (): void => {
    this.setState({ error: null })
  }

  private copy = (): void => {
    const error = this.state.error
    if (!error) return
    try {
      void navigator.clipboard.writeText(`${error.message}\n\n${error.stack || ''}`).catch(() => undefined)
    } catch {
      /* clipboard permission denied */
    }
  }

  override render(): React.ReactNode {
    const { error } = this.state
    const { t } = this.props
    if (!error) return this.props.children
    return h(
      'div',
      { className: 'gv-root gv-crash', role: 'alert' },
      h('style', null, PANEL_CSS),
      h(
        'div',
        { className: 'gv-crash-card' },
        h('span', { className: 'gv-crash-icon', 'aria-hidden': true }, h(IconAlert, { size: 22 })),
        h('div', { className: 'gv-crash-title' }, t('errorBoundaryTitle')),
        h('div', { className: 'gv-crash-text' }, t('errorBoundaryHint')),
        h('pre', { className: 'gv-crash-detail' }, `${error.message}\n${error.stack || ''}`.slice(0, 4000)),
        h(
          'div',
          { className: 'gv-crash-actions' },
          h(
            'button',
            { type: 'button', className: 'gv-button gv-button-primary', onClick: this.retry },
            h(IconRefresh, { size: 12 }),
            h('span', null, t('retryPanel')),
          ),
          h(
            'button',
            { type: 'button', className: 'gv-button', onClick: this.copy },
            h(IconCopy, { size: 12 }),
            h('span', null, t('copyDetails')),
          ),
        ),
      ),
    )
  }
}
