# openidea 借鉴分析与 dsh-git-view 优化方案

> 调研对象：<https://github.com/l0ng-ai/openidea>（Apache-2.0，IntelliJ IDEA 风格、Rust + Tauri 的 IDE）
> 对标对象：本仓库 `dsh-git-view-plugin` v0.2.0（DSH Web 的 IntelliJ 风格 Git 面板）
> 调研方式：本地 sparse clone（`D:\data\temp\openidea-src`，3862 个文件），只读 `src/features/vcs`（前端 106 个文件）、`crates/ide-vcs/src`（Rust VCS 引擎）、`crates/ide-host/src/ops/vcs*`（IPC 层）。本文引用的路径均可在该 clone 中核对。

---

## 0. 本次实际做了什么

### 0.1 插件安装（已完成）

| 步骤 | 结果 |
| --- | --- |
| 首次 `install_bundle` | 失败：`ERR_PNPM_UNEXPECTED_STORE` —— profile 的 `node_modules` 由 pnpm 10 的 store（`store\v10`）链接，而 DSH 运行时自带 pnpm 11.28.5 要用 `store\v11` |
| 修复 | 备份 `package.json` / `pnpm-lock.yaml` 后，用运行时 pnpm 11 在 `~\.dsh\profiles\desktop` 执行一次 `pnpm install`，重新链接到 v11 store（仅 1 个依赖 `dsh-find-plugin`，约 1 秒） |
| 再次 `install_bundle` | `application: applied`，bundle `@local/dsh-git-view@0.2.0`，entryId `include:git-view` |
| 安装形态 | `node_modules\@local\dsh-git-view` 是 **Junction → `D:\work\code\dsh-git-view-plugin`**，即源码目录被「链接」而非复制：改代码后只需刷新页面，不必重复安装 |
| 验证 | `plugin_manager list_bundles` 里可见该 bundle 与 `git-view` 行；`Config.listConfigs` 显示 `include:git-view`（`status: absent` = 插件没有声明 Config schema，属正常）；未带凭据请求 `GET /api/git-view?action=repos` 返回 **401 unauthorized**（而不是 404），说明 Host 路由已挂载且受会话鉴权保护 |
| 待用户操作 | **客户端半边需要刷新一次页面** 才会注册 `sidebar.panellist` 与 `main` 槽位（安装前已打开的页面不会自动出现 Git 图标） |

> 若之后 `pnpm` 再次报 store 不一致，原因同上（PATH 里的 pnpm 10 与运行时 pnpm 11 混用），修复命令固定为：用 `C:\Users\<user>\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe` 执行 `...\dependencies\pnpm\bin\pnpm.mjs install`。

### 0.2 openidea 的能力密度

openidea 的 Git 功能**不是**「一个提交框 + 一个 log」，而是一整套 IDEA 语义的实现，仅 `src/features/vcs` 就有 106 个源文件 + 90 余个测试文件，Rust 侧 `crates/ide-vcs` 20 个模块。它的分层很清楚：

- **读**（status / log / blame / diff 计算）走 gitoxide 进程内；
- **写**（commit / checkout / push / merge / stash）走 `git` CLI，保证 hooks、凭据、签名与命令行一致（`crates/ide-vcs/src/lib.rs` 头注释）；
- **UI 全在前端**：`src/features/vcs/*.ts(x)`，状态用 zustand，纯逻辑（分组、包含关系、图布局、对比算法）全部抽成可测的独立模块。

最后一点对我们最有参考价值：**它把「哪些文件/哪些块进入下一次提交」建模成一个纯函数问题**，UI 只是渲染这个模型。

---

### 0.3 本轮需求（rev2）：5 条反馈 → 诊断与设计

| # | 你的要求 | 现状（代码事实） | 根因 | 目标行为 | openidea 参照 |
| --- | --- | --- | --- | --- | --- |
| R1 | 去掉「AI 提交」，改成 AI 只**填充**提交信息，内置 `type(scope): 说明` 提示词 | `index.js:340-344` 在一次 POST 里「先让模型写、再直接提交」，`ai:true` 立刻落盘；UI 只有「AI 提交」按钮（`client.js:2755-2774`），生成结果既不回填也不可改 | 生成与提交耦合在同一个写操作里；提示词只要求「一行 Conventional Commit subject」（`index.js:164`），没有 type 枚举、没有 scope 规则、也没有参考本仓库最近的提交风格 | 按钮改成「生成信息 / 重新生成」：只调用模型，把结果写进输入框并聚焦，用户可改、可重生成，提交仍由「提交」按钮执行；草稿不会被 AI 覆盖；失败时手填不受影响 | openidea 没有 AI，但它的消息编辑器交互值得抄：空信息时按钮不置灰而是在框内报错、`⌃M` 打开历史、生成类操作要有「生成中 / 重试」状态（`CommitView.tsx`、`commitStore.ts`） |
| R2 | 分支下拉右侧的「⋯」菜单，能否直接并入下拉里的每个分支行 | 工具栏有一个独立 `ActionMenu`（`client.js:1989`），菜单项由 `branchMenuItems` 基于**当前下拉选中的 ref**（`refEntry`）生成；默认值是「所有引用」（`refValue=''`），此时 `entry=null`，菜单里只剩「新建分支」，检出/重命名/删除/合并/变基**全部不渲染**（`client.js:3687-3848`） | 把「筛选历史的分支」和「要对某个分支执行的操作」混成了同一个值；操作入口又是全局按钮，于是默认状态下什么都做不了 | 下拉每行尾部直接带一个「⋯」（悬停/键盘可见），点它就在该行弹出该分支的操作菜单；单击行 = 筛选历史（保持现状）；右键行 = 同一菜单；下拉底部固定「新建分支…」「刷新引用」；删除独立 ActionMenu | openidea 的 BranchWidget / Branches 面板：**单击只选中、双击才切换日志、右键出菜单**（`BranchWidget.tsx:80-136`、`GitLog.tsx` BranchesPanel）——把「浏览」和「操作」拆成两个手势，正是你要的效果 |
| R3 | 左树不要显示「项目根目录」，显示项目名称 | 根行固定文案 `t('rootLabel')`（`client.js:2074`）；只有右上标题条显示 `repo.title`（`client.js:2057`） | 单纯文案写死，没有用仓库/工作区标题 | 根行显示 `repo.title`（即工作区/项目名），空则取根目录 basename；`title` 属性仍保留完整路径 | — |
| R4 | BUG：刚建的 `docs/` 和其中的文件没出现在左树里 | 左树读的是 **HEAD 的 git tree**：`readTree` → `git ls-tree`（`git-data.js:187`），并且只在 `repoId/refValue/reloadTick` 变化时重建（`client.js:3129-3133`），20s 的状态轮询不会刷新它 | 两条独立原因叠加：① 树是「某个提交的文件清单」，不是工作区，**未跟踪文件永远不可能出现**（`docs/` 还没 commit）；② 树只在手动刷新时才重建，甚至已提交的新目录也可能要等一次刷新 | 左树 = 工作区视图：已跟踪 + 未跟踪（遵守 `.gitignore`）都显示，并带状态标记（未跟踪/修改/新增/删除/冲突）；提交、回滚、外部改动后自动刷新；只有切到非 HEAD 的 ref 时才显示该 ref 的树，并给出提示 | openidea 的改动/项目视图用 `statusDecorations()`（`model.ts:59`）给文件上色，目录树由 trie + 单链压缩构建（`changes.ts` `dirNodes`），空目录不渲染 |
| R5 | 回滚、merge、rebase 都没有 | merge/rebase 的后端**其实已存在**（`git-ops.js:318 mergeRef`、`:343 rebaseRef`），但入口只在 ⋯ 菜单里，且默认「所有引用」下不显示（同 R2）。回滚只有每行一个撤回按钮，一次一个文件（`client.js:3573`），没有多选/计划对话框；也没有提交级回滚（undo/reset/revert/cherry-pick） | 后端能力被 UI 入口挡住了；回滚只做了「单文件撤回」这一种形态 | ① 分支级：R2 的行内菜单直接给「检出 / 合并到此分支 / 变基当前到此分支」；状态栏显示进行中的操作并直接给「继续 / 中止」。② 更改级：工具栏/右键「回滚…」→ 多选文件 + 「删除新增文件的本地副本」的计划对话框，Host 复用现有的状态判断（未跟踪→`clean`、暂存新增→`rm`、其余→`restore HEAD`）批量执行。③ 提交级：详情/图上右键「撤销提交（soft reset）/ 还原提交（revert）/ 拣选（cherry-pick）/ 检出此提交」，merge commit 拒绝 revert/undo | openidea 的 Rollback 计划（`changeOps.tsx` `rollbackPlan`：staged 重命名两侧一起回、staged 新增变未跟踪、子模块指针不负责回滚）、`historyActions` 的 reset/revert/cherry-pick/undo，以及「删除可恢复、不可逆才确认」的确认策略（`branchOps.ts:253-298`） |

> 一句话总结这 5 条：**把「AI 代你决定」改成「AI 给你打草稿」，把「先选再操作」改成「在哪操作就在哪操作」，把「提交树」改成「工作区」**。

---

## 1. 能力对照：我们 vs openidea

| 领域 | dsh-git-view 现状 | openidea | 差距性质 |
| --- | --- | --- | --- |
| 部分提交 | 文件级：`deselectedChanges` 集合 + `git commit -- <paths>` | 文件级 + **块级**（hunk）+ 已暂存态（`staged`）+ 三态父节点 | 能力缺口，价值最高 |
| 更改分组 | 平铺列表 + 状态分类计数 | `Merge Conflicts` / `Changes` / `Unversioned Files` 分组 + 目录树（trie）+ 扁平/树切换 + 更改列表（changelists） | 结构缺口 |
| 提交信息 | 手填 / AI 生成 | 历史（`messageHistory`）、amend 草稿、`MERGE_MSG` 预填、提交后保留策略 | 便利性缺口 |
| 提交前检查 | 无 | Windows 非法文件名、大文件、新增行里的 TODO、空白/分析器问题（`commitChecks.tsx`） | 质量缺口 |
| 提交图 | 自绘泳道、refs、搜索 | 同 + 折叠线性历史、长边省略、分支侧栏、高亮「我的提交/当前分支」、分页续接布局 | 体验缺口 |
| Diff | 双栏、hunk 着色、同步滚动 | 行/词/字符三级对比、移动代码检测、忽略空白/大小写、hunk 跳转、折叠未变更 | 引擎缺口 |
| 冲突 | 「标记为已解决」 | 冲突横幅 + Resolve Conflicts 对话框 + Yours/Result/Theirs 三方合并编辑器 + diff3 | 能力缺口 |
| 暂存/搁架 | 无 | Stash（含 untracked、--keep-index、stash→branch）+ IDEA Shelf（`.openidea/shelf/<id>/shelved.patch`）+ Patch | 能力缺口 |
| Blame | 无 | 行内 Annotate（含未提交行合成） | 能力缺口 |
| 忽略 | 无 | 一键 `.gitignore`（目录折叠成一条、原子写、`check-ignore` 复验） | 小功能，高性价比 |
| 远端 | 只读（无 fetch/push） | fetch/pull/push + 进度流 + Smart Checkout + force-with-lease | 能力缺口 |
| 可恢复性 | 删除分支/撤回有二次确认 | 结果枚举（`CheckoutOutcome`/`DeletedBranch`/`ApplyOutcome`）+ 删除后可 Restore + undo commit + Local History 记录点 | 设计思想缺口 |
| 健壮性 | 已有 env 硬化、`execFile`、ref 白名单 | 再加 `--end-of-options`、`--literal-pathspecs`、index.lock 重试、argv 分批、取消/进度、一次 status | 工程缺口 |
| 测试 | 0 | 90+ 前端测试 + Rust 集成测试 | 工程缺口 |

---

## 2. 值得借鉴的做法（按性价比排序）

### 2.1 块级部分提交（最强借鉴）

**它怎么做**

- 包含关系是一个四值枚举（`src/features/vcs/changes.ts:28`）：
  `all`（全部暂存后提交）/ `none`（不提交，且要撤销已暂存）/ `staged`（只提交已暂存部分）/ `hunks`（只提交未被排除的块）。
- 每个文件有 `excludedHunks` 集合；`toggledHunk()`（`changes.ts:388`）把块级勾选归约回四种状态，`hunkIncluded()`（`:405`）判断某块是否入选。
- `planCommit()`（`changes.ts:361`）输出 `{ stage, unstage, included, partial }` —— UI 只负责改模型，提交动作只读这个计划。
- 渲染层在 diff 的 gutter 上放复选框（`hunkInclusion.ts:44` `toggleBlock`，`:91` `inclusionGutter`），文件行复选框由 `aggregateCheck()`（`changes.ts:79`）算三态。
- 真正提交时用**临时索引**：把 `.git/index` 复制/`read-tree HEAD` 到临时文件，`GIT_INDEX_FILE` 指向它，只写入入选块，`commit` 完成后 `reset -q HEAD -- <paths>` 复原（`crates/ide-vcs/src/write.rs:384-410`，`lib.rs:181`，`patch.rs:25`）。工作区和真实索引都不会被污染。
- 块身份在 UI 层是**内容哈希**：`hunkKeys()` 对「旧文本 + 新文本」做 FNV-1a 并追加出现序号（`hunks.ts:109-124`，测试名就叫 "identifies blocks by content, not position"），所以改了文件别处，勾选也不会错位；真正提交前按 `(start, lines, old_start, old_lines)` 重新定位，对不上就报「文件已变更，请重新查看」，而不是错贴补丁（`write.rs:398` 附近）。
- 补丁用零上下文（`--unidiff-zero --recount`）+ Histogram diff 生成，避免上下文行被误解。

**我们怎么做（改造点）**

1. `git-data.js::readDiff` 增加结构化输出：解析 hunk 头 `@@ -a,b +c,d @@`，按 openidea 的做法给每块生成**内容哈希 key**（旧行文本 + 新行文本的 FNV-1a，再追加出现序号），返回 `hunks: [{ key, header, lines }]`；`client.js::parseDiffRows`（`client.js:970`）复用同一套行模型，块头行天然是挂载点。
2. `client.js` 的提交选择从 `Set<path>` 升级为 `Map<path, {mode:'all'|'none'|'staged'|'hunks', excluded:Set<key>}>`；`CommitPane` 复选框三态；`CompareDialog`（`client.js:2821`）在 HEAD↔工作区 diff 上渲染块复选框。
3. `git-data.js::commitChanges`（`git-data.js:448`）换成 `commitPlan(root, {paths, hunkExclusions, mode})`：
   - 复制 `.git/index` → `.git/dsh-git-view-partial-index`（用 `git rev-parse --git-path index` 定位，不硬编码）；
   - `env.GIT_INDEX_FILE=…` 下 `git read-tree HEAD` → `git apply --cached --unidiff-zero --recount --whitespace=nowarn <patch>` → `git commit -F -`（消息走 stdin，避免命令行转义问题）；
   - 成功后 `git reset -q HEAD -- <paths>`（真实索引里这些文件的暂存一并清掉，与 IDEA 一致）；失败/异常 `finally` 删除临时索引。
4. 非文本/二进制文件禁用块勾选；CRLF 文件用 `--ignore-whitespace` 关闭，保持原样字节。

**验收**：勾选 3 个块中的 1 个提交后，`git status` 显示其余块仍在工作区、且**没有任何残留暂存**；连续两次部分提交互不影响。

### 2.2 更改分组 + 目录树三态 + 更改列表

- 分组与默认选中遵循 IDEA（`changes.ts:49` `groupOf`、`:67` `initialCheck`）：**冲突和未跟踪默认不选中**，只有「Changes」默认全选 —— 我们目前是全部默认选中，容易误提交未跟踪文件（尤其是构建产物）。
- 目录树用 trie 构建（`changes.ts:229` `buildChangeTree`），目录节点聚合子文件的三态（`:79` `aggregateCheck`）；重命名文件显示 `from oldName`（`:96` `fileNode`）。
- 更改列表（changelists）：默认 `Changes` + 用户列表，文件按列表归属，活动列表接收新改动，持久化在 `.openidea/changelists.json`（`changelists.ts:1-80`）。多主题/多任务并行时非常实用。

**我们怎么做**：`ChangesPane`（`client.js:2474`）改为「分组标题 + 目录树 + 扁平模式开关」；三态集合逻辑抽成纯函数（可直接照 `aggregateCheck` 的 12 行实现改写）；列表状态先落 `localStorage`（键：仓库根 + 列表），后续再考虑存 Host 侧。

### 2.3 提交面板：amend / 信息历史 / MERGE_MSG / 提交后策略

`commitStore.ts` 里几个小设计，成本极低但体验差别很大：

- `messageHistory()` / `rememberMessage()`（`:101`、`:111`）：最近提交信息可下拉复用；
- amend 草稿（`:122-175`）：记下「amend 前的草稿」和「被 amend 的提交信息」，取消 amend 能还原；
- `messageAfterCommit(committed, clear)`（`:175`）：提交后是否清空输入框的策略（用户没改过才清空）；
- **合并/变基/拣选时预填 git 准备好的消息**：`preparedMessageText()`（`:195`）读 `.git/MERGE_MSG` 并剥掉 `#` 注释行，`installPreparedMessage()`（`:207`）在操作开始/中止时安装/移除。

**我们怎么做**：`index.js` 的 commit 动作加 `amend`/`signoff`/`noVerify` 参数；新增只读接口 `messageDraft`（返回 `.git/MERGE_MSG` 清洗后的文本，操作进行中时自动预填）；`CommitPane` 的信息框加历史下拉（localStorage 存最近 20 条）。

### 2.4 Diff 比较引擎：行/词/字符 + 移动代码

`src/features/vcs/comparison/` 是一个完整的 IntelliJ 对比实现：`byLine.ts`、`byWord.ts`、`byChar.ts`、`lcs.ts`、`moves.ts`（移动代码识别）、`chunkOptimizer.ts`（合并/拆分块让结果更符合直觉）、`text.ts`（空白/大小写归一）。`diffOptions.ts` 提供忽略空白、忽略大小写、忽略 import 等开关（IDEA 的「Do not ignore / Ignore whitespace / Trim whitespace」）。

**我们怎么做**（分两步，先小后大）：
1. 便宜的一半：`--ignore-all-space` / `-w` 开关 + 行内词级高亮（对相邻的 `-`/`+` 行做词级 LCS，高亮变化片段）+ `n/N` 在 hunk 间跳转。词级比较可以直接把 `comparison/byWord.ts` 的算法改写成 JS（约 100 行）。
2. 贵的一半：移动代码检测（`moves.ts`）与块优化，等 1 稳定后再做。

### 2.5 提交图：折叠线性历史、长边省略、分页续接

- 布局是纯函数 `computeGraph(commits, state)`（`graph.ts:66`），**接受上一次的 state**，因此可以「加载更多」后继续画而不会跳色/错位 —— 我们现在固定 400 条一次性读，加「加载更多」时正需要这个能力。
- `collapseLinear()`（`:136`）把只有一个父、且没有 ref 的链折叠成一个节点（IDEA 的 Collapse Linear Branches），大仓库可读性提升明显。
- `LONG_EDGE = 30`、`hideLongEdges()`（`:187`）：跨度超过 30 行的边只画两端加箭头，避免「一条线贯穿整个屏幕」。
- `LANE_COLORS`（`:228`）用主题 token 循环取色；`reachableFrom()`（`:174`）判断某提交是否从当前分支可达，用于「高亮当前分支/我的提交」。
- 选项模型 `LogOptions`（`logOptions.ts:9-53`）区分「要重新查询」的（`sort/firstParent/noMerges`）和「纯渲染」的，避免无谓重载。

**我们怎么做**：`GraphCell`（`client.js:1319`）的布局函数抽成纯函数并加 `state` 续接；工具栏「⋯」菜单里加折叠线性、长边、高亮我的/当前分支；`client.js::readLog` 的 `--max-count=400` 改成 `skip/limit` 分页（`git log --skip=N`）；`--no-merges`/`--first-parent`/`--topo-order|--date-order` 透传。

### 2.6 冲突处理：横幅 + 三方合并编辑器

`MergeEditor.tsx` 是 Yours | Result | Theirs 三栏（IDEA merge tool 的克隆），配合 `mergeModel.ts`（每个冲突块的选择状态）、`mergeDiff3.ts`（diff3 风格展示）、`conflictMarkers.ts`（解析 `<<<<<<<` 标记）、`conflictsUi.tsx`（Resolve Conflicts 对话框 + 逐冲突「接受我方/对方/双方」）。

**我们怎么做**：先做「低成本 80% 价值」版本 ——
1. 冲突文件行内解析标记，给每个冲突块三个按钮（我方/对方/双方/手改）；
2. 顶部冲突横幅（`operation` 已有，补一个「N 个文件冲突」计数与「全部接受我方」批量操作）；
3. 完整三栏编辑器放 P2（需要三份文本 `:1/:2/:3`，Host 侧 `git show :1:path` 可取）。

### 2.7 Stash / Shelf / Patch

- IDEA 的 Shelf 是「不污染 git 的本地暂存」：`.openidea/shelf/<id>/shelved.patch` + `shelf.json`（`crates/ide-vcs/src/shelf.rs` 头注释），支持改名/删除/导入/差异预览，应用时产生冲突会打开合并 UI 且**保留**条目。
- Stash 走标准 CLI：`stash push [-u] [-m]`、`stash apply|pop [--index]`、`stash branch`、`stash drop`。
- Patch：创建用临时索引 + `diff --cached --binary`，应用时先 `apply --check`，失败再 `apply --3way`，留下的冲突交给合并 UI（`patch.rs`）。

**我们怎么做**：提交面板加「Changes / Stash」两个标签页；先做 stash（几乎零设计成本），Shelf 与 Patch 合并成一个「应用/导出补丁」功能（P2）。

### 2.8 Blame / Annotate

`crates/ide-vcs/src/blame.rs` + `src/features/vcs/blame.ts`：`git blame --porcelain --contents - <rev> -- <path>` **把未保存/未提交的文本喂给 git**，所以编辑中也能正确标注；未提交行用全零 SHA 表示并单独样式。

**我们怎么做**：详情面板加「Blame」按钮，打开一个按行分组的视图（作者 + 提交 + 时间），点击行跳到对应提交；后续再把 gutter 版做进 diff 视图。

### 2.9 远端操作与进度

`remotes.rs`/`write.rs`：`fetch --progress --all --prune`、`pull --progress --autostash [--rebase]`、`push --progress [--force-with-lease] [--set-upstream]`；输出按 `\r` 与 `\n` 双分隔切分，进度行（`remote: Counting objects…`）从错误信息里过滤，但实时转发给 UI。

**我们怎么做**：新增 `action: 'fetch' | 'pull' | 'push'`；由于现有路由是「一问一答」的 JSON fetch，进度有两种落地方式：
- 简单版：只返回最终结果 + 最后 20 行输出（足够 90% 场景）；
- 完整版：加一条 SSE 路由 `/api/git-view/progress`，或先写 `jobs` 再从 `/api/git-view` 轮询状态。
建议先做简单版，进度条放 P2。**push 必须显式 force-with-lease 而不是 force**，且默认禁止推 `main/master`（可配置）。

### 2.10 一键加入 .gitignore

`crates/ide-vcs/src/ignore.rs` 的细节值得抄：
- 目录下全是未跟踪文件时，只写一条目录规则（`changes.ts:420` `ignoreTargets`），而不是每个文件一条；
- 特殊字符转义（`#`、`!`、空格、`*?[]`、`\`），目录补尾斜杠；
- 写前 `check-ignore -q` 探测（已忽略就不写），写后复验；
- 原子写（临时文件 + rename）、保留 CRLF、检测并发修改；
- 拒绝包含已跟踪文件的目录（规则对已跟踪文件无效）。

**我们怎么做**：`ChangesPane` 未跟踪行右键/行尾按钮「加入 .gitignore」，Host 侧实现上面的探测 + 单条目录规则 + 原子写；`.git/info/exclude` 作为「仅本地」备选。

### 2.11 可恢复性契约（设计思想）

openidea 把「操作结果」建模成枚举而不是布尔值：

- `CheckoutOutcome::{Done, LocalChanges, Conflicts, LocalBranchAhead}`：只有 `Done`/`Conflicts` 真的改了东西，其余是「拒绝并解释」；
- `DeletedBranch { tip, upstream, unmerged }` + `vcs_restore_branch`：强制删掉未合并分支后，通知里能「Restore」；
- `ApplyOutcome { applied, conflicts }`；
- 每个破坏性操作都写入 Local History，作为还原点。

**我们怎么做**：`git-ops.js` 的返回值从 `{ok}` 改成 `{ outcome: 'done' | 'conflict' | 'rejected', detail… }`；删除分支返回 `tip` 并在提示条里给「恢复分支」按钮（`git branch <name> <tip>`）；新增 `undoCommit`（`reset --soft HEAD~1`，拒绝对 merge commit）。这一条几乎不增加代码，但显著降低「手滑」成本。

一个反直觉但值得抄的细节：openidea **删除分支不做二次确认**，而是删完在通知里给 Restore / View Commits（`branchOps.ts:258-298`），因为它可逆；反过来 force-push、改写历史这类**不可逆**操作才弹确认，并且只在「HEAD 已经推送过」时警告（`rebase.tsx:43-111` 会点名 upstream 与 force-push 后果）。我们现在的二次确认集中在「可逆但吓人」的操作上，方向正好相反，建议按「可逆性」重排确认策略。另外所有 git 输出进一个可滚动 Git 控制台（5000 行），错误只弹一条通知并带「查看输出」动作（`ops.ts:74-100`），比我们三个并列错误通道更干净。

### 2.12 工程健壮性（可直接抄的清单）

| 做法 | openidea 位置 | 我们的现状 / 建议 |
| --- | --- | --- |
| 每次 spawn 统一硬化 env：`GIT_TERMINAL_PROMPT=0`、`GIT_PAGER=cat`、`LC_ALL=C`、`GIT_EDITOR=true`、移除 `GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE` | `crates/ide-vcs/src/cli.rs` | 已有 `GIT_OPTIONAL_LOCKS/GIT_TERMINAL_PROMPT/GIT_LITERAL_PATHSPECS`，补 `GIT_EDITOR=true`、`GIT_SEQUENCE_EDITOR=true`、`LC_ALL=C` 与移除继承的 `GIT_DIR` |
| 所有路径参数走 `--literal-pathspecs` + `--`，rev 走 `--end-of-options` | 同上 | 已用 `GIT_LITERAL_PATHSPECS=1` 与 `--`；`rev` 位置补 `--end-of-options` |
| 用户输入的分支/标签名先 `check-ref-format --branch` 校验 | `write.rs` | 已有正则白名单，可再加 git 自身的校验做双保险 |
| `index.lock` 冲突只对 `switch/add/rm/reset` 重试（2s 内、50ms 退避），其余绝不重试 | `cli.rs::retryable_index_lock` | 缺失。多面板/多会话同时操作时会遇到 |
| argv 分批（Windows 32000 / Unix 120000 字符） | `cli.rs::batch_paths` | 缺失。一次提交几百个文件会 E2BIG |
| 取消：SIGTERM → 20ms → SIGKILL 整个进程组；`RequestId` 由 UI 分配 | `cli.rs` | 缺失。`execFile` 的 `timeout` 只能杀子进程，长 `fetch`/`push` 会卡 20s 后失败 |
| 一次 status、staged/unstaged 合并进一条记录、冲突态强制标记 | `status.rs` | 我们 `readStatus` 就是单次 `porcelain=v1 -z`，但用了 `--no-renames`；建议升级 `--porcelain=v2 -z --untracked-files=all` 并保留重命名信息 |
| 读用 porcelain/结构化，写用 CLI 且保留原始字节（编码/BOM/CRLF） | `diff.rs`/`patch.rs` | 我们全程 utf8 字符串，非 UTF-8 仓库会乱码；P2 处理 |
| **不可信仓库的「受限模式」**：额外加 `-c core.hooksPath= -c core.fsmonitor=false -c diff.external= -c core.attributesFile=`，移除 `GIT_EXTERNAL_DIFF`，并把 `git config --null --list` 里所有 `filter.*.clean/process` 改写成空，防止仓库配置在打开时执行任意命令 | `cli.rs:209-237`、`compare.rs:111` | 我们一个都没做。工作区仓库可能是别人给的，`core.fsmonitor`/`filter.*` 都能在 `status`/`diff` 时执行命令 —— 建议 P1 补上（见 §3 P1-7） |

### 2.13 顺路修掉的自身问题（本次代码审计，均有文件行号）

这些不是 openidea 的「功能」，但都落在同一批文件里，改功能时一起修最省事：

| 问题 | 位置 | 影响 |
| --- | --- | --- |
| `readCommit` 先截 400 文件再按 `path` 过滤 | `git-data.js:343-357` | 目录范围视图里会误报「该提交没有改动」 |
| 全链路 `--no-renames` | `git-data.js:325-326、401-408` | 重命名显示成 A+D，`statusRenamed`/`renamedHint` 文案永远不可达 |
| 切换提交不清空旧详情 | `client.js:3381` + `client.js:2322` | 新提交数据到达前，右侧仍显示上一个提交的文件列表 |
| `repoCache` 15s TTL，从不主动失效、从不清理 | `index.js:202-217` | 工作区移动后最多 15s 读到旧根；长时间使用后 Map 只增不减 |
| 读操作不与写操作互斥 | `index.js:95-109` | 提交/撤回进行中的 status 可能读到中间态 |
| 写错误分成三个通道（行内 / 6s 横幅 / 对话框） | `client.js` 中 `commitError`、`repoNotice`、`actionError` | 用户容易看不到失败原因；且全文件 0 处 `aria-live` |
| AI 提交「生成即提交」，写锁覆盖整个 LLM 调用 | `index.js:338-344` | 信息不可预览/编辑/重试，期间其他写操作被 409 |
| 400 上限、分支名校验、路径匹配各写了两份 | `client.js:3145`、`client.js:605` vs `git-ops.js:61`、`client.js:460` vs `index.js:328` | 改一处漏一处 |
| 单次 git 超时固定 20s，无取消 | `git-data.js:15` | 大仓库首次 `status` 直接 422；将来 fetch/push 必然超时 |

建议把这些并入 P0-5，作为「同一批文件顺手改」，不要单开任务。

### 2.14 界面层的低成本细节（照抄即可，不必重新设计）

| 细节 | openidea 证据 | 我们的落地 |
| --- | --- | --- |
| 未跟踪分组**默认折叠**；只有「活动更改列表」的文件默认入选，其他列表默认不选 | `CommitView.tsx` 初始 `expanded = {"group:unversioned"}`；`changelists.ts:107-120` | P0-2 一并做 |
| 提交按钮**永不置灰**：信息为空时点击 → 框内内联错误 + 聚焦；检查失败时按钮变成「Commit Anyway」 | `useCommitRunner`、`commitChecks.tsx` | P0-3（空信息）/P2-4（检查） |
| 提交信息框右侧**边距标尺** + 主题超长实时计数 + 按边距自动折行（跳过主题行） | `CommitView.tsx` `messageProblems`/`wrapAtMargin` | P0-3，约 40 行 CSS + 20 行逻辑 |
| 分栏 diff：中间的 `>>` / `<<` 箭头、行首悬浮 **Revert**、F7 跨文件「差异链」 | `diffControls.ts`、`DiffEditor.tsx` | P0-4（先做箭头 + F7） |
| 日志 **300 行分页 + 虚拟滚动**，图布局跨页续接；refs 变化时 `preserve: true` 重载，选中不闪 | `logStore.ts:246-255、325-339` | P1-1 |
| 分支侧栏：最近/本地/远程/标签分组、收藏、`↓behind ↑ahead`、双击才切换（单击只选中） | `GitLog.tsx`、`logOptions.ts` `showBranches` | P1-1 |
| 日期过滤**下推后端**保证图连通；文本/用户过滤隐藏中间提交时，用**虚线**连到最近的可见祖先 | `history.rs:119`、`logOptions.ts` `QUERY_OPTIONS` | P1-1（进阶） |
| 后台静默 fetch：打开仓库 20s 后一次、之后每 15 分钟；失败则本会话自动关闭 | `incoming.ts` | P2-1 一并做 |
| 刷新去抖 + 合并：`.git/**` 变化不触发刷新（避免自己写索引又触发自己）；并发刷新共享一次 in-flight 并补一次后续刷新 | `store.ts:153-166、278-283` | P0-5：我们虽是 20s 轮询，但「操作后必须读到自己的结果」同样适用 |
| 冲突循环 = 两条通知：出现冲突 → 「N 个文件冲突 · Resolve…」；最后一个解决 → 「Commit… / Continue / Abort」 | `index.ts` | P1-5 |
| Rollback 计划：staged 重命名要**两侧一起**回滚、staged 新增回滚后变未跟踪、子模块指针不负责回滚 | `changeOps.tsx` `rollbackPlan` | 我们 `discardChanges` 已有状态分支，补「重命名两侧」即可 |
| Annotate 的**年龄色带**（越旧越淡）+ 编辑后 800ms 重新 blame + 未提交行为空 | `blame.ts` | P1-3 |
| 所有 git 输出进一个 **5000 行 Git 控制台**，错误只弹一条通知并带「查看输出」 | `ops.ts:31,74` | P1-6 |
| 快捷键面：`⌘K` 提交、`⌘↩` 提交、`⌥⌘↩` 提交并推送、`⌃M` 信息历史、`⌥⌘Z` 回滚、`F4` 跳转、`F7/⇧F7` 上/下一处差异 | `actions.tsx` 的 `keyWhen` | 目前只有 `Ctrl+Enter`；建议至少补 F7 与 `⌥⌘Z` |
| 选中文件后 **120ms 去抖**再打开 diff 预览（键盘连续移动不会刷出一堆窗口） | `GitLog.tsx` `PREVIEW_DELAY = 120` | 我们点击即打开弹窗，且详情切换有旧数据残留（§2.13），一起改 |
| diff 状态行给出「仅空白变化」「N 处移动的代码块」这类明确结论 | `DiffEditor.tsx:1034-1054` | P0-4 顺手加，成本几乎为零但很提升信任 |
| 分支过滤按仓库记忆（每个仓库记住上次选的 ref） | `logStore.ts:169-206` | 我们现在切仓库就重置 ref，可顺手改成 per-repo |

---

## 3. 落地计划（rev2）

> **实施状态（2026-11-04）**：P0 的 R1–R5 已全部落到代码（`index.js` / `git-data.js` / `git-ops.js` / `client.js`，版本升到 0.3.0），Host 侧用临时仓库跑过 `readWorktreeTree`、`rollback`（含 deleteAdded 两种模式）、`undo`、`revert`、`commit`、`branch/merge`、`message`（无 LLM 时 503）、`commit ai:true`（400）等用例；客户端用假 React 跑通了模块注册（`main` / `sidebar.panellist`）与首帧渲染。真实页面需要刷新一次；若宿主模块未热重载，重启 DSH 后生效。

> 前提：本插件是「零构建」的 ESM 结构（`index.js` Host 路由、`git-data.js` 读、`git-ops.js` 写、`client.js` 前端 React）。每条都标注要动的文件与函数。

### P0 — 本轮 5 条需求（先交付，约 2~3 天）

| 编号 | 任务 | 改动点 | 验收 |
| --- | --- | --- | --- |
| R1 | **AI 只生成、不提交** | `index.js`：新增写动作 `action:'message'`（**不调用 `beginWrite`**，用 `request.signal` 取消）；重写 `suggestCommitMessage` 的提示词：type 枚举 `feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert`、scope 由选中路径的**最深公共目录**推导（无则省略）、语言随 UI、主题 ≤60 字符、附最近 10 条提交标题做风格参考、diff 截断 24k；`commit` 动作移除 `ai` 分支（传 `ai:true` 直接 400，避免旧客户端误用）；`client.js::CommitPane` 把「AI 提交」按钮改成「生成信息 / 重新生成」，结果写入 `textarea` 并聚焦，生成中只禁用按钮、**不清空已有文本**，失败内联提示 | 点「生成信息」→ 输入框出现 `feat(git): 支持按块提交`，且**不产生提交**；手改后点「提交」成功；AI 失败仍能手填提交；生成期间并发 merge 不被 409（写锁未被占用） |
| R2 | **分支操作并入下拉行** | `client.js::Dropdown` 增加选项级动作：行尾 `⋯`（hover / focus 可见）+ 行右键菜单；`branchMenuItems` 拆成 `buildBranchMenu(entry)`（检出 / 检出为本地分支（远程）/ 以此新建 / 重命名 / 删除 / 合并到此分支 / 变基当前到此分支 / 复制名称 / 查看历史）；删除 `Toolbar` 里的 `ActionMenu`（`client.js:1989`）；「继续 / 中止」提升到状态栏（`gv-statusbar`）按钮；下拉底部固定「新建分支…」「刷新引用」 | 停在「所有引用」时也能对任意分支一步完成检出/合并/变基，不需要先筛选；`⋯` 可键盘到达（Tab → Enter）；状态栏能直接继续/中止进行中的 merge/rebase |
| R3 | **树根显示项目名** | `FileTreePane`（`client.js:2038`）：根行文案由 `t('rootLabel')` 换成 `repo.title`（空则取根目录 basename），`title` 保留完整路径 | 根节点显示 `dsh-git-view-plugin`，不再出现「项目根目录」 |
| R4 | **左树改成工作区视图（修复新增目录不显示）** | `git-data.js` 新增 `readWorktreeTree(root, path)`：`git ls-files -z --cached --others --exclude-standard` 一次取全量路径 → 服务端按前缀算「当前目录的直接子项」→ 用 `readStatus` 映射打标记；`index.js` 的 `GET ?action=tree` 增加 `mode=worktree\|ref`（默认 worktree，`ref` 才走现有 `ls-tree`）；`client.js` 树依赖加入 `changesTick`（或新增 `treeTick`）并做 30s 节流，切非 HEAD ref 时提示「当前显示的是 <ref> 的历史文件树」 | 新建 `docs/` 与其中文件后，一次自动刷新内出现在树里并带「未跟踪」标记；删除后消失；已提交的新目录立即可见；`.gitignore` 命中的目录不出现 |
| R5 | **回滚 / merge / rebase 可达** | 分支级随 R2 解决；新增写动作 `rollback`（`paths[]` + `deleteAdded`，复用 `discardChanges` 的状态判断批量执行）；`client.js`：更改区工具栏「回滚…」+ 行右键，`RollbackDialog`（默认全选、计划计数、危险确认）；详情/图上右键新增 撤销提交（soft reset）/ 还原提交（revert）/ 拣选（cherry-pick）/ 检出此提交（merge commit 拒绝 revert、undo）；`git-ops.js` 返回值改为 typed outcome（`done / rejected / conflict`） | 多选「未跟踪 + 暂存新增 + 已修改」三个文件回滚后工作区干净、无残留暂存；删除分支后通知条可恢复；撤销提交后 HEAD 回退且改动仍在；merge/rebase 入口在行菜单与状态栏都能找到 |

### P1 — 体验补全（原 P0/P1 顺延）

| 编号 | 任务 | 要点 | 验收 |
| --- | --- | --- | --- |
| P1-1 | 块级部分提交 | `workdiff` 读动作（`git diff [--cached] -- <path>`）+ 结构化 hunks（内容哈希 key）+ `commitPlan`（临时 `GIT_INDEX_FILE` + `read-tree HEAD` + `apply --cached --unidiff-zero --recount` + `commit -F -` + `reset HEAD -- paths`）；`CommitPane` 三态 + `CompareDialog` 块复选框 | 只提交 1/3 块后无残留暂存；块被外部改动时报错而非错贴 |
| P1-2 | 分组 + 更改列表 + 目录树三态 | `groupOf/initialCheck/aggregateCheck/buildTree` 纯函数；未跟踪/冲突默认不选；目录树/扁平切换；更改列表先落 localStorage | 未跟踪默认不入提交；目录勾选级联 |
| P1-3 | 提交面板增强 | 信息历史（`⌃M`）、amend 草稿、`.git/MERGE_MSG` 预填、提交后清空策略、信息框边距标尺 | 合并/变基时自动预填且可改；取消 amend 还原草稿 |
| P1-4 | Diff 增强 | 词级高亮、忽略空白开关、hunk 跳转（F7/⇧F7）、`>>`/`<<` 分栏箭头、「仅空白变化 / N 处移动」结论 | 空白改动可隐藏；F7 跨文件连续跳转 |
| P1-5 | 健壮性 | env 硬化（`LC_ALL=C`、`GIT_EDITOR`、移 `GIT_DIR`）、`--end-of-options`、index.lock 重试、argv 分批、超时按命令分级、`repoCache` 可失效、读写互斥、400 上限挪到 scope 过滤之后 | 并发 `git switch` 不失败；重命名显示 `R` 与原名 |
| P1-6 | 受限模式（安全） | 只读操作加 `-c core.hooksPath= -c core.fsmonitor=false -c diff.external= -c core.attributesFile=`、移除 `GIT_EXTERNAL_DIFF`、按需把 `filter.*.clean/process` 置空 | 打开不可信仓库不会执行其配置里的命令 |
| P1-7 | 日志分页 + 图选项 | 300 行分页 + 虚拟滚动、图布局 `state` 续接、refs 变化 `preserve` 刷新、折叠线性历史、长边箭头、分支侧栏、per-repo ref 记忆 | 切换/提交后选中不闪；深历史可读 |
| P1-8 | Stash 面板 | `stashPush/Pop/Apply/Drop/List/Branch` + 提交面板标签页（含 untracked 开关） | push 后可恢复，drop 有确认 |
| P1-9 | Blame / Annotate | `git blame --porcelain --contents -` + 详情面板按行分组、点击跳提交 | 未提交行单独标记 |
| P1-10 | 一键 .gitignore | `check-ignore` 探测、目录折叠成一条、转义、原子写、写后复验 | 目录级一条规则；已跟踪文件拒绝 |
| P1-11 | 冲突处理 | 冲突横幅 + 逐块「我方/对方/双方」+ 批量接受；三栏合并编辑器留到 P2 | 冲突计数与批量解决可用 |
| P1-12 | 可恢复性 | typed outcome、删除分支可 Restore、统一通知 + 5000 行 Git 控制台 | 破坏性操作都能看到结果与恢复入口 |

### P2 — 形态更大（按需）

| 编号 | 任务 | 备注 |
| --- | --- | --- |
| P2-1 | 远端 fetch/pull/push | **已提前实现（0.4.0）**：job + 轮询进度、`--prune`、`--autostash` 未启用（脏树直接报错）、`--force-with-lease` 仅在用户勾选时使用；SSE 推送留待后续 |
| P2-2 | Shelf / Patch | 复用临时索引生成 `--binary` 补丁；应用失败走 3-way |
| P2-3 | 三栏合并编辑器 | `:1/:2/:3` 三份文本，纯文本三栏即可，不必上 CodeMirror |
| P2-4 | 提交前检查 | Windows 非法文件名、>10MB 文件、新增行 TODO、行尾空白（`commitChecks.tsx` 里挑 2 项） |
| P2-5 | 测试基建 | 把泳道布局、`planCommit`、`toggledHunk`、树构建、回滚计划抽成纯函数，`node --test` 覆盖 |
---

## 4. 不建议照搬

| openidea 的做法 | 为什么不抄 |
| --- | --- |
| gitoxide 进程内读 status/log/blame | Node 侧没有等价物；`git` CLI + `porcelain=v2` 单次调用已足够，且不引入原生依赖 |
| 文件系统 watcher + index 身份戳 | 我们没有 watcher，20 秒轮询 + 手动刷新已够；引入 watcher 会带来跨平台与权限问题 |
| Local History（全量文件快照 + 标签） | 需要独立存储与清理策略，超出「Git 面板」边界 |
| 交互式 rebase 全量 todo UI | 收益/成本比低；先做单项 cherry-pick/revert/reset |
| GitHub PR / worktree AI 任务 | 属于 IDE/产品级集成，与本插件职责无关 |
| CodeMirror 编辑器内核 | 我们已经是 React（`client.js` 是模块加载器 bundle，`h = React.createElement`），换内核等于重写；合并视图可以做纯文本三栏 |

---

## 5. 实施顺序（rev2）

1. **R3 + R4（半天）** —— 先修「树根文案」和「左树看不到新目录」：纯读路径、风险最低、立刻可验证；
2. **R2（半天~1 天）** —— 分支操作行内化：纯 UI 重构，后端 `checkout/create/rename/delete/merge/rebase` 全部已存在，只是入口被挡住；
3. **R5（1 天）** —— 回滚对话框 + 提交级动作（undo/revert/cherry-pick）；先补 typed outcome，再挂 UI；
4. **R1（半天）** —— AI 只生成信息：注意让 LLM 调用不占用 `beginWrite` 的写锁；
5. **P1-5 健壮性 → P1-1 块级部分提交 → P1-2 分组/更改列表 → P1-3 / P1-4**；
6. **P1-7 日志与图 → P1-8 Stash → P1-9 Blame → P1-10 .gitignore → P1-6 受限模式 → P1-11 冲突 → P1-12 可恢复性**；
7. P2 按使用反馈排序。

每个 P0 项建议同时补 1~3 个纯函数测试（`node --test`，不新增依赖）：R4 的「路径 → 直接子项 + 状态标记」、R1 的「选中路径 → scope」、R5 的「文件状态 → 回滚动作」都适合先写成纯函数再测。

> 实现后记得同步更新 README 的功能列表与「安全与限制」——尤其 R1 会把「AI 提交」改名为「AI 生成提交信息」，R5 会新增回滚与提交级操作。