/**
 * Panel stylesheet, injected once by the panel root.
 *
 * Structure:
 *   1. a token block scoped to the panel root and to every portal the panel
 *      opens into (menus and dialogs render on `document.body`, outside
 *      `.gv-root`, so they need their own copy of the tokens);
 *   2. rules written only against those tokens — no raw `--dsw-*` alias, no
 *      hex literal, no magic height below this line.
 *
 * The host exposes near-black "brand" in the light theme and near-white in the
 * dark theme, so `brand` is used exclusively as a *contrast fill* (primary
 * buttons, HEAD chip). The interactive accent — selection, focus, links,
 * counts — is `state-business-primary`, which is blue in both themes. Semantic
 * text tones (`--gv-ok-fg` …) mix the state hue with the label colour so the
 * same declaration is readable on white and on a dark surface.
 *
 * Row and header heights are interpolated from `metrics.ts` so the stylesheet
 * and the React layout share one set of numbers.
 */
import {
  CHANGE_ROW_HEIGHT,
  COLUMN_GAP,
  CONTROL_HEIGHT,
  CONTROL_LARGE,
  CONTROL_SMALL,
  MIN_CENTER,
  MIN_TREE,
  PANE_HEAD_HEIGHT,
  ROW_HEIGHT,
  ROW_PADDING_X,
  SPLIT_SIZE,
  STATUS_BAR_HEIGHT,
  SUB_HEAD_HEIGHT,
  TABLE_HEAD_HEIGHT,
  TOOLBAR_MIN_HEIGHT,
  TREE_ROW_HEIGHT,
} from './metrics.js'

export const PANEL_CSS: string = `
/* ---------------------------------------------------------------- tokens */
.gv-root,.gv-modal-mask,.gv-menu,.gv-opt-menu{
--gv-bg:var(--dsw-alias-bg-base,#fff);
--gv-surface-1:var(--dsw-alias-bg-layer-1,var(--gv-bg));
--gv-surface-2:color-mix(in srgb,var(--dsw-alias-label-primary,#000) 4%,var(--gv-surface-1));
--gv-surface-3:color-mix(in srgb,var(--dsw-alias-label-primary,#000) 8%,var(--gv-surface-1));
--gv-surface-pop:color-mix(in srgb,var(--dsw-alias-label-primary,#000) 3%,var(--gv-bg));
--gv-hover:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,var(--gv-text) 6%,transparent));
--gv-active:var(--dsw-alias-interactive-bg-active,color-mix(in srgb,var(--gv-text) 10%,transparent));
--gv-border:color-mix(in srgb,var(--gv-text) 8%,transparent);
--gv-border-strong:color-mix(in srgb,var(--gv-text) 13%,transparent);
--gv-border-control:color-mix(in srgb,var(--gv-text) 15%,transparent);
--gv-text:var(--dsw-alias-label-primary,#0f1115);
--gv-text-muted:var(--dsw-alias-label-secondary,#61666b);
--gv-text-subtle:var(--dsw-alias-label-tertiary,#81858c);
--gv-accent:var(--dsw-alias-state-business-primary,#4176e6);
--gv-accent-fg:color-mix(in srgb,var(--gv-accent) 75%,var(--gv-text));
--gv-accent-tint:color-mix(in srgb,var(--gv-accent) 12%,transparent);
--gv-accent-tint-strong:color-mix(in srgb,var(--gv-accent) 20%,transparent);
--gv-accent-border:color-mix(in srgb,var(--gv-accent) 34%,transparent);
--gv-solid:var(--dsw-alias-brand-primary,#0f1115);
--gv-solid-hover:var(--dsw-alias-button-primary-hover,#2c2c2e);
--gv-on-solid:var(--dsw-alias-label-primary-foreground,#fff);
--gv-ok:var(--dsw-alias-state-success-primary,#22c55e);
--gv-warn:var(--dsw-alias-state-warn-primary,#f59e0b);
--gv-danger:var(--dsw-alias-state-error-primary,#ec1313);
--gv-ok-fg:color-mix(in srgb,var(--gv-ok) 55%,var(--gv-text));
--gv-warn-fg:color-mix(in srgb,var(--gv-warn) 55%,var(--gv-text));
--gv-danger-fg:color-mix(in srgb,var(--gv-danger) 60%,var(--gv-text));
--gv-ok-tint:color-mix(in srgb,var(--gv-ok) 12%,transparent);
--gv-warn-tint:color-mix(in srgb,var(--gv-warn) 12%,transparent);
--gv-danger-tint:color-mix(in srgb,var(--gv-danger) 12%,transparent);
--gv-ok-border:color-mix(in srgb,var(--gv-ok) 32%,transparent);
--gv-warn-border:color-mix(in srgb,var(--gv-warn) 32%,transparent);
--gv-danger-border:color-mix(in srgb,var(--gv-danger) 32%,transparent);
--gv-hue-blue:color-mix(in srgb,#3b82f6 78%,var(--gv-text));
--gv-hue-cyan:color-mix(in srgb,#06b6d4 72%,var(--gv-text));
--gv-hue-green:color-mix(in srgb,#22c55e 66%,var(--gv-text));
--gv-hue-amber:color-mix(in srgb,#eab308 62%,var(--gv-text));
--gv-hue-orange:color-mix(in srgb,#f97316 70%,var(--gv-text));
--gv-hue-red:color-mix(in srgb,#ef4444 72%,var(--gv-text));
--gv-hue-purple:color-mix(in srgb,#a855f7 72%,var(--gv-text));
--gv-hue-pink:color-mix(in srgb,#ec4899 72%,var(--gv-text));
--gv-hue-slate:color-mix(in srgb,#94a3b8 62%,var(--gv-text));
--gv-folder:color-mix(in srgb,#e0a33e 66%,var(--gv-text));
--gv-folder-open:color-mix(in srgb,#f0b429 60%,var(--gv-text));
--gv-r-xs:4px;
--gv-r-sm:6px;
--gv-r-md:8px;
--gv-r-lg:12px;
--gv-r-pill:999px;
--gv-fs-xs:10px;
--gv-fs-sm:11px;
--gv-fs-md:12px;
--gv-fs-lg:13px;
--gv-fs-xl:15px;
--gv-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
--gv-ctl-sm:${CONTROL_SMALL}px;
--gv-ctl:${CONTROL_HEIGHT}px;
--gv-ctl-lg:${CONTROL_LARGE}px;
--gv-row:${ROW_HEIGHT}px;
--gv-row-tree:${TREE_ROW_HEIGHT}px;
--gv-row-change:${CHANGE_ROW_HEIGHT}px;
--gv-row-head:${TABLE_HEAD_HEIGHT}px;
--gv-head-pane:${PANE_HEAD_HEIGHT}px;
--gv-head-sub:${SUB_HEAD_HEIGHT}px;
--gv-statusbar-h:${STATUS_BAR_HEIGHT}px;
--gv-split:${SPLIT_SIZE}px;
--gv-col-gap:${COLUMN_GAP}px;
--gv-row-pad-x:${ROW_PADDING_X}px;
--gv-dur:.12s;
--gv-ease:cubic-bezier(.2,.7,.3,1);
--gv-shadow-pop:0 12px 28px rgba(0,0,0,.16),0 2px 6px rgba(0,0,0,.08);
--gv-shadow-modal:0 24px 64px rgba(0,0,0,.28);
}

/* ------------------------------------------------------------------ base */
.gv-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--gv-bg);color:var(--gv-text);font-size:var(--gv-fs-md);line-height:1.45;overflow:hidden;padding-top:var(--dsh-frame-top-clearance,0px);-webkit-font-smoothing:antialiased}
.gv-root *{box-sizing:border-box}
.gv-root button,.gv-root input,.gv-root textarea,.gv-root select{font-family:inherit}

/* --------------------------------------------------------------- toolbar */
.gv-toolbar{display:flex;align-items:center;gap:6px 8px;padding:6px var(--gv-row-pad-x);padding-left:max(var(--gv-row-pad-x),var(--dsh-frame-leading-clearance,var(--gv-row-pad-x)));min-height:${TOOLBAR_MIN_HEIGHT}px;border-bottom:1px solid var(--gv-border);flex:none;flex-wrap:wrap;background:var(--gv-bg)}
.gv-brand{display:flex;align-items:center;gap:6px;font-weight:600;font-size:var(--gv-fs-md);letter-spacing:.01em;color:var(--gv-text);white-space:nowrap}
.gv-divider{width:1px;height:18px;background:var(--gv-border-strong);flex:none}
.gv-sync{display:flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-md);background:var(--gv-surface-2)}
.gv-sync .gv-icon-button{position:relative;width:var(--gv-ctl-sm);height:var(--gv-ctl-sm);border:0;border-radius:var(--gv-r-sm);background:transparent}
.gv-sync-count{position:absolute;top:-5px;right:-5px;min-width:14px;height:14px;line-height:14px;padding:0 3px;border-radius:var(--gv-r-pill);font-size:var(--gv-fs-xs);font-weight:700;text-align:center;font-variant-numeric:tabular-nums;color:var(--gv-on-solid)}
.gv-sync-ahead{background:var(--gv-ok-fg)}
.gv-sync-behind{background:var(--gv-accent-fg)}
.gv-spacer{flex:1;min-width:4px}
.gv-count{font-size:var(--gv-fs-sm);color:var(--gv-text-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.gv-match-count{color:var(--gv-accent-fg);font-weight:600}
.gv-remote{display:flex;align-items:center;gap:8px;padding:6px var(--gv-row-pad-x);border-bottom:1px solid var(--gv-border);background:var(--gv-surface-1);font-size:var(--gv-fs-sm);color:var(--gv-text-muted)}
.gv-remote-label{flex:none;font-weight:600;color:var(--gv-text)}
.gv-remote-line{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left;font-family:var(--gv-mono);font-size:var(--gv-fs-xs)}
.gv-remote-error{background:var(--gv-danger-tint)}
.gv-remote-error .gv-remote-label,.gv-remote-error .gv-remote-line{color:var(--gv-danger-fg)}
.gv-remote-cancel{flex:none;height:var(--gv-ctl-sm);padding:0 8px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:transparent;color:var(--gv-text);font:inherit;font-size:var(--gv-fs-xs);cursor:pointer;transition:background var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease)}
.gv-remote-cancel:hover{background:var(--gv-hover);border-color:var(--gv-border-strong)}
.gv-remote-cancel:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}

/* -------------------------------------------------------------- dropdown */
.gv-dropdown{position:relative;flex:none;max-width:220px}
.gv-dropdown-trigger{display:flex;align-items:center;gap:6px;width:100%;height:var(--gv-ctl-lg);padding:0 8px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:var(--gv-surface-2);color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);cursor:pointer;outline:none;transition:background var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease),box-shadow var(--gv-dur) var(--gv-ease)}
.gv-dropdown-trigger:hover:not(:disabled){background:var(--gv-surface-3);border-color:var(--gv-border-strong)}
.gv-dropdown-trigger:focus-visible,.gv-dropdown-open{border-color:var(--gv-accent);box-shadow:0 0 0 2px var(--gv-accent-tint-strong)}
.gv-dropdown-trigger:disabled{opacity:.5;cursor:default}
.gv-dropdown-icon{display:inline-flex;flex:none;color:var(--gv-text-muted)}
.gv-dropdown-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.gv-dropdown-chevron{display:inline-flex;flex:none;color:var(--gv-text-muted);transition:transform var(--gv-dur) var(--gv-ease)}
.gv-dropdown-open .gv-dropdown-chevron{transform:rotate(180deg)}
.gv-dropdown-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:40;min-width:100%;width:max-content;max-width:min(340px,calc(100vw - 24px));max-height:320px;overflow:auto;padding:4px;background:var(--gv-surface-pop);border:1px solid var(--gv-border-strong);border-radius:var(--gv-r-lg);box-shadow:var(--gv-shadow-pop);animation:gv-pop var(--gv-dur) var(--gv-ease)}
@keyframes gv-pop{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.gv-dropdown-group{padding:6px 8px 4px;font-size:var(--gv-fs-xs);font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--gv-text-muted)}
.gv-dropdown-option{position:relative;display:flex;align-items:center;gap:8px;min-height:var(--gv-row);padding:5px 8px;border-radius:var(--gv-r-sm);cursor:pointer;font-size:var(--gv-fs-md);color:var(--gv-text);transition:background var(--gv-dur) var(--gv-ease)}
.gv-dropdown-option:hover,.gv-dropdown-active{background:var(--gv-hover)}
.gv-dropdown-selected{background:var(--gv-accent-tint)}
.gv-dropdown-selected:hover,.gv-dropdown-selected.gv-dropdown-active{background:var(--gv-accent-tint-strong)}
.gv-dropdown-empty{padding:10px;font-size:var(--gv-fs-sm);color:var(--gv-text-muted)}
.gv-opt-icon{display:inline-flex;flex:none;color:var(--gv-text-muted)}
.gv-opt-text{display:flex;flex-direction:column;min-width:0;flex:1}
.gv-opt-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-opt-desc{font-size:var(--gv-fs-xs);color:var(--gv-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-opt-check{display:inline-flex;flex:none;color:var(--gv-accent-fg)}
.gv-opt-head{flex:none;font-size:var(--gv-fs-xs);font-weight:700;letter-spacing:.02em;color:var(--gv-accent-fg);background:var(--gv-accent-tint);border-radius:var(--gv-r-xs);padding:1px 5px}
.gv-opt-head-dot{display:inline-block;width:8px;height:8px;border-radius:var(--gv-r-pill);background:var(--gv-accent)}
.gv-opt-action{flex:none;margin-left:auto;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:var(--gv-r-xs);background:transparent;color:var(--gv-text-muted);cursor:pointer;opacity:.5;transition:opacity var(--gv-dur) var(--gv-ease),background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-dropdown-option:hover .gv-opt-action,.gv-opt-action:focus-visible,.gv-opt-action-open{opacity:1}
.gv-opt-action:hover,.gv-opt-action-open{background:var(--gv-hover);color:var(--gv-text)}
.gv-opt-action:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-opt-menu{position:fixed;left:0;top:0;z-index:60;min-width:232px;max-height:320px;overflow:auto;padding:4px;border:1px solid var(--gv-border-strong);border-radius:var(--gv-r-md);background:var(--gv-surface-pop);box-shadow:var(--gv-shadow-pop);animation:gv-pop var(--gv-dur) var(--gv-ease)}
.gv-opt-menu-item{display:flex;align-items:center;gap:8px;width:100%;min-height:var(--gv-ctl);padding:5px 7px;border:0;border-radius:var(--gv-r-sm);background:transparent;color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);text-align:left;cursor:pointer}
.gv-opt-menu-item:hover:not(:disabled){background:var(--gv-hover)}
.gv-opt-menu-item:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-opt-menu-item:disabled{opacity:.45;cursor:default}
.gv-opt-menu-label{flex:none;white-space:nowrap}
.gv-opt-menu-hint{margin-left:auto;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gv-text-muted);font-size:var(--gv-fs-xs)}
.gv-opt-menu-sep{height:1px;margin:4px 3px;background:var(--gv-border)}
.gv-action-danger{color:var(--gv-danger-fg)}
.gv-action-danger:hover:not(:disabled){background:var(--gv-danger-tint)}

/* ----------------------------------------------------- menu / popup rows */
.gv-menu{position:fixed;z-index:70;padding:4px;border:1px solid var(--gv-border-strong);border-radius:var(--gv-r-lg);background:var(--gv-surface-pop);box-shadow:var(--gv-shadow-pop);animation:gv-pop var(--gv-dur) var(--gv-ease)}
.gv-menu-item{display:flex;align-items:center;gap:8px;width:100%;min-height:var(--gv-ctl);padding:6px 8px;border:0;border-radius:var(--gv-r-sm);background:transparent;color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);text-align:left;cursor:pointer}
.gv-menu-item:hover:not(:disabled){background:var(--gv-hover)}
.gv-menu-item:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-menu-item:disabled{opacity:.45;cursor:default}
.gv-menu-danger{color:var(--gv-danger-fg)}
.gv-menu-danger:hover:not(:disabled){background:var(--gv-danger-tint)}
.gv-menu-label{flex:none;white-space:nowrap}
.gv-menu-hint{margin-left:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gv-text-muted);font-size:var(--gv-fs-xs)}
.gv-menu-sep{height:1px;margin:4px;background:var(--gv-border)}

/* ---------------------------------------------------------------- search */
.gv-search{position:relative;display:flex;align-items:center;min-width:170px;flex:0 1 260px;color:var(--gv-text-muted)}
.gv-search svg{position:absolute;left:8px;pointer-events:none}
.gv-search-input{width:100%;height:var(--gv-ctl-lg);padding:0 9px 0 27px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:var(--gv-surface-2);color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);outline:none;transition:border-color var(--gv-dur) var(--gv-ease),box-shadow var(--gv-dur) var(--gv-ease),background var(--gv-dur) var(--gv-ease)}
.gv-search-input::placeholder{color:var(--gv-text-muted)}
.gv-search-input:focus{border-color:var(--gv-accent);box-shadow:0 0 0 2px var(--gv-accent-tint-strong);background:var(--gv-bg)}
.gv-search-input::-webkit-search-cancel-button{cursor:pointer}

/* --------------------------------------------------------------- buttons */
.gv-icon-button{display:inline-flex;align-items:center;justify-content:center;width:var(--gv-ctl);height:var(--gv-ctl);padding:0;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:var(--gv-surface-2);color:var(--gv-text-muted);cursor:pointer;flex:none;transition:background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease)}
.gv-icon-button:hover:not(:disabled){background:var(--gv-surface-3);color:var(--gv-text)}
.gv-icon-button:active:not(:disabled){background:var(--gv-active)}
.gv-icon-button:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-icon-button:disabled{opacity:.45;cursor:not-allowed}
.gv-icon-xs{width:var(--gv-ctl-sm);height:var(--gv-ctl-sm);border-radius:var(--gv-r-xs)}
.gv-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:var(--gv-ctl);padding:0 10px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:var(--gv-surface-2);color:var(--gv-text);font:inherit;font-size:var(--gv-fs-sm);font-weight:500;white-space:nowrap;cursor:pointer;transition:background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease)}
.gv-button:hover:not(:disabled){background:var(--gv-surface-3);border-color:var(--gv-border-strong)}
.gv-button:active:not(:disabled){background:var(--gv-active)}
.gv-button:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-button:disabled{opacity:.45;cursor:not-allowed}
.gv-button-xs{height:var(--gv-ctl-sm);padding:0 7px;font-size:var(--gv-fs-xs);border-radius:var(--gv-r-xs)}
.gv-button-primary{border-color:var(--gv-solid);background:var(--gv-solid);color:var(--gv-on-solid);font-weight:600}
.gv-button-primary:hover:not(:disabled){border-color:var(--gv-solid-hover);background:var(--gv-solid-hover);color:var(--gv-on-solid)}
.gv-button-primary:active:not(:disabled){border-color:var(--gv-solid);background:var(--gv-solid)}
.gv-button-danger{border-color:var(--gv-danger-fg);background:var(--gv-danger-fg);color:var(--gv-on-solid);font-weight:600}
.gv-button-danger:hover:not(:disabled){border-color:var(--gv-danger);background:var(--gv-danger);color:var(--gv-on-solid)}
.gv-button-danger-ghost{border-color:var(--gv-danger-border);background:transparent;color:var(--gv-danger-fg)}
.gv-button-danger-ghost:hover:not(:disabled){background:var(--gv-danger-tint);border-color:var(--gv-danger)}
.gv-button-ghost{border-color:transparent;background:transparent;color:var(--gv-text-muted)}
.gv-button-ghost:hover:not(:disabled){background:var(--gv-hover);border-color:transparent;color:var(--gv-text)}
.gv-text-button{height:var(--gv-ctl-sm);padding:0 6px;border:0;border-radius:var(--gv-r-xs);background:transparent;color:var(--gv-accent-fg);font:inherit;font-size:var(--gv-fs-xs);font-weight:500;cursor:pointer;transition:background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-text-button:hover:not(:disabled){background:var(--gv-accent-tint)}
.gv-text-button:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-text-button:disabled{opacity:.45;cursor:default}
.gv-text-button-danger{color:var(--gv-danger-fg)}
.gv-text-button-danger:hover:not(:disabled){background:var(--gv-danger-tint)}
.gv-action-chip{display:inline-flex;align-items:center;height:var(--gv-ctl-sm);padding:0 9px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:transparent;color:var(--gv-text);font:inherit;font-size:var(--gv-fs-xs);cursor:pointer;white-space:nowrap;transition:background var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-action-chip:hover{background:var(--gv-hover);border-color:var(--gv-border-strong)}
.gv-action-chip:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-action-chip-danger{color:var(--gv-danger-fg);border-color:var(--gv-danger-border)}
.gv-action-chip-danger:hover{background:var(--gv-danger-tint);border-color:var(--gv-danger)}

/* ------------------------------------------------------------ main layout */
.gv-main{flex:1;min-height:0;display:flex;overflow:hidden}
.gv-pane{min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gv-pane-left{flex:0 0 auto;background:var(--gv-surface-1);border-right:1px solid var(--gv-border)}
.gv-pane-center{flex:1 1 auto;min-width:${MIN_CENTER}px;background:var(--gv-bg)}
.gv-pane-right{flex:0 0 auto;background:var(--gv-surface-1);border-left:1px solid var(--gv-border)}
.gv-left{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gv-left .gv-tree{flex:1;min-height:${MIN_TREE}px}
.gv-main-compact{flex-direction:column}
.gv-compact-top{flex:1;min-height:0;display:flex}
.gv-compact-bottom{flex:0 0 44%;min-height:0;display:flex;border-top:1px solid var(--gv-border)}
.gv-compact-bottom .gv-pane-right{border-left:0;flex:1;width:auto}
.gv-main-empty{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;text-align:center;color:var(--gv-text-muted)}
.gv-main-empty svg{opacity:.6}
.gv-split{flex:0 0 var(--gv-split);position:relative;cursor:col-resize;touch-action:none;outline:none;background:transparent}
.gv-split::before{content:'';position:absolute;top:0;bottom:0;left:2px;width:2px;background:transparent;transition:background var(--gv-dur) var(--gv-ease)}
.gv-split:hover::before,.gv-split:focus-visible::before,.gv-split-active::before{background:var(--gv-accent)}
.gv-split:focus-visible::before{box-shadow:0 0 0 2px var(--gv-accent-tint-strong)}
.gv-split-grip{position:absolute;top:50%;left:0;right:0;height:24px;transform:translateY(-50%);border-radius:var(--gv-r-xs)}
.gv-split-row{flex:0 0 calc(var(--gv-split) + 1px);cursor:row-resize;background:var(--gv-bg);border-top:1px solid var(--gv-border);border-bottom:1px solid var(--gv-border)}
.gv-split-row::before{top:2px;bottom:auto;left:0;right:0;width:auto;height:2px}
.gv-split-row .gv-split-grip{top:0;bottom:0;left:50%;right:auto;width:32px;height:auto;transform:translateX(-50%)}

/* ---------------------------------------------------------- changes pane */
/* The pane's floor (MIN_CHANGES) is enforced by the drag clamp in app.tsx; the
   box itself may shrink when the panel is too short to honour both floors, so
   the composer stays visible instead of being clipped. */
.gv-changes{flex:0 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:var(--gv-surface-1);container-type:size}
.gv-changes-head{flex:none;height:var(--gv-head-sub);display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 8px;border-bottom:1px solid var(--gv-border);font-size:var(--gv-fs-md);font-weight:600}
.gv-changes-title{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-changes-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:var(--gv-r-pill);background:var(--gv-surface-2);color:var(--gv-text-muted);font-size:var(--gv-fs-xs);font-weight:600;font-variant-numeric:tabular-nums}
.gv-changes-total{font-size:var(--gv-fs-xs);font-weight:400;color:var(--gv-text-muted);font-variant-numeric:tabular-nums}
.gv-changes-actions{display:flex;align-items:center;gap:2px;flex:none}
.gv-changes-summary{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px;border-bottom:1px solid var(--gv-border);background:var(--gv-surface-1)}
.gv-sum-chip{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 7px;border-radius:var(--gv-r-pill);background:var(--gv-surface-2);color:var(--gv-text-muted);font-size:var(--gv-fs-xs);font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.gv-sum-dot{width:5px;height:5px;border-radius:var(--gv-r-pill);background:currentColor}
.gv-sum-untracked{color:var(--gv-ok-fg);background:var(--gv-ok-tint)}
.gv-sum-modified{color:var(--gv-warn-fg);background:var(--gv-warn-tint)}
.gv-sum-staged{color:var(--gv-accent-fg);background:var(--gv-accent-tint)}
.gv-sum-conflict,.gv-sum-deleted{color:var(--gv-danger-fg);background:var(--gv-danger-tint)}
.gv-changes-scope{flex:none;display:flex;align-items:center;gap:5px;padding:5px 8px;border-bottom:1px solid var(--gv-border);font-size:var(--gv-fs-xs);color:var(--gv-text-muted);min-width:0}
.gv-changes-scope-label{flex:none}
.gv-changes-scope-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;font-family:var(--gv-mono)}
.gv-repo-banner{flex:none;display:flex;align-items:center;gap:7px;padding:6px 8px;border-bottom:1px solid var(--gv-border);background:var(--gv-warn-tint);color:var(--gv-text);font-size:var(--gv-fs-xs);line-height:1.45}
.gv-repo-banner svg{flex:none;color:var(--gv-warn-fg)}
.gv-repo-banner-text{flex:1;min-width:0}
.gv-repo-banner-actions{display:flex;align-items:center;gap:4px;flex:none}
.gv-repo-notice{flex:none;padding:6px 8px;border-bottom:1px solid var(--gv-border);font-size:var(--gv-fs-xs);line-height:1.45;overflow-wrap:anywhere}
.gv-repo-notice-ok{color:var(--gv-ok-fg);background:var(--gv-ok-tint)}
.gv-repo-notice-error{color:var(--gv-danger-fg);background:var(--gv-danger-tint);max-height:110px;overflow:auto}
.gv-changes-list{flex:1;min-height:0;overflow:auto;padding:4px}
.gv-changes-list-tree{padding:3px 4px 6px}
.gv-change-dir-row{display:flex;align-items:center;gap:5px;min-width:0;min-height:24px;padding:2px 5px;border-radius:var(--gv-r-xs);color:var(--gv-text-muted);font-size:var(--gv-fs-sm);font-weight:500;cursor:pointer;outline:none;user-select:none;transition:background var(--gv-dur) var(--gv-ease)}
.gv-change-dir-row:hover{background:var(--gv-hover)}
.gv-change-dir-row:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-change-dir-chevron{display:inline-flex;flex:none;color:var(--gv-text-muted);transition:transform var(--gv-dur) var(--gv-ease)}
.gv-change-dir-chevron-open{transform:rotate(90deg)}
.gv-change-dir-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gv-text)}
.gv-change-dir-count{margin-left:auto;flex:none;font-size:var(--gv-fs-xs);color:var(--gv-text-muted);font-variant-numeric:tabular-nums}
.gv-change-row-tree{min-height:26px}
.gv-view-toggle[aria-pressed="true"]{border-color:var(--gv-accent-border);background:var(--gv-accent-tint);color:var(--gv-accent-fg)}
.gv-change-row{display:flex;align-items:center;gap:6px;min-width:0;min-height:var(--gv-row-change);padding:4px 5px;border-radius:var(--gv-r-sm);cursor:pointer;outline:none;transition:background var(--gv-dur) var(--gv-ease)}
.gv-change-row:hover{background:var(--gv-hover)}
.gv-change-row:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-change-row:not(.gv-change-checked) .gv-change-name{color:var(--gv-text-muted)}
.gv-change-row:not(.gv-change-checked) .gv-change-status{opacity:.55}
.gv-change-check{flex:none;width:13px;height:13px;margin:0;accent-color:var(--gv-accent);cursor:pointer}
.gv-change-check:disabled{cursor:default}
.gv-change-status{display:inline-flex;align-items:center;justify-content:center;flex:none;width:15px;height:15px;border-radius:var(--gv-r-xs);font-family:var(--gv-mono);font-size:var(--gv-fs-xs);font-weight:700;line-height:1}
.gv-chg-add{background:var(--gv-ok-tint);color:var(--gv-ok-fg)}
.gv-chg-mod{background:var(--gv-warn-tint);color:var(--gv-warn-fg)}
.gv-chg-del,.gv-chg-conflict{background:var(--gv-danger-tint);color:var(--gv-danger-fg)}
.gv-chg-ren{background:var(--gv-accent-tint);color:var(--gv-accent-fg)}
.gv-change-text{display:flex;flex-direction:column;min-width:0;flex:1}
.gv-change-name{font-size:var(--gv-fs-md);line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-change-dir{font-size:var(--gv-fs-xs);line-height:1.3;color:var(--gv-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-change-tags{display:flex;align-items:center;gap:3px;flex:none;max-width:98px;overflow:hidden}
.gv-change-tag{flex:none;font-size:var(--gv-fs-xs);border-radius:var(--gv-r-xs);padding:1px 5px;line-height:1.5;white-space:nowrap;font-weight:500}
.gv-tag-untracked{color:var(--gv-ok-fg);background:var(--gv-ok-tint)}
.gv-tag-staged{color:var(--gv-accent-fg);background:var(--gv-accent-tint)}
.gv-tag-modified{color:var(--gv-warn-fg);background:var(--gv-warn-tint)}
.gv-tag-conflict{color:var(--gv-danger-fg);background:var(--gv-danger-tint)}
.gv-change-discard,.gv-change-resolve{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;padding:0;border:0;border-radius:var(--gv-r-xs);background:transparent;cursor:pointer;transition:opacity var(--gv-dur) var(--gv-ease),background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-change-discard{color:var(--gv-text-muted);opacity:0}
.gv-change-row:hover .gv-change-discard,.gv-change-discard:focus-visible{opacity:1}
.gv-change-discard:hover:not(:disabled){background:var(--gv-danger-tint);color:var(--gv-danger-fg)}
.gv-change-discard:focus-visible,.gv-change-resolve:focus-visible{outline:2px solid var(--gv-accent);outline-offset:0}
.gv-change-discard:disabled{opacity:.3;cursor:not-allowed}
.gv-change-resolve{color:var(--gv-ok-fg);opacity:.8}
.gv-change-resolve:hover:not(:disabled){background:var(--gv-ok-tint);opacity:1}
.gv-change-resolve:disabled{opacity:.35;cursor:not-allowed}
@media (hover:none){.gv-change-discard{opacity:.6}}
.gv-changes-state{padding:16px 10px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-size:var(--gv-fs-sm);line-height:1.5;color:var(--gv-text-muted)}

/* -------------------------------------------------------- commit composer */
.gv-commit{flex:none;display:flex;flex-direction:column;gap:6px;padding:8px;border-top:1px solid var(--gv-border);background:var(--gv-surface-1)}
.gv-commit-input{width:100%;min-height:46px;max-height:72px;resize:none;padding:6px 8px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:var(--gv-bg);color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);line-height:1.5;outline:none;transition:border-color var(--gv-dur) var(--gv-ease),box-shadow var(--gv-dur) var(--gv-ease)}
.gv-commit-input:focus{border-color:var(--gv-accent);box-shadow:0 0 0 2px var(--gv-accent-tint-strong)}
.gv-commit-input::placeholder{color:var(--gv-text-muted)}
.gv-commit-bar{display:flex;align-items:center;gap:8px}
.gv-commit-generate{display:inline-flex;align-items:center;gap:5px;height:var(--gv-ctl);padding:0 9px;border:1px solid var(--gv-accent-border);border-radius:var(--gv-r-sm);background:var(--gv-accent-tint);color:var(--gv-accent-fg);font:inherit;font-size:var(--gv-fs-xs);font-weight:500;cursor:pointer;white-space:nowrap;transition:background var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-commit-generate:hover:not(:disabled){background:var(--gv-accent-tint-strong);border-color:var(--gv-accent)}
.gv-commit-generate:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-commit-generate:disabled{opacity:.45;cursor:default}
.gv-commit-hint{margin-left:auto;font-size:var(--gv-fs-xs);color:var(--gv-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.gv-commit-submit{height:var(--gv-ctl);min-width:88px;padding:0 14px;font-size:var(--gv-fs-sm);border-radius:var(--gv-r-sm)}
.gv-commit-note{font-size:var(--gv-fs-xs);line-height:1.45;color:var(--gv-text-muted);overflow-wrap:anywhere}
.gv-commit-ok{color:var(--gv-ok-fg)}
.gv-commit-error{color:var(--gv-danger-fg)}

/* ------------------------------------------------------------ commit log */
.gv-log{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.gv-scopebar{flex:none;display:flex;align-items:center;gap:6px;height:var(--gv-head-sub);padding:0 var(--gv-row-pad-x);border-bottom:1px solid var(--gv-border);background:var(--gv-surface-1);font-size:var(--gv-fs-sm);color:var(--gv-text-muted)}
.gv-scope-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gv-text);font-family:var(--gv-mono);font-size:var(--gv-fs-xs)}
.gv-scope-clear{display:inline-flex;align-items:center;gap:4px;flex:none;height:var(--gv-ctl-sm);padding:0 7px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-xs);background:transparent;color:var(--gv-text-muted);font:inherit;font-size:var(--gv-fs-xs);cursor:pointer;transition:background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-scope-clear:hover{color:var(--gv-text);background:var(--gv-hover)}
.gv-scope-clear:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-scroll{flex:1;min-height:0;overflow:auto;position:relative;scrollbar-gutter:stable}
.gv-thead,.gv-row{display:grid;grid-template-columns:var(--gv-cols);align-items:center;column-gap:var(--gv-col-gap);padding:0 var(--gv-row-pad-x)}
.gv-thead{position:sticky;top:0;z-index:3;height:var(--gv-row-head);background:var(--gv-bg);border-bottom:1px solid var(--gv-border);font-size:var(--gv-fs-xs);font-weight:500;letter-spacing:.02em;color:var(--gv-text-muted)}
.gv-th{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-row{height:var(--gv-row);cursor:pointer;border-bottom:1px solid transparent;outline:none;position:relative;transition:background var(--gv-dur) var(--gv-ease)}
.gv-row:hover{background:var(--gv-hover)}
.gv-row-selected{background:var(--gv-accent-tint)}
.gv-row-selected:hover{background:var(--gv-accent-tint-strong)}
.gv-row:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-row-dim{opacity:.4}
.gv-row-dim:hover{opacity:.65}
.gv-row-more{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:var(--gv-r-xs);background:var(--gv-surface-2);color:var(--gv-text-muted);cursor:pointer;opacity:0;transition:opacity var(--gv-dur) var(--gv-ease),background var(--gv-dur) var(--gv-ease)}
.gv-row:hover .gv-row-more,.gv-row-more:focus-visible{opacity:1}
.gv-row-more:hover{background:var(--gv-surface-3);color:var(--gv-text)}
.gv-graphcell{display:block;overflow:hidden;height:var(--gv-row)}
.gv-graph{display:block;overflow:visible}
.gv-subjectcell{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
.gv-subject{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--gv-fs-md)}
.gv-author,.gv-date,.gv-hash{font-size:var(--gv-fs-sm);color:var(--gv-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-hash{font-family:var(--gv-mono);font-size:var(--gv-fs-xs);font-variant-numeric:tabular-nums}
.gv-ref{display:inline-flex;align-items:center;flex:none;max-width:150px;height:18px;padding:0 6px;border:1px solid transparent;border-radius:var(--gv-r-sm);font-size:var(--gv-fs-xs);font-weight:500;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-ref-branch{background:var(--gv-accent-tint);border-color:var(--gv-accent-border);color:var(--gv-accent-fg)}
.gv-ref-head{background:var(--gv-solid);border-color:var(--gv-solid);color:var(--gv-on-solid);font-weight:600}
.gv-ref-tag{background:var(--gv-warn-tint);border-color:var(--gv-warn-border);color:var(--gv-warn-fg)}
.gv-ref-remote{background:var(--gv-surface-2);border-color:var(--gv-border);color:var(--gv-text-muted)}

/* ---------------------------------------------------------------- states */
.gv-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:56px 24px;text-align:center;color:var(--gv-text-muted)}
.gv-state svg{color:var(--gv-text-subtle)}
.gv-state-title{font-size:var(--gv-fs-lg);font-weight:600;color:var(--gv-text)}
.gv-state-text{font-size:var(--gv-fs-md);max-width:360px;line-height:1.55}
.gv-loading{display:flex;align-items:center;gap:8px;padding:40px 24px;color:var(--gv-text-muted);font-size:var(--gv-fs-sm);justify-content:center}
.gv-spinner{width:14px;height:14px;border:2px solid var(--gv-border-strong);border-top-color:var(--gv-accent);border-radius:var(--gv-r-pill);animation:gv-spin .8s linear infinite;flex:none}
@keyframes gv-spin{to{transform:rotate(360deg)}}
.gv-inline-spin{width:10px;height:10px;border:1.5px solid var(--gv-border-strong);border-top-color:var(--gv-accent);border-radius:var(--gv-r-pill);animation:gv-spin .8s linear infinite;display:inline-block;flex:none}

/* ------------------------------------------------------------- status bar */
.gv-statusbar{flex:none;display:flex;align-items:center;gap:8px;height:var(--gv-statusbar-h);padding:0 var(--gv-row-pad-x);border-top:1px solid var(--gv-border);font-size:var(--gv-fs-xs);color:var(--gv-text-muted);overflow:hidden;background:var(--gv-bg)}
.gv-status-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;min-width:0;font-family:var(--gv-mono)}
.gv-status-item{flex:none;white-space:nowrap;font-variant-numeric:tabular-nums}
.gv-status-ahead{color:var(--gv-ok-fg)}
.gv-status-behind{color:var(--gv-warn-fg)}
.gv-status-op{color:var(--gv-accent-fg);font-weight:600}
.gv-status-busy{margin-left:auto;display:inline-flex;align-items:center}
.gv-status-actions{display:flex;align-items:center;gap:6px;flex:none}
.gv-status-btn{height:18px;padding:0 7px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-xs);background:transparent;color:var(--gv-text);font:inherit;font-size:var(--gv-fs-xs);cursor:pointer;transition:background var(--gv-dur) var(--gv-ease),color var(--gv-dur) var(--gv-ease)}
.gv-status-btn:hover:not(:disabled){background:var(--gv-hover)}
.gv-status-btn:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-status-btn:disabled{opacity:.45;cursor:default}
.gv-status-btn-danger{color:var(--gv-danger-fg);border-color:var(--gv-danger-border)}
.gv-status-btn-danger:hover:not(:disabled){background:var(--gv-danger-tint)}

/* -------------------------------------------------------------- file tree */
.gv-tree{flex:1;min-height:0;display:flex;flex-direction:column}
.gv-tree-head{flex:none;height:var(--gv-head-pane);display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;border-bottom:1px solid var(--gv-border);font-size:var(--gv-fs-md);font-weight:600}
.gv-tree-rootname{font-size:var(--gv-fs-xs);font-weight:400;color:var(--gv-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}
.gv-tree-refmode{color:var(--gv-accent-fg)}
.gv-tree-scroll{flex:1;min-height:0;overflow:auto;padding:4px 0 10px}
.gv-tree-row{display:flex;align-items:center;gap:5px;height:var(--gv-row-tree);padding-left:8px;padding-right:8px;font-size:var(--gv-fs-md);cursor:pointer;color:var(--gv-text);white-space:nowrap;outline:none;transition:background var(--gv-dur) var(--gv-ease)}
.gv-tree-row:hover{background:var(--gv-hover)}
.gv-tree-row.gv-tree-selected{background:var(--gv-accent-tint)}
.gv-tree-row.gv-tree-selected:hover{background:var(--gv-accent-tint-strong)}
.gv-tree-row:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-tree-row>svg{flex:none}
.gv-tree-root{font-weight:500}
.gv-chevron{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;background:transparent;color:var(--gv-text-muted);cursor:pointer;flex:none;border-radius:var(--gv-r-xs)}
.gv-chevron:hover{color:var(--gv-text);background:var(--gv-hover)}
.gv-chevron:focus-visible{outline:2px solid var(--gv-accent);outline-offset:0}
.gv-chevron svg{transition:transform var(--gv-dur) var(--gv-ease)}
.gv-chevron-open svg{transform:rotate(90deg)}
.gv-chevron-space{width:16px;flex:none}
.gv-tree-name{overflow:hidden;text-overflow:ellipsis}
.gv-tree-spinner{width:10px;height:10px;border:1.5px solid var(--gv-border-strong);border-top-color:var(--gv-accent);border-radius:var(--gv-r-pill);animation:gv-spin .8s linear infinite;flex:none;margin-left:auto}
.gv-tree-status{font:600 var(--gv-fs-xs)/1 var(--gv-mono);padding:1px 3px;border-radius:var(--gv-r-xs);flex:none;margin-left:4px;letter-spacing:.02em}
.gv-tone-modified{color:var(--gv-warn-fg)}
.gv-tone-untracked,.gv-tone-added{color:var(--gv-ok-fg)}
.gv-tone-deleted,.gv-tone-conflict{color:var(--gv-danger-fg)}
.gv-tone-staged{color:var(--gv-accent-fg)}
.gv-tree-dirty{width:5px;height:5px;border-radius:var(--gv-r-pill);background:var(--gv-warn-fg);flex:none;margin-left:auto}
.gv-tree-error-mark{margin-left:auto;color:var(--gv-danger-fg);font-weight:700;font-size:var(--gv-fs-xs)}
.gv-tree-state{padding:10px 12px;font-size:var(--gv-fs-sm);color:var(--gv-text-muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gv-tree .gv-loading{padding:20px 10px}

/* ----------------------------------------------------------- details pane */
.gv-details{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--gv-surface-1)}
.gv-details-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;height:var(--gv-head-pane);padding:0 14px;border-bottom:1px solid var(--gv-border);font-size:var(--gv-fs-md);font-weight:600}
.gv-head-scope{font-size:var(--gv-fs-xs);font-weight:500;color:var(--gv-accent-fg);background:var(--gv-accent-tint);border-radius:var(--gv-r-sm);padding:2px 7px;white-space:nowrap}
.gv-details-body{flex:1;min-height:0;overflow:auto;padding:12px 16px 16px}
.gv-details-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 14px;text-align:center;color:var(--gv-text-muted);font-size:var(--gv-fs-md);line-height:1.6}
.gv-details-empty-icon{opacity:.6}
.gv-details-error{display:flex;flex-direction:column;gap:6px;padding:8px}

/* --------------------------------------------------------- error surfaces */
.gv-error-state{display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid var(--gv-danger-border);border-left:3px solid var(--gv-danger);border-radius:var(--gv-r-md);background:var(--gv-danger-tint);color:var(--gv-text);max-width:100%}
.gv-error-state-compact{padding:8px;gap:7px}
.gv-error-state-icon{flex:none;display:inline-flex;margin-top:1px;color:var(--gv-danger-fg)}
.gv-error-state-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.gv-error-state-title{font-size:var(--gv-fs-sm);font-weight:600;color:var(--gv-danger-fg)}
.gv-error-state-text{font-size:var(--gv-fs-xs);line-height:1.45;color:var(--gv-text-muted);overflow-wrap:anywhere}
.gv-error-state-retry{flex:none;align-self:flex-start}
.gv-alert{flex:none;display:flex;align-items:flex-start;gap:9px;padding:9px 10px;border-bottom:1px solid var(--gv-danger-border);background:var(--gv-danger-tint);color:var(--gv-text);box-shadow:inset 3px 0 0 var(--gv-danger)}
.gv-alert-icon{flex:none;display:inline-flex;margin-top:1px;color:var(--gv-danger-fg)}
.gv-alert-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.gv-alert-title{font-size:var(--gv-fs-sm);font-weight:600;color:var(--gv-danger-fg)}
.gv-alert-text{font-size:var(--gv-fs-xs);line-height:1.45;color:var(--gv-text);overflow-wrap:anywhere}
.gv-alert-detail{margin-top:2px;font-size:var(--gv-fs-xs);color:var(--gv-text-muted)}
.gv-alert-detail summary{width:max-content;cursor:pointer;color:var(--gv-text-muted);user-select:none}
.gv-alert-detail summary:focus-visible{outline:2px solid var(--gv-accent);outline-offset:2px}
.gv-alert-detail pre{margin:4px 0 0;padding:6px 8px;max-height:120px;overflow:auto;border:1px solid var(--gv-border);border-radius:var(--gv-r-xs);background:var(--gv-bg);font-family:var(--gv-mono);font-size:var(--gv-fs-xs);line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}
.gv-alert-actions{flex:none;display:flex;gap:2px}
.gv-alert-action{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:var(--gv-r-xs);background:transparent;color:var(--gv-danger-fg);cursor:pointer;transition:background var(--gv-dur) var(--gv-ease)}
.gv-alert-action:hover{background:color-mix(in srgb,var(--gv-danger) 18%,transparent)}
.gv-alert-action:focus-visible{outline:2px solid var(--gv-accent);outline-offset:0}
.gv-crash{display:flex;align-items:center;justify-content:center;padding:24px;background:var(--gv-bg)}
.gv-crash-card{display:flex;flex-direction:column;align-items:flex-start;gap:10px;width:min(560px,100%);padding:20px;border:1px solid var(--gv-danger-border);border-radius:var(--gv-r-lg);background:var(--gv-surface-pop);box-shadow:var(--gv-shadow-modal)}
.gv-crash-icon{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:var(--gv-r-pill);background:var(--gv-danger-tint);color:var(--gv-danger-fg)}
.gv-crash-title{font-size:var(--gv-fs-xl);font-weight:600;color:var(--gv-text)}
.gv-crash-text{font-size:var(--gv-fs-md);line-height:1.55;color:var(--gv-text-muted)}
.gv-crash-detail{width:100%;max-height:180px;margin:0;padding:8px 10px;overflow:auto;border:1px solid var(--gv-border);border-radius:var(--gv-r-sm);background:var(--gv-bg);font-family:var(--gv-mono);font-size:var(--gv-fs-xs);line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--gv-text-muted)}
.gv-crash-actions{display:flex;gap:8px;flex-wrap:wrap}
.gv-detail-hashrow{display:flex;align-items:center;gap:6px}
.gv-detail-hash{font-family:var(--gv-mono);font-size:var(--gv-fs-md);color:var(--gv-text);background:var(--gv-surface-2);border-radius:var(--gv-r-xs);padding:2px 6px}
.gv-copy{width:var(--gv-ctl-sm);height:var(--gv-ctl-sm)}
.gv-copied{font-size:var(--gv-fs-xs);color:var(--gv-ok-fg)}
.gv-detail-refs{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.gv-detail-subject{font-size:var(--gv-fs-xl);font-weight:600;line-height:1.4;margin:12px 0 0;overflow-wrap:anywhere}
.gv-detail-message{margin:8px 0 0;font:inherit;font-size:var(--gv-fs-md);color:var(--gv-text-muted);white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto}
.gv-meta{display:grid;grid-template-columns:62px minmax(0,1fr);gap:6px 10px;margin:14px 0 0;font-size:var(--gv-fs-md)}
.gv-meta dt{color:var(--gv-text-muted)}
.gv-meta dd{margin:0;min-width:0;overflow-wrap:anywhere}
.gv-meta-mail{color:var(--gv-text-muted);font-size:var(--gv-fs-sm)}
.gv-parents{display:flex;flex-wrap:wrap;gap:5px}
.gv-parent{font-family:var(--gv-mono);font-size:var(--gv-fs-xs);padding:1px 6px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-xs);background:var(--gv-bg);color:var(--gv-text-muted);cursor:pointer;transition:color var(--gv-dur) var(--gv-ease),border-color var(--gv-dur) var(--gv-ease)}
.gv-parent:hover{color:var(--gv-accent-fg);border-color:var(--gv-accent)}
.gv-parent:focus-visible{outline:2px solid var(--gv-accent);outline-offset:1px}
.gv-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:18px 0 6px;font-size:var(--gv-fs-xs);font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--gv-text-muted)}
.gv-filter-note{font-size:var(--gv-fs-xs);font-weight:500;color:var(--gv-accent-fg);white-space:nowrap;text-transform:none;letter-spacing:0}
.gv-muted{font-size:var(--gv-fs-md);color:var(--gv-text-muted);padding:6px 0}
.gv-files{display:flex;flex-direction:column;gap:1px}
.gv-file{display:flex;align-items:center;gap:8px;min-width:0;width:100%;padding:5px 6px;border:0;border-radius:var(--gv-r-xs);background:transparent;color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);text-align:left;cursor:pointer;transition:background var(--gv-dur) var(--gv-ease)}
.gv-file:hover{background:var(--gv-hover)}
.gv-file:focus-visible{outline:2px solid var(--gv-accent);outline-offset:-2px}
.gv-file-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-file-stat{flex:none;font-family:var(--gv-mono);font-size:var(--gv-fs-xs);font-variant-numeric:tabular-nums}
.gv-file-binary{color:var(--gv-text-muted)}
.gv-file-compare{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:var(--gv-r-xs);color:var(--gv-accent-fg);background:var(--gv-accent-tint);opacity:.7;transition:opacity var(--gv-dur) var(--gv-ease),background var(--gv-dur) var(--gv-ease)}
.gv-file:hover .gv-file-compare,.gv-file:focus-visible .gv-file-compare{opacity:1;background:var(--gv-accent-tint-strong)}
.gv-add{color:var(--gv-ok-fg)}
.gv-del{color:var(--gv-danger-fg)}
.gv-status{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:var(--gv-r-xs);font-family:var(--gv-mono);font-size:var(--gv-fs-xs);font-weight:700;line-height:1}
.gv-st-add{background:var(--gv-ok-tint);color:var(--gv-ok-fg)}
.gv-st-mod{background:var(--gv-warn-tint);color:var(--gv-warn-fg)}
.gv-st-del{background:var(--gv-danger-tint);color:var(--gv-danger-fg)}
.gv-st-ren{background:var(--gv-accent-tint);color:var(--gv-accent-fg)}
.gv-st-other{background:var(--gv-surface-2);color:var(--gv-text-muted)}
.gv-detail-actions{display:flex;flex-wrap:wrap;gap:4px;padding:2px 0 6px;border-bottom:1px solid var(--gv-border);margin-bottom:2px}
.gv-rollback-list{flex:1;min-height:90px;max-height:34vh;overflow:auto;display:flex;flex-direction:column;gap:1px;padding:4px;border:1px solid var(--gv-border);border-radius:var(--gv-r-md);background:var(--gv-surface-1)}
.gv-rollback-row{display:flex;align-items:center;gap:7px;padding:4px 5px;border-radius:var(--gv-r-xs);cursor:pointer;font-size:var(--gv-fs-sm);transition:background var(--gv-dur) var(--gv-ease)}
.gv-rollback-row:hover{background:var(--gv-hover)}
.gv-rollback-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left}

/* --------------------------------------------------------------- dialogs */
.gv-modal-mask,.gv-dialog-mask{position:fixed;inset:0;z-index:10000;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.45));display:flex;align-items:center;justify-content:center;padding:20px}
.gv-modal-mask,.gv-modal-mask *,.gv-dialog-mask,.gv-dialog-mask *{box-sizing:border-box}
.gv-dialog-mask{z-index:10020}
.gv-dialog{width:min(440px,94vw);max-height:min(560px,88vh);display:flex;flex-direction:column;background:var(--gv-surface-pop);border:1px solid var(--gv-border-strong);border-radius:var(--gv-r-lg);box-shadow:var(--gv-shadow-modal);overflow:hidden}
.gv-dialog-wide{width:min(560px,94vw)}
.gv-dialog-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;height:44px;padding:0 10px 0 16px;border-bottom:1px solid var(--gv-border)}
.gv-dialog-title{font-size:var(--gv-fs-lg);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-dialog-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:12px 16px}
.gv-dialog-text{margin:0;font-size:var(--gv-fs-md);line-height:1.55;color:var(--gv-text-muted);white-space:pre-wrap;overflow-wrap:anywhere}
.gv-dialog-label{display:flex;flex-direction:column;gap:5px;font-size:var(--gv-fs-xs);font-weight:500;color:var(--gv-text-muted)}
.gv-dialog-input{width:100%;height:var(--gv-ctl-lg);padding:0 9px;border:1px solid var(--gv-border-control);border-radius:var(--gv-r-sm);background:var(--gv-bg);color:var(--gv-text);font:inherit;font-size:var(--gv-fs-md);outline:none;transition:border-color var(--gv-dur) var(--gv-ease),box-shadow var(--gv-dur) var(--gv-ease)}
.gv-dialog-input:focus{border-color:var(--gv-accent);box-shadow:0 0 0 2px var(--gv-accent-tint-strong)}
.gv-dialog-check{display:flex;align-items:flex-start;gap:7px;font-size:var(--gv-fs-sm);line-height:1.45;color:var(--gv-text-muted);cursor:pointer}
.gv-dialog-check input{flex:none;margin:1px 0 0;accent-color:var(--gv-accent)}
.gv-dialog-error{padding:8px 10px;border:1px solid var(--gv-danger-border);border-radius:var(--gv-r-sm);background:var(--gv-danger-tint);color:var(--gv-danger-fg);font-size:var(--gv-fs-xs);line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;overflow:auto}
.gv-dialog-actions{flex:none;display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--gv-border);background:var(--gv-surface-1)}

/* --------------------------------------------------------------- compare */
.gv-modal{width:min(1280px,94vw);height:min(820px,88vh);display:flex;flex-direction:column;background:var(--gv-bg);border:1px solid var(--gv-border-strong);border-radius:var(--gv-r-lg);box-shadow:var(--gv-shadow-modal);overflow:hidden}
.gv-modal-head{flex:none;display:flex;align-items:center;gap:8px;height:44px;padding:0 12px 0 16px;border-bottom:1px solid var(--gv-border)}
.gv-modal-heading{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
.gv-modal-path{font-family:var(--gv-mono);font-size:var(--gv-fs-md);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-modal-hash{font-family:var(--gv-mono);font-size:var(--gv-fs-xs);color:var(--gv-text-muted);background:var(--gv-surface-2);padding:1px 6px;border-radius:var(--gv-r-xs);flex:none}
.gv-modal-body{flex:1;min-height:0;display:flex;flex-direction:column;padding:12px}
.gv-modal-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--gv-text-muted);font-size:var(--gv-fs-md)}
.gv-modal-foot{flex:none;padding:0 4px 2px;font-size:var(--gv-fs-xs);color:var(--gv-warn-fg)}
.gv-compare{flex:1;min-height:0;display:flex;border:1px solid var(--gv-border);border-radius:var(--gv-r-md);overflow:hidden;background:var(--gv-bg)}
.gv-cside{flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--gv-border)}
.gv-cside:last-child{border-right:0}
.gv-ctitle{flex:none;height:var(--gv-head-sub);display:flex;align-items:center;padding:0 10px;font-size:var(--gv-fs-sm);font-weight:600;color:var(--gv-text-muted);background:var(--gv-surface-1);border-bottom:1px solid var(--gv-border)}
.gv-clines{flex:1;min-height:0;overflow:auto;font-family:var(--gv-mono);font-size:var(--gv-fs-sm);line-height:1.6;background:var(--gv-bg)}
.gv-crow{display:flex;min-width:max-content;min-height:1.6em}
.gv-cnum{position:sticky;left:0;flex:0 0 46px;text-align:right;padding:0 10px 0 6px;color:var(--gv-text-muted);user-select:none;background:var(--gv-bg);font-variant-numeric:tabular-nums}
.gv-ccode{flex:1;padding:0 14px 0 10px;white-space:pre;color:var(--gv-text)}
.gv-crow-ctx{background:var(--gv-bg)}
.gv-crow-del{background:var(--gv-danger-tint)}
.gv-crow-add{background:var(--gv-ok-tint)}
.gv-crow-blank{background:var(--gv-bg);opacity:.55}
.gv-crow-hunk{background:var(--gv-accent-tint);color:var(--gv-accent-fg);font-weight:600}
.gv-chunk{padding:0 10px;white-space:pre}

/* ------------------------------------------------------ container queries */
@container (max-width: 250px){
.gv-change-tags{display:none}
}
@container (max-width: 190px){
.gv-sum-chip{padding:0 5px}
}
@container (max-height: 220px){
.gv-changes-summary{display:none}
}

/* --------------------------------------------------------------- a11y/motion */
@media (prefers-reduced-motion: reduce){
.gv-root *,.gv-menu *,.gv-opt-menu *,.gv-modal-mask *,.gv-dialog-mask *{transition-duration:1ms!important;animation-duration:1ms!important}
/* spinners keep turning, just slowly: a frozen spinner reads as a hang */
.gv-spinner,.gv-inline-spin,.gv-tree-spinner{animation-duration:2.4s!important}
}
@media (forced-colors: active){
.gv-root,.gv-menu,.gv-opt-menu,.gv-modal-mask,.gv-dialog-mask{--gv-bg:Canvas;--gv-surface-1:Canvas;--gv-surface-2:Canvas;--gv-surface-3:Canvas;--gv-surface-pop:Canvas;--gv-text:CanvasText;--gv-text-muted:CanvasText;--gv-text-subtle:CanvasText;--gv-border:CanvasText;--gv-border-strong:CanvasText;--gv-border-control:CanvasText;--gv-hover:transparent;--gv-active:transparent;--gv-accent:Highlight;--gv-accent-fg:LinkText;--gv-accent-tint:Canvas;--gv-accent-tint-strong:Canvas;--gv-accent-border:CanvasText;--gv-solid:ButtonText;--gv-on-solid:ButtonFace;--gv-ok:CanvasText;--gv-ok-fg:CanvasText;--gv-ok-tint:Canvas;--gv-warn:CanvasText;--gv-warn-fg:CanvasText;--gv-warn-tint:Canvas;--gv-danger:CanvasText;--gv-danger-fg:CanvasText;--gv-danger-tint:Canvas}
}
`
