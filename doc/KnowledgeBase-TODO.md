# TODO｜KnowledgeBase IDE（专业文件管理工具风格）

更新时间：2026-02-26  
当前阶段：设计与开发准备

---

## 0. 背景与目标

- 目标是把 KnowledgeBase 工作台从“简易文档增删”升级为“可管理文档生命周期 + 可观察处理进度 + 可调试检索效果”的专业 IDE。
- 整体视觉采用 shadcn 极简风格，体验对标成熟文件管理工具：高可读、高密度、低装饰。
- 能力范围必须严格对齐后端契约，不做前端虚构字段和虚构流程。

---

## 1. 后端事实来源（必须对齐）

### 1.1 Knowledge 专属 API

- `POST /api/v1/knowledge/{instance_uuid}/documents`：新增文档（异步处理，`202`）
- `PUT /api/v1/knowledge/{instance_uuid}/documents/{document_uuid}`：更新文档（改名或替换源）
- `PUT /api/v1/knowledge/{instance_uuid}/chunks`：批量更新 chunk 文本（写时复制 + 重新嵌入）
- `GET /api/v1/knowledge/{instance_uuid}/documents`：分页列表
- `DELETE /api/v1/knowledge/{instance_uuid}/documents/{document_uuid}`：移除文档
- `GET /api/v1/knowledge/tasks/{task_id}/progress`：SSE 订阅处理进度（事件：`progress`/`ping`/`error`）

文件：`src/app/api/v1/knowledge.py`

### 1.2 通用实例 API（Knowledge 实例配置）

- `GET /api/v1/instances/{instance_uuid}`：获取实例详情（含 `config`、`document_count`）
- `PUT /api/v1/instances/{instance_uuid}`：更新实例（Knowledge 支持 `name`、`description`、`config`）

文件：`src/app/api/v1/resource.py`、`src/app/schemas/resource/knowledge/knowledge_schemas.py`

### 1.3 通用执行 API（检索调试）

- `POST /api/v1/execute/instances/{instance_uuid}`：执行 Knowledge 检索
- 请求契约：`KnowledgeBaseExecutionRequest`
- 响应契约：`KnowledgeBaseExecutionResponse`

文件：`src/app/api/v1/execution.py`、`src/app/schemas/resource/execution_schemas.py`

### 1.4 关键 Schema（前端必须镜像）

- 文档状态：`pending | uploading | processing | completed | failed`
- 文档模型：`DocumentRead`
- 分页模型：`PaginatedDocumentsResponse`
- 进度模型：`DocumentTaskProgress`
- 检索配置：`RAGConfig`
  - `max_recall_num`（1-20）
  - `min_match_score`（0-1）
  - `search_strategy`（`keyword | semantic | hybrid`）
  - `query_rewrite`（bool）
  - `result_rerank`（bool）
- 实例配置：`KnowledgeBaseInstanceConfig`
  - `parser_policy`
  - `chunker_policies`

---

## 2. 当前前端现状（差距）

- `knowledge-client.ts` 仅实现：`listDocuments`、`addDocument`、`removeDocument`。
- 工作台 `KnowledgeWorkbenchPanel.vue` 仍是临时 UI（输入 URL + 简单列表）。
- 尚未实现：
  - 文档更新（重命名/替换）
  - SSE 进度订阅与实时状态
  - 检索调试（execute）
  - 实例配置编辑（parser/chunker policy）
  - 专业文件管理式表格、筛选、列管理、批量动作

文件：
- `prismaspace-frontend/apps/studio-web/src/services/api/knowledge-client.ts`
- `prismaspace-frontend/apps/studio-web/src/views/workbench/panels/KnowledgeWorkbenchPanel.vue`

---

## 3. IDE 信息架构（专业文件管理工具）

### 3.1 布局（推荐三段）

1. 左侧：`Explorer`
- 文档集合概览（总数、处理中、失败数）
- 快速筛选（状态/类型）
- 新增文档入口（URL 导入）

2. 中间：`Document Table Workspace`
- 以 DataTable 为核心（排序、筛选、分页、列显隐、行选择）
- 主列表字段：`file_name`、`status`、`chunk_count`、`file_type`、`file_size`、`created_at`
- 行级操作：重命名、替换来源、移除、查看详情

3. 右侧：`Inspector / Debug`
- 当前文档详情（元信息、错误、进度）
- 检索调试面板（query + RAG config + 结果列表）

### 3.2 UI 风格约束

- 以 shadcn 组件为主，不引入重皮肤第三方文件管理框架。
- 参考实现强制对齐：`prismaspace-frontend/apps/studio-web/src/components/platform/DataTable.vue`
- 密度优先：列表行高紧凑，强调扫描效率与操作确定性。
- 高风险动作（删除、替换）必须二次确认。

---

## 4. 能力范围（MVP 必做）

### 4.1 文档管理（Document Lifecycle）

- URL 导入文档（`source_uri` + 可选 `file_name`）
- 文档重命名（`PUT /documents/{document_uuid}`，仅 `file_name`）
- 文档替换（`PUT /documents/{document_uuid}`，更新 `source_uri`，触发重新处理）
- 文档移除（`DELETE /documents/{document_uuid}`）

### 4.2 处理进度可观测（SSE）

- 新增/替换文档后，进入任务跟踪状态。
- 使用标准 SSE 封装：
  - `packages/common/src/tools/sse.ts`
  - `apps/studio-web/src/services/http/sse.ts`（`connectApiSseStream`）
- 订阅 `GET /api/v1/knowledge/tasks/{task_id}/progress`，实时更新状态/进度。

### 4.3 检索调试（Execution）

- 通过 `POST /api/v1/execute/instances/{instance_uuid}` 执行 query。
- 支持编辑并提交 `RAGConfig` 全字段。
- 渲染检索结果 chunk：`uuid`、`content`、`score`、`context`。

### 4.4 实例配置（Parser/Chunker）

- 读取并编辑 `KnowledgeBaseInstanceConfig`：
  - `parser_policy.parser_name`
  - `parser_policy.allowed_mime_types`
  - `parser_policy.params`
  - `chunker_policies[]`
- 通过 `PUT /api/v1/instances/{instance_uuid}` 持久化。

---

## 5. 契约映射与前端类型补齐

### 5.1 `contracts.ts` 需要新增

- `DocumentUpdateRequest`
- `BatchChunkUpdateRequest`
- `DocumentTaskProgressRead`
- `RAGConfigRead`
- `KnowledgeBaseExecutionRequest`
- `KnowledgeBaseExecutionResponse`
- `KnowledgeBaseInstanceConfigRead`（含 parser/chunker policy）

### 5.2 `knowledge-client.ts` 需要补齐

- `updateDocument(instanceUuid, documentUuid, payload)`
- `updateChunks(instanceUuid, payload)`
- `subscribeTaskProgress(taskId, handlers)`（基于 `connectApiSseStream`）
- `execute(instanceUuid, payload)`（或在 `execution-client` 上加 typed wrapper）

### 5.3 `query-keys.ts` 规划

- `knowledgeDocuments(instanceUuid, page, limit, statusFilter, keyword)`
- `knowledgeTaskProgress(taskId)`
- `knowledgeSearchResult(instanceUuid, querySignature)`
- `knowledgeInstance(instanceUuid)`

---

## 6. 文件规划（建议）

### 6.1 `packages/workbench-knowledge` 新增

- `src/KnowledgeBaseIdeWorkbench.vue`
- `src/sections/KnowledgeExplorer.vue`
- `src/sections/KnowledgeDocumentTable.vue`
- `src/sections/KnowledgeInspector.vue`
- `src/sections/KnowledgeSearchDebugger.vue`
- `src/components/KnowledgeDocumentActionsMenu.vue`
- `src/components/KnowledgeTaskStatusBadge.vue`
- `src/index.ts` 更新导出

### 6.2 `apps/studio-web` 改造

- `src/views/workbench/panels/KnowledgeWorkbenchPanel.vue`（接入新 IDE）
- `src/services/api/contracts.ts`（补类型）
- `src/services/api/knowledge-client.ts`（补接口）
- `src/services/api/query-keys.ts`（补 key）

---

## 7. 分阶段任务（可执行）

### M0：契约与 API 客户端对齐
- [ ] 补齐 Knowledge 相关 types（文档更新、进度、检索、配置）
- [ ] 补齐 `knowledge-client` 全接口
- [ ] 抽一个 typed execute wrapper（Knowledge 专用）

### M1：DataTable 工作区
- [ ] 搭建文件管理式列表（字段、排序、筛选、分页、列显隐）
- [ ] 接入行级菜单（重命名、替换、删除）
- [ ] 文档状态 Badge 与空态/错误态

### M2：SSE 进度链路
- [ ] 文档任务创建后自动订阅进度
- [ ] `progress/ping/error` 事件处理与回收
- [ ] 页面切换/卸载时正确关闭连接

### M3：检索调试面板
- [ ] query 输入 + RAGConfig 表单
- [ ] execute 请求与结果渲染
- [ ] 失败反馈与可重试机制

### M4：实例配置面板
- [ ] parser/chunker policy 编辑器
- [ ] 实例 patch 更新并回读
- [ ] 配置变更提示与冲突提示

### M5：质量收口
- [ ] 错误语义区分（400/403/404/422）
- [ ] 交互回归与边界场景手测
- [ ] `pnpm build` 与关键页面可用性验收

---

## 8. 风险与边界（必须明确）

- 当前后端未提供“chunk 列表查询接口”，仅有 `PUT /chunks` 批量更新。
- 因缺少可读取的 chunk UUID+内容来源，本期默认不做“可视化 chunk 编辑器”。
- 若要落地 chunk 编辑器，需后端补充“按文档查询 chunks”端点后再进入开发。
- 本期不包含本地文件上传直传后端；文档入口以 `source_uri` 为准。

---

## 9. 验收标准（DoD）

- [ ] Knowledge 工作台具备完整文档生命周期管理（导入、重命名、替换、移除）。
- [ ] 文档处理状态可通过 SSE 实时观察，状态一致可追踪。
- [ ] 检索调试可执行并展示结构化结果（含 score）。
- [ ] 实例配置（parser/chunker）可读写并持久化。
- [ ] UI 风格符合“专业文件管理工具 + shadcn 极简”目标。

---

## 10. 非目标（本轮不做）

- 不做 OCR/解析策略可视化编排器（仅表单配置）。
- 不做文档内容预览渲染器（PDF/Word viewer）。
- 不做 chunk 可视化编辑器（待后端补查询接口）。
- 不做多实例聚合检索编排 UI（先单实例调试）。

