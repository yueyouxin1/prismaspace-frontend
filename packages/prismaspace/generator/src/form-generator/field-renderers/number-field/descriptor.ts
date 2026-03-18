import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import NumberFieldField from "./NumberFieldField.vue"

export const numberFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "number-field",
    title: "Number Field",
    description: "Stepper-based numeric input using shadcn Number Field.",
    category: "number",
    kind: "field",
    valueShape: "number",
    tags: ["number", "stepper", "numeric"],
    renderer: {
      component: NumberFieldField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
      transformInput: (value) => (typeof value === "number" ? value : Number(value)),
      transformOutput: (value) => (typeof value === "number" ? value : Number(value)),
    },
  }),
]
