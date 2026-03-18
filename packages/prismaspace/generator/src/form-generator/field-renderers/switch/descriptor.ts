import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import SwitchField from "./SwitchField.vue"

export const switchFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "switch",
    title: "Switch",
    description: "Boolean switch based on shadcn Switch.",
    category: "boolean",
    kind: "field",
    valueShape: "boolean",
    tags: ["switch", "boolean", "toggle"],
    renderer: {
      component: SwitchField,
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
