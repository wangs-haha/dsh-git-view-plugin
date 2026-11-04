/**
 * Inline spinner with a label, used by every loading state in the panel.
 */
import * as React from 'react'

const h = React.createElement

export interface SpinnerProps {
  label?: string
}

/**
 * @param props - the label shown next to the spinning ring.
 * @returns the loading row.
 */
export function Spinner({ label }: SpinnerProps): React.ReactElement {
  return h(
    'div',
    { className: 'gv-loading' },
    h('span', { className: 'gv-spinner', 'aria-hidden': true }),
    h('span', null, label),
  )
}
