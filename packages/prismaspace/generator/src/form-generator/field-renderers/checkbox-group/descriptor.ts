import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import CheckboxGroupField from "./CheckboxGroupField.vue"

export const checkboxGroupFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "checkbox-group",
    title: "Checkbox Group",
    description: "Multi-choice checkbox group rendered with shadcn Checkbox controls.",
    category: "selection",
    kind: "field",
    valueShape: "array",
    supportsOptions: true,
    tags: ["checkbox-group", "multi-choice", "array"],
    renderer: {
      component: CheckboxGroupField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
