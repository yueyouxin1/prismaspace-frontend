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

## 自定义字段注册

```ts
const ref = useTemplateRef<FormGeneratorExposed>("generator")

ref.value?.registerField("counter", {
  component: CounterField,
  transformInput: (value) => Number(value ?? 0),
  transformOutput: (value) => Number(value ?? 0),
})
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

- `input`, `text`, `password`, `number`, `email`
- `textarea`
- `select`, `combobox`
- `checkbox`, `switch`
- `slider`
- `radio`, `radiogroup`
- `date`, `date-picker`, `datetime`, `time`, `time-picker`
- `date-range`, `date-range-picker`
- `tags`
- `multi-select`, `multiselect`
- `accordion`, `accordion-container`
- `accordion-root`, `accordion-item`

## 高级组件

非标准、带额外领域依赖的复杂组件放在 `advanced-components` 目录下，按需注册。

```ts
import {
  formGeneratorValueRefTreeKey,
  paramSchemaEditorFieldRenderer,
} from "@prismaspace/generator/form-generator/advanced-components"

provide(formGeneratorValueRefTreeKey, valueRefTree)
ref.value?.registerField("param-schema-editor", paramSchemaEditorFieldRenderer)
```

> 不在内置映射中的 `control` 会落到 `UnsupportedField`，建议通过 `registerField` 扩展。
