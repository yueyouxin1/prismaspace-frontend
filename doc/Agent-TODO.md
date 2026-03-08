# TODO｜Agent 编排工作台生产化重构（V2）

更新时间：2026-03-02  
当前优先级：P0（最高）  
目标状态：从“骨架可演示”升级为“主流生产可用”，并清零所有无意义占位骨架。

---

## 0. 本文档约束级别

本文档是 `AgentWorkbenchPanel` 改造的执行主清单，优先级高于旧版 TODO。  
所有条目默认“必须完成”，除非明确标注“可延期”。

---

## 1. 核心目标（不可降级）

- [ ] 将 `apps/studio-web/src/views/workbench/panels/AgentWorkbenchPanel.vue` 全面升级为生产级 Agent 编排工作台。
- [ ] 彻底移除所有临时占位、示意骨架、不可交互伪组件。
- [ ] 最大化覆盖目标效果图中的功能模块与视觉结构（编排区 + 预览调试区 + 会话管理）。
- [ ] 单独建设“会话管理面板”（独立模块，不与消息流区域混写）。
- [ ] 会话交互与调试视图全量接入 SSE（`/api/v1/agent/{uuid}/sse`），不再以阻塞式 `execute` 作为主链路。
- [ ] 遇到后端缺失能力时，在安全、无副作用前提下主动补全后端逻辑并同步测试。

---

## 2. 强制规范（红线）

### 2.1 组件与实现规范

- [ ] 组件库优先：优先使用 `@repo/ui-shadcn` 与 `@repo/ui-ai-elements`。
- [ ] 只要组件库可覆盖，严禁回退到原生手写 UI（原生标签仅限容器与语义包装）。
- [ ] Agent 聊天交互严格对齐 `reference_example/ai-elements-vue-main/apps/www/content/2.examples/chatbot.md` 的模式（Conversation / Message / PromptInput / Reasoning / Sources / Loader 组合思路）。

### 2.2 设计与交互规范

- [ ] UI 必须遵循 `prismaspace-frontend/doc/ui/agent-ui.md`。
- [ ] 细节必须遵循 `prismaspace-frontend/doc/ui/agent-ui-细节.md`。
- [ ] 三栏布局 + 响应式降级（Desktop 三栏、Tablet 双栏、Mobile 单栏）。
- [ ] 每个可交互项必须覆盖 `default / hover / focus-visible / disabled` 状态。

### 2.3 架构与接口规范

- [ ] 以后端真实接口为唯一事实来源，禁止 mock 作为主路径。
- [ ] 所有请求必须携带 workspace 上下文（`X-Workspace-UUID`）。
- [ ] 实例更新使用“局部 patch 语义”，禁止空字段覆盖后端未编辑配置。
- [ ] UUID 作为路由、缓存、会话、引用的唯一主键语义。

---

## 3. 当前基线与缺口（2026-03-02 盘点）

### 3.1 已有基础

- [x] 三栏基础容器、Prompt/编排/会话区已存在于 `packages/workbench-agent`。
- [x] `chatApi` 的会话创建/列表/消息列表能力已接入。
- [x] `service-module-client` 与模型目录查询能力已接入。
- [x] SSE 基础工具链已存在：`packages/common/src/tools/sse.ts`、`apps/studio-web/src/services/http/sse.ts`。

### 3.2 关键缺口

- [x] 当前主链路仍以阻塞式 `agentApi.execute` 为主，未落实“会话交互 + 调试视图 SSE 全覆盖”。
- [x] 尚无独立会话管理面板（仅顶部按钮 + 横向会话按钮列表，不满足独立模块要求）。
- [x] 中栏“编排设置”仅覆盖模型设置，未完整覆盖效果图中的技能/知识/记忆/对话体验模块。
- [x] 右栏调试缺少流式事件可视化（思考、工具调用、耗时、trace）。
- [ ] 仍存在“未实现”占位项（如 RAG/记忆标签）未形成可用功能闭环。

---

## 4. 最终信息架构（目标形态）

### 4.1 左栏：人设与回复逻辑

- [ ] `system_prompt` 编辑（复用 `CodeMirrorMdEditor`）。
- [ ] 变量插入能力（与表达式面板联动）。
- [ ] 草稿态、保存态、脏数据态可见且可恢复。

### 4.2 中栏：编排（Accordion 分组）

- [ ] 模型设置：模型、协议类型、生成多样性、模型参数、IO 参数、默认指令。
- [ ] 技能：插件、工作流挂载与配置入口。
- [ ] 知识：文本/表格/照片挂载与“按需调用”策略。
- [ ] 记忆：变量、数据库、长期记忆、文件盒子配置。
- [ ] 对话体验：开场白、预置问题、显示策略。

### 4.3 右栏：预览与调试

- [ ] 独立“会话管理面板”（会话列表、搜索/筛选、新建、切换、删除、清上下文）。
- [ ] 会话消息流区（Conversation + Message + Reasoning + Sources）。
- [ ] 调试轨迹区（SSE 事件时间线：think/chunk/tool_input/tool_output/finish/error）。
- [ ] 输入区（PromptInput 复合组件，支持提交状态与流式中断）。

---

## 5. 分阶段执行清单

## M0｜契约冻结与数据模型校准

- [ ] 对齐 `src/app/schemas/resource/agent/agent_schemas.py` 与前端 `contracts.ts`。
- [ ] 明确本期 AgentConfig 必做字段：`diversity_mode`、`model_params`、`io_config`、`deep_memory`、`rag_config`。
- [ ] 梳理“可编辑字段白名单”，确保 patch 仅提交变更项。
- [ ] 输出前后端字段映射表（key path、默认值、边界、校验规则）。

## M1｜三栏壳与布局生产化

- [x] 完成可拖拽分栏（桌面）与断点降级（平板/移动端）。
- [ ] 各栏独立滚动，滚动与拖拽互不冲突。
- [ ] 删除所有占位骨架，空状态必须是“可执行引导”而非空壳。

## M2｜左栏 Prompt 编辑器闭环

- [ ] `system_prompt` 可加载、编辑、保存、回写。
- [ ] 与变量面板联动（插入变量、语法高亮、最小校验）。
- [ ] 保存成功后刷新实例详情并更新“最近保存时间”。
- [ ] 保存失败展示内联错误 + `emitBusinessError`。

## M3｜中栏编排全模块落地

- [x] 模型设置模块完善为生产形态（含 preset + custom 参数门控）。
- [x] 技能模块：插件/工作流列表、启停、配置入口与状态反馈。
- [x] 知识模块：文本/表格/照片挂载、调用策略与提示文案。
- [x] 记忆模块：变量、数据库、长期记忆、文件盒子开关/参数。
- [x] 对话体验模块：开场白富文本、预置问题列表与展示开关。

## M4｜独立会话管理面板（新增强制模块）

- [x] 抽离 `AgentSessionManagerPanel`（独立组件，不与 ChatPanel 混杂）。
- [x] 支持会话新建、切换、删除、清理上下文。
- [x] 支持会话标题展示、更新时间、消息数、当前激活态。
- [x] 保证大数量会话下的性能（分页或虚拟化策略至少其一）。

## M5｜SSE 全量接入（会话 + 调试）

- [x] 新增 `agentApi.streamExecute`（基于 `connectApiSseStream`）。
- [x] 发送消息默认走 SSE，不再以阻塞 execute 为主路径。
- [x] 实现事件到 UI 的映射：
- [x] `start`：创建 assistant 进行中态消息。
- [x] `think`：写入/增量更新 reasoning 面板。
- [x] `chunk`：逐字增量刷新回复内容。
- [x] `tool_input` / `tool_output`：写入调试时间线。
- [x] `finish`：结束流并固化最终消息状态。
- [x] `error` / `cancel`：中止流、保留上下文、提示可重试。
- [x] 支持主动停止生成（AbortController / connection.close）。

## M6｜后端兜底补全（按需触发）

- [x] 若 SSE 事件字段不足，补全后端事件 payload 并保持向后兼容。
- [x] 若会话管理缺少必要接口（如重命名/批量管理），在 `src/app/api/v1/chat.py` 安全增补。
- [x] 若 Agent 配置缺少前端所需字段默认值，补全 schema 与 service 层默认处理。
- [ ] 每项后端补全必须附带测试（`tests/api/v1/*`）与回滚说明。

## M7｜验收与收口

- [x] `pnpm check:aliases` 通过。
- [x] `pnpm build` 通过。
- [ ] Agent 相关单测/集成测试通过（前后端各自最小闭环）。
- [ ] 更新 `packages/workbench-agent/README.md` 与本 TODO 状态。

---

## 6. SSE 交互标准（必须执行）

- [ ] SSE 请求入口：`POST /api/v1/agent/{instance_uuid}/sse`。
- [ ] 必带上下文：`Authorization`、`X-Workspace-UUID`。
- [ ] 事件顺序容错：允许 `think/chunk/tool_*` 交错到达，前端必须幂等合并。
- [ ] 断流恢复策略：保留已接收内容，提示“重连继续/重新生成”。
- [ ] 调试区必须显示最少信息：事件类型、时间戳、耗时、trace_id（若有）。

---

## 7. 组件落点（目标文件）

### 7.1 `packages/workbench-agent`

- [ ] `src/AgentIdeWorkbench.vue`：三栏容器、响应式、拖拽分栏。
- [ ] `src/sections/AgentPromptEditor.vue`：Prompt 编辑区。
- [ ] `src/sections/AgentOrchestrationPanel.vue`：编排总面板。
- [ ] `src/sections/ModelSettingsAccordion.vue`：模型设置。
- [ ] `src/sections/AgentSkillPanel.vue`：插件/工作流（新增）。
- [ ] `src/sections/AgentKnowledgePanel.vue`：知识（新增）。
- [ ] `src/sections/AgentMemoryPanel.vue`：记忆（新增）。
- [ ] `src/sections/AgentConversationExperiencePanel.vue`：对话体验（新增）。
- [ ] `src/sections/AgentChatPanel.vue`：消息流 + 输入。
- [ ] `src/sections/AgentSessionManagerPanel.vue`：独立会话管理（新增，强制）。
- [ ] `src/sections/AgentDebugTimelinePanel.vue`：SSE 调试轨迹（新增）。
- [ ] `src/components/ModelSelectorPanel.vue`：可复用模型选择器。

### 7.2 `apps/studio-web`

- [ ] `src/views/workbench/panels/AgentWorkbenchPanel.vue`：替换为 SSE 驱动主链路。
- [ ] `src/services/api/agent-client.ts`：新增流式执行接口与事件解析。
- [ ] `src/services/api/chat-client.ts`：补齐会话管理必要 API。
- [ ] `src/services/api/contracts.ts`：补齐新增字段类型定义。
- [ ] `src/services/api/query-keys.ts`：补齐会话与调试查询键。

---

## 8. 验收标准（DoD）

- [ ] 视觉上不再出现“占位骨架感”，所有模块可真实操作并有结果反馈。
- [ ] 三栏布局 + 响应式行为与 `agent-ui` 两份规范一致。
- [ ] 中栏完整覆盖：模型、技能、知识、记忆、对话体验。
- [ ] 存在独立会话管理面板，且会话 CRUD 可用。
- [ ] 发送消息后右栏内容通过 SSE 实时增量刷新，调试视图同步更新事件轨迹。
- [ ] 任一失败路径（接口错误、校验失败、断流）都有明确可恢复提示。
- [ ] 未引入 mock 主路径；若有临时 mock，必须有开关与下线计划。

---

## 9. 参考基准（强制对齐）

- `prismaspace-frontend/README.md`
- `prismaspace-frontend/doc/ui/agent-ui.md`
- `prismaspace-frontend/doc/ui/agent-ui-细节.md`
- `reference_example/ai-elements-vue-main/apps/www/content/2.examples/chatbot.md`
- `src/app/schemas/resource/agent/agent_schemas.py`

---

## 10. 非目标（本期不做）

- [ ] 不引入与 Agent 工作台无关的新设计体系。
- [ ] 不将敏感高风险链路（支付、风控、清结算）纳入后端补全范围。
- [ ] 不在缺失真实接口时用长期 mock 替代正式对接。
