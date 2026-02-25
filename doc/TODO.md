# TODO｜Tool 资源前端交互（生产级实施清单）

更新时间：2026-02-25  
当前阶段：方案冻结（待实现）

---

## 0. 背景与硬约束（必须遵守）

- 本轮目标是将 `tool` 从“可执行脚手架”升级为“可编辑 + 可运行 + 可治理”的生产级工作台。
- 前端以后端真实能力为 SSOT，不以 mock 作为主路径。
- 所有请求必须绑定 Workspace 上下文（`X-Workspace-UUID` + URL `workspaceUuid` + store 对齐）。
- 资源归属 `Workspace`，不归属 `Project`；Tool 编辑与执行不得引入 Project 作为运行前置条件。
- 资源编辑默认针对 `WORKSPACE` 实例，发布态与编辑态严格分离。
- 本轮 UI 参考图仅用于布局与信息架构对齐，字段与校验以后端契约为准。

---

## 1. 本轮交付目标

1. Tool 创建弹窗（对齐参考图，接入真实创建接口）。
2. Tool IDE 工作台（沉浸式编辑页，替换当前 textarea 执行脚手架）。
3. 以子包承载 Tool IDE 能力，保持与 app 壳解耦。
4. 输入/输出参数编辑器复用 `packages/editor/src/components/param-schema-editor`。
5. Tool 编辑、保存、执行、错误反馈形成完整闭环。

---

## 2. 本轮非目标（明确不做）

- 不实现多人协作与实时冲突解决。
- 不实现复杂发布审批流与版本回滚 UI。
- 不新增后端领域模型；仅在契约缺失时补齐最小前端 client/类型。
- 不扩展为全资源统一 IDE，本轮仅聚焦 `tool`。

---

## 3. 信息架构与交互范围

## 3.1 创建工具弹窗（Create Tool Modal）

- 入口：资源库页“新建资源”中选择 `tool`。
- 字段：
  - `工具名称`（必填，长度与字符规则以后端为准）
  - `工具描述`（必填，长度与字符规则以后端为准）
- 行为：
  - 提交成功后创建 `Resource + WORKSPACE Instance`，并自动跳转 Tool IDE。
  - 表单校验为“前端即时校验 + 后端返回兜底校验”。
  - 错误语义统一走网关（400/401/403/409/422/5xx）。

## 3.2 Tool IDE 页面（Edit Tool）

- 顶栏区：返回、资源名、保存、试运行。
- 基本信息区：工具名称、工具描述。
- 更多信息区：工具路径、请求方法。
- 输入参数区：参数表视图 + schema 编辑入口。
- 输出参数区：输出 schema 编辑与预览。
- 运行区：执行入参与结果面板（替换现有纯 JSON 文本框模式）。

---

## 4. 包结构与职责拆分（冻结）

## 4.1 新增子包

- 新增 `packages/workbench-tool-ide`（建议包名：`@repo/workbench-tool-ide`）。

## 4.2 职责边界

- `@repo/workbench-tool-ide`：
  - Tool IDE 的领域组件、状态编排、表单校验、编辑态管理。
  - 复用参数编辑器并封装 Tool 语义适配层。
- `@repo/workbench-tool`：
  - 保留轻量桥接职责（向后兼容现有引用），逐步委托给 `@repo/workbench-tool-ide`。
- `apps/studio-web`：
  - 路由、页面壳、Workspace 上下文、权限与错误网关接入。

## 4.3 目录建议

- `packages/workbench-tool-ide/src/components/*`
- `packages/workbench-tool-ide/src/composables/*`
- `packages/workbench-tool-ide/src/adapters/*`
- `packages/workbench-tool-ide/src/types/*`
- `packages/workbench-tool-ide/src/index.ts`

---

## 5. 参数编辑器复用方案（强约束）

复用组件：`packages/editor/src/components/param-schema-editor`

- 输入参数：复用 `ParamSchemaRegularEditor` 作为默认编辑器。
- 输出参数：复用 `ParamSchemaProfessionalEditor` 或 `Regular`（根据空间密度选择，默认 Professional）。
- 状态管理：复用 `useParamSchemaEditor`，由 Tool IDE 统一接收变更并合并到实例 payload。
- 适配策略：在 `workbench-tool-ide/adapters` 提供 Tool schema 与编辑器 schema 的双向转换。
- 约束：参数编辑器不得直接耦合具体 API client；只接收标准化 schema 与回调。

---

## 6. 数据契约与 API 对齐清单

## 6.1 现有可复用接口

- 资源读取：`GET /api/v1/resources/{resource_uuid}`
- 实例读取：`GET /api/v1/instances/{instance_uuid}`
- 实例更新：`PUT /api/v1/instances/{instance_uuid}`
- 统一执行：`POST /api/v1/execute/instances/{instance_uuid}`

## 6.2 本轮需新增/补齐前端契约

- 在 `contracts.ts` 增加 `ToolInstanceRead/ToolInstanceUpdateRequest`（禁止长期使用 `AnyInstanceRead` 裸类型）。
- 若后端存在 Tool 专属接口（如方法/路径/参数结构独立接口），新增 `tool-client.ts`；若无则在 `resource-client` 保持实例更新路径。
- 为运行结果定义稳定前端类型（成功、业务失败、系统失败）。

## 6.3 Query Key 与缓存要求

- 所有 Tool 相关 query key 必带 `workspaceUuid` 与 `resourceUuid`/`instanceUuid`。
- 保存后精准失效：`resourceDetail`、`resourceInstances`、`workspaceResources`。
- 禁止跨 workspace 复用缓存数据。

---

## 7. 里程碑与任务拆解（可执行）

## M0：契约冻结与脚手架

- [ ] 冻结 Tool 实例字段契约（名称、描述、method、path、input_schema、output_schema）。
- [ ] 新建 `@repo/workbench-tool-ide` 子包与导出。
- [ ] 在 `apps/studio-web` 将 Tool 面板切换到新子包入口。

验收：
- [ ] `pnpm check:aliases` 通过。
- [ ] Tool 工作台可正常渲染新包占位组件。

## M1：创建工具弹窗生产化

- [ ] 实现“创建工具”弹窗 UI 与校验规则。
- [ ] 接入创建接口并处理成功跳转。
- [ ] 补齐错误态、禁用态、提交态与可访问性。

验收：
- [ ] 从资源库创建 Tool 成功并进入对应 IDE。
- [ ] 校验与后端错误提示一致。

## M2：Tool IDE 基础编辑闭环

- [ ] 完成基本信息区与更多信息区（name/description/path/method）。
- [ ] 接入实例读取与保存（PUT instance）。
- [ ] 提供未保存变更提示与离开拦截。

验收：
- [ ] 刷新后可恢复服务端最新配置。
- [ ] 保存后列表与详情数据一致。

## M3：输入/输出参数编辑器接入

- [ ] 接入 `param-schema-editor` 输入参数编辑。
- [ ] 接入输出参数编辑与预览。
- [ ] 完成 schema 双向适配与校验错误映射。

验收：
- [ ] 参数增删改可持久化。
- [ ] 非法 schema 阻止保存并提供可定位提示。

## M4：运行面板与执行闭环

- [ ] 设计执行入参区（表单/JSON 双模式至少保留一种生产可用路径）。
- [ ] 接入 `/execute/instances/{instance_uuid}`。
- [ ] 展示执行结果、错误信息与耗时。

验收：
- [ ] 能从当前工作区实例直接试运行。
- [ ] 402/403/5xx 错误反馈符合全局规范。

## M5：质量收口

- [ ] i18n（zh-CN/en-US）补齐。
- [ ] 埋点：创建工具、保存工具、执行工具。
- [ ] 文档与 Demo 更新（含 Tool IDE 使用说明）。

验收：
- [ ] `pnpm build` 通过。
- [ ] 关键路径手测通过（见第 8 节）。

---

## 8. 测试与验收用例（最小集）

- [ ] 资源库可创建 Tool，失败提示可读且可恢复。
- [ ] Tool 基本字段编辑并保存成功，刷新后数据一致。
- [ ] 输入参数与输出参数可编辑、可校验、可持久化。
- [ ] Tool 试运行成功返回结果，失败返回错误语义。
- [ ] Workspace 切换后不串数据。
- [ ] 直接访问 Tool IDE URL 可恢复上下文。

---

## 9. 风险与对策

- 风险：Tool 实例契约不稳定导致前端反复改动。  
  对策：先冻结最小字段集并通过 adapter 层隔离。

- 风险：参数编辑器 schema 与后端 schema 不完全一致。  
  对策：在 `workbench-tool-ide/adapters` 维护单一转换入口并补单测。

- 风险：继续依赖 `AnyInstanceRead` 造成类型漂移。  
  对策：M0 即引入 Tool 专属类型并逐步替换。

- 风险：执行结果结构不稳定影响展示。  
  对策：结果面板按“标准字段 + 原始 JSON”双轨展示。

---

## 10. 完成定义（DoD）

- [ ] Tool 创建弹窗达到生产可用质量。
- [ ] Tool IDE 完成编辑、保存、执行闭环。
- [ ] 输入/输出参数编辑器成功复用且可维护。
- [ ] 子包职责清晰，app 壳与 IDE 领域逻辑解耦。
- [ ] 工程检查通过：`pnpm check:aliases`、`pnpm build`。
- [ ] 文档已同步，可直接进入开发排期。
