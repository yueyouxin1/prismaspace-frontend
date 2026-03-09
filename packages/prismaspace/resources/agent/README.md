# @prismaspace/agent

Agent 资源公开包。

## 公开入口

- `@prismaspace/agent`
  - 主入口：`AgentChat`
- `@prismaspace/agent/main`
  - `AgentChat`
- `@prismaspace/agent/workbench`
  - `AgentWorkbench` / `AgentIdeWorkbench`
- `@prismaspace/agent/runtime`
  - Agent 运行态相关类型
- `@prismaspace/agent/types`
  - Agent 公共类型

## 当前能力

- `AgentChat`
  - 基于后端 Agent 资源与 AG-UI 协议的生产级聊天组件
- `AgentWorkbench`
  - 完整 Agent 工作台公开入口
- `AgentIdeWorkbench`
  - Agent IDE 视图组件
- `AgentWorkbenchScaffold`
  - Agent 工作台基础壳

## 宿主接入

工作台或第一方宿主应优先直接传入统一 `client`，复用已有认证、workspace 与 locale 上下文。

```vue
<AgentChat
  :client="prismaspaceClient"
  instance-uuid="agent-instance-uuid"
/>
```

`threadId` 传入时会直接固定到该会话中交互，不展示会话列表；不传 `threadId` 时组件会进入会话工作站模式。

对外部项目，如果宿主还没有现成的 `PrismaspaceClient`，也可以退回传入 `baseUrl` / `accessToken` 的便捷模式。
