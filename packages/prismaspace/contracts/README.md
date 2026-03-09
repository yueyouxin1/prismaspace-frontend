# @prismaspace/contracts

PrismaSpace 核心能力契约包。

## 作用

- 提供 SDK 与 workbench 共享的类型定义
- 统一资源域 wire contract
- 避免公共包反向依赖 `studio-web`

## 当前覆盖领域

- 通用响应与记录类型
- `Resource / ResourceInstance`
- `Tool`
- `Agent`
- `Workflow`
- `Knowledge`
- `TenantDB`
- `UiApp`
- `Asset`

## 不包含

以下仍属于 SaaS 门面域，不应进入本包：

- 登录 / 注册 / 找回密码
- 团队 / 权限 / 角色
- 营销 / 市场 / 订阅门面
