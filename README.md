# PrismaSpace Frontend Guide

面向前端与后端正式对接阶段的协作指南。

一句话定位：前端是 PrismaSpace 的产品壳与交互引擎，但默认以后端真实能力为唯一事实来源（SSOT），前端实现必须与后端能力一一对齐。

**版本：** 1.1  
**适用对象：** 前端架构师、前端开发工程师、UI/UX 设计师

---

## 0. 前端开发前必读（强制）

开始任何页面或组件开发前，必须先阅读并对齐以下文档：
- `README.md`（仓库根目录）：统一架构白皮书与领域模型
- `prismaspace-frontend/README.md`（本文件）：前端对齐后端执行手册
- `prismaspace-frontend/doc/prisma-space-ui.md`：UI 美学规范（全局项目视野）
- `prismaspace-frontend/doc/prisma-space-pages-ui.md`：UI 美学规范（细节与模块）
- `prismaspace-frontend/doc/prisma-space-runtime.md`：资源运行时面板前端架构指导
- `prismaspace-frontend/doc/resource-workbench-boundary.md`：Resource Workbench 宿主与资源子包职责边界
- `prismaspace-frontend/doc/asset-library-boundary.md`：素材库与资源工作台职责边界
- `prismaspace-frontend/doc/ui-development-guidelines.md`：UI 组件选型与兜底路径
- `prismaspace-frontend/doc/Vue通用架构与开发规范指南.md`：Vue 工程结构与编码规范

执行要求：
- 未完成阅读，不进入代码实现阶段。
- PR 描述中必须注明“已对齐前后端契约”。

---

## 1. 对接总原则（Backend First）

前端必须遵守以下硬规则：
- 所有业务能力默认走真实后端接口，不以本地 mock 作为主路径。
- 前端请求、缓存、路由状态必须绑定 `workspace` 上下文，不可做“无上下文请求”。
- 前端必要能力但后端缺失时，在安全、无副作用前提下允许补全后端逻辑。
- 仅在后端缺失且属于敏感域、不可安全补全时，前端才允许 mock。
- 典型可 mock 场景：支付扣款、退款、风控审核、外部清结算等未明确且高风险流程。

---

## 2. 后端架构速览（供前端理解）

后端当前形态（FastAPI 单体 + 领域服务分层）：

```txt
src/app/
├── api/          # 路由层（/api/v1）
├── services/     # 业务编排层（权限、资源、计费、执行）
├── dao/          # 数据访问层
├── schemas/      # Pydantic 契约
├── engine/       # 执行引擎（agent/tool/workflow/embedding）
├── worker/       # 异步任务（ARQ + Redis）
├── db/           # DB session 与基础设施
└── system/       # 系统级能力（resource type、vectordb、node defs）
```

关键后端入口：
- HTTP 总路由：`src/app/api/router.py`（前缀 `/api/v1`）
- 应用启动与异常映射：`src/app/main.py`
- 认证依赖：`src/app/api/dependencies/authentication.py`
- 上下文依赖：`src/app/api/dependencies/context.py`

---

## 3. 前端必须对齐的后端协议

### 3.1 统一路由与鉴权

- HTTP 前缀固定为 `/api/v1/*`。
- 鉴权优先 `Authorization: Bearer <token>`。
- WebSocket 使用 `?token=<jwt>`（不是 Header）。
- 前端当前会自动注入 `X-Workspace-UUID`，后续所有需空间上下文接口必须兼容该语义。

### 3.2 统一响应封装

- 成功响应：`JsonResponse<T> => { data, msg, status }`
- 简单成功：`MsgResponse => { msg }`
- 前端类型定义以 `prismaspace-frontend/apps/studio-web/src/services/api/contracts.ts` 为落地点，并以后端 schema 为准持续对齐。

### 3.3 统一错误语义

- `400`：业务约束失败
- `401`：未认证/令牌失效
- `402`：额度或余额不足（业务错误，不是系统错误）
- `403`：权限不足
- `404`：资源不存在
- `409`：冲突（如注册重复）
- `422`：参数校验失败
- `500+`：服务异常

### 3.4 流式与实时协议

- SSE：`POST /api/v1/agent/{uuid}/sse`、`POST /api/v1/workflow/{uuid}/sse`、`GET /api/v1/knowledge/tasks/{task_id}/progress`
  - 协议核心：`prismaspace-frontend/packages/common/src/tools/sse.ts`（`connectSseStream`）。
  - App 适配层：`prismaspace-frontend/apps/studio-web/src/services/http/sse.ts`（`connectApiSseStream`，负责 baseUrl + token + workspace header）。
- WebSocket：`GET /api/v1/agent/chat?token=...`、`GET /api/v1/workflow/ws?token=...`
- WS 包协议：`{ action, data, request_id }`，服务端回包 `{ event, data, request_id }`。

---

## 4. 统一领域模型（前端必须遵守）

- `User`：身份主体
- `Team`：协作与团队计费主体
- `Workspace`：创作容器与消费归属边界
- `Project`：产品开发环境
- `Resource`：逻辑资源身份
- `ResourceInstance`：版本快照（`WORKSPACE`/`PUBLISHED` 等）

前端约束：
- 一切资源编辑默认作用于 `WORKSPACE` 实例。
- 发布与编辑必须分离，禁止在发布态写入编辑数据。
- 路由参数、缓存键、引用关系统一使用 UUID，禁止依赖自增 ID。

### 4.1 资源工作台实现规范（强制）

- 资源具体实现是非普适性的，不应由宿主工作台提供固定门面 UI。
- `apps/studio-web/src/views/workbench` 应作为纯路由容器使用，不承载固定顶部导航、固定 tabs、固定 Versions/Metadata 面板等统一布局。
- 每一种资源应基于自身特性独立设计与实现工作台 UI，确保体验与资源语义一致。
- 宿主层可以沉淀可复用的通用非 UI 能力（如 autosave、versions、refs 等），由资源子包按需接入并自行完成 UI 呈现。
- 在开始资源工作台 UI 设计前，必须先回答“该资源如何为用户带来更好的沉浸式与友好体验”，再进入视觉与交互实现。

---

## 5. 后端能力矩阵（前端对齐清单）

说明：下表“后端路由前缀”均隐含完整前缀 `/api/v1`。

| 领域 | 后端路由前缀 | 后端入口文件 | 前端现状 | 对齐动作 |
| :--- | :--- | :--- | :--- | :--- |
| 身份认证 | `/identity` | `src/app/api/v1/identity.py` | 已接入 | 维持 |
| 团队 | `/teams` | `src/app/api/v1/team.py` | 已接入 | 维持 |
| 工作空间 | `/workspaces` | `src/app/api/v1/workspace.py` | 已接入 | 维持 |
| 项目 | `/workspaces/{workspace_uuid}/projects`, `/projects` | `src/app/api/v1/project.py` | 已接入 | 维持 |
| 通用资源/实例 | `/workspaces/{workspace_uuid}/resources`, `/resources`, `/instances` | `src/app/api/v1/resource.py` | 已接入 | 维持 |
| 商品与额度 | `/products/public`, `/entitlements/*` | `src/app/api/v1/product.py`, `src/app/api/v1/entitlement.py` | 已接入 | 维持 |
| 资产中心 | `/assets` | `src/app/api/v1/asset.py` | 已接入 | `asset-client.ts` + `@repo/asset-hub`（统一上传/选库/管理面板） |
| 凭证管理 | `/workspaces/{workspace_uuid}/credentials/service-modules`, `/credentials/supported-providers` | `src/app/api/v1/credential.py` | 待接入 | 新增 `credential-client.ts` |
| 资源类型 | `/resource-types` | `src/app/api/v1/resource_type.py` | 待接入 | 新增 `resource-type-client.ts` |
| TenantDB | `/tenantdb/{instance_uuid}/tables` | `src/app/api/v1/tenantdb.py` | 待接入 | 新增 `tenantdb-client.ts` |
| KnowledgeBase | `/knowledge/*` | `src/app/api/v1/knowledge.py` | 待接入 | 新增 `knowledge-client.ts`（含 SSE） |
| UiApp 页面 DSL | `/uiapps/{app_uuid}/pages` | `src/app/api/v1/uiapp.py` | 待接入 | 新增 `uiapp-client.ts` |
| Agent 执行 | `/agent/{uuid}/execute|sse`, `/agent/chat(ws)` | `src/app/api/v1/agent/agent_api.py` | 待接入 | 新增 `agent-client.ts` + WS 适配 |
| Workflow 执行 | `/workflow/nodes`, `/workflow/{uuid}/execute|sse|validate`, `/workflow/ws` | `src/app/api/v1/workflow/workflow_api.py` | 待接入 | 新增 `workflow-client.ts` + WS 适配 |
| 统一执行入口 | `/execute/instances/{instance_uuid}` | `src/app/api/v1/execution.py` | 待接入 | 新增 `execution-client.ts` |
| Chat 会话 | `/chat/sessions*` | `src/app/api/v1/chat.py` | 待接入 | 新增 `chat-client.ts` |
| 角色权限 | `/permissions`, `/teams/{team_uuid}/roles` | `src/app/api/v1/permission.py`, `src/app/api/v1/role.py` | 待接入 | 新增 `permission-client.ts`, `role-client.ts` |
| 服务模块目录 | `/service-module-types`, `/service-module-providers`, `/service-modules` | `src/app/api/v1/module_type.py`, `src/app/api/v1/module_provider.py`, `src/app/api/v1/module.py` | 待接入 | 新增 `service-module-client.ts` |
| 支付/账务交易写接口 | 当前未在主路由开放 | `src/app/api/v1/billing.py`（当前为空） | 无真实接口 | 仅允许受控 mock |

---

## 6. 前端可补全后端逻辑的边界（允许）

仅当满足全部条件时，允许前端为对接推进补全后端：
- 前端上线阻塞且后端当前确实缺失接口/能力。
- 可在本仓内安全实现，且不引入外部不可逆副作用。
- 不涉及资金流、权限提升、安全凭证、风控策略。
- 变更可被自动化测试覆盖，并可回滚。

允许补全示例：
- 缺失的只读查询接口。
- 纯元数据 CRUD（不触发外部支付/清结算）。
- 前端必须字段但后端 schema 未补齐的安全默认值处理。

补全交付要求：
- 路由归属到 `src/app/api/v1/*` 并统一 `JsonResponse/MsgResponse`。
- 权限与上下文依赖使用 `AuthContextDep` 或 `PublicContextDep`。
- 对应测试放入 `tests/api/v1/*`。
- 同步更新前端 `contracts.ts` 与 client。

---

## 7. Mock 准入规则（最后手段）

只有同时满足以下条件，前端才能 mock：
- 后端缺失能力短期无法补全。
- 该能力属于敏感域或高副作用域，无法安全补全。
- mock 仅用于前端交互演示，不得冒充真实业务闭环。

强制约束：
- mock 响应结构必须与后端契约一致。
- mock 必须受环境开关控制，生产环境默认关闭。
- mock 代码必须标注“触发条件、负责人、下线时间”。
- 一旦后端接口可用，mock 需在同一迭代移除。

支付示例（明确允许 mock）：
- 若充值、扣款、退款、发票等流程未在后端开放正式接口，前端可 mock 结算结果与失败态展示。
- 但不得在前端伪造“真实支付成功凭证”并写入业务主状态。

---

## 8. 当前前端架构（保持不变）

```txt
prismaspace-frontend/
├── apps/studio-web/         # 应用壳：路由、布局、Provider、Playground
├── packages/asset-hub/      # 素材库子包：统一上传能力 + 素材管理面板
├── packages/common/         # 通用能力（i18n、tools）
├── packages/editor/         # 编辑器能力
├── packages/generator/      # 动态表单生成
├── packages/ui-reka/        # primitives 导出层
├── packages/ui-shadcn/      # 设计系统层
├── packages/ui-ai-elements/ # AI 高阶组件层
├── infra/                   # 工程基础设施
└── doc/                     # 规范与协作文档
```

依赖方向必须保持单向：

`@repo/ui-ai-elements` -> `@repo/ui-shadcn` -> `@repo/ui-reka`

---

## 9. 开发与验证

环境建议：
- Node.js LTS
- pnpm

常用命令：

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm check:aliases
```

Playground：
- 路由：`/components`、`/components/:slug`
- 注册：`apps/studio-web/src/data/component-demos.ts`
- 要求：每个可复用能力都应提供可运行 Demo

---

## 10. 文档索引

- `README.md`：统一架构白皮书（后端与领域模型）
- `prismaspace-frontend/README.md`：前端对齐后端执行手册（本文件）
- `prismaspace-frontend/doc/asset-library-boundary.md`：素材库职责边界
- `prismaspace-frontend/doc/Vue通用架构与开发规范指南.md`：工程实现规范
- `prismaspace-frontend/doc/ui-development-guidelines.md`：UI 与组件开发规范

---

## 一句话总结

前端以真实后端能力为主路径，对齐全部后端域模型与接口；只在“缺失且敏感不可安全补全”时，才允许受控 mock。
