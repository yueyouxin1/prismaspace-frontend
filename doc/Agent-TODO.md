# TODO｜Agent IDE 工作台（三栏布局）执行版

更新时间：2026-02-26  
当前阶段：开发排期已冻结（待实现）

---

## 0. 背景与硬约束（必须遵守）

- 工作台采用三栏布局：左侧提示词编辑，中间编排配置（Accordion），右侧会话交互/调试。
- 左侧提示词编辑必须复用现有 `CodeMirrorMdEditor`，不新造编辑器。
- 中间编排视图至少实现“模型设置（AgentConfig）”，模型选择必须可复用到其他场景。
- 右侧会话交互/调试必须使用 `@repo/ui-ai-elements` 组件族，不直接手写聊天 UI。
- 前端以真实后端契约为准，不使用 mock 作为主路径。
- 所有请求必须携带 workspace 上下文（依赖 `X-Workspace-UUID` 自动注入链路）。

---

## 1. 当前代码基线（已核对）

### 1.1 已有能力
- [x] `workbench-agent` 已有基础壳：`packages/workbench-agent/src/AgentWorkbenchScaffold.vue`。
- [x] App 层已接入 Agent 面板路由：`apps/studio-web/src/views/workbench/panels/AgentWorkbenchPanel.vue`。
- [x] `agentApi.execute`、`chatApi.*` 已实现。
- [x] SSE 公共能力已存在：`packages/common/src/tools/sse.ts` + `apps/studio-web/src/services/http/sse.ts`。
- [x] `CodeMirrorMdEditor` 已完成并有 Demo。
- [x] `@repo/ui-ai-elements` 已提供 `Conversation` / `Message` / `PromptInput` / `ModelSelector` 组件族。

### 1.2 缺口（本 TODO 负责补齐）
- [ ] 仍是“Quick Run + Recent Sessions”临时 UI，未实现三栏 IDE。
- [ ] 尚未接入 `system_prompt` 编辑与保存。
- [ ] 尚未实现 `AgentConfig` 的模型设置 Accordion。
- [ ] 尚未抽离通用 `ModelSelectorPanel`。
- [ ] 前端缺少服务模块目录 client（`/service-module-types`、`/service-module-providers`、`/service-modules/me/available`）。
- [ ] 会话区尚未使用 AI Elements 组合渲染完整消息流与 session 切换。

---

## 2. MVP 目标交付（冻结）

1. 三栏布局落地，左/中/右区域独立滚动。
2. 左侧提示词编辑器可读写 `system_prompt` 并保存到 Workspace Instance。
3. 中间 Accordion 完成模型设置，覆盖本次约定的 `AgentConfig` 字段。
4. 右侧会话调试可新建/切换 session，发送消息并渲染结果。
5. Model Selector 以通用组件形式交付，可复用到 Agent 以外场景。

---

## 3. 契约与字段映射（必须严格对齐）

后端权威定义：`src/app/schemas/resource/agent/agent_schemas.py`。

### 3.1 本次必须支持字段
- `system_prompt`
- `llm_module_version_uuid`
- `agent_config.diversity_mode`：`precise | balanced | creative | custom`
- `agent_config.model_params`：
  - `temperature`
  - `top_p`
  - `presence_penalty`
  - `frequency_penalty`
- `agent_config.io_config`：
  - `history_turns`
  - `max_response_tokens`
  - `enable_deep_thinking`
  - `max_thinking_tokens`（仅开关开启时可编辑）
  - `response_format.type`（本期仅 `text` / `json_object`）

### 3.2 更新策略（强制）
- `PUT /api/v1/instances/{instance_uuid}` 采用局部 patch 语义，只提交变更字段。
- 前端不得提交“未展示字段的空值”覆盖后端配置。
- `diversity_mode != custom` 时，`model_params` 必须只读显示（或按模式值受控重置后禁编）。

---

## 4. 目录与文件落点（执行清单）

### 4.1 `packages/workbench-agent` 新增
- `src/AgentIdeWorkbench.vue`（三栏容器）
- `src/sections/AgentPromptEditor.vue`
- `src/sections/AgentOrchestrationPanel.vue`
- `src/sections/ModelSettingsAccordion.vue`
- `src/sections/AgentChatPanel.vue`
- `src/components/ModelSelectorPanel.vue`（通用）
- `src/index.ts` 更新导出

### 4.2 `apps/studio-web` 改造
- `src/views/workbench/panels/AgentWorkbenchPanel.vue`：替换临时 UI，接入 `AgentIdeWorkbench`。
- `src/services/api/contracts.ts`：补充服务模块与模型选择相关类型。
- `src/services/api/service-module-client.ts`：新增服务模块目录 client。
- `src/services/api/index.ts`：补充 `service-module-client` 导出。

---

## 5. 任务拆解与状态

### M0：三栏框架
- [ ] 新建 `AgentIdeWorkbench`，实现三栏 + 独立滚动 + 响应式（桌面三栏，窄屏纵向）。
- [ ] 通过 `useResourceWorkbenchContext` 透传 `workspaceInstanceUuid` 与刷新能力。

### M1：左侧提示词编辑（Prompt）
- [ ] 复用 `CodeMirrorMdEditor` 接入 `system_prompt`。
- [ ] 接入表达式弹窗组件（参考 `CodeMirrorMdEditorVariablePanel.vue`）。
- [ ] 保存策略落地（本期采用“显式保存按钮”，不启用自动保存）。
- [ ] 保存后调用 `refresh()` 刷新实例详情。

### M2：中间模型设置（Accordion）
- [ ] 新建 `ModelSettingsAccordion`，使用 shadcn Accordion 结构。
- [ ] 落地 `llm_module_version_uuid` + `diversity_mode` + `model_params` + `io_config`。
- [ ] `enable_deep_thinking` 控制 `max_thinking_tokens` 可见/可编辑态。

### M3：Model Selector 复用
- [ ] 基于 `@repo/ui-ai-elements` `ModelSelector*` 组件族封装 `ModelSelectorPanel`。
- [ ] 新增 `service-module-client.ts`，对接：
  - `GET /api/v1/service-module-types`
  - `GET /api/v1/service-module-providers`
  - `GET /api/v1/service-modules/me/available?workspace_uuid={workspaceUuid}&type=llm`
- [ ] 仅输出通用值：`model_uuid` + `display_name`。

### M4：右侧会话调试（Chat）
- [ ] 使用 `Conversation` + `Message` + `PromptInput` 组合替换临时 UI。
- [ ] 接入 `chatApi.createSession/listSessions/listMessages`。
- [ ] 发送消息通过 `agentApi.execute`（携带 `session_uuid`），并刷新消息列表。
- [ ] 错误态统一走 `emitBusinessError`，同时提供面板内联状态提示。

### M5：验收与收尾
- [ ] `pnpm check:aliases` 通过。
- [ ] `pnpm build` 通过。
- [ ] 更新 `packages/workbench-agent/README.md`（组件定位与导出说明）。

---

## 6. 验收标准（DoD）

- [ ] 三栏布局可用，不依赖宿主固定头部/固定 tabs。
- [ ] `system_prompt`、`llm_module_version_uuid`、`agent_config` 可读写并持久化。
- [ ] `ModelSelectorPanel` 可被 Agent 场景外复用。
- [ ] 会话调试支持新建/切换 session、消息发送与结果渲染。
- [ ] 接口失败、校验失败、空输入均有明确反馈。
- [ ] 未引入 mock 主路径。

---

## 7. 参考实现（必须对齐）

### 7.1 CodeMirror Markdown 编辑器
- `apps/studio-web/src/components/demo-playground/expression-md-editor/codemirror-expression-md-editor/CodeMirrorMdEditorDemo.vue`
- `apps/studio-web/src/components/demo-playground/expression-md-editor/codemirror-expression-md-editor/CodeMirrorMdEditorVariablePanel.vue`
- `apps/studio-web/src/components/demo-playground/expression-md-editor/codemirror-expression-md-editor/CodeMirrorLibraryBlockView.vue`

### 7.2 AI Elements Vue
- `reference_example/ai-elements-vue-main/apps/www/content/3.components/1.chatbot/model-selector.md`
- `reference_example/ai-elements-vue-main/apps/www/content/3.components/1.chatbot/conversation.md`
- `reference_example/ai-elements-vue-main/apps/www/content/3.components/1.chatbot/message.md`
- `reference_example/ai-elements-vue-main/apps/www/content/3.components/1.chatbot/prompt-input.md`
- `reference_example/ai-elements-vue-main/apps/www/content/2.examples/chatbot.md`

### 7.3 shadcn-vue Accordion
- `reference_example/shadcn-vue-dev/deprecated/www/src/content/docs/components/accordion.md`

---

## 8. 注意事项

- `response_format` 本期仅实现 `text` / `json_object`，JSON Schema 延后。
- 会话发送优先走阻塞 `execute`；若切到流式，必须走 `connectApiSseStream` 标准链路。
- 所有缓存键保持 UUID 语义，不引入自增 ID 依赖。
