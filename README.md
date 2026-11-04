# Git Graph — DSH 插件

在 DSH Web 界面中加入 IntelliJ IDEA 风格的 Git 工作台：左侧文件树与提交区可上下拖动，中间彩色提交图，右侧提交详情，三栏宽度也都可以拖动调整。

## 功能

- 侧边栏 **Git** 图标打开全屏面板，完全跟随 DSH 主题令牌与中英文界面。
- **顶部工具栏**：仓库与分支下拉框、提交搜索、刷新。
- **分支操作就地下拉**（参考 IntelliJ IDEA）：
  - 下拉里每个分支行**最右侧**有「⋯」，点开的是向**右侧展开**的操作菜单；单击行只是筛选历史，不会切换分支。
  - **检出分支**；远程分支可「检出为本地分支」并自动建立跟踪起点。
  - **新建分支**，可基于该分支/标签/远程分支创建，并选择创建后是否检出。
  - **重命名**、**删除**本地分支（默认 `-d` 安全删除，勾选「强制删除」才会丢弃未合并提交；当前分支不可删除）。
  - **合并到此分支 / 变基当前到此分支**：合并/变基/拣选/还原/二分查找进行中时，状态栏和提交区顶部都会出现**继续 / 中止**按钮。
  - 提交图状态栏显示当前分支、领先/落后远程的提交数以及进行中的操作。
- **远程同步**（工具栏分支下拉右侧的三个按钮）：
  - **抓取**：`git fetch --all --prune --progress`，更新所有远程引用与领先/落后计数。
  - **拉取**：`git pull --progress --ff`；**Shift+点击**用 rebase 而不是 merge，不再弹确认框。
  - **推送**：`git push --progress`；没有上游时自动 `--set-upstream origin <branch>`，**Shift+点击**使用 `--force-with-lease`，不再弹确认框。
  - 三个操作都在后台任务里跑：工具栏下方出现进度行（百分比 + git 最后一行输出），可以取消；结束后自动刷新提交图、引用与领先/落后计数。
  - 认证使用本机已有的 SSH agent / credential helper；面板不弹交互式密码框，认证失败会提示你先在终端完成一次认证。
- **左侧文件树是工作区视图**：
  - 显示已跟踪 **和未跟踪** 的文件（遵守 `.gitignore`），新增/修改/删除/冲突以字母和颜色标记；新建目录、未提交文件不需要先 commit 就能看到。
  - 状态轮询、提交、回滚之后自动刷新并保留展开状态；根节点显示项目名。
  - 按分支筛选历史时切换为该分支的历史文件树，并在标题处提示。
  - 选中目录/文件后，提交图与详情只显示该范围内的历史；文件树与提交区之间的分隔条可上下拖动。
- **提交区**：
  - 一行操作：左侧 **「生成信息」**（有内容时变「重新生成」），右侧 **「提交」**，中间是已选文件计数；生成只把 `type(scope): 描述` 写进输入框，**不会替你提交**。
  - 每个文件都有选择框，**默认全选**；取消勾选即在提交时排除该文件，这就是部分提交。
  - **「回滚更改」**：多选文件批量还原（未跟踪删除、暂存新增移除、已修改/已删除/冲突恢复到 `HEAD`），并可选择「删除新增文件的本地副本」；单行撤回按钮保留。
  - `Ctrl+Enter` / `⌘+Enter` 提交，`Enter` 在提交信息中换行。
  - 文件状态以颜色、字母和简短标签呈现：**未跟踪**、**已修改**、**已暂存**、**冲突**、**已删除**、**重命名**；顶部还有可滚动的分类计数汇总。
  - 提交区标题栏可在**列表 / 树形**之间切换：树形按目录分组，目录前的复选框可一次选中/取消该目录下的所有文件；选择结果会记住。
  - 所有操作失败都走面板顶部的**统一异常横幅**：标题（提交/分支/远端…）、消息、可展开复制的技术详情、关闭按钮；读取失败则在对应面板内显示统一的错误卡片。
- **中间提交图**：彩色泳道、合并/分叉、refs、作者、日期、短哈希，搜索命中高亮。
- **提交节点操作**：在提交行上**右键**（或悬停行尾「⋯」、键盘 Shift+F10）打开上下文菜单，菜单按节点状态生成：
  - 复制哈希、复制提交信息；
  - **检出此提交**（当前 HEAD 不出现）、**拣选**（HEAD 或 merge commit 不出现）、**还原**（merge commit 不出现）；
  - **撤销上次提交**只在 HEAD 上出现。
- **右侧详情**：完整提交信息、作者/提交者、父提交跳转，按当前路径筛选的文件变更列表，以及同一套上下文相关的提交级按钮。
- **文件对比弹窗**：双栏「修改前 / 修改后」，带行号、hunk、增删着色与同步滚动；二进制文件给出提示。
- 更改列表每 20 秒自动刷新（页面不可见时暂停），提交、分支切换和回滚后立即刷新。
- 窄面板自动切换紧凑布局，左右宽度与提交区高度都会记住。

## 使用

1. 点击左侧边栏 Git 图标打开面板（`pnpm build` 后 HMR 会自动更新，不需要刷新页面）。
2. 点击左侧边栏 Git 图标。
3. 选择仓库；在分支下拉里单击分支可筛选历史，点行尾「⋯」执行检出、新建、重命名、删除、合并、变基。
4. 用分支下拉右侧的三个按钮**抓取 / 拉取 / 推送**；拉取和推送会先确认策略，期间工具栏下方显示实时进度，可取消。
4. 在左树选择目录或文件缩小历史范围（左树显示的是工作区，包含未跟踪文件）。
5. 在提交区勾选要提交的文件（默认全选），点 **「生成信息」** 让 AI 起草，改好后点「提交」；也可以完全手写信息后提交。
6. 想放弃改动时点行右侧撤回按钮，或点 **「回滚更改」** 批量选择文件。
7. 选中一个提交后，直接在该行右键（或行尾「⋯」）做检出/拣选/还原/撤销；右侧详情底部也有同一套按钮。

工作区目录可以位于仓库子目录中：Host 会通过 `git rev-parse --show-toplevel` 找到仓库根目录。

> 「生成信息」会把已勾选文件的 diff 发送给当前默认模型，只用于起草提交信息；不会 commit、不会 push。提交、分支、合并、变基、回滚、撤销都只执行本地 Git 命令。

## 结构

源码是 React + TypeScript，构建产物在 `dist/`（DSH 实际加载的就是它）：

| 路径 | 作用 |
| --- | --- |
| `src/host/index.ts` | 插件入口：构造服务、注册 `/api/git-view` 与 `/api/git-view/write`。 |
| `src/host/routes.ts` | `GitViewRoutes`：动作分发、参数校验、错误信封与状态码。 |
| `src/host/data.ts` | `GitData`：refs、工作区文件树、log、status、commit、diff、`commitChanges`。 |
| `src/host/ops.ts` | `GitOps`：分支生命周期、merge/rebase/继续/中止、回滚/撤回、undo/reset/revert/cherry-pick/checkout。 |
| `src/host/remote.ts` | `RemoteService`：fetch/pull/push 任务、进度行、取消、10 分钟看门狗。 |
| `src/host/remote-command.ts` | 远程命令参数构造与校验、凭据错误提示。 |
| `src/host/exec.ts` | `GitRunner`：`spawn`/`execFile` 包装、硬化环境、超时、结果与错误。 |
| `src/host/repo.ts` | `RepoResolver`：工作区 id → 仓库根，15s TTL 缓存。 |
| `src/client/index.tsx` | 客户端入口：注册字典、主面板与侧边栏图标。 |
| `src/client/app.tsx` | `GitViewPanel`：状态、副作用、动作与面板组合。 |
| `src/client/api.ts` | `GitApi`：鉴权路由的读取/写入/远程任务轮询。 |
| `src/client/remote.ts` | `RemoteRunner`：启动、轮询、取消一次远程任务。 |
| `src/client/layout.ts` | `LayoutStore`：分栏宽度与上次仓库的持久化。 |
| `src/client/metrics.ts` | 面板几何单一来源：行高、栏头、控件高度、紧凑断点、提交表列宽。 |
| `src/client/notices.ts` | `NoticeCenter`：6 秒自动消失的操作提示。 |
| `src/client/selfcheck.ts` | 构建新鲜度自检：页面跑的是旧构建时自动重载一次。 |
| `src/client/panes/` | 工具栏、文件树、更改区、提交图、详情、对比弹窗与泳道布局。 |
| `src/client/ui/` | 可复用的下拉、行内菜单、弹窗、回滚对话框、分隔条、Spinner。 |
| `src/client/format.ts` / `i18n.ts` / `icons.tsx` / `styles.ts` / `types.ts` | 纯函数、中英字典、图标、样式与共享类型。 |
| `index.js` / `client.js` | 构建产物（勿手改）：Host ESM bundle 与浏览器 bundle（外层保留模块加载器工厂）。 |
| `cordis.patch.yml` | 插入 `git-view` 行。 |

## 开发

```powershell
pnpm install        # 只需一次
pnpm typecheck      # tsc --noEmit
pnpm build          # esbuild → index.js + client.js（包根目录）
pnpm run reload     # 让运行中的 DSH 热加载插件（不需要刷新页面）
pnpm smoke          # Host 路由 / 客户端注册 / 面板渲染冒烟测试
pnpm run audit      # 真实 Chrome 计算样式审计（对比度/溢出/几何/令牌）
pnpm preview        # 亮暗两套整页截图 → build/preview/*.png
pnpm verify         # 前三步串起来
```

> `audit` 与 pnpm 内置的 `pnpm audit`（依赖安全审计）重名，必须写成 `pnpm run audit` 才会执行本插件的脚本。

- 插件以 junction 方式安装在 profile 里。`pnpm build` 后 `client-hmr` 会自动换模块（实测 1 秒级），**不需要刷新页面**；桌面壳刷新页面反而不会重新读取宿主启动时缓存的 boot manifest，只有 HMR 断开时才需要重启 DSH。
- 桌面端用 `pnpm build && pnpm run reload` 也可以：DSH 的 `client-hmr` 每 500ms 轮询每个客户端 bundle，文件 stat 一变就在 `/plugins/events` 广播 `rebuilt` 帧，页面随即卸载并重建该插件。`--wait` 会打印服务端发布的 rev；脚本优先读 `DSH_WEB_URL` / `DSH_ORIGIN`，不再写死端口。
- 插件还会**自愈**：面板启动 4 秒后、之后每 60 秒、以及窗口重新可见时，会从 `/plugins/events` 取自己的 bundle 地址，比对编译期写进代码的构建标记（`pnpm build` 会打印 `client build <marker>`）。发现页面跑的是旧构建就自动 `location.reload()` 一次：`sessionStorage` 按标记去重（每个构建最多重载一次，不会循环），页面不可见时不重载，网络或解析失败一律放行。
- 冒烟测试用临时仓库和 mock 上下文直接调路由，不需要真实 DSH 会话：`scripts/smoke-host.mjs`、`scripts/smoke-client.mjs`、`scripts/smoke-panes.mjs`；`scripts/smoke-selfcheck.mjs` 用假 fetch 断言自愈检查只重载一次且失败放行。
- 色彩与布局的令牌层、尺寸规范、以及 `pnpm run audit` 的判定口径见 [docs/ui-design-system.md](docs/ui-design-system.md)。

## 安全与限制

- 仓库路径只来自已注册的 DSH 工作区；浏览器只发送工作区 id。
- 所有 Git 命令使用 `execFile` 参数数组执行，分支名、ref 与文件路径在 Host 侧校验，拒绝以 `-` 开头的参数。
- 「生成信息」只读取状态与 diff，不获取写锁、不修改仓库；`message` 请求失败时可以继续手写提交。
- 回滚未跟踪/新增文件以及强制删除分支不可恢复，界面会二次确认；删除分支后可从提示条恢复（保留 tip 的操作另行提供）。
- 撤销提交、还原、拣选、检出提交都是本地写操作；merge commit 拒绝 undo/revert/cherry-pick。
- 一次最多读取 400 个提交、400 个文件、2000 个工作区树条目；单次提交/回滚/标记解决最多 200 个文件；diff 超过 400 KB 会截断。
- 文件树按目录懒加载（`git ls-files` 一次取全量路径后按前缀切分），路径筛选使用 Git pathspec，不追踪重命名前的历史。
- 远程操作在后台任务中执行，与本地写操作共享「同一仓库同一时间只允许一个写操作」的互斥；单次任务最多 10 分钟，可随时取消。
- 面板不会弹出交互式凭据输入（`GIT_TERMINAL_PROMPT=0`），依赖本机 SSH key 或 credential helper；认证失败会提示先在终端完成一次认证。
- 只支持可访问本地 `git` 可执行文件的环境。


