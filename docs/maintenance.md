# 维护与安全

## 文件保留与清理

| 类别 | 处理 |
| --- | --- |
| `src/`、`scripts/`、约束文件、skill、现行 docs | 人工维护并提交 |
| 包根 `index.js` / `client.js` | DSH 必需且纳入 Git；仅由构建更新，不能删除或手改 |
| [patch](../cordis.patch.yml)、[icon](../icon.svg)、locale、[LICENSE](../LICENSE)、manifest、锁文件 | 插件运行 / 分发必需，不能作为杂项清除 |
| `docs/images/` | README 正在引用的截图，保留 |
| `docs/archive/` | 有价值但不再现行的设计依据，标注历史状态，不混入入门流程 |
| `build/`、coverage、日志、压缩包、tsbuildinfo | 本地可再生成结果，已忽略；检查完整目标和引用后按需删除 |
| node_modules、编辑器状态、本地环境配置 | 不提交；不因“整理”删除开发者正在使用的依赖或秘密 |

不要盲删未跟踪文件、递归清空不明确目录或执行 `git clean -fdx`。先列举候选文件，确认没有用户编辑，并写明再生成命令。构建与 fixture 打包不再借用/清空整个 build 目录；其他脚本只能清理自己创建的文件。清理 build/preview 会丢失本地审计与预览，可分别用 audit / preview 重建，不影响插件运行。

## 依赖与工程约束

- [EditorConfig](../.editorconfig) 定义 UTF-8 / LF / 2 空格；[Git attributes](../.gitattributes) 固定跨平台文本换行，并把 bundle 标记为生成物。
- pnpm 版本见 [manifest](../package.json)，使用受控锁文件安装；Node 最低 22，建议与 CI 的 24 一致。
- 不为单次检查引入通用框架。工程检查使用 Node 内置测试和已有 esbuild；新增依赖要说明维护、安全和打包成本。
- [项目检查](../scripts/check-project.mjs) 校验维护文档的本地文件链接（不验证 heading anchor）、插件必需资源/exports、字典键、双端运行时导入边界。导入检查复用 esbuild 解析，忽略 type-only import、注释和字符串示例；类型导入仍须遵守 TypeScript 检查。外网链接不请求，历史调研也不作为事实验证目标。
- 当前 `private: true`，不把它当已发布的 npm 产品；不要捏造 DSH 版本兼容区间，兼容性应在目标宿主验证后单独声明。

## 安全边界

### 仓库与命令

只接受 DSH 注册的工作区 id，并由 Host 解析 Git 根目录（存在 15 秒缓存，不是每请求重新验证 registry）。GitRunner 使用 execFile / spawn 参数数组而不是 shell 拼接，并清除会把 Git 指向其他目录/索引的继承环境。分支 / ref 使用专门校验；路径不 trim、不改写，使用 `--` 与 literal pathspec，不能把合法文件名误当 option。

这**不是不可信仓库沙箱**：系统 Git、仓库配置、hooks、clean/smudge/process filters、SSH 和 credential helper 属于信任边界，插件没有隔离它们。不要在打开陌生仓库前假设 status/diff 或 commit 不会触发 Git 配置的外部程序。路由认证依赖 DSH connection 服务，不能将 UI 确认当成 Host 授权协议。

### 写操作与数据丢失

- 本地 / 远程操作共享插件内仓库写槽，但不锁住外部终端；不能替代 Git 自己的并发检查。
- 提交只包含选择文件，AI 只生成草稿；生成信息会把选中文件 diff 发送给默认模型，敏感仓库需先考虑模型数据策略。
- 回滚/撤回可能修改 index 和工作区；删除未跟踪/新增文件可能无法从 Git 恢复。多命令失败没有事务补偿，失败后重新读状态。
- 删除分支默认 `-d`，强制才 `-D`；当前分支不可删。插件没有“删后提示条一键恢复”协议，不承诺恢复未合并提交。
- 根提交 undo 仅 attached HEAD 允许，按旧 OID 校验删除明确分支引用；detached 根 undo 拒绝。merge commit 拒绝 undo / revert / cherry-pick。
- 远程 push 显式指定单分支；Shift+点击的强推使用 lease 保护，仍会改写远程历史。远程凭据沿用本机环境，不弹终端交互提示。
- fetch/pull/push 最长 10 分钟，可取消；超时宽限期收敛终态和释放锁不意味着已证明全部派生进程退出。

### 读取规模与已知限制

- 最多 400 个提交、400 个提交文件，status 最多 2000 项；单次目录加载的工作区树文件最多 2000 个，目录项另计，并非总计 2000 条的严格上限。一次提交/回滚/标记解决最多 200 个文件；diff 按 JS 字符串长度截到 400,000 个 UTF-16 code unit，并非 400 KB 字节上限。
- 目录按层加载，但工作区路径来源仍是一次全量 `git ls-files`；不是适用于任意规模仓库的虚拟文件系统。
- 路径历史不追踪重命名前的内容；非 UTF-8 文件、复杂路径/符号链接、外部并发等不应视为已有完整安全证明。
- 具体测试及尚缺的竞态覆盖见 [开发文档](development.md#测试入口与能力边界)。

## 版本与分发检查表

1. 区分本次修改与已有用户修改，不自动提交或推送。
2. 运行 frozen install（需要时）与 `pnpm run verify`；视觉修改另审 audit 报告及实际宿主页。
3. 检查版本、exports、patch id、locale、icon、LICENSE 与根 bundle 一致；需要打包时单独检查打包清单，不把 src/node_modules/build/秘密带入运行包。
4. 文档入口可用、功能描述与代码一致，历史计划明确归档；版本变更应记录面向用户的变化，而非本机安装日志。
5. 当前没有自动发布步骤，CI 只验证。更新目标 DSH / profile 需显式授权，说明 Client 与 Host 的更新路径与回退方式。
