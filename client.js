window.__ModuleLoader__.load({
  id: '@local/dsh-git-view',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

    // src/client/index.tsx
    var index_exports = {};
    __export(index_exports, {
      PANEL_ID: () => PANEL_ID,
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(index_exports);

    // src/client/app.tsx
    var React14 = __toESM(require("react"), 1);

    // src/client/api.ts
    var DEFAULT_BASE = "api/git-view";
    var GitApiError = class extends Error {
      constructor(message, status, conflict = false, state = null) {
        super(message);
        __publicField(this, "status");
        __publicField(this, "conflict");
        __publicField(this, "state");
        this.name = "GitApiError";
        this.status = status;
        this.conflict = conflict;
        this.state = state;
      }
    };
    var GitApi = class {
      constructor(base = DEFAULT_BASE) {
        __publicField(this, "base");
        this.base = base;
      }
      /**
       * GET one read action.
       * @param action - action name (`status`, `log`, ...).
       * @param params - query parameters; `undefined` values are dropped.
       * @param signal - cancellation.
       * @returns the parsed payload.
       */
      async read(action, params = {}, signal) {
        const search = new URLSearchParams({ action });
        for (const [key, value] of Object.entries(params)) {
          if (value === void 0 || value === "") continue;
          search.set(key, String(value));
        }
        const response = await fetch(`${this.base}?${search.toString()}`, {
          signal,
          credentials: "same-origin",
          headers: { accept: "application/json" }
        });
        return parseResponse(response);
      }
      /**
       * POST one write action.
       * @param body - request payload.
       * @returns the parsed payload.
       */
      async write(body) {
        const response = await fetch(`${this.base}/write`, {
          method: "POST",
          credentials: "same-origin",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        return parseResponse(response);
      }
      /**
       * Poll one remote job until it settles.
       * @param repoId - workspace id.
       * @param jobId - job id returned by `remote`.
       * @param onUpdate - called with every snapshot while running.
       * @param signal - cancellation.
       * @returns the final snapshot.
       */
      async pollRemote(repoId, jobId, onUpdate, signal) {
        for (; ; ) {
          if (signal?.aborted) throw new DOMException("aborted", "AbortError");
          const snapshot = await this.read("remoteJob", { repo: repoId, id: jobId }, signal);
          onUpdate(snapshot);
          if (snapshot.state !== "running" && snapshot.state !== "cancelling") return snapshot;
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }
    };
    async function parseResponse(response) {
      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          throw new GitApiError(text.slice(0, 300) || `HTTP ${response.status}`, response.status);
        }
      }
      if (!response.ok) {
        const body = payload || {};
        throw new GitApiError(
          body.error || `HTTP ${response.status}`,
          response.status,
          body.conflict === true,
          body.state ?? null
        );
      }
      return payload;
    }
    function isAbort(error) {
      return Boolean(error) && error.name === "AbortError";
    }
    function errorText(error) {
      if (!error) return "";
      if (error instanceof Error) return error.message;
      return String(error);
    }

    // src/client/layout.ts
    var MIN_LEFT = 160;
    var MAX_LEFT = 460;
    var MIN_RIGHT = 240;
    var MAX_RIGHT = 660;
    var MIN_CHANGES = 300;
    var DEFAULT_CHANGES = 360;
    var LAYOUT_DEFAULTS = {
      left: 280,
      right: 360,
      changes: DEFAULT_CHANGES
    };
    var VERSION = "v2";
    var KEY_PREFIX = `dsh.git-view.${VERSION}`;
    var REPO_KEY = "dsh.git-view.repo";
    function clamp(value, min, max) {
      if (!Number.isFinite(value)) return min;
      return Math.min(max, Math.max(min, Math.round(value)));
    }
    var LayoutStore = class {
      constructor(storage) {
        __publicField(this, "storage");
        this.storage = storage === void 0 ? safeStorage() : storage;
      }
      /**
       * Read one persisted width.
       * @param key - which pane.
       * @param min - lower clamp.
       * @param max - upper clamp.
       * @returns the width in pixels, falling back to the default.
       */
      readWidth(key, min, max) {
        const fallback = LAYOUT_DEFAULTS[key];
        if (!this.storage) return clamp(fallback, min, max);
        const raw = this.storage.getItem(`${KEY_PREFIX}.${key}`);
        const parsed = raw === null ? Number.NaN : Number(raw);
        return clamp(Number.isFinite(parsed) ? parsed : fallback, min, max);
      }
      /** Persist one width. */
      writeWidth(key, value) {
        try {
          this.storage?.setItem(`${KEY_PREFIX}.${key}`, String(Math.round(value)));
        } catch {
        }
      }
      /** Last opened workspace id. */
      readRepo() {
        try {
          return this.storage?.getItem(REPO_KEY) || "";
        } catch {
          return "";
        }
      }
      /** Remember the opened workspace. */
      writeRepo(id) {
        try {
          if (id) this.storage?.setItem(REPO_KEY, id);
        } catch {
        }
      }
    };
    function safeStorage() {
      try {
        return typeof window !== "undefined" ? window.localStorage : null;
      } catch {
        return null;
      }
    }

    // src/client/format.ts
    function statusLabel(status, t) {
      switch (status) {
        case "A":
          return t("statusAdded");
        case "M":
          return t("statusModified");
        case "D":
          return t("statusDeleted");
        case "R":
          return t("statusRenamed");
        case "T":
          return t("statusTypeChanged");
        case "U":
          return t("statusUnmerged");
        default:
          return t("statusUnknown");
      }
    }
    function statusClass(status) {
      if (status === "A") return "gv-st-add";
      if (status === "D") return "gv-st-del";
      if (status === "M") return "gv-st-mod";
      if (status === "R") return "gv-st-ren";
      return "gv-st-other";
    }
    function changeTone(entry) {
      if (entry.conflict) return "conflict";
      if (entry.untracked) return "add";
      const letter = entry.x !== " " ? entry.x : entry.y;
      if (letter === "A") return "add";
      if (letter === "D") return "del";
      if (letter === "R") return "ren";
      if (letter === "U") return "conflict";
      return "mod";
    }
    function changeBadge(entry) {
      if (entry.untracked) return "?";
      if (entry.conflict) return "U";
      return entry.x !== " " ? entry.x : entry.y;
    }
    function changeTags(entry, t) {
      if (entry.conflict) return [{ tone: "conflict", label: t("conflictHint") }];
      if (entry.untracked) return [{ tone: "untracked", label: t("untracked") }];
      const tags = [];
      if (entry.staged) tags.push({ tone: "staged", label: t("staged") });
      if (entry.unstaged) {
        const letter = entry.y !== " " ? entry.y : entry.x;
        const label = letter === "D" ? t("deletedHint") : letter === "R" ? t("renamedHint") : t("modifiedHint");
        tags.push({ tone: "modified", label });
      }
      if (tags.length === 0) tags.push({ tone: "modified", label: t("modifiedHint") });
      return tags.slice(0, 2);
    }
    function summarizeChanges(entries) {
      const summary = { untracked: 0, staged: 0, modified: 0, conflict: 0, deleted: 0 };
      for (const entry of entries) {
        if (entry.conflict) {
          summary.conflict += 1;
          continue;
        }
        if (entry.untracked) {
          summary.untracked += 1;
          continue;
        }
        if (entry.staged) summary.staged += 1;
        if (entry.unstaged) summary.modified += 1;
        if (entry.status === "D") summary.deleted += 1;
      }
      return summary;
    }
    function operationLabel(operation, t) {
      if (operation === "merge") return t("operationMerge");
      if (operation === "rebase") return t("operationRebase");
      if (operation === "cherry-pick") return t("operationCherryPick");
      if (operation === "revert") return t("operationRevert");
      if (operation === "bisect") return t("operationBisect");
      return operation;
    }
    function historyLabelKey(op) {
      if (op === "undo") return "undoCommit";
      if (op === "revert") return "revertCommit";
      if (op === "cherryPick") return "cherryPickCommit";
      return "checkoutCommit";
    }
    function historyHintKey(op) {
      if (op === "undo") return "undoCommitHint";
      if (op === "revert") return "revertCommitHint";
      if (op === "cherryPick") return "cherryPickCommitHint";
      return "checkoutCommitHint";
    }
    function remoteOpKey(op) {
      if (op === "fetch") return "fetch";
      if (op === "pull") return "pull";
      return "push";
    }
    function remoteDoneKey(op) {
      if (op === "fetch") return "fetchDone";
      if (op === "pull") return "pullDone";
      return "pushDone";
    }
    function localNameForRemote(name) {
      const parts = String(name || "").split("/");
      return parts.length > 1 ? parts.slice(1).join("/") : String(name || "");
    }
    function looksLikeBranchName(value) {
      const name = String(value || "").trim();
      return name.length > 0 && name.length <= 200 && !/[\u0000-\u0020\u007f~^:?*\[\\]/.test(name) && !name.startsWith("-") && !name.startsWith(".") && !name.startsWith("refs/") && !name.endsWith("/") && !name.endsWith(".") && !name.endsWith(".lock") && !name.includes("..") && !name.includes("//") && !name.includes("@{");
    }
    function shortDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value || "";
      const pad = (part) => String(part).padStart(2, "0");
      const clock = `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      const now = /* @__PURE__ */ new Date();
      return date.getFullYear() === now.getFullYear() ? clock : `${date.getFullYear()}-${clock}`;
    }
    var fullDateFormatter = new Intl.DateTimeFormat(void 0, { dateStyle: "medium", timeStyle: "short" });
    function fullDate(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value || "";
      return fullDateFormatter.format(date);
    }
    function uiLocale() {
      try {
        return document.documentElement.lang || navigator.language || "en";
      } catch {
        return "en";
      }
    }

    // src/client/icons.tsx
    var React = __toESM(require("react"), 1);
    var h = React.createElement;
    var FILE_VISUALS = {
      ts: ["#3b82f6", "code"],
      tsx: ["#3b82f6", "code"],
      js: ["#eab308", "code"],
      jsx: ["#eab308", "code"],
      mjs: ["#eab308", "code"],
      cjs: ["#eab308", "code"],
      java: ["#f97316", "code"],
      kt: ["#a855f7", "code"],
      py: ["#60a5fa", "code"],
      rb: ["#ef4444", "code"],
      go: ["#06b6d4", "code"],
      rs: ["#f97316", "code"],
      c: ["#3b82f6", "code"],
      h: ["#8b5cf6", "code"],
      cpp: ["#3b82f6", "code"],
      cs: ["#a855f7", "code"],
      php: ["#8b5cf6", "code"],
      swift: ["#f97316", "code"],
      vue: ["#10b981", "code"],
      svelte: ["#ef4444", "code"],
      md: ["#7dd3fc", "doc"],
      mdx: ["#7dd3fc", "doc"],
      txt: ["#94a3b8", "doc"],
      rst: ["#94a3b8", "doc"],
      json: ["#eab308", "data"],
      jsonc: ["#eab308", "data"],
      yml: ["#a855f7", "data"],
      yaml: ["#a855f7", "data"],
      toml: ["#a855f7", "data"],
      ini: ["#a855f7", "data"],
      xml: ["#f59e0b", "data"],
      sql: ["#f59e0b", "data"],
      csv: ["#22c55e", "data"],
      css: ["#ec4899", "style"],
      scss: ["#ec4899", "style"],
      sass: ["#ec4899", "style"],
      less: ["#ec4899", "style"],
      html: ["#ef4444", "code"],
      htm: ["#ef4444", "code"],
      sh: ["#22c55e", "shell"],
      bash: ["#22c55e", "shell"],
      zsh: ["#22c55e", "shell"],
      ps1: ["#22c55e", "shell"],
      bat: ["#22c55e", "shell"],
      cmd: ["#22c55e", "shell"],
      png: ["#a855f7", "image"],
      jpg: ["#a855f7", "image"],
      jpeg: ["#a855f7", "image"],
      gif: ["#a855f7", "image"],
      webp: ["#a855f7", "image"],
      svg: ["#a855f7", "image"],
      ico: ["#a855f7", "image"],
      lock: ["#94a3b8", "file"],
      gitignore: ["#94a3b8", "file"],
      env: ["#eab308", "file"]
    };
    function fileVisual(name) {
      const lower = String(name || "").toLowerCase();
      const dot = lower.lastIndexOf(".");
      const ext = dot >= 0 ? lower.slice(dot + 1) : lower;
      const found = FILE_VISUALS[ext];
      if (found) return { color: found[0], kind: found[1] };
      return { color: "#8b96a8", kind: "file" };
    }
    function IconGraphMark({ size = 14 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", { d: "M6 6v12M6 12c0 3 2.5 4 6 4h4", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }),
        h("circle", { cx: 6, cy: 4.5, r: 2.2, fill: "currentColor" }),
        h("circle", { cx: 6, cy: 19.5, r: 2.2, fill: "currentColor" }),
        h("circle", { cx: 17, cy: 12, r: 2.2, fill: "currentColor" })
      );
    }
    function IconRefresh({ size = 14 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5",
          stroke: "currentColor",
          strokeWidth: 1.8,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    function IconSearch({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("circle", { cx: 10.5, cy: 10.5, r: 6.5, stroke: "currentColor", strokeWidth: 1.8 }),
        h("path", { d: "M15.5 15.5 21 21", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" })
      );
    }
    function IconCopy({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("rect", { x: 9, y: 9, width: 11, height: 11, rx: 2, stroke: "currentColor", strokeWidth: 1.6 }),
        h("path", {
          d: "M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2.5 2.5 0 0 0-2.5 2.5V13",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinecap: "round"
        })
      );
    }
    function IconClose({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", { d: "M6 6l12 12M18 6 6 18", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" })
      );
    }
    function IconChevron({ size = 10 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", { d: "M9 5l7 7-7 7", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }
    function IconFolder({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9z",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinejoin: "round"
        })
      );
    }
    function IconHome({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M4 10.5 12 4l8 6.5M6.5 9.5V20h11V9.5",
          stroke: "currentColor",
          strokeWidth: 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    function IconCompare({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("rect", { x: 2.8, y: 4.5, width: 6.6, height: 15, rx: 1.6, stroke: "currentColor", strokeWidth: 1.5 }),
        h("rect", { x: 14.6, y: 4.5, width: 6.6, height: 15, rx: 1.6, stroke: "currentColor", strokeWidth: 1.5 }),
        h("path", { d: "M10.6 9 8.8 12l1.8 3M13.4 9l1.8 3-1.8 3", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }
    function IconBranch({ size = 12 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("circle", { cx: 6, cy: 5, r: 2.2, stroke: "currentColor", strokeWidth: 1.7 }),
        h("circle", { cx: 6, cy: 19, r: 2.2, stroke: "currentColor", strokeWidth: 1.7 }),
        h("circle", { cx: 18, cy: 8, r: 2.2, stroke: "currentColor", strokeWidth: 1.7 }),
        h("path", { d: "M6 7.2v9.6M6 12c0 3.4 2.6 4.4 6 4.4h3.6M6 9c0 3.3 3.6 4.4 7.2 4.4H18", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" })
      );
    }
    function IconTag({ size = 12 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M3.8 11.4V5.2c0-.8.6-1.4 1.4-1.4h6.2c.4 0 .8.2 1 .4l7.4 7.4c.5.5.5 1.4 0 1.9l-5.9 5.9c-.5.5-1.4.5-1.9 0L4.2 12.4a1.4 1.4 0 0 1-.4-1z",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinejoin: "round"
        }),
        h("circle", { cx: 8, cy: 8, r: 1.3, fill: "currentColor" })
      );
    }
    function IconSparkles({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M12 3.5l1.7 4.3 4.3 1.7-4.3 1.7L12 15.5l-1.7-4.3L6 9.5l4.3-1.7L12 3.5zM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1zM5 14.5l.6 1.4 1.4.6-1.4.6L5 18.5l-.6-1.4L3 16.5l1.4-.6.6-1.4z",
          fill: "currentColor"
        })
      );
    }
    function IconCheck({ size = 12 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", { d: "M5 12.5 10 17l9-10", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }
    function IconChevronDown({ size = 11 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }
    function IconMore({ size = 15 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("circle", { cx: 5, cy: 12, r: 1.7, fill: "currentColor" }),
        h("circle", { cx: 12, cy: 12, r: 1.7, fill: "currentColor" }),
        h("circle", { cx: 19, cy: 12, r: 1.7, fill: "currentColor" })
      );
    }
    function IconAlert({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M12 4.5 21 19H3L12 4.5z",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinejoin: "round"
        }),
        h("path", { d: "M12 10v4.2", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" }),
        h("circle", { cx: 12, cy: 17, r: 1, fill: "currentColor" })
      );
    }
    function IconUndo({ size = 13 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M9 7 4.5 11.5 9 16",
          stroke: "currentColor",
          strokeWidth: 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        }),
        h("path", {
          d: "M5 11.5h8.2a5.3 5.3 0 0 1 0 10.6H10",
          stroke: "currentColor",
          strokeWidth: 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    function IconArrowUp({ size = 14 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M12 20V5m0 0-6 6m6-6 6 6",
          stroke: "currentColor",
          strokeWidth: 1.8,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    function IconArrowDown({ size = 14 }) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true },
        h("path", {
          d: "M12 4v15m0 0 6-6m-6 6-6-6",
          stroke: "currentColor",
          strokeWidth: 1.8,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }
    function GitViewIcon({ size = 18 }) {
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          "aria-hidden": true,
          focusable: false
        },
        h("path", {
          d: "M6.5 7.5v9M6.5 12c0 3.2 2.6 4 6 4h3.5M6.5 9c0 3 3.4 4.2 6.8 4.2",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinecap: "round"
        }),
        h("circle", { cx: 6.5, cy: 5, r: 2.1, stroke: "currentColor", strokeWidth: 1.6 }),
        h("circle", { cx: 6.5, cy: 19, r: 2.1, stroke: "currentColor", strokeWidth: 1.6 }),
        h("circle", { cx: 17.5, cy: 7.5, r: 2.1, stroke: "currentColor", strokeWidth: 1.6 }),
        h("circle", { cx: 17.5, cy: 16, r: 2.1, stroke: "currentColor", strokeWidth: 1.6 })
      );
    }
    function FileIcon({ name, isDir = false, open = false, size = 13 }) {
      if (isDir) {
        const color = open ? "#f0b429" : "#e0a33e";
        return h(
          "svg",
          { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, style: { color } },
          h("path", {
            d: open ? "M3.5 9V6.8A1.3 1.3 0 0 1 4.8 5.5h4.1l1.7 1.8H18a1.3 1.3 0 0 1 1.3 1.3V10H7.1L4.6 18H3.5V9z" : "M3.5 7.5A1.5 1.5 0 0 1 5 6h4l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5v-9z",
            fill: "currentColor",
            fillOpacity: 0.18,
            stroke: "currentColor",
            strokeWidth: 1.4,
            strokeLinejoin: "round"
          }),
          open ? h("path", {
            d: "M4.6 18l2.5-8h13.4l-2.5 8H4.6z",
            fill: "currentColor",
            fillOpacity: 0.1,
            stroke: "currentColor",
            strokeWidth: 1.3,
            strokeLinejoin: "round"
          }) : null
        );
      }
      const visual = fileVisual(name);
      const glyphs = [];
      if (visual.kind === "code") {
        glyphs.push(
          h("path", {
            key: "code",
            d: "M10.2 13.2 8.6 15l1.6 1.8M13.8 13.2 15.4 15l-1.6 1.8",
            stroke: "currentColor",
            strokeWidth: 1.2,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          })
        );
      } else if (visual.kind === "doc") {
        glyphs.push(
          h("path", {
            key: "doc",
            d: "M9.2 13.2h6M9.2 16h4.2",
            stroke: "currentColor",
            strokeWidth: 1.2,
            strokeLinecap: "round"
          })
        );
      } else if (visual.kind === "data") {
        glyphs.push(
          h("path", {
            key: "data",
            d: "M10.2 13c-.8 0-1 .5-1 1s.2 1-1 1c1.2 0 1 .5 1 1s.2 1 1 1M14.2 13c.8 0 1 .5 1 1s-.2 1 1 1c-1.2 0-1 .5-1 1s-.2 1-1 1",
            stroke: "currentColor",
            strokeWidth: 1.1,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          })
        );
      } else if (visual.kind === "image") {
        glyphs.push(
          h("circle", { key: "img-sun", cx: 10, cy: 13.2, r: 1, fill: "currentColor" }),
          h("path", {
            key: "img-hill",
            d: "M8.8 17.2l2-2 1.4 1.4 1.5-1.8 1.6 2.4",
            stroke: "currentColor",
            strokeWidth: 1.1,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          })
        );
      } else if (visual.kind === "style") {
        glyphs.push(
          h("path", {
            key: "style",
            d: "M9.6 13h5M9.6 15.2h3.4M9.6 17.4h4.6",
            stroke: "currentColor",
            strokeWidth: 1.1,
            strokeLinecap: "round"
          })
        );
      } else if (visual.kind === "shell") {
        glyphs.push(
          h("path", {
            key: "shell",
            d: "M9.4 13.4 11 15l-1.6 1.6M12.6 16.8h2.4",
            stroke: "currentColor",
            strokeWidth: 1.1,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          })
        );
      }
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, style: { color: visual.color } },
        h("path", {
          d: "M6 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5z",
          fill: "currentColor",
          fillOpacity: 0.13,
          stroke: "currentColor",
          strokeWidth: 1.3,
          strokeLinejoin: "round"
        }),
        h("path", {
          d: "M13 3.5V9h5",
          stroke: "currentColor",
          strokeWidth: 1.3,
          strokeLinejoin: "round"
        }),
        glyphs
      );
    }

    // src/client/notices.ts
    var NoticeCenter = class {
      constructor(durationMs = 6e3) {
        __publicField(this, "notice", null);
        __publicField(this, "timer", null);
        __publicField(this, "listeners", /* @__PURE__ */ new Set());
        __publicField(this, "durationMs");
        this.durationMs = durationMs;
      }
      /** Current notice, if any. */
      get current() {
        return this.notice;
      }
      /** Replace the notice and restart the dismiss timer. */
      show(text, kind = "ok") {
        if (!text) return;
        this.notice = { text, kind };
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.clear(), this.durationMs);
        this.emit();
      }
      /** Dismiss immediately. */
      clear() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        if (this.notice === null) return;
        this.notice = null;
        this.emit();
      }
      /** Subscribe to notice changes. */
      subscribe(listener) {
        this.listeners.add(listener);
        return () => {
          this.listeners.delete(listener);
        };
      }
      emit() {
        for (const listener of this.listeners) listener(this.notice);
      }
    };

    // src/client/remote.ts
    var RemoteRunner = class {
      constructor(api, onUpdate) {
        __publicField(this, "api");
        __publicField(this, "onUpdate");
        __publicField(this, "currentId", "");
        this.api = api;
        this.onUpdate = onUpdate;
      }
      /** Whether a job started by this runner is still running. */
      get running() {
        return Boolean(this.currentId);
      }
      /**
       * Start one remote operation and poll until it settles.
       * @param repoId - workspace id.
       * @param op - fetch, pull, or push.
       * @param options - rebase / force-with-lease / tags.
       * @param signal - cancellation of the polling itself.
       * @returns the final snapshot.
       */
      async run(repoId, op, options = {}, signal) {
        const start = await this.start(repoId, op, options);
        try {
          return await this.poll(repoId, start.id, signal);
        } finally {
          this.currentId = "";
        }
      }
      /**
       * Start the job only, so the caller can show its progress strip before the
       * first poll round-trip.
       * @param repoId - workspace id.
       * @param op - fetch, pull, or push.
       * @param options - rebase / force-with-lease / tags.
       * @returns the job id and label.
       */
      async start(repoId, op, options = {}) {
        const start = await this.api.write({ repo: repoId, action: "remote", op, ...options });
        this.currentId = start.id;
        return start;
      }
      /**
       * Poll a job started by this runner until it settles.
       * @param repoId - workspace id.
       * @param jobId - job id.
       * @param signal - cancellation.
       * @returns the final snapshot.
       */
      async poll(repoId, jobId, signal) {
        return this.api.pollRemote(repoId, jobId, this.onUpdate, signal);
      }
      /** Forget the current job id (after polling ends). */
      clear() {
        this.currentId = "";
      }
      /**
       * Ask the running job to stop. Safe to call when nothing is running.
       * @param repoId - workspace id.
       */
      async cancel(repoId) {
        if (!this.currentId) return;
        try {
          await this.api.write({ repo: repoId, action: "remoteCancel", id: this.currentId });
        } catch {
        }
      }
    };

    // src/client/styles.ts
    var PANEL_CSS = `
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
    `;

    // src/client/ui/ActionDialog.tsx
    var React2 = __toESM(require("react"), 1);
    var ReactDOM = __toESM(require("react-dom"), 1);
    var h2 = React2.createElement;
    function ActionDialog({ t, dialog, busy, error, onClose, onConfirm }) {
      const [value, setValue] = React2.useState(dialog.initialValue || "");
      const [checked, setChecked] = React2.useState(Boolean(dialog.checkboxDefault));
      const inputRef = React2.useRef(null);
      const confirmRef = React2.useRef(null);
      const busyRef = React2.useRef(busy);
      busyRef.current = busy;
      React2.useEffect(() => {
        const previous = document.activeElement;
        const node = dialog.input ? inputRef.current : confirmRef.current;
        if (node && typeof node.focus === "function") {
          node.focus();
          if (dialog.input && node instanceof HTMLInputElement) node.select();
        }
        const onKeyDown = (event) => {
          if (event.key === "Escape" && !busyRef.current) {
            event.stopPropagation();
            onClose();
          }
        };
        document.addEventListener("keydown", onKeyDown, true);
        return () => {
          document.removeEventListener("keydown", onKeyDown, true);
          if (previous && typeof previous.focus === "function") previous.focus();
        };
      }, [dialog.input, onClose]);
      const canConfirm = !busy && (!dialog.input || value.trim().length > 0);
      const submit = () => {
        if (!canConfirm) return;
        onConfirm({ value: value.trim(), checked });
      };
      const panel = h2(
        "div",
        { className: "gv-dialog", role: "dialog", "aria-modal": "true", "aria-label": dialog.title },
        h2(
          "div",
          { className: "gv-dialog-head" },
          h2("span", { className: "gv-dialog-title" }, dialog.title),
          h2(
            "button",
            {
              type: "button",
              className: "gv-icon-button gv-icon-xs",
              title: t("close"),
              "aria-label": t("close"),
              onClick: onClose,
              disabled: busy
            },
            h2(IconClose, { size: 13 })
          )
        ),
        h2(
          "div",
          { className: "gv-dialog-body" },
          dialog.description ? h2("p", { className: "gv-dialog-text" }, dialog.description) : null,
          dialog.input ? h2(
            "label",
            { className: "gv-dialog-label" },
            h2("span", null, dialog.label || t("branchName")),
            h2("input", {
              ref: inputRef,
              className: "gv-dialog-input",
              type: "text",
              value,
              placeholder: dialog.placeholder || "",
              spellCheck: false,
              autoComplete: "off",
              disabled: busy,
              onChange: (event) => setValue(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }
            })
          ) : null,
          dialog.checkboxLabel ? h2(
            "label",
            { className: "gv-dialog-check" },
            h2("input", {
              type: "checkbox",
              checked,
              disabled: busy,
              onChange: (event) => setChecked(event.target.checked)
            }),
            h2("span", null, dialog.checkboxLabel)
          ) : null,
          error ? h2("div", { className: "gv-dialog-error" }, error) : null
        ),
        h2(
          "div",
          { className: "gv-dialog-actions" },
          h2(
            "button",
            { type: "button", className: "gv-button gv-button-ghost", onClick: onClose, disabled: busy },
            t("cancel")
          ),
          h2(
            "button",
            {
              type: "button",
              ref: confirmRef,
              className: `gv-button ${dialog.danger ? "gv-button-danger" : "gv-button-primary"}`,
              onClick: submit,
              disabled: !canConfirm
            },
            busy ? h2("span", { className: "gv-inline-spin", "aria-hidden": true }) : null,
            h2("span", null, dialog.confirmLabel || t("confirm"))
          )
        )
      );
      return ReactDOM.createPortal(
        h2(
          "div",
          {
            className: "gv-modal-mask gv-dialog-mask",
            onMouseDown: (event) => {
              if (event.target === event.currentTarget && !busy) onClose();
            }
          },
          panel
        ),
        document.body
      );
    }

    // src/client/ui/PopupMenu.tsx
    var React3 = __toESM(require("react"), 1);
    var ReactDOM2 = __toESM(require("react-dom"), 1);
    var h3 = React3.createElement;
    function PopupMenu({ t, menu, onClose }) {
      const ref = React3.useRef(null);
      React3.useEffect(() => {
        const onPointerDown = (event) => {
          if (ref.current && !ref.current.contains(event.target)) onClose();
        };
        const onKeyDown = (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        };
        document.addEventListener("mousedown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown, true);
        return () => {
          document.removeEventListener("mousedown", onPointerDown, true);
          document.removeEventListener("keydown", onKeyDown, true);
        };
      }, [onClose]);
      const width = 232;
      const height = Math.min(menu.items.length * 30 + 16, 340);
      const left = Math.max(8, Math.min(menu.x, window.innerWidth - width - 8));
      const top = Math.max(8, Math.min(menu.y, window.innerHeight - height - 8));
      return ReactDOM2.createPortal(
        h3(
          "div",
          {
            className: "gv-menu",
            role: "menu",
            "aria-label": t("commitActions"),
            ref,
            style: { left: `${left}px`, top: `${top}px`, minWidth: `${width}px` },
            onMouseDown: (event) => event.stopPropagation()
          },
          menu.items.map(
            (item, index) => item.separator ? h3("div", { key: `sep-${index}`, className: "gv-menu-sep", role: "separator" }) : h3(
              "button",
              {
                key: item.id || `item-${index}`,
                type: "button",
                role: "menuitem",
                className: `gv-menu-item${item.danger ? " gv-menu-danger" : ""}`,
                disabled: item.disabled,
                title: item.hint || item.label,
                onClick: () => {
                  onClose();
                  item.onSelect?.();
                }
              },
              h3("span", { className: "gv-menu-label" }, item.label),
              item.hint ? h3("span", { className: "gv-menu-hint" }, item.hint) : null
            )
          )
        ),
        document.body
      );
    }

    // src/client/ui/ResizeHandle.tsx
    var React4 = __toESM(require("react"), 1);
    var h4 = React4.createElement;
    function ResizeHandle({
      label,
      value,
      min,
      max,
      invert,
      axis = "x",
      onChange,
      onCommit,
      onReset
    }) {
      const [dragging, setDragging] = React4.useState(false);
      const startRef = React4.useRef(null);
      const latestRef = React4.useRef(value);
      latestRef.current = value;
      const rows = axis === "y";
      const clampValue = (next) => Math.min(max, Math.max(min, Math.round(next)));
      const finish = () => {
        if (startRef.current === null) return;
        startRef.current = null;
        setDragging(false);
        if (onCommit) onCommit(latestRef.current);
      };
      const position = (event) => rows ? event.clientY : event.clientX;
      return h4(
        "div",
        {
          className: `gv-split${rows ? " gv-split-row" : ""}${dragging ? " gv-split-active" : ""}`,
          role: "separator",
          "aria-orientation": rows ? "horizontal" : "vertical",
          "aria-label": label,
          "aria-valuenow": Math.round(value),
          "aria-valuemin": min,
          "aria-valuemax": max,
          tabIndex: 0,
          title: label,
          onPointerDown: (event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            startRef.current = { position: position(event), value };
            setDragging(true);
          },
          onPointerMove: (event) => {
            if (!startRef.current) return;
            const delta = position(event) - startRef.current.position;
            const next = clampValue(startRef.current.value + (invert ? -delta : delta));
            latestRef.current = next;
            onChange(next);
          },
          onPointerUp: finish,
          onPointerCancel: finish,
          onLostPointerCapture: finish,
          onDoubleClick: () => {
            if (onReset) onReset();
          },
          onKeyDown: (event) => {
            const back = rows ? "ArrowUp" : "ArrowLeft";
            const forward = rows ? "ArrowDown" : "ArrowRight";
            if (event.key !== back && event.key !== forward) return;
            event.preventDefault();
            const step = event.key === back ? -16 : 16;
            const next = clampValue(value + (invert ? -step : step));
            latestRef.current = next;
            onChange(next);
            if (onCommit) onCommit(next);
          }
        },
        h4("span", { className: "gv-split-grip", "aria-hidden": true })
      );
    }

    // src/client/ui/RollbackDialog.tsx
    var React5 = __toESM(require("react"), 1);
    var ReactDOM3 = __toESM(require("react-dom"), 1);
    var h5 = React5.createElement;
    function RollbackDialog({
      t,
      entries,
      busy,
      error,
      onClose,
      onConfirm
    }) {
      const [checked, setChecked] = React5.useState(() => new Set(entries.map((entry) => entry.path)));
      const [deleteAdded, setDeleteAdded] = React5.useState(true);
      const confirmRef = React5.useRef(null);
      React5.useEffect(() => {
        if (confirmRef.current && typeof confirmRef.current.focus === "function") confirmRef.current.focus();
        const onKeyDown = (event) => {
          if (event.key === "Escape" && !busy) {
            event.stopPropagation();
            onClose();
          }
        };
        const previous = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown, true);
        return () => {
          document.removeEventListener("keydown", onKeyDown, true);
          document.documentElement.style.overflow = previous;
        };
      }, [busy, onClose]);
      const toggle = (path) => {
        setChecked((previous) => {
          const next = new Set(previous);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      };
      const allChecked = entries.length > 0 && checked.size === entries.length;
      const paths = entries.filter((entry) => checked.has(entry.path)).map((entry) => entry.path);
      return ReactDOM3.createPortal(
        h5(
          "div",
          {
            className: "gv-modal-mask gv-dialog-mask",
            onMouseDown: (event) => {
              if (event.target === event.currentTarget && !busy) onClose();
            }
          },
          h5(
            "div",
            { className: "gv-dialog gv-dialog-wide", role: "dialog", "aria-modal": "true", "aria-label": t("rollbackTitle") },
            h5(
              "div",
              { className: "gv-dialog-head" },
              h5("span", { className: "gv-dialog-title" }, t("rollbackTitle")),
              h5(
                "button",
                {
                  type: "button",
                  className: "gv-icon-button gv-icon-xs",
                  title: t("close"),
                  "aria-label": t("close"),
                  disabled: busy,
                  onClick: onClose
                },
                h5(IconClose, { size: 13 })
              )
            ),
            h5(
              "div",
              { className: "gv-dialog-body" },
              h5("p", { className: "gv-dialog-text" }, t("rollbackHint")),
              h5(
                "label",
                { className: "gv-dialog-check" },
                h5("input", {
                  type: "checkbox",
                  checked: allChecked,
                  disabled: busy || entries.length === 0,
                  onChange: () => setChecked(allChecked ? /* @__PURE__ */ new Set() : new Set(entries.map((entry) => entry.path)))
                }),
                h5("span", null, `${t("selectAll")} · ${checked.size}/${entries.length}`)
              ),
              h5(
                "div",
                { className: "gv-rollback-list" },
                entries.map(
                  (entry) => h5(
                    "label",
                    { key: entry.path, className: "gv-rollback-row" },
                    h5("input", {
                      type: "checkbox",
                      checked: checked.has(entry.path),
                      disabled: busy,
                      onChange: () => toggle(entry.path)
                    }),
                    h5("span", { className: `gv-status ${statusClass(entry.status)}` }, entry.status || "?"),
                    h5("span", { className: "gv-rollback-path", title: entry.path }, entry.path)
                  )
                )
              ),
              h5(
                "label",
                { className: "gv-dialog-check" },
                h5("input", {
                  type: "checkbox",
                  checked: deleteAdded,
                  disabled: busy,
                  onChange: (event) => setDeleteAdded(event.target.checked)
                }),
                h5("span", null, t("rollbackDeleteAdded"))
              ),
              error ? h5("div", { className: "gv-dialog-error" }, error) : null
            ),
            h5(
              "div",
              { className: "gv-dialog-actions" },
              h5("button", { type: "button", className: "gv-button gv-button-ghost", onClick: onClose, disabled: busy }, t("cancel")),
              h5(
                "button",
                {
                  type: "button",
                  ref: confirmRef,
                  className: "gv-button gv-button-danger",
                  disabled: busy || paths.length === 0,
                  onClick: () => onConfirm(paths, deleteAdded)
                },
                busy ? h5("span", { className: "gv-inline-spin", "aria-hidden": true }) : null,
                h5("span", null, `${t("rollbackConfirm")} · ${paths.length}`)
              )
            )
          )
        ),
        document.body
      );
    }

    // src/client/ui/Spinner.tsx
    var React6 = __toESM(require("react"), 1);
    var h6 = React6.createElement;
    function Spinner({ label }) {
      return h6(
        "div",
        { className: "gv-loading" },
        h6("span", { className: "gv-spinner", "aria-hidden": true }),
        h6("span", null, label)
      );
    }

    // src/client/panes/ChangesPane.tsx
    var React7 = __toESM(require("react"), 1);
    var h7 = React7.createElement;
    function ChangesPane(props) {
      const {
        t,
        repo,
        scope,
        entries,
        totalCount,
        loading,
        error,
        selected,
        message,
        busy,
        disabled,
        aiBusy,
        onGenerate,
        repoNotice,
        repoState,
        commitError,
        height,
        inputRef,
        onToggle,
        onToggleAll,
        onRefresh,
        onRollback,
        onMessage,
        onCommit,
        onDiscard,
        onResolve,
        onContinue,
        onAbort
      } = props;
      const summary = React7.useMemo(() => summarizeChanges(entries), [entries]);
      const allSelected = entries.length > 0 && entries.every((entry) => selected.has(entry.path));
      const selectedCount = entries.filter((entry) => selected.has(entry.path)).length;
      const manualReady = message.trim().length > 0;
      const locked = disabled || busy;
      const selectedConflict = entries.some((entry) => entry.conflict && selected.has(entry.path));
      const operationPaused = Boolean(repoState && repoState.operation);
      const canCommit = entries.length > 0 && selectedCount > 0 && !locked && !selectedConflict && !operationPaused;
      const canSubmit = canCommit && manualReady;
      let list = null;
      if (loading && entries.length === 0) {
        list = h7(Spinner, { label: t("loading") });
      } else if (error) {
        list = h7(
          "div",
          { className: "gv-changes-state" },
          h7("span", null, error),
          h7(
            "button",
            { type: "button", className: "gv-button", onClick: onRefresh },
            h7(IconRefresh, { size: 12 }),
            h7("span", null, t("retry"))
          )
        );
      } else if (entries.length === 0) {
        list = h7("div", { className: "gv-changes-state" }, scope ? t("noChangesInScope") : t("noChanges"));
      } else {
        list = entries.map((entry) => {
          const dot = entry.path.lastIndexOf("/");
          const dir = dot >= 0 ? entry.path.slice(0, dot) : "";
          const name = dot >= 0 ? entry.path.slice(dot + 1) : entry.path;
          const tags = changeTags(entry, t);
          const isSelected = selected.has(entry.path);
          const toggle = () => {
            if (!locked) onToggle(entry.path);
          };
          return h7(
            "div",
            {
              key: entry.path,
              className: `gv-change-row${isSelected ? " gv-change-checked" : ""}`,
              title: `${entry.path}
    ${entry.x}${entry.y}${entry.untracked ? ` · ${t("untracked")}` : ""}`,
              onClick: toggle
            },
            h7("input", {
              type: "checkbox",
              className: "gv-change-check",
              checked: isSelected,
              disabled: locked,
              "aria-label": entry.path,
              onClick: (event) => event.stopPropagation(),
              onChange: toggle
            }),
            h7("span", { className: `gv-change-status gv-chg-${changeTone(entry)}` }, changeBadge(entry)),
            h7(FileIcon, { name: entry.path, size: 13 }),
            h7(
              "span",
              { className: "gv-change-text" },
              h7("span", { className: "gv-change-name" }, name),
              dir ? h7("span", { className: "gv-change-dir" }, dir) : null
            ),
            h7(
              "span",
              { className: "gv-change-tags" },
              tags.map(
                (tag, index) => h7(
                  "span",
                  { key: `${tag.tone}-${index}`, className: `gv-change-tag gv-tag-${tag.tone}` },
                  tag.label
                )
              )
            ),
            entry.conflict ? h7(
              "button",
              {
                type: "button",
                className: "gv-change-resolve",
                title: `${t("markResolved")} · ${entry.path}`,
                "aria-label": `${t("markResolved")} ${entry.path}`,
                disabled: locked,
                onClick: (event) => {
                  event.stopPropagation();
                  if (!locked) onResolve(entry);
                }
              },
              h7(IconCheck, { size: 12 })
            ) : null,
            h7(
              "button",
              {
                type: "button",
                className: "gv-change-discard",
                title: `${t("discardChanges")} · ${entry.path}`,
                "aria-label": `${t("discardChanges")} ${entry.path}`,
                disabled: locked,
                onClick: (event) => {
                  event.stopPropagation();
                  if (!locked) onDiscard(entry);
                }
              },
              h7(IconUndo, { size: 12 })
            )
          );
        });
      }
      const chips = [];
      if (summary.untracked > 0) chips.push(["untracked", t("untracked"), summary.untracked]);
      if (summary.modified > 0) chips.push(["modified", t("modifiedHint"), summary.modified]);
      if (summary.staged > 0) chips.push(["staged", t("staged"), summary.staged]);
      if (summary.conflict > 0) chips.push(["conflict", t("conflictHint"), summary.conflict]);
      if (summary.deleted > 0) chips.push(["deleted", t("deletedHint"), summary.deleted]);
      return h7(
        "div",
        { className: "gv-changes", style: height ? { height: `${height}px` } : void 0 },
        h7(
          "div",
          { className: "gv-changes-head" },
          h7(
            "span",
            { className: "gv-changes-title" },
            h7("span", null, t("changes")),
            h7("span", { className: "gv-changes-count" }, String(entries.length)),
            entries.length !== totalCount ? h7("span", { className: "gv-changes-total" }, `/ ${totalCount}`) : null,
            loading && entries.length > 0 ? h7("span", { className: "gv-inline-spin", "aria-hidden": true }) : null
          ),
          h7(
            "div",
            { className: "gv-changes-actions" },
            h7(
              "button",
              {
                type: "button",
                className: "gv-text-button",
                onClick: onToggleAll,
                disabled: entries.length === 0 || locked
              },
              allSelected ? t("clearSelection") : t("selectAll")
            ),
            h7(
              "button",
              {
                type: "button",
                className: "gv-text-button gv-text-button-danger",
                title: t("rollbackHint"),
                onClick: onRollback,
                disabled: entries.length === 0 || locked
              },
              t("rollback")
            ),
            h7(
              "button",
              {
                type: "button",
                className: "gv-icon-button gv-icon-xs",
                title: t("refreshChanges"),
                "aria-label": t("refreshChanges"),
                onClick: onRefresh,
                disabled: locked
              },
              h7(IconRefresh, { size: 12 })
            )
          )
        ),
        chips.length > 0 ? h7(
          "div",
          { className: "gv-changes-summary", "aria-label": `${t("changes")} · ${entries.length}` },
          chips.map(
            ([tone, label, count]) => h7(
              "span",
              { key: tone, className: `gv-sum-chip gv-sum-${tone}` },
              h7("span", { className: "gv-sum-dot", "aria-hidden": true }),
              `${label} ${count}`
            )
          )
        ) : null,
        scope ? h7(
          "div",
          { className: "gv-changes-scope", title: `${scope}${repo ? ` · ${repo.root}` : ""}` },
          h7("span", { className: "gv-changes-scope-label" }, t("changesInScope")),
          h7("span", { className: "gv-changes-scope-path" }, scope)
        ) : null,
        repoState && repoState.operation ? h7(
          "div",
          { className: `gv-repo-banner gv-repo-banner-${repoState.operation}` },
          h7(IconAlert, { size: 13 }),
          h7(
            "span",
            { className: "gv-repo-banner-text" },
            `${operationLabel(repoState.operation, t)} · ${t("operationHint")}`
          ),
          h7(
            "div",
            { className: "gv-repo-banner-actions" },
            repoState.operation !== "bisect" ? h7(
              "button",
              {
                type: "button",
                className: "gv-button gv-button-xs",
                onClick: onContinue,
                disabled: locked
              },
              t("continueOperation")
            ) : null,
            h7(
              "button",
              {
                type: "button",
                className: "gv-button gv-button-xs gv-button-danger-ghost",
                onClick: onAbort,
                disabled: locked
              },
              t("abortOperation")
            )
          )
        ) : null,
        repoNotice ? h7("div", { className: `gv-repo-notice gv-repo-notice-${repoNotice.kind}` }, repoNotice.text) : null,
        h7("div", { className: "gv-changes-list" }, list),
        h7(
          "div",
          { className: "gv-commit" },
          h7("textarea", {
            ref: inputRef,
            className: "gv-commit-input",
            rows: 2,
            value: message,
            placeholder: t("commitMessagePlaceholder"),
            "aria-label": t("commitMessagePlaceholder"),
            spellCheck: false,
            disabled: locked,
            onChange: (event) => onMessage(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                if (canSubmit) onCommit();
              }
            }
          }),
          h7(
            "div",
            { className: "gv-commit-bar" },
            h7(
              "button",
              {
                type: "button",
                className: "gv-commit-generate",
                onClick: onGenerate,
                disabled: !canCommit || aiBusy,
                title: operationPaused ? t("finishOperationFirst") : selectedConflict ? t("resolveConflictsFirst") : selectedCount === 0 ? t("commitSelectRequired") : t("generateHint")
              },
              aiBusy ? h7("span", { className: "gv-inline-spin", "aria-hidden": true }) : h7(IconSparkles, { size: 12 }),
              h7("span", null, manualReady ? t("regenerateMessage") : t("generateMessage"))
            ),
            h7(
              "span",
              { className: "gv-commit-hint" },
              `${t("selectedFiles")} ${selectedCount} / ${entries.length}`
            ),
            h7(
              "button",
              {
                type: "button",
                className: "gv-button gv-button-primary gv-commit-submit",
                onClick: onCommit,
                disabled: !canSubmit,
                title: operationPaused ? t("finishOperationFirst") : selectedConflict ? t("resolveConflictsFirst") : !manualReady ? t("commitMessageRequired") : selectedCount === 0 ? t("commitSelectRequired") : t("commitKeyHint")
              },
              h7("span", null, t("commit"))
            )
          ),
          commitError ? h7("div", { className: "gv-commit-note gv-commit-error" }, commitError) : null
        )
      );
    }

    // src/client/panes/CommitPane.tsx
    var React8 = __toESM(require("react"), 1);

    // src/client/panes/graph.ts
    var ROW_HEIGHT = 30;
    var LANE_WIDTH = 16;
    var GRAPH_PAD = 10;
    var DEFAULT_COLOR = "#8b96a8";
    var PALETTE = [
      "#3b82f6",
      "#f59e0b",
      "#10b981",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
      "#ec4899",
      "#84cc16",
      "#f97316",
      "#14b8a6"
    ];
    function computeRows(commits) {
      const known = new Set(commits.map((commit) => commit.hash));
      const lanes = [];
      const colors = [];
      const rows = [];
      let cursor = 0;
      const takeColor = () => PALETTE[cursor++ % PALETTE.length] ?? DEFAULT_COLOR;
      const ensureColor = (lane) => {
        const existing = colors[lane];
        if (existing) return existing;
        const color = takeColor();
        colors[lane] = color;
        return color;
      };
      const firstFree = (exclude) => {
        for (let i = 0; i < lanes.length; i += 1) {
          if (i !== exclude && (lanes[i] === null || lanes[i] === void 0)) return i;
        }
        lanes.push(null);
        colors.push(null);
        return lanes.length - 1;
      };
      for (const commit of commits) {
        let lane = lanes.indexOf(commit.hash);
        const isNew = lane === -1;
        if (isNew) {
          lane = firstFree(-1);
          lanes[lane] = commit.hash;
        }
        const nodeColor = ensureColor(lane);
        const top = [];
        for (let i = 0; i < lanes.length; i += 1) {
          const occupant = lanes[i];
          if (i !== lane && occupant !== null && occupant !== void 0) top.push(i);
        }
        const parents = Array.isArray(commit.parents) ? commit.parents.filter((parent) => known.has(parent)) : [];
        const edges = [];
        const claimed = /* @__PURE__ */ new Set();
        parents.forEach((parent, index) => {
          let target = -1;
          for (let i = 0; i < lanes.length; i += 1) {
            if (i !== lane && lanes[i] === parent && !claimed.has(i)) {
              target = i;
              break;
            }
          }
          let straight = false;
          if (target === -1) {
            if (index === 0 && lanes[lane] === commit.hash) {
              target = lane;
              straight = true;
            } else {
              target = firstFree(lane);
            }
            lanes[target] = parent;
          }
          claimed.add(target);
          edges.push({ to: target, straight, color: ensureColor(target) });
        });
        if (lanes[lane] === commit.hash) {
          lanes[lane] = null;
          colors[lane] = null;
        }
        while (lanes.length > 0 && (lanes[lanes.length - 1] === null || lanes[lanes.length - 1] === void 0)) {
          lanes.pop();
          colors.pop();
        }
        let width = lane + 1;
        for (const index of top) width = Math.max(width, index + 1);
        for (const edge of edges) width = Math.max(width, edge.to + 1);
        rows.push({
          lane,
          isNew,
          color: nodeColor,
          top,
          edges,
          colors: colors.slice(),
          width
        });
      }
      return rows;
    }

    // src/client/panes/CommitPane.tsx
    var h8 = React8.createElement;
    function GraphCell({ row, width }) {
      const x = (lane) => GRAPH_PAD + lane * LANE_WIDTH + LANE_WIDTH / 2;
      const centerX = x(row.lane);
      const centerY = ROW_HEIGHT / 2;
      const parts = [];
      for (const lane of row.top) {
        parts.push(
          h8("line", {
            key: `top-${lane}`,
            x1: x(lane),
            y1: 0,
            x2: x(lane),
            y2: ROW_HEIGHT,
            stroke: row.colors[lane] || DEFAULT_COLOR,
            strokeWidth: 2,
            strokeLinecap: "round"
          })
        );
      }
      row.edges.forEach((edge, index) => {
        const edgeX = x(edge.to);
        if (edge.straight) {
          parts.push(
            h8("line", {
              key: `edge-${index}`,
              x1: centerX,
              y1: centerY,
              x2: centerX,
              y2: ROW_HEIGHT,
              stroke: edge.color,
              strokeWidth: 2,
              strokeLinecap: "round"
            })
          );
        } else {
          parts.push(
            h8("path", {
              key: `edge-${index}`,
              d: `M ${centerX} ${centerY} C ${centerX} ${centerY + 8}, ${edgeX} ${ROW_HEIGHT - 8}, ${edgeX} ${ROW_HEIGHT}`,
              fill: "none",
              stroke: edge.color,
              strokeWidth: 2,
              strokeLinecap: "round"
            })
          );
        }
      });
      if (!row.isNew) {
        parts.push(
          h8("line", {
            key: "incoming",
            x1: centerX,
            y1: 0,
            x2: centerX,
            y2: centerY,
            stroke: row.color,
            strokeWidth: 2,
            strokeLinecap: "round"
          })
        );
      }
      parts.push(
        h8("circle", {
          key: "node",
          cx: centerX,
          cy: centerY,
          r: 4,
          fill: row.color,
          stroke: "var(--dsw-alias-bg-base)",
          strokeWidth: 1.5
        })
      );
      return h8(
        "svg",
        {
          className: "gv-graph",
          width,
          height: ROW_HEIGHT,
          viewBox: `0 0 ${width} ${ROW_HEIGHT}`,
          "aria-hidden": true,
          focusable: false
        },
        parts
      );
    }
    function RefChip({ entry }) {
      const isHead = Boolean(entry.head) || entry.kind === "head";
      const kind = isHead ? "head" : entry.kind;
      const label = isHead && entry.name !== "HEAD" ? `HEAD → ${entry.name}` : entry.name;
      return h8(
        "span",
        {
          className: `gv-ref gv-ref-${kind}`,
          title: isHead ? `HEAD → ${entry.name}` : `${kind}: ${entry.name}`
        },
        label
      );
    }
    function CommitPane(props) {
      const {
        t,
        log,
        loading,
        error,
        commits,
        rows,
        graphWidth,
        matches,
        selected,
        scope,
        state,
        narrow,
        busy,
        onSelect,
        onRefresh,
        onClearScope,
        onContinue,
        onAbort,
        onMenu
      } = props;
      const columns = narrow ? `${graphWidth}px minmax(0, 1fr)` : `${graphWidth}px minmax(140px, 1fr) 96px 82px 64px`;
      const branch = log && log.head ? log.head.detached ? `${t("detached")} @ ${log.head.hash.slice(0, 7)}` : log.head.branch : "";
      let content = null;
      if (!log && (loading || !error)) {
        content = h8(Spinner, { label: t("loading") });
      } else if (error) {
        content = h8(
          "div",
          { className: "gv-state" },
          h8("div", { className: "gv-state-title" }, t("errorTitle")),
          h8("div", { className: "gv-state-text" }, error),
          h8(
            "button",
            { type: "button", className: "gv-button", onClick: onRefresh },
            h8(IconRefresh, { size: 13 }),
            h8("span", null, t("retry"))
          )
        );
      } else if (commits.length === 0) {
        content = h8(
          "div",
          { className: "gv-state" },
          h8(IconGraphMark, { size: 30 }),
          h8("div", { className: "gv-state-title" }, t("noCommits")),
          h8("div", { className: "gv-state-text" }, t("noCommitsHint"))
        );
      } else {
        content = commits.map((commit, index) => {
          const dimmed = matches !== null && !matches.has(index);
          const isSelected = commit.hash === selected;
          return h8(
            "div",
            {
              key: commit.hash,
              className: `gv-row${isSelected ? " gv-row-selected" : ""}${dimmed ? " gv-row-dim" : ""}`,
              role: "row",
              tabIndex: 0,
              "aria-selected": isSelected,
              title: `${commit.subject}
    ${commit.author} <${commit.email}>
    ${fullDate(commit.date)}
    ${commit.hash}`,
              onClick: () => onSelect(commit.hash),
              onContextMenu: (event) => {
                event.preventDefault();
                onMenu(commit, { x: event.clientX, y: event.clientY });
              },
              onKeyDown: (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(commit.hash);
                } else if (event.key === "ContextMenu" || event.key === "F10" && event.shiftKey) {
                  event.preventDefault();
                  const target = event.currentTarget;
                  const rect = typeof target.getBoundingClientRect === "function" ? target.getBoundingClientRect() : { left: 0, top: 0, bottom: 0 };
                  onMenu(commit, { x: rect.left + 40, y: rect.bottom });
                }
              }
            },
            h8("span", { className: "gv-graphcell" }, h8(GraphCell, { row: rows[index], width: graphWidth })),
            h8(
              "span",
              { className: "gv-subjectcell" },
              h8("span", { className: "gv-subject" }, commit.subject || "(no subject)"),
              commit.refs.map(
                (entry, refIndex) => h8(RefChip, { key: `${entry.kind}-${entry.name}-${refIndex}`, entry })
              )
            ),
            narrow ? null : h8("span", { className: "gv-author", title: commit.email }, commit.author),
            narrow ? null : h8("span", { className: "gv-date", title: fullDate(commit.date) }, shortDate(commit.date)),
            narrow ? null : h8("span", { className: "gv-hash" }, commit.hash.slice(0, 7)),
            h8(
              "button",
              {
                type: "button",
                className: "gv-row-more",
                title: t("commitActions"),
                "aria-label": `${t("commitActions")} · ${commit.hash.slice(0, 7)}`,
                "aria-haspopup": "menu",
                tabIndex: -1,
                onClick: (event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  onMenu(commit, { x: rect.left, y: rect.bottom + 2 });
                }
              },
              h8(IconMore, { size: 14 })
            )
          );
        });
      }
      return h8(
        "div",
        { className: "gv-log" },
        scope ? h8(
          "div",
          { className: "gv-scopebar" },
          h8(IconFolder, { size: 12 }),
          h8("span", { className: "gv-scope-path", title: scope }, scope),
          h8(
            "button",
            { type: "button", className: "gv-scope-clear", onClick: onClearScope, title: t("clearScope") },
            h8(IconClose, { size: 11 }),
            h8("span", null, t("clearScope"))
          )
        ) : null,
        h8(
          "div",
          { className: "gv-scroll", style: { "--gv-cols": columns } },
          h8(
            "div",
            { className: "gv-thead", role: "row" },
            h8("span", { className: "gv-th" }, ""),
            h8("span", { className: "gv-th" }, t("subject")),
            narrow ? null : h8("span", { className: "gv-th" }, t("authorColumn")),
            narrow ? null : h8("span", { className: "gv-th" }, t("dateColumn")),
            narrow ? null : h8("span", { className: "gv-th" }, t("hashColumn"))
          ),
          content
        ),
        h8(
          "div",
          { className: "gv-statusbar" },
          h8(
            "span",
            { className: "gv-status-path", title: log && log.repo ? log.repo.root : "" },
            log && log.repo ? log.repo.root : ""
          ),
          branch ? h8(
            "span",
            {
              className: "gv-status-item",
              title: `${t("currentBranch")}: ${branch}${state && state.upstream ? ` · ${state.upstream}` : ""}`
            },
            `· ${branch}`
          ) : null,
          state && state.ahead > 0 ? h8(
            "span",
            { className: "gv-status-item gv-status-ahead", title: `${t("ahead")} ${state.ahead}` },
            `↑${state.ahead}`
          ) : null,
          state && state.behind > 0 ? h8(
            "span",
            { className: "gv-status-item gv-status-behind", title: `${t("behind")} ${state.behind}` },
            `↓${state.behind}`
          ) : null,
          state && state.operation ? h8(
            "span",
            { className: "gv-status-item gv-status-op", title: t("operationHint") },
            operationLabel(state.operation, t)
          ) : null,
          state && state.operation && onContinue ? h8(
            "span",
            { className: "gv-status-actions" },
            state.operation !== "bisect" ? h8(
              "button",
              {
                type: "button",
                className: "gv-status-btn",
                disabled: busy,
                title: t("continueOperation"),
                onClick: onContinue
              },
              t("continueOperation")
            ) : null,
            h8(
              "button",
              {
                type: "button",
                className: "gv-status-btn gv-status-btn-danger",
                disabled: busy,
                title: t("abortOperation"),
                onClick: onAbort
              },
              t("abortOperation")
            )
          ) : null,
          scope ? h8("span", { className: "gv-status-item" }, `· ${t("filteredBy")}`) : null,
          loading ? h8(
            "span",
            { className: "gv-status-busy", title: t("loading"), "aria-label": t("loading") },
            h8("span", { className: "gv-inline-spin", "aria-hidden": true })
          ) : null
        )
      );
    }

    // src/client/panes/CompareDialog.tsx
    var React9 = __toESM(require("react"), 1);
    var import_react_dom = __toESM(require("react-dom"), 1);
    var h9 = React9.createElement;
    var MAX_DIFF_ROWS = 3e3;
    function parseDiffRows(text) {
      const lines = String(text || "").split(/\r?\n/);
      const rows = [];
      let oldNo = 0;
      let newNo = 0;
      let inHunk = false;
      let truncated = false;
      let index = 0;
      while (index < lines.length) {
        const line = lines[index];
        if (line.startsWith("@@")) {
          const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
          if (match) {
            oldNo = Number(match[1]);
            newNo = Number(match[2]);
          }
          rows.push({ kind: "hunk", text: line });
          inHunk = true;
          index += 1;
          if (rows.length >= MAX_DIFF_ROWS) {
            truncated = true;
            break;
          }
          continue;
        }
        if (!inHunk) {
          index += 1;
          continue;
        }
        if (line.startsWith("\\")) {
          index += 1;
          continue;
        }
        if (line.startsWith("-") && !line.startsWith("---")) {
          const deletions = [];
          while (index < lines.length && lines[index].startsWith("-") && !lines[index].startsWith("---")) {
            deletions.push(lines[index].slice(1));
            index += 1;
          }
          const additions = [];
          while (index < lines.length && lines[index].startsWith("+") && !lines[index].startsWith("+++")) {
            additions.push(lines[index].slice(1));
            index += 1;
          }
          const count = Math.max(deletions.length, additions.length);
          for (let k = 0; k < count; k += 1) {
            const oldText = k < deletions.length ? deletions[k] : null;
            const newText = k < additions.length ? additions[k] : null;
            rows.push({
              kind: oldText !== null && newText !== null ? "change" : oldText !== null ? "del" : "add",
              oldNo: oldText !== null ? oldNo++ : null,
              oldText,
              newNo: newText !== null ? newNo++ : null,
              newText
            });
          }
          continue;
        }
        if (line.startsWith("+") && !line.startsWith("+++")) {
          while (index < lines.length && lines[index].startsWith("+") && !lines[index].startsWith("+++")) {
            rows.push({
              kind: "add",
              oldNo: null,
              oldText: null,
              newNo: newNo++,
              newText: lines[index].slice(1)
            });
            index += 1;
          }
          continue;
        }
        if (line.startsWith(" ")) {
          rows.push({
            kind: "ctx",
            oldNo: oldNo++,
            oldText: line.slice(1),
            newNo: newNo++,
            newText: line.slice(1)
          });
          index += 1;
          continue;
        }
        index += 1;
      }
      return { rows, truncated };
    }
    function compareRow(row, side, key) {
      if (row.kind === "hunk") {
        return h9("div", { key, className: "gv-crow gv-crow-hunk" }, h9("span", { className: "gv-chunk" }, row.text));
      }
      const old = side === "old";
      const kind = old ? row.kind === "del" || row.kind === "change" ? "del" : row.kind === "add" ? "blank" : "ctx" : row.kind === "add" || row.kind === "change" ? "add" : row.kind === "del" ? "blank" : "ctx";
      const number = old ? row.oldNo : row.newNo;
      const text = old ? row.oldText : row.newText;
      return h9(
        "div",
        { key, className: `gv-crow gv-crow-${kind}` },
        h9("span", { className: "gv-cnum" }, number === null || number === void 0 ? "" : String(number)),
        h9("span", { className: "gv-ccode" }, text === null || text === void 0 ? "" : text)
      );
    }
    function CompareDialog({ t, file, commitHash, diff, loading, error, onClose }) {
      const closeRef = React9.useRef(null);
      const previouslyFocused = React9.useRef(null);
      const oldRef = React9.useRef(null);
      const newRef = React9.useRef(null);
      const syncing = React9.useRef(false);
      const parsed = React9.useMemo(() => parseDiffRows(diff ? diff.text : ""), [diff]);
      React9.useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        };
        document.addEventListener("keydown", onKeyDown, true);
        if (closeRef.current) closeRef.current.focus();
        return () => {
          document.removeEventListener("keydown", onKeyDown, true);
          document.body.style.overflow = previousOverflow;
          const previous = previouslyFocused.current;
          if (previous && typeof previous.focus === "function") previous.focus();
        };
      }, [onClose]);
      const syncScroll = (which) => (event) => {
        if (syncing.current) return;
        const target = which === "old" ? newRef.current : oldRef.current;
        if (!target) return;
        syncing.current = true;
        target.scrollTop = event.currentTarget.scrollTop;
        window.requestAnimationFrame(() => {
          syncing.current = false;
        });
      };
      const text = diff ? diff.text : "";
      const binary = diff !== null && parsed.rows.length === 0 && /Binary files|GIT binary patch/i.test(text);
      const empty = diff !== null && !binary && parsed.rows.length === 0;
      let body = null;
      if (loading) {
        body = h9(Spinner, { label: t("loadingDiff") });
      } else if (error) {
        body = h9(
          "div",
          { className: "gv-details-error" },
          h9("div", { className: "gv-state-title" }, t("errorTitle")),
          h9("div", { className: "gv-state-text" }, error)
        );
      } else if (binary) {
        body = h9("div", { className: "gv-modal-empty" }, t("binaryCompare"));
      } else if (empty || !diff) {
        body = h9("div", { className: "gv-modal-empty" }, t("emptyDiff"));
      } else {
        body = h9(
          "div",
          { className: "gv-compare" },
          h9(
            "div",
            { className: "gv-cside" },
            h9("div", { className: "gv-ctitle" }, t("oldVersion")),
            h9(
              "div",
              { className: "gv-clines", ref: oldRef, onScroll: syncScroll("old") },
              parsed.rows.map((row, index) => compareRow(row, "old", index))
            )
          ),
          h9(
            "div",
            { className: "gv-cside" },
            h9("div", { className: "gv-ctitle" }, t("newVersion")),
            h9(
              "div",
              { className: "gv-clines", ref: newRef, onScroll: syncScroll("new") },
              parsed.rows.map((row, index) => compareRow(row, "new", index))
            )
          )
        );
      }
      const note = parsed.truncated || diff !== null && diff.truncated;
      const dialog = h9(
        "div",
        {
          className: "gv-modal-mask",
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose();
          }
        },
        h9(
          "div",
          { className: "gv-modal", role: "dialog", "aria-modal": "true", "aria-label": t("compareTitle") },
          h9(
            "div",
            { className: "gv-modal-head" },
            h9(
              "div",
              { className: "gv-modal-heading" },
              h9("span", { className: `gv-status ${statusClass(file.status)}` }, file.status || "?"),
              h9("span", { className: "gv-modal-path", title: file.path }, file.path),
              h9("span", { className: "gv-modal-hash", title: commitHash }, commitHash.slice(0, 7))
            ),
            h9(
              "button",
              {
                type: "button",
                ref: closeRef,
                className: "gv-icon-button",
                title: t("close"),
                "aria-label": t("close"),
                onClick: onClose
              },
              h9(IconClose, { size: 14 })
            )
          ),
          h9("div", { className: "gv-modal-body" }, body),
          note ? h9("div", { className: "gv-modal-foot" }, h9("span", null, t("fileDiffTruncated"))) : null
        )
      );
      return import_react_dom.default.createPortal(dialog, document.body);
    }

    // src/client/panes/DetailsPane.tsx
    var React10 = __toESM(require("react"), 1);
    var h10 = React10.createElement;
    function DetailsPane(props) {
      const { t, commit, details, loading, error, copied, scope, headHash, onCopy, onCompare, onSelectHash, onHistory } = props;
      const spinner = h10(Spinner, { label: t("loadingDetail") });
      let body = null;
      if (loading && !details) {
        body = spinner;
      } else if (!commit && !details) {
        body = h10(
          "div",
          { className: "gv-details-empty" },
          h10("div", { className: "gv-details-empty-icon" }, h10(IconGraphMark, { size: 22 })),
          h10("div", null, t("selectCommit"))
        );
      } else if (error) {
        body = h10(
          "div",
          { className: "gv-details-error" },
          h10("div", { className: "gv-state-title" }, t("errorTitle")),
          h10("div", { className: "gv-state-text" }, error)
        );
      } else if (details) {
        const isHead = Boolean(headHash) && details.hash === headHash;
        const isMerge = Array.isArray(details.parents) && details.parents.length > 1;
        const actions = [];
        if (isHead) actions.push({ op: "undo", label: t("undoCommit"), danger: true });
        if (!isMerge) actions.push({ op: "revert", label: t("revertCommit"), danger: false });
        if (!isHead && !isMerge) actions.push({ op: "cherryPick", label: t("cherryPickCommit"), danger: false });
        if (!isHead) actions.push({ op: "checkout", label: t("checkoutCommit"), danger: false });
        body = h10(
          React10.Fragment,
          null,
          h10(
            "div",
            { className: "gv-detail-hashrow" },
            h10("code", { className: "gv-detail-hash" }, details.shortHash),
            h10(
              "button",
              {
                type: "button",
                className: "gv-icon-button gv-copy",
                title: t("copyHash"),
                "aria-label": t("copyHash"),
                onClick: () => onCopy(details.hash)
              },
              h10(IconCopy, { size: 13 })
            ),
            copied ? h10("span", { className: "gv-copied" }, t("copied")) : null
          ),
          commit && commit.refs.length ? h10(
            "div",
            { className: "gv-detail-refs" },
            commit.refs.map(
              (entry, index) => h10(RefChip, { key: `${entry.kind}-${entry.name}-${index}`, entry })
            )
          ) : null,
          h10("div", { className: "gv-detail-subject" }, details.subject || "(no subject)"),
          details.message && details.message.split(/\r?\n/).length > 1 ? h10(
            "pre",
            { className: "gv-detail-message" },
            details.message.split(/\r?\n/).slice(1).join("\n").trim()
          ) : null,
          h10(
            "dl",
            { className: "gv-meta" },
            h10("dt", null, t("author")),
            h10(
              "dd",
              null,
              details.author.name,
              h10("span", { className: "gv-meta-mail" }, ` <${details.author.email}>`)
            ),
            h10("dt", null, t("date")),
            h10("dd", null, fullDate(details.date)),
            details.committer && details.committer.name !== details.author.name ? h10(React10.Fragment, null, h10("dt", null, t("committer")), h10("dd", null, details.committer.name)) : null,
            details.parents.length ? h10("dt", null, t("parents")) : null,
            details.parents.length ? h10(
              "dd",
              { className: "gv-parents" },
              details.parents.map(
                (parentHash) => h10(
                  "button",
                  {
                    key: parentHash,
                    type: "button",
                    className: "gv-parent",
                    title: parentHash,
                    onClick: () => onSelectHash(parentHash)
                  },
                  parentHash.slice(0, 7)
                )
              )
            ) : null
          ),
          actions.length === 0 ? null : h10(
            "div",
            { className: "gv-detail-actions" },
            actions.map(
              ({ op, label, danger }) => h10(
                "button",
                {
                  key: op,
                  type: "button",
                  className: `gv-action-chip${danger ? " gv-action-chip-danger" : ""}`,
                  title: t(historyHintKey(op)),
                  onClick: () => onHistory(op)
                },
                label
              )
            )
          ),
          h10(
            "div",
            { className: "gv-section-title" },
            h10("span", null, `${t("files")} · ${details.files.length} ${t("fileCountUnit")}`),
            scope ? h10("span", { className: "gv-filter-note", title: scope }, t("filteredBy")) : null
          ),
          details.files.length === 0 ? h10("div", { className: "gv-muted" }, scope ? t("noFilesInScope") : t("noFiles")) : h10(
            "div",
            { className: "gv-files" },
            details.files.map((entry) => {
              const additions = entry.additions ?? 0;
              const deletions = entry.deletions ?? 0;
              return h10(
                "button",
                {
                  key: `${entry.status}-${entry.path}`,
                  type: "button",
                  className: "gv-file",
                  title: `${statusLabel(entry.status, t)} · ${entry.path}
    ${t("compareHint")}`,
                  onClick: () => onCompare(entry)
                },
                h10("span", { className: `gv-status ${statusClass(entry.status)}` }, entry.status || "?"),
                h10(FileIcon, { name: entry.path, size: 13 }),
                h10("span", { className: "gv-file-path" }, entry.path),
                entry.binary ? h10("span", { className: "gv-file-stat gv-file-binary" }, t("binary")) : additions > 0 || deletions > 0 ? h10(
                  "span",
                  { className: "gv-file-stat" },
                  additions > 0 ? h10("span", { className: "gv-add" }, `+${additions}`) : null,
                  additions > 0 && deletions > 0 ? " " : null,
                  deletions > 0 ? h10("span", { className: "gv-del" }, `-${deletions}`) : null
                ) : null,
                h10("span", { className: "gv-file-compare", "aria-hidden": true }, h10(IconCompare, { size: 12 }))
              );
            })
          )
        );
      }
      return h10(
        "aside",
        { className: "gv-details" },
        h10(
          "div",
          { className: "gv-details-head" },
          h10("span", null, t("detailTitle")),
          scope ? h10("span", { className: "gv-head-scope", title: scope }, t("filteredBy")) : null
        ),
        h10("div", { className: "gv-details-body" }, body)
      );
    }

    // src/client/panes/FileTreePane.tsx
    var React11 = __toESM(require("react"), 1);
    var h11 = React11.createElement;
    function flattenTree(children, expanded) {
      const rows = [];
      const walk = (path, depth) => {
        for (const entry of children[path] || []) {
          rows.push({ ...entry, depth });
          if (entry.type === "tree" && expanded.has(entry.path)) walk(entry.path, depth + 1);
        }
      };
      walk("", 0);
      return rows;
    }
    function statusTone(letter) {
      if (letter === "?") return "untracked";
      if (letter === "U") return "conflict";
      if (letter === "A") return "added";
      if (letter === "D") return "deleted";
      if (letter === "R") return "staged";
      return "modified";
    }
    function FileTreePane(props) {
      const { t, repo, scope, children, expanded, loading, errors, onSelect, onToggle, onRetryRoot, refName } = props;
      const nodes = React11.useMemo(() => flattenTree(children, expanded), [children, expanded]);
      const rootLoading = loading.has("");
      const rootError = errors[""];
      const projectName = repo ? repo.title || String(repo.root || "").split(/[\\/]/).filter(Boolean).pop() || "" : "";
      const activate = (event, callback) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        callback();
      };
      return h11(
        "div",
        { className: "gv-tree" },
        h11(
          "div",
          { className: "gv-tree-head" },
          h11("span", null, t("filesTab")),
          refName ? h11("span", { className: "gv-tree-rootname gv-tree-refmode", title: refName }, `${t("historyTreeHint")} · ${refName}`) : h11("span", { className: "gv-tree-rootname", title: repo ? repo.root : "" }, projectName)
        ),
        h11(
          "div",
          { className: "gv-tree-scroll", role: "tree", "aria-label": t("filesTab") },
          h11(
            "div",
            {
              className: `gv-tree-row gv-tree-root${scope === "" ? " gv-tree-selected" : ""}`,
              role: "treeitem",
              "aria-selected": scope === "",
              "aria-level": 1,
              tabIndex: 0,
              title: repo ? repo.root : "",
              onClick: () => onSelect(null),
              onKeyDown: (event) => activate(event, () => onSelect(null))
            },
            h11(IconHome, { size: 13 }),
            h11("span", { className: "gv-tree-name" }, projectName || t("rootLabel"))
          ),
          nodes.map((node) => {
            const isDir = node.type === "tree";
            const isOpen = isDir && expanded.has(node.path);
            const isLoading = loading.has(node.path);
            const error = errors[node.path];
            return h11(
              "div",
              {
                key: node.path,
                className: `gv-tree-row${isDir ? " gv-tree-dir" : ""}${scope === node.path ? " gv-tree-selected" : ""}`,
                role: "treeitem",
                "aria-selected": scope === node.path,
                "aria-expanded": isDir ? isOpen : void 0,
                "aria-level": node.depth + 2,
                tabIndex: 0,
                style: { paddingLeft: `${8 + node.depth * 14}px` },
                title: error ? `${node.path}
    ${error}` : node.path,
                onClick: () => onSelect(node),
                onKeyDown: (event) => activate(event, () => onSelect(node))
              },
              isDir ? h11(
                "button",
                {
                  type: "button",
                  className: `gv-chevron${isOpen ? " gv-chevron-open" : ""}`,
                  "aria-label": isOpen ? t("collapse") : t("expand"),
                  tabIndex: -1,
                  onClick: (event) => {
                    event.stopPropagation();
                    onToggle(node.path);
                  }
                },
                h11(IconChevron, { size: 10 })
              ) : h11("span", { className: "gv-chevron-space" }),
              h11(FileIcon, { name: node.name, isDir, open: isOpen, size: 14 }),
              h11("span", { className: "gv-tree-name" }, node.name),
              isDir && node.dirty ? h11("span", { className: "gv-tree-dirty", title: t("modifiedHint"), "aria-hidden": true }) : null,
              !isDir && node.status ? h11(
                "span",
                {
                  className: `gv-tree-status gv-tone-${statusTone(node.status)}`,
                  title: node.status === "?" ? t("untracked") : t("modifiedHint")
                },
                node.status
              ) : null,
              isLoading ? h11("span", { className: "gv-tree-spinner", "aria-hidden": true }) : null,
              error ? h11("span", { className: "gv-tree-error-mark", title: error }, "!") : null
            );
          }),
          rootLoading && nodes.length === 0 ? h11(Spinner, { label: t("loadingTree") }) : null,
          rootError ? h11(
            "div",
            { className: "gv-tree-state" },
            h11("span", null, t("treeError")),
            h11("button", { type: "button", className: "gv-button", onClick: onRetryRoot }, t("retry"))
          ) : null,
          !rootLoading && !rootError && nodes.length === 0 ? h11("div", { className: "gv-tree-state" }, t("treeEmpty")) : null
        )
      );
    }

    // src/client/panes/Toolbar.tsx
    var React13 = __toESM(require("react"), 1);

    // src/client/ui/Dropdown.tsx
    var React12 = __toESM(require("react"), 1);
    var ReactDOM5 = __toESM(require("react-dom"), 1);
    var h12 = React12.createElement;
    function Dropdown({
      t,
      label,
      value,
      options,
      onChange,
      disabled,
      icon,
      width = "190px",
      placeholder
    }) {
      const id = React12.useId();
      const [open, setOpen] = React12.useState(false);
      const [active, setActive] = React12.useState(-1);
      const [rowMenu, setRowMenu] = React12.useState(-1);
      const [rowMenuPos, setRowMenuPos] = React12.useState(null);
      const rootRef = React12.useRef(null);
      const menuRef = React12.useRef(null);
      const rowMenuRef = React12.useRef(null);
      const selectedIndex = options.findIndex((option) => option.value === value);
      const current = selectedIndex >= 0 ? options[selectedIndex] : null;
      React12.useEffect(() => {
        if (!open) setRowMenu(-1);
      }, [open]);
      React12.useEffect(() => {
        if (rowMenu < 0 || !rowMenuRef.current) return;
        const node = rowMenuRef.current.querySelector("button");
        if (node && typeof node.focus === "function") node.focus();
      }, [rowMenu]);
      React12.useEffect(() => {
        if (!open) return void 0;
        const onPointerDown = (event) => {
          if (rowMenuRef.current && rowMenuRef.current.contains(event.target)) return;
          if (rootRef.current && !rootRef.current.contains(event.target)) {
            setOpen(false);
            setRowMenu(-1);
          }
        };
        document.addEventListener("mousedown", onPointerDown, true);
        return () => document.removeEventListener("mousedown", onPointerDown, true);
      }, [open]);
      const openRowMenu = (index, anchor) => {
        if (rowMenu === index) {
          setRowMenu(-1);
          return;
        }
        let rect = null;
        try {
          rect = anchor.getBoundingClientRect();
        } catch {
          rect = null;
        }
        if (!rect) {
          setRowMenu(index);
          return;
        }
        const width2 = 232;
        const height = 320;
        setRowMenuPos({
          left: Math.max(8, Math.min(rect.right + 6, window.innerWidth - width2 - 8)),
          top: Math.max(8, Math.min(rect.top - 4, window.innerHeight - height - 8))
        });
        setRowMenu(index);
      };
      React12.useEffect(() => {
        if (open) setActive(selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1);
      }, [open, selectedIndex, options.length]);
      React12.useEffect(() => {
        if (disabled && open) setOpen(false);
      }, [disabled, open]);
      React12.useEffect(() => {
        if (!open || active < 0 || !menuRef.current) return;
        const node = menuRef.current.querySelector(`[data-index="${active}"]`);
        if (node && typeof node.scrollIntoView === "function") node.scrollIntoView({ block: "nearest" });
      }, [open, active]);
      const pick = (index) => {
        const option = options[index];
        if (!option) return;
        onChange(option.value);
        setOpen(false);
      };
      const onKeyDown = (event) => {
        if (disabled) return;
        if (!open) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActive((index) => options.length === 0 ? -1 : index < 0 ? 0 : (index + 1) % options.length);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActive((index) => options.length === 0 ? -1 : index <= 0 ? options.length - 1 : index - 1);
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          setActive(options.length > 0 ? 0 : -1);
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          setActive(options.length - 1);
          return;
        }
        if (event.key === "ArrowRight" && active >= 0) {
          const option = options[active];
          if (option && Array.isArray(option.actions) && option.actions.length > 0) {
            event.preventDefault();
            setRowMenu(active);
          }
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (active >= 0) pick(active);
        }
      };
      let lastGroup = null;
      const rows = [];
      options.forEach((option, index) => {
        if (option.group && option.group !== lastGroup) {
          rows.push(h12("div", { key: `group-${option.group}-${index}`, className: "gv-dropdown-group" }, option.group));
        }
        lastGroup = option.group || null;
        const isActive = index === active;
        const isSelected = option.value === value;
        const actions = Array.isArray(option.actions) ? option.actions : [];
        const iconNode = option.icon === "repo" ? h12(FileIcon, { name: "", isDir: true, size: 14 }) : option.icon === "tag" ? h12(IconTag, { size: 12 }) : option.icon === "remote" ? h12(IconBranch, { size: 12 }) : option.icon === "head" ? h12("span", { className: "gv-opt-head-dot", "aria-hidden": true }) : h12(IconBranch, { size: 12 });
        rows.push(
          h12(
            "div",
            {
              key: `${option.value}-${index}`,
              id: `${id}-${index}`,
              "data-index": index,
              role: "option",
              "aria-selected": isSelected,
              className: `gv-dropdown-option${isActive ? " gv-dropdown-active" : ""}${isSelected ? " gv-dropdown-selected" : ""}`,
              onMouseMove: () => setActive(index),
              onClick: () => pick(index)
            },
            h12("span", { className: "gv-opt-icon" }, iconNode),
            h12(
              "span",
              { className: "gv-opt-text" },
              h12("span", { className: "gv-opt-label" }, option.label),
              option.description ? h12("span", { className: "gv-opt-desc", title: option.description }, option.description) : null
            ),
            option.head ? h12("span", { className: "gv-opt-head" }, t("head")) : null,
            isSelected ? h12("span", { className: "gv-opt-check", "aria-hidden": true }, h12(IconCheck, { size: 11 })) : null,
            actions.length > 0 ? h12(
              "button",
              {
                type: "button",
                className: `gv-opt-action${rowMenu === index ? " gv-opt-action-open" : ""}`,
                title: t("branchActions"),
                "aria-label": `${t("branchActions")} · ${option.label}`,
                "aria-haspopup": "menu",
                "aria-expanded": rowMenu === index,
                tabIndex: -1,
                onClick: (event) => {
                  event.stopPropagation();
                  setActive(index);
                  openRowMenu(index, event.currentTarget);
                },
                onMouseDown: (event) => event.stopPropagation()
              },
              h12(IconMore, { size: 14 })
            ) : null
          )
        );
      });
      const activeActions = rowMenu >= 0 && rowMenu < options.length && Array.isArray(options[rowMenu].actions) ? options[rowMenu].actions ?? null : null;
      return h12(
        "div",
        { className: "gv-dropdown", style: { width }, ref: rootRef },
        h12(
          "button",
          {
            type: "button",
            className: `gv-dropdown-trigger${open ? " gv-dropdown-open" : ""}`,
            "aria-haspopup": "listbox",
            "aria-expanded": open,
            "aria-controls": open ? `${id}-list` : void 0,
            "aria-label": label,
            "aria-activedescendant": open && active >= 0 ? `${id}-${active}` : void 0,
            disabled,
            title: current ? current.label : placeholder,
            onClick: () => {
              if (!disabled) setOpen((value2) => !value2);
            },
            onKeyDown
          },
          h12("span", { className: "gv-dropdown-icon" }, icon === "repo" ? h12(FileIcon, { name: "", isDir: true, size: 14 }) : h12(IconBranch, { size: 13 })),
          h12("span", { className: "gv-dropdown-label" }, current ? current.label : placeholder),
          h12("span", { className: "gv-dropdown-chevron", "aria-hidden": true }, h12(IconChevronDown, { size: 11 }))
        ),
        open ? h12(
          "div",
          {
            className: "gv-dropdown-menu",
            role: "listbox",
            id: `${id}-list`,
            "aria-label": label,
            ref: menuRef
          },
          rows.length > 0 ? rows : h12("div", { className: "gv-dropdown-empty" }, placeholder)
        ) : null,
        activeActions && rowMenuPos ? ReactDOM5.createPortal(
          h12(
            "div",
            {
              className: "gv-opt-menu",
              role: "menu",
              "aria-label": t("branchActions"),
              ref: rowMenuRef,
              style: { left: `${rowMenuPos.left}px`, top: `${rowMenuPos.top}px` },
              onMouseDown: (event) => event.stopPropagation()
            },
            activeActions.map(
              (item, actionIndex) => item.separator ? h12("div", { key: `sep-${actionIndex}`, className: "gv-opt-menu-sep", role: "separator" }) : h12(
                "button",
                {
                  key: item.id || `${item.label}-${actionIndex}`,
                  type: "button",
                  role: "menuitem",
                  className: `gv-opt-menu-item${item.danger ? " gv-action-danger" : ""}`,
                  disabled: item.disabled,
                  title: item.hint || item.label,
                  onClick: () => {
                    setRowMenu(-1);
                    setOpen(false);
                    item.onSelect?.();
                  }
                },
                h12("span", { className: "gv-opt-menu-label" }, item.label),
                item.hint ? h12("span", { className: "gv-opt-menu-hint" }, item.hint) : null
              )
            )
          ),
          document.body
        ) : null
      );
    }

    // src/client/panes/Toolbar.tsx
    var h13 = React13.createElement;
    function Toolbar(props) {
      const {
        t,
        repos,
        repoId,
        onRepo,
        log,
        refValue,
        onRef,
        branchOptions,
        query,
        onQuery,
        count,
        matchCount,
        onRefresh,
        sync,
        syncBusy,
        onFetch,
        onPull,
        onPush
      } = props;
      const repoOptions = (repos || []).map((repo) => ({
        value: repo.id,
        label: repo.title || repo.path,
        description: repo.path,
        icon: "repo"
      }));
      const ahead = sync && sync.ahead ? sync.ahead : 0;
      const behind = sync && sync.behind ? sync.behind : 0;
      const remoteDisabled = !log || syncBusy;
      return h13(
        "div",
        { className: "gv-toolbar" },
        h13("div", { className: "gv-brand" }, h13(IconGraphMark, { size: 13 }), h13("span", null, t("panel"))),
        h13("span", { className: "gv-divider", "aria-hidden": true }),
        h13(Dropdown, {
          t,
          label: t("selectRepo"),
          value: repoId,
          options: repoOptions,
          onChange: onRepo,
          disabled: !repos || repos.length === 0,
          icon: "repo",
          width: "190px",
          placeholder: t("noRepos")
        }),
        h13(Dropdown, {
          t,
          label: t("selectBranch"),
          value: refValue,
          options: branchOptions || [{ value: "", label: t("allRefs"), icon: "all" }],
          onChange: onRef,
          disabled: !log,
          icon: "branch",
          width: "210px",
          placeholder: t("branch")
        }),
        h13(
          "div",
          { className: "gv-sync" },
          h13(
            "button",
            {
              type: "button",
              className: "gv-icon-button",
              title: t("fetch"),
              "aria-label": t("fetch"),
              disabled: remoteDisabled,
              onClick: onFetch
            },
            h13(IconRefresh, { size: 14 })
          ),
          h13(
            "button",
            {
              type: "button",
              className: "gv-icon-button",
              title: behind > 0 ? `${t("pull")} · ↓${behind}` : t("pull"),
              "aria-label": t("pull"),
              disabled: remoteDisabled,
              onClick: onPull
            },
            h13(IconArrowDown, { size: 14 }),
            behind > 0 ? h13("span", { className: "gv-sync-count gv-sync-behind" }, String(behind)) : null
          ),
          h13(
            "button",
            {
              type: "button",
              className: "gv-icon-button",
              title: ahead > 0 ? `${t("push")} · ↑${ahead}` : t("push"),
              "aria-label": t("push"),
              disabled: remoteDisabled,
              onClick: onPush
            },
            h13(IconArrowUp, { size: 14 }),
            ahead > 0 ? h13("span", { className: "gv-sync-count gv-sync-ahead" }, String(ahead)) : null
          )
        ),
        h13(
          "div",
          { className: "gv-search" },
          h13(IconSearch),
          h13("input", {
            className: "gv-search-input",
            type: "search",
            value: query,
            placeholder: t("searchPlaceholder"),
            "aria-label": t("searchPlaceholder"),
            onChange: (event) => onQuery(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                onQuery("");
              }
            }
          })
        ),
        h13("div", { className: "gv-spacer" }),
        matchCount !== null ? h13("span", { className: "gv-count gv-match-count" }, `${matchCount} ${t("matchesUnit")}`) : null,
        count ? h13("span", { className: "gv-count" }, `${count} ${t("commitsUnit")}`) : null,
        h13(
          "button",
          {
            type: "button",
            className: "gv-icon-button",
            title: t("refresh"),
            "aria-label": t("refresh"),
            onClick: onRefresh
          },
          h13(IconRefresh, { size: 14 })
        )
      );
    }

    // src/client/app.tsx
    var h14 = React14.createElement;
    var MIN_TREE = 140;
    var MIN_CENTER = 300;
    var COMPACT_WIDTH = 980;
    var STATUS_POLL_MS = 2e4;
    var TREE_REFRESH_THROTTLE_MS = 3e3;
    var REMOTE_STRIP_MS = 6e3;
    var COPIED_MS = 1600;
    var IDENTITY = (key) => key;
    function inScope(path, scope) {
      return !scope || path === scope || path.startsWith(`${scope}/`);
    }
    function asString(value) {
      return typeof value === "string" ? value : "";
    }
    function isOperationError(error) {
      if (!error || typeof error !== "object") return false;
      const candidate = error;
      if (candidate.conflict === true) return true;
      const state = candidate.state;
      return Boolean(state && state.operation);
    }
    function remoteErrorSnapshot(previous, op, error) {
      return {
        id: previous ? previous.id : "",
        op,
        label: previous ? previous.label : "",
        state: "error",
        percent: previous ? previous.percent : null,
        exitCode: null,
        error,
        lines: [],
        startedAt: previous ? previous.startedAt : Date.now(),
        endedAt: Date.now()
      };
    }
    function GitViewPanel({ t }) {
      const translate = t ?? IDENTITY;
      const rootRef = React14.useRef(null);
      const [api] = React14.useState(() => new GitApi());
      const [layout] = React14.useState(() => new LayoutStore());
      const [notices] = React14.useState(() => new NoticeCenter());
      const [repos, setRepos] = React14.useState(null);
      const [repoId, setRepoId] = React14.useState("");
      const [reposError, setReposError] = React14.useState("");
      const [reposTick, setReposTick] = React14.useState(0);
      const [log, setLog] = React14.useState(null);
      const [logError, setLogError] = React14.useState("");
      const [loadingLog, setLoadingLog] = React14.useState(false);
      const [refValue, setRefValue] = React14.useState("");
      const [reloadTick, setReloadTick] = React14.useState(0);
      const [query, setQuery] = React14.useState("");
      const [selected, setSelected] = React14.useState("");
      const [scope, setScope] = React14.useState("");
      const [details, setDetails] = React14.useState(null);
      const [detailsError, setDetailsError] = React14.useState("");
      const [loadingDetails, setLoadingDetails] = React14.useState(false);
      const [compare, setCompare] = React14.useState(null);
      const [diff, setDiff] = React14.useState(null);
      const [diffError, setDiffError] = React14.useState("");
      const [loadingDiff, setLoadingDiff] = React14.useState(false);
      const [treeChildren, setTreeChildren] = React14.useState({});
      const [treeExpanded, setTreeExpanded] = React14.useState(() => /* @__PURE__ */ new Set());
      const [treeLoading, setTreeLoading] = React14.useState(() => /* @__PURE__ */ new Set());
      const [treeErrors, setTreeErrors] = React14.useState({});
      const treeGeneration = React14.useRef(0);
      const treeChildrenRef = React14.useRef({});
      const treeLoadingRef = React14.useRef(/* @__PURE__ */ new Set());
      const lastTreeRefresh = React14.useRef(0);
      const [changes, setChanges] = React14.useState(null);
      const [changesError, setChangesError] = React14.useState("");
      const [changesLoading, setChangesLoading] = React14.useState(false);
      const [changesTick, setChangesTick] = React14.useState(0);
      const [deselectedChanges, setDeselectedChanges] = React14.useState(() => /* @__PURE__ */ new Set());
      const [commitMessage, setCommitMessage] = React14.useState("");
      const messageRef = React14.useRef(null);
      const [rollbackOpen, setRollbackOpen] = React14.useState(false);
      const [rollbackBusy, setRollbackBusy] = React14.useState(false);
      const [rollbackError, setRollbackError] = React14.useState("");
      const [commitMenu, setCommitMenu] = React14.useState(null);
      const [remoteJob, setRemoteJob] = React14.useState(null);
      const remoteClearTimer = React14.useRef(null);
      const runnerRef = React14.useRef(null);
      const [commitBusy, setCommitBusy] = React14.useState(false);
      const [commitAiBusy, setCommitAiBusy] = React14.useState(false);
      const [commitError, setCommitError] = React14.useState("");
      const [actionDialog, setActionDialog] = React14.useState(null);
      const [actionBusy, setActionBusy] = React14.useState(false);
      const [actionError, setActionError] = React14.useState("");
      const [leftWidth, setLeftWidth] = React14.useState(() => layout.readWidth("left", MIN_LEFT, MAX_LEFT));
      const [rightWidth, setRightWidth] = React14.useState(() => layout.readWidth("right", MIN_RIGHT, MAX_RIGHT));
      const [changesHeight, setChangesHeight] = React14.useState(
        () => layout.readWidth("changes", MIN_CHANGES, 900)
      );
      const [leftHeight, setLeftHeight] = React14.useState(0);
      const leftRef = React14.useRef(null);
      const [panelWidth, setPanelWidth] = React14.useState(1200);
      const [compact, setCompact] = React14.useState(false);
      const [copied, setCopied] = React14.useState(false);
      const copyTimer = React14.useRef(null);
      const [repoNotice, setRepoNotice] = React14.useState(null);
      React14.useEffect(() => notices.subscribe(setRepoNotice), [notices]);
      const applyScope = React14.useCallback((next) => {
        setScope(next);
        setSelected("");
        setDetails(null);
        setDetailsError("");
        setCompare(null);
        setDiff(null);
        setDiffError("");
        setCommitError("");
      }, []);
      const selectRepo = React14.useCallback(
        (next) => {
          setRepoId(next);
          setRefValue("");
          setLog(null);
          setLogError("");
          setChanges(null);
          setChangesError("");
          setChangesLoading(false);
          setDeselectedChanges(/* @__PURE__ */ new Set());
          setCommitMessage("");
          setCommitError("");
          setCommitBusy(false);
          setActionDialog(null);
          setActionError("");
          notices.clear();
          applyScope("");
          layout.writeRepo(next);
        },
        [applyScope, layout, notices]
      );
      const resetTree = React14.useCallback(() => {
        treeGeneration.current += 1;
        treeChildrenRef.current = {};
        treeLoadingRef.current = /* @__PURE__ */ new Set();
        setTreeChildren({});
        setTreeExpanded(/* @__PURE__ */ new Set());
        setTreeLoading(/* @__PURE__ */ new Set());
        setTreeErrors({});
      }, []);
      const loadTree = React14.useCallback(
        async (path, options = {}) => {
          if (!repoId) return;
          if (treeLoadingRef.current.has(path)) return;
          const force = options.force === true;
          if (!force && path && treeChildrenRef.current[path]) return;
          const generation = treeGeneration.current;
          treeLoadingRef.current.add(path);
          setTreeLoading((previous) => new Set(previous).add(path));
          setTreeErrors((previous) => {
            if (!(path in previous)) return previous;
            const next = { ...previous };
            delete next[path];
            return next;
          });
          try {
            const params = {
              repo: repoId,
              path,
              mode: refValue ? "ref" : "worktree"
            };
            if (refValue) params.ref = refValue;
            const payload = await api.read("tree", params);
            if (generation !== treeGeneration.current) return;
            treeChildrenRef.current = { ...treeChildrenRef.current, [path]: payload.entries || [] };
            setTreeChildren(treeChildrenRef.current);
          } catch (error) {
            if (generation !== treeGeneration.current) return;
            setTreeErrors((previous) => ({ ...previous, [path]: errorText(error) }));
          } finally {
            if (generation === treeGeneration.current) {
              treeLoadingRef.current.delete(path);
              setTreeLoading((previous) => {
                const next = new Set(previous);
                next.delete(path);
                return next;
              });
            }
          }
        },
        [repoId, refValue, api]
      );
      const refreshTree = React14.useCallback(async () => {
        if (!repoId) return;
        const paths = /* @__PURE__ */ new Set([""]);
        for (const key of Object.keys(treeChildrenRef.current)) {
          if (key) paths.add(key);
        }
        for (const path of paths) await loadTree(path, { force: true });
      }, [repoId, loadTree]);
      React14.useEffect(() => {
        const controller = new AbortController();
        setRepos(null);
        setReposError("");
        api.read("repos", {}, controller.signal).then((payload) => {
          if (controller.signal.aborted) return;
          const list = Array.isArray(payload.repos) ? payload.repos : [];
          setRepos(list);
          const saved = layout.readRepo();
          const pick = list.find((repo2) => repo2.id === saved) || list[0] || null;
          selectRepo(pick ? pick.id : "");
        }).catch((error) => {
          if (!isAbort(error)) setReposError(errorText(error));
        });
        return () => controller.abort();
      }, [reposTick, selectRepo, api, layout]);
      React14.useEffect(() => {
        resetTree();
        if (!repoId) return;
        void loadTree("");
      }, [repoId, refValue, resetTree, loadTree]);
      React14.useEffect(() => {
        if (!repoId || reloadTick === 0) return;
        lastTreeRefresh.current = Date.now();
        void refreshTree();
      }, [reloadTick, repoId, refreshTree]);
      React14.useEffect(() => {
        if (!repoId || changesTick === 0) return;
        if (document.hidden) return;
        const now = Date.now();
        if (now - lastTreeRefresh.current < TREE_REFRESH_THROTTLE_MS) return;
        lastTreeRefresh.current = now;
        void refreshTree();
      }, [changesTick, repoId, refreshTree]);
      React14.useEffect(() => {
        if (!repoId) {
          setLog(null);
          setLogError("");
          setLoadingLog(false);
          return void 0;
        }
        const controller = new AbortController();
        setLoadingLog(true);
        setLogError("");
        const params = { repo: repoId, limit: "400" };
        if (refValue) params.ref = refValue;
        if (scope) params.path = scope;
        api.read("log", params, controller.signal).then((payload) => {
          if (controller.signal.aborted) return;
          setLog(payload);
          const commits2 = Array.isArray(payload.commits) ? payload.commits : [];
          setSelected(
            (previous) => previous && commits2.some((commit) => commit.hash === previous) ? previous : commits2[0] ? commits2[0].hash : ""
          );
          setLoadingLog(false);
        }).catch((error) => {
          if (isAbort(error)) return;
          setLogError(errorText(error));
          setLog(null);
          setLoadingLog(false);
        });
        return () => controller.abort();
      }, [repoId, refValue, scope, reloadTick, api]);
      React14.useEffect(() => {
        if (!repoId) {
          setChanges(null);
          setChangesError("");
          setChangesLoading(false);
          return void 0;
        }
        const controller = new AbortController();
        setChangesLoading(true);
        setChangesError("");
        api.read("status", { repo: repoId }, controller.signal).then((payload) => {
          if (controller.signal.aborted) return;
          const entries = Array.isArray(payload.entries) ? payload.entries : [];
          setChanges(entries);
          setChangesLoading(false);
          setDeselectedChanges((previous) => {
            if (previous.size === 0) return previous;
            const existing = new Set(entries.map((entry) => entry.path));
            const next = new Set([...previous].filter((path) => existing.has(path)));
            return next.size === previous.size ? previous : next;
          });
        }).catch((error) => {
          if (isAbort(error)) return;
          setChangesError(errorText(error));
          setChanges(null);
          setChangesLoading(false);
        });
        return () => controller.abort();
      }, [repoId, changesTick, reloadTick, api]);
      React14.useEffect(() => {
        if (!repoId) return void 0;
        const timer = window.setInterval(() => {
          if (typeof document !== "undefined" && document.hidden) return;
          setChangesTick((value) => value + 1);
        }, STATUS_POLL_MS);
        return () => window.clearInterval(timer);
      }, [repoId]);
      React14.useEffect(() => {
        if (!repoId || !selected) {
          setDetails(null);
          setDetailsError("");
          setLoadingDetails(false);
          return void 0;
        }
        const controller = new AbortController();
        setLoadingDetails(true);
        setDetailsError("");
        const params = { repo: repoId, hash: selected };
        if (scope) params.path = scope;
        api.read("commit", params, controller.signal).then((payload) => {
          if (controller.signal.aborted) return;
          setDetails(payload);
          setLoadingDetails(false);
        }).catch((error) => {
          if (isAbort(error)) return;
          setDetails(null);
          setDetailsError(errorText(error));
          setLoadingDetails(false);
        });
        return () => controller.abort();
      }, [repoId, selected, scope, reloadTick, api]);
      React14.useEffect(() => {
        if (!repoId || !compare) {
          setDiff(null);
          setDiffError("");
          setLoadingDiff(false);
          return void 0;
        }
        const controller = new AbortController();
        setLoadingDiff(true);
        setDiffError("");
        setDiff(null);
        api.read(
          "diff",
          { repo: repoId, hash: compare.hash, path: compare.file.path },
          controller.signal
        ).then((payload) => {
          if (controller.signal.aborted) return;
          setDiff(payload);
          setLoadingDiff(false);
        }).catch((error) => {
          if (isAbort(error)) return;
          setDiffError(errorText(error));
          setLoadingDiff(false);
        });
        return () => controller.abort();
      }, [repoId, compare, api]);
      React14.useEffect(() => {
        const node = rootRef.current;
        if (!node) return void 0;
        const measure = () => {
          const width = node.clientWidth;
          if (width <= 0) return;
          setPanelWidth(width);
          setCompact(width < COMPACT_WIDTH);
        };
        measure();
        if (typeof ResizeObserver === "undefined") return void 0;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
      }, []);
      React14.useEffect(() => {
        const node = leftRef.current;
        if (!node) return void 0;
        const measure = () => setLeftHeight(node.clientHeight);
        measure();
        if (typeof ResizeObserver === "undefined") return void 0;
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
      }, [compact, repoId, repos]);
      React14.useEffect(
        () => () => {
          if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
          if (remoteClearTimer.current !== null) window.clearTimeout(remoteClearTimer.current);
        },
        []
      );
      const maxLeft = Math.max(
        MIN_LEFT,
        Math.min(MAX_LEFT, panelWidth - (compact ? 0 : rightWidth) - MIN_CENTER - 12)
      );
      const maxRight = Math.max(MIN_RIGHT, Math.min(MAX_RIGHT, panelWidth - leftWidth - MIN_CENTER - 12));
      const maxChanges = Math.max(MIN_CHANGES, leftHeight > 0 ? leftHeight - MIN_TREE - 7 : 900);
      React14.useEffect(() => {
        setLeftWidth((value) => Math.min(value, maxLeft));
      }, [maxLeft]);
      React14.useEffect(() => {
        if (!compact) setRightWidth((value) => Math.min(value, maxRight));
      }, [compact, maxRight]);
      React14.useEffect(() => {
        setChangesHeight((value) => Math.min(Math.max(value, MIN_CHANGES), maxChanges));
      }, [maxChanges]);
      const commits = React14.useMemo(
        () => log && Array.isArray(log.commits) ? log.commits : [],
        [log]
      );
      const rows = React14.useMemo(() => computeRows(commits), [commits]);
      const graphWidth = React14.useMemo(() => {
        let laneCount = 1;
        for (const row of rows) laneCount = Math.max(laneCount, row.width);
        return GRAPH_PAD * 2 + laneCount * LANE_WIDTH;
      }, [rows]);
      const centerWidth = compact ? panelWidth - leftWidth - 6 : panelWidth - leftWidth - rightWidth - 12;
      const narrowCenter = centerWidth < graphWidth + 446;
      const normalizedQuery = query.trim().toLowerCase();
      const matches = React14.useMemo(() => {
        if (!normalizedQuery) return null;
        const result = /* @__PURE__ */ new Set();
        commits.forEach((commit, index) => {
          const haystack = `${commit.subject}
    ${commit.author}
    ${commit.hash}
    ${commit.refs.map((entry) => entry.name).join("\n")}`.toLowerCase();
          if (haystack.includes(normalizedQuery)) result.add(index);
        });
        return result;
      }, [commits, normalizedQuery]);
      const selectedCommit = React14.useMemo(
        () => commits.find((commit) => commit.hash === selected) || null,
        [commits, selected]
      );
      const repo = React14.useMemo(
        () => (repos || []).find((entry) => entry.id === repoId) || null,
        [repos, repoId]
      );
      const visibleChanges = React14.useMemo(
        () => (changes || []).filter((entry) => inScope(entry.path, scope)),
        [changes, scope]
      );
      const selectedChangePaths = React14.useMemo(
        () => visibleChanges.filter((entry) => !deselectedChanges.has(entry.path)).map((entry) => entry.path),
        [visibleChanges, deselectedChanges]
      );
      const selectedChangeSet = React14.useMemo(() => new Set(selectedChangePaths), [selectedChangePaths]);
      const copyHash = React14.useCallback(async (hash) => {
        try {
          await navigator.clipboard.writeText(hash);
          setCopied(true);
          if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
          copyTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
        } catch {
        }
      }, []);
      const refresh = React14.useCallback(() => {
        setReloadTick((value) => value + 1);
      }, []);
      const retryRepos = React14.useCallback(() => {
        setReposTick((value) => value + 1);
      }, []);
      const chooseCommit = React14.useCallback((hash) => {
        setSelected(hash);
        setCompare(null);
      }, []);
      const changeRef = React14.useCallback(
        (value) => {
          setRefValue(value);
          applyScope("");
        },
        [applyScope]
      );
      const selectTreeNode = React14.useCallback(
        (entry) => {
          if (!entry) {
            applyScope("");
            return;
          }
          applyScope(entry.path);
          if (entry.type === "tree") {
            setTreeExpanded((previous) => {
              if (previous.has(entry.path)) return previous;
              const next = new Set(previous);
              next.add(entry.path);
              return next;
            });
            void loadTree(entry.path);
          }
        },
        [applyScope, loadTree]
      );
      const toggleDir = React14.useCallback(
        (path) => {
          const isOpen = treeExpanded.has(path);
          setTreeExpanded((previous) => {
            const next = new Set(previous);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
          });
          if (!isOpen) void loadTree(path);
        },
        [treeExpanded, loadTree]
      );
      const retryTreeRoot = React14.useCallback(() => {
        void loadTree("");
      }, [loadTree]);
      const openCompare = React14.useCallback(
        (entry) => {
          if (!selected) return;
          setCompare({ file: entry, hash: selected });
        },
        [selected]
      );
      const closeCompare = React14.useCallback(() => {
        setCompare(null);
      }, []);
      const toggleChange = React14.useCallback((path) => {
        setDeselectedChanges((previous) => {
          const next = new Set(previous);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        });
      }, []);
      const toggleAllChanges = React14.useCallback(() => {
        setDeselectedChanges((previous) => {
          const allSelected = visibleChanges.length > 0 && visibleChanges.every((entry) => !previous.has(entry.path));
          const next = new Set(previous);
          for (const entry of visibleChanges) {
            if (allSelected) next.add(entry.path);
            else next.delete(entry.path);
          }
          return next;
        });
      }, [visibleChanges]);
      const refreshChanges = React14.useCallback(() => {
        setChangesTick((value) => value + 1);
      }, []);
      const performCommit = React14.useCallback(async () => {
        if (!repoId || commitBusy) return;
        if (selectedChangePaths.length === 0) {
          setCommitError(translate("commitSelectRequired"));
          return;
        }
        if (!commitMessage.trim()) {
          setCommitError(translate("commitMessageRequired"));
          return;
        }
        setCommitBusy(true);
        setCommitError("");
        try {
          const payload = await api.write({
            repo: repoId,
            action: "commit",
            paths: selectedChangePaths,
            message: commitMessage
          });
          setCommitMessage("");
          setDeselectedChanges(/* @__PURE__ */ new Set());
          setSelected("");
          setDetails(null);
          setDetailsError("");
          setCompare(null);
          setReloadTick((value) => value + 1);
          setChangesTick((value) => value + 1);
        } catch (error) {
          setCommitError(errorText(error));
        } finally {
          setCommitBusy(false);
        }
      }, [repoId, commitBusy, selectedChangePaths, commitMessage, translate, api]);
      const generateMessage = React14.useCallback(async () => {
        if (!repoId || commitBusy || commitAiBusy) return;
        if (selectedChangePaths.length === 0) {
          setCommitError(translate("commitSelectRequired"));
          return;
        }
        setCommitAiBusy(true);
        setCommitError("");
        try {
          const payload = await api.write({
            repo: repoId,
            action: "message",
            paths: selectedChangePaths,
            locale: uiLocale()
          });
          const draft = typeof payload.message === "string" ? payload.message : "";
          setCommitMessage(draft);
          window.requestAnimationFrame(() => {
            const node = messageRef.current;
            if (!node) return;
            node.focus();
            const end = node.value.length;
            try {
              node.setSelectionRange(end, end);
            } catch {
            }
          });
        } catch (error) {
          setCommitError(errorText(error));
        } finally {
          setCommitAiBusy(false);
        }
      }, [repoId, commitBusy, commitAiBusy, selectedChangePaths, translate, api]);
      const commitSelected = React14.useCallback(() => {
        void performCommit();
      }, [performCommit]);
      const showRepoNotice = React14.useCallback(
        (text, kind = "ok") => {
          notices.show(text, kind);
        },
        [notices]
      );
      const runRemote = React14.useCallback(
        async (op, options = {}) => {
          if (!repoId) return;
          setActionBusy(true);
          setActionError("");
          let started = false;
          const runner = new RemoteRunner(api, (snapshot) => {
            started = true;
            setRemoteJob(snapshot);
            setActionBusy(false);
            setActionDialog(null);
          });
          runnerRef.current = runner;
          try {
            const start = await runner.start(repoId, op, options);
            started = true;
            setActionBusy(false);
            setActionDialog(null);
            setRemoteJob({
              id: start.id,
              op,
              label: start.label,
              state: "running",
              percent: null,
              exitCode: null,
              error: "",
              lines: [],
              startedAt: Date.now(),
              endedAt: null
            });
            const snapshot = await runner.poll(repoId, start.id);
            runner.clear();
            setActionBusy(false);
            if (snapshot.state === "done") {
              showRepoNotice(translate(remoteDoneKey(op)));
              refresh();
              setChangesTick((value) => value + 1);
            } else if (snapshot.state === "cancelled") {
              showRepoNotice(translate("remoteCancelled"));
            } else {
              showRepoNotice(snapshot.error || translate("remoteFailed"), "error");
            }
            if (remoteClearTimer.current !== null) window.clearTimeout(remoteClearTimer.current);
            remoteClearTimer.current = window.setTimeout(() => setRemoteJob(null), REMOTE_STRIP_MS);
          } catch (error) {
            setActionBusy(false);
            if (isAbort(error)) return;
            if (!started) {
              setActionError(errorText(error));
              return;
            }
            setRemoteJob((previous) => remoteErrorSnapshot(previous, op, errorText(error)));
            runner.clear();
          }
        },
        [repoId, api, translate, showRepoNotice, refresh]
      );
      const requestRemote = React14.useCallback(
        (op) => {
          if (!repoId) return;
          if (op === "fetch") {
            void runRemote("fetch");
            return;
          }
          setActionError("");
          setActionDialog({
            kind: "remote",
            op,
            title: op === "pull" ? translate("pull") : translate("push"),
            description: op === "pull" ? translate("pullHint") : translate("pushHint"),
            checkboxLabel: op === "pull" ? translate("pullRebase") : translate("forceWithLease"),
            checkboxDefault: false,
            confirmLabel: op === "pull" ? translate("pull") : translate("push")
          });
        },
        [repoId, runRemote, translate]
      );
      const cancelRemoteJob = React14.useCallback(() => {
        if (!repoId || !remoteJob || remoteJob.state !== "running") return;
        void runnerRef.current?.cancel(repoId);
      }, [repoId, remoteJob]);
      const executeBranchOp = React14.useCallback(
        async (op, payload) => {
          if (!repoId || actionBusy) return false;
          setActionBusy(true);
          setActionError("");
          try {
            const result = await api.write({ repo: repoId, action: "branch", op, ...payload });
            const detailSource = result.newName || result.branch;
            const detail = detailSource ? ` · ${detailSource}` : "";
            showRepoNotice(`${translate("branchDone")}${detail}`);
            const branch = asString(payload.branch);
            if (op === "checkout" && result.branch) {
              setRefValue(`refs/heads/${result.branch}`);
            } else if (op === "create" && result.checkout && result.branch) {
              setRefValue(`refs/heads/${result.branch}`);
            } else if (op === "rename" && branch && refValue === `refs/heads/${branch}`) {
              setRefValue(`refs/heads/${result.newName ?? ""}`);
            } else if (op === "delete" && branch && refValue === `refs/heads/${branch}`) {
              setRefValue("");
            }
            setCommitError("");
            refresh();
            setChangesTick((value) => value + 1);
            return true;
          } catch (error) {
            if (isOperationError(error)) {
              showRepoNotice(errorText(error), "error");
            } else {
              setActionError(errorText(error));
            }
            refresh();
            setChangesTick((value) => value + 1);
            return false;
          } finally {
            setActionBusy(false);
          }
        },
        [repoId, actionBusy, refValue, translate, showRepoNotice, refresh, api]
      );
      const executeDiscard = React14.useCallback(
        async (entry) => {
          if (!repoId || actionBusy || !entry) return;
          setActionBusy(true);
          setActionError("");
          try {
            await api.write({ repo: repoId, action: "discard", paths: [entry.path] });
            setActionDialog(null);
            setCommitError("");
            showRepoNotice(`${translate("discarded")} · ${entry.path}`);
            setChangesTick((value) => value + 1);
          } catch (error) {
            setActionError(errorText(error));
          } finally {
            setActionBusy(false);
          }
        },
        [repoId, actionBusy, translate, showRepoNotice, api]
      );
      const resolveConflict = React14.useCallback(
        async (entry) => {
          if (!repoId || actionBusy || !entry) return;
          setActionBusy(true);
          setActionError("");
          try {
            await api.write({ repo: repoId, action: "resolve", paths: [entry.path] });
            showRepoNotice(`${translate("resolved")} · ${entry.path}`);
            setChangesTick((value) => value + 1);
          } catch (error) {
            showRepoNotice(errorText(error), "error");
          } finally {
            setActionBusy(false);
          }
        },
        [repoId, actionBusy, translate, showRepoNotice, api]
      );
      const requestDiscard = React14.useCallback(
        (entry) => {
          if (!entry) return;
          const reason = entry.conflict ? translate("discardConflict") : entry.untracked ? translate("discardUntracked") : entry.x === "A" ? translate("discardAdded") : entry.status === "D" ? translate("discardDeleted") : translate("discardModified");
          setActionError("");
          setActionDialog({
            kind: "discard",
            entry,
            title: `${translate("discardTitle")} · ${entry.path}`,
            description: reason,
            confirmLabel: translate("discardConfirm"),
            danger: true
          });
        },
        [translate]
      );
      const executeRollback = React14.useCallback(
        async (paths, deleteAdded) => {
          if (!repoId || rollbackBusy) return;
          setRollbackBusy(true);
          setRollbackError("");
          try {
            await api.write({ repo: repoId, action: "rollback", paths, deleteAdded });
            setRollbackOpen(false);
            setCommitError("");
            setDeselectedChanges(/* @__PURE__ */ new Set());
            showRepoNotice(`${translate("rollbackDone")} · ${paths.length}`);
            setChangesTick((value) => value + 1);
            setReloadTick((value) => value + 1);
          } catch (error) {
            setRollbackError(errorText(error));
          } finally {
            setRollbackBusy(false);
          }
        },
        [repoId, rollbackBusy, translate, showRepoNotice, api]
      );
      const executeHistoryOp = React14.useCallback(
        async (op, hashArg) => {
          if (!repoId || actionBusy) return void 0;
          const hash = hashArg || (details && details.hash ? details.hash : "");
          setActionBusy(true);
          setActionError("");
          try {
            const result = await api.write({
              repo: repoId,
              action: "history",
              op,
              ...hash ? { hash } : {}
            });
            setActionDialog(null);
            showRepoNotice(`${translate("historyDone")} · ${translate(historyLabelKey(op))}`);
            setSelected("");
            setDetails(null);
            setDetailsError("");
            refresh();
            setChangesTick((value) => value + 1);
            return result;
          } catch (error) {
            if (isOperationError(error)) {
              showRepoNotice(errorText(error), "error");
              setActionDialog(null);
            } else {
              setActionError(errorText(error));
            }
            refresh();
            setChangesTick((value) => value + 1);
            return null;
          } finally {
            setActionBusy(false);
          }
        },
        [repoId, actionBusy, details, translate, showRepoNotice, refresh, api]
      );
      const requestHistoryOp = React14.useCallback(
        (op, hashArg) => {
          const hash = hashArg || (details && details.hash ? details.hash : "");
          if (op !== "undo" && !hash) return;
          setActionError("");
          setActionDialog({
            kind: "history",
            op,
            payload: hash ? { hash } : {},
            title: translate(historyLabelKey(op)),
            description: translate(historyHintKey(op)),
            confirmLabel: translate(historyLabelKey(op)),
            danger: op === "undo" || op === "checkout"
          });
        },
        [details, translate]
      );
      const requestAbortOperation = React14.useCallback(() => {
        setActionError("");
        setActionDialog({
          kind: "branch",
          op: "abort",
          title: translate("abortOperation"),
          description: translate("branchAbortConfirm"),
          confirmLabel: translate("abortOperation"),
          danger: true
        });
      }, [translate]);
      const buildCommitMenu = React14.useCallback(
        (commit) => {
          const head = log && log.head ? log.head.hash : "";
          const isHead = Boolean(head) && commit.hash === head;
          const isMerge = Array.isArray(commit.parents) && commit.parents.length > 1;
          const items = [
            {
              id: "copy-hash",
              label: translate("copyHash"),
              hint: commit.hash.slice(0, 7),
              onSelect: () => void copyHash(commit.hash)
            },
            {
              id: "copy-subject",
              label: translate("copyCommitMessage"),
              onSelect: () => {
                try {
                  void navigator.clipboard.writeText(commit.subject || "");
                } catch {
                }
              }
            },
            { separator: true }
          ];
          if (!isHead) {
            items.push({
              id: "checkout",
              label: translate("checkoutCommit"),
              onSelect: () => requestHistoryOp("checkout", commit.hash)
            });
            if (!isMerge) {
              items.push({
                id: "cherryPick",
                label: translate("cherryPickCommit"),
                onSelect: () => requestHistoryOp("cherryPick", commit.hash)
              });
            }
          }
          if (!isMerge) {
            items.push({
              id: "revert",
              label: translate("revertCommit"),
              onSelect: () => requestHistoryOp("revert", commit.hash)
            });
          }
          if (isHead) {
            items.push({ separator: true });
            items.push({
              id: "undo",
              label: translate("undoCommit"),
              danger: true,
              onSelect: () => requestHistoryOp("undo", commit.hash)
            });
          }
          return items;
        },
        [log, translate, copyHash, requestHistoryOp]
      );
      const openCommitMenu = React14.useCallback((commit, point) => {
        setSelected(commit.hash);
        setCommitMenu({ commit, x: point.x, y: point.y });
      }, []);
      const continueBranchOperation = React14.useCallback(() => {
        void executeBranchOp("continue", {});
      }, [executeBranchOp]);
      const confirmAction = React14.useCallback(
        ({ value, checked }) => {
          const dialog = actionDialog;
          if (!dialog || actionBusy) return;
          if (dialog.kind === "discard") {
            void executeDiscard(dialog.entry);
            return;
          }
          if (dialog.kind === "history") {
            void executeHistoryOp(dialog.op ?? "");
            return;
          }
          if (dialog.kind === "remote") {
            void runRemote(
              dialog.op === "pull" ? "pull" : "push",
              dialog.op === "pull" ? { rebase: Boolean(checked) } : { forceWithLease: Boolean(checked) }
            );
            return;
          }
          const payload = { ...dialog.payload || {} };
          if (dialog.input) {
            const name = String(value || "").trim();
            if (!name) {
              setActionError(translate("branchNameRequired"));
              return;
            }
            if (!looksLikeBranchName(name)) {
              setActionError(translate("invalidBranchName"));
              return;
            }
            if (dialog.op === "rename") payload.newName = name;
            else payload.branch = name;
          }
          if (dialog.op === "create") payload.checkout = Boolean(checked);
          if (dialog.op === "delete") payload.force = Boolean(checked);
          void executeBranchOp(dialog.op || "", payload);
        },
        [actionDialog, actionBusy, executeBranchOp, executeDiscard, executeHistoryOp, runRemote, translate]
      );
      const closeActionDialog = React14.useCallback(() => {
        if (actionBusy) return;
        setActionDialog(null);
        setActionError("");
      }, [actionBusy]);
      const refEntry = React14.useMemo(() => {
        if (!refValue || !log || !Array.isArray(log.refs)) return null;
        return log.refs.find((entry) => entry.ref === refValue) || null;
      }, [log, refValue]);
      const branchState = log && log.state ? log.state : null;
      const buildBranchMenu = React14.useCallback(
        (entry) => {
          const items = [];
          const current = branchState && branchState.branch ? branchState.branch : "";
          const entryName = entry ? entry.kind === "tag" ? `${entry.name}${translate("tagSuffix")}` : entry.name : "";
          const open = (config) => () => {
            setActionError("");
            setActionDialog(config);
          };
          if (entry && refValue !== entry.ref) {
            const target = entry.ref;
            items.push({
              id: "history",
              label: translate("showHistory"),
              hint: entryName,
              onSelect: () => setRefValue(target)
            });
            items.push({ separator: true });
          }
          if (entry && entry.kind === "branch" && !entry.head) {
            const name = entry.name;
            items.push({
              id: "checkout",
              label: translate("checkoutBranch"),
              hint: name,
              onSelect: open({
                kind: "branch",
                op: "checkout",
                title: translate("checkoutBranch"),
                description: `${translate("checkoutBranch")} · ${name}`,
                confirmLabel: translate("checkoutBranch"),
                payload: { branch: name }
              })
            });
          }
          if (entry && entry.kind === "remote") {
            const name = entry.name;
            const remoteRef = entry.ref;
            items.push({
              id: "checkout-remote",
              label: translate("checkoutRemote"),
              hint: name,
              onSelect: open({
                kind: "branch",
                op: "create",
                title: translate("checkoutRemote"),
                description: name,
                input: true,
                label: translate("branchName"),
                initialValue: localNameForRemote(name),
                placeholder: translate("branchName"),
                confirmLabel: translate("checkoutBranch"),
                checkboxLabel: translate("checkoutAfterCreate"),
                checkboxDefault: true,
                payload: { startRef: remoteRef }
              })
            });
          }
          items.push({
            id: "create",
            label: translate("createBranch"),
            hint: entryName || translate("head"),
            onSelect: open({
              kind: "branch",
              op: "create",
              title: translate("createBranch"),
              description: entry ? `${translate("createBranch")} · ${entryName}` : translate("createBranch"),
              input: true,
              label: translate("branchName"),
              initialValue: "",
              placeholder: translate("branchName"),
              confirmLabel: translate("createBranch"),
              checkboxLabel: translate("checkoutAfterCreate"),
              checkboxDefault: true,
              payload: entry ? { startRef: entry.ref } : {}
            })
          });
          if (entry && entry.kind === "branch") {
            const name = entry.name;
            items.push({
              id: "rename",
              label: translate("renameBranch"),
              hint: name,
              onSelect: open({
                kind: "branch",
                op: "rename",
                title: `${translate("renameBranch")} · ${name}`,
                description: `${translate("renameBranch")} ${name}`,
                input: true,
                label: translate("newBranchName"),
                initialValue: name,
                placeholder: translate("newBranchName"),
                confirmLabel: translate("confirm"),
                payload: { branch: name }
              })
            });
          }
          if (entry && entry.kind === "branch" && !entry.head) {
            const name = entry.name;
            items.push({
              id: "delete",
              label: translate("deleteBranch"),
              hint: name,
              danger: true,
              onSelect: open({
                kind: "branch",
                op: "delete",
                title: `${translate("deleteBranch")} · ${name}`,
                description: `${translate("deleteBranch")} ${name}`,
                danger: true,
                confirmLabel: translate("deleteBranch"),
                checkboxLabel: translate("forceDelete"),
                checkboxDefault: false,
                payload: { branch: name }
              })
            });
          }
          if (entry && current && entry.kind !== "tag" && entry.name !== current) {
            const targetRef = entry.ref;
            items.push({ separator: true });
            items.push({
              id: "merge",
              label: translate("mergeBranch"),
              hint: `${entryName} → ${current}`,
              onSelect: open({
                kind: "branch",
                op: "merge",
                title: translate("mergeBranch"),
                description: `${translate("mergeBranch")} · ${entryName} → ${current}`,
                confirmLabel: translate("mergeBranch"),
                payload: { ref: targetRef }
              })
            });
            items.push({
              id: "rebase",
              label: translate("rebaseBranch"),
              hint: `${current} → ${entryName}`,
              onSelect: open({
                kind: "branch",
                op: "rebase",
                title: translate("rebaseBranch"),
                description: `${translate("rebaseBranch")} · ${current} → ${entryName}`,
                confirmLabel: translate("rebaseBranch"),
                payload: { ref: targetRef }
              })
            });
          }
          if (branchState && branchState.operation) {
            const operation = branchState.operation;
            items.push({ separator: true });
            if (operation !== "bisect") {
              items.push({
                id: "continue",
                label: `${translate("continueOperation")} · ${operationLabel(operation, translate)}`,
                onSelect: () => {
                  void executeBranchOp("continue", {});
                }
              });
            }
            items.push({
              id: "abort",
              label: `${translate("abortOperation")} · ${operationLabel(operation, translate)}`,
              danger: true,
              onSelect: open({
                kind: "branch",
                op: "abort",
                title: translate("abortOperation"),
                description: translate("branchAbortConfirm"),
                confirmLabel: translate("abortOperation"),
                danger: true
              })
            });
          }
          return items;
        },
        [branchState, translate, executeBranchOp, refValue]
      );
      const branchOptions = React14.useMemo(() => {
        const options = [
          { value: "", label: translate("allRefs"), icon: "all", actions: buildBranchMenu(null) }
        ];
        for (const entry of log && Array.isArray(log.refs) ? log.refs : []) {
          options.push({
            value: entry.ref,
            label: `${entry.name}${entry.kind === "tag" ? translate("tagSuffix") : ""}`,
            group: entry.kind === "branch" ? translate("localBranches") : entry.kind === "remote" ? translate("remoteBranches") : translate("tags"),
            icon: entry.kind,
            head: entry.head,
            actions: buildBranchMenu(entry)
          });
        }
        return options;
      }, [log, translate, buildBranchMenu]);
      const treePane = h14(
        "div",
        { className: "gv-pane gv-pane-left", style: { width: `${leftWidth}px`, flexBasis: `${leftWidth}px` } },
        h14(
          "div",
          { className: "gv-left", ref: leftRef },
          h14(FileTreePane, {
            t: translate,
            repo,
            scope,
            refName: refEntry ? refEntry.name : refValue ? refValue.replace(/^refs\/(heads|remotes|tags)\//, "") : "",
            children: treeChildren,
            expanded: treeExpanded,
            loading: treeLoading,
            errors: treeErrors,
            onSelect: selectTreeNode,
            onToggle: toggleDir,
            onRetryRoot: retryTreeRoot
          }),
          h14(ResizeHandle, {
            t: translate,
            axis: "y",
            label: translate("resizeChanges"),
            value: changesHeight,
            min: MIN_CHANGES,
            max: maxChanges,
            invert: true,
            onChange: setChangesHeight,
            onCommit: (next) => layout.writeWidth("changes", next),
            onReset: () => {
              setChangesHeight(DEFAULT_CHANGES);
              layout.writeWidth("changes", DEFAULT_CHANGES);
            }
          }),
          h14(ChangesPane, {
            t: translate,
            repo,
            scope,
            entries: visibleChanges,
            totalCount: changes ? changes.length : 0,
            loading: changesLoading,
            error: changesError,
            selected: selectedChangeSet,
            message: commitMessage,
            busy: commitBusy,
            disabled: commitBusy || actionBusy,
            aiBusy: commitAiBusy,
            repoNotice,
            repoState: branchState,
            commitError,
            height: changesHeight,
            inputRef: messageRef,
            onToggle: toggleChange,
            onToggleAll: toggleAllChanges,
            onRefresh: refreshChanges,
            onRollback: () => {
              setRollbackError("");
              setRollbackOpen(true);
            },
            onMessage: setCommitMessage,
            onCommit: commitSelected,
            onGenerate: generateMessage,
            onDiscard: requestDiscard,
            onResolve: resolveConflict,
            onContinue: continueBranchOperation,
            onAbort: requestAbortOperation
          })
        )
      );
      const centerPane = h14(
        "div",
        { className: "gv-pane gv-pane-center" },
        repoId ? h14(CommitPane, {
          t: translate,
          log,
          loading: loadingLog,
          error: logError,
          commits,
          rows,
          graphWidth,
          matches,
          selected,
          scope,
          state: branchState,
          narrow: narrowCenter,
          inputRef: messageRef,
          onSelect: chooseCommit,
          onRefresh: refresh,
          onClearScope: () => applyScope(""),
          onMenu: openCommitMenu,
          onContinue: () => {
            void executeBranchOp("continue", {});
          },
          onAbort: () => setActionDialog({
            kind: "branch",
            op: "abort",
            title: translate("abortOperation"),
            description: translate("branchAbortConfirm"),
            confirmLabel: translate("abortOperation"),
            danger: true
          }),
          busy: actionBusy
        }) : null
      );
      const detailsPane = h14(
        "div",
        {
          className: "gv-pane gv-pane-right",
          style: compact ? void 0 : { width: `${rightWidth}px`, flexBasis: `${rightWidth}px` }
        },
        h14(DetailsPane, {
          t: translate,
          commit: selectedCommit,
          details,
          loading: loadingDetails,
          error: detailsError,
          copied,
          scope,
          headHash: log && log.head ? log.head.hash : "",
          onCopy: copyHash,
          onCompare: openCompare,
          onSelectHash: chooseCommit,
          onHistory: requestHistoryOp
        })
      );
      const leftHandle = compact ? null : h14(ResizeHandle, {
        t: translate,
        label: translate("resizeTree"),
        value: leftWidth,
        min: MIN_LEFT,
        max: maxLeft,
        invert: false,
        onChange: setLeftWidth,
        onCommit: (next) => layout.writeWidth("left", next),
        onReset: () => {
          setLeftWidth(220);
          layout.writeWidth("left", 220);
        }
      });
      const rightHandle = compact ? null : h14(ResizeHandle, {
        t: translate,
        label: translate("resizeDetails"),
        value: rightWidth,
        min: MIN_RIGHT,
        max: maxRight,
        invert: true,
        onChange: setRightWidth,
        onCommit: (next) => layout.writeWidth("right", next),
        onReset: () => {
          setRightWidth(360);
          layout.writeWidth("right", 360);
        }
      });
      const main = compact ? h14(
        "div",
        { className: "gv-main gv-main-compact" },
        h14(
          "div",
          { className: "gv-compact-top" },
          treePane,
          h14(ResizeHandle, {
            t: translate,
            label: translate("resizeTree"),
            value: leftWidth,
            min: MIN_LEFT,
            max: maxLeft,
            invert: false,
            onChange: setLeftWidth,
            onCommit: (next) => layout.writeWidth("left", next),
            onReset: () => {
              setLeftWidth(220);
              layout.writeWidth("left", 220);
            }
          }),
          centerPane
        ),
        h14("div", { className: "gv-compact-bottom" }, detailsPane)
      ) : h14("div", { className: "gv-main" }, treePane, leftHandle, centerPane, rightHandle, detailsPane);
      const emptyRepos = !repoId && repos !== null;
      return h14(
        "div",
        { className: "gv-root", ref: rootRef },
        h14("style", { key: "gv-style" }, PANEL_CSS),
        h14(Toolbar, {
          t: translate,
          repos,
          repoId,
          onRepo: selectRepo,
          log,
          refValue,
          onRef: changeRef,
          branchOptions,
          query,
          onQuery: setQuery,
          count: log ? commits.length : 0,
          matchCount: matches ? matches.size : null,
          onRefresh: refresh,
          sync: branchState,
          syncBusy: actionBusy || Boolean(remoteJob && remoteJob.state === "running"),
          onFetch: () => requestRemote("fetch"),
          onPull: () => requestRemote("pull"),
          onPush: () => requestRemote("push")
        }),
        remoteJob ? h14(
          "div",
          { className: `gv-remote gv-remote-${remoteJob.state}` },
          remoteJob.state === "running" || remoteJob.state === "cancelling" ? h14("span", { className: "gv-inline-spin", "aria-hidden": true }) : null,
          h14(
            "span",
            { className: "gv-remote-label" },
            `${translate(remoteOpKey(remoteJob.op))}${remoteJob.percent != null ? ` · ${remoteJob.percent}%` : ""}`
          ),
          h14(
            "span",
            {
              className: "gv-remote-line",
              title: (remoteJob.lines || []).join("\n") || remoteJob.error || ""
            },
            remoteJob.lines && remoteJob.lines.length ? remoteJob.lines[remoteJob.lines.length - 1] : remoteJob.error || translate("remoteRunning")
          ),
          remoteJob.state === "running" ? h14(
            "button",
            { type: "button", className: "gv-remote-cancel", onClick: cancelRemoteJob },
            translate("cancel")
          ) : null
        ) : null,
        emptyRepos ? h14(
          "div",
          { className: "gv-main-empty" },
          h14(IconGraphMark, { size: 34 }),
          h14("div", { className: "gv-state-title" }, translate("noRepos")),
          h14("div", { className: "gv-state-text" }, translate("noReposHint")),
          h14(
            "button",
            { type: "button", className: "gv-button", onClick: retryRepos },
            h14(IconRefresh, { size: 13 }),
            h14("span", null, translate("retry"))
          )
        ) : reposError ? h14(
          "div",
          { className: "gv-main-empty" },
          h14("div", { className: "gv-state-title" }, translate("errorTitle")),
          h14("div", { className: "gv-state-text" }, reposError),
          h14(
            "button",
            { type: "button", className: "gv-button", onClick: retryRepos },
            h14(IconRefresh, { size: 13 }),
            h14("span", null, translate("retry"))
          )
        ) : repos === null ? h14("div", { className: "gv-main-empty" }, h14(Spinner, { label: translate("loading") })) : main,
        compare ? h14(CompareDialog, {
          t: translate,
          file: compare.file,
          commitHash: compare.hash,
          diff,
          loading: loadingDiff,
          error: diffError,
          onClose: closeCompare
        }) : null,
        actionDialog ? h14(ActionDialog, {
          t: translate,
          dialog: actionDialog,
          busy: actionBusy,
          error: actionError,
          onClose: closeActionDialog,
          onConfirm: confirmAction
        }) : null,
        rollbackOpen ? h14(RollbackDialog, {
          t: translate,
          entries: visibleChanges,
          busy: rollbackBusy,
          error: rollbackError,
          onClose: () => {
            if (rollbackBusy) return;
            setRollbackOpen(false);
            setRollbackError("");
          },
          onConfirm: (paths, deleteAdded) => {
            void executeRollback(paths, deleteAdded);
          }
        }) : null,
        commitMenu ? h14(PopupMenu, {
          t: translate,
          menu: {
            x: commitMenu.x,
            y: commitMenu.y,
            items: buildCommitMenu(commitMenu.commit)
          },
          onClose: () => setCommitMenu(null)
        }) : null
      );
    }

    // src/client/i18n.ts
    var NS = "gitView";
    var zh = {
      panel: "Git",
      title: "提交历史",
      repo: "仓库",
      branch: "分支",
      allRefs: "全部分支",
      searchPlaceholder: "搜索提交、作者或哈希",
      searchClear: "清除搜索",
      refresh: "刷新",
      commitsUnit: "个提交",
      matchesUnit: "个匹配",
      loading: "正在读取 Git 数据…",
      loadingDetail: "正在读取提交详情…",
      loadingDiff: "正在读取差异…",
      noRepos: "没有可用的 Git 仓库",
      noReposHint: "把 Git 仓库所在目录添加为 DSH 工作区后，这里会出现它的提交历史。",
      noCommits: "这个路径下没有提交",
      noCommitsHint: "换一个分支或清除路径筛选后再试。",
      retry: "重试",
      selectCommit: "从中间选择一个提交，查看作者、文件变更与对比。",
      detailTitle: "提交详情",
      files: "文件变更",
      fileCountUnit: "个文件",
      noFiles: "该提交没有文件变更",
      noFilesInScope: "该路径下没有文件变更",
      diff: "差异",
      compare: "对比",
      compareTitle: "文件对比",
      oldVersion: "修改前",
      newVersion: "修改后",
      close: "关闭",
      copyHash: "复制哈希",
      copied: "已复制",
      author: "作者",
      committer: "提交者",
      date: "日期",
      parents: "父提交",
      binary: "二进制",
      truncated: "内容过长，已截断",
      subject: "提交信息",
      authorColumn: "作者",
      dateColumn: "日期",
      hashColumn: "哈希",
      head: "HEAD",
      detached: "游离 HEAD",
      errorTitle: "读取失败",
      fileDiffTruncated: "差异过大，仅显示前一部分",
      statusAdded: "新增",
      statusModified: "修改",
      statusDeleted: "删除",
      statusRenamed: "重命名",
      statusTypeChanged: "类型变更",
      statusUnmerged: "冲突",
      statusUnknown: "变更",
      tagSuffix: "（标签）",
      filesTab: "文件",
      rootLabel: "仓库根目录",
      historyTreeHint: "历史文件树",
      treeEmpty: "没有可显示的文件",
      treeError: "目录读取失败",
      loadingTree: "正在读取目录…",
      clearScope: "清除范围",
      filteredBy: "已按路径筛选",
      resizeTree: "调整文件树宽度",
      resizeDetails: "调整详情宽度",
      expand: "展开",
      collapse: "折叠",
      binaryCompare: "二进制文件无法并排显示",
      emptyDiff: "没有文本差异",
      compareHint: "打开双栏文件对比",
      scope: "范围",
      refreshHint: "重新读取提交历史",
      changes: "更改",
      noChanges: "工作区没有未提交的更改",
      noChangesInScope: "该路径下没有更改",
      refreshChanges: "刷新更改",
      selectAll: "全选",
      clearSelection: "清除选择",
      commitMessagePlaceholder: "提交信息",
      commit: "提交",
      commitKeyHint: "Ctrl+Enter 提交",
      commitMessageRequired: "请填写提交信息",
      commitSelectRequired: "请选择要提交的文件",
      resolveConflictsFirst: "请先解决冲突再提交",
      finishOperationFirst: "请先继续或中止当前 Git 操作",
      selectedFiles: "已选",
      discardChanges: "撤销更改",
      discardTitle: "撤销更改",
      discardUntracked: "未跟踪文件将被永久删除，无法恢复。",
      discardAdded: "新增文件将从暂存区移除并被删除。",
      discardModified: "文件将恢复到最近一次提交的状态。",
      discardDeleted: "被删除的文件将恢复。",
      discardConflict: "冲突标记会被丢弃，文件恢复为 HEAD 版本。",
      discardConfirm: "撤销",
      discarded: "已撤销",
      markResolved: "标记为已解决",
      resolved: "已标记为已解决",
      generateMessage: "生成信息",
      regenerateMessage: "重新生成",
      generateHint: "让当前默认模型根据已勾选文件写一条 type(scope): 描述，写入输入框，提交前可修改",
      showHistory: "查看此分支历史",
      rollback: "回滚更改",
      rollbackTitle: "回滚更改",
      rollbackHint: "选择要还原的文件。回滚会丢弃这些文件的本地改动。",
      rollbackConfirm: "回滚",
      rollbackDeleteAdded: "删除新增文件的本地副本",
      rollbackDone: "已回滚",
      undoCommit: "撤销上次提交",
      undoCommitHint: "把 HEAD 回退一个提交，改动保留在暂存区（soft reset）",
      revertCommit: "还原此提交",
      revertCommitHint: "生成一个反向提交，已推送的历史也可以安全使用",
      cherryPickCommit: "拣选此提交",
      cherryPickCommitHint: "把该提交的改动应用到当前分支",
      checkoutCommit: "检出此提交",
      checkoutCommitHint: "以分离 HEAD 的方式检出该提交（只读查看）",
      historyDone: "操作完成",
      commitActions: "提交操作",
      copyCommitMessage: "复制提交信息",
      fetch: "抓取",
      pull: "拉取",
      push: "推送",
      pullHint: "从当前分支的上游拉取并更新本地分支。",
      pushHint: "把当前分支推送到它的上游；没有上游时推到 origin 并建立跟踪。",
      pullRebase: "用 rebase 而不是 merge",
      forceWithLease: "force-with-lease（远端有别人的提交时会失败）",
      fetchDone: "已抓取远端更新",
      pullDone: "已拉取",
      pushDone: "已推送",
      remoteFailed: "网络操作失败",
      remoteCancelled: "已取消网络操作",
      remoteRunning: "正在与远端通信…",
      branchActions: "分支操作",
      checkoutBranch: "检出分支",
      checkoutRemote: "检出为本地分支",
      createBranch: "新建分支",
      renameBranch: "重命名分支",
      deleteBranch: "删除分支",
      mergeBranch: "合并到当前分支",
      rebaseBranch: "将当前分支变基到此分支",
      continueOperation: "继续",
      abortOperation: "中止",
      branchName: "分支名称",
      newBranchName: "新分支名称",
      branchNameRequired: "请输入分支名称",
      invalidBranchName: "分支名称不合法",
      checkoutAfterCreate: "创建后检出新分支",
      forceDelete: "强制删除（未合并的提交会丢失）",
      cancel: "取消",
      confirm: "确定",
      operationMerge: "合并",
      operationRebase: "变基",
      operationCherryPick: "拣选",
      operationRevert: "还原",
      operationBisect: "二分查找",
      operationHint: "解决冲突后可继续，也可中止本次操作。",
      checkoutUnavailable: "所选引用不是本地分支",
      detachedUnavailable: "游离 HEAD 上无法执行此操作",
      currentBranch: "当前分支",
      ahead: "领先",
      behind: "落后",
      modifiedHint: "已修改",
      conflictHint: "冲突",
      deletedHint: "已删除",
      renamedHint: "重命名",
      branchDone: "操作完成",
      branchAbortConfirm: "确定中止当前的 Git 操作并恢复工作区吗？",
      resizeChanges: "调整更改区高度",
      untracked: "未跟踪",
      staged: "已暂存",
      changesInScope: "当前范围",
      localBranches: "本地分支",
      remoteBranches: "远程分支",
      tags: "标签",
      selectRepo: "选择仓库",
      selectBranch: "选择分支"
    };
    var en = {
      panel: "Git",
      title: "Commit History",
      repo: "Repository",
      branch: "Branch",
      allRefs: "All branches",
      searchPlaceholder: "Search commits, authors, or hashes",
      searchClear: "Clear search",
      refresh: "Refresh",
      commitsUnit: "commits",
      matchesUnit: "matches",
      loading: "Reading Git data…",
      loadingDetail: "Reading commit details…",
      loadingDiff: "Reading diff…",
      noRepos: "No Git repositories available",
      noReposHint: "Add the directory of a Git repository as a DSH workspace to see its history here.",
      noCommits: "No commits under this path",
      noCommitsHint: "Try another branch or clear the path filter.",
      retry: "Retry",
      selectCommit: "Select a commit to inspect its author, changed files, and comparisons.",
      detailTitle: "Commit Details",
      files: "Changed Files",
      fileCountUnit: "files",
      noFiles: "This commit changes no files",
      noFilesInScope: "No changed files under this path",
      diff: "Diff",
      compare: "Compare",
      compareTitle: "File comparison",
      oldVersion: "Before",
      newVersion: "After",
      close: "Close",
      copyHash: "Copy hash",
      copied: "Copied",
      author: "Author",
      committer: "Committer",
      date: "Date",
      parents: "Parents",
      binary: "binary",
      truncated: "output truncated",
      subject: "Commit Message",
      authorColumn: "Author",
      dateColumn: "Date",
      hashColumn: "Hash",
      head: "HEAD",
      detached: "detached HEAD",
      errorTitle: "Could not load",
      fileDiffTruncated: "The diff is large; only the beginning is shown",
      statusAdded: "Added",
      statusModified: "Modified",
      statusDeleted: "Deleted",
      statusRenamed: "Renamed",
      statusTypeChanged: "Type changed",
      statusUnmerged: "Unmerged",
      statusUnknown: "Changed",
      tagSuffix: " (tag)",
      filesTab: "Files",
      rootLabel: "Repository root",
      historyTreeHint: "Revision tree",
      treeEmpty: "No files to show",
      treeError: "Could not read this folder",
      loadingTree: "Reading folders…",
      clearScope: "Clear scope",
      filteredBy: "Filtered by path",
      resizeTree: "Resize file tree",
      resizeDetails: "Resize details",
      expand: "Expand",
      collapse: "Collapse",
      binaryCompare: "Binary files cannot be shown side by side",
      emptyDiff: "No textual changes",
      compareHint: "Open side-by-side comparison",
      scope: "Scope",
      refreshHint: "Reload commit history",
      changes: "Changes",
      noChanges: "No uncommitted changes",
      noChangesInScope: "No changes under this path",
      refreshChanges: "Refresh changes",
      selectAll: "Select all",
      clearSelection: "Clear",
      commitMessagePlaceholder: "Commit message",
      commit: "Commit",
      commitKeyHint: "Ctrl+Enter to commit",
      commitMessageRequired: "Enter a commit message",
      commitSelectRequired: "Select files to commit",
      resolveConflictsFirst: "Resolve conflicts before committing",
      finishOperationFirst: "Finish or abort the paused Git operation first",
      selectedFiles: "Selected",
      discardChanges: "Discard changes",
      discardTitle: "Discard Changes",
      discardUntracked: "The untracked file will be deleted permanently.",
      discardAdded: "The added file will be removed from the index and deleted.",
      discardModified: "The file will be restored to the last commit.",
      discardDeleted: "The deleted file will be restored.",
      discardConflict: "Conflict markers will be discarded and the file restored to HEAD.",
      discardConfirm: "Discard",
      discarded: "Discarded",
      markResolved: "Mark resolved",
      resolved: "Marked resolved",
      generateMessage: "Generate message",
      regenerateMessage: "Regenerate",
      generateHint: "Ask the default model for a type(scope): subject from the checked files and put it in the message box",
      showHistory: "Show this history",
      rollback: "Rollback changes",
      rollbackTitle: "Rollback changes",
      rollbackHint: "Choose the files to restore. Rollback discards their local changes.",
      rollbackConfirm: "Rollback",
      rollbackDeleteAdded: "Delete local copies of added files",
      rollbackDone: "Rolled back",
      undoCommit: "Undo last commit",
      undoCommitHint: "Move HEAD back one commit, keeping the changes staged (soft reset)",
      revertCommit: "Revert commit",
      revertCommitHint: "Create an inverse commit — safe for history that is already pushed",
      cherryPickCommit: "Cherry-pick",
      cherryPickCommitHint: "Apply this commit to the current branch",
      checkoutCommit: "Checkout commit",
      checkoutCommitHint: "Check out this commit with a detached HEAD (read-only)",
      historyDone: "Done",
      commitActions: "Commit actions",
      copyCommitMessage: "Copy commit message",
      fetch: "Fetch",
      pull: "Pull",
      push: "Push",
      pullHint: "Fetch and integrate the upstream of the current branch.",
      pushHint: "Push the current branch to its upstream; origin is used when none is set.",
      pullRebase: "Rebase instead of merge",
      forceWithLease: "force-with-lease (fails if the remote moved)",
      fetchDone: "Fetched remote updates",
      pullDone: "Pulled",
      pushDone: "Pushed",
      remoteFailed: "Remote operation failed",
      remoteCancelled: "Remote operation cancelled",
      remoteRunning: "Talking to the remote…",
      branchActions: "Branch actions",
      checkoutBranch: "Checkout",
      checkoutRemote: "Checkout as local branch",
      createBranch: "New branch",
      renameBranch: "Rename branch",
      deleteBranch: "Delete branch",
      mergeBranch: "Merge into current branch",
      rebaseBranch: "Rebase current branch onto this",
      continueOperation: "Continue",
      abortOperation: "Abort",
      branchName: "Branch name",
      newBranchName: "New branch name",
      branchNameRequired: "Enter a branch name",
      invalidBranchName: "Invalid branch name",
      checkoutAfterCreate: "Checkout the new branch",
      forceDelete: "Force delete (unmerged commits will be lost)",
      cancel: "Cancel",
      confirm: "Confirm",
      operationMerge: "Merging",
      operationRebase: "Rebasing",
      operationCherryPick: "Cherry-picking",
      operationRevert: "Reverting",
      operationBisect: "Bisecting",
      operationHint: "Resolve conflicts to continue, or abort this operation.",
      checkoutUnavailable: "The selected ref is not a local branch",
      detachedUnavailable: "Unavailable on a detached HEAD",
      currentBranch: "Current branch",
      ahead: "ahead",
      behind: "behind",
      modifiedHint: "Modified",
      conflictHint: "Conflict",
      deletedHint: "Deleted",
      renamedHint: "Renamed",
      branchDone: "Done",
      branchAbortConfirm: "Abort the current Git operation and restore the working tree?",
      resizeChanges: "Resize changes pane",
      untracked: "Untracked",
      staged: "Staged",
      changesInScope: "In scope",
      localBranches: "Local branches",
      remoteBranches: "Remote branches",
      tags: "Tags",
      selectRepo: "Select repository",
      selectBranch: "Select branch"
    };

    // src/client/index.tsx
    var PANEL_ID = "git-view";
    var inject = ["slots", "locale"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "git-view: dictionaries");
      const t = ctx.locale.bind(NS);
      ctx.slots.inject(
        "main",
        () => ctx.slots.register({ name: "main", key: PANEL_ID, locale: NS }, GitViewPanel)
      );
      ctx.slots.inject(
        "sidebar.panellist",
        () => ctx.slots.register(
          {
            name: "sidebar.panellist",
            id: PANEL_ID,
            order: 5,
            label: () => t("panel"),
            locale: NS
          },
          GitViewIcon
        )
      );
    }

    return module.exports;
  },
});
