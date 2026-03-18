import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import NativeSelectField from "./NativeSelectField.vue"

export const nativeSelectFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "native-select",
    title: "Native Select",
    description: "Native HTML select with shadcn styling, ideal for performance-sensitive or mobile-first scenarios.",
    category: "selection",
    kind: "field",
    valueShape: "string",
    supportsOptions: true,
    tags: ["select", "native", "options"],
    renderer: {
      component: NativeSelectField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
