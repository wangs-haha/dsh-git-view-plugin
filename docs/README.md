# 文档导航

现行维护信息按用途分开，避免 README 混入架构细节和一次性操作记录。

| 文档 | 读者 / 内容 |
| --- | --- |
| [README](../README.md) | 使用者：功能、交互、快速开发入口 |
| [项目约束](../AGENTS.md) | 人与编码代理共同遵守的边界与交付要求 |
| [维护 skill](../.agents/skills/git-view-maintenance/SKILL.md) | 编码代理按任务执行的核验步骤 |
| [架构](architecture.md) | 双端分层、协议、写锁与生命周期 |
| [开发与验证](development.md) | 环境、命令、测试覆盖、DSH 更新排查 |
| [维护与安全](maintenance.md) | 清理规则、依赖、发布检查、安全边界 |
| [UI 设计规范](ui-design-system.md) | 语义令牌、几何、视觉审计口径 |

## 目录约定

- `images/`：README 使用的亮暗截图，是文档资源，不是临时输出。
- `archive/`：[早期 openidea 调研](archive/openidea-optimization-plan.md)，仅作为历史设计依据。版本、能力对比和待办状态可能过时，不作为现行规范。
- 临时预览 HTML / PNG 在仓库根 `build/preview/`，不提交。

更新行为时先修改最接近该行为的现行文档，再检查 README 与本索引。不要在现行说明里保存机器用户名、固定端口、会话记录或“本轮已做什么”流水账。
