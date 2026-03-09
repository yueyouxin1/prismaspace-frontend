# Packages Layer

`packages/` 现在分成两类内容：

- `packages/prismaspace/*`
  - PrismaSpace 对外核心能力包域
  - 面向 `@prismaspace/*` npm 包
- 其他目录
  - 历史占位、预留或非公开域目录

## 当前结构

```txt
packages/
├── prismaspace/
│   ├── contracts/          # @prismaspace/contracts
│   ├── sdk/                # @prismaspace/sdk
│   ├── resources-core/     # @prismaspace/resources-core
│   ├── resources/
│   │   ├── agent/          # @prismaspace/agent
│   │   ├── tool/           # @prismaspace/tool
│   │   ├── knowledge/      # @prismaspace/knowledge
│   │   ├── tenantdb/       # @prismaspace/tenantdb
│   │   ├── uiapp/          # @prismaspace/uiapp
│   │   └── workflow/       # @prismaspace/workflow
│   ├── asset-hub/          # @prismaspace/asset-hub
│   ├── common/             # @prismaspace/common
│   ├── editor/             # @prismaspace/editor
│   ├── generator/          # @prismaspace/generator
│   ├── ui-reka/            # @prismaspace/ui-reka
│   ├── ui-shadcn/          # @prismaspace/ui-shadcn
│   └── ui-ai-elements/     # @prismaspace/ui-ai-elements
├── arch/                   # 预留
├── domain/                 # 预留
└── foundation/             # 预留
```

## 依赖方向

UI 共享层依赖方向必须保持：

`@prismaspace/ui-ai-elements` -> `@prismaspace/ui-shadcn` -> `@prismaspace/ui-reka`

资源层依赖原则：

- `@prismaspace/sdk` / `@prismaspace/contracts` / `@prismaspace/resources-core`
  - 不依赖 `@app/*`
- `@prismaspace/<resource>`
  - 可依赖 `sdk`、`contracts`、`resources-core` 与共享 UI 包
- `apps/studio-web`
  - 只能消费 `@prismaspace/*`
  - 不应反向成为公开包的实现前提

## 开发约束

- 新的 PrismaSpace 能力包默认创建在 `packages/prismaspace/*`
- 对外包名统一使用 `@prismaspace/*`
- 公开包不得依赖 `@app/*`
- 若新增公开包，需同步补齐：
  - `package.json`
  - `README.md`
  - 导出入口
  - Demo 或宿主接入验证
