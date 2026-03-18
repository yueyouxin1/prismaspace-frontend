import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import SelectField from "./SelectField.vue"

export const selectFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "select",
    title: "Select",
    description: "Styled select dropdown based on shadcn Select.",
    category: "selection",
    kind: "field",
    valueShape: "string",
    supportsOptions: true,
    tags: ["select", "single-choice", "options"],
    renderer: {
      component: SelectField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
