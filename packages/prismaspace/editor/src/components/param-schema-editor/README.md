# Param Schema Editor

`param-schema-editor` 是 PrismaSpace 前端里的参数结构编辑能力集合，包含：

- `core`：Schema 数据结构、导入导出、校验、编辑操作与 runtime
- `ui`：当前对外主入口为 `ParamSchemaRegularEditor`
- `adapters`：对接业务侧参数结构的适配层

当前对外推荐用法：

- `ParamSchemaRegularEditor`
- `useParamSchemaEditor`

Playground Demo：`apps/studio-web/src/components/demo-playground/param-schema-editor`

## 设计目标

这个编辑器不是单纯的 JSON Schema 编辑器，而是一个同时服务于：

- 参数结构定义
- 运行时赋值策略定义
- 引用变量绑定
- 只读预览

的统一编辑器。

它关注的是“参数 schema + value strategy”的组合，而不是只关注静态类型描述。

## 当前公开能力

`@prismaspace/editor` 当前公开了以下与 param schema editor 相关的能力：

- `ParamSchemaRegularEditor`
- `SchemaValueRefTree`
- `SchemaValueRefTreePanel`
- `SchemaTypePicker`
- `useParamSchemaEditor`
- `mode.ts` 中的模式与字段可见性/可编辑性工具
- `core` 中的 schema types、ops、runtime、import/export、json-schema、validate 等工具

## 快速使用

### 方式一：直接使用 `v-model`

这是当前最简单的用法，适合大多数业务场景。

```vue
<script setup lang="ts">
import { ParamSchemaRegularEditor } from "@prismaspace/editor";
import { ref } from "vue";

const schema = ref([
  {
    name: "query",
    type: "string",
    required: true,
    open: true,
  },
]);
</script>

<template>
  <ParamSchemaRegularEditor
    v-model="schema"
    runtime-mode="define"
    class="h-[640px]"
  />
</template>
```

说明：

- `v-model` 对应的数据类型是 `ParameterSchema[]`
- 编辑器内部会实时同步最新 schema
- 调用者不需要手动编写 `initialState` / `dispatch` 桥接逻辑

### 方式二：使用 `state + dispatch`

这是更底层、也更灵活的受控用法，适合需要直接操作 editor runtime 的场景。

```vue
<script setup lang="ts">
import {
  ParamSchemaRegularEditor,
  useParamSchemaEditor,
  type ParamSchemaRuntimeMode,
} from "@prismaspace/editor";
import { ref } from "vue";

const editor = useParamSchemaEditor();
const runtimeMode = ref<ParamSchemaRuntimeMode>("define");
</script>

<template>
  <ParamSchemaRegularEditor
    :state="editor.state.value"
    :dispatch="editor.dispatch"
    :runtime-mode="runtimeMode"
    class="h-[640px]"
  />
</template>
```

## 核心心智模型

### 1. Schema 结构

编辑器内部使用 `SchemaNode` 表示节点树。

- `object` 节点通过 `children` 表达字段结构
- `array` 节点通过单个 `item` 表达元素 blueprint
- 标量节点通过 `type` + `default/value/enum/...` 表达

### 2. Value Strategy

运行时值不是只有一种来源：

- `literal`
- `expr`
- `ref`

因此这个编辑器里的 `value` 表示的是“运行时赋值策略”，不是简单的默认值输入框。

### 3. 容器节点策略

当前实现已经明确约束了容器节点的值编辑策略：

- `object` 一旦已有 `properties`，父级不再允许直接输入 `value`
- `array` 在 `refine/bind` 下只允许父级整体赋值
- `array` 的 `item` 子树在 `refine/bind` 下不允许单独设置值

UI 上会以禁用态占位元素 + Tooltip 方式提示，而不是继续显示可编辑输入框。

## 四种运行模式

`ParamSchemaRuntimeMode` 当前支持：

- `define`
- `refine`
- `bind`
- `read`

### define

定位：

- 纯粹的参数结构定义
- 设计者定义 schema 契约

关注点：

- 字段名
- 字段类型
- required/open
- label/description/role/meta/enum/default
- 对象/数组结构本身

典型场景：

- 为业务模块定义输入结构
- 为业务模块定义输出结构
- 为工具、资源、工作流节点定义公开 schema 契约

特点：

- 结构可编辑
- 字段元信息可编辑
- `value` 不是 define 的主轴，默认 regular 布局下也不会突出 value 编辑

### refine

定位：

- 运行时参数结构定义
- 相比 define，更关注“如何赋值”，同时允许有限结构调整

关注点：

- value strategy
- 引用变量绑定
- 运行时局部 schema 收敛

典型场景：

- 工作流中间流程节点的参数定义
- 中间节点对上游输出进行重命名、变形、赋值
- 在具体执行上下文里补全参数结构与引用策略

特点：

- 当前实现允许有限结构变更
- 更偏 runtime-oriented，而不是元信息维护
- 容器节点值编辑遵守互斥策略：对象有子节点后父级不可直接赋值，数组子树不允许单独赋值

### bind

定位：

- 设计者先通过 `define` 写好结构
- 消费者只读结构，只关注如何设置值

关注点：

- 值绑定
- 引用变量
- 表达式

典型场景：

- 消费者使用由设计者提供的业务模块
- 用户在既定 schema 上填写运行时输入
- 模块调用参数映射

特点：

- 结构只读
- 用户不应再定义 schema 契约，只负责赋值
- `object` 有子节点时，父级禁止输入 value
- `array` 只允许父级整体输入 value
- `array` 的 `item` 子树按只读结构展示，不用于单独赋值

### read

定位：

- 只读预览

典型场景：

- 配置审阅
- 结构预览
- 运行结果旁路展示

特点：

- 不允许编辑
- 更强调展示结构、类型、默认值/静态信息

## 模式差异总结

可以用一句话概括：

- `define`：我来定义参数长什么样
- `refine`：我在运行时上下文里细化结构并决定怎么赋值
- `bind`：结构已经定好了，我只负责赋值
- `read`：我只看，不改

## ParamSchemaRegularEditor

`ParamSchemaRegularEditor` 是当前对外主编辑器入口。

特点：

- 紧凑的运行时表格布局
- 支持 `v-model` 直接读写 `ParameterSchema[]`
- 同时保留 `state + dispatch` 的底层受控模式
- 支持树结构展开/折叠
- 支持导入导出
- 支持 undo/redo
- 支持默认变量引用面板
- 支持自定义 `value-ref-picker` 插槽
- 支持隐藏默认头部并通过 ref 暴露头部 action 能力

### Props

常用 props：

- `modelValue`
- `state`
- `dispatch`
- `runtimeMode`
- `canEdit`
- `roleOptions`
- `valueRefTree`
- `fieldVisibility`
- `showHeader`
- `headerTitle`

说明：

- `modelValue`：默认 `v-model`，数据类型为 `ParameterSchema[]`
- `showHeader`：控制默认编辑器头部显隐
- `headerTitle`：覆盖默认头部标题；未传时会回退到模式标题
- `state + dispatch`：更底层的 runtime 接入方式；与 `v-model` 相比更适合需要直接操作编辑器状态机的场景

### 插槽

当前主要公开的自定义插槽：

- `value-ref-picker`

适用场景：

- 保留编辑器主体，但替换默认变量引用面板
- 例如使用 command/cascade 面板、业务定制变量浏览器等

### 通过 ref 暴露的头部动作

当调用方隐藏默认头部后，可以通过组件 ref 复用编辑器内部动作。

当前暴露的方法：

- `addRootProperty()`
- `undo()`
- `redo()`
- `openImport(mode)`
- `copyExport(kind)`
- `getHeaderState()`

适用场景：

- 外层用 accordion/card/header 承载自定义头部
- 外层按钮触发编辑器内部的新增/撤销/导入/导出能力
- 外层读取头部状态（如 `canUndo`、`issueCount`）并自行渲染

`getHeaderState()` 当前返回：

- `title`
- `modeLabel`
- `rootCount`
- `issueCount`
- `issueTitle`
- `canAddRoot`
- `canUndo`
- `canRedo`

## useParamSchemaEditor

`useParamSchemaEditor()` 提供编辑器运行时状态和 dispatch 能力。

通常用于：

- 驱动 `ParamSchemaRegularEditor`
- 在业务容器中接入保存/加载
- 与外部表单或工作流节点配置联动

## 导入导出

当前 `core` 已支持：

- `ParameterSchema` 导入导出
- `JSON Schema` 导入导出
- `JSON Value` 导入导出

注意：

- `ParameterSchema` 是最完整的业务语义格式，能保留 `value` / `meta` / `role` 等扩展能力
- `JSON Schema` 更偏结构契约导出
- `JSON Value` 更偏结构值预览导出

## 校验与错误展示

编辑器当前有两层问题反馈：

### 行内校验

用于字段级问题：

- 名称重复
- 变量值为空
- 引用无效
- 引用类型不兼容
- 容器节点不允许直接输入值

### 头部阻塞摘要

用于文档级阻塞问题汇总：

- schema 非法结构
- 关键命名错误
- 明确会导致绑定失败的引用错误

头部不会再简单镜像所有行内问题，而是聚合后的阻塞摘要。

## 适合的业务场景

这个编辑器适合下面这些场景：

- 业务模块输入/输出 schema 定义
- Tool / Resource / Workflow 节点参数契约定义
- 工作流中间节点的参数 refine
- 设计者提供结构、消费者进行 bind
- 参数结构只读预览与审阅

## 不适合的场景

下面这些场景不建议强行使用当前 editor：

- 需要完整 JSON Schema 标准覆盖的高级 schema 设计器
- 需要数组多元素实例编辑器，而不是 `items blueprint`
- 需要复杂跨节点公式编辑器作为主编辑面板

## 现状说明

当前 README 只描述已经存在于代码中的能力，不描述尚未落地的未来设计。

如果后续模式语义、头部 API、变量面板或导入导出策略继续演进，应同步更新本文档，避免 README 与代码行为脱节。
