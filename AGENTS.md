# 项目协作约束

本文件适用于整个仓库。目标是保留 DSH 插件加载契约、Git 操作安全边界及可验证的维护流程，不为整理目录顺手重写业务。

## 开始工作

1. 阅读 [README](README.md) 与 [文档索引](docs/README.md)，先执行 `git status --short`，保留与任务无关的已有改动。
2. 实施维护、功能、修复或代码审查前，阅读项目 skill：[git-view-maintenance](.agents/skills/git-view-maintenance/SKILL.md)。若客户端没有自动发现项目 skill，按路径手动读取，不能声称它已经加载。
3. 只读审查不运行会写文件的 build、reload、截图或 Git 写命令。清理前核对完整目标路径、引用与可再生成方式；禁止直接 `git clean -fdx`、`git reset --hard` 或覆盖用户草稿。

## 代码与依赖

- TypeScript/TSX 是唯一业务源码；ESM、2 空格、UTF-8、LF，沿用现有无分号风格。NodeNext 源码相对导入使用 `.js` 后缀。
- Host 在 `src/host/`，浏览器在 `src/client/`。两端不可相互 runtime import；当前没有 `src/shared/`，接口类型分别维护。变更 action、payload、错误信封或任务状态时同时检查两端与回归测试。
- 入口只装配服务或注册槽位。HTTP 与错误解析走 routes / GitApi；不要在展示组件里拼 API 或执行 Git。
- 优先复用现有模块和 Node 内置能力，不为格式化或测试引入大依赖。改依赖时同步锁文件；安装用 `pnpm install --frozen-lockfile`，升级依赖须单独说明。
- 根目录 `index.js`、`client.js` 是必须保留的受控发布产物，不手改、不移动到 `dist/`；修改源码后通过 build 再生成。构建标记每次变化，不能把 bundle 字节相等作为可重复构建判定。
- React / ReactDOM 由 DSH 页面提供，客户端 bundle 必须保留 module-loader factory，不能打包第二份 React 或引入 Node 实现。

## Git 安全不变量

- 仓库来自 workspaceRegistry 的 id → 根路径解析，不能接受浏览器任意指定的本地目录。
- 插件 Git 执行统一经 GitRunner 的参数数组与硬化环境，禁止拼 shell 字符串。ref/branch 校验不能与文件路径校验混用；路径是原样标识符，不 trim、不改斜杠，保留 `--` 与 literal pathspec 保护。
- 本地写入口必须取得 `ops.beginWrite(root)` 并在 finally 释放；GitOps 方法本身不会自动加锁。远程任务共享同一个 `ops.lock`，先加锁再读取状态、规划命令，终态与卸载均清理任务。锁只覆盖当前插件进程，不替代 Git 对外部进程的锁。
- 部分提交、撤回、回滚必须限定选中路径；不得换成全仓 `add .`、`clean` 或 hard reset。不得宣称多命令操作失败后会自动回滚。
- 默认安全删除分支，强制删除仅在明确参数下启用；失败创建分支不能按名称自动删除。根提交 undo 仅允许 attached HEAD，删除明确分支引用并校验旧 OID。
- push 显式指定 remote 与单一目标分支，不依赖 `push.default`；强推只能显式使用 `--force-with-lease`，不得改成裸 `--force`。
- AI 只生成可编辑草稿，不自动 commit / push；异步结果不得覆盖已更换的仓库、文件选择或手工草稿。
- 不移除破坏性 UI 操作的确认。UI 确认不是 Host 权限控制；插件也不是隔离不可信 Git hooks / filters 的沙箱。详见 [安全边界](docs/maintenance.md#安全边界)。

## 界面约束

- 遵守 [UI 设计规范](docs/ui-design-system.md)，复用 `styles.ts` 的语义令牌、`metrics.ts` 的几何与 `ui/` 组件；门户浮层也必须拥有令牌。
- 文案同时更新 `src/client/i18n.ts` 的中英字典；`locale/*.json` 只承载插件元信息，不是面板文案副本。
- 保留键盘可达、焦点、取消、空态、错误态、亮暗主题以及 reduced-motion 行为。

## 验证与交付

- 提交前运行 `pnpm run verify`：项目检查 → 工具回归 → 类型检查 → 构建 → 五组 smoke。
- Git 行为回归加到 Host smoke；纯客户端逻辑可使用内存 esbuild + Node 断言；新增面板/状态要补夹具。测试只能操作临时仓库，不得对开发仓库试写操作。
- UI 变更另跑 `pnpm run audit`、必要时 preview，并在实际 DSH 页面检查。mock React 不证明交互正确，视觉夹具也不证明宿主页已更新。
- 不承诺 build 后自动热更新：先核对安装目标与宿主 watcher。不要启动替代服务器冒充现有 DSH 页面；Host 与 Client 的更新条件不同，见 [开发文档](docs/development.md)。
- 变更行为时同步用户说明；改架构/安全边界时同步对应 docs。最终说明改了什么、实际执行了什么、哪些未验证；不自动 commit、push、安装插件或更改 profile。
