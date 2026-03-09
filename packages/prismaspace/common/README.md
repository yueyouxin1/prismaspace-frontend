# @prismaspace/common

PrismaSpace 公共基础能力包。

## 当前内容

- `src/i18n/*`
  - 公共文案与 locale 资源
- `src/tools/sse.ts`
  - 通用 SSE 连接能力
- `src/tools/expression-tool.*`
  - 表达式工具
- `src/tools/id-manager.ts`
  - 通用节点 id 管理工具
- `src/plugin.ts`
  - 公共 UI plugin 聚合入口

## 适用边界

- 可被 app 壳和公开包共同依赖
- 不承载资源域业务逻辑
- 不依赖 `@app/*`
