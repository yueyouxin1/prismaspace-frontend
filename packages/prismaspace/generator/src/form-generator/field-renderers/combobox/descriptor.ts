import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import ComboboxField from "./ComboboxField.vue"

export const comboboxFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "combobox",
    title: "Combobox",
    description: "Searchable single-select built from shadcn Popover and Command primitives.",
    category: "selection",
    kind: "field",
    valueShape: "string",
    supportsOptions: true,
    tags: ["combobox", "search", "single-choice"],
    renderer: {
      component: ComboboxField,
      getProps: (ctx) => ({
        fieldProps: {
          ...ctx.resolveDynamic(ctx.item.props ?? {}),
          triggerClass: "w-full justify-between",
        },
        options: ctx.options,
      }),
    },
  }),
]
