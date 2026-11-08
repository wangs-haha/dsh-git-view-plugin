---
name: git-view-maintenance
description: 维护、扩展或审查本仓库的 DSH Git View 插件时使用；覆盖双端契约、Git 写安全、界面令牌、验证与交付。
---

# Git View 插件维护

适用：本仓库的功能修复、重构、工程整理与评审。不要将本 skill 当作通用 Git 操作授权。

## 1. 建立任务边界

- 从当前工作目录定位仓库，读取根 [AGENTS](../../../AGENTS.md) 与 [文档索引](../../../docs/README.md)。
- 核对 `git status --short` 与有关 diff，记录已有用户改动；先明确是否只读审查。只读任务不能运行 build / reload / shots。
- 依据任务选读文档，而不是把历史调研当成当前设计：
  - 服务分层、HTTP 与任务生命周期：[架构](../../../docs/architecture.md)。
  - 命令、测试能力与宿主更新：[开发](../../../docs/development.md)。
  - 清理、发布、安全限制：[维护](../../../docs/maintenance.md)。
  - 样式与几何：[UI 规范](../../../docs/ui-design-system.md)。

## 2. 按改动类型核对

### Host / Git 操作

1. 从 routes 找到 action，再跟踪 data / ops / remote-command / remote，最后检查 GitRunner 参数和环境。
2. 仓库只解析注册工作区 id；区分分支名、ref、hash、原始文件路径的校验，不能相互替换。
3. 写操作核对共享仓库锁及 finally 释放；远程任务核对先锁后规划、取消、超时、dispose、只释放一次。
4. 提交/回滚核对精确选中路径、暂存删除、前导空格、冲突状态；不要扩大全仓操作范围。
5. 历史操作核对 attached/detached HEAD、根提交、merge commit；推送核对明确的单分支 refspec 与 lease。
6. 在临时仓库回归里加入失败条件与“未选中对象保持不变”的断言。不能只测 HTTP 200。

### Client / 界面

1. 请求统一走 GitApi；payload 与 Host types / routes 同步核对，当前并无共享 runtime 类型模块。
2. 生命周期核对取消、卸载、切仓库后的迟到响应以及旧草稿保护；保留 freshness hold/release 与每 marker 只重载一次。
3. 布局复用 metrics，样式复用语义令牌；中英文键一致。门户、错误、空态、紧凑布局都要有夹具。
4. mock 渲染通过后仍需亮暗主题、键盘、弹窗与真实宿主页人工检查；明确测试边界。

### 工程 / 文档 / 清理

1. 只修改源码和维护脚本，不手改包根 bundle。保留 manifest exports、patch、locale、icon、LICENSE 与锁文件。
2. 删除前列出完整路径、判断是否受控/被引用、说明如何再生成；不要把所有未跟踪内容当垃圾。
3. 构建与 fixture bundle 尽量内存化；临时产物只写 `build/`，不递归清除其他脚本输出。
4. 历史设计移入 archive 并注明不再作为现行规范；删除机器绝对路径、旧端口、安装流水账，不删除有价值的设计依据。

## 3. 验证

```sh
pnpm run verify
# 涉及视觉时额外执行；不是 pnpm audit
pnpm run audit
pnpm run preview
```

- verify 包含 check、test:tooling、typecheck、build 与五组 smoke；它会重新生成包根产物，但不应清空 build/preview。
- 如环境不能运行某项，记录准确失败原因，不以类型检查替代行为验证。
- 检查最终 diff：没有覆盖用户改动、秘密、临时截图、node_modules 或手写 bundle；文档链接可用，包根产物由最新源码生成。
- 不为“看效果”擅自修改 DSH profile 或启动新服务器。reload 仅是客户端触碰/事件诊断，不能证明 Host 已重载。

## 4. 交付格式

简要说明：变更范围 → 保持不变的边界 → 已执行检查及结果 → 未验证项。涉及删除时列出删除类别及保留依据；不自动提交或推送。
