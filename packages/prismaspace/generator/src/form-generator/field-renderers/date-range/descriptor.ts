import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import DateRangeField from "./DateRangeField.vue"

export const dateRangeFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "date-range",
    title: "Date Range",
    description: "Paired date range input.",
    category: "date",
    kind: "field",
    valueShape: "object",
    tags: ["date-range"],
    renderer: {
      component: DateRangeField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
