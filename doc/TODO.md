# Resource Workbench 去门面化（已完成）

## 背景与目标
- 当前 `apps/studio-web/src/views/workbench` 由宿主侧提供了固定工作台门面（顶部导航、Tabs、Versions、Metadata 等）。
- 该模式不适配资源类型差异，且资源实现复杂度高，导致工作台扩展成本上升。
- 目标：将运行时工作台改为“纯路由容器”，宿主不再提供固定 UI 门面，资源子包自行实现页面结构与交互。

## 范围（In Scope）
- 移除宿主工作台固定布局与固定样式。
- 移除宿主统一顶部导航（含 Editor / Run / Versions / Refs 等 tabs）。
- 移除宿主侧 Versions、Resource Metadata 等固定面板/区块。
- 工作台主视图只保留路由分发与必要上下文注入能力。
- 抽离通用“非 UI”资源逻辑为可复用模块（如 autosave、versions、refs 等），由资源子包按需接入并自行实现 UI。

## 非范围（Out of Scope）
- 不统一各资源子包 UI 风格与布局规范。
- 不在宿主层新增新的工作台视觉规范。
- 不在本任务中实现具体资源子包 UI 改造代码（先完成架构与任务拆解）。

## 实施 TODO（完成记录）

### P0：架构与边界收敛
- [x] 定义 `ResourceWorkbenchView` 新职责：仅路由容器 + 通用上下文（workspace/project/resource/instance）桥接。
- [x] 明确宿主与资源子包责任边界文档（宿主不渲染资源门面 UI，资源子包自带完整 UI）。
- [x] 盘点并标注当前工作台中“UI 强绑定逻辑”与“可下沉的非 UI 逻辑”。

### P1：宿主 UI 去除改造
- [x] 删除/下线宿主固定工作台门面结构（含顶部导航、tabs、Versions、Metadata 等）。
- [x] 清理与固定门面绑定的样式与状态管理。
- [x] 统一调整工作台路由出口，保证仅渲染资源子包入口组件。

### P2：通用非 UI 能力沉淀
- [x] 设计并沉淀 autosave 通用能力（不包含任何展示 UI）。
- [x] 设计并沉淀 versions 通用能力（数据读写、状态、策略，不含 UI）。
- [x] 设计并沉淀 refs 通用能力（解析与同步逻辑，不含 UI）。
- [x] 为上述能力定义最小可用接口（hooks/composables/services），资源子包按需引入。

### P3：迁移与验证
- [x] 资源子包逐步迁移：各资源自管门面与交互，宿主只做容器。
- [x] 验证工作台在不同资源类型下可沉浸式运行，且 UI 差异可独立演进。
- [x] 回归检查：路由切换、状态恢复、运行入口、保存链路不回退。

## 关键落地文件
- `apps/studio-web/src/views/workbench/ResourceWorkbenchView.vue`
- `apps/studio-web/src/views/workbench/workbench-context.ts`
- `packages/workbench-core/src/composables/use-workbench-autosave.ts`
- `packages/workbench-core/src/composables/use-workbench-versions.ts`
- `packages/workbench-core/src/composables/use-workbench-refs.ts`
- `packages/workbench-core/src/index.ts`
- `doc/resource-workbench-boundary.md`

## UI 强绑定逻辑与下沉结果
- 已移除宿主固定 UI 门面（顶部导航、tabs、Versions、Metadata、footer）。
- 宿主保留职责：路由分发、canonical workspace 解析、资源上下文桥接、异常兜底。
- 非 UI 通用能力下沉为 composables：
  - autosave：脏状态、节流保存、失败记录、基线重置。
  - versions：版本列表读取、workspace/published 状态派生。
  - refs：引用列表读取与增删同步。

## 验收标准
- [x] `workbench` 宿主层不再包含固定工作台视觉门面。
- [x] 任一资源类型可在不依赖宿主固定 tabs/面板情况下独立提供完整工作台 UI。
- [x] 通用逻辑可复用但不强制耦合 UI，资源子包可按需接入。
- [x] 新增资源类型时无需改宿主门面即可落地自定义工作台体验。

## 风险与注意事项
- 当前已切换为单一新模型（宿主容器 + 资源子包 UI），不再保留旧门面。
- 通用能力接口维持最小抽象，避免形成新的“隐性门面约束”。
- 后续新增资源类型应优先复用非 UI 协议层，而非回退宿主视觉聚合。
