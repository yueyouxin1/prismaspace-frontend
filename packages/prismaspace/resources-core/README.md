# @prismaspace/resources-core

资源工作台共享基础能力包。

## 作用

- 提供 workbench 共享 UI shell
- 提供 autosave / refs / versions 等通用 composables
- 提供跨资源 query keys

## 当前导出

- `WorkbenchSurface`
- `WorkbenchHeaderNav`
- `useWorkbenchAutosave`
- `useWorkbenchRefs`
- `useWorkbenchVersions`
- `prismaspaceQueryKeys`

## 使用原则

- 可被所有 `@prismaspace/<resource>` workbench 依赖
- 不依赖 `@app/*`
- 不承载具体资源业务编排
