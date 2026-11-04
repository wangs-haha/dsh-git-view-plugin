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
import type { Translate } from './types.js'

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
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS }, GitViewPanel),
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
