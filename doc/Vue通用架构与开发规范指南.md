# Vue 架构与开发规范指南（当前仓库定制版）

> 适用仓库：`prismaspace-frontend`  
> 目标：以当前代码为准，统一分层、依赖边界与交付标准。

---

## 0. 文档职责

本文件是“具体怎么做”的开发规范文档。

它回答：

- 目录怎么分层
- 依赖怎么约束
- 包怎么创建
- Demo 怎么交付
- 开发改动如何验收

以下内容不在本文件承担：

- 项目全局定位与包域总览
  - 看 `prismaspace-frontend/README.md`
- PrismaSpace 包域总览
  - 看 `prismaspace-frontend/packages/prismaspace/README.md`
- UI 组件选型、兜底顺序、参考实现与自定义 UI 约束
  - 看 `prismaspace-frontend/doc/ui-development-guidelines.md`
- UI 全局美学、tokens 与页面细节
  - 看 `prismaspace-frontend/doc/prisma-space-ui.md`
  - 看 `prismaspace-frontend/doc/prisma-space-pages-ui.md`
- 运行时 / 工作台 / 素材库专项边界
  - 看 `prismaspace-frontend/doc/prisma-space-runtime.md`
  - 看 `prismaspace-frontend/doc/resource-workbench-boundary.md`
  - 看 `prismaspace-frontend/doc/asset-library-boundary.md`

---

## 1. 当前架构总览

本仓库采用 Monorepo（`pnpm-workspace.yaml`）：

```txt
prismaspace-frontend/
├── apps/
│   └── studio-web/                 # 当前唯一应用壳
├── packages/
│   ├── prismaspace/
│   │   ├── contracts/
│   │   ├── sdk/
│   │   ├── resources-core/
│   │   ├── resources/
│   │   │   ├── agent/
│   │   │   ├── tool/
│   │   │   ├── knowledge/
│   │   │   ├── tenantdb/
│   │   │   ├── uiapp/
│   │   │   └── workflow/
│   │   ├── asset-hub/
│   │   ├── common/
│   │   ├── editor/
│   │   ├── generator/
│   │   ├── ui-reka/
│   │   ├── ui-shadcn/
│   │   └── ui-ai-elements/
│   ├── arch/                       # 预留
│   ├── foundation/                 # 预留
│   └── domain/                     # 预留
├── config/
├── infra/
├── scripts/
└── doc/
```

依赖方向（必须保持）：

`ui-ai-elements` -> `ui-shadcn` -> `ui-reka`

---

## 2. 应用壳（`apps/studio-web`）职责

应用壳只做装配，不承载可复用业务核心逻辑。

1. 启动流程固定在 `apps/studio-web/src/core/bootstrap/index.ts`：
   - 读取运行时配置：`runtime-config.ts`
   - 初始化日志：`logger.ts`
   - 注册 providers：`pinia`、`router`、`i18n`、`vue-query`、`@prismaspace/common/plugin`
   - 执行 preflight：`preflight.ts`
   - 挂载应用
2. 路由聚合在 `apps/studio-web/src/router/routes/index.ts`。
3. 布局切换在 `apps/studio-web/src/App.vue`，通过 `route.meta.layout` 映射到 `AppLayout` / `WorkspaceLayout` / `BlankLayout`。

---

## 3. 包层（`packages/*`）职责

### 3.1 PrismaSpace 公开包域

1. `@prismaspace/contracts`
2. `@prismaspace/sdk`
3. `@prismaspace/resources-core`
4. `@prismaspace/agent`、`@prismaspace/tool`、`@prismaspace/knowledge`、`@prismaspace/tenantdb`、`@prismaspace/uiapp`、`@prismaspace/workflow`
5. `@prismaspace/asset-hub`
6. `@prismaspace/common`
7. `@prismaspace/editor`
8. `@prismaspace/generator`
9. `@prismaspace/ui-reka`
10. `@prismaspace/ui-shadcn`
11. `@prismaspace/ui-ai-elements`

### 3.2 预留目录

`arch`、`foundation`、`domain` 当前仍为预留目录，不属于公开包域。

---

## 4. 导入与边界规范

### 4.1 别名规范（以现有配置为准）

可用别名：

- `@app/*` -> `apps/studio-web/src/*`
- `@prismaspace/contracts/*`
- `@prismaspace/sdk/*`
- `@prismaspace/common/*`
- `@prismaspace/editor/*`
- `@prismaspace/generator/*`
- `@prismaspace/ui-reka/*`
- `@prismaspace/ui-shadcn/*`
- `@prismaspace/ui-ai-elements/*`
- `@prismaspace/resources-core/*`
- `@prismaspace/agent/*`
- `@prismaspace/tool/*`
- `@prismaspace/knowledge/*`
- `@prismaspace/tenantdb/*`
- `@prismaspace/uiapp/*`
- `@prismaspace/workflow/*`

禁止别名（由 `scripts/validate-import-aliases.mjs` 校验）：

- `@/`
- `@utils/`
- `@lib/`

### 4.2 依赖边界

1. 应用层只能通过 `@prismaspace/*` 消费公开包能力，不允许跨目录深层相对路径导入包源码。
2. 包对外能力必须从 `src/index.ts`（或子路径 exports）暴露，不允许应用层依赖“未导出内部文件”。
3. 仅在必要时新增 alias；新增后必须同步更新 `vite.config.ts`、`tsconfig.json`、`tsconfig.app.json`。

---

## 5. Demo 交付规范（强制）

### 5.1 总原则

**新增子包或新增可复用组件时，必须同时提供 Demo。未提供 Demo 视为未完成交付。**

### 5.2 新增组件时必须完成

1. 在 `apps/studio-web/src/components/demo-playground/` 新增 `XxxDemo.vue`。
2. 在 `apps/studio-web/src/data/component-demos.ts` 注册：
   - `slug`
   - `title`
   - `description`
   - `tags`
   - `component`
3. 确认可从 `/components` 进入，并在 `/components/:slug` 可运行交互。
4. Demo 中必须包含“可验证检查点”（例如开关、输入、状态回显）。

### 5.3 新增子包时必须完成

1. 至少提供一个“包核心能力 Demo”（UI 或非 UI 都可以通过页面交互展示）。
2. Demo 统一接入上述 playground 机制，不新增平行演示入口。
3. 在子包 `README.md` 写明：
   - 包定位
   - 对外导出
   - 对应 Demo `slug`

### 5.4 Demo 目录聚合规范（强制）

1. 若多个 Demo 组件存在相互依赖（如共享容器、共享子面板、联动交互），必须放在同一 Demo 目录下维护。
2. 推荐目录形态：`apps/studio-web/src/components/demo-playground/<demo-name>/`，由 `index` 或主 `XxxDemo.vue` 统一导出/装配。
3. 禁止将同一 Demo 的依赖组件分散在多个无关目录，避免后续改动时出现遗漏或行为不一致。

---

## 6. 组件与 Composable 放置约定

1. 仅 `studio-web` 使用的逻辑放 `apps/studio-web/src/composables` / `src/hooks` / `src/stores`。
2. 跨应用复用逻辑上移到 `packages/prismaspace/*` 对应包域。
3. 组件应优先保持“展示与编排分离”，复杂业务流程不要直接堆在路由页面。

---

## 7. 新增子包标准流程

1. 创建目录：`packages/prismaspace/<pkg-name>/src`，资源类能力放在 `packages/prismaspace/resources/<pkg-name>/src`。
2. 新增 `package.json`（至少包含 `name`、`type`、`exports`）。
3. 新增 `src/index.ts` 作为统一导出入口。
4. 如需在应用层直接导入：
   - 更新 `vite.config.ts` alias
   - 更新 `tsconfig.json` paths
   - 更新 `tsconfig.app.json` paths + include
5. 新增包 README。
6. 按第 5 节补齐 Demo 并注册到 `component-demos.ts`。

---

## 8. 变更检查清单（PR 最小要求）

1. 是否符合分层职责（应用壳装配、包层沉淀）？
2. 是否遵守 alias 规范（可运行 `pnpm check:aliases`）？
3. 若新增子包/组件，是否已补齐 Demo 并可从 `/components` 访问？
4. 是否更新相关 README / 规范文档？
5. 是否通过基础构建验证（`pnpm build`）？

---

## 9. 当前可用命令

```bash
pnpm dev
pnpm build
pnpm preview
pnpm check:aliases
```

---

## 10. 一句话总纲

**应用壳负责装配，能力沉淀在 packages；新增子包或组件必须可在统一 Demo Playground 中被演示和验证。**
