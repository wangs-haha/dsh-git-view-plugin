# 架构与契约

## 运行边界

这是 DSH 插件包，不是独立 Web 应用。源码是 TypeScript / React；包根的 `index.js` 是 Host ESM bundle，`client.js` 通过 `window.__ModuleLoader__.load({ id, factory })` 注册，React / ReactDOM 从宿主解析。元数据与入口由 [package manifest](../package.json) 和 [Cordis patch](../cordis.patch.yml) 声明。

```text
DSH workspaceRegistry ──> RepoResolver ──> repository root
DSH connection ──> GitViewRoutes ─┬─> GitData ──> GitRunner ──> git
                                ├─> GitOps ───> GitData
                                └─> RemoteService ──> remote-command / GitRunner
                                       │
                             shared ops.lock (per root)

DSH slots / locale ──> Client entry ──> GitViewPanel
                                      ├─ GitApi <── HTTP ──> Host
                                      ├─ RemoteRunner (poll / cancel)
                                      └─ panes / ui / layout / notices
```

## 模块职责

| 模块 | 职责与边界 |
| --- | --- |
| [Host entry](../src/host/index.ts) | 依赖装配、两条路由与远程任务 dispose 注册，不承载业务 |
| [routes](../src/host/routes.ts) | action 分发、输入校验、写锁 wrapper、HTTP 状态/错误信封、AI 草稿 |
| [data](../src/host/data.ts) | status/refs/tree/log/commit/diff 查询，以及选中文件的 stage + commit；并非纯只读类 |
| [ops](../src/host/ops.ts) | 分支、进行中操作、历史、回滚策略与共享进程内写锁 |
| [exec](../src/host/exec.ts) | 参数数组执行、硬化环境、超时、输出与进程错误 |
| [paths](../src/host/paths.ts) / [repo](../src/host/repo.ts) | 原始 Git 路径校验；工作区 id → 根路径，15 秒 TTL 缓存 |
| [remote-command](../src/host/remote-command.ts) / [remote](../src/host/remote.ts) | 远程参数规划；任务状态、进度、取消、看门狗与锁释放 |
| [Client entry](../src/client/index.tsx) / [app](../src/client/app.tsx) | 注册字典/槽位/自检；组合状态、副作用与动作 |
| [api](../src/client/api.ts) / [remote runner](../src/client/remote.ts) | 集中 HTTP/错误解码；绑定任务所属仓库与轮询生命周期 |
| [panes](../src/client/panes/CommitPane.tsx) / [ui](../src/client/ui/ActionDialog.tsx) | 业务面板与复用交互组件；不直接构造 Git 命令 |
| [metrics](../src/client/metrics.ts) / [styles](../src/client/styles.ts) | 几何与语义样式单一来源 |
| [i18n](../src/client/i18n.ts) / [locale metadata](../locale/zh.json) | 面板中英文案；插件元信息，二者用途不同 |

## HTTP 契约

浏览器只传工作区 id，不能指定本地仓库绝对路径。路由由 DSH connection 服务承载，会话认证依赖宿主，不是本插件自己实现的鉴权系统。

- `GET /api/git-view?action=...`：`repos`、`tree`、`log`、`commit`、`diff`、`status`、`remoteJob`。
- `POST /api/git-view/write`：`commit`、`message`、`branch`、`discard`、`rollback`、`history`、`resolve`、`remote`、`remoteCancel`。
- 失败信封：`{ error, state?, conflict? }`。GitApiError 保留 status、state、conflict；互斥与冲突场景使用 409。不要把所有失败都转成 200 或丢失状态。
- Host [types](../src/host/types.ts) 与 Client [types](../src/client/types.ts) 分别维护。当前没有 `src/shared/`，也没有全局事件总线；改协议必须联动两端、路由与测试，不要求没有消费需求的字段机械一模一样。

## 写操作与远程任务

本地写 action 在 routes 中 `beginWrite(root)`，finally 释放；直接调用 GitOps 方法不会自动串行化。锁为当前插件实例内按根路径记录的 Set，不覆盖终端或其他 DSH 进程。

远程服务注入同一个 `ops.lock`，取得写槽后读取状态并规划命令。启动返回 job id；客户端约每 700ms 通过 `remoteJob` 轮询，取消通过 `remoteCancel`。状态为 `running / cancelling / done / cancelled / error`，并非业务 SSE 推送。任务最长 10 分钟，终态统一释放锁；插件卸载也调用 dispose。超时宽限期后的强制收敛不等于证明所有子孙进程已退出。

Git 写操作常由多条命令组成，失败不是自动事务回滚；例如 add 成功而 commit 失败后可能留下暂存状态。前端必须重新读取状态，不能假设什么都没变。

## AI 与客户端异步边界

`message` 使用默认模型读取选中 diff 并返回草稿，不获取仓库写锁、不提交。前端核对仓库 epoch、选中路径及草稿 revision，迟到结果不能覆盖用户输入；旧的 `ai:true` 提交路径明确拒绝。

读取请求应保留取消/迟到结果防护；远程任务属于发起时的仓库，切仓库不能把后续结果写入另一个仓库的状态。

## 构建新鲜度不是通用 HMR

[selfcheck](../src/client/selfcheck.ts) 消费宿主 `/plugins/events` 的 `graph` 数据，找到本插件地址并对比 build marker。它有可见性判断、每 marker 去重、忙碌/草稿 hold 和失败放行机制。该机制不能证明宿主正在重建或重新加载 Host。

更多见 [开发与验证](development.md) 和 [安全边界](maintenance.md#安全边界)。
