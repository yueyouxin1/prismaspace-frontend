# PrismaSpace Frontend

`prismaspace-frontend` 是 PrismaSpace 前端的 Monorepo。

它现在分成两类主体：

- `apps/studio-web`
  - PrismaSpace 自己的 SaaS 门面壳
  - 负责登录、团队、工作空间、营销与平台页面
- `packages/prismaspace/*`
  - PrismaSpace 核心能力包域
  - 对外提供 `@prismaspace/*` 的 SDK、Workbench、共享 UI 与编辑器能力

一句话理解：

> `studio-web` 是第一方产品壳，`@prismaspace/*` 是可被外部项目安装和集成的核心能力包集。

## 全局架构

```txt
prismaspace-frontend/
├── apps/
│   └── studio-web/                 # SaaS shell / first-party host
├── packages/
│   └── prismaspace/
│       ├── contracts/              # 资源核心域契约
│       ├── sdk/                    # 统一 client
│       ├── resources-core/         # workbench 共享基础能力
│       ├── resources/              # agent/tool/knowledge/tenantdb/uiapp/workflow
│       ├── asset-hub/              # 资产库能力
│       ├── common/                 # 公共 i18n / SSE / tools
│       ├── editor/                 # 编辑器能力
│       ├── generator/              # 动态生成能力
│       ├── ui-reka/                # primitives facade
│       ├── ui-shadcn/              # 设计系统层
│       └── ui-ai-elements/         # AI 高阶组件层
└── doc/                            # 规范、边界、模板、设计说明
```

## 项目原则

- `studio-web` 不再承载资源工作台业务编排
- 资源工作台与资源运行逻辑留在 `@prismaspace/*`
- 统一通过 `@prismaspace/sdk` 创建 client，并注入认证、workspace、locale 等上下文
- 公开包不得反向依赖 `@app/*`
- 文档职责分层：
  - 本 README 只回答“项目是什么、有哪些层、边界在哪里”
  - 工程实现细则看 [Vue通用架构与开发规范指南.md](D:/code/prismaspace/prismaspace-frontend/doc/Vue通用架构与开发规范指南.md)
  - UI 实现规则看 [ui-development-guidelines.md](D:/code/prismaspace/prismaspace-frontend/doc/ui-development-guidelines.md)
  - UI 全局美学与页面细节看 [prisma-space-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-ui.md) / [prisma-space-pages-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-pages-ui.md)

## 核心包域

- `@prismaspace/contracts`
  - 核心能力域类型与 wire contract
- `@prismaspace/sdk`
  - 统一 client 工厂与领域 client
- `@prismaspace/resources`
  - 自动资源宿主与资源路由工作台容器
- `@prismaspace/resources-core`
  - workbench 共享 shell、query keys、autosave、refs、versions
- `@prismaspace/agent`
- `@prismaspace/tool`
- `@prismaspace/knowledge`
- `@prismaspace/tenantdb`
- `@prismaspace/uiapp`
- `@prismaspace/workflow`

## 强制阅读顺序

任何进入 `prismaspace-frontend` 的前端开发，在开始改代码前，至少按以下顺序阅读：

1. [README.md](D:/code/prismaspace/prismaspace-frontend/README.md)
   - 先理解项目定位、Monorepo 分层、应用壳与公开包域边界。
2. [Vue通用架构与开发规范指南.md](D:/code/prismaspace/prismaspace-frontend/doc/Vue通用架构与开发规范指南.md)
   - 负责工程实现规则：目录分层、依赖边界、alias、包创建、Demo 交付、变更检查。
3. [ui-development-guidelines.md](D:/code/prismaspace/prismaspace-frontend/doc/ui-development-guidelines.md)
   - 负责 UI 实现规则：组件选型优先级、兜底顺序、参考实现检索、自定义实现约束。
4. [prisma-space-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-ui.md)
   - 负责全局 UI 美学：Marketing / Platform / Studio 分层、tokens、全局交互与视觉红线。

按场景继续补充阅读：

- 页面与模块细节落地：
  - [prisma-space-pages-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-pages-ui.md)
- 资源工作台宿主与资源包边界：
  - [resource-workbench-boundary.md](D:/code/prismaspace/prismaspace-frontend/doc/resource-workbench-boundary.md)
- 资源运行时 / Headless 分层：
  - [prisma-space-runtime.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-runtime.md)
- Asset Library 边界：
  - [asset-library-boundary.md](D:/code/prismaspace/prismaspace-frontend/doc/asset-library-boundary.md)
- 主题色与 token 来源：
  - [shadcn-colors.md](D:/code/prismaspace/prismaspace-frontend/doc/shadcn-colors.md)

## 文档职责

- [README.md](D:/code/prismaspace/prismaspace-frontend/README.md)
  - 入口文档，只定义项目定位、目录总览、包域边界与阅读路径。
- [Vue通用架构与开发规范指南.md](D:/code/prismaspace/prismaspace-frontend/doc/Vue通用架构与开发规范指南.md)
  - 只定义工程架构与交付规范，不重复定义 UI 美学、页面风格细节。
- [ui-development-guidelines.md](D:/code/prismaspace/prismaspace-frontend/doc/ui-development-guidelines.md)
  - 只定义 UI 开发实现策略，不重复定义全局美学、页面视觉细节、工程 alias 规则。
- [prisma-space-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-ui.md)
  - 只定义全局视觉层级、tokens 与跨层一致性红线。
- [prisma-space-pages-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-pages-ui.md)
  - 只定义具体页面与模块的布局、状态、动效与信息层级细节。
- `*-boundary.md` / `prisma-space-runtime.md`
  - 只定义专项边界与架构约束，不承载通用工程规范或通用 UI 选型规则。

## 文档入口

- [packages/README.md](D:/code/prismaspace/prismaspace-frontend/packages/README.md)
  - `packages/` 层说明
- [packages/prismaspace/README.md](D:/code/prismaspace/prismaspace-frontend/packages/prismaspace/README.md)
  - PrismaSpace 包域总览
- [Vue通用架构与开发规范指南.md](D:/code/prismaspace/prismaspace-frontend/doc/Vue通用架构与开发规范指南.md)
  - 具体开发指南与工程规范
- [ui-development-guidelines.md](D:/code/prismaspace/prismaspace-frontend/doc/ui-development-guidelines.md)
  - UI 实现优先级、兜底策略与参考实现要求
- [prisma-space-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-ui.md)
  - 全局 UI 美学与 tokens 规则
- [prisma-space-pages-ui.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-pages-ui.md)
  - 页面与模块 UI 细节规范
- [resource-workbench-boundary.md](D:/code/prismaspace/prismaspace-frontend/doc/resource-workbench-boundary.md)
  - workbench 宿主与资源包边界
- [asset-library-boundary.md](D:/code/prismaspace/prismaspace-frontend/doc/asset-library-boundary.md)
  - asset hub 边界
- [prisma-space-runtime.md](D:/code/prismaspace/prismaspace-frontend/doc/prisma-space-runtime.md)
  - runtime / headless 分层原则

## 当前状态

当前公开包已经具备：

- `@prismaspace/*` 包名
- 明确的导出入口
- 本地 `pnpm pack:packages` 打包验证
- `studio-web` 作为第一方宿主直接消费公开 workbench

当前仍待补齐：

- 正式 `dist` library build
- 更完整的外部消费者验证与发布流程
