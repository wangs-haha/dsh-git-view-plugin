// src/host/data.ts
import { existsSync } from "node:fs";
import { join } from "node:path";

// src/host/exec.ts
import { execFile, spawn as spawnProcess } from "node:child_process";

// src/host/errors.ts
var GitError = class extends Error {
  /** HTTP status the route should answer with. */
  status;
  /** Set when the failure left a conflicted merge/rebase behind. */
  conflict;
  /**
   * @param message - text shown to the caller.
   * @param status - HTTP status to answer with.
   * @param conflict - whether a conflict marker should be added to the envelope.
   */
  constructor(message, status = 422, conflict = false) {
    super(message);
    this.name = "GitError";
    this.status = status;
    if (conflict) this.conflict = true;
  }
};

// src/host/exec.ts
var MAX_BUFFER = 24 * 1024 * 1024;
var TIMEOUT_MS = 2e4;
var LIMITS = Object.freeze({
  commits: 400,
  files: 400,
  message: 6e4,
  diff: 4e5
});
var CONFIG_ARGS = ["-c", "core.quotepath=false", "-c", "color.ui=false", "-c", "core.pager=cat"];
var UNSAFE_INHERITED_ENV = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_PREFIX"
];
var GIT_ENV = {
  GIT_OPTIONAL_LOCKS: "0",
  GIT_TERMINAL_PROMPT: "0",
  GIT_LITERAL_PATHSPECS: "1",
  // A command that would open an editor must fail or keep its message instead
  // of waiting for a terminal that will never appear.
  GIT_EDITOR: "true",
  GIT_SEQUENCE_EDITOR: "true"
};
var STREAM_ENV = {
  GIT_TERMINAL_PROMPT: "0",
  GIT_OPTIONAL_LOCKS: "0",
  GIT_PAGER: "cat",
  GIT_EDITOR: "true",
  GIT_SEQUENCE_EDITOR: "true",
  LC_ALL: "C",
  LANG: "C"
};
function commandEnv(overrides) {
  const env = { ...process.env };
  for (const key of UNSAFE_INHERITED_ENV) delete env[key];
  return { ...env, ...overrides };
}
function failure(result) {
  if (result.spawnError && result.spawnError.code === "ENOENT") {
    return new GitError("git executable not found on PATH", 503);
  }
  const detail = String(result.stderr || "").trim() || String(result.stdout || "").trim();
  const lines = detail.split(/\r?\n/).filter(Boolean).slice(-6).join("\n");
  const fallback = result.spawnError ? result.spawnError.message : "git command failed";
  return new GitError(lines || fallback);
}
var GitRunner = class {
  /**
   * Run git in `cwd`, returning the exit status instead of throwing.
   * @param cwd - repository root.
   * @param args - git arguments (the executable and config overrides are prepended).
   * @param options - per-call overrides.
   * @returns the captured run.
   */
  runResult(cwd, args, options = {}) {
    return new Promise((resolve2) => {
      execFile(
        "git",
        [...CONFIG_ARGS, ...args],
        {
          cwd,
          env: commandEnv(GIT_ENV),
          windowsHide: true,
          timeout: options.timeout ?? TIMEOUT_MS,
          maxBuffer: options.maxBuffer ?? MAX_BUFFER,
          encoding: "utf8"
        },
        (error, stdout, stderr) => {
          const out = String(stdout || "");
          const err = String(stderr || "");
          if (!error) {
            resolve2({ code: 0, stdout: out, stderr: err });
            return;
          }
          const code = typeof error.code === "number" ? error.code : 1;
          resolve2({ code, stdout: out, stderr: err, spawnError: error });
        }
      );
    });
  }
  /**
   * Run git in `cwd`, throwing {@link GitError} when it fails.
   * @param cwd - repository root.
   * @param args - git arguments (the executable is prepended).
   * @param options - per-call overrides.
   * @returns stdout.
   */
  async run(cwd, args, options = {}) {
    const result = await this.runResult(cwd, args, options);
    if (result.code !== 0) throw failure(result);
    return result.stdout;
  }
  /**
   * Start a streaming git command whose output the caller consumes live.
   *
   * Only remote (network) commands use this: they must not buffer 24 MB of
   * progress output, and they need a stable locale.
   *
   * @param cwd - repository root.
   * @param args - git arguments (the executable is prepended).
   * @param env - extra environment entries; they win over the defaults.
   * @returns the running child process.
   */
  spawn(cwd, args, env = {}) {
    return spawnProcess("git", [...args], {
      cwd,
      env: commandEnv({ ...STREAM_ENV, ...env }),
      windowsHide: true
    });
  }
};

// src/host/paths.ts
var MAX_PATH_LENGTH = 4096;
function repoPath(raw, options = {}) {
  const label = options.label ?? "file path";
  if (typeof raw !== "string") throw new GitError(`invalid ${label}`, 400);
  if (raw === "") {
    if (options.allowEmpty) return "";
    throw new GitError(`invalid ${label}`, 400);
  }
  const invalid = raw.length > MAX_PATH_LENGTH || raw.includes("\0") || raw.startsWith("/") || raw.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(raw) || raw.split("/").some((part) => part === "" || part === "." || part === "..");
  if (invalid) throw new GitError(`invalid ${label}`, 400);
  return raw;
}
function repoPaths(raw, max = 200) {
  if (!Array.isArray(raw)) return [];
  const unique = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of raw) {
    const path = repoPath(value);
    if (seen.has(path)) continue;
    seen.add(path);
    unique.push(path);
  }
  if (unique.length > max) throw new GitError("too many files in one operation", 400);
  return unique;
}

// src/host/data.ts
var GitData = class {
  constructor(runner = new GitRunner()) {
    this.runner = runner;
  }
  runner;
  /**
   * Run git in a repository root and return its stdout.
   * @param root - repository root.
   * @param args - git arguments.
   * @param options - per-call overrides.
   * @returns stdout.
   */
  run(root, args, options = {}) {
    return this.runner.run(root, args, options);
  }
  /**
   * Run git in a repository root, returning the exit status instead of throwing.
   * @param root - repository root.
   * @param args - git arguments.
   * @param options - per-call overrides.
   * @returns the captured run.
   */
  runResult(root, args, options = {}) {
    return this.runner.runResult(root, args, options);
  }
  /**
   * Resolve the working-tree root that contains `directory`.
   * @param directory - absolute directory.
   * @returns absolute repository root.
   */
  async toplevel(directory) {
    const out = await this.runner.run(directory, ["rev-parse", "--show-toplevel"], { timeout: 1e4 });
    const root = out.trim();
    if (!root) throw new GitError("not a Git repository");
    return root;
  }
  /**
   * List local branches, remote-tracking branches, and tags.
   * @param root - repository root.
   * @returns the ref catalogue, HEAD first.
   */
  async refs(root) {
    const format = ["%(refname)", "%(refname:short)", "%(objectname)", "%(*objectname)", "%(HEAD)", "%(symref)"].join("%00");
    const out = await this.runner.run(root, [
      "for-each-ref",
      `--format=${format}`,
      "refs/heads",
      "refs/remotes",
      "refs/tags"
    ]);
    const refs = [];
    for (const line of out.split("\n")) {
      if (!line) continue;
      const [ref, short, object, peeled, head, symref] = line.split("\0");
      if (!ref || !short || symref) continue;
      const kind = ref.startsWith("refs/heads/") ? "branch" : ref.startsWith("refs/remotes/") ? "remote" : "tag";
      refs.push({
        ref,
        short,
        kind,
        head: head === "*",
        target: peeled || object
      });
    }
    const rank = { branch: 0, remote: 1, tag: 2 };
    refs.sort((a, b) => {
      if (a.head !== b.head) return a.head ? -1 : 1;
      if (a.kind !== b.kind) return rank[a.kind] - rank[b.kind];
      return a.short.localeCompare(b.short);
    });
    return refs;
  }
  /**
   * Read the current branch and HEAD commit, tolerating unborn and detached HEADs.
   * @param root - repository root.
   * @returns current branch, HEAD hash, and whether HEAD is detached.
   */
  async head(root) {
    let branch = "";
    try {
      branch = (await this.runner.run(root, ["symbolic-ref", "--short", "-q", "HEAD"])).trim();
    } catch {
      branch = "";
    }
    let hash = "";
    try {
      hash = (await this.runner.run(root, ["rev-parse", "HEAD"])).trim();
    } catch {
      hash = "";
    }
    return { branch, hash, detached: !branch && Boolean(hash) };
  }
  /**
   * List the immediate children of one directory at a ref.
   * @param root - repository root.
   * @param ref - full ref to read, or an empty string for HEAD.
   * @param path - repository-relative directory path ('' for the root).
   * @returns the directory entries, directories first.
   */
  async tree(root, ref, path) {
    let target = "HEAD";
    if (ref) {
      const refs = await this.refs(root);
      if (!refs.some((entry) => entry.ref === ref)) throw new GitError("unknown ref", 400);
      target = ref;
    }
    const spec = path ? `${target}:${path}` : target;
    let out;
    try {
      out = await this.runner.run(root, ["ls-tree", "-z", spec]);
    } catch (error) {
      if (error instanceof GitError && /Not a valid object name|unknown revision|bad revision|does not exist/i.test(error.message)) {
        return [];
      }
      throw error;
    }
    const entries = [];
    for (const record of out.split("\0")) {
      if (!record) continue;
      const tab = record.indexOf("	");
      if (tab < 0) continue;
      const meta = record.slice(0, tab).split(" ");
      const name = record.slice(tab + 1);
      if (!name) continue;
      const type = meta[1] === "tree" ? "tree" : meta[1] === "commit" ? "submodule" : "blob";
      entries.push({
        name,
        path: path ? `${path}/${name}` : name,
        type
      });
    }
    entries.sort((a, b) => {
      const aDir = a.type === "tree" ? 0 : 1;
      const bDir = b.type === "tree" ? 0 : 1;
      if (aDir !== bDir) return aDir - bDir;
      return a.name.localeCompare(b.name);
    });
    return entries;
  }
  /**
   * List the immediate children of one directory in the working tree.
   *
   * Unlike {@link tree} this reads the working tree, not one commit's tree, so
   * untracked files and directories that are not committed yet are visible.
   * Paths match the `.gitignore` rules Git itself applies, and every entry
   * carries the status letter the changes list would show for it.
   *
   * @param root - repository root.
   * @param path - repository-relative directory path ('' for the root).
   * @returns the directory entries with their status letters.
   */
  async worktreeTree(root, path = "") {
    const scope = String(path || "").replace(/^\/+|\/+$/g, "");
    const prefix = scope ? `${scope}/` : "";
    const [listed, status] = await Promise.all([
      this.runner.run(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
        maxBuffer: 32 * 1024 * 1024
      }),
      this.status(root)
    ]);
    const byPath = new Map(status.map((entry) => [entry.path, entry]));
    const dirs = /* @__PURE__ */ new Map();
    const files = [];
    const dirtyDirs = /* @__PURE__ */ new Set();
    for (const changed of byPath.keys()) {
      if (!changed.startsWith(prefix)) continue;
      const rest = changed.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash > 0) dirtyDirs.add(rest.slice(0, slash));
    }
    for (const record of listed.split("\0")) {
      if (!record || !record.startsWith(prefix)) continue;
      const rest = record.slice(prefix.length);
      if (!rest) continue;
      const slash = rest.indexOf("/");
      if (slash >= 0) {
        dirs.set(rest.slice(0, slash), true);
        continue;
      }
      if (files.length >= 2e3) break;
      const entry = byPath.get(record);
      const untracked = Boolean(entry && entry.untracked);
      const conflict = Boolean(entry && entry.conflict);
      const letter = conflict ? "U" : untracked ? "?" : entry ? entry.status : "";
      files.push({
        name: rest,
        path: record,
        type: "blob",
        status: letter || "",
        untracked,
        conflict
      });
    }
    const entries = [];
    for (const name of [...dirs.keys()].sort((a, b) => a.localeCompare(b))) {
      entries.push({
        name,
        path: prefix ? `${prefix}${name}` : name,
        type: "tree",
        status: "",
        untracked: false,
        conflict: false,
        dirty: dirtyDirs.has(name)
      });
    }
    files.sort((a, b) => a.name.localeCompare(b.name));
    for (const file of files) entries.push({ ...file, dirty: false });
    return entries;
  }
  /**
   * List the repository's remote names.
   * @param root - repository root.
   * @returns remote names.
   */
  async remotes(root) {
    const out = await this.runner.run(root, ["remote"]);
    return out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
  /**
   * Build a commit list plus the ref catalogue a branch selector needs.
   * @param root - repository root.
   * @param ref - full ref to walk, or an empty string for every ref.
   * @param limit - maximum commits.
   * @param path - repository-relative path filter (a folder or a file).
   * @returns log payload.
   */
  async log(root, ref, limit, path = "") {
    const refs = await this.refs(root);
    const head = await this.head(root);
    let target = null;
    if (ref) {
      target = refs.find((entry) => entry.ref === ref) || null;
      if (!target) throw new GitError("unknown branch or tag", 400);
    }
    const format = ["%H", "%P", "%an", "%ae", "%aI", "%cn", "%ce", "%cI", "%s"].join("%x1f");
    const sources = target ? [target.ref] : [...head.hash ? ["HEAD"] : [], "--branches", "--remotes", "--tags"];
    if (!target && refs.length === 0 && !head.hash) {
      return { head, refs: [], commits: [] };
    }
    let out;
    try {
      out = await this.runner.run(root, [
        "log",
        ...sources,
        "--topo-order",
        "--date-order",
        `--max-count=${limit}`,
        `--pretty=format:${format}`,
        ...path ? ["--", path] : []
      ]);
    } catch (error) {
      if (error instanceof GitError && /does not have any commits yet|bad default revision|unknown revision/i.test(error.message)) {
        return { head, refs: [], commits: [] };
      }
      throw error;
    }
    const byHash = /* @__PURE__ */ new Map();
    for (const entry of refs) {
      const list = byHash.get(entry.target) || [];
      list.push({ name: entry.short, kind: entry.kind, head: entry.head });
      byHash.set(entry.target, list);
    }
    const commits = [];
    for (const line of out.split("\n")) {
      if (!line) continue;
      const [hash, parents, author, email, date, committer, committerEmail, commitDate, ...rest] = line.split("");
      if (!hash) continue;
      const commitRefs = (byHash.get(hash) || []).slice();
      if (head.detached && head.hash === hash) {
        commitRefs.unshift({ name: "HEAD", kind: "head", head: true });
      }
      commitRefs.sort((a, b) => a.head === b.head ? 0 : a.head ? -1 : 1);
      commits.push({
        hash,
        parents: parents ? parents.split(" ").filter(Boolean) : [],
        author,
        email,
        date,
        committer,
        committerEmail,
        commitDate,
        subject: rest.join(""),
        refs: commitRefs
      });
    }
    return {
      head,
      refs: refs.map(({ ref: fullRef, short, kind, head: isHead }) => ({
        ref: fullRef,
        name: short,
        kind,
        head: isHead
      })),
      commits
    };
  }
  /**
   * Read one commit's metadata and changed files.
   * @param root - repository root.
   * @param hash - full or abbreviated commit hash.
   * @param path - repository-relative scope; only changes under it are listed.
   * @returns commit payload.
   */
  async commit(root, hash, path = "") {
    const format = ["%H", "%P", "%an", "%ae", "%aI", "%cn", "%ce", "%cI", "%B"].join("%x1f");
    const out = await this.runner.run(root, ["show", "-s", `--format=${format}`, hash, "--"]);
    const fields = out.split("");
    if (fields.length < 9) throw new GitError("cannot read commit", 404);
    const [full, parents, author, email, date, committer, committerEmail, commitDate, ...bodyParts] = fields;
    const message = bodyParts.join("").replace(/\s+$/, "").slice(0, LIMITS.message);
    const subject = message.split(/\r?\n/, 1)[0] || "";
    const [statusOut, numstatOut] = await Promise.all([
      this.runner.run(root, [
        "show",
        "--format=",
        "--name-status",
        "--diff-merges=first-parent",
        "--no-renames",
        hash,
        "--",
        ...path ? [path] : []
      ]),
      this.runner.run(root, [
        "show",
        "--format=",
        "--numstat",
        "--diff-merges=first-parent",
        "--no-renames",
        hash,
        "--",
        ...path ? [path] : []
      ])
    ]);
    const stats = /* @__PURE__ */ new Map();
    for (const line of numstatOut.split("\n")) {
      if (!line) continue;
      const [adds, dels, ...pathParts] = line.split("	");
      const filePath = pathParts.join("	");
      if (!filePath) continue;
      stats.set(filePath, {
        additions: adds === "-" ? null : Number(adds) || 0,
        deletions: dels === "-" ? null : Number(dels) || 0,
        binary: adds === "-" || dels === "-"
      });
    }
    let files = [];
    for (const line of statusOut.split("\n")) {
      if (!line) continue;
      const tab = line.indexOf("	");
      if (tab < 0) continue;
      const status = line.slice(0, tab);
      const filePath = line.slice(tab + 1);
      if (!filePath) continue;
      const stat = stats.get(filePath) || { additions: 0, deletions: 0, binary: false };
      files.push({ status: status.charAt(0), path: filePath, ...stat });
      if (files.length >= LIMITS.files) break;
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return {
      hash: full,
      shortHash: full.slice(0, 7),
      parents: parents ? parents.split(" ").filter(Boolean) : [],
      author: { name: author, email },
      date,
      committer: { name: committer, email: committerEmail },
      commitDate,
      subject,
      message,
      files,
      scope: path
    };
  }
  /**
   * Read one file's diff within a commit.
   * @param root - repository root.
   * @param hash - commit hash.
   * @param path - repository-relative path.
   * @returns the diff text, clipped to the diff limit.
   */
  async diff(root, hash, path) {
    const out = await this.runner.run(
      root,
      ["show", "--format=", "--no-ext-diff", "--unified=3", "--diff-merges=first-parent", hash, "--", path],
      { maxBuffer: 32 * 1024 * 1024 }
    );
    const truncated = out.length > LIMITS.diff;
    return {
      path,
      text: truncated ? `${out.slice(0, LIMITS.diff)}
… diff truncated …
` : out,
      truncated
    };
  }
  /**
   * Read the working-tree status without touching the index.
   * @param root - repository root.
   * @returns changed entries.
   */
  async status(root) {
    const out = await this.runner.run(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames"]);
    const entries = [];
    for (const record of out.split("\0")) {
      if (!record) continue;
      const x = record.charAt(0);
      const y = record.charAt(1);
      const path = record.slice(3);
      if (!path) continue;
      if (x === "!" && y === "!") continue;
      const untracked = x === "?" && y === "?";
      const conflict = x === "U" || y === "U" || x === "A" && y === "A" || x === "D" && y === "D";
      const staged = !untracked && x !== " ";
      const unstaged = untracked || y !== " ";
      const status = untracked ? "A" : conflict ? "U" : x !== " " ? x : y;
      entries.push({
        path,
        status,
        x,
        y,
        untracked,
        staged,
        unstaged,
        conflict
      });
      if (entries.length >= 2e3) break;
    }
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries;
  }
  /**
   * Collect a bounded diff of the working tree for an AI commit message.
   * @param root - repository root.
   * @param paths - partial paths, or [] for every change.
   * @param all - include every change.
   * @returns diff text.
   */
  async workingSummary(root, paths, all) {
    const targets = all ? [] : (paths || []).filter((value) => typeof value === "string" && value !== "");
    const suffix = targets.length > 0 ? ["--", ...targets] : [];
    const [staged, unstaged] = await Promise.all([
      this.runner.run(root, ["diff", "--cached", "--no-ext-diff", "--unified=2", ...suffix], { maxBuffer: 16 * 1024 * 1024 }),
      this.runner.run(root, ["diff", "--no-ext-diff", "--unified=2", ...suffix], { maxBuffer: 16 * 1024 * 1024 })
    ]);
    const parts = [];
    if (staged.trim()) parts.push(`--- staged ---
${staged.trim()}`);
    if (unstaged.trim()) parts.push(`--- unstaged ---
${unstaged.trim()}`);
    return parts.join("\n\n").slice(0, 24e3);
  }
  /**
   * Stage and commit either every working-tree change or only the given paths.
   *
   * Partial commits use a pathspec-limited commit so unrelated staged work stays
   * staged and is not recorded.
   *
   * @param root - repository root.
   * @param message - commit message.
   * @param paths - repository-relative paths for a partial commit.
   * @param all - commit every change instead.
   * @returns committed revision.
   */
  async commitChanges(root, message, paths, all) {
    const text = String(message || "").trim();
    if (!text) throw new GitError("commit message is required", 400);
    if (text.includes("\0")) throw new GitError("commit message contains an invalid character", 400);
    if (text.length > 5e3) throw new GitError("commit message is too long", 400);
    if (!all) {
      const targets = [...new Set((paths || []).filter((value) => typeof value === "string" && value !== ""))];
      if (targets.length === 0) throw new GitError("select at least one changed file", 400);
      if (targets.length > 200) throw new GitError("too many files in one commit", 400);
      for (const target of targets) {
        repoPath(target);
      }
      const indexed = new Set(
        (await this.runner.run(root, ["ls-files", "-z", "--"])).split("\0").filter(Boolean)
      );
      const addable = targets.filter((target) => indexed.has(target) || existsSync(join(root, target)));
      if (addable.length > 0) {
        await this.runner.run(root, ["add", "-A", "--", ...addable]);
      }
      await this.runner.run(root, ["commit", "-m", text, "--", ...targets]);
    } else {
      await this.runner.run(root, ["add", "-A"]);
      await this.runner.run(root, ["commit", "-m", text]);
    }
    const hash = (await this.runner.run(root, ["rev-parse", "HEAD"])).trim();
    return { hash, message: text, output: "" };
  }
};

// src/host/ops.ts
import { existsSync as existsSync2 } from "node:fs";
import { isAbsolute, join as join2, resolve } from "node:path";
var MAX_OUTPUT = 6e3;
var CONFLICT_PATTERN = /CONFLICT|Automatic merge failed|Resolve all conflicts|needs merge|could not apply|error: could not apply/i;
var INVALID_NAME = /[\u0000-\u0020\u007f~^:?*\[\\]/;
var CONTINUE_ARGS = {
  merge: ["merge", "--continue"],
  rebase: ["rebase", "--continue"],
  "cherry-pick": ["cherry-pick", "--continue"],
  revert: ["revert", "--continue"]
};
var ABORT_ARGS = {
  merge: ["merge", "--abort"],
  rebase: ["rebase", "--abort"],
  "cherry-pick": ["cherry-pick", "--abort"],
  revert: ["revert", "--abort"],
  bisect: ["bisect", "reset"]
};
function outputText(result) {
  const text = [result.stdout, result.stderr].map((value) => String(value || "").trim()).filter(Boolean).join("\n").trim();
  return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}
…` : text;
}
function writeFailure(result, fallback) {
  const text = outputText(result);
  const error = text ? failure(result) : new GitError(fallback);
  if (CONFLICT_PATTERN.test(text)) return new GitError(error.message, 409, true);
  return error;
}
function assertBranchName(value, label = "branch name") {
  const name = String(value ?? "").trim();
  if (!name) throw new GitError(`${label} is required`, 400);
  if (name.length > 200) throw new GitError(`${label} is too long`, 400);
  if (name.startsWith("-") || name.startsWith("/") || name.startsWith(".") || name.startsWith("refs/") || name.endsWith("/") || name.endsWith(".") || name.endsWith(".lock") || name === "@" || name.includes("..") || name.includes("//") || name.includes("@{") || INVALID_NAME.test(name)) {
    throw new GitError(`invalid ${label}: ${name}`, 400);
  }
  return name;
}
function assertCommitHash(value) {
  const hash = String(value ?? "").trim();
  if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError("invalid commit hash", 400);
  return hash;
}
var RepoWriteLock = class {
  active = /* @__PURE__ */ new Set();
  /**
   * Claim the single write slot of one repository.
   * @param root - repository root.
   * @returns release callback; calling it more than once is harmless.
   */
  begin(root) {
    if (this.active.has(root)) {
      throw new GitError("another Git operation is already running for this repository", 409);
    }
    this.active.add(root);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active.delete(root);
    };
  }
  /**
   * Whether a write currently holds the slot of one repository.
   * @param root - repository root.
   * @returns true while a write is in flight.
   */
  isBusy(root) {
    return this.active.has(root);
  }
};
var GitOps = class {
  constructor(data = new GitData()) {
    this.data = data;
  }
  data;
  /** The write slot shared with remote jobs. */
  lock = new RepoWriteLock();
  /**
   * Claim the write slot of one repository.
   * @param root - repository root.
   * @returns release callback.
   */
  beginWrite(root) {
    return this.lock.begin(root);
  }
  /**
   * Detect the current branch, upstream tracking, ahead/behind counts, and any
   * merge/rebase/cherry-pick/revert/bisect operation left in progress.
   * @param root - repository root.
   * @returns repository state.
   */
  async state(root) {
    const head = await this.data.head(root);
    let gitDir = "";
    try {
      gitDir = (await this.data.run(root, ["rev-parse", "--absolute-git-dir"])).trim();
    } catch {
      try {
        const relative = (await this.data.run(root, ["rev-parse", "--git-dir"])).trim();
        gitDir = relative ? isAbsolute(relative) ? relative : resolve(root, relative) : "";
      } catch {
        gitDir = "";
      }
    }
    const has = (name) => {
      if (!gitDir) return false;
      try {
        return existsSync2(join2(gitDir, name));
      } catch {
        return false;
      }
    };
    let operation = "";
    if (has("rebase-merge") || has("rebase-apply")) operation = "rebase";
    else if (has("MERGE_HEAD")) operation = "merge";
    else if (has("CHERRY_PICK_HEAD")) operation = "cherry-pick";
    else if (has("REVERT_HEAD")) operation = "revert";
    else if (has("BISECT_LOG")) operation = "bisect";
    let upstream = "";
    let upstreamRef = "";
    let ahead = 0;
    let behind = 0;
    if (head.branch) {
      try {
        upstream = (await this.data.run(root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])).trim();
        try {
          upstreamRef = (await this.data.run(root, ["rev-parse", "--symbolic-full-name", "@{upstream}"])).trim();
        } catch {
          upstreamRef = "";
        }
        const counts = (await this.data.run(root, ["rev-list", "--left-right", "--count", "@{upstream}...HEAD"])).trim().split(/\s+/);
        behind = Number.parseInt(counts[0], 10) || 0;
        ahead = Number.parseInt(counts[1], 10) || 0;
      } catch {
        upstream = "";
        upstreamRef = "";
        ahead = 0;
        behind = 0;
      }
    }
    return {
      branch: head.branch,
      hash: head.hash,
      detached: head.detached,
      unborn: Boolean(head.branch && !head.hash),
      operation,
      upstream,
      upstreamRef,
      ahead,
      behind
    };
  }
  /**
   * Switch the working tree to an existing local branch.
   * @param root - repository root.
   * @param rawName - branch name.
   * @returns operation result.
   */
  async checkoutBranch(root, rawName) {
    const name = assertBranchName(rawName);
    const entry = await this.findLocalBranch(root, name);
    if (!entry) throw new GitError(`branch not found: ${name}`, 404);
    const head = await this.data.head(root);
    if (head.branch === entry.short) {
      return { op: "checkout", branch: entry.short, unchanged: true, output: "" };
    }
    let result = await this.data.runResult(root, ["switch", entry.short]);
    if (result.code !== 0 && /not a git command|unknown subcommand|is not a git command/i.test(result.stderr || "")) {
      result = await this.data.runResult(root, ["checkout", entry.short]);
    }
    if (result.code !== 0) throw writeFailure(result, "could not switch branches");
    return { op: "checkout", branch: entry.short, output: outputText(result) };
  }
  /**
   * Create a local branch, optionally starting at a ref and switching to it.
   * @param root - repository root.
   * @param options - branch details.
   * @returns operation result.
   */
  async createBranch(root, options) {
    const name = assertBranchName(options.name);
    await this.assertRefFormat(root, name);
    if (await this.findLocalBranch(root, name)) throw new GitError(`branch already exists: ${name}`, 409);
    const start = options.startRef ? (await this.resolveRef(root, options.startRef)).ref : "";
    const wantCheckout = options.checkout !== false;
    const suffix = start ? [start] : [];
    let result;
    if (wantCheckout) {
      result = await this.data.runResult(root, ["switch", "-c", name, ...suffix]);
      if (result.code !== 0 && /not a git command|unknown subcommand|is not a git command/i.test(result.stderr || "")) {
        result = await this.data.runResult(root, ["checkout", "-b", name, ...suffix]);
      }
    } else {
      result = await this.data.runResult(root, ["branch", name, ...suffix]);
    }
    if (result.code !== 0) {
      throw writeFailure(result, "could not create the branch");
    }
    return {
      op: "create",
      branch: name,
      startRef: start,
      checkout: wantCheckout,
      output: outputText(result)
    };
  }
  /**
   * Rename a local branch (the current branch included).
   * @param root - repository root.
   * @param rawName - existing branch name.
   * @param rawNewName - new branch name.
   * @returns operation result.
   */
  async renameBranch(root, rawName, rawNewName) {
    const name = assertBranchName(rawName);
    const entry = await this.findLocalBranch(root, name);
    if (!entry) throw new GitError(`branch not found: ${name}`, 404);
    const newName = assertBranchName(rawNewName, "new branch name");
    await this.assertRefFormat(root, newName);
    if (newName === entry.short) {
      return { op: "rename", branch: entry.short, newName, unchanged: true, output: "" };
    }
    if (await this.findLocalBranch(root, newName)) throw new GitError(`branch already exists: ${newName}`, 409);
    const result = await this.data.runResult(root, ["branch", "-m", entry.short, newName]);
    if (result.code !== 0) throw writeFailure(result, "could not rename the branch");
    return { op: "rename", branch: entry.short, newName, output: outputText(result) };
  }
  /**
   * Delete a local branch. The checked-out branch is never removable, and a
   * non-force delete keeps Git's "not fully merged" protection.
   * @param root - repository root.
   * @param rawName - branch name.
   * @param force - pass `-D` instead of `-d`.
   * @returns operation result.
   */
  async deleteBranch(root, rawName, force) {
    const name = assertBranchName(rawName);
    const entry = await this.findLocalBranch(root, name);
    if (!entry) throw new GitError(`branch not found: ${name}`, 404);
    const head = await this.data.head(root);
    if (head.branch === entry.short) {
      throw new GitError("cannot delete the branch that is currently checked out", 409);
    }
    const result = await this.data.runResult(root, ["branch", force === true ? "-D" : "-d", entry.short]);
    if (result.code !== 0) throw writeFailure(result, "could not delete the branch");
    return { op: "delete", branch: entry.short, force: force === true, output: outputText(result) };
  }
  /**
   * Merge one branch, remote branch, tag, or commit into the current branch.
   * @param root - repository root.
   * @param rawRef - full ref or commit hash.
   * @returns operation result.
   */
  async mergeRef(root, rawRef) {
    const target = await this.resolveRef(root, rawRef, { allowHash: true });
    const head = await this.data.head(root);
    if (!head.branch) throw new GitError("cannot merge into a detached HEAD", 409);
    if (target.kind === "branch" && target.short === head.branch) {
      throw new GitError("cannot merge a branch into itself", 400);
    }
    const result = await this.data.runResult(root, ["merge", "--no-edit", target.ref]);
    if (result.code !== 0) throw writeFailure(result, "merge failed");
    return {
      op: "merge",
      branch: head.branch,
      ref: target.ref,
      target: target.short,
      output: outputText(result)
    };
  }
  /**
   * Rebase the current branch onto another branch, remote branch, tag, or commit.
   * @param root - repository root.
   * @param rawRef - full ref or commit hash.
   * @returns operation result.
   */
  async rebaseRef(root, rawRef) {
    const target = await this.resolveRef(root, rawRef, { allowHash: true });
    const head = await this.data.head(root);
    if (!head.branch) throw new GitError("cannot rebase a detached HEAD", 409);
    if (target.kind === "branch" && target.short === head.branch) {
      throw new GitError("cannot rebase a branch onto itself", 400);
    }
    const result = await this.data.runResult(root, ["rebase", target.ref]);
    if (result.code !== 0) throw writeFailure(result, "rebase failed");
    return {
      op: "rebase",
      branch: head.branch,
      ref: target.ref,
      target: target.short,
      output: outputText(result)
    };
  }
  /**
   * Resume a paused merge/rebase/cherry-pick/revert after conflicts were marked
   * resolved. An empty `core.editor` keeps the existing message without opening
   * an editor the browser cannot display.
   * @param root - repository root.
   * @returns operation result.
   */
  async continueOperation(root) {
    const state = await this.state(root);
    const args = CONTINUE_ARGS[state.operation];
    if (!args) throw new GitError("no paused Git operation can be continued", 409);
    const result = await this.data.runResult(root, ["-c", "core.editor=true", ...args]);
    if (result.code !== 0) throw writeFailure(result, `could not continue the ${state.operation}`);
    return { op: "continue", operation: state.operation, output: outputText(result) };
  }
  /**
   * Cancel a paused merge/rebase/cherry-pick/revert/bisect.
   * @param root - repository root.
   * @returns operation result.
   */
  async abortOperation(root) {
    const state = await this.state(root);
    const args = ABORT_ARGS[state.operation];
    if (!args) throw new GitError("no paused Git operation can be aborted", 409);
    const result = await this.data.runResult(root, args);
    if (result.code !== 0) throw writeFailure(result, `could not abort the ${state.operation}`);
    return { op: "abort", operation: state.operation, output: outputText(result) };
  }
  /**
   * Discard working-tree changes for specific files, choosing the safe command
   * for each Git state:
   *
   * - untracked files are removed with `git clean -f`;
   * - files newly added to the index are removed from the index and worktree;
   * - tracked modifications, deletions, renames, and conflicted files are
   *   restored from HEAD in both the index and the worktree.
   *
   * @param root - repository root.
   * @param rawPaths - repository-relative files the user confirmed.
   * @param options - keep newly added files on disk when `deleteAdded` is false.
   * @returns operation result.
   */
  async discardChanges(root, rawPaths, options = {}) {
    const deleteAdded = options.deleteAdded !== false;
    const requested = repoPaths(rawPaths);
    if (requested.length === 0) throw new GitError("select at least one changed file", 400);
    const entries = await this.data.status(root);
    const byPath = new Map(entries.map((entry) => [entry.path, entry]));
    const found = requested.map((path) => byPath.get(path)).filter((entry) => entry !== void 0);
    if (found.length === 0) throw new GitError("the selected files have no changes", 422);
    const untracked = [];
    const added = [];
    const keepAdded = [];
    const tracked = [];
    const addedCandidates = found.filter((entry) => !entry.untracked && !entry.conflict && entry.x === "A");
    const headFiles = /* @__PURE__ */ new Set();
    if (addedCandidates.length > 0) {
      const result = await this.data.runResult(root, [
        "ls-tree",
        "-r",
        "--name-only",
        "-z",
        "HEAD",
        "--",
        ...addedCandidates.map((entry) => entry.path)
      ]);
      if (result.code === 0) {
        for (const name of result.stdout.split("\0")) {
          if (name) headFiles.add(name);
        }
      }
    }
    for (const entry of found) {
      if (entry.conflict) tracked.push(entry.path);
      else if (entry.untracked) {
        if (deleteAdded) untracked.push(entry.path);
      } else if (entry.x === "A" && !headFiles.has(entry.path)) {
        if (deleteAdded) added.push(entry.path);
        else keepAdded.push(entry.path);
      } else tracked.push(entry.path);
    }
    const outputs = [];
    const run = async (args, fallback) => {
      const result = await this.data.runResult(root, args);
      if (result.code !== 0) throw writeFailure(result, fallback);
      const text = outputText(result);
      if (text) outputs.push(text);
    };
    if (untracked.length > 0) {
      await run(["clean", "-f", "--", ...untracked], "could not remove untracked files");
    }
    if (added.length > 0) {
      await run(["rm", "-f", "--ignore-unmatch", "--", ...added], "could not remove added files");
    }
    if (keepAdded.length > 0) {
      await run(["rm", "--cached", "-r", "-q", "--ignore-unmatch", "--", ...keepAdded], "could not unstage the added files");
    }
    if (tracked.length > 0) {
      let result = await this.data.runResult(root, [
        "restore",
        "--source=HEAD",
        "--staged",
        "--worktree",
        "--",
        ...tracked
      ]);
      if (result.code !== 0 && /not a git command|unknown subcommand|is not a git command/i.test(result.stderr || "")) {
        result = await this.data.runResult(root, ["checkout", "HEAD", "--", ...tracked]);
      }
      if (result.code !== 0) throw writeFailure(result, "could not restore files");
      const text = outputText(result);
      if (text) outputs.push(text);
    }
    return {
      op: "discard",
      count: found.length,
      paths: found.map((entry) => entry.path),
      kept: keepAdded,
      output: outputs.join("\n")
    };
  }
  /**
   * Roll back a multi-file selection, with IDEA's "delete local copies of added
   * files" option: when it is off, newly added files are only unstaged.
   * @param root - repository root.
   * @param rawPaths - repository-relative files to roll back.
   * @param options - whether new files are removed from disk.
   * @returns operation result.
   */
  async rollbackChanges(root, rawPaths, options = {}) {
    const result = await this.discardChanges(root, rawPaths, options);
    return { ...result, op: "rollback" };
  }
  /**
   * Commit-level operations offered from the details pane: undo the last commit,
   * reset to a commit, revert it, cherry-pick it, or check it out detached.
   * Merge commits are refused for undo/revert/cherry-pick because they need a
   * mainline parent the panel cannot choose for the user.
   * @param root - repository root.
   * @param params - `op`, `hash`, optional `mode`.
   * @returns operation result.
   */
  async commitHistoryOperation(root, params = {}) {
    const op = String(params.op || "");
    if (op === "undo") {
      const head = await this.data.head(root);
      if (!head.hash) throw new GitError("the repository has no commits", 422);
      const parents2 = await this.resolveParents(root, "HEAD");
      if (parents2.length > 1) throw new GitError("cannot undo a merge commit — revert it instead", 409);
      if (parents2.length === 0) {
        if (!head.branch) {
          throw new GitError("cannot undo the root commit while HEAD is detached", 409);
        }
        const branchRef = `refs/heads/${assertBranchName(head.branch)}`;
        const output2 = await this.runWrite(
          root,
          ["update-ref", "-d", branchRef, head.hash],
          "could not undo the first commit"
        );
        return { op: "undo", from: head.hash, to: null, output: output2 };
      }
      const output = await this.runWrite(root, ["reset", "--soft", parents2[0], "--"], "could not undo the last commit");
      return { op: "undo", from: head.hash, to: parents2[0], output };
    }
    const hash = assertCommitHash(params.hash);
    const parents = await this.resolveParents(root, hash);
    const merge = parents.length > 1;
    if (op === "reset") {
      const mode = ["soft", "mixed", "hard"].includes(String(params.mode)) ? String(params.mode) : "mixed";
      const output = await this.runWrite(root, ["reset", `--${mode}`, hash, "--"], "could not reset to that commit");
      return { op: "reset", mode, hash, output };
    }
    if (op === "revert") {
      if (merge) throw new GitError("reverting a merge commit is not supported here", 409);
      const output = await this.runWrite(root, ["revert", "--no-edit", "--", hash], "could not revert that commit");
      return { op: "revert", hash, output };
    }
    if (op === "cherryPick") {
      if (merge) throw new GitError("cherry-picking a merge commit is not supported here", 409);
      const output = await this.runWrite(root, ["cherry-pick", "--", hash], "could not cherry-pick that commit");
      return { op: "cherryPick", hash, output };
    }
    if (op === "checkout") {
      const output = await this.runWrite(root, ["switch", "--detach", hash], "could not check out that commit");
      return { op: "checkout", hash, output };
    }
    throw new GitError("unknown history operation", 404);
  }
  /**
   * Mark conflicted files as resolved by staging them, so a paused merge/rebase
   * can continue. Only paths that are currently unmerged are accepted.
   * @param root - repository root.
   * @param rawPaths - repository-relative conflicted files.
   * @returns operation result.
   */
  async stageResolvedPaths(root, rawPaths) {
    const requested = repoPaths(rawPaths);
    if (requested.length === 0) throw new GitError("select at least one conflicted file", 400);
    const entries = await this.data.status(root);
    const conflicted = new Set(entries.filter((entry) => entry.conflict).map((entry) => entry.path));
    const paths = requested.filter((path) => conflicted.has(path));
    if (paths.length === 0) throw new GitError("the selected files are not in conflict", 422);
    const result = await this.data.runResult(root, ["add", "-A", "--", ...paths]);
    if (result.code !== 0) throw writeFailure(result, "could not stage the resolved files");
    return {
      op: "stage",
      count: paths.length,
      paths,
      output: outputText(result)
    };
  }
  /**
   * Dispatch one branch operation requested by the browser.
   * @param root - repository root.
   * @param op - operation name.
   * @param params - validated body fields.
   * @returns operation result.
   */
  async runBranchOperation(root, op, params = {}) {
    switch (String(op || "")) {
      case "checkout":
        return this.checkoutBranch(root, params.branch);
      case "create":
        return this.createBranch(root, {
          name: params.name ?? params.branch,
          startRef: params.startRef,
          checkout: params.checkout !== false
        });
      case "rename":
        return this.renameBranch(root, params.branch, params.newName);
      case "delete":
        return this.deleteBranch(root, params.branch, params.force === true);
      case "merge":
        return this.mergeRef(root, params.ref);
      case "rebase":
        return this.rebaseRef(root, params.ref);
      case "continue":
        return this.continueOperation(root);
      case "abort":
        return this.abortOperation(root);
      default:
        throw new GitError("unknown branch operation", 404);
    }
  }
  /**
   * Ask git itself whether a branch name is well formed.
   * @param root - repository root.
   * @param name - candidate name.
   * @returns resolves when accepted.
   */
  async assertRefFormat(root, name) {
    const result = await this.data.runResult(root, ["check-ref-format", "--branch", name]);
    if (result.code !== 0) throw new GitError(`invalid branch name: ${name}`, 400);
  }
  /**
   * Find one local branch by short or full name.
   * @param root - repository root.
   * @param name - short or full branch name.
   * @returns the matching ref entry, or null.
   */
  async findLocalBranch(root, name) {
    const full = name.startsWith("refs/heads/") ? name : `refs/heads/${name}`;
    const refs = await this.data.refs(root);
    return refs.find((entry) => entry.kind === "branch" && entry.ref === full) || null;
  }
  /**
   * Resolve a full ref (or, optionally, a commit hash) the caller selected in the
   * UI. Refs must be exact catalogue entries; revisions such as `--all` or
   * `HEAD~1` are rejected.
   * @param root - repository root.
   * @param raw - full ref or hash.
   * @param options - whether abbreviated hashes are accepted.
   * @returns resolved ref.
   */
  async resolveRef(root, raw, options = {}) {
    const value = String(raw ?? "").trim();
    if (!value || value.startsWith("-")) throw new GitError("invalid ref", 400);
    const refs = await this.data.refs(root);
    const exact = refs.find((entry) => entry.ref === value);
    if (exact) return exact;
    if (options.allowHash && /^[0-9a-f]{4,64}$/i.test(value)) {
      const result = await this.data.runResult(root, ["rev-parse", "--verify", "--quiet", `${value}^{commit}`]);
      if (result.code === 0) return { ref: value, short: value.slice(0, 7), kind: "commit", head: false };
      throw new GitError(`unknown revision: ${value}`, 404);
    }
    throw new GitError(`unknown ref: ${value}`, 404);
  }
  /**
   * Run one write command and return its bounded output.
   * @param root - repository root.
   * @param args - git arguments.
   * @param fallback - message used when git printed nothing.
   * @returns output text.
   */
  async runWrite(root, args, fallback) {
    const result = await this.data.runResult(root, args);
    if (result.code !== 0) throw writeFailure(result, fallback);
    return outputText(result);
  }
  /**
   * Parents of one commit, from `rev-list --parents`.
   * @param root - repository root.
   * @param ref - commit-ish.
   * @returns parent hashes.
   */
  async resolveParents(root, ref) {
    const out = await this.data.run(root, ["rev-list", "--parents", "-n", "1", ref, "--"]);
    const parts = out.trim().split(/\s+/).filter(Boolean);
    return parts.slice(1);
  }
};

// src/host/remote-command.ts
var REMOTE_OPS = Object.freeze(["fetch", "pull", "push"]);
function assertRemoteOp(value) {
  const op = String(value || "").trim();
  if (!REMOTE_OPS.includes(op)) throw new GitError("unknown remote operation", 404);
  return op;
}
function assertSafeArg(value, label) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("-")) throw new GitError(`invalid ${label}`, 400);
  return text;
}
function parseUpstream(upstreamRef, remotes) {
  const prefix = "refs/remotes/";
  if (!upstreamRef.startsWith(prefix)) return null;
  const rest = upstreamRef.slice(prefix.length);
  const matches = remotes.filter((remote) => rest.startsWith(`${remote}/`)).sort((a, b) => b.length - a.length);
  for (const remote of matches) {
    const branch = rest.slice(remote.length + 1);
    if (branch && branch !== "HEAD") return { remote, branch };
  }
  return null;
}
function buildRemoteCommand(op, context = {}, options = {}) {
  const branch = String(context.branch || "").trim();
  const upstream = String(context.upstream || "").trim();
  const upstreamRef = String(context.upstreamRef || "").trim();
  const remotes = Array.isArray(context.remotes) ? context.remotes.filter((name) => typeof name === "string" && name) : [];
  if (op === "fetch") {
    return { args: ["fetch", "--all", "--prune", "--progress"], label: "fetch" };
  }
  if (op === "pull") {
    if (context.detached) throw new GitError("cannot pull while HEAD is detached", 409);
    if (!upstream) throw new GitError("the current branch has no upstream — push it first", 409);
    const strategy = options.rebase ? "--rebase" : "--no-rebase";
    return { args: ["pull", "--progress", strategy, "--ff"], label: `pull ${upstream}` };
  }
  if (op === "push") {
    if (context.detached) throw new GitError("cannot push while HEAD is detached", 409);
    if (remotes.length === 0) throw new GitError("no remote is configured for this repository", 409);
    const args = ["push", "--progress"];
    if (options.forceWithLease) args.push("--force-with-lease");
    if (options.tags) args.push("--follow-tags");
    if (upstream) {
      const target = parseUpstream(upstreamRef, remotes);
      if (!target) {
        throw new GitError(
          "cannot determine the upstream remote — push once from a terminal to repair the tracking ref",
          409
        );
      }
      args.push(target.remote, `HEAD:refs/heads/${target.branch}`);
      return { args, label: `push ${target.remote}/${target.branch}` };
    }
    const remote = remotes.includes("origin") ? "origin" : remotes[0];
    const name = assertSafeArg(branch || "HEAD", "branch name");
    args.push("--set-upstream", remote, name);
    return { args, label: `push ${remote}/${name}` };
  }
  throw new GitError("unknown remote operation", 404);
}
function remoteErrorText(text) {
  const raw = String(text || "").trim();
  const last = raw.split(/\r?\n/).filter(Boolean).slice(-4).join("\n");
  if (/could not read Username|terminal prompts disabled|Authentication failed|Permission denied \(publickey\)|fatal: could not read Password/i.test(
    raw
  )) {
    return `${last}
凭据缺失：请先在终端完成一次 git 认证，或配置 credential helper / SSH key 后重试。`;
  }
  return last || "git remote operation failed";
}
var RemoteCommandBuilder = Object.freeze({
  assertOp: assertRemoteOp,
  build: buildRemoteCommand,
  errorText: remoteErrorText
});

// src/host/remote.ts
var REMOTE_TIMEOUT_MS = 10 * 60 * 1e3;
var REMOTE_KILL_GRACE_MS = 15e3;
var REMOTE_DISPOSE_WAIT_MS = 3e3;
var REMOTE_KEEP_MS = 10 * 60 * 1e3;
var MAX_LINES = 200;
var SNAPSHOT_LINES = 40;
var RemoteService = class {
  jobs = /* @__PURE__ */ new Map();
  sequence = 0;
  disposing = false;
  data;
  ops;
  lock;
  runner;
  constructor(options) {
    this.data = options.data;
    this.ops = options.ops;
    this.lock = options.lock;
    this.runner = options.runner ?? new GitRunner();
  }
  /**
   * Start `git fetch|pull|push` as a job and stream its output into the job
   * record. The per-repository write lock is held from before the state read
   * until the job settles.
   * @param repo - resolved repository.
   * @param body - parsed request body (`op`, `rebase`, `forceWithLease`, `tags`).
   * @returns `{ ok, id, op, label }`.
   */
  async start(repo, body) {
    if (this.disposing) throw new GitError("the Git plugin is shutting down", 503);
    const op = assertRemoteOp(body.op);
    const release = this.lock.begin(repo.root);
    let job = null;
    try {
      const [state, remotes] = await Promise.all([this.ops.state(repo.root), this.data.remotes(repo.root)]);
      const { args, label } = buildRemoteCommand(
        op,
        {
          branch: state.branch,
          upstream: state.upstream,
          upstreamRef: state.upstreamRef,
          detached: state.detached,
          remotes
        },
        {
          rebase: body.rebase === true,
          forceWithLease: body.forceWithLease === true,
          tags: body.tags === true
        }
      );
      this.prune();
      const id = `remote-${++this.sequence}-${Date.now().toString(36)}`;
      let resolveDone = () => void 0;
      const done = new Promise((resolve2) => {
        resolveDone = resolve2;
      });
      job = {
        id,
        op,
        label,
        repo: repo.root,
        state: "running",
        startedAt: Date.now(),
        endedAt: null,
        percent: null,
        exitCode: null,
        error: "",
        lines: [],
        child: null,
        release,
        watchdog: null,
        stopTimer: null,
        cancelRequested: false,
        timeoutError: "",
        settled: false,
        done,
        resolveDone
      };
      this.jobs.set(id, job);
      let child;
      try {
        child = this.runner.spawn(repo.root, args);
      } catch (error) {
        throw new GitError(error instanceof Error ? error.message : String(error), 502);
      }
      job.child = child;
      const absorb = (chunk) => {
        for (const raw of String(chunk).split(/[\r\n]+/)) {
          const line = raw.trim();
          if (!line) continue;
          job.lines.push(line);
          if (job.lines.length > MAX_LINES) job.lines.shift();
          const match = /(\d{1,3})%/.exec(line);
          if (match) job.percent = Math.max(job.percent || 0, Number(match[1]));
        }
      };
      child.stdout?.on("data", absorb);
      child.stderr?.on("data", absorb);
      const current = job;
      child.on("error", (error) => {
        this.settle(current, {
          state: "error",
          error: `无法启动 git：${error.message}`
        });
      });
      child.on("close", () => {
        if (current.settled) return;
        const exitCode = typeof child.exitCode === "number" ? child.exitCode : null;
        current.exitCode = exitCode;
        if (current.cancelRequested) {
          this.settle(current, { state: "cancelled" });
        } else if (current.timeoutError) {
          this.settle(current, { state: "error", error: current.timeoutError });
        } else if (exitCode === 0) {
          current.percent = 100;
          this.settle(current, { state: "done" });
        } else {
          this.settle(current, { state: "error", error: remoteErrorText(current.lines.join("\n")) });
        }
      });
      current.watchdog = setTimeout(() => {
        this.onDeadline(current);
      }, REMOTE_TIMEOUT_MS);
      return { ok: true, id, op, label };
    } catch (error) {
      if (job) this.jobs.delete(job.id);
      release();
      throw error;
    }
  }
  /**
   * Ask a running remote job to stop. Re-issuing the stop request is safe: it
   * kills the child again if the first signal did not take effect.
   * @param id - job id.
   * @returns acknowledgement.
   */
  cancel(id) {
    const job = this.jobs.get(String(id || ""));
    if (!job) throw new GitError("unknown remote job", 404);
    if (job.settled) return { ok: true, id: job.id, state: job.state };
    job.cancelRequested = true;
    if (!job.timeoutError) job.state = "cancelling";
    this.killChild(job);
    this.armForceSettle(job, "cancelled", job.error || "网络操作取消超时（进程未响应）");
    return { ok: true, id: job.id, state: job.state };
  }
  /**
   * Read the pollable snapshot of one job.
   * @param id - job id.
   * @returns the snapshot.
   */
  snapshot(id) {
    const job = this.jobs.get(String(id || ""));
    if (!job) throw new GitError("unknown remote job", 404);
    return {
      id: job.id,
      op: job.op,
      label: job.label,
      state: job.state,
      startedAt: job.startedAt,
      endedAt: job.endedAt || null,
      percent: job.percent,
      exitCode: job.exitCode,
      error: job.error || "",
      lines: job.lines.slice(-SNAPSHOT_LINES)
    };
  }
  /**
   * Stop every child, wait briefly for it to exit, then settle whatever is
   * left. Called when the plugin is disposed so no process outlives its routes.
   * @returns resolves when the jobs are settled or the wait expired.
   */
  async dispose() {
    this.disposing = true;
    const jobs = [...this.jobs.values()].filter((job) => !job.settled);
    if (jobs.length === 0) {
      this.jobs.clear();
      return;
    }
    for (const job of jobs) this.killChild(job);
    await Promise.race([
      Promise.all(jobs.map((job) => job.done)),
      new Promise((resolve2) => setTimeout(resolve2, REMOTE_DISPOSE_WAIT_MS))
    ]);
    for (const job of jobs) {
      this.settle(job, { state: "cancelled", error: "插件已卸载，网络操作被取消" });
    }
    this.jobs.clear();
  }
  /**
   * Timeout handler: stop the child and bound how long the lock may wait for it.
   * @param job - running job.
   */
  onDeadline(job) {
    if (job.settled) return;
    if (job.cancelRequested) {
      this.killChild(job);
      this.armForceSettle(job, "cancelled", job.error || "网络操作取消超时（进程未响应）");
      return;
    }
    job.timeoutError = "网络操作超时（10 分钟）";
    job.state = "cancelling";
    this.killChild(job);
    this.armForceSettle(job, "error", job.timeoutError);
  }
  /**
   * Settle a job after the child had a grace period to exit.
   * @param job - job to settle.
   * @param fallback - terminal state used when the child never reports close.
   * @param message - error/notice attached to that state.
   */
  armForceSettle(job, fallback, message) {
    if (job.stopTimer) return;
    job.stopTimer = setTimeout(() => {
      if (job.settled) return;
      this.killChild(job, "SIGKILL");
      this.settle(job, { state: fallback, error: message });
    }, REMOTE_KILL_GRACE_MS);
  }
  /**
   * Send a termination signal without throwing when the child is already gone.
   * @param job - job whose child should stop.
   * @param signal - signal to send (default SIGTERM).
   * @returns whether the signal was delivered.
   */
  killChild(job, signal = "SIGTERM") {
    try {
      return job.child ? job.child.kill(signal) : false;
    } catch {
      return false;
    }
  }
  /**
   * The single terminal transition of a job: timers cleared, lock released,
   * done promise resolved. Later calls are ignored.
   * @param job - job to settle.
   * @param outcome - terminal state and optional error text.
   */
  settle(job, outcome) {
    if (job.settled) return;
    job.settled = true;
    if (job.watchdog) clearTimeout(job.watchdog);
    if (job.stopTimer) clearTimeout(job.stopTimer);
    job.watchdog = null;
    job.stopTimer = null;
    job.endedAt = Date.now();
    job.child = null;
    job.state = outcome.state;
    if (outcome.error !== void 0) job.error = outcome.error;
    job.resolveDone();
    job.release();
  }
  /**
   * Drop finished jobs that nobody will poll anymore.
   * @returns nothing.
   */
  prune() {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.settled && job.endedAt && now - job.endedAt > REMOTE_KEEP_MS) this.jobs.delete(id);
    }
  }
};

// src/host/repo.ts
var REPO_CACHE_TTL = 15e3;
var RepoResolver = class {
  constructor(workspaceRegistry, data = new GitData(), ttl = REPO_CACHE_TTL) {
    this.workspaceRegistry = workspaceRegistry;
    this.data = data;
    this.ttl = ttl;
  }
  workspaceRegistry;
  data;
  ttl;
  cache = /* @__PURE__ */ new Map();
  /**
   * Resolve a registered workspace to the Git working-tree root that contains it.
   * @param id - workspace id sent by the browser.
   * @returns the resolved repository (also cached for {@link REPO_CACHE_TTL}).
   */
  async resolve(id) {
    const cached = this.cache.get(id);
    if (cached && cached.expires > Date.now()) return cached;
    const workspace = this.workspaceRegistry.list().find((entry) => entry.id === id);
    if (!workspace) throw new GitError("workspace not found", 404);
    const root = await this.data.toplevel(workspace.path);
    const value = {
      id: workspace.id,
      title: workspace.title,
      path: workspace.path,
      root,
      expires: Date.now() + this.ttl
    };
    this.cache.set(id, value);
    return value;
  }
  /**
   * Every registered workspace that is inside a Git repository.
   * @returns the repos payload, one entry per repository root.
   */
  async list() {
    const workspaces = this.workspaceRegistry.list();
    const resolved = await Promise.all(
      workspaces.map(async (workspace) => {
        try {
          const repo = await this.resolve(workspace.id);
          return { id: repo.id, title: repo.title, path: repo.path, root: repo.root };
        } catch {
          return null;
        }
      })
    );
    const unique = /* @__PURE__ */ new Map();
    for (const repo of resolved) {
      if (repo && !unique.has(repo.root)) unique.set(repo.root, repo);
    }
    return [...unique.values()].sort((a, b) => a.title.localeCompare(b.title));
  }
};

// src/host/routes.ts
var MAX_BODY_BYTES = 1e6;
var MAX_PATHS = 200;
var PROMPT_ENTRIES = 80;
var PROMPT_HISTORY = 8;
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function boundedInt(raw, fallback, max) {
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, max);
}
function cleanScope(raw) {
  return repoPath(raw ?? "", { allowEmpty: true, label: "path" });
}
function toRecord(value) {
  return value !== null && typeof value === "object" ? value : {};
}
function asLlmService(value) {
  const record = toRecord(value);
  return typeof record.stream === "function" ? value : void 0;
}
function asDefaultModelService(value) {
  const record = toRecord(value);
  return typeof record.currentSelection === "function" ? value : void 0;
}
function readSelection(value) {
  const record = toRecord(value);
  const provider = typeof record.provider === "string" ? record.provider : "";
  const model = typeof record.model === "string" ? record.model : "";
  if (!provider || !model) return null;
  const effort = typeof record.reasoningEffort === "string" ? record.reasoningEffort : void 0;
  return effort ? { provider, model, reasoningEffort: effort } : { provider, model };
}
function deriveScope(paths, all) {
  if (all || paths.length === 0) return "";
  const dirs = paths.map((path) => {
    const segments = String(path).split("/").filter(Boolean);
    return segments.slice(0, -1);
  });
  if (dirs.some((segments) => segments.length === 0)) return "";
  let common = dirs[0].slice();
  for (const segments of dirs.slice(1)) {
    let index = 0;
    while (index < common.length && index < segments.length && common[index] === segments[index]) index += 1;
    common = common.slice(0, index);
  }
  if (common.length === 0) return "";
  return common[common.length - 1].replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32);
}
function normalizeCommitSubject(raw, scope) {
  const cleaned = String(raw || "").replace(/```[a-zA-Z]*/g, " ").split(/\r?\n/).map((line2) => line2.trim()).filter(Boolean).find((line2) => line2.length > 0) || "";
  const line = cleaned.replace(/[\u0000-\u001f]/g, " ").replace(/^\s*(?:[-*]|\d+\.)\s*/, "").replace(/^[`"'\s]+|[`"'\s]+$/g, "").replace(/：/, ":").replace(/\s+/g, " ").trim();
  if (!line) throw new GitError("模型没有返回提交信息", 502);
  const types = "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert";
  const pattern = new RegExp(`^(${types})(\\(([^)]{1,40})\\))?!?:\\s*(.+)$`, "i");
  const match = line.match(pattern);
  if (!match) {
    const subject2 = line.replace(/^(提交信息|commit message)\s*[:：]\s*/i, "").slice(0, 60);
    return `chore${scope ? `(${scope})` : ""}: ${subject2}`;
  }
  const type = match[1].toLowerCase();
  const foundScope = (match[3] || "").trim();
  const subject = match[4].trim().replace(/[。.]$/, "").slice(0, 60);
  const finalScope = foundScope || scope;
  return `${type}${finalScope ? `(${finalScope})` : ""}: ${subject}`;
}
var GitViewRoutes = class {
  data;
  ops;
  resolver;
  remote;
  services;
  logger;
  constructor(options) {
    const runner = options.runner ?? new GitRunner();
    this.services = options.services;
    this.logger = options.logger;
    this.data = options.data ?? new GitData(runner);
    this.ops = options.ops ?? new GitOps(this.data);
    this.resolver = options.resolver ?? new RepoResolver(options.workspaceRegistry, this.data);
    this.remote = options.remote ?? new RemoteService({
      data: this.data,
      ops: this.ops,
      lock: this.ops.lock,
      runner
    });
  }
  /**
   * Answer one Git data request.
   * @param request - authenticated browser request.
   * @returns JSON response.
   */
  async read(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";
    try {
      if (action === "repos") return jsonResponse({ repos: await this.resolver.list() });
      const repo = await this.resolver.resolve(url.searchParams.get("repo") || "");
      if (action === "status") {
        const [entries, state] = await Promise.all([this.data.status(repo.root), this.ops.state(repo.root)]);
        const head = {
          branch: state.branch,
          hash: state.hash,
          detached: state.detached
        };
        return jsonResponse({ repo, entries, head, state });
      }
      if (action === "tree") {
        const ref = (url.searchParams.get("ref") || "").slice(0, 500);
        const scope = cleanScope(url.searchParams.get("path"));
        const requested = url.searchParams.get("mode");
        const mode = requested === "ref" || !requested && ref ? "ref" : "worktree";
        const entries = mode === "ref" ? await this.data.tree(repo.root, ref, scope) : await this.data.worktreeTree(repo.root, scope);
        return jsonResponse({ repo, ref, path: scope, mode, entries });
      }
      if (action === "remoteJob") {
        const id = (url.searchParams.get("id") || "").slice(0, 80);
        return jsonResponse(this.remote.snapshot(id));
      }
      if (action === "log") {
        const ref = (url.searchParams.get("ref") || "").slice(0, 500);
        const limit = boundedInt(url.searchParams.get("limit"), LIMITS.commits, LIMITS.commits);
        const scope = cleanScope(url.searchParams.get("path"));
        const [payload, state] = await Promise.all([
          this.data.log(repo.root, ref, limit, scope),
          this.ops.state(repo.root)
        ]);
        return jsonResponse({ repo, scope, ...payload, state });
      }
      if (action === "commit") {
        const hash = (url.searchParams.get("hash") || "").trim();
        if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError("invalid commit hash", 400);
        const scope = cleanScope(url.searchParams.get("path"));
        const payload = await this.data.commit(repo.root, hash, scope);
        return jsonResponse({ repo, ...payload });
      }
      if (action === "diff") {
        const hash = (url.searchParams.get("hash") || "").trim();
        if (!/^[0-9a-f]{4,64}$/i.test(hash)) throw new GitError("invalid commit hash", 400);
        const path = repoPath(url.searchParams.get("path"), { label: "file path" });
        const payload = await this.data.diff(repo.root, hash, path);
        return jsonResponse({ repo, hash, ...payload });
      }
      throw new GitError("unknown action", 404);
    } catch (error) {
      const status = error instanceof GitError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      if (status >= 500) this.logger?.warn?.(`[git-view] ${message}`);
      return jsonResponse({ error: message }, status);
    }
  }
  /**
   * Commit working-tree changes, run a branch/history operation, or start a
   * remote job.
   * @param request - authenticated browser request.
   * @returns JSON response.
   */
  async write(request) {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: "request body is too large" }, 413);
    let body;
    try {
      body = toRecord(await request.json());
    } catch {
      return jsonResponse({ error: "invalid JSON body" }, 400);
    }
    let repo = null;
    try {
      repo = await this.resolver.resolve(String(body.repo || ""));
      const action = typeof body.action === "string" ? body.action : "commit";
      if (action === "commit") return await this.commitWrite(repo, body);
      if (action === "message") return await this.messageWrite(repo, body, request.signal);
      if (action === "branch") return await this.branchWrite(repo, body);
      if (action === "discard") return await this.discardWrite(repo, body);
      if (action === "rollback") return await this.rollbackWrite(repo, body);
      if (action === "history") return await this.historyWrite(repo, body);
      if (action === "remote") return jsonResponse(await this.remote.start(repo, body));
      if (action === "remoteCancel") return jsonResponse(this.remote.cancel(body.id));
      if (action === "resolve") return await this.resolveWrite(repo, body);
      throw new GitError("unknown action", 404);
    } catch (error) {
      const status = error instanceof GitError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      if (status >= 500) this.logger?.warn?.(`[git-view] write: ${message}`);
      let state = null;
      if (repo) {
        try {
          state = await this.ops.state(repo.root);
        } catch {
          state = null;
        }
      }
      return jsonResponse(
        {
          error: message,
          ...state ? { state } : {},
          ...error instanceof GitError && error.conflict ? { conflict: true } : {}
        },
        status
      );
    }
  }
  /**
   * Commit working-tree changes.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  async commitWrite(repo, body) {
    if (body.ai === true) {
      throw new GitError("generate the commit message first, then commit it", 400);
    }
    const release = this.ops.beginWrite(repo.root);
    try {
      const all = body.all === true;
      const paths = this.collectPaths(body);
      if (!all && paths.length === 0) throw new GitError("select at least one changed file", 400);
      if (paths.length > MAX_PATHS) throw new GitError("too many files in one commit", 400);
      const entries = await this.data.status(repo.root);
      const scoped = entries.filter(inScope(all, paths));
      if (scoped.length === 0) {
        throw new GitError(all ? "no changes to commit" : "selected files have no changes", 422);
      }
      if (scoped.some((entry) => entry.conflict)) {
        throw new GitError("resolve merge conflicts before committing", 409);
      }
      const message = typeof body.message === "string" ? body.message.trim() : "";
      const result = await this.data.commitChanges(repo.root, message, paths, all);
      const state = await this.ops.state(repo.root).catch(() => null);
      return jsonResponse({
        ok: true,
        message: result.message,
        hash: result.hash,
        shortHash: result.hash.slice(0, 7),
        ...state ? { state } : {}
      });
    } finally {
      release();
    }
  }
  /**
   * Generate one commit message draft without touching the repository. This
   * intentionally does not take the write lock: an LLM call must not block
   * commits, merges, or rollbacks.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @param signal - request cancellation.
   * @returns JSON response.
   */
  async messageWrite(repo, body, signal) {
    const all = body.all === true;
    const paths = this.collectPaths(body);
    if (!all && paths.length === 0) throw new GitError("select at least one changed file", 400);
    if (paths.length > MAX_PATHS) throw new GitError("too many files in one request", 400);
    const entries = await this.data.status(repo.root);
    if (!entries.some(inScope(all, paths))) throw new GitError("selected files have no changes", 422);
    const message = await this.suggestCommitMessage(repo, paths, all, body.locale, signal);
    return jsonResponse({ ok: true, message });
  }
  /**
   * Run one branch/merge/rebase operation for the panel.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  async branchWrite(repo, body) {
    const release = this.ops.beginWrite(repo.root);
    try {
      const result = await this.ops.runBranchOperation(repo.root, String(body.op || ""), body);
      const state = await this.ops.state(repo.root).catch(() => null);
      return jsonResponse({ ok: true, ...result, ...state ? { state } : {} });
    } finally {
      release();
    }
  }
  /**
   * Discard the working-tree changes of the confirmed files.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  async discardWrite(repo, body) {
    const paths = this.collectPaths(body);
    const release = this.ops.beginWrite(repo.root);
    try {
      const result = await this.ops.discardChanges(repo.root, paths);
      const state = await this.ops.state(repo.root).catch(() => null);
      return jsonResponse({ ok: true, ...result, ...state ? { state } : {} });
    } finally {
      release();
    }
  }
  /**
   * Roll back a multi-file selection (optionally keeping newly added files).
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  async rollbackWrite(repo, body) {
    const paths = this.collectPaths(body);
    const release = this.ops.beginWrite(repo.root);
    try {
      const result = await this.ops.rollbackChanges(repo.root, paths, { deleteAdded: body.deleteAdded !== false });
      const state = await this.ops.state(repo.root).catch(() => null);
      return jsonResponse({ ok: true, ...result, ...state ? { state } : {} });
    } finally {
      release();
    }
  }
  /**
   * Undo, reset to, revert, cherry-pick, or check out one commit.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  async historyWrite(repo, body) {
    const release = this.ops.beginWrite(repo.root);
    try {
      const result = await this.ops.commitHistoryOperation(repo.root, body);
      const state = await this.ops.state(repo.root).catch(() => null);
      return jsonResponse({ ok: true, ...result, ...state ? { state } : {} });
    } finally {
      release();
    }
  }
  /**
   * Mark conflicted files as resolved so a paused merge/rebase can continue.
   * @param repo - resolved repository.
   * @param body - parsed request body.
   * @returns JSON response.
   */
  async resolveWrite(repo, body) {
    const paths = this.collectPaths(body);
    const release = this.ops.beginWrite(repo.root);
    try {
      const result = await this.ops.stageResolvedPaths(repo.root, paths);
      const state = await this.ops.state(repo.root).catch(() => null);
      return jsonResponse({ ok: true, ...result, ...state ? { state } : {} });
    } finally {
      release();
    }
  }
  /**
   * Normalize the `paths` array of one request body.
   * @param body - parsed request body.
   * @returns unique, validated repository-relative paths.
   */
  collectPaths(body) {
    return repoPaths(body.paths, MAX_PATHS);
  }
  /**
   * Ask the composed default model for one `type(scope): subject` line the user
   * can edit before committing. The model never commits anything.
   * @param repo - resolved repository.
   * @param paths - selected paths, or [] for every change.
   * @param all - whether every change is included.
   * @param locale - UI locale hint.
   * @param signal - request cancellation.
   * @returns the generated subject line.
   */
  async suggestCommitMessage(repo, paths, all, locale, signal) {
    const llm = asLlmService(this.services.get("llm"));
    const defaultModel = asDefaultModelService(this.services.get("agentDefaultModel"));
    if (!llm || !defaultModel) {
      throw new GitError("the LLM service is not mounted", 503);
    }
    let selection;
    try {
      selection = readSelection(defaultModel.currentSelection());
    } catch (error) {
      throw new GitError(error instanceof Error ? error.message : String(error), 503);
    }
    if (!selection) {
      throw new GitError("no default model is configured", 503);
    }
    const entries = await this.data.status(repo.root);
    const visible = entries.filter(inScope(all, paths));
    const names = visible.slice(0, PROMPT_ENTRIES).map((entry) => `${entry.status} ${entry.path}`).join("\n");
    const diff = await this.data.workingSummary(repo.root, paths, all);
    const scope = deriveScope(paths, all);
    const language = String(locale || "").toLowerCase().startsWith("zh") ? "简体中文" : "English";
    let recent = [];
    try {
      const history = await this.data.log(repo.root, "", PROMPT_HISTORY, "");
      recent = history.commits.map((commit) => commit.subject).filter(Boolean);
    } catch {
      recent = [];
    }
    const prompt = [
      `分支：${repo.title}`,
      `scope 建议：${scope || "（省略）"}`,
      "",
      "本次改动的文件：",
      names || "(none)",
      "",
      "Diff：",
      diff || "(no textual diff; only untracked or binary files)",
      "",
      "最近的提交标题（仅用于参考语气与用词，不要照抄）：",
      recent.length ? recent.map((subject) => `- ${subject}`).join("\n") : "(none)"
    ].join("\n");
    const system = [
      "你是一名资深工程师，负责为一次改动写提交信息首行，遵循 Conventional Commits 规范。",
      `只输出一行，格式严格为：type(scope): 主题（使用中文时冒号后用中文，主题用${language}书写）。`,
      "type 必须是以下之一：feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert。",
      `scope 规则：${scope ? `优先使用「${scope}」。` : "若改动集中在某个目录/模块，可用其最后一段作为 scope；否则省略 scope，写成 type: 主题。"}`,
      "主题要求：祈使句、说明做了什么而不是怎么做、不超过 60 个字符、结尾不加句号、不使用引号或反引号。",
      "不要输出解释、不要输出代码块、不要输出多行。"
    ].join("\n");
    let collected;
    try {
      collected = await this.streamOnce(llm, selection, system, prompt, selection.reasoningEffort, 600, signal);
      if (!collected.text.trim()) {
        collected = await this.streamOnce(llm, selection, system, prompt, void 0, 900, signal);
      }
    } catch (error) {
      if (error instanceof GitError) throw error;
      if (error && error.name === "AbortError") throw error;
      throw new GitError(`提交信息生成失败：${error instanceof Error ? error.message : String(error)}`, 502);
    }
    if (!collected.text.trim()) {
      throw new GitError(`模型没有返回内容（finish: ${collected.finish || "unknown"}）`, 502);
    }
    return normalizeCommitSubject(collected.text, scope);
  }
  /**
   * One streaming attempt. A reasoning model can spend the whole token budget on
   * reasoning and return no text, so the caller retries with a larger budget and
   * no reasoning effort.
   * @param llm - mounted LLM service.
   * @param selection - provider/model to use.
   * @param system - system prompt.
   * @param prompt - user prompt.
   * @param effort - reasoning effort to request.
   * @param budget - max tokens for the attempt.
   * @param signal - request cancellation.
   * @returns collected text and finish reason.
   */
  async streamOnce(llm, selection, system, prompt, effort, budget, signal) {
    let text = "";
    let finish = "";
    for await (const chunk of llm.stream({
      provider: selection.provider,
      model: selection.model,
      ...effort ? { reasoningEffort: effort } : {},
      system,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      maxTokens: budget,
      temperature: 0.2,
      signal
    })) {
      const record = toRecord(chunk);
      if (record.type === "text-delta") {
        text += typeof record.text === "string" ? record.text : "";
      } else if (record.type === "finish") {
        const reason = toRecord(record.reason);
        finish = typeof reason.kind === "string" && reason.kind ? reason.kind : "unknown";
        if (finish === "error" || finish === "aborted") {
          const failureRecord = toRecord(reason.failure);
          const detail = typeof failureRecord.message === "string" ? failureRecord.message : "";
          throw new GitError(`提交信息生成失败：${detail || finish}`, 502);
        }
      }
    }
    return { text, finish };
  }
};
function inScope(all, paths) {
  return (entry) => all || paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`));
}

// src/host/index.ts
var ROUTE_PATH = "/api/git-view";
var WRITE_ROUTE_PATH = "/api/git-view/write";
var inject = ["connection", "workspaceRegistry"];
function apply(ctx) {
  const runner = new GitRunner();
  const data = new GitData(runner);
  const ops = new GitOps(data);
  const resolver = new RepoResolver(ctx.workspaceRegistry, data);
  const remote = new RemoteService({ data, ops, lock: ops.lock, runner });
  const services = { get: (name) => ctx.get(name) };
  const routes = new GitViewRoutes({
    data,
    ops,
    resolver,
    remote,
    workspaceRegistry: ctx.workspaceRegistry,
    services,
    logger: ctx.logger
  });
  ctx.effect(
    () => ctx.connection.fetch.register({
      path: ROUTE_PATH,
      methods: ["GET"],
      requestBody: "buffered",
      fetch: (request) => routes.read(request)
    }),
    "git-view: data route"
  );
  ctx.effect(
    () => ctx.connection.fetch.register({
      path: WRITE_ROUTE_PATH,
      methods: ["POST"],
      requestBody: "buffered",
      fetch: (request) => routes.write(request)
    }),
    "git-view: write route"
  );
  ctx.effect(
    () => () => {
      void remote.dispose();
    },
    "git-view: remote jobs"
  );
}
export {
  ROUTE_PATH,
  WRITE_ROUTE_PATH,
  apply,
  inject
};
