import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import TextareaField from "./TextareaField.vue"

export const textareaFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "textarea",
    title: "Textarea",
    description: "Multi-line text input based on shadcn Textarea.",
    category: "text",
    kind: "field",
    valueShape: "string",
    tags: ["textarea", "multiline"],
    renderer: {
      component: TextareaField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
