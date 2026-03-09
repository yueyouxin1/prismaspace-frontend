# PrismaSpace Packages

`packages/prismaspace/*` 是 PrismaSpace 的公开能力包域。

这里的内容不再是单纯供 `studio-web` 内部复用的模块，而是朝着“可安装、可打包、可被外部项目直接集成”的 `@prismaspace/*` 包集合建设。

## 目录分层

### 基础层

- `contracts`
  - 核心能力域契约
- `sdk`
  - 统一 client 工厂与领域 client
- `resources`
  - 自动资源宿主、默认资源注册表、route-aware workbench view
- `resources-core`
  - 资源工作台共享基础能力

### 资源层

- `resources/agent`
- `resources/tool`
- `resources/knowledge`
- `resources/tenantdb`
- `resources/uiapp`
- `resources/workflow`

每个资源包都应尽量提供：

- 根导出
- `./workbench`
- `./runtime`
- `./types`

### 共享能力层

- `asset-hub`
- `common`
- `editor`
- `generator`
- `ui-reka`
- `ui-shadcn`
- `ui-ai-elements`

## 当前定位

这套包域的目标是：

1. `studio-web` 作为第一方宿主直接消费
2. 外部 Vue 3 项目通过安装 `@prismaspace/*` 直接集成 PrismaSpace 核心能力
3. 所有公开包保持对宿主门面无反向依赖

## 设计原则

- 统一导出命名空间：`@prismaspace/*`
- 资源工作台逻辑留在资源包中，不回流到 app
- 认证、workspace、locale 通过统一 client 注入
- 包文档必须描述：
  - 包定位
  - 导出入口
  - 接入方式
  - 边界约束
