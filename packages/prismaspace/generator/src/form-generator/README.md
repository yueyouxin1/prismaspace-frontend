# Form Generator

基于 `FormItem[]` schema 的动态表单生成器，支持：

- 深层 `modelPath` 双向绑定（对象/数组路径）
- `context + formModel` 表达式联动（`visible/disabled/options/defaultValue`）
- 基于 shadcn `Field` 的可访问字段结构、错误态和辅助文案
- `required + rules` 字段校验、`validate()` 暴露方法，以及 `submit` 动作默认提交前校验
- shadcn-vue 字段适配层 + 可扩展注册机制
- action 声明化触发（emit/callback/navigate/api）

## 基础用法

```vue
<script setup lang="ts">
import { ref } from "vue"
import { FormGenerator, type FormItem } from "@prismaspace/generator/form-generator"

const model = ref({})
const context = ref({ showAdvanced: true })

const schema: FormItem[] = [
  {
    id: "name",
    type: "form",
    control: "input",
    label: "姓名",
    modelPath: "user.profile.name",
    props: { placeholder: "请输入姓名" },
  },
]
</script>

<template>
  <FormGenerator v-model="model" :schema="schema" :context="context" />
</template>
```

## Item 语义

- `type: "form"`: 真正参与 `modelPath` 双向绑定、校验和提交的数据字段
- `type: "layout"`: 纯结构/容器项，不要求 `modelPath`，适合 `accordion-root`、`accordion-item`、`tabs`、`tabs-item` 这类无持久化布局组件
- `type: "action"`: 声明式动作项

## 自定义字段注册

```ts
const ref = useTemplateRef<FormGeneratorExposed>("generator")

ref.value?.registerField({
  name: "counter",
  title: "Counter Field",
  description: "Numeric stepper built from custom demo controls.",
  category: "number",
  kind: "field",
  valueShape: "number",
  renderer: {
    component: CounterField,
    transformInput: (value) => Number(value ?? 0),
    transformOutput: (value) => Number(value ?? 0),
  },
})
```

注册 descriptor 会自动提供：

- 唯一标准名称
- 人类 / AI 可读的组件说明
- catalog 查询和后续自动表单生成

```ts
const catalog = ref.value?.getComponentCatalog()
console.log(catalog?.fields)
```

## 校验

`required` 和 `rules` 会参与字段校验。默认情况下：

- 字段被编辑后会进入校验态
- `emit:submit` 动作触发前会自动执行整表校验
- 可以通过组件暴露的 `validate()` / `validateField()` 主动触发校验

```ts
const result = await ref.value?.validate()
if (!result?.valid) {
  console.log(result.errors)
}
```

## 内置字段类型

- `input`, `password`, `email`, `number`
- `textarea`
- `select`, `native-select`, `combobox`
- `checkbox`, `switch`
- `checkbox-group`
- `slider`
- `radio-group`
- `number-field`
- `date`, `datetime`, `time`
- `date-range`
- `tags-input`
- `input-otp`
- `accordion`
- `accordion-root`, `accordion-item`
- `tabs`, `tabs-item`

## 高级组件

非标准、带额外领域依赖的复杂组件放在 `advanced-components` 目录下，按需注册。

```ts
import {
  formGeneratorValueRefTreeKey,
  paramSchemaEditorFieldDescriptor,
} from "@prismaspace/generator/form-generator/advanced-components"

provide(formGeneratorValueRefTreeKey, valueRefTree)
ref.value?.registerField(paramSchemaEditorFieldDescriptor)
```

> 不在内置映射中的 `control` 会落到 `UnsupportedField`，建议通过 `registerField` 扩展。
