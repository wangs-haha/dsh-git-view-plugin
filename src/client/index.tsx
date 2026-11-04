/**
 * Client entry: registers the Git panel, its sidebar icon and the dictionaries
 * with the DSH Web runtime.
 *
 * The build wraps this module in the module-loader factory so `react` and
 * `react-dom` resolve against the page runtime.
 */
import * as React from 'react'
import { GitViewPanel } from './app.js'
import { en, NS, zh } from './i18n.js'
import { GitViewIcon } from './icons.js'
import { installFreshnessCheck } from './selfcheck.js'
import { PanelErrorBoundary } from './ui/ErrorBoundary.js'
import type { Translate } from './types.js'

const identity: Translate = (key: string): string => key

/**
 * Slot component: the panel plus its last-resort error boundary, so a render
 * failure keeps the frame and shows the crash card instead of a blank slot.
 * @param props - translator handed down by the host slot.
 * @returns the bounded panel.
 */
function GitViewSlot(props: { t?: Translate }): React.ReactElement {
  return React.createElement(
    PanelErrorBoundary,
    { t: props.t ?? identity },
    React.createElement(GitViewPanel, props),
  )
}

/** Sidebar entry id and the main-panel key it opens. */
export const PANEL_ID = 'git-view'

interface SlotRegistration {
  name: string
  key?: string
  id?: string
  order?: number
  label?: () => string
  locale?: string
}

interface SlotService {
  register(options: SlotRegistration, component: React.ComponentType<any>): unknown
  inject(slot: string, run: () => unknown): unknown
}

interface LocaleService {
  register(namespace: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): unknown
  bind(namespace: string): Translate
}

/** The slice of the browser plugin context this plugin uses. */
export interface ClientContext {
  effect(run: () => unknown, label: string): unknown
  locale: LocaleService
  slots: SlotService
}

export const inject = ['slots', 'locale']

/**
 * Register the sidebar entry, its main panel, and the dictionaries.
 * @param ctx - browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'git-view: dictionaries')
  // A rebuilt plugin must never leave a stale panel behind: the host has no
  // reload entry and its HMR channel is a one-shot subscription.
  ctx.effect(() => installFreshnessCheck(), 'git-view: bundle freshness')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, GitViewSlot),
  )

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 5,
        label: () => t('panel'),
        locale: NS,
      },
      GitViewIcon,
    ),
  )
}
