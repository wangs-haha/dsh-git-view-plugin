# 开发与验证

## 环境与初次运行

- Node.js 22 或更高；CI 使用 Node.js 24。
- pnpm 使用 [manifest](../package.json) 的 `packageManager` 固定版本（当前 11.28.5）。
- 系统 `git` 在 PATH 中可用。视觉工具另需本机 Chrome / Edge，脚本自动探测常见路径。
- React / ReactDOM 由 DSH 页面提供，开发依赖只包含类型与构建工具。

```sh
pnpm install --frozen-lockfile
pnpm run verify
```

[pnpm 配置](../pnpm-workspace.yaml) 禁止脚本运行前隐式重新安装依赖，避免多盘符或不同 pnpm store 导致执行检查时擅自重建 node_modules。缺依赖时显式安装；不要用 `CI=true` 强行绕过移除确认来修复个人环境，也不要删除锁文件掩盖版本问题。

## 命令与副作用

| 命令 | 内容 | 文件 / 外部副作用 |
| --- | --- | --- |
| `pnpm run check` | 文档本地链接、必需资源、manifest、导入边界与中英键检查 | 只读仓库，i18n 内存打包 |
| `pnpm run test:tooling` | 工程检查与内存打包辅助函数回归 | 仅测试自建的系统临时目录 |
| `pnpm run typecheck` | strict TypeScript，noEmit | 不生成业务文件 |
| `pnpm run build` | esbuild 双端 bundle | 重写包根 index.js / client.js；不清空 build/ |
| `pnpm run smoke` | Host / Client / panes / diff / selfcheck 五组检查 | Host 自建临时 Git 仓库与 bare remote；其他夹具内存打包 |
| `pnpm run verify` | 依次运行前五项 | 包含重建发布产物，不是纯只读命令 |
| `pnpm run audit` | 亮暗夹具的真实浏览器计算样式报告 | 写 build/preview/audit-*.html；启动 headless 浏览器 |
| `pnpm run preview` | 夹具亮暗主题截图 | 写 build/preview/ 下 HTML / PNG |
| `pnpm run shots` | README 主面板截图 | **覆盖** docs/images/panel-{light,dark}.png，按需运行 |
| `pnpm run reload` | 触碰客户端 bundle 并短暂监听宿主事件 | 修改 client.js 时间戳并访问运行中的 DSH；不是 Host reload |

`pnpm audit` 是 pnpm 自带的依赖安全审计；视觉检查必须写成 `pnpm run audit`。视觉脚本是报告工具，退出成功不等于报告内零问题，必须检查计数和明细。

## 测试入口与能力边界

| 入口 | 覆盖 |
| --- | --- |
| [project tests](../scripts/project.test.mjs) | 坏链接/字典差异、运行时与 type-only 导入边界、reload 完整 URL 规划及无效 origin 不触碰 bundle、内存打包不改预览内容 |
| [Host smoke](../scripts/smoke-host.mjs) | mock DSH 路由 + 真临时 Git：提交、暂存删除、草稿、分支、回滚、远程 job、精确空格路径、matching 推送隔离、范围截断、attached/detached 根 undo |
| [Client smoke](../scripts/smoke-client.mjs) | module-loader、依赖注入、locale、slots 注册与首帧 |
| [panes smoke](../scripts/smoke-panes.mjs) | fake React 遍历 [面板夹具](../scripts/panes-entry.tsx)，覆盖有数据/错误/菜单/弹窗渲染路径 |
| [diff smoke](../scripts/smoke-diff.mjs) | diff 行配对、行号、无末尾换行、多个文件和行数上限 |
| [selfcheck smoke](../scripts/smoke-selfcheck.mjs) | 假 fetch/storage：旧构建只重载一次、不可见/忙碌不重载、失败放行、dispose |

mock React 不执行真实 effect，不是浏览器交互测试；视觉夹具也不带真实宿主状态。当前测试不完整覆盖写锁竞态、远程取消/超时/dispose 竞态、外部进程并发和所有恶意路径矩阵，修改这些逻辑时必须补专门回归。

## DSH 中验证更新

1. 核对 profile 安装的包是否指向本仓库；源码修改不代表正在运行的包会更新。未经明确授权不安装、启用或修改 profile。
2. `pnpm run build` 后分开处理两端：Host 要由宿主重新加载插件或重启 DSH；刷新网页不会重新执行 Host 模块。
3. Client 的自动更新依赖同一 DSH 实例的 watcher/HMR 与安装目标。在源码开发宿主中，必须确认相应 checkout 的 `pnpm run dev:web` 正在运行，才可承诺无需刷新；否则按宿主的重建/刷新流程核对现有页面。不要为此启动替代服务器。
4. 面板自检通过宿主 graph 找 bundle 并比较 marker，失败放行且忙碌/草稿期间延迟重载。它不能修复错误安装目标，也不能证明 Host 更新成功。
5. 有需要才运行客户端诊断：

```powershell
# DSH 启动的 shell 通常已提供 DSH_WEB_URL；没有时填实际现有 URL。
$env:DSH_WEB_URL = 'http://127.0.0.1:<实际端口>'
pnpm run reload
```

[reload 脚本](../scripts/reload.mjs) 使用 `DSH_ORIGIN` 或 `DSH_WEB_URL`，不能从旧记录猜端口；若传入页面 URL，会按其 origin 访问 `/plugins/events`，不沿用 pathname、query 或 fragment。即使打印事件，也应在实际页面检查功能与浏览器错误；touch 成功不等于 HMR 生效。

## 提交前

- CI 的 [verify workflow](../.github/workflows/verify.yml) 在 Ubuntu / Windows、Node 24 上执行 frozen install 与完整 verify；浏览器审计独立运行，不假装 CI 做过真实 DSH E2E。
- 改行为补测试和说明；改依赖同步锁文件。构建后检查 bundle diff，确认没有第二份 React 或 Node 代码进入浏览器。
- `git diff --check`，再审阅已有用户修改没有被覆盖、临时文件没有加入版本控制。
