import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import CheckboxField from "./CheckboxField.vue"

export const checkboxFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "checkbox",
    title: "Checkbox",
    description: "Boolean checkbox based on shadcn Checkbox.",
    category: "boolean",
    kind: "field",
    valueShape: "boolean",
    tags: ["checkbox", "boolean"],
    renderer: {
      component: CheckboxField,
      modelProp: "modelValue",
      getProps: (ctx) => {
        const resolvedProps = ctx.resolveDynamic(ctx.item.props ?? {})
        const { label: _label, ...fieldProps } = resolvedProps
        return {
          fieldProps,
          options: ctx.options,
        }
      },
      transformInput: (value) => Boolean(value),
      transformOutput: (value) => Boolean(value),
    },
  }),
]
