# @prismaspace/sdk

PrismaSpace 核心能力统一 SDK。

## 入口

```ts
import { createClient } from '@prismaspace/sdk'
```

## `createClient`

支持的配置项：

- `baseUrl`
- `getAccessToken`
- `getApiKey`
- `getWorkspaceUuid`
- `locale`
- `fetchImpl`
- `onUnauthorized`
- `defaultHeaders`

## 当前暴露 client

- `client.resource`
- `client.tool`
- `client.agent`
- `client.agentSession`
- `client.workflow`
- `client.knowledge`
- `client.tenantdb`
- `client.uiapp`
- `client.asset`
- `client.serviceModule`
- `client.execution`
- `client.config`

## 边界

- 不依赖 `vue`
- 不依赖 `pinia`
- 不依赖 `vue-i18n`
- 不读取宿主 `localStorage`
- 认证、workspace、locale 全由调用方显式注入
