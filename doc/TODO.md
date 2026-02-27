# Workbench 头部与容器能力统一改造 TODO

## 0. 目标与范围
- 目标：将 `@repo/workbench-core` 的 `WorkbenchSurface` 升级为“通用工作台容器”，提供统一风格头部与通用基础逻辑（含可选 autosave），并对齐 `ToolIdeWorkbench.vue` 的头部视觉与交互风格。
- 参考风格：`prismaspace-frontend/packages/workbench-tool/src/components/ToolIdeWorkbench.vue` 顶部导航区域。
- 明确不做：不再在统一头部展示用户不关心的 `uuid`、冗余资源类型描述等信息。

## 1. 统一头部（Workbench Header）改造要求

### 1.1 布局结构（强制）
- 左区：返回按钮 + 资源名称/状态等核心信息（风格对齐 Tool IDE 头部）。
- 中区：默认留空，提供可直接替换的 slot。
- 右区：操作按钮区，仅放动作按钮。

### 1.2 插槽能力（强制）
- 头部必须提供 `left` / `center` / `right` 三个独立 slot。
- 三个区域均可被业务场景完全替换，不要求保留默认内容。

### 1.3 基础动作按钮（强制）
- 内置三个基础动作：`run` / `save` / `publish`。
- 三个基础动作都必须可配置：
  - 是否显示（显隐独立配置）
  - 按钮文案（例如 `run` 可改为“查询”）
  - 禁用态/加载态文案
  - 点击回调事件（仅发出事件，不内置业务实现）

### 1.4 扩展动作按钮（强制）
- 支持“除三个基础按钮之外”的扩展按钮集合（由业务传入）。
- 扩展按钮支持文案、icon、禁用态、回调标识。

### 1.5 More 折叠规则（强制）
- `More` 折叠按钮出现条件：
  1. 小屏宽度下右区无法容纳全部按钮；或
  2. 存在扩展按钮（按规则需要进入折叠菜单）。
- `More` 折叠按钮不出现条件：
  - 右区仅有可完全容纳的基础按钮，且无需要折叠的扩展按钮。
- 折叠菜单内容：
  - 被折叠的基础按钮（如果发生溢出）
  - 所有应折叠的扩展按钮

### 1.6 响应式与可读性（强制）
- 小屏下保证头部不破版，按钮行为可达。
- 对 `truncate` 的文本提供 hover tip（tooltip）提示完整内容。
- 左中右布局在常见断点（手机/平板/桌面）保持一致阅读顺序与视觉层次。

## 2. WorkbenchSurface 通用容器能力升级

### 2.1 角色定位（强制）
- `WorkbenchSurface` 定位为统一容器：
  - 提供统一头部（视觉 + 基础交互规范）
  - 提供通用基础逻辑（autosave 等）
  - 业务资源包只负责资源特有表单/校验/保存实现

### 2.2 Autosave 抽象（强制）
- 将 `ToolIdeWorkbench.vue` 当前 autosave 逻辑上移/抽象为 `WorkbenchSurface` 通用能力。
- `WorkbenchSurface` 只负责“何时触发保存回调”，不负责具体保存业务。
- autosave 必须由业务场景显式启用/关闭（默认关闭或明确配置值，不允许隐式开启）。
- 必备配置项：
  - `enabled`
  - `debounceMs`
  - `canAutosave`（外部条件判定）
  - `isDirty`（脏状态来源）
- 必备回调：
  - `onSave(trigger)`，其中 `trigger` 至少区分 `manual` / `autosave`

### 2.3 事件职责边界（强制）
- 容器只发事件，不做资源保存细节。
- 资源工作台负责：
  - 构造保存 payload
  - 调用 API
  - 处理错误/成功状态
  - 回传 `saving`/`isDirty` 等状态给容器

## 3. 现有资源工作台子包改造范围
- 必须调整并验证以下子包对 `WorkbenchSurface` 的使用方式（至少）：
  - `packages/workbench-tool`
  - `packages/workbench-knowledge`
  - `packages/workbench-tenantdb`
  - `packages/workbench-agent`
  - `packages/workbench-workflow`
  - `packages/workbench-uiapp`
- 目标：统一头部风格与交互模型，按各资源实际需求配置基础按钮显隐和文案。

## 4. 兼容性与迁移要求
- 禁止一次性硬切导致全部资源工作台同步阻塞。
- 建议两阶段迁移：
  1. 新增 `WorkbenchSurface` 新 API（保留短期兼容层）。
  2. 各资源子包逐个切换后移除兼容层。
- 迁移期间必须避免行为回退：
  - 手动保存可用
  - 发布可用
  - 需要 run 的资源可用，不需要 run 的资源可隐藏

## 5. 验收标准（DoD）
- 视觉：
  - 头部整体风格与 `ToolIdeWorkbench.vue` 顶部导航一致（不是卡片式）。
  - 左中右结构明确，中区默认空且可扩展。
- 功能：
  - 三个基础按钮可独立配置显隐与文案。
  - 扩展按钮支持并可进入 `More`。
  - `More` 仅在需要时出现。
  - 小屏下无拥挤溢出导致的功能不可用。
- 架构：
  - autosave 为 `WorkbenchSurface` 通用能力，可按场景启停。
  - `WorkbenchSurface` 不包含资源保存业务实现。
  - 所有资源子包已完成接入并通过类型检查。

## 6. 文档与示例同步
- 更新 `@repo/workbench-core` 对外 API 文档（props / slots / emits / autosave 配置）。
- 为 `WorkbenchSurface` 增加至少一个“只保存不试运行”的示例和一个“run 文案改为查询”的示例。
- 在前端文档中补充“资源工作台统一头部与容器职责边界”章节，避免后续回退到卡片式头部。
