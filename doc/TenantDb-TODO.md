# TODO｜TenantDb IDE（专业数据库管理 IDE 风格，功能等价重构）

更新时间：2026-02-27  
当前阶段：设计冻结，待实现

---

## 0. 摘要

- 目标文件：`prismaspace-frontend/doc/TenantDb-TODO.md`
- 本轮目标：只更新 TODO 规格，不做代码实现。
- 范围：功能等价重构，不裁剪现有 TenantDb 能力。
- 视觉与交互目标：
1. 去卡片化，消除“左卡片 + 右卡片”的割裂布局。
2. 左树满高可滚动，与右区形成一体化 IDE 工作区。
3. 表操作入口统一收敛到表节点 `ContextMenu`。
4. 查询构建器、表元信息/字段编辑迁移至 `Dialog`。

---

## 1. 范围与默认假设（已锁定）

- 范围为“功能等价重构”，不裁剪既有能力。
- 不新增后端接口，不新增 mock 路径。
- 沿用现有 API：
1. `tenantdb-client.ts` 继续作为唯一 TenantDb 请求入口。
2. `/api/v1/tenantdb/{instance_uuid}/tables*` 与 `/api/v1/execute/instances/{instance_uuid}` 不变。
- 设计风格采用 shadcn 极简 IDE 方向（中性灰阶、低装饰、高密度）。
- 右侧继续保留 Data/SQL 两类工作流，Schema/Query 表单迁移进 Dialog。

---

## 2. 信息架构（决策完成）

### 2.1 工作区骨架（强制）

1. 主工作区采用“两栏一体”结构，不再使用“左卡片 + 右卡片”。
2. 左栏为 `Table Explorer Tree`（固定宽度，可拖拽）。
3. 右栏为 `Data Workspace`（数据结果 + SQL 控制台）。
4. 桌面端左右并排，视觉连续，不允许出现两块独立浮动卡片观感。

### 2.2 左侧 Explorer（强制）

1. 左侧高度必须占满工作区，内部使用 `ScrollArea`，溢出滚动。
2. 树节点结构：
   - 一级：表名节点（可选中）。
   - 二级：字段节点（字段名 + 类型）。
3. 树展开/收起使用 `Collapsible`。
4. 左树节点点击只负责“切表”，不触发 destructive 或编辑行为。

### 2.3 表操作入口（强制）

1. 表操作统一放在“表名节点右键菜单（ContextMenu）”。
2. 禁止在页面散落同类操作按钮造成入口重复。
3. `ContextMenu` 动作映射固定为：
   - `Query Data...` -> 打开 `QueryBuilderDialog`
   - `Edit Schema...` -> 打开 `TableSchemaDialog`
   - `Insert Row...` -> 打开已有插入行 Dialog
   - `Delete Table...` -> 打开已有删除确认 Dialog（destructive）

### 2.4 弹窗交互（强制）

1. `QueryBuilderDialog` 承载原 Data 查询构建器表单。
2. `TableSchemaDialog` 承载原 Schema 元信息 + 字段定义表单。
3. `QueryBuilderDialog` 点击“应用”后关闭弹窗并刷新右侧数据区。
4. `TableSchemaDialog` 保存前必须走既有 schema diff 与 destructive acknowledge 校验。

### 2.5 右侧 Workspace（强制）

1. 保留数据结果与 SQL 控制台能力（功能等价）。
2. 顶部改为 IDE 风格工具条（面包屑 + 图标动作），减少 Card 堆叠。
3. SQL 控制台行为不回退，仍保持 `raw_sql` 仅允许 `SELECT` 的当前约束。

### 2.6 响应式（强制）

1. `xl` 及以上：左右并排，可调整宽度（`ResizablePanelGroup`）。
2. `xl` 以下：纵向堆叠，左树仍需独立滚动。

---

## 3. 现状基线与重构目标

### 3.1 基线文件

- `apps/studio-web/src/views/workbench/panels/TenantDbWorkbenchPanel.vue`

### 3.2 当前主要问题

1. 主区存在大量 Card 嵌套，信息密度与分组不合理，视觉割裂。
2. 左侧表列表不是树形结构，且高度占用与滚动体验不理想。
3. 查询构建器与表元信息编辑长期铺在主区，认知负担高。
4. 表操作入口分散，不符合数据库 IDE 的“就地右键操作”习惯。

### 3.3 本 TODO 负责补齐

1. 完成左树 + 右工作区的一体化布局规范。
2. 完成 ContextMenu 统一表操作入口规范。
3. 完成 Query/Schema 两类 Dialog 迁移规范。
4. 完成模块拆分路径与事件边界规范。

---

## 4. 组件拆分与文件落点（实现蓝图）

### 4.1 `packages/workbench-tenantdb` 新增/改造

1. `src/TenantDbIdeWorkbench.vue`：整体布局与事件编排（两栏 + 顶部工具条）。
2. `src/sections/TenantDbExplorerTree.vue`：左侧树、搜索、展开/收起、选中态。
3. `src/components/TenantDbTableContextMenu.vue`：树节点右键菜单动作。
4. `src/dialogs/TenantDbQueryBuilderDialog.vue`：查询构建器弹窗。
5. `src/dialogs/TenantDbTableSchemaDialog.vue`：表元信息/字段编辑弹窗。
6. `src/sections/TenantDbDataWorkspace.vue`：右侧数据表格 + SQL 视图 + 分页。
7. `src/types/tenantdb-ide.ts`：补齐 Explorer/ContextMenu/Dialog 相关类型。
8. `src/index.ts`：新增导出。

### 4.2 `apps/studio-web` 改造

1. `src/views/workbench/panels/TenantDbWorkbenchPanel.vue`
   - 角色转为“状态与请求容器”。
   - 承接 `tenantdbApi` 查询与 mutation 编排。
   - 组合 `TenantDbIdeWorkbench`。
2. `src/services/api/tenantdb-client.ts`
   - 接口保持不变，继续复用。

---

## 5. 前端公共接口与类型变更

### 5.1 后端 API

- 无变更。

### 5.2 `tenantdb-ide.ts` 新增类型

1. `TenantExplorerNode`：table/column 树节点结构。
2. `TenantTableContextAction`：`query | schema | insert | delete`。
3. `TenantQueryDialogState`：查询 Dialog 状态与草稿。
4. `TenantSchemaDialogState`：结构 Dialog 状态与草稿。

### 5.3 组件事件约定（强制）

1. `TenantDbExplorerTree` emits：
   - `select-table`
   - `open-action`
2. `TenantDbTableContextMenu` emits：
   - `action`（包含 `tableUuid` + `action`）
3. `TenantDbIdeWorkbench` emits：
   - `run-query`
   - `save-schema`
   - `open-insert`
   - `delete-table`

### 5.4 i18n 增补

- 更新：
1. `packages/common/src/i18n/locales/zh-CN.ts`
2. `packages/common/src/i18n/locales/en-US.ts`
- 新增分类键：树视图、右键菜单、Dialog 标题/描述/按钮文案。

---

## 6. 交互规则（实现时必须遵守）

1. 左树节点点击仅切表，不触发编辑或删除。
2. 右键菜单作为表操作主入口，动作映射固定且可预测。
3. Query Builder 只在 Dialog 中编辑并提交。
4. Table Schema 只在 Dialog 中编辑并提交。
5. Schema 保存链路必须复用现有 diff + destructive acknowledge 校验，不降级。
6. 删除表、删除字段等高风险动作必须保留二次确认。
7. 行增删改能力不回退，原有插入/编辑/删除流程保持可用。

---

## 7. 分阶段任务（可执行）

### M0：类型与骨架

- [ ] 扩展 `tenantdb-ide.ts` 类型定义（Explorer/ContextMenu/Dialog）。
- [ ] 新建 `TenantDbIdeWorkbench.vue` 主骨架（两栏 + 工具条 + 响应式断点）。
- [ ] 接入 `ResizablePanelGroup` + `ScrollArea`。

### M1：左侧树与右键菜单

- [ ] 新建 `TenantDbExplorerTree.vue`，完成树渲染、搜索、展开/选中状态。
- [ ] 新建 `TenantDbTableContextMenu.vue`，完成四类动作发射。
- [ ] 将现有“散落按钮”迁移到右键菜单链路。

### M2：Dialog 迁移

- [ ] 新建 `TenantDbQueryBuilderDialog.vue`，迁移原 Data 查询构建器表单。
- [ ] 新建 `TenantDbTableSchemaDialog.vue`，迁移原 Schema 元信息与字段编辑表单。
- [ ] 打通 apply/save 事件与现有 mutation。

### M3：右侧 Workspace 收敛

- [ ] 新建 `TenantDbDataWorkspace.vue`，承接数据表格、分页、SQL 结果呈现。
- [ ] 顶部改为 IDE 风格工具条，减少 Card 层级。
- [ ] 保持 SQL 控制台行为与错误处理语义不回退。

### M4：App 层容器重组

- [ ] `TenantDbWorkbenchPanel.vue` 改为状态容器（query/mutation/缓存失效）。
- [ ] 组合 `TenantDbIdeWorkbench`，透传数据与事件。
- [ ] 保证接口调用与缓存键语义保持 UUID 体系。

### M5：质量收口

- [ ] i18n 文案补齐（中英一致）。
- [ ] 交互回归（切表、右键、Dialog、SQL、行增删改）。
- [ ] 命令验收：`pnpm check:aliases`、`pnpm build`。

---

## 8. 参考实现（固定）

1. `reference_example/shadcn-vue-dev/apps/v4/content/docs/components/sidebar.md`
2. `reference_example/shadcn-vue-dev/apps/v4/content/docs/components/context-menu.md`
3. `reference_example/shadcn-vue-dev/apps/v4/content/docs/components/dialog.md`
4. `reference_example/shadcn-vue-dev/apps/v4/content/docs/components/scroll-area.md`
5. `reference_example/shadcn-vue-dev/apps/v4/public/r/styles/new-york-v4/sidebar-16.json`
6. `reference_example/shadcn-vue-dev/apps/v4/public/r/styles/new-york-v4/resizable.json`

---

## 9. 验收标准（DoD）

- [ ] 左树在 200+ 表名场景可滚动，右区不跟随滚动。
- [ ] 表节点展开可见字段结构，折叠/展开状态稳定。
- [ ] 表节点右键菜单可用，动作正确路由到对应 Dialog。
- [ ] 查询构建器仅在 Dialog 内编辑并成功应用查询。
- [ ] 表元信息/字段编辑仅在 Dialog 内完成，保存后数据回读正确。
- [ ] 删除表/删字段仍保留二次确认与破坏性提示。
- [ ] SQL 控制台与结果区功能不回退（仍限制 SELECT）。
- [ ] 行增删改能力不回退（插入/编辑/删除 Dialog 正常）。
- [ ] 主工作区视觉不再多 Card 堆叠，左右连续。
- [ ] `pnpm check:aliases` 与 `pnpm build` 通过。

---

## 10. 非目标（本轮不做）

1. 不新增后端 TenantDb 协议字段或路由。
2. 不引入第三方重型数据库 UI 框架。
3. 不重写 TenantDb 业务语义，仅做 UI 架构重组与交互收敛。
4. 不改变 `raw_sql` 的安全边界与既有行为约束。
