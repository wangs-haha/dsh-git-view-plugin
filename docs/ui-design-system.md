# 面板视觉规范（色彩 / 布局令牌）

> 适用版本：0.5.0 起。本文描述 `src/client/styles.ts` 的令牌层、`src/client/metrics.ts` 的尺寸单一来源，以及用 `pnpm run audit` 得到的可复核结论。

## 1. 目标

插件嵌在 DSH Web 里，主题由宿主提供。改造前的问题是**同一套 CSS 同时对亮色和暗色写死**，导致：

| 现象 | 原因 |
| --- | --- |
| 亮色下整块面板是一张白纸，分栏和悬停都看不见 | `--dsw-alias-bg-layer-1/2` 在亮色主题里都等于 `#fff`；`--dsw-alias-border-l1` 只有 4% 黑 |
| 同一份颜色在亮/暗下语义不一致 | 把 `--dsw-alias-brand-primary` 当强调色用，而它在亮色是近黑 `#0f1115`、暗色是近白 `#f9fafb`，并不是蓝色 |
| 暗色下菜单文字几乎看不清 | 菜单用 `--dsw-alias-bg-overlay`，暗色是 `#61666b`，白字对比度只有 1.76:1 |
| 亮色下 35 处小字不达 4.5:1 | 直接把 `#22c55e` / `#f59e0b` / `#ec1313` 当文字颜色，铺在白底或 12% 同色底上 |
| 行高、字号、圆角、控件高度各写各的 | CSS 里出现 8.5–14px 共 11 级字号、3–12px 共 10 级圆角、18–32px 共 7 种控件高度 |

现在所有颜色都来自**一层语义令牌**，尺寸来自**一个 metrics 模块**，并且用 `pnpm run audit` 在真实浏览器里复核数值。

## 2. 颜色令牌

令牌声明在 `.gv-root` 与三个门户根上（`.gv-modal-mask` / `.gv-menu` / `.gv-opt-menu`）——菜单和弹窗渲染到 `document.body`，不在 `.gv-root` 内部，必须各自携带一份令牌。

### 2.1 两类强调色，不要混用

| 角色 | 令牌 | 宿主来源 | 用途 |
| --- | --- | --- | --- |
| 交互强调色 | `--gv-accent` | `--dsw-alias-state-business-primary`（亮 `#4176e6` / 暗 `#5686fe`） | 选中、焦点环、链接、计数、增删标记、AI 动作 |
| 对比填充色 | `--gv-solid` / `--gv-on-solid` | `--dsw-alias-brand-primary` / `--dsw-alias-label-primary-foreground` | 主按钮、HEAD 徽章（亮色黑底白字、暗色白底黑字，主题自适应） |

### 2.2 表面与描边

宿主在亮色把 `bg-layer-1/2/3` 全设为白色，无法表达层级；因此表面由**文字色叠加**推导，亮暗两套自动成立：

| 令牌 | 定义 | 亮色实测 | 暗色实测 |
| --- | --- | --- | --- |
| `--gv-bg` | `--dsw-alias-bg-base` | `#ffffff` | `#151517` |
| `--gv-surface-1` | `--dsw-alias-bg-layer-1` | `#ffffff` | `#232324` |
| `--gv-surface-2` | text 4% over surface-1 | `#f5f5f6` | `#2c2c2d` |
| `--gv-surface-3` | text 8% over surface-1 | `#ececec` | `#343435` |
| `--gv-surface-pop` | text 3% over bg（菜单/弹窗） | `#f8f8f8` | `#1c1c1e` |
| `--gv-border` | text 8% | `#0d0d1a@.08` | `#ffffff@.08` |
| `--gv-border-strong` | text 13% | `#0f0f17@.13` | `#f7f7f7@.13` |
| `--gv-border-control` | text 15% | `#0d1414@.15` | `#f8f8f8@.15` |
| `--gv-hover` | `--dsw-alias-interactive-bg-hover` | `#223344@.06` | `#ffffff@.08` |
| `--gv-active` | `--dsw-alias-interactive-bg-active` | `#273145@.10` | `#ffffff@.14` |

> 描边没有沿用 `--dsw-alias-border-l1`（亮色 4% 黑）：面板是密集的 IDE 型界面，全靠 1px 线条分栏，4% 在亮色下几乎不可见。改为从文字色推导后，亮暗两色的可见度落在同一区间（Δ1.18–1.58）。

### 2.3 语义色：同一份声明在两种主题都可读

状态色（成功/警告/危险）在亮色下作为**文字**不达标，因此文字用 `*-fg`，它把状态色和文字色混合——亮色下自动变深、暗色下自动变浅：

| 令牌 | 定义 | 亮色 | 暗色 | 说明 |
| --- | --- | --- | --- | --- |
| `--gv-ok` / `-warn` / `-danger` | 宿主 state 色 | `#22c55e` / `#f59e0b` / `#ec1313` | `#22c55e` / `#f59e0b` / `#f25a5a` | 只用于底纹、描边、圆点 |
| `--gv-ok-fg` | 状态色 55% + 文字色 | `#19743d`（5.82:1） | `#83dda5`（9.61:1） | 文字、徽章文字 |
| `--gv-warn-fg` | 状态色 55% + 文字色 | `#8e5f0f`（5.54:1） | `#f7c777`（10.01:1） | 同上 |
| `--gv-danger-fg` | 状态色 60% + 文字色 | `#941214`（8.91:1） | `#f59a9a`（7.46:1） | 同上 |
| `--gv-*-tint` | 状态色 12% | — | — | 徽章/提示底纹 |
| `--gv-*-border` | 状态色 32% | — | — | 徽章/ghost 按钮描边 |
| `--gv-accent-fg` | 强调色 75% + 文字色 | `#345db2`（6.26:1） | `#7fa3fd`（6.40:1） | 链接型文字、「已暂存」等 |

`--gv-text` / `--gv-text-muted` 直接用宿主 `label-primary` / `label-secondary`：亮色 `#0f1115`/`#61666b`（18.9:1 / 5.8:1），暗色 `#f9fafb`/`#cfd3d6`（15.03:1 / 10.42:1）。`--gv-text-subtle` 只用于图标，不承载文字。

### 2.4 文件与泳道色板

改造前文件图标有 18 个写死 hex（其中 `#22c55e`/`#10b981`、`#a855f7`/`#8b5cf6`、`#f97316`/`#f59e0b` 互为近似色），泳道另有 10 个 hex。现在两边共用 8 个色相令牌 + 1 个中性色：

```css
--gv-hue-blue: color-mix(in srgb, #3b82f6 78%, var(--gv-text));
/* cyan / green / amber / orange / red / purple / pink / slate 同理 */
```

`fileVisual()` 和 `PALETTE` 返回 `var(--gv-hue-*)`，主题里只定义一次。实测在面板底色上的对比度：亮色 4.17–6.28:1、暗色 5.72–10.59:1，全部高于非文本 UI 要求的 3:1。

### 2.5 图标、圆角与交互

图标不再各写各的颜色和容器：

| 令牌/类 | 值 | 用途 |
| --- | --- | --- |
| `--gv-icon` | 文字色 86% + 次级文字色 | 可操作图标（按钮、行尾「⋯」）；亮色 `#1a1d21`（16.9:1），暗色 `#f3f5f6`（14.4:1） |
| `--gv-icon-soft` | `--gv-text-muted` | 次级图标（下拉箭头、树形 chevron、分栏握把圆点）；亮色 5.8:1 |
| `.gv-head-icon` | 20×20、`--gv-r-xs`、渐变底 + 1px 描边 | 每个分栏标题左侧的图标泡（文件/更改/详情） |
| `.gv-icon-button` | 22/26px、`--gv-r-sm`、渐变底 + 阴影 | 所有图标按钮；hover 抬升 1px、accent 描边与光晕，active 缩到 0.96 |
| `.gv-split-grip` | 11×32 胶囊 + 3 个 3px 圆点 | 分栏握把；亮暗都可见（圆点 5.8:1），hover/drag 变 accent 并放大 1.06 |

圆角全面对齐 Ant Design 5.0 规范，统一为 `--gv-r-xs/sm/md/lg = 4/6/8/8px`（对应 antd 的 `borderRadiusSM: 4px`、`borderRadius: 6px`、`borderRadiusLG: 8px`）及胶囊圆角 `--gv-r-pill: 999px`；控件、行、卡片、菜单、弹窗都从这一组取值。

交互底色用渐变而不是纯色，并且**每个渐变都配一条 `background-color` 兜底**（`pnpm run audit` 只读 `background-color` 做合成对比度，渐变本身也不能成为唯一信息来源）：

```css
--gv-grad-control: linear-gradient(180deg, 文字色 2% + surface-1, surface-2);
--gv-grad-hover:   linear-gradient(180deg, accent 7% + surface-1, accent 3% + surface-2);
--gv-grad-selected:linear-gradient(90deg, accent 15% + 透明, accent 8% + 透明);
--gv-grad-solid:   linear-gradient(180deg, solid 90% + #fff, solid);
```

动效统一为 `--gv-dur-fast/.1s`、`--gv-dur/.16s`，缓动曲线对齐 Ant Design 5 标准 `cubic-bezier(.645, .045, .355, 1)`；阴影引入 Ant Design 分级微投影 `--gv-shadow-pop/modal/control/card/lift`。`prefers-reduced-motion` 下关闭位移动画。

### 2.6 Ant Design 5.0 规范映射

DSH 宿主环境仅向插件注入 `react` / `react-dom`，不提供 `@ant-design/antd` 运行时。本插件全面复用了 Ant Design 5.0 的设计规范（Design Tokens & Component Specs）：

| 组件规范 | 对应类名 | Ant Design 规范对齐实现 |
| --- | --- | --- |
| **Button** | `.gv-button` / `.gv-button-primary` / `.gv-button-danger` / `.gv-sync` | Default 态白底微描边，hover 时边框与文字转 Primary 蓝；Primary 态实底搭配 2px 阴影；Button.Group 相连边框与端部圆角 |
| **Form / Input** | `.gv-search-input` / `.gv-dialog-input` / `.gv-commit-input` | 6px 圆角（`borderRadius`），hover 边框加深，focus 2px 扩散光晕（`0 0 0 2px var(--gv-accent-tint-strong)`） |
| **Card** | `.gv-card` / `.gv-card-head` / `.gv-card-title` / `.gv-card-body` | 8px 圆角（`borderRadiusLG`）、浅描边与 `0 1px 2px` 微阴影；已在提交详情页重构为提交概览、元数据、文件三张卡片 |
| **Splitter** | `.gv-split` / `.gv-split-grip` | 对齐 Ant Design 5.17+ Splitter 规范：1px 分割线，居中 11×32px 胶囊手柄，hover 与激活态点亮 accent 蓝 |
| **Modal** | `.gv-dialog` / `.gv-modal` | 对齐 Ant Design Modal：46px 头部、8px 圆角、多层深度阴影（`--gv-shadow-modal`）、右下角标准确认/取消动作栏 |
| **Tag / Badge** | `.gv-ref` / `.gv-sum-chip` / `.gv-status` | 对齐 Ant Design Tag 预设（blue/green/gold/red），4px 圆角（`borderRadiusSM`），1px 语义描边配 12% 浅底色 |

## 3. 布局令牌

### 3.1 尺寸单一来源：`src/client/metrics.ts`

之前 CSS 写 `30px`、`graph.ts` 写 `ROW_HEIGHT = 30`、`app.tsx` 用魔法数 `446` 估算列宽，三处各改各的。现在：

| 常量 | 值 | 用途 |
| --- | --- | --- |
| `ROW_HEIGHT` | 30 | 提交表行 + 泳道单元（CSS 用插值引用） |
| `TREE_ROW_HEIGHT` | 26 | 文件树行 |
| `CHANGE_ROW_HEIGHT` | 38 | 更改行（文件名 + 目录两行） |
| `TABLE_HEAD_HEIGHT` / `PANE_HEAD_HEIGHT` / `SUB_HEAD_HEIGHT` / `STATUS_BAR_HEIGHT` | 26 / 34 / 30 / 24 | 表头、栏头、次级栏头、状态栏 |
| `CONTROL_SMALL` / `CONTROL_HEIGHT` / `CONTROL_LARGE` | 22 / 26 / 28 | 图标按钮、按钮与输入框、工具栏控件 |
| `COMPACT_WIDTH` | 960 | 紧凑布局断点（原 980，与最小栏宽不匹配） |
| `MIN_CENTER` / `MIN_TREE` / `MIN_CHANGES` | 300 / 140 / 300 | 拖拽下限 |
| `COLUMNS` / `COLUMN_GAP` / `ROW_PADDING_X` / `SPLIT_SIZE` | 96·82·64 / 10 / 12 / 6 | 提交表列宽与行内边距、分栏条 |
| `TABLE_CHROME_WIDTH` | 由上面推导 | 中间栏何时隐藏作者/日期/哈希列 |

`styles.ts` 通过模板插值使用这些数值（`height:${ROW_HEIGHT}px`），因此 CSS 与 React 不会再漂移。

### 3.2 节奏

- 行高：树 26 / 提交 30 / 更改 38（实测与令牌一致）。
- 栏头：34（文件树、详情、弹窗头 44）；次级 28（更改区标题、筛选条）；表头 26；状态栏 24。
- 控件：小 22、常规 26、工具栏 28；工具栏最小高 44，换行时按 6px 行距与 6px 上下内边距排布。
- 间距：结构性间距（工具栏、栏头、列表、弹窗、提交区）只用 2/4/6/8/12/16（4 的倍数）；只有小控件内部的视觉微调（例如 13px 图标与输入文字的 27px 左内边距）允许偏离，因为那些值要跟图标尺寸对齐。
- 圆角只用 4/6/8 与胶囊（计数徽章，Ant Design 5.0 标准）。
- 字号只用 10/11/12/13/15（`--gv-fs-xs…xl`），面板基准 12px、行高 1.45；等宽字体统一走 `--gv-mono`。
- 动效统一 `--gv-dur`（120ms）+ `--gv-ease`，仅对颜色/背景/位移做过渡；`prefers-reduced-motion` 下全部压到 1ms（Spinner 放慢到 2.4s），`forced-colors` 下映射到系统色。

### 3.3 同时修掉的布局缺陷

| 问题 | 处理 |
| --- | --- |
| 双击分隔条复位左栏到 220px，而默认值是 280px | 复位改用 `DEFAULT_LEFT` / `DEFAULT_RIGHT`，与首次安装一致 |
| 提交表列宽写在 `CommitPane.tsx`、`narrowCenter` 又用魔法数 446 估算 | 列宽进 `metrics.COLUMNS`，阈值用 `TABLE_CHROME_WIDTH` 推导 |
| 左右栏最大宽度用 `- 12` 代表两条分隔条 | 改为 `SPLIT_SIZE * 2` |
| 紧凑布局下左列最小高度（树 140 + 更改 300 + 分隔条）超过可用高度，提交框被裁掉 | 更改区改为可收缩（`flex:0 1 auto;min-height:0`），下限由拖拽逻辑保证；并在容器高度 < 220px 时隐藏分类汇总条 |
| 主题强调色被当成填充色，亮色下所有高亮变成灰黑 | 强调色/填充色分离，见 2.1 |
| 悬停、选中、焦点三套状态在亮色下不可见 | 分别用 `--gv-hover` / `--gv-accent-tint`(12%) / 2px 强调色外环 |
| 变更行未勾选时与已勾选无差别 | 未勾选行文件名降为 `--gv-text-muted`、状态字母 55% 不透明 |
| 滚动 `.gv-cnum` 用 `background:inherit`，在删除行上叠了两层 12% 底纹，行号区域偏红且文字掉到 3.94:1 | 行号列改用 `--gv-bg` 不透明底 |

## 4. 如何复核

```powershell
pnpm run audit # 真实 Chrome 计算样式审计：文字/图标对比度 / 溢出 / 几何 / 令牌 / 规则解析
pnpm preview   # 亮暗两套整页截图 → build/preview/*.png
```

`pnpm run audit` 用假 React 把 `scripts/preview-entry.tsx` 里的夹具（工具栏、三栏、紧凑布局、各种状态、菜单、三个弹窗）序列化成静态页，套上**宿主真实的 `--dsw-*` 令牌**（取自 `dsh-client-ui-theme`），再在 headless Chrome 里：

1. 逐元素取 `color` 与**合成后**的祖先背景（含半透明叠加），按 WCAG 2.1 计算对比度，长篇/大字号用 3:1；
2. 对 63 个图标（图标按钮、栏头图标泡、chevron、行尾「⋯」、分栏握把圆点）按非文本 3:1 检查 `color` / 圆点色与合成背景；
3. 检查每个 `.gv-*` 元素是否被裁切或越界（徽章、长路径、窄容器）；
4. 输出布局地标的实测高宽与圆角；
5. 把每个 `--gv-*` 令牌解析成实际颜色，并给出它与面板底色的对比（Δ）；
6. 校验样式表里出现的每个 `.gv-*` 类都能被解析（有语法错误会整段失效）。

改造后：亮色文字 35 处对比度不达标 → **0**，暗色菜单文字 1.76:1 → **0 处不达标**，两种主题均为 **0 图标对比度问题、0 溢出、0 被丢弃规则**。

> 截图需要本机 Chrome 或 Edge；脚本会自动探测常见安装路径。

## 5. 约束

- 新增颜色**必须**先加令牌，再在规则里引用；规则里不允许出现 hex 或直接引用 `--dsw-*` 别名。
- 新增尺寸若属于"节奏"层级（行/头/控件/间距/圆角/字号），加进 `metrics.ts` 或复用现有令牌。
- 新的门户（例如再弹一层浮层）要把类名加入令牌声明的那组选择器，否则浮层内拿不到令牌。
- 令牌从 `--dsw-alias-label-primary` 推导层级，前提是宿主同时提供 `label-primary` 与 `bg-base`；缺少时使用内置亮色兜底。
