import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import RadioGroupField from "./RadioGroupField.vue"

export const radioGroupFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "radio-group",
    title: "Radio Group",
    description: "Single-choice radio group based on shadcn Radio Group.",
    category: "selection",
    kind: "field",
    valueShape: "string",
    supportsOptions: true,
    tags: ["radio-group", "single-choice"],
    renderer: {
      component: RadioGroupField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
