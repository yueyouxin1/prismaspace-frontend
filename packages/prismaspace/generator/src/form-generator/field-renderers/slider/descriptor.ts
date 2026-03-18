import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import RangeField from "./RangeField.vue"

export const sliderFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "slider",
    title: "Slider",
    description: "Single-value slider based on shadcn Slider.",
    category: "number",
    kind: "field",
    valueShape: "number",
    tags: ["slider", "range"],
    renderer: {
      component: RangeField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
      transformOutput: (value) => Number(value),
    },
  }),
]
