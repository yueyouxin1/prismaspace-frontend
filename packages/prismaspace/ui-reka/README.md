# @prismaspace/ui-reka

最底层 UI primitive facade。

## 作用

- 对 `reka-ui` 做统一出口封装
- 作为 `@prismaspace/ui-shadcn` 的基础层

## 集成原则

- 业务层不要直接依赖底层实现细节
- 优先通过 `@prismaspace/ui-shadcn` 使用设计系统组件
