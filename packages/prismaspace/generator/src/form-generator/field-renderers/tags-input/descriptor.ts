import type { FieldRendererDescriptor } from "../../types"
import { defineFieldDescriptor } from "../../descriptor-helpers"
import TagsField from "./TagsField.vue"

export const tagsInputFieldDescriptors: FieldRendererDescriptor[] = [
  defineFieldDescriptor({
    name: "tags-input",
    title: "Tags Input",
    description: "Multi-value text entry built on shadcn Tags Input.",
    category: "collection",
    kind: "field",
    valueShape: "array",
    tags: ["tags", "array", "tokenized-input"],
    renderer: {
      component: TagsField,
      getProps: (ctx) => ({
        fieldProps: ctx.resolveDynamic(ctx.item.props ?? {}),
        options: ctx.options,
      }),
    },
  }),
]
