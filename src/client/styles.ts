/**
 * Panel stylesheet, injected once by the panel root.
 *
 * The rules are unchanged from the legacy client bundle; the former
 * `${ROW_HEIGHT}`, `${MIN_TREE}` and `${MIN_CHANGES}` interpolations are inlined
 * (30, 140 and 300) so the stylesheet is a plain, static string.
 */
export const PANEL_CSS: string = `
.gv-root{box-sizing:border-box;height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;overflow:hidden;padding-top:var(--dsh-frame-top-clearance,0px)}
.gv-root *{box-sizing:border-box}
.gv-toolbar{display:flex;align-items:center;gap:8px;row-gap:6px;padding:6px 12px;padding-left:max(12px,var(--dsh-frame-leading-clearance,12px));min-height:44px;border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;flex-wrap:wrap}
.gv-brand{display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;color:var(--dsw-alias-label-primary);white-space:nowrap}
.gv-sync{display:flex;align-items:center;gap:2px;padding:1px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}
.gv-sync .gv-icon-button{position:relative;width:26px;height:26px;border-radius:6px}
.gv-sync-count{position:absolute;top:-4px;right:-4px;min-width:13px;height:13px;line-height:13px;padding:0 3px;border-radius:7px;font-size:8.5px;font-weight:700;text-align:center;color:var(--dsw-alias-bg-base)}
.gv-sync-ahead{background:var(--dsw-alias-state-success-primary)}
.gv-sync-behind{background:var(--dsw-alias-brand-primary)}
.gv-remote{display:flex;align-items:center;gap:8px;padding:4px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11px;color:var(--dsw-alias-label-secondary)}
.gv-remote-label{flex:none;font-weight:600;color:var(--dsw-alias-label-primary)}
.gv-remote-line{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left}
.gv-remote-error .gv-remote-label{color:var(--dsw-alias-state-error-primary)}
.gv-remote-cancel{flex:none;height:20px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;cursor:pointer}
.gv-remote-cancel:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-divider{width:1px;height:18px;background:var(--dsw-alias-border-l1);flex:none}
.gv-dropdown{position:relative;flex:none;max-width:220px}
.gv-dropdown-trigger{display:flex;align-items:center;gap:7px;width:100%;height:28px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer;outline:none;transition:background .12s,border-color .12s,box-shadow .12s}
.gv-dropdown-trigger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,var(--dsw-alias-border-l1))}
.gv-dropdown-trigger:focus-visible,.gv-dropdown-open{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent)}
.gv-dropdown-trigger:disabled{opacity:.55;cursor:default}
.gv-dropdown-icon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary)}
.gv-dropdown-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.gv-dropdown-chevron{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary);transition:transform .14s}
.gv-dropdown-open .gv-dropdown-chevron{transform:rotate(180deg)}
.gv-dropdown-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:40;min-width:100%;width:max-content;max-width:min(340px,calc(100vw - 24px));max-height:320px;overflow:auto;padding:5px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.22);animation:gv-pop .12s ease-out}
@keyframes gv-pop{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.gv-dropdown-group{padding:6px 8px 4px;font-size:10px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.gv-dropdown-option{position:relative;display:flex;align-items:center;gap:8px;min-height:30px;padding:5px 8px;border-radius:7px;cursor:pointer;font-size:12px;color:var(--dsw-alias-label-primary)}
.gv-dropdown-option:hover,.gv-dropdown-active{background:var(--dsw-alias-bg-layer-2)}
.gv-dropdown-selected{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.gv-opt-icon{display:inline-flex;flex:none;color:var(--dsw-alias-label-secondary)}
.gv-opt-text{display:flex;flex-direction:column;min-width:0;flex:1}
.gv-opt-action{flex:none;margin-left:auto;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.45}
.gv-dropdown-option:hover .gv-opt-action,.gv-opt-action:focus-visible,.gv-opt-action-open{opacity:1}
.gv-opt-action:hover,.gv-opt-action-open{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent);color:var(--dsw-alias-label-primary)}
.gv-opt-menu{position:fixed;left:0;top:0;z-index:60;min-width:232px;max-height:320px;overflow:auto;padding:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-overlay);box-shadow:0 12px 28px rgba(0,0,0,.24);animation:gv-pop .1s ease-out}
.gv-opt-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:5px 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-opt-menu-item:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.gv-opt-menu-item:disabled{opacity:.45;cursor:default}
.gv-opt-menu-label{flex:none;white-space:nowrap}
.gv-opt-menu-hint{margin-left:auto;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:11px}
.gv-opt-menu-sep{height:1px;margin:4px 3px;background:var(--dsw-alias-border-l1)}
.gv-status-actions{display:flex;align-items:center;gap:6px;flex:none}
.gv-status-btn{height:18px;padding:0 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer}
.gv-status-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.gv-status-btn:disabled{opacity:.45;cursor:default}
.gv-status-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent)}
.gv-opt-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-opt-desc{font-size:10.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-opt-check{display:inline-flex;flex:none;color:var(--dsw-alias-brand-primary)}
.gv-opt-head{flex:none;font-size:9.5px;font-weight:700;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-radius:6px;padding:1px 5px}
.gv-opt-head-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.gv-dropdown-empty{padding:10px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.gv-action-menu{position:relative;flex:none}
.gv-action-trigger.gv-action-open{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent);color:var(--dsw-alias-label-primary)}
.gv-action-list{position:absolute;top:calc(100% + 6px);right:0;z-index:45;min-width:238px;max-width:min(330px,calc(100vw - 24px));padding:5px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.22);animation:gv-pop .12s ease-out}
.gv-action-item{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:30px;padding:5px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-action-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.gv-action-item:disabled{opacity:.4;cursor:default}
.gv-action-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-action-hint{flex:none;max-width:148px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:var(--dsw-alias-label-secondary)}
.gv-action-danger .gv-action-label{color:var(--dsw-alias-state-error-primary)}
.gv-action-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.gv-action-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l1)}
.gv-search{position:relative;display:flex;align-items:center;min-width:170px;flex:0 1 260px;color:var(--dsw-alias-label-secondary)}
.gv-search svg{position:absolute;left:8px;pointer-events:none}
.gv-search-input{width:100%;height:28px;padding:0 9px 0 27px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.gv-search-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8}
.gv-search-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent)}
.gv-search-input::-webkit-search-cancel-button{cursor:pointer}
.gv-spacer{flex:1;min-width:4px}
.gv-count{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.gv-match-count{color:var(--dsw-alias-brand-primary)}
.gv-icon-button{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;transition:background .12s,color .12s,border-color .12s}
.gv-icon-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.gv-icon-button:active:not(:disabled){transform:translateY(1px)}
.gv-icon-button:disabled{opacity:.45;cursor:not-allowed}
.gv-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background .12s,color .12s,border-color .12s,box-shadow .12s}
.gv-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.gv-button:active:not(:disabled){transform:translateY(1px)}
.gv-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.gv-button:disabled{opacity:.45;cursor:not-allowed}
.gv-button-primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 74%,#000);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 74%,#000);color:#fff;font-weight:600}
.gv-button-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 66%,#000);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 66%,#000)}
.gv-button-ai{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);color:var(--dsw-alias-brand-primary)}
.gv-button-ai:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent)}
.gv-button-danger{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 76%,#000);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 76%,#000);color:#fff;font-weight:600}
.gv-button-danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 68%,#000);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 68%,#000)}
.gv-button-danger-ghost{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,transparent);background:transparent;color:var(--dsw-alias-state-error-primary)}
.gv-button-danger-ghost:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.gv-button-ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}
.gv-button-ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.gv-button-xs{height:22px;padding:0 7px;font-size:10.5px;border-radius:5px}
.gv-main{flex:1;min-height:0;display:flex;overflow:hidden}
.gv-pane{min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gv-pane-left{flex:0 0 auto;background:var(--dsw-alias-bg-layer-1);border-right:1px solid var(--dsw-alias-border-l1)}
.gv-left{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.gv-left .gv-tree{flex:1;min-height:140px}
.gv-changes{flex:0 0 auto;min-height:300px;display:flex;flex-direction:column;overflow:hidden;background:var(--dsw-alias-bg-layer-1);container-type:inline-size}
.gv-changes-head{flex:none;height:32px;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11.5px;font-weight:600}
.gv-changes-title{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-changes-count{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 5px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}
.gv-changes-total{font-size:10px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.gv-changes-actions{display:flex;align-items:center;gap:2px;flex:none}
.gv-text-button{height:22px;padding:0 6px;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:10.5px;font-weight:500;cursor:pointer}
.gv-text-button:disabled{opacity:.45;cursor:default}
.gv-text-button-danger{color:var(--dsw-alias-state-error-primary)}
.gv-detail-actions{display:flex;flex-wrap:wrap;gap:4px;padding:2px 0 6px;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:2px}
.gv-rollback-list{flex:1;min-height:90px;max-height:34vh;overflow:auto;display:flex;flex-direction:column;gap:1px;padding:4px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.gv-rollback-row{display:flex;align-items:center;gap:7px;padding:3px 5px;border-radius:5px;cursor:pointer;font-size:11.5px}
.gv-rollback-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-rollback-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left}
.gv-text-button:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.gv-text-button:disabled{opacity:.45;cursor:default}
.gv-icon-xs{width:22px;height:22px;border-radius:5px}
.gv-changes-summary{flex:none;display:flex;flex-wrap:wrap;gap:4px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.gv-sum-chip{display:inline-flex;align-items:center;gap:4px;height:18px;padding:0 6px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9.5px;font-weight:600;white-space:nowrap}
.gv-sum-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
.gv-sum-untracked{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.gv-sum-modified{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,transparent)}
.gv-sum-staged{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 11%,transparent)}
.gv-sum-conflict,.gv-sum-deleted{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.gv-changes-scope{flex:none;display:flex;align-items:center;gap:5px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary);min-width:0}
.gv-changes-scope-label{flex:none}
.gv-changes-scope-path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-repo-banner{flex:none;display:flex;align-items:center;gap:7px;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,transparent);color:var(--dsw-alias-label-primary);font-size:10.5px;line-height:1.4}
.gv-repo-banner svg{flex:none;color:var(--dsw-alias-state-warn-primary)}
.gv-repo-banner-text{flex:1;min-width:0}
.gv-repo-banner-actions{display:flex;align-items:center;gap:4px;flex:none}
.gv-repo-notice{flex:none;padding:5px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:10.5px;line-height:1.4;overflow-wrap:anywhere}
.gv-repo-notice-ok{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 9%,transparent)}
.gv-repo-notice-error{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);max-height:110px;overflow:auto}
.gv-changes-list{flex:1;min-height:0;overflow:auto;padding:4px}
.gv-change-row{display:flex;align-items:center;gap:6px;min-width:0;min-height:30px;padding:3px 5px;border-radius:6px;cursor:pointer;outline:none}
.gv-change-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-change-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-change-check{flex:none;width:13px;height:13px;margin:0;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.gv-change-status{display:inline-flex;align-items:center;justify-content:center;flex:none;width:14px;height:14px;border-radius:3px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;font-weight:700}
.gv-chg-add{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent);color:var(--dsw-alias-state-success-primary)}
.gv-chg-mod{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary)}
.gv-chg-del,.gv-chg-conflict{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 18%,transparent);color:var(--dsw-alias-state-error-primary)}
.gv-chg-ren{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);color:var(--dsw-alias-brand-primary)}
.gv-change-text{display:flex;flex-direction:column;min-width:0;flex:1}
.gv-change-name{font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-change-dir{font-size:9.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-change-tags{display:flex;align-items:center;gap:3px;flex:none;max-width:98px;overflow:hidden}
.gv-change-tag{flex:none;font-size:9px;border-radius:5px;padding:1px 5px;line-height:1.5;white-space:nowrap}
.gv-tag-untracked{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 13%,transparent)}
.gv-tag-staged{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.gv-tag-modified{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 13%,transparent)}
.gv-tag-conflict{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 13%,transparent)}
.gv-change-discard{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity .12s,background .12s,color .12s}
.gv-change-resolve{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-state-success-primary);cursor:pointer;opacity:.85;transition:opacity .12s,background .12s}
.gv-change-resolve:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 15%,transparent)}
.gv-change-resolve:disabled{opacity:.35;cursor:not-allowed}
.gv-change-row:hover .gv-change-discard,.gv-change-discard:focus-visible{opacity:1}
@media (hover:none){.gv-change-discard{opacity:.65}}
.gv-change-discard:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}
.gv-change-discard:disabled{opacity:.3;cursor:not-allowed}
.gv-changes-state{padding:14px 10px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
.gv-commit{flex:none;display:flex;flex-direction:column;gap:6px;padding:8px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.gv-commit-input{width:100%;min-height:46px;max-height:72px;resize:none;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;line-height:1.45;outline:none}
.gv-commit-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,transparent)}
.gv-commit-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.8}
.gv-commit-bar{display:flex;align-items:center;gap:8px}
.gv-commit-generate{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.gv-commit-generate:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-border-l1))}
.gv-commit-generate:disabled{opacity:.45;cursor:default}
.gv-commit-hint{margin-left:auto;font-size:10px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-commit-submit{height:26px;min-width:88px;padding:0 14px;font-size:11.5px;border-radius:7px}
.gv-action-chip{display:inline-flex;align-items:center;height:22px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:11px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap}
.gv-action-chip:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.gv-action-chip-danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 35%,var(--dsw-alias-border-l1))}
.gv-action-chip-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.gv-commit-note{font-size:10px;line-height:1.45;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.gv-commit-ok{color:var(--dsw-alias-state-success-primary)}
.gv-commit-error{color:var(--dsw-alias-state-error-primary)}
.gv-pane-center{flex:1 1 auto;min-width:280px;background:var(--dsw-alias-bg-base)}
.gv-pane-right{flex:0 0 auto;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1)}
.gv-main-empty{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;text-align:center;color:var(--dsw-alias-label-secondary)}
.gv-main-empty svg{opacity:.7}
.gv-main-compact{flex-direction:column}
.gv-compact-top{flex:1;min-height:0;display:flex}
.gv-compact-bottom{flex:0 0 44%;min-height:0;display:flex;border-top:1px solid var(--dsw-alias-border-l1)}
.gv-compact-bottom .gv-pane-right{border-left:0;flex:1;width:auto}
.gv-split{flex:0 0 6px;position:relative;cursor:col-resize;touch-action:none;outline:none;background:transparent}
.gv-split::before{content:'';position:absolute;top:0;bottom:0;left:2px;width:2px;background:transparent;transition:background .12s}
.gv-split:hover::before,.gv-split:focus-visible::before,.gv-split-active::before{background:var(--dsw-alias-brand-primary)}
.gv-split-grip{position:absolute;top:50%;left:0;right:0;height:24px;transform:translateY(-50%);border-radius:2px}
.gv-split:focus-visible .gv-split-grip{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-split-row{flex:0 0 7px;cursor:row-resize;background:var(--dsw-alias-bg-base);border-top:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-split-row::before{top:2px;bottom:auto;left:0;right:0;width:auto;height:1px}
.gv-split-row .gv-split-grip{top:0;bottom:0;left:50%;right:auto;width:32px;height:auto;transform:translateX(-50%)}
.gv-log{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.gv-scopebar{flex:none;display:flex;align-items:center;gap:6px;height:30px;padding:0 10px 0 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.gv-scope-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.gv-scope-clear{display:inline-flex;align-items:center;gap:4px;flex:none;height:22px;padding:0 7px;border:1px solid var(--dsw-alias-border-l1);border-radius:5px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.gv-scope-clear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.gv-scroll{flex:1;min-height:0;overflow:auto;position:relative;scrollbar-gutter:stable}
.gv-thead,.gv-row{display:grid;grid-template-columns:var(--gv-cols);align-items:center;column-gap:10px;padding:0 12px}
.gv-thead{position:sticky;top:0;z-index:3;height:27px;background:var(--dsw-alias-bg-base);border-bottom:1px solid var(--dsw-alias-border-l1);font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.gv-row{height:30px;cursor:pointer;border-bottom:1px solid transparent;outline:none;position:relative}
.gv-row-more{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;transition:opacity .1s}
.gv-row:hover .gv-row-more,.gv-row-more:focus-visible{opacity:1}
.gv-row-more:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.gv-menu{position:fixed;z-index:70;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 16px 40px rgba(0,0,0,.28);animation:gv-pop .1s ease-out}
.gv-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-menu-item:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.gv-menu-item:disabled{opacity:.4;cursor:default}
.gv-menu-danger{color:var(--dsw-alias-state-error-primary)}
.gv-menu-label{flex:none;white-space:nowrap}
.gv-menu-hint{margin-left:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:10.5px}
.gv-menu-sep{height:1px;margin:4px 4px;background:var(--dsw-alias-border-l1)}
.gv-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-row-selected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent)}
.gv-row-selected:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent)}
.gv-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-row-dim{opacity:.32}
.gv-row-dim:hover{opacity:.6}
.gv-graphcell{display:block;overflow:hidden;height:30px}
.gv-graph{display:block;overflow:visible}
.gv-subjectcell{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
.gv-subject{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-ref{display:inline-flex;align-items:center;flex:none;max-width:150px;height:17px;padding:0 6px;border:1px solid transparent;border-radius:9px;font-size:10.5px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-ref-branch{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent);color:var(--dsw-alias-label-primary)}
.gv-ref-head{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 76%, #000);border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 76%, #000);color:#fff;font-weight:600}
.gv-ref-tag{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent);border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 34%, transparent);color:var(--dsw-alias-label-primary)}
.gv-ref-remote{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.gv-author,.gv-date,.gv-hash{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gv-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}
.gv-state{display:flex;flex-direction:column;align-items:center;gap:8px;padding:56px 24px;text-align:center;color:var(--dsw-alias-label-secondary)}
.gv-state svg{color:var(--dsw-alias-label-secondary);opacity:.7}
.gv-state-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.gv-state-text{font-size:12px;max-width:360px;line-height:1.55}
.gv-loading{display:flex;align-items:center;gap:8px;padding:40px 24px;color:var(--dsw-alias-label-secondary);font-size:12px;justify-content:center}
.gv-spinner{width:14px;height:14px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:gv-spin .8s linear infinite;flex:none}
@keyframes gv-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.gv-spinner{animation-duration:2.4s}}
.gv-statusbar{flex:none;display:flex;align-items:center;gap:10px;height:26px;padding:0 12px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden}
.gv-status-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl;text-align:left;min-width:0}
.gv-status-item{flex:none;white-space:nowrap}
.gv-status-ahead{color:var(--dsw-alias-state-success-primary)}
.gv-status-behind{color:var(--dsw-alias-state-warn-primary)}
.gv-status-op{color:var(--dsw-alias-brand-primary);font-weight:600}
.gv-status-busy{margin-left:auto;display:inline-flex;align-items:center}
.gv-inline-spin{width:10px;height:10px;border:1.5px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:gv-spin .8s linear infinite;display:inline-block}
.gv-tree{flex:1;min-height:0;display:flex;flex-direction:column}
.gv-tree-head{flex:none;height:38px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12.5px;font-weight:600}
.gv-tree-rootname{font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}
.gv-tree-scroll{flex:1;min-height:0;overflow:auto;padding:4px 0 10px}
.gv-tree-row{display:flex;align-items:center;gap:5px;height:26px;padding-left:8px;padding-right:8px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-primary);white-space:nowrap;outline:none}
.gv-tree-row:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-tree-row.gv-tree-selected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent)}
.gv-tree-row:focus-visible{box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}
.gv-tree-row>svg{flex:none;color:var(--dsw-alias-label-secondary)}
.gv-tree-root{font-weight:500}
.gv-chevron{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
.gv-chevron svg{transition:transform .12s}
.gv-chevron-open svg{transform:rotate(90deg)}
.gv-chevron-space{width:16px;flex:none}
.gv-tree-name{overflow:hidden;text-overflow:ellipsis}
.gv-tree-spinner{width:10px;height:10px;border:1.5px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-brand-primary);border-radius:50%;animation:gv-spin .8s linear infinite;flex:none;margin-left:auto}
.gv-tree-refmode{color:var(--dsw-alias-brand-primary)}
.gv-tree-status{font:600 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:1px 3px;border-radius:3px;flex:none;margin-left:4px;letter-spacing:.02em}
.gv-tone-modified{color:var(--dsw-alias-state-warn-primary)}
.gv-tone-untracked{color:var(--dsw-alias-state-success-primary)}
.gv-tone-added{color:var(--dsw-alias-state-success-primary)}
.gv-tone-deleted{color:var(--dsw-alias-state-error-primary)}
.gv-tone-conflict{color:var(--dsw-alias-state-error-primary)}
.gv-tone-staged{color:var(--dsw-alias-brand-primary)}
.gv-tree-dirty{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);flex:none;margin-left:auto}
.gv-tree-error-mark{margin-left:auto;color:var(--dsw-alias-state-error-primary);font-weight:700;font-size:10px}
.gv-tree-state{padding:10px 12px;font-size:11.5px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.gv-tree .gv-loading{padding:20px 10px}
.gv-details{flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--dsw-alias-bg-layer-1)}
.gv-details-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;height:38px;padding:0 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12.5px;font-weight:600}
.gv-head-scope{font-size:10.5px;font-weight:400;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);border-radius:8px;padding:1px 7px;white-space:nowrap}
.gv-details-body{flex:1;min-height:0;overflow:auto;padding:12px 14px 18px}
.gv-details-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 14px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.gv-details-empty-icon{opacity:.6}
.gv-details-error{display:flex;flex-direction:column;gap:6px;padding:12px;border:1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);border-radius:8px;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent)}
.gv-detail-hashrow{display:flex;align-items:center;gap:6px}
.gv-detail-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:4px;padding:2px 6px}
.gv-copy{width:24px;height:24px}
.gv-copied{font-size:11px;color:var(--dsw-alias-state-success-primary)}
.gv-detail-refs{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.gv-detail-subject{font-size:14px;font-weight:600;line-height:1.45;margin:10px 0 0;overflow-wrap:anywhere}
.gv-detail-message{margin:8px 0 0;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto}
.gv-meta{display:grid;grid-template-columns:62px minmax(0,1fr);gap:6px 10px;margin:14px 0 0;font-size:12px}
.gv-meta dt{color:var(--dsw-alias-label-secondary)}
.gv-meta dd{margin:0;min-width:0;overflow-wrap:anywhere}
.gv-meta-mail{color:var(--dsw-alias-label-secondary);font-size:11.5px}
.gv-parents{display:flex;flex-wrap:wrap;gap:5px}
.gv-parent{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;padding:1px 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:4px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer}
.gv-parent:hover{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.gv-section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:18px 0 6px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.gv-filter-note{font-size:10.5px;font-weight:400;color:var(--dsw-alias-brand-primary);white-space:nowrap}
.gv-muted{font-size:12px;color:var(--dsw-alias-label-secondary);padding:6px 0}
.gv-files{display:flex;flex-direction:column;gap:1px}
.gv-file{display:flex;align-items:center;gap:8px;min-width:0;width:100%;padding:5px 6px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.gv-file:hover{background:var(--dsw-alias-bg-layer-2)}
.gv-file:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.gv-file-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr}
.gv-file-stat{flex:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px}
.gv-file-binary{color:var(--dsw-alias-label-secondary)}
.gv-file-compare{flex:none;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);opacity:.6;transition:opacity .12s,background .12s}
.gv-file:hover .gv-file-compare,.gv-file:focus-visible .gv-file-compare{opacity:1;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.gv-add{color:var(--dsw-alias-state-success-primary)}
.gv-del{color:var(--dsw-alias-state-error-primary)}
.gv-status{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:700}
.gv-st-add{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent);color:var(--dsw-alias-state-success-primary)}
.gv-st-mod{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent);color:var(--dsw-alias-state-warn-primary)}
.gv-st-del{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent);color:var(--dsw-alias-state-error-primary)}
.gv-st-ren{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);color:var(--dsw-alias-brand-primary)}
.gv-st-other{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.gv-dialog-mask{z-index:10020}
.gv-dialog{width:min(430px,94vw);max-height:min(560px,88vh);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden}
.gv-dialog-wide{width:min(560px,94vw)}
.gv-dialog-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;height:44px;padding:0 10px 0 15px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-dialog-title{font-size:13px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-dialog-body{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:11px;padding:14px 15px}
.gv-dialog-text{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;overflow-wrap:anywhere}
.gv-dialog-label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:500;color:var(--dsw-alias-label-secondary)}
.gv-dialog-input{width:100%;height:32px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;outline:none}
.gv-dialog-input:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}
.gv-dialog-check{display:flex;align-items:flex-start;gap:7px;font-size:11.5px;line-height:1.45;color:var(--dsw-alias-label-secondary);cursor:pointer}
.gv-dialog-check input{flex:none;margin:1px 0 0;accent-color:var(--dsw-alias-brand-primary)}
.gv-dialog-error{padding:7px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;overflow:auto}
.gv-dialog-actions{flex:none;display:flex;justify-content:flex-end;gap:8px;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.gv-modal-mask{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:20px}
.gv-modal-mask,.gv-modal-mask *{box-sizing:border-box}
.gv-modal{width:min(1280px,94vw);height:min(820px,88vh);display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.35);overflow:hidden}
.gv-modal-head{flex:none;display:flex;align-items:center;gap:8px;height:46px;padding:0 12px 0 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-modal-heading{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
.gv-modal-path{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-modal-hash{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);padding:1px 6px;border-radius:4px;flex:none}
.gv-modal-body{flex:1;min-height:0;display:flex;flex-direction:column;padding:12px}
.gv-modal-empty{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);font-size:12px}
.gv-modal-foot{flex:none;padding:0 4px 2px;font-size:11px;color:var(--dsw-alias-state-warn-primary)}
.gv-compare{flex:1;min-height:0;display:flex;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;background:var(--dsw-alias-bg-base)}
.gv-cside{flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--dsw-alias-border-l1)}
.gv-cside:last-child{border-right:0}
.gv-ctitle{flex:none;height:30px;display:flex;align-items:center;padding:0 10px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.gv-clines{flex:1;min-height:0;overflow:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.6;background:var(--dsw-alias-bg-base)}
.gv-crow{display:flex;min-width:max-content;min-height:1.6em}
.gv-cnum{position:sticky;left:0;flex:0 0 46px;text-align:right;padding:0 10px 0 6px;color:var(--dsw-alias-label-secondary);opacity:.75;user-select:none;background:inherit}
.gv-ccode{flex:1;padding:0 14px 0 10px;white-space:pre;color:var(--dsw-alias-label-primary)}
.gv-crow-ctx{background:var(--dsw-alias-bg-base)}
.gv-crow-del{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent)}
.gv-crow-add{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent)}
.gv-crow-blank{background:var(--dsw-alias-bg-base);opacity:.45}
.gv-crow-hunk{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);color:var(--dsw-alias-brand-primary);font-weight:600}
.gv-chunk{padding:0 10px;white-space:pre}
.gv-loading{justify-content:center}
@container (max-width: 250px){
.gv-change-tags{display:none}
.gv-commit-actions .gv-button svg{display:none}
.gv-commit-keyhint{display:none}
}
@container (max-width: 190px){
.gv-commit-btn{padding:0 4px;gap:4px;font-size:11px}
.gv-commit-actions .gv-button svg{display:none}
.gv-sum-chip{padding:0 5px}
}
`
